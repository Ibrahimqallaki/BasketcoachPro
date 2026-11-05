
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Swords, Star, Save, Plus, ChevronRight, X, Heart, Zap, Target, MessageCircle, Trophy, Hash, Loader2, Presentation, PenTool, Image as ImageIcon, Trash2, Link as LinkIcon, DownloadCloud, AlertCircle, Clock, Activity, Code, Server, Undo2, Crosshair, Camera, Sparkles, ClipboardPaste, Wand2, Check, Calendar, Users, Edit3 } from 'lucide-react';
import { dataService } from '../services/dataService';
import { parseMatchText } from '../services/gemini';
import { Player, MatchRecord, MatchFeedback, Shot } from '../types';

interface ImportedMatchEvent {
  time: string;
  type: 'score' | 'foul' | 'timeout' | 'period';
  description: string;
  team: 'us' | 'them';
}

const LOADING_MESSAGES = [
    "🚀 Startar Turbo-extrahering...",
    "📊 Hittar Orion HU14 poäng...",
    "✨ Formaterar fält..."
];

export const MatchEvaluation: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [magicText, setMagicText] = useState("");
  const [importing, setImporting] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [importedEvents, setImportedEvents] = useState<ImportedMatchEvent[]>([]);
  
  const [includePlayerRatings, setIncludePlayerRatings] = useState(false);
  const [activeRatedPlayerIds, setActiveRatedPlayerIds] = useState<Record<string, boolean>>({});

  const [newMatch, setNewMatch] = useState<{
    opponent: string;
    date: string;
    score: string;
    opponentScore: string;
    teamSummary: string;
    tacticalPlays: string[];
    shots: Shot[];
    feedbacks: Record<string, MatchFeedback>;
  }>({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    score: '',
    opponentScore: '',
    teamSummary: '',
    tacticalPlays: [],
    shots: [],
    feedbacks: {}
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        dataService.getPlayers(),
        dataService.getMatches()
      ]);
      setPlayers(p);
      setMatches(m);
      
      // We do NOT prefill fake 3/5 ratings for all players anymore.
      // Individual player feedback is optional and only saved if coach grades them.
      setNewMatch(prev => ({
        ...prev,
        feedbacks: {}
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
      let interval: number;
      if (importing) {
          setLoadingMsgIndex(0);
          interval = window.setInterval(() => {
              setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
          }, 400); 
      }
      return () => clearInterval(interval);
  }, [importing]);

  const handleMagicImport = async () => {
      if (!magicText.trim()) return;
      
      setImporting(true);
      try {
          const data = await parseMatchText(magicText);
          if (data) {
              setNewMatch(prev => ({
                  ...prev,
                  opponent: data.opponent || "",
                  score: data.score?.toString() || "",
                  opponentScore: data.opponentScore?.toString() || "",
                  date: data.date || prev.date,
                  teamSummary: `Auto-genererad från Profixio. ${data.events?.length || 0} perioder/händelser lästes in.`
              }));
              setImportedEvents(data.events || []);
              setMagicText(""); 
          }
      } catch (err) {
          console.error(err);
      } finally {
          setImporting(false);
      }
  };

  const handleEditMatch = (match: MatchRecord) => {
    setEditingMatchId(match.id);
    const fbMap: Record<string, MatchFeedback> = {};
    const ratedMap: Record<string, boolean> = {};

    (match.feedbacks || []).forEach(f => {
      fbMap[f.playerId] = f;
      ratedMap[f.playerId] = true;
    });

    setNewMatch({
      opponent: match.opponent || '',
      date: match.date || new Date().toISOString().split('T')[0],
      score: match.score?.toString() || '0',
      opponentScore: match.opponentScore?.toString() || '0',
      teamSummary: match.teamSummary || '',
      tacticalPlays: match.tacticalPlays || [],
      shots: match.shots || [],
      feedbacks: fbMap
    });

    setIncludePlayerRatings((match.feedbacks || []).length > 0);
    setActiveRatedPlayerIds(ratedMap);
    setSelectedMatch(null);
    setIsAdding(true);
  };

  const saveMatch = async () => {
    if (!newMatch.opponent) return;
    setLoading(true);

    // Only include feedbacks if coach enabled them and rated players
    let finalFeedbacks: MatchFeedback[] = [];
    if (includePlayerRatings) {
      finalFeedbacks = Object.entries(newMatch.feedbacks)
        .filter(([playerId]) => activeRatedPlayerIds[playerId] !== false)
        .map(([_, fb]) => fb);
    }

    const matchData = {
      date: newMatch.date,
      opponent: newMatch.opponent,
      score: parseInt(newMatch.score) || 0,
      opponentScore: parseInt(newMatch.opponentScore) || 0,
      teamSummary: newMatch.teamSummary,
      tacticalPlays: newMatch.tacticalPlays,
      shots: newMatch.shots,
      feedbacks: finalFeedbacks
    };

    if (editingMatchId) {
      await dataService.updateMatch(editingMatchId, matchData);
    } else {
      await dataService.saveMatch(matchData);
    }
    
    await loadData();
    setIsAdding(false);
    setEditingMatchId(null);
    setImportedEvents([]);
    setIncludePlayerRatings(false);
    setActiveRatedPlayerIds({});
    
    setNewMatch({
      opponent: '',
      date: new Date().toISOString().split('T')[0],
      score: '',
      opponentScore: '',
      teamSummary: '',
      tacticalPlays: [],
      shots: [],
      feedbacks: {}
    });
  };

  const updateFeedback = (playerId: string, field: keyof MatchFeedback, value: any) => {
    setNewMatch(prev => {
      const current = prev.feedbacks[playerId] || {
        playerId,
        effort: 3,
        teamwork: 3,
        learning: 3,
        strengths: '',
        improvements: ''
      };
      return {
        ...prev,
        feedbacks: {
          ...prev.feedbacks,
          [playerId]: { ...current, [field]: value }
        }
      };
    });
    setActiveRatedPlayerIds(prev => ({ ...prev, [playerId]: true }));
  };

  if (loading && players.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Synkar matcher...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter">Matchanalys</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Orion HU14 Intelligence</p>
        </div>
        {!isAdding && !selectedMatch && (
          <button 
            onClick={() => setIsAdding(true)} 
            className="px-6 py-3 bg-orange-600 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-900/20 text-white flex items-center gap-2 hover:bg-orange-500 transition-all"
          >
            <Plus size={16} /> Ny Match
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
          <div className="p-6 md:p-10 rounded-[2rem] bg-slate-900 border border-slate-800 space-y-8 shadow-2xl">
            
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-500/30 space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={80} className="text-indigo-400" />
                </div>
                
                <div className="flex items-center gap-2 text-indigo-400 relative z-10">
                    <Wand2 size={20} className="animate-pulse" />
                    <h4 className="text-xs font-black uppercase tracking-[0.2em]">Snabb-import (Markera allt & Kopiera)</h4>
                </div>
                
                <div className="space-y-4 relative z-10">
                    <div className="relative">
                        <textarea 
                            value={magicText}
                            onChange={(e) => setMagicText(e.target.value)}
                            placeholder="Klistra in allt från Profixio här..."
                            className="w-full h-32 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-all custom-scrollbar resize-none"
                        />
                        {magicText && !importing && (
                            <button 
                                onClick={handleMagicImport}
                                className="absolute bottom-4 right-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl animate-in zoom-in"
                            >
                                Fyll i fälten nu
                            </button>
                        )}
                        {importing && (
                             <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl animate-in fade-in z-20">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">{LOADING_MESSAGES[loadingMsgIndex]}</span>
                             </div>
                        )}
                    </div>
                </div>

                {importedEvents.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-indigo-500/20 animate-in slide-in-from-top duration-500">
                        <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                             <Check size={12} /> Data Extraherad! Kontrollera fälten nedan.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                            {importedEvents.map((evt, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
                                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${evt.team === 'us' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'}`}>{evt.time || "INFO"}</span>
                                    <span className="text-[10px] text-slate-400 truncate">{evt.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Motståndare</label>
                <input 
                  value={newMatch.opponent} 
                  onChange={e => setNewMatch({...newMatch, opponent: e.target.value})}
                  placeholder="t.ex. AIK Basket" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold focus:border-orange-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Datum</label>
                <input 
                  type="date"
                  value={newMatch.date} 
                  onChange={e => setNewMatch({...newMatch, date: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-inner">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-center mb-2">Matchresultat</label>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-black text-orange-500 uppercase">Orion</span>
                  <input 
                    type="number"
                    value={newMatch.score}
                    onChange={e => setNewMatch({...newMatch, score: e.target.value})}
                    placeholder="0"
                    className="w-24 h-24 bg-slate-900 border-2 border-slate-800 rounded-[2rem] text-4xl font-black text-white text-center focus:border-orange-500 outline-none shadow-xl"
                  />
                </div>
                <div className="text-4xl font-black text-slate-800 pt-6">-</div>
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Motståndare</span>
                  <input 
                    type="number"
                    value={newMatch.opponentScore}
                    onChange={e => setNewMatch({...newMatch, opponentScore: e.target.value})}
                    placeholder="0"
                    className="w-24 h-24 bg-slate-900 border-2 border-slate-800 rounded-[2rem] text-4xl font-black text-white text-center focus:border-orange-500 outline-none shadow-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 border-t border-slate-800/80 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ClipboardPaste size={18} className="text-emerald-400" />
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">
                      Individuell Spelarbedömning (Valfritt)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Avaktiverad som standard för ren resultat- och matchimport från Profixio utan påhittade betyg.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={includePlayerRatings} 
                    onChange={e => setIncludePlayerRatings(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {includePlayerRatings && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">
                    Betygsätt de spelare som deltog i matchen (1–5)
                  </p>
                  <div className="grid gap-4">
                    {players.map(p => {
                      const fb = newMatch.feedbacks[p.id] || {
                        playerId: p.id,
                        effort: 3,
                        teamwork: 3,
                        learning: 3,
                        strengths: '',
                        improvements: ''
                      };
                      const isGraded = !!activeRatedPlayerIds[p.id];

                      return (
                        <div key={p.id} className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-6">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white italic">#{p.number}</div>
                              <h5 className="text-lg font-black uppercase text-white italic">{p.name}</h5>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${isGraded ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500'}`}>
                              {isGraded ? 'Betygsatt' : 'Ej betygsatt'}
                            </span>
                          </div>
                          
                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase">
                                <span className="flex items-center gap-1"><Zap size={12} className="text-yellow-500"/> Ansträngning</span>
                                <span className="text-white">{fb.effort}/5</span>
                              </div>
                              <input type="range" min="1" max="5" value={fb.effort} onChange={e => updateFeedback(p.id, 'effort', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-full appearance-none accent-orange-600" />
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase">
                                <span className="flex items-center gap-1"><Heart size={12} className="text-rose-500"/> Laganda</span>
                                <span className="text-white">{fb.teamwork}/5</span>
                              </div>
                              <input type="range" min="1" max="5" value={fb.teamwork} onChange={e => updateFeedback(p.id, 'teamwork', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-full appearance-none accent-rose-600" />
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase">
                                <span className="flex items-center gap-1"><Target size={12} className="text-emerald-500"/> Lärande</span>
                                <span className="text-white">{fb.learning}/5</span>
                              </div>
                              <input type="range" min="1" max="5" value={fb.learning} onChange={e => updateFeedback(p.id, 'learning', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-full appearance-none accent-emerald-600" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setIsAdding(false); setEditingMatchId(null); }} 
                className="flex-1 py-4 rounded-xl bg-slate-800 text-slate-400 font-black uppercase text-[10px]"
              >
                Avbryt
              </button>
              <button 
                onClick={saveMatch} 
                className="flex-[2] py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-[10px] shadow-xl shadow-orange-900/20 active:scale-95 transition-all"
              >
                {editingMatchId ? 'Uppdatera Match' : 'Spara Match'}
              </button>
            </div>
          </div>
        </div>
      ) : selectedMatch ? (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
           {/* DETAIL VIEW HEADER */}
           <div className="flex items-center justify-between gap-4">
                <button onClick={() => setSelectedMatch(null)} className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all">
                    <Undo2 size={16} /> Tillbaka till listan
                </button>
                <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditMatch(selectedMatch)} 
                      className="px-4 py-3 bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                      title="Redigera matchresultat eller spelarbedömningar"
                    >
                      <Edit3 size={15} /> Redigera match
                    </button>
                    <button onClick={async () => { if(confirm("Ta bort matchen permanent?")) { await dataService.deleteMatch(selectedMatch.id); loadData(); setSelectedMatch(null); } }} className="p-3 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-600 hover:text-white transition-all" title="Ta bort match">
                        <Trash2 size={18} />
                    </button>
                </div>
           </div>

           <div className="p-8 md:p-12 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy size={160} /></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mb-3">
                            <Calendar size={14} /> {selectedMatch.date}
                        </div>
                        <h3 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none">{selectedMatch.opponent}</h3>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center">
                            <div className="text-5xl md:text-7xl font-black text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">{selectedMatch.score}</div>
                            <span className="text-[10px] font-black text-slate-500 uppercase mt-1">ORION</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">VS</div>
                        <div className="flex flex-col items-center">
                            <div className="text-5xl md:text-7xl font-black text-slate-400">{selectedMatch.opponentScore}</div>
                            <span className="text-[10px] font-black text-slate-500 uppercase mt-1">GÄSTER</span>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ml-4 ${selectedMatch.score > selectedMatch.opponentScore ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-500' : 'bg-rose-600/10 border border-rose-500/20 text-rose-500'}`}>
                            {selectedMatch.score > selectedMatch.opponentScore ? 'W' : 'L'}
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 border-t border-slate-800/50 pt-10">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <ClipboardPaste size={14} className="text-indigo-400" /> Matchrapport
                        </h4>
                        <div className="p-6 rounded-[2rem] bg-slate-950 border border-slate-800 min-h-[120px]">
                            <p className="text-sm text-slate-300 leading-relaxed font-medium italic">"{selectedMatch.teamSummary || "Ingen sammanfattning skriven."}"</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <Users size={14} className="text-orange-500" /> Spelarnas Matchdata ({selectedMatch.feedbacks.length})
                        </h4>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {selectedMatch.feedbacks.map((f) => {
                                const p = players.find(player => player.id === f.playerId);
                                return (
                                    <div key={f.playerId} className="p-5 rounded-[2rem] bg-slate-950 border border-slate-800 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-xs text-orange-500 shadow-inner">
                                                #{p?.number || '??'}
                                            </div>
                                            <div className="text-xs font-black text-white uppercase tracking-tight">{p?.name || 'Okänd Spelare'}</div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center gap-1">
                                                <span className="text-[7px] font-black text-slate-600 uppercase">Effort</span>
                                                <div className="flex items-center gap-1 text-yellow-500 font-black text-xs">
                                                    <Zap size={10} fill="currentColor" /> {f.effort}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center gap-1">
                                                <span className="text-[7px] font-black text-slate-600 uppercase">Laganda</span>
                                                <div className="flex items-center gap-1 text-rose-500 font-black text-xs">
                                                    <Heart size={10} fill="currentColor" /> {f.teamwork}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center gap-1">
                                                <span className="text-[7px] font-black text-slate-600 uppercase">Utv.</span>
                                                <div className="flex items-center gap-1 text-emerald-500 font-black text-xs">
                                                    <Target size={10} fill="currentColor" /> {f.learning}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
           </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map(m => {
            const isWin = m.score > m.opponentScore;
            return (
              <div key={m.id} onClick={() => setSelectedMatch(m)} className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800 hover:border-orange-500/50 transition-all cursor-pointer group shadow-lg active:scale-[0.98]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl transition-all shadow-inner ${isWin ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'}`}><Trophy size={20} /></div>
                    <div>
                        <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">{m.opponent}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{m.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 shadow-inner">
                        <span className="text-2xl font-black text-white">{m.score}</span>
                        <span className="mx-2 text-slate-800 font-black">-</span>
                        <span className="text-2xl font-black text-slate-500">{m.opponentScore}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                        <ChevronRight size={20} className="text-slate-700 group-hover:text-white transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
              <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] opacity-30">
                  <Trophy size={48} className="mx-auto mb-4 text-slate-700" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Inga matcher registrerade än.</p>
              </div>
          )}
        </div>
      )}
    </div>
  );
};
