import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { mockPhases, mockWarmupExercises } from './services/mockData';
import { 
  serverDb, 
  CANONICAL_COACH_ID, 
  ensureFirestoreInitialized, 
  cleanFirestoreData 
} from './services/firestoreDb';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Server-side Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for model selection
const MODEL_NAME = 'gemini-3-flash-preview';

// 1. Dashboard AI Insight
app.post('/api/gemini/insight', async (req, res) => {
  try {
    const { playersCount, sessionsCount, recentMatches } = req.body;
    const prompt = `Du är en assisterande basketcoach för ett svenskt ungdomslag (Orion HU15). Ge en kort, proaktiv och uppmuntrande insikt (max 2 meningar) till huvudtränaren baserat på följande data:
    Total truppstorlek (registrerade spelare): ${playersCount || 0}. Antal genomförda träningar i appens logg: ${sessionsCount || 0}. Senaste matchresultat: ${recentMatches || 'Inga'}.
    VIKTIGT: Säg INTE att spelarna är "på plats idag" – detta är lagets totala truppstorlek, inte en pågående träning eller fysisk närvaro idag.
    Fokusera på vad laget kan bygga vidare på. Svara på ren svenska.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const insight = response.text?.trim() || 'Dags för en ny bra träningsvecka. Fokusera på detaljerna i matchtempot!';
    res.json({ insight });
  } catch (error: any) {
    console.error('Error generating AI insight:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch AI insight' });
  }
});

// 2. AI Coach Chat
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, contextString } = req.body;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: message,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `You are an expert basketball coach assistant for a youth team. 
        You have access to the following team data to provide personalized advice:
        
        ${contextString || ''}
        
        Guidelines:
        1. Use the provided data to make your answers specific. If the coach asks for a training plan, look at recent match results or training focus.
        2. Be encouraging, concise, and professional.
        3. Always answer in Swedish.
        4. Keep answers actionable and focused on player development and SBBF standards (Knäkontroll, Rörelseförståelse).
        5. If data is missing or sparse, give general expert advice but mention that more data would help.`,
      },
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Error in AI Coach chat:', error);
    res.status(500).json({ error: error.message || 'Chat error' });
  }
});

// 3. Parse Match Text (OCR / Text)
app.post('/api/gemini/parse-match-text', async (req, res) => {
  try {
    const { rawText } = req.body;
    const optimizedText = rawText && rawText.length > 8000 ? rawText.substring(0, 8000) : rawText;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Extract basketball match data for Orion (or user's team) from this Profixio or match text:
"${optimizedText}"

Instructions:
1. Identify opponent name.
2. Identify score (our score) and opponentScore (their score).
3. Identify match date in format YYYY-MM-DD (or best guess).
4. Extract at most 20 major match events or period scores (do not list hundreds of minor lines to avoid truncation).
Output valid JSON adhering to schema.`,
      config: {
        systemInstruction: 'Strict data extractor for basketball matches. Extract opponent, score, opponentScore, date, and up to 20 key events. Return valid JSON only.',
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            opponent: { type: Type.STRING },
            score: { type: Type.NUMBER },
            opponentScore: { type: Type.NUMBER },
            date: { type: Type.STRING },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  description: { type: Type.STRING },
                  team: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const rawOutput = (response.text || '{}').trim();
    try {
      const parsed = JSON.parse(rawOutput);
      return res.json(parsed);
    } catch (parseErr) {
      console.warn("Direct JSON.parse failed on model output, attempting repair...", parseErr);
      // Fallback repair: extract top-level properties with regex if truncated
      const opponentMatch = rawOutput.match(/"opponent"\s*:\s*"([^"]+)"/);
      const scoreMatch = rawOutput.match(/"score"\s*:\s*(\d+)/);
      const oppScoreMatch = rawOutput.match(/"opponentScore"\s*:\s*(\d+)/);
      const dateMatch = rawOutput.match(/"date"\s*:\s*"([^"]+)"/);

      return res.json({
        opponent: opponentMatch ? opponentMatch[1] : "Okänd Motståndare",
        score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        opponentScore: oppScoreMatch ? parseInt(oppScoreMatch[1]) : 0,
        date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
        events: []
      });
    }
  } catch (error: any) {
    console.error('Error parsing match text:', error);
    res.status(500).json({ error: error.message || 'Parsing error' });
  }
});

