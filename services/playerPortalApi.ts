import { Router } from 'express';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import config from '../firebase-applet-config.json' with { type: 'json' };
import { codeDigest, signSession, readSession, portalPlayer, portalMatch, portalTraining } from './playerPortalPolicy.js';
import { verifyFirebaseIdToken } from './verifyGeminiAuth.js';

function backend() {
  // Never use a VITE_ variable for service credentials. Fail closed if absent.
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('PLAYER_BACKEND_NOT_CONFIGURED');
  let account;
  try { account = JSON.parse(raw); } catch { throw new Error('PLAYER_BACKEND_NOT_CONFIGURED'); }
  if (account.project_id !== config.projectId || !account.private_key) throw new Error('PLAYER_BACKEND_NOT_CONFIGURED');
  const app = getApps().find(a => a.name === 'player-portal-admin') || initializeApp({ credential: cert(account) }, 'player-portal-admin');
  // Admin Auth imports jwks-rsa -> ESM jose via require(), rejected by Vercel's
  // loader. Reuse the existing strict RSA signature/issuer/audience/time verifier;
  // Admin Firestore still provides privileged, server-only database access.
  const auth = { verifyIdToken: async (token: string) => {
    const uid = await verifyFirebaseIdToken(token);
    if (!uid) throw new Error('INVALID_FIREBASE_TOKEN');
    return { uid };
  } };
  return { db: getFirestore(app, config.firestoreDatabaseId || '(default)'), auth, secret: account.private_key as string };
}

