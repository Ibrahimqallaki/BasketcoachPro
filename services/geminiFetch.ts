import { auth } from './firebase';

/**
 * All Gemini calls go through this helper so the server receives a Firebase
 * ID token. The Gemini API key itself never goes to the browser.
 */
export async function geminiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Logga in för att använda AI-coachen.');
  }
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