// 4. Parse Match Screenshot
app.post('/api/gemini/parse-match-image', async (req, res) => {
  try {
    const { base64Image } = req.body;
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: 'Extract basketball match data. Identify opponent, score, opponentScore, date (YYYY-MM-DD), and at most 20 major events.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            opponent: { type: Type.STRING },
            score: { type: Type.NUMBER },
            opponentScore: { type: Type.NUMBER },
            date: { type: Type.STRING },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  description: { type: Type.STRING },
                  team: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const rawOutput = (response.text || '{}').trim();
    try {
      const parsed = JSON.parse(rawOutput);
      return res.json(parsed);
    } catch (parseErr) {
      console.warn("Direct JSON.parse failed on screenshot output, attempting repair...", parseErr);
      const opponentMatch = rawOutput.match(/"opponent"\s*:\s*"([^"]+)"/);
      const scoreMatch = rawOutput.match(/"score"\s*:\s*(\d+)/);
      const oppScoreMatch = rawOutput.match(/"opponentScore"\s*:\s*(\d+)/);
      const dateMatch = rawOutput.match(/"date"\s*:\s*"([^"]+)"/);

      return res.json({
        opponent: opponentMatch ? opponentMatch[1] : "Okänd Motståndare",
        score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        opponentScore: oppScoreMatch ? parseInt(oppScoreMatch[1]) : 0,
        date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
        events: []
      });
    }
  } catch (error: any) {
    console.error('Error parsing match screenshot:', error);
    res.status(500).json({ error: error.message || 'Screenshot parsing error' });
  }
});

// 5. Video / Frame Analysis
app.post('/api/gemini/analyze-frame', async (req, res) => {
  try {
    const { base64Images, userInstruction, playerFocus } = req.body;
    const images = Array.isArray(base64Images) ? base64Images : [base64Images];
    const isSequence = images.length > 1;
    const isFullVideo = images.length > 10;

    let prompt = '';
    if (isFullVideo) {
      prompt = `Here are ${images.length} frames extracted evenly from a basketball video. Provide a SUMMARY analysis.`;
    } else if (isSequence) {
      prompt = 'Analyze this sequence of 5 basketball frames.';
    } else {
      prompt = 'Analyze this specific basketball frame.';
    }

    prompt += ' Identify spacing issues, defensive stance quality, or scoring opportunities.';

    if (playerFocus) {
      prompt += ` Focus specifically on player number ${playerFocus}.`;
    }

    if (userInstruction) {
      prompt += ` The coach is specifically asking: "${userInstruction}".`;
    }

    const parts: any[] = images.map((img: string) => {
      const cleanBase64 = img.split(',')[1] || img;
      return {
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64,
        },
      };
    });

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    res.json({ text: response.text || 'Ingen analys kunde genereras.' });
  } catch (error: any) {
    console.error('Error analyzing frame:', error);
    res.status(500).json({ error: error.message || 'Frame analysis error' });
  }
});

// 6. Player Performance Feedback
app.post('/api/gemini/player-feedback', async (req, res) => {
  try {
    const { playerName, skillAssessment, matches, allExercises } = req.body;
    const prompt = `Du är en professionell basketcoach. Analysera följande spelares prestationer och ge personlig feedback. Föreslå även 3 specifika övningar från listan för att förbättra spelarens svagheter.
    Spelare: ${playerName}
    Skills: ${JSON.stringify(skillAssessment)}
    Matcher: ${JSON.stringify(matches)}
    Tillgängliga övningar (ID och Kategori): ${JSON.stringify(allExercises)}
    
    Svara i strikt JSON-format med följande struktur:
    {
        "feedback": "Din personliga feedback här...",
        "suggestedDrills": ["id1", "id2", "id3"]
    }`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating player feedback:', error);
    res.status(500).json({ error: error.message || 'Feedback error' });
  }
});

