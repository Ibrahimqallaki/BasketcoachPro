import { auth } from './firebase';

let session = '';
export const playerSession = {
  active: () => Boolean(session),
  clear: () => { session = ''; },
  set: (value: string) => { session = value; },
  request: async (path: string, body?: unknown): Promise<any> => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`/api/player/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}`, 'X-Player-Session': session },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({ error: 'Spelarinloggningens server kunde inte nås.' }));
    if (!response.ok) throw new Error(result.error || 'Spelarsessionen behöver förnyas. Logga in igen.');
    return result;
  },
};
