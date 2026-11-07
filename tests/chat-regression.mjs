import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the actual service with an isolated Firestore adapter. No Firebase
// credentials, network traffic or messages to real players are involved.
const firebaseStub = `export const db = {}; export const auth = {currentUser:{uid:'coach'}}; export const isFirebaseConfigured = true;`;
const firestoreStub = `
export const collection = (db, path) => ({path});
export const where = (field, op, values) => ({kind:'where',field,op,values});
export const limit = count => ({kind:'limit',count});
export const orderBy = (field, direction) => ({kind:'orderBy',field,direction});
export const query = (ref,...constraints) => ({ref,constraints});
export const onSnapshot = (q, options, next, error) => globalThis.__chatAdapter.subscribe(q,next,error);
export const addDoc = async (ref,data) => globalThis.__chatAdapter.write(ref,data);
export const serverTimestamp = () => ({serverTimestamp:true});
export const doc = (db,path,id) => ({path,id});
export const updateDoc = async () => {};
export const getDocs = async () => {};
export const arrayUnion = (...values) => values;
export const Timestamp = {};
`;
const output = await build({ entryPoints: ['services/chatService.ts'], bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'isolated-firestore', setup(b) {
    b.onResolve({ filter: /^\.\/firebase$/ }, () => ({ path: 'firebase', namespace: 'fake' }));
    b.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: 'firestore', namespace: 'fake' }));
    b.onLoad({ filter: /.*/, namespace: 'fake' }, args => ({ contents: args.path === 'firebase' ? firebaseStub : firestoreStub, loader: 'js' }));
  } }] });
const { chatService } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
let records = Array.from({ length: 250 }, (_, i) => ({ id: `team-${i}`, conversationId: 'TEAM', recipientId: 'TEAM', senderId: 'coach', senderRole: 'coach', text: `message-${i}`, readBy: ['coach'], timestamp: { toDate: () => new Date(1700000000000 + i * 1000) } }));
records.push({ id: 'private-a', conversationId: 'coach_playerA', recipientId: 'playerA', text: 'private A' });
records.push({ id: 'private-b', conversationId: 'coach_playerB', recipientId: 'playerB', text: 'private B' });
const listeners = new Set();
let failRead = false;
let failWrite = false;
const writes = [];
function emit(listener) {
  if (failRead) { queueMicrotask(() => listener.error?.(new Error('permission-denied'))); return; }
  let selected = records.filter(record => listener.q.constraints.every(c => c.kind !== 'where' || c.values.includes(record[c.field])));
  for (const c of listener.q.constraints) if (c.kind === 'limit') selected = selected.slice(0, c.count);
  // Reverse document arrival to ensure the service actually sorts by timestamp.
  listener.next({ docs: [...selected].reverse().map(record => ({ id: record.id, data: () => record })) });
}
globalThis.__chatAdapter = {
  subscribe(q,next,error) { assert.equal(q.ref.path, 'users/coach/messages'); const l = { q,next,error }; listeners.add(l); emit(l); return () => listeners.delete(l); },
  write: async (ref,data) => { if (failWrite) throw new Error('permission-denied'); writes.push({ref,data}); },
};

let coachMessages;
const unsubscribe = chatService.subscribeToMessages('coach','coach',['TEAM'], data => { coachMessages = data; });
assert.equal(coachMessages.length,250, 'Coach must see history beyond the old 200-message cutoff');
assert.equal(coachMessages[0].text,'message-0');
assert.equal(coachMessages.at(-1).text,'message-249');
records.push({ id: 'latest', conversationId: 'TEAM', recipientId: 'TEAM', text: 'new incoming message', timestamp: {toDate: () => new Date(1800000000000)} });
for (const l of listeners) emit(l);
assert.equal(coachMessages.at(-1).text,'new incoming message', 'Existing listener must receive the newest message');
unsubscribe();
assert.equal(listeners.size,0);

let privateMessages;
chatService.subscribeToMessages('coach','coach',['playerA'], data => { privateMessages = data; })();
assert.deepEqual(privateMessages.map(m => m.id),['private-a'], 'Private coach thread must exclude team and another player');
assert.deepEqual(privateMessages[0].readBy,[], 'Older messages without readBy must not crash the coach view');
let playerMessages;
chatService.subscribeToMessages('coach','playerA',['TEAM','coach'], data => { playerMessages = data; })();
assert.equal(playerMessages.length,252);
assert.equal(playerMessages.some(m => m.id === 'private-b'),false);

const originalError = console.error;
console.error = () => {};
try {
  failRead = true;
  let readError;
  const stop = chatService.subscribeToMessages('coach','coach',['TEAM'], () => assert.fail('Denied read must not pretend to be an empty conversation'), error => { readError = error; });
  await Promise.resolve();
  assert.equal(readError?.message,'permission-denied', 'Asynchronous Firebase errors must reach the UI callback');
  stop();
  failRead = false;
  await chatService.sendMessage('coach','Coach','coach','TEAM','hello team','coach');
  assert.equal(writes[0].data.conversationId,'TEAM');
  assert.equal(writes[0].data.recipientId,'TEAM');
  assert.equal(writes[0].ref.path,'users/coach/messages');
  await chatService.sendMessage('coach','Coach','coach','playerA','private hello','coach');
  assert.equal(writes[1].data.conversationId,'coach_playerA');
  failWrite = true;
  await assert.rejects(chatService.sendMessage('coach','Coach','coach','TEAM','denied','coach'));
} finally { console.error = originalError; delete globalThis.__chatAdapter; }
console.log('PASS: >200 messages, realtime arrival, team/private separation, legacy data, async read errors, send routing and write failure. No real Firebase writes.');
