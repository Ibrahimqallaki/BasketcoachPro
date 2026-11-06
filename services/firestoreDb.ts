import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  type Firestore
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
export const appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

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

/**
 * Resolves authenticated coach from incoming request via:
 * 1. Authorization: Bearer <Firebase ID Token / UID>
 * 2. Header: x-coach-uid
 * 3. Query param: ?coachId
 */
export function resolveAuthenticatedCoach(req: express.Request): AuthenticatedCoach | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      // Check if it's a JWT from Firebase Auth
      if (token.includes('.')) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            const uid = payload.user_id || payload.sub;
            if (uid) {
              return {
                coachId: uid,
                email: payload.email
              };
            }
          }
        } catch (e) {
          console.warn('Failed to parse Bearer JWT:', e);
        }
      }
      // If token is raw UID
      return { coachId: token };
    }
  }

  const headerUid = req.headers['x-coach-uid'] as string;
  if (headerUid && headerUid.trim()) {
    return { coachId: headerUid.trim() };
  }

  const queryUid = req.query.coachId as string;
  if (queryUid && queryUid.trim()) {
    return { coachId: queryUid.trim() };
  }

  return null;
}