// 7. Player Ask Coach (Exercise Q&A)
app.post('/api/gemini/player-ask', async (req, res) => {
  try {
    const { exerciseTitle, question } = req.body;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Du är en peppande basketcoach. Spelaren frågar om övningen "${exerciseTitle}". Fråga: "${question}". Svara kort, pedagogiskt och uppmuntrande på svenska.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    res.json({ text: response.text || 'Träna på och ha kul på planen!' });
  } catch (error: any) {
    console.error('Error in player ask:', error);
    res.status(500).json({ error: error.message || 'Q&A error' });
  }
});

// 7b. AI Suggest Training Exercises based on theme & duration from available library
app.post('/api/gemini/suggest-training', async (req, res) => {
  try {
    const { theme, durationMinutes, availableExercises, availableWarmups } = req.body;
    const prompt = `Du är en erfaren svensk ungdomsbasketcoach för HU15 (killar 14-15 år).
Coachen vill planera ett träningspass med följande förutsättningar:
- Tema: "${theme || 'Allround basket-IQ & matchtempo'}"
- Passlängd: ca ${durationMinutes || 90} minuter.

Välj ut de bäst lämpade övningarna ENBART från nedanstående listor av befintliga övningar i appens bibliotek.
Hitta en balanserad struktur:
1. 1-2 uppvärmningsövningar från tillgängliga uppvärmningar (totalt ca 10-15 min)
2. 3-4 huvudövningar från tillgängliga övningar (med lämplig tidsfördelning per övning i minuter).

Tillgängliga uppvärmningsövningar:
${JSON.stringify((availableWarmups || []).map((w: any) => ({ id: w.id, title: w.title, phase: w.phase })))}

Tillgängliga huvudövningar:
${JSON.stringify((availableExercises || []).map((e: any) => ({ id: e.id, title: e.title, category: e.category, level: e.level })))}

Svara i strikt JSON-format:
{
  "theme": "Passets tema (förfinat om nödvändigt)",
  "rationale": "Kort coach-motivering på 1-2 meningar på svenska varför detta upplägg passar HU15",
  "suggestedWarmupIds": ["id1", "id2"],
  "suggestedExerciseIds": ["idA", "idB", "idC"],
  "exerciseDurations": {
    "idA": 15,
    "idB": 20,
    "idC": 25
  }
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error suggesting training:', error);
    res.status(500).json({ error: error.message || 'Suggest training error' });
  }
});

// 8. Generate App Concept
app.post('/api/gemini/concept', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Design a detailed app concept based on: ${prompt}`,
      config: {
        systemInstruction: 'You are a senior product architect. Provide the response as a structured Markdown breakdown including Name, Purpose, Key Features, and Tech Stack.',
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || 'Failed to generate concept.' });
  } catch (error: any) {
    console.error('Error generating concept:', error);
    res.status(500).json({ error: error.message || 'Concept error' });
  }
});

// 9. Generate Image
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
      }
    }
    res.json({ imageUrl: null });
  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message || 'Image generation error' });
  }
});

// Helper to extract coachId
const getTargetCoachId = (req: express.Request): string => {
  return (req.query.coachId as string) || (req.body?.coachId as string) || CANONICAL_COACH_ID;
};

