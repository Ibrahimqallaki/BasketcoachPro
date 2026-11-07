import { createHmac, timingSafeEqual } from 'node:crypto';

export function codeDigest(code: string, secret: string) {
  return createHmac('sha256', secret).update(code).digest('hex');
}
export function signSession(value: object, secret: string) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${codeDigest(`session:v1:${payload}`, secret)}`;
}
export function readSession(token: string, secret: string): any {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid session');
  const expected = Buffer.from(codeDigest(`session:v1:${payload}`, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('Invalid session');
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (!Number.isFinite(value.exp) || value.exp <= Date.now()) throw new Error('Expired session');
  return value;
}
// Explicit projections prevent new coach-only fields from leaking into the portal.
export function portalPlayer(p: any, id: string) {
  const fields = ['name', 'number', 'avatar', 'position', 'age', 'level', 'skillAssessment', 'individualPlan', 'homework', 'nutrition', 'nutritionAdvice', 'aiFeedback', 'suggestedDrills', 'created_at'];
  return Object.fromEntries([['id', id], ...fields.filter(k => p[k] !== undefined).map(k => [k, p[k]])]);
}
export function portalMatch(m: any, id: string, playerId: string) {
  return { id, date: m.date, opponent: m.opponent, score: m.score, opponentScore: m.opponentScore,
    teamSummary: m.teamSummary || '', feedbacks: (m.feedbacks || []).filter((f: any) => f.playerId === playerId) };
}
export function portalTraining(s: any, id: string, playerId: string) {
  return { id, date: s.date, phaseId: s.phaseId, theme: s.theme || '', exerciseIds: s.exerciseIds || [],
    attendance: (s.attendance || []).filter((a: any) => a.playerId === playerId),
    evaluations: (s.evaluations || []).filter((e: any) => e.playerId === playerId) };
}
