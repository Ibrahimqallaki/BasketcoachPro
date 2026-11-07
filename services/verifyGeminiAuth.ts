import { verify as verifySignature } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import appletConfig from '../firebase-applet-config.json' with { type: 'json' };

// Firebase's published signing certificates are cached for repeated AI requests.
const FIREBASE_CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let keys: Record<string, string> = {};
let keysExpireAt = 0;

async function getFirebaseSigningKeys(): Promise<Record<string, string>> {
  if (Date.now() < keysExpireAt && Object.keys(keys).length) return keys;

  const response = await fetch(FIREBASE_CERT_URL, {
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error('Firebase public certificate lookup failed');

  const retrieved = (await response.json()) as Record<string, string>;
  if (!retrieved || !Object.keys(retrieved).length) {
    throw new Error('Firebase public certificate list was empty');
  }
  const match = response.headers.get('cache-control')?.match(/max-age=(\d+)/);
  const ttlSeconds = match ? Number(match[1]) : 1800;
  keys = retrieved;
  keysExpireAt = Date.now() + Math.min(Math.max(ttlSeconds, 60), 3600) * 1000;
  return keys;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const projectId = appletConfig.projectId;
    const now = Math.floor(Date.now() / 1000);
    if (
      header.alg !== 'RS256' || typeof header.kid !== 'string' ||
      !projectId || claims.aud !== projectId ||
      claims.iss !== `https://securetoken.google.com/${projectId}` ||
      typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 ||
      typeof claims.exp !== 'number' || claims.exp <= now ||
      typeof claims.iat !== 'number' || claims.iat > now ||
      typeof claims.auth_time !== 'number' || claims.auth_time > now
    ) return null;

    const certificates = await getFirebaseSigningKeys();
    const publicCert = certificates[header.kid];
    if (!publicCert) return null;
    const valid = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicCert,
      Buffer.from(parts[2], 'base64url'),
    );
    return valid ? claims.sub : null;
  } catch {
    return null;
  }
}

// Best-effort abuse guard per active function instance. Provider-side quotas
// remain the authoritative limit across distributed instances.
const requestTimes = new Map<string, number[]>();
const MAX_PER_MINUTE = 12;
const MAX_PER_HOUR = 100;
export async function requireGeminiAuth(req: Request, res: Response, next: NextFunction) {
  const match = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  if (!match) {
    res.status(401).json({ error: 'Logga in för att använda Gemini.' });
    return;
  }
  const uid = await verifyFirebaseIdToken(match[1]);
  if (!uid) {
    res.status(401).json({ error: 'Inloggningen behöver förnyas. Logga in igen.' });
    return;
  }
  const now = Date.now();
  const recent = (requestTimes.get(uid) || []).filter(time => now - time < 3600_000);
  const minuteCount = recent.filter(time => now - time < 60_000).length;
  if (minuteCount >= MAX_PER_MINUTE || recent.length >= MAX_PER_HOUR) {
    res.status(429).json({ error: 'AI-gränsen för tillfället är nådd. Försök senare.' });
    return;
  }
  recent.push(now);
  requestTimes.set(uid, recent);
  if (requestTimes.size > 3000) {
    for (const [key, times] of requestTimes) {
      if (!times.length || now - times[times.length - 1] > 3600_000) requestTimes.delete(key);
    }
  }
  next();
}
