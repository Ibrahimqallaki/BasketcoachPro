import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createPlayerPortalApi } from '../services/playerPortalApi.js';
import { codeDigest, readSession, signSession } from '../services/playerPortalPolicy.js';

const secret = 'test-only-session-signing-key';
const playerPath = 'users/coach/players/me';

// A deliberately isolated Firestore double: no credentials, network calls or real data.
function fixture() {
  const records = new Map<string, any>([
    [playerPath, { name: 'Player', number: 7, accessCode: 'P-7-ABCD', notes: 'Coach private', homework: [{ id: 'hw', title: 'Shoot', completed: false }] }],
    ['users/coach/players/other', { name: 'Other', accessCode: 'P-8-WXYZ', notes: 'Private' }],
    ['users/coach/matches/m1', { date: '2026-11-01', opponent: 'Team', score: 10, opponentScore: 8, privateExtra: 'Private', playerPoints: { me: 4, other: 6 }, feedbacks: [{ playerId: 'me', strengths: 'Good' }, { playerId: 'other', strengths: 'Private' }] }],
    ['users/coach/sessions/s1', { date: '2026-11-01', phaseId: 1, exerciseIds: ['e'], attendance: [{ playerId: 'me' }, { playerId: 'other' }], evaluations: [{ playerId: 'me' }, { playerId: 'other' }] }],
    ['users/coach/messages/mine', { conversationId: 'coach_me', text: 'Hello', senderRole: 'coach', recipientId: 'me', readBy: [] }],
    ['users/coach/messages/team', { conversationId: 'TEAM', text: 'Training', senderRole: 'coach', recipientId: 'TEAM', readBy: [] }],
    ['users/coach/messages/private', { conversationId: 'coach_other', text: 'Other private', readBy: [] }],
  ]);
  const snapshot = (path: string) => ({ id: path.split('/').pop(), exists: records.has(path), data: () => records.get(path), ref: reference(path) });
  const reference = (path: string): any => ({ path, get: async () => snapshot(path), collection: (name: string) => collection(`${path}/${name}`),
    update: async (patch: any) => records.set(path, { ...records.get(path), ...patch }) });
  function collection(path: string, group = false): any {
    let filters: [string, string, any][] = [];
    let max = Infinity;
    const query: any = {
      doc: (id: string) => reference(`${path}/${id}`),
      where: (field: string, op: string, value: any) => { filters.push([field, op, value]); return query; },
      limit: (value: number) => { max = value; return query; },
      add: async (value: any) => { records.set(`${path}/new`, value); },
      get: async () => {
        const docs = [...records.keys()].filter(key => group ? key.split('/').at(-2) === path : key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'))
          .filter(key => filters.every(([field, op, value]) => op === 'in' ? value.includes(records.get(key)[field]) : records.get(key)[field] === value)).slice(0, max).map(snapshot);
        return { docs, size: docs.length };
      },
    };
    return query;
  }
  const db = { doc: reference, collection, collectionGroup: (name: string) => collection(name, true),
    runTransaction: async (fn: any) => fn({ get: async (ref: any) => snapshot(ref.path), getAll: async (...refs: any[]) => refs.map(ref => snapshot(ref.path)),
      set: (ref: any, value: any) => records.set(ref.path, value), update: (ref: any, patch: any) => ref.update(patch) }) };
  const service: any = { db, secret, auth: { verifyIdToken: async (token: string) => {
    if (!['valid', 'another'].includes(token)) throw new Error('Invalid signature');
    return { uid: token === 'valid' ? 'anonymous-user' : 'another-user' };
  } } };
  return { records, service };
}

async function setup(t: any) {
  const f = fixture();
  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/player', createPlayerPortalApi(() => f.service));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let session = '';
  const request = async (path: string, body?: any, overrides: Record<string, string> = {}) => {
    const response = await fetch(`${origin}/api/player/${path}`, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid', 'X-Player-Session': session, ...overrides }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json().catch(() => null), headers: response.headers };
  };
  const login = async () => {
    const result = await request('login', { accessCode: ' p-7-abcd ' });
    assert.equal(result.status, 200);
    session = result.data.session;
    return result;
  };
  return { ...f, request, login, setSession: (value: string) => { session = value; } };
}

test('valid existing code logs in; dashboard projects only own private data', async t => {
  const f = await setup(t);
  const login = await f.login();
  assert.equal(login.data.player.id, 'me');
  assert.equal(login.data.player.accessCode, undefined);
  assert.equal(login.data.player.notes, undefined);
  const response = await f.request('dashboard');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(response.data.matches[0].feedbacks, [{ playerId: 'me', strengths: 'Good' }]);
  assert.equal(response.data.matches[0].playerPoints, undefined);
  assert.equal(response.data.matches[0].privateExtra, undefined);
  assert.deepEqual(response.data.sessions[0].attendance, [{ playerId: 'me' }]);
  assert.deepEqual(response.data.sessions[0].evaluations, [{ playerId: 'me' }]);
  assert.equal(JSON.stringify(response.data).includes('Private'), false);
});

test('missing or forged Firebase identity cannot log in or read', async t => {
  const f = await setup(t);
  assert.equal((await f.request('login', { accessCode: 'P-7-ABCD' }, { Authorization: '' })).status, 401);
  assert.equal((await f.request('login', { accessCode: 'P-7-ABCD' }, { Authorization: 'Bearer forged' })).status, 401);
  assert.equal((await f.request('dashboard')).status, 401);
});

test('unknown and duplicate codes fail closed', async t => {
  const f = await setup(t);
  assert.equal((await f.request('login', { accessCode: 'WRONG' })).status, 401);
  f.records.set('users/other-coach/players/duplicate', { accessCode: 'P-7-ABCD' });
  assert.equal((await f.request('login', { accessCode: 'P-7-ABCD' })).status, 401);
});

test('session cannot be tampered with, transferred to another Firebase user or used after expiry', async t => {
  const f = await setup(t);
  const login = await f.login();
  assert.equal((await f.request('dashboard', undefined, { Authorization: 'Bearer another' })).status, 401);
  f.setSession(`${login.data.session}x`);
  assert.equal((await f.request('dashboard')).status, 401);
  f.setSession(signSession({ ...readSession(login.data.session, secret), audience: 'other-deployment' }, secret));
  assert.equal((await f.request('dashboard')).status, 401);
  f.setSession(signSession({ ...readSession(login.data.session, secret), exp: Date.now() - 1 }, secret));
  assert.equal((await f.request('dashboard')).status, 401);
});

test('coach code change revokes old session and old code; new code works', async t => {
  const f = await setup(t);
  await f.login();
  f.records.get(playerPath).accessCode = 'P-7-NEW2';
  assert.equal((await f.request('dashboard')).status, 401);
  assert.equal((await f.request('homework', { homeworkId: 'hw', completed: true })).status, 401);
  assert.equal((await f.request('login', { accessCode: 'P-7-ABCD' })).status, 401);
  assert.equal((await f.request('login', { accessCode: 'P-7-NEW2' })).status, 200);
});

test('deleting player revokes the session', async t => {
  const f = await setup(t);
  await f.login();
  f.records.delete(playerPath);
  assert.equal((await f.request('dashboard')).status, 401);
});

test('homework only changes completion of an existing own assignment', async t => {
  const f = await setup(t);
  await f.login();
  assert.equal((await f.request('homework', { homeworkId: 'unknown', completed: true })).status, 400);
  assert.equal((await f.request('homework', { homeworkId: 'hw', completed: 'yes' })).status, 400);
  assert.equal((await f.request('homework', { homeworkId: 'hw', completed: true, playerId: 'other', accessCode: 'hijack', title: 'overwrite' })).status, 200);
  assert.deepEqual(f.records.get(playerPath).homework, [{ id: 'hw', title: 'Shoot', completed: true }]);
  assert.equal(f.records.get(playerPath).accessCode, 'P-7-ABCD');
});

test('messages contain only own conversation and team; sender cannot be spoofed', async t => {
  const f = await setup(t);
  await f.login();
  const response = await f.request('messages');
  assert.deepEqual(response.data.map((m: any) => m.id).sort(), ['mine', 'team']);
  assert.equal((await f.request('read', { messageId: 'private' })).status, 403);
  assert.equal((await f.request('messages', { text: 'Hello coach', senderId: 'other', senderRole: 'coach', coachId: 'other-coach', recipientId: 'TEAM' })).status, 200);
  const message = f.records.get('users/coach/messages/new');
  assert.equal(message.senderId, 'me');
  assert.equal(message.senderRole, 'player');
  assert.equal(message.recipientId, 'coach');
  assert.equal((await f.request('messages', { text: 'x'.repeat(4001) })).status, 400);
});

test('feedback only changes allowlisted fields of the authenticated player', async t => {
  const f = await setup(t);
  await f.login();
  assert.equal((await f.request('feedback', { aiFeedback: 'Feedback', suggestedDrills: ['e1'], accessCode: 'hijack', playerId: 'other' })).status, 200);
  assert.equal(f.records.get(playerPath).accessCode, 'P-7-ABCD');
  assert.equal(f.records.get(playerPath).aiFeedback, 'Feedback');
  assert.equal(f.records.get('users/coach/players/other').aiFeedback, undefined);
  assert.equal((await f.request('feedback', { aiFeedback: 'Feedback', suggestedDrills: [123] })).status, 400);
});

test('login guessing is limited using shared persistent counters', async t => {
  const f = await setup(t);
  for (let i = 0; i < 10; i++) assert.equal((await f.request('login', { accessCode: 'WRONG' })).status, 401);
  assert.equal((await f.request('login', { accessCode: 'P-7-ABCD' })).status, 429);
  assert.equal([...f.records.values()].some(v => v.expiresAt), true);
});

test('signatures reject a different signing secret', () => {
  const token = signSession({ uid: 'u', exp: Date.now() + 10000 }, secret);
  assert.throws(() => readSession(token, 'different-secret'));
  assert.throws(() => readSession(`${token}.extra`, secret));
  assert.notEqual(codeDigest('old-code', secret), codeDigest('new-code', secret));
});

test('real Vercel app routes health and fails closed without server credentials', async t => {
  const previousVercel = process.env.VERCEL;
  const previousCredential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  process.env.VERCEL = '1';
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  t.after(() => {
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
    if (previousCredential === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON; else process.env.FIREBASE_SERVICE_ACCOUNT_JSON = previousCredential;
  });
  const { default: app } = await import('../server.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  assert.equal((await fetch(`${origin}/api/health`)).status, 200);
  assert.equal((await fetch(`${origin}/api/player/dashboard`)).status, 401);
  const response = await fetch(`${origin}/api/player/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' }, body: JSON.stringify({ accessCode: 'TEST' }) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /inte konfigurerad/);
});