// Dependency injection keeps authorization tests isolated from the real Firebase project.
export function createPlayerPortalApi(getBackend: () => ReturnType<typeof backend> = backend) {
  const playerPortalApi = Router();

  playerPortalApi.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Login and every subsequent request require a cryptographically verified Firebase token.
  playerPortalApi.use(async (req, res, next) => {
    try {
      const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
      if (!token) { res.status(401).json({ error: 'Logga in igen.' }); return; }
      const service = getBackend();
      const identity = await service.auth.verifyIdToken(token);
      res.locals.service = service;
      res.locals.uid = identity.uid;
      next();
    } catch (error: any) {
      res.status(error.message === 'PLAYER_BACKEND_NOT_CONFIGURED' ? 503 : 401)
        .json({ error: error.message === 'PLAYER_BACKEND_NOT_CONFIGURED' ? 'Spelarinloggningens serverbehörighet är inte konfigurerad.' : 'Logga in igen.' });
    }
  });

  playerPortalApi.post('/login', async (req, res) => {
    const { db, secret } = res.locals.service as ReturnType<typeof backend>;
    const code = typeof req.body?.accessCode === 'string' ? req.body.accessCode.trim().toUpperCase() : '';
    if (!code || code.length > 100) { res.status(401).json({ error: 'Ogiltig kod.' }); return; }
    try {
      // Persistent, atomic limits shared by all serverless instances. No raw IP/code stored.
      // x-vercel-forwarded-for is set by Vercel; do not trust caller-provided x-forwarded-for.
      const ip = process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress) : String(req.socket.remoteAddress);
      const buckets = [ ['ip', ip, 20], ['uid', res.locals.uid, 10], ['global', 'login', 300] ] as const;
      const allowed = await db.runTransaction(async tx => {
        const refs = buckets.map(([kind, value]) => db.collection('_player_login_limits').doc(codeDigest(`${kind}:${value}`, secret)));
        const snapshots = await tx.getAll(...refs);
        const now = Date.now();
        const states = snapshots.map(s => {
          const data = s.data();
          return data && data.until > now ? data : { count: 0, until: now + 15 * 60_000 };
        });
        if (states.some((s, i) => s.count >= buckets[i][2])) return false;
        refs.forEach((ref, i) => tx.set(ref, { count: states[i].count + 1, until: states[i].until, expiresAt: Timestamp.fromMillis(now + 86400_000) }));
        return true;
      });
      if (!allowed) { res.status(429).json({ error: 'För många försök. Försök igen om 15 minuter.' }); return; }
      const found = await db.collectionGroup('players').where('accessCode', '==', code).limit(2).get();
      // Ambiguous codes are denied instead of signing into an arbitrary player.
      if (found.size !== 1) { res.status(401).json({ error: 'Ogiltig kod.' }); return; }
      const document = found.docs[0];
      const parts = document.ref.path.split('/');
      if (parts.length !== 4 || parts[0] !== 'users') { res.sendStatus(401); return; }
      const coachId = parts[1];
      const session = signSession({ uid: res.locals.uid, coachId, playerId: document.id, audience: process.env.VERCEL_URL || 'local',
        code: codeDigest(code, secret), exp: Date.now() + 8 * 3600_000 }, secret);
      res.json({ session, coachId, player: portalPlayer(document.data(), document.id) });
    } catch {
      // Do not log codes, credentials, or raw Firestore errors to the client.
      res.status(503).json({ error: 'Spelarinloggningen är tillfälligt otillgänglig. Kontrollera serverbehörighet och databasindex.' });
    }
  });

  playerPortalApi.use(async (req, res, next) => {
    try {
      const { db, secret } = res.locals.service as ReturnType<typeof backend>;
      const session = readSession(String(req.headers['x-player-session'] || ''), secret);
      if (session.uid !== res.locals.uid || session.audience !== (process.env.VERCEL_URL || 'local') || ![session.coachId, session.playerId].every(v => typeof v === 'string' && v.length && !v.includes('/'))) throw new Error();
      const playerRef = db.doc(`users/${session.coachId}/players/${session.playerId}`);
      const player = await playerRef.get();
      if (!player.exists || !player.data()?.accessCode || codeDigest(player.data()!.accessCode, secret) !== session.code) throw new Error();
      res.locals.playerContext = { ...session, player: player.data(), playerRef };
      next();
    } catch {
      res.status(401).json({ error: 'Spelarsessionen har upphört. Logga in med aktuell kod.' });
    }
  });

  playerPortalApi.get('/dashboard', async (_req, res) => {
    try {
      const { db } = res.locals.service as ReturnType<typeof backend>;
      const { coachId, playerId, player } = res.locals.playerContext;
      const root = db.doc(`users/${coachId}`);
      const [matches, sessions, exercises, phase] = await Promise.all([
        root.collection('matches').get(), root.collection('sessions').get(),
        root.collection('custom_exercises').get(), root.collection('settings').doc('custom_phase').get(),
      ]);
      res.json({ player: portalPlayer(player, playerId),
        matches: matches.docs.map(d => portalMatch(d.data(), d.id, playerId)).filter(m => m.feedbacks.length).sort((a, b) => String(b.date).localeCompare(String(a.date))),
        sessions: sessions.docs.map(d => portalTraining(d.data(), d.id, playerId)),
        exercises: exercises.docs.map(d => ({ ...d.data(), id: d.id })), phaseName: phase.data()?.name || 'Egna Övningar' });
    } catch { res.status(503).json({ error: 'Kunde inte hämta spelarens data.' }); }
  });

  playerPortalApi.post('/homework', async (req, res) => {
    const { db } = res.locals.service as ReturnType<typeof backend>;
    const playerRef = res.locals.playerContext.playerRef as DocumentReference;
    const { code } = res.locals.playerContext;
    try {
      await db.runTransaction(async tx => {
        const snapshot = await tx.get(playerRef);
        const data = snapshot.data()!;
        // Recheck code in transaction so a concurrent coach code change wins.
        if (codeDigest(data.accessCode || '', res.locals.service.secret) !== code) throw new Error();
        const homework = data.homework || [];
        if (!homework.some((h: any) => h.id === req.body?.homeworkId) || typeof req.body?.completed !== 'boolean') throw new Error();
        tx.update(playerRef, { homework: homework.map((h: any) => h.id === req.body.homeworkId ? { ...h, completed: req.body.completed } : h) });
      });
      res.json({ ok: true });
    } catch { res.status(400).json({ error: 'Uppdraget kunde inte uppdateras.' }); }
  });

  playerPortalApi.post('/feedback', async (req, res) => {
    const { playerRef } = res.locals.playerContext;
    const { aiFeedback, suggestedDrills } = req.body || {};
    if (typeof aiFeedback !== 'string' || aiFeedback.length > 30000 || !Array.isArray(suggestedDrills) || suggestedDrills.length > 30 || !suggestedDrills.every((s: unknown) => typeof s === 'string' && s.length < 500)) {
      res.sendStatus(400); return;
    }
    await playerRef.update({ aiFeedback, suggestedDrills });
    res.json({ ok: true });
  });

  function conversations(playerId: string, coachId: string) { return ['TEAM', [playerId, coachId].sort().join('_')]; }

  playerPortalApi.get('/messages', async (_req, res) => {
    const { db } = res.locals.service as ReturnType<typeof backend>;
    const { coachId, playerId } = res.locals.playerContext;
    const snapshot = await db.collection(`users/${coachId}/messages`).where('conversationId', 'in', conversations(playerId, coachId)).get();
    const messages = snapshot.docs.map(d => ({ ...d.data(), id: d.id, timestamp: d.data().timestamp?.toDate?.().toISOString() || new Date(0).toISOString() }));
    res.json(messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-200));
  });

  playerPortalApi.post('/messages', async (req, res) => {
    const { db } = res.locals.service as ReturnType<typeof backend>;
    const { coachId, playerId, player } = res.locals.playerContext;
    const text = req.body?.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 4000) { res.sendStatus(400); return; }
    await db.collection(`users/${coachId}/messages`).add({ senderId: playerId, senderName: player.name, senderRole: 'player', recipientId: coachId,
      conversationId: [playerId, coachId].sort().join('_'), text: text.trim(), timestamp: FieldValue.serverTimestamp(), readBy: [playerId] });
    res.json({ ok: true });
  });

  playerPortalApi.post('/read', async (req, res) => {
    const { db } = res.locals.service as ReturnType<typeof backend>;
    const { coachId, playerId } = res.locals.playerContext;
    const id = req.body?.messageId;
    if (typeof id !== 'string' || !id || id.includes('/')) { res.sendStatus(400); return; }
    const ref = db.doc(`users/${coachId}/messages/${id}`);
    const message = await ref.get();
    if (!conversations(playerId, coachId).includes(message.data()?.conversationId)) { res.sendStatus(403); return; }
    await ref.update({ readBy: FieldValue.arrayUnion(playerId) });
    res.json({ ok: true });
  });

  playerPortalApi.use((_error: unknown, _req: any, res: any, _next: any) => {
    res.status(503).json({ error: 'Spelarportalen är tillfälligt otillgänglig.' });
  });

  return playerPortalApi;
}

export const playerPortalApi = createPlayerPortalApi();
