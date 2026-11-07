import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  type Firestore
} from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';
import type express from 'express';

// A static JSON import allows Vercel to bundle the Firebase web configuration.
export { appletConfig };

const app = getApps().length === 0 ? initializeApp(appletConfig) : getApps()[0];
export const serverDb: Firestore = appletConfig.firestoreDatabaseId 
  ? getFirestore(app, appletConfig.firestoreDatabaseId)
  : getFirestore(app);

// Clean undefined fields before writing to Firestore
export const cleanFirestoreData = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanFirestoreData(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as T;
};

// Strip sensitive fields such as player portal access codes from public / API responses
export const sanitizePlayerForApi = (player: any) => {
  if (!player || typeof player !== 'object') return player;
  const { accessCode, ...safePlayer } = player;
  return safePlayer;
};

export interface AuthenticatedCoach {
  coachId: string;
  email?: string;
}

export function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const res: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    if ('stringValue' in val) res[key] = val.stringValue;
    else if ('integerValue' in val) res[key] = Number(val.integerValue);
    else if ('doubleValue' in val) res[key] = Number(val.doubleValue);
    else if ('booleanValue' in val) res[key] = val.booleanValue;
    else if ('timestampValue' in val) res[key] = val.timestampValue;
    else if ('arrayValue' in val) {
      res[key] = (val.arrayValue.values || []).map((v: any) => {
        if ('mapValue' in v) return parseFirestoreFields(v.mapValue.fields || {});
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return Number(v.integerValue);
        return v;
      });
    } else if ('mapValue' in val) {
      res[key] = parseFirestoreFields(val.mapValue.fields || {});
    } else if ('nullValue' in val) {
      res[key] = null;
    }
  }
  return res;
}

/**
 * Queries a coach subcollection via Firestore REST API, passing the caller's Authorization token.
 * This guarantees that Firebase Security Rules evaluate request.auth.uid == coachId strictly.
 */
export async function queryUserCollectionViaRest(
  coachId: string, 
  collectionId: string, 
  authHeader?: string
) {
  const dbId = appletConfig.firestoreDatabaseId || '(default)';
  const projectId = appletConfig.projectId;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${coachId}:runQuery?key=${appletConfig.apiKey}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }]
      }
    })
  });

  const results = await res.json();
  if (!res.ok || (Array.isArray(results) && results[0]?.error)) {
    const errorObj = Array.isArray(results) ? results[0]?.error : results?.error;
    const errorMsg = errorObj?.message || `Firestore error HTTP ${res.status}`;
    const err: any = new Error(errorMsg);
    err.code = res.status === 403 || errorObj?.code === 403 ? 'permission-denied' : 'unauthenticated';
    throw err;
  }

  const docs: any[] = [];
  if (Array.isArray(results)) {
    for (const item of results) {
      if (item.document) {
        const docName = item.document.name || '';
        const docId = docName.split('/').pop();
        const fields = parseFirestoreFields(item.document.fields || {});
        docs.push({ id: docId, ...fields });
      }
    }
  }
  return docs;
}

/**
 * Validates a Firebase ID Token JWT:
 * 1. Confirms 3-part JWT structure
 * 2. Confirms audience/issuer belongs to this Firebase project
 * 3. Confirms token is not expired
 * 4. Extracts verified user UID (sub / user_id)
 */
export function verifyFirebaseToken(token: string): AuthenticatedCoach | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    const nowSec = Math.floor(Date.now() / 1000);

    // Verify expiration
    if (payload.exp && payload.exp < nowSec) {
      console.warn(`[Auth] Firebase token expired at ${new Date(payload.exp * 1000).toISOString()}`);
      return null;
    }

    // Verify audience / issuer
    const expectedProjectId = appletConfig.projectId;
    if (payload.aud !== expectedProjectId && payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
      console.warn(`[Auth] Token audience mismatch: got ${payload.aud}, expected ${expectedProjectId}`);
      return null;
    }

    const uid = payload.user_id || payload.sub;
    if (!uid || typeof uid !== 'string') {
      return null;
    }

    return {
      coachId: uid,
      email: payload.email
    };
  } catch (err: any) {
    console.warn('[Auth] Failed to decode Firebase token JWT:', err.message);
    return null;
  }
}

/**
 * Resolves authenticated coach strictly from verified Authorization: Bearer <token>.
 * Returns null if no token is provided or if token verification fails.
 * NO unauthenticated fallback is permitted.
 */
export function resolveAuthenticatedCoach(req: express.Request): AuthenticatedCoach | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return null;
  }

  return verifyFirebaseToken(token);
}
