import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { mockPhases, mockWarmupExercises } from './services/mockData';

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

// 10. REST API v1 for ChatGPT Plugin, Voice Assistant, and External Integrations
interface ServerMatch {
  id: string;
  date: string;
  opponent: string;
  score: number;
  opponentScore: number;
  teamSummary: string;
  whatWorked?: string;
  whatToImprove?: string;
  nextTrainingFocus?: string;
  playerPoints?: Record<string, number>;
  feedbacks?: any[];
}

const serverMatches: ServerMatch[] = [
  {
    id: 'm1',
    date: '2026-10-11',
    opponent: 'Högsbo Panthers röd',
    score: 82,
    opponentScore: 38,
    teamSummary: 'Stark seriepremiär med dominant helplanspress och bra tempo.',
    whatWorked: 'Försvarsintensiteten och kontringarna gav tidigt övertag.',
    whatToImprove: 'Defensiva returer mot mer fysiska motståndare.',
    nextTrainingFocus: 'Boxout-teknik och snabb bollframdrivning.',
    playerPoints: { 'p1': 22, 'p2': 18, 'p3': 14 }
  },
  {
    id: 'm2',
    date: '2026-10-18',
    opponent: 'Lundby Basket 2',
    score: 72,
    opponentScore: 59,
    teamSummary: 'Stabil match med bra bollrörelse i andra halvlek.',
    whatWorked: 'Tålamod i anfallet och bra passningsvinklar.',
    whatToImprove: 'Minska antalet turnovers mot zonavskärning.',
    nextTrainingFocus: 'Passningsövningar under press och back-door cuts.',
    playerPoints: { 'p1': 19, 'p2': 16, 'p3': 11 }
  },
  {
    id: 'm3',
    date: '2026-10-24',
    opponent: 'S:t Helena BK Grön',
    score: 64,
    opponentScore: 66,
    teamSummary: 'Jämn match in i slutsekunderna. Kämpainsats men för många bortkastade bollar i första perioden.',
    whatWorked: 'Försvarsspelet fungerade betydligt bättre efter de första tio minuterna.',
    whatToImprove: 'Anfall, passningar under press och bollkontroll behöver utvecklas.',
    nextTrainingFocus: 'Passningsövningar mot zonavskärning och bollkontroll under matchtempo.',
    playerPoints: { 'p1': 20, 'p2': 15, 'p3': 8 }
  }
];

const serverPlannedSessions: any[] = [
  {
    id: 'ps1',
    date: '2026-10-29',
    startTime: '18:00',
    theme: 'Passningar under press & Boxout',
    durationMinutes: 90,
    warmupExerciseIds: ['w1', 'w3'],
    exerciseIds: ['f2e1', 'f2e2', 'f5e3', 'f6e1'],
    exerciseDurations: { 'f2e1': 15, 'f2e2': 20, 'f5e3': 20, 'f6e1': 20 },
    status: 'planned'
  }
];

app.get('/api/v1/team-summary', async (req, res) => {
  const latestMatch = serverMatches[serverMatches.length - 1] || serverMatches[0];
  const upcoming = serverPlannedSessions.filter(s => s.status === 'planned');

  res.json({
    team: 'Orion HU15',
    category: 'Pojkar 14-15 år (HU15)',
    coach: 'Ibrahim Qallaki',
    standardPracticeMinutes: 90,
    currentThemes: ['Pick & Roll', 'Helplanspressbryt', 'Defensiva returer', '5-Out rörelse'],
    stats: {
      matchesPlayed: serverMatches.length,
      wins: serverMatches.filter(m => m.score > m.opponentScore).length,
      losses: serverMatches.filter(m => m.score < m.opponentScore).length,
      pointDifference: serverMatches.reduce((acc, m) => acc + (m.score - m.opponentScore), 0)
    },
    latestMatch: latestMatch ? {
      date: latestMatch.date,
      opponent: latestMatch.opponent,
      score: latestMatch.score,
      opponentScore: latestMatch.opponentScore,
      result: `${latestMatch.score}–${latestMatch.opponentScore}`,
      reflection: {
        whatWorked: latestMatch.whatWorked,
        whatToImprove: latestMatch.whatToImprove,
        nextTrainingFocus: latestMatch.nextTrainingFocus
      },
      playerPoints: latestMatch.playerPoints
    } : null,
    upcomingPlannedSessions: upcoming,
    availableLibrary: {
      totalExercises: mockPhases.reduce((acc, p) => acc + p.exercises.length, 0),
      totalWarmups: mockWarmupExercises.length,
      categories: ['Skott', 'Dribbling', 'Passningar', 'Försvar', 'Kondition', 'Basket-IQ', 'Fysik', 'Uppvärmning']
    }
  });
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
  res.json({
    total: serverMatches.length,
    matches: serverMatches
  });
});

app.post('/api/v1/matches', async (req, res) => {
  try {
    const newMatch: ServerMatch = {
      id: req.body.id || 'm_' + Math.random().toString(36).substr(2, 8),
      date: req.body.date || new Date().toISOString().split('T')[0],
      opponent: req.body.opponent || 'Okänd Motståndare',
      score: Number(req.body.score) || 0,
      opponentScore: Number(req.body.opponentScore) || 0,
      teamSummary: req.body.teamSummary || '',
      whatWorked: req.body.whatWorked,
      whatToImprove: req.body.whatToImprove,
      nextTrainingFocus: req.body.nextTrainingFocus,
      playerPoints: req.body.playerPoints || {},
      feedbacks: req.body.feedbacks || []
    };
    serverMatches.push(newMatch);
    res.status(201).json({ success: true, match: newMatch });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/planned-sessions', async (req, res) => {
  res.json({
    total: serverPlannedSessions.length,
    plannedSessions: serverPlannedSessions
  });
});

app.post('/api/v1/planned-sessions', async (req, res) => {
  try {
    const session = {
      id: req.body.id || 'ps_' + Math.random().toString(36).substr(2, 8),
      date: req.body.date || new Date().toISOString().split('T')[0],
      startTime: req.body.startTime || '18:00',
      theme: req.body.theme || 'Träningspass',
      durationMinutes: req.body.durationMinutes || 90,
      warmupExerciseIds: req.body.warmupExerciseIds || [],
      exerciseIds: req.body.exerciseIds || [],
      exerciseDurations: req.body.exerciseDurations || {},
      status: req.body.status || 'planned',
      created_at: new Date().toISOString()
    };
    serverPlannedSessions.push(session);
    res.status(201).json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dev / Prod Vite handling
async function startServer() {
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