// 10. REST API v1 for ChatGPT Plugin, Voice Assistant, and External Integrations
app.get('/api/v1/team-summary', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);

    // 1. Matches
    const matchesCol = collection(serverDb, `users/${coachId}/matches`);
    const matchesSnap = await getDocs(query(matchesCol, orderBy('date', 'desc')));
    const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 2. Planned Sessions
    const plannedCol = collection(serverDb, `users/${coachId}/planned_sessions`);
    const plannedSnap = await getDocs(query(plannedCol, orderBy('date', 'asc')));
    const plannedSessions = plannedSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 3. Players
    const playersCol = collection(serverDb, `users/${coachId}/players`);
    const playersSnap = await getDocs(query(playersCol, orderBy('number', 'asc')));
    const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 4. Completed Sessions
    const sessionsCol = collection(serverDb, `users/${coachId}/sessions`);
    const sessionsSnap = await getDocs(query(sessionsCol, orderBy('date', 'desc')));
    const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const latestMatch = matches[0] || null;
    const upcoming = plannedSessions.filter(s => s.status === 'planned');

    res.json({
      team: 'Orion HU15',
      category: 'Pojkar 14-15 år (HU15)',
      coach: 'Ibrahim Qallaki',
      coachId,
      standardPracticeMinutes: 90,
      currentThemes: ['Pick & Roll', 'Helplanspressbryt', 'Defensiva returer', '5-Out rörelse'],
      rosterSummary: {
        totalPlayers: players.length,
        players: players.map(p => ({
          id: p.id,
          name: p.name,
          number: p.number,
          position: p.position,
          accessCode: p.accessCode
        }))
      },
      stats: {
        matchesPlayed: matches.length,
        wins: matches.filter(m => (m.score || 0) > (m.opponentScore || 0)).length,
        losses: matches.filter(m => (m.score || 0) < (m.opponentScore || 0)).length,
        pointDifference: matches.reduce((acc, m) => acc + ((m.score || 0) - (m.opponentScore || 0)), 0),
        completedSessions: sessions.length
      },
      latestMatch: latestMatch ? {
        id: latestMatch.id,
        date: latestMatch.date,
        opponent: latestMatch.opponent,
        score: latestMatch.score,
        opponentScore: latestMatch.opponentScore,
        result: `${latestMatch.score}–${latestMatch.opponentScore}`,
        teamSummary: latestMatch.teamSummary || '',
        reflection: {
          whatWorked: latestMatch.whatWorked || '',
          whatToImprove: latestMatch.whatToImprove || '',
          nextTrainingFocus: latestMatch.nextTrainingFocus || ''
        },
        playerPoints: latestMatch.playerPoints || {},
        feedbacks: latestMatch.feedbacks || []
      } : null,
      upcomingPlannedSessions: upcoming,
      availableLibrary: {
        totalExercises: mockPhases.reduce((acc, p) => acc + p.exercises.length, 0),
        totalWarmups: mockWarmupExercises.length,
        categories: ['Skott', 'Dribbling', 'Passningar', 'Försvar', 'Kondition', 'Basket-IQ', 'Fysik', 'Uppvärmning']
      }
    });
  } catch (err: any) {
    console.error('Error fetching team summary:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/players', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);
    const playersCol = collection(serverDb, `users/${coachId}/players`);
    const snap = await getDocs(query(playersCol, orderBy('number', 'asc')));
    const players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({
      total: players.length,
      players
    });
  } catch (err: any) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/exercises', async (req, res) => {
  try {
    const { category, phase } = req.query;
    let exercises = mockPhases.flatMap(p => p.exercises.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      level: e.level || 'Medel',
      duration: e.duration || '15 min',
      overview: e.overview,
      pedagogy: e.pedagogy,
      instructions: e.instructions,
      criteria: e.criteria,
      videoUrl: e.videoUrl,
      phaseId: p.id,
      phaseTitle: p.title
    })));

    let warmups = mockWarmupExercises.map(w => ({
      id: w.id,
      title: w.title,
      phase: w.phase,
      duration: w.duration,
      description: w.description,
      coachingPoints: w.coachingPoints,
      sbbfFocus: w.sbbfFocus,
      visualSteps: w.visualSteps,
      videoUrl: w.videoUrl
    }));

    if (category) {
      exercises = exercises.filter(e => e.category.toLowerCase() === String(category).toLowerCase());
    }
    if (phase) {
      exercises = exercises.filter(e => e.phaseId === Number(phase));
    }

    res.json({
      totalExercises: exercises.length,
      totalWarmups: warmups.length,
      categories: ['Skott', 'Dribbling', 'Passningar', 'Försvar', 'Kondition', 'Basket-IQ', 'Fysik', 'Uppvärmning'],
      exercises,
      warmups
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/matches', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);
    const matchesCol = collection(serverDb, `users/${coachId}/matches`);
    const snap = await getDocs(query(matchesCol, orderBy('date', 'desc')));
    const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({
      total: matches.length,
      matches
    });
  } catch (err: any) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/matches', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);

    const docId = req.body.id || `match_${req.body.date ? req.body.date.replace(/-/g, '') : Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const matchData = cleanFirestoreData({
      id: docId,
      date: req.body.date || new Date().toISOString().split('T')[0],
      opponent: req.body.opponent || 'Okänd Motståndare',
      score: Number(req.body.score) || 0,
      opponentScore: Number(req.body.opponentScore) || 0,
      teamSummary: req.body.teamSummary || '',
      whatWorked: req.body.whatWorked || '',
      whatToImprove: req.body.whatToImprove || '',
      nextTrainingFocus: req.body.nextTrainingFocus || '',
      playerPoints: req.body.playerPoints || {},
      feedbacks: req.body.feedbacks || [],
      profixioMatchId: req.body.profixioMatchId || null,
      created_at: req.body.created_at || new Date().toISOString()
    });

    await setDoc(doc(serverDb, `users/${coachId}/matches`, docId), matchData, { merge: true });
    res.status(201).json({ success: true, match: matchData });
  } catch (err: any) {
    console.error('Error saving match:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/matches/:id', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);
    const matchId = req.params.id;
    const updates = cleanFirestoreData({
      ...req.body,
      id: matchId,
      updated_at: new Date().toISOString()
    });

    await setDoc(doc(serverDb, `users/${coachId}/matches`, matchId), updates, { merge: true });
    const snap = await getDoc(doc(serverDb, `users/${coachId}/matches`, matchId));
    res.json({ success: true, match: { id: snap.id, ...snap.data() } });
  } catch (err: any) {
    console.error('Error updating match:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/planned-sessions', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);
    const plannedCol = collection(serverDb, `users/${coachId}/planned_sessions`);
    const snap = await getDocs(query(plannedCol, orderBy('date', 'asc')));
    const plannedSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({
      total: plannedSessions.length,
      plannedSessions
    });
  } catch (err: any) {
    console.error('Error fetching planned sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/planned-sessions', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);

    const docId = req.body.id || `planned_${req.body.date ? req.body.date.replace(/-/g, '') : Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const sessionData = cleanFirestoreData({
      id: docId,
      date: req.body.date || new Date().toISOString().split('T')[0],
      startTime: req.body.startTime || '18:00',
      theme: req.body.theme || 'Träningspass',
      durationMinutes: Number(req.body.durationMinutes) || 90,
      phaseId: Number(req.body.phaseId) || 2,
      warmupExerciseIds: req.body.warmupExerciseIds || [],
      exerciseIds: req.body.exerciseIds || [],
      exerciseDurations: req.body.exerciseDurations || {},
      status: req.body.status || 'planned',
      created_at: req.body.created_at || new Date().toISOString()
    });

    await setDoc(doc(serverDb, `users/${coachId}/planned_sessions`, docId), sessionData, { merge: true });
    res.status(201).json({ success: true, session: sessionData });
  } catch (err: any) {
    console.error('Error saving planned session:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/planned-sessions/:id', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);
    const sessionId = req.params.id;
    const updates = cleanFirestoreData({
      ...req.body,
      id: sessionId,
      updated_at: new Date().toISOString()
    });

    await setDoc(doc(serverDb, `users/${coachId}/planned_sessions`, sessionId), updates, { merge: true });
    const snap = await getDoc(doc(serverDb, `users/${coachId}/planned_sessions`, sessionId));
    res.json({ success: true, session: { id: snap.id, ...snap.data() } });
  } catch (err: any) {
    console.error('Error updating planned session:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/planned-sessions/:id', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);
    await deleteDoc(doc(serverDb, `users/${coachId}/planned_sessions`, req.params.id));
    res.json({ success: true, deletedId: req.params.id });
  } catch (err: any) {
    console.error('Error deleting planned session:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/matches/:id', async (req, res) => {
  try {
    const coachId = getTargetCoachId(req);
    await ensureFirestoreInitialized(coachId);
    await deleteDoc(doc(serverDb, `users/${coachId}/matches`, req.params.id));
    res.json({ success: true, deletedId: req.params.id });
  } catch (err: any) {
    console.error('Error deleting match:', err);
    res.status(500).json({ error: err.message });
  }
});

// Dev / Prod Vite handling
async function startServer() {
  try {
    await ensureFirestoreInitialized();
    console.log('Firestore initialized with canonical coach data.');
  } catch (initErr) {
    console.warn('Initial Firestore seeding warning:', initErr);
  }

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Basketcoach Pro server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
