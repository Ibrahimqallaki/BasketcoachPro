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
  listener.next({ docs: [...selected].reverse().map(record => ({ id: record.id, metadata: {hasPendingWrites: Boolean(record.pending)}, data: () => record })) });
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
const summaryOutput = await build({ entryPoints: ['services/chatStatus.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { getPlayerChatSummary } = await import(`data:text/javascript;base64,${Buffer.from(summaryOutput.outputFiles[0].text).toString('base64')}`);
const statusRecords = [
  { id:'team-old', senderRole:'coach', recipientId:'TEAM', timestamp:'2026-11-07T10:00:00.000Z', readBy:['coach','playerA'] },
  { id:'team-new', senderRole:'coach', recipientId:'TEAM', timestamp:'2026-11-07T11:00:00.000Z', readBy:['coach'] },
  { id:'direct-a', senderRole:'coach', recipientId:'playerA', timestamp:'2026-11-07T12:00:00.000Z', readBy:['coach','playerA'] },
  { id:'reply-unread', senderRole:'player', senderId:'playerA', recipientId:'coach', timestamp:'2026-11-07T13:00:00.000Z', readBy:['playerA'] },
  { id:'reply-read', senderRole:'player', senderId:'playerA', recipientId:'coach', timestamp:'2026-11-07T13:01:00.000Z', readBy:['playerA','coach'] },
  { id:'reply-other', senderRole:'player', senderId:'playerB', recipientId:'coach', timestamp:'2026-11-07T13:02:00.000Z', readBy:['playerB'] },
];
let summary = getPlayerChatSummary(statusRecords,'playerA','coach');
assert.equal(summary.latestTeam.id,'team-new', 'Status must follow the newest team message, not an older read message');
assert.equal(summary.teamState,'unread');
assert.equal(summary.directState,'read');
assert.equal(summary.unreadReplies,1, 'Other players and already read replies must not increase this player badge');
statusRecords[1].readBy.push('playerA');
statusRecords[3].readBy.push('coach');
summary = getPlayerChatSummary(statusRecords,'playerA','coach');
assert.equal(summary.teamState,'read', 'Read receipt must change the displayed status');
assert.equal(summary.unreadReplies,0, 'Opening the reply must clear its unread badge');
assert.equal(getPlayerChatSummary(statusRecords,'playerB','coach').teamState,'unread', 'Another player must remain unread');
statusRecords[1].pending = true;
assert.equal(getPlayerChatSummary(statusRecords,'playerA','coach').teamState,'pending', 'Local pending writes must not claim sent/read');
assert.equal(getPlayerChatSummary([],'playerA','coach').teamState,'none');

// An older team receipt must survive 600 newer, unrelated private messages.
const overviewRecords = [...statusRecords, ...Array.from({length:600}, (_, i) => ({
  id:`other-dm-${i}`, senderRole:'coach', recipientId:'playerB',
  timestamp:new Date(Date.parse('2026-11-08T10:00:00.000Z') + i * 1000).toISOString(), readBy:['coach'],
}))].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
let overviewSummary;
globalThis.__chatAdapter = { subscribe(q,next) {
  let data = overviewRecords;
  for (const c of q.constraints) if (c.kind === 'limit') data = data.slice(0,c.count);
  next({docs:data.map(record => ({id:record.id, metadata:{hasPendingWrites:false}, data:() => ({...record,timestamp:{toDate:() => new Date(record.timestamp)}})}))});
  return () => {};
} };
chatService.subscribeToAllMessages('coach', data => { overviewSummary = getPlayerChatSummary(data,'playerA','coach'); })();
assert.equal(overviewSummary.latestTeam?.id,'team-new', 'Other recent conversations must not erase the latest team receipt');
delete globalThis.__chatAdapter;
console.log('PASS: history/realtime, team/private separation, async errors, send routing, per-player latest read status, unread reply counts, receipt updates and pending writes. No real Firebase writes.');
