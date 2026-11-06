import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  type Firestore
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

export const CANONICAL_COACH_ID = 'coach_ibrahim_qallaki';

const app = getApps().length === 0 ? initializeApp(appletConfig) : getApps()[0];
export const serverDb: Firestore = appletConfig.firestoreDatabaseId 
  ? getFirestore(app, appletConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initial real roster for Orion HU15
const INITIAL_PLAYERS = [
  {
    id: 'player_viktor_qallaki',
    name: 'Viktor Qallaki',
    number: 7,
    position: 'Forward',
    level: 'Medel/Avancerad',
    accessCode: 'P-7-VIKT',
    skillAssessment: { 'Skott': 4, 'Dribbling': 4, 'Passningar': 4, 'Försvar': 3 }
  },
  {
    id: 'player_liam_andersson',
    name: 'Liam Andersson',
    number: 10,
    position: 'Guard',
    level: 'Medel',
    accessCode: 'P-10-LIAM',
    skillAssessment: { 'Skott': 3, 'Dribbling': 4, 'Passningar': 4, 'Försvar': 4 }
  },
  {
    id: 'player_anton_lindqvist',
    name: 'Anton Lindqvist',
    number: 14,
    position: 'Center',
    level: 'Medel',
    accessCode: 'P-14-ANTO',
    skillAssessment: { 'Skott': 3, 'Dribbling': 3, 'Passningar': 3, 'Försvar': 4 }
  }
];

// Initial real matches from Profixio with reflections and individual player points
const INITIAL_MATCHES = [
  {
    id: 'match_hogsbo_20261011',
    date: '2026-10-11',
    opponent: 'Högsbo Panthers röd',
    score: 82,
    opponentScore: 38,
    teamSummary: 'Stark seriepremiär med dominant helplanspress och bra tempo.',
    whatWorked: 'Försvarsintensiteten och kontringarna gav tidigt övertag.',
    whatToImprove: 'Defensiva returer mot mer fysiska motståndare.',
    nextTrainingFocus: 'Boxout-teknik och snabb bollframdrivning.',
    playerPoints: {
      'player_viktor_qallaki': 28,
      'player_liam_andersson': 24,
      'player_anton_lindqvist': 18
    },
    feedbacks: [
      { playerId: 'player_viktor_qallaki', points: 28, effort: 4, teamwork: 4, learning: 3, strengths: 'Snabba avslut', improvements: 'Returer' },
      { playerId: 'player_liam_andersson', points: 24, effort: 4, teamwork: 4, learning: 4, strengths: 'Uppspel och driv', improvements: 'Bollkontroll vid press' },
      { playerId: 'player_anton_lindqvist', points: 18, effort: 4, teamwork: 3, learning: 3, strengths: 'Närskott och blockeringar', improvements: 'Boxout' }
    ]
  },
  {
    id: 'match_lundby_20261018',
    date: '2026-10-18',
    opponent: 'Lundby Basket 2',
    score: 72,
    opponentScore: 59,
    teamSummary: 'Stabil match med bra bollrörelse i andra halvlek.',
    whatWorked: 'Tålamod i anfallet och bra passningsvinklar.',
    whatToImprove: 'Minska antalet turnovers mot zonavskärning.',
    nextTrainingFocus: 'Passningsövningar under press och back-door cuts.',
    playerPoints: {
      'player_viktor_qallaki': 26,
      'player_liam_andersson': 20,
      'player_anton_lindqvist': 14
    },
    feedbacks: [
      { playerId: 'player_viktor_qallaki', points: 26, effort: 4, teamwork: 4, learning: 4, strengths: 'Mellandistansskott', improvements: 'Kommunikation i defense' },
      { playerId: 'player_liam_andersson', points: 20, effort: 4, teamwork: 4, learning: 3, strengths: 'Passningsvinklar', improvements: 'Vänsterhand' },
      { playerId: 'player_anton_lindqvist', points: 14, effort: 3, teamwork: 4, learning: 3, strengths: 'Returer', improvements: 'Fotarbete vid post-up' }
    ]
  },
  {
    id: 'match_sthelena_20261024',
    date: '2026-10-24',
    opponent: 'S:t Helena BK Grön',
    score: 64,
    opponentScore: 66,
    teamSummary: 'Jämn match in i slutsekunderna. Kämpainsats men för många bortkastade bollar i första perioden.',
    whatWorked: 'Försvarsspelet fungerade betydligt bättre efter de första tio minuterna.',
    whatToImprove: 'Anfall, passningar under press och bollkontroll behöver utvecklas.',
    nextTrainingFocus: 'Passningsövningar mot zonavskärning och bollkontroll under matchtempo.',
    playerPoints: {
      'player_viktor_qallaki': 22,
      'player_liam_andersson': 18,
      'player_anton_lindqvist': 12
    },
    feedbacks: [
      { playerId: 'player_viktor_qallaki', points: 22, effort: 4, teamwork: 3, learning: 4, strengths: 'En mot en attacker', improvements: 'Lugnare beslutsfattande i 4e perioden' },
      { playerId: 'player_liam_andersson', points: 18, effort: 4, teamwork: 4, learning: 4, strengths: 'Pressförsvar', improvements: 'Bollkontroll under matchtempo' },
      { playerId: 'player_anton_lindqvist', points: 12, effort: 4, teamwork: 3, learning: 3, strengths: 'Defensiva returer', improvements: 'Straffkast' }
    ]
  }
];

// Initial planned session
const INITIAL_PLANNED_SESSIONS = [
  {
    id: 'planned_20261029',
    date: '2026-10-29',
    startTime: '18:00',
    theme: 'Passningar under press & Boxout',
    durationMinutes: 90,
    phaseId: 2,
    warmupExerciseIds: ['w1', 'w3'],
    exerciseIds: ['f2e1', 'f2e2', 'f5e3', 'f6e1'],
    exerciseDurations: { 'f2e1': 15, 'f2e2': 20, 'f5e3': 20, 'f6e1': 20 },
    status: 'planned'
  }
];

// Initial completed session
const INITIAL_SESSIONS = [
  {
    id: 'session_20261020',
    date: '2026-10-20',
    phaseId: 2,
    theme: 'Passningsteknik & Spacing',
    warmupExerciseIds: ['w1'],
    exerciseIds: ['f2e1', 'f2e2'],
    attendance: [
      { playerId: 'player_viktor_qallaki', status: 'närvarande' },
      { playerId: 'player_liam_andersson', status: 'närvarande' },
      { playerId: 'player_anton_lindqvist', status: 'närvarande' }
    ],
    evaluations: []
  }
];

let isInitialized = false;

// Ensure Firestore has Orion HU15 team records
export async function ensureFirestoreInitialized(coachId = CANONICAL_COACH_ID): Promise<void> {
  if (isInitialized) return;
  try {
    const coachRef = doc(serverDb, `users/${coachId}`);
    const coachSnap = await getDoc(coachRef);
    if (!coachSnap.exists()) {
      await setDoc(coachRef, {
        name: 'Ibrahim Qallaki',
        email: 'ibrahim.qallaki@gmail.com',
        team: 'Orion HU15',
        role: 'coach',
        updated_at: serverTimestamp()
      }, { merge: true });
    }

    // 1. Players
    const playersCol = collection(serverDb, `users/${coachId}/players`);
    const playersSnap = await getDocs(playersCol);
    if (playersSnap.empty) {
      for (const p of INITIAL_PLAYERS) {
        await setDoc(doc(serverDb, `users/${coachId}/players`, p.id), {
          ...p,
          created_at: new Date().toISOString()
        });
      }
    }

    // 2. Matches
    const matchesCol = collection(serverDb, `users/${coachId}/matches`);
    const matchesSnap = await getDocs(matchesCol);
    if (matchesSnap.empty) {
      for (const m of INITIAL_MATCHES) {
        await setDoc(doc(serverDb, `users/${coachId}/matches`, m.id), {
          ...m,
          created_at: new Date().toISOString()
        });
      }
    }

    // 3. Planned Sessions
    const plannedCol = collection(serverDb, `users/${coachId}/planned_sessions`);
    const plannedSnap = await getDocs(plannedCol);
    if (plannedSnap.empty) {
      for (const ps of INITIAL_PLANNED_SESSIONS) {
        await setDoc(doc(serverDb, `users/${coachId}/planned_sessions`, ps.id), {
          ...ps,
          created_at: new Date().toISOString()
        });
      }
    }

    // 4. Sessions
    const sessionsCol = collection(serverDb, `users/${coachId}/sessions`);
    const sessionsSnap = await getDocs(sessionsCol);
    if (sessionsSnap.empty) {
      for (const s of INITIAL_SESSIONS) {
        await setDoc(doc(serverDb, `users/${coachId}/sessions`, s.id), {
          ...s,
          created_at: new Date().toISOString()
        });
      }
    }

    isInitialized = true;
  } catch (err) {
    console.warn('ensureFirestoreInitialized error:', err);
  }
}

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
