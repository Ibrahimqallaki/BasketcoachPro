import React, { useEffect, useMemo, useState } from 'react';
import { dataService } from '../services/dataService';
import { WarmupExercise, WarmupPhase } from '../types';
import {
  Activity, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Flame, Info, Loader2, Play, Search, ShieldCheck, Target, Youtube, Zap
} from 'lucide-react';

interface WarmupLibraryProps {
  onSelect?: (exercise: WarmupExercise) => void;
  selectedIds?: string[];
  isSelectionMode?: boolean;
}

type DetailTab = 'video' | 'pedagogy' | 'steps';

const phases = Object.values(WarmupPhase) as WarmupPhase[];

const getVideoId = (url?: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|watch\?v=|&v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
};

const getPhaseIcon = (phase: WarmupPhase, size = 18) => {
  switch (phase) {
    case WarmupPhase.PULS: return <Flame className="text-orange-400" size={size} />;
    case WarmupPhase.AKTIVERING: return <ShieldCheck className="text-emerald-400" size={size} />;
    case WarmupPhase.TEKNIK: return <Activity className="text-blue-400" size={size} />;
    case WarmupPhase.INTENSITET: return <Zap className="text-purple-400" size={size} />;
  }
};

const getPhaseStyle = (phase: WarmupPhase) => {
  switch (phase) {
    case WarmupPhase.PULS: return 'border-orange-500/30 bg-orange-500/10';
    case WarmupPhase.AKTIVERING: return 'border-emerald-500/30 bg-emerald-500/10';
    case WarmupPhase.TEKNIK: return 'border-blue-500/30 bg-blue-500/10';
    case WarmupPhase.INTENSITET: return 'border-purple-500/30 bg-purple-500/10';
  }
};

export const WarmupLibrary: React.FC<WarmupLibraryProps> = ({
  onSelect, selectedIds = [], isSelectionMode = false
}) => {
  const [exercises, setExercises] = useState<WarmupExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activePhase, setActivePhase] = useState<WarmupPhase | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [activeVisual, setActiveVisual] = useState<Record<string, DetailTab>>({});
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    dataService.getWarmupExercises()
      .then(data => { if (mounted) setExercises(data); })
      .catch(error => {
        console.error('Failed to load warm-up exercises:', error);
        if (mounted) setLoadError(true);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filteredExercises = useMemo(() => {
    const search = searchQuery.trim().toLocaleLowerCase('sv-SE');
    return exercises.filter(ex => {
      const matchesPhase = activePhase === 'ALL' || ex.phase === activePhase;
      const matchesSearch = !search || [
        ex.title, ex.description, ex.sbbfFocus, ex.setup || ''
      ].some(value => value.toLocaleLowerCase('sv-SE').includes(search));
      return matchesPhase && matchesSearch;
    });
  }, [activePhase, exercises, searchQuery]);

  const selectPhase = (phase: WarmupPhase | 'ALL') => {
    setActivePhase(phase);
    setSearchQuery('');
    setMobileDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3" role="status">
        <Loader2 size={36} className="animate-spin text-orange-500" />
        <p className="text-sm font-bold text-slate-400">Laddar uppvärmningsövningar...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-500/20 bg-slate-900 p-8 text-center text-sm text-slate-300">
        Uppvärmningsbiblioteket kunde inte laddas. Försök öppna sidan igen.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8 md:space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-black uppercase italic tracking-tighter text-white md:text-4xl">
            <BookOpen className="shrink-0 text-orange-500" size={28} />
            Uppvärmning
          </h2>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            Fyra kategorier • SBBF-inspirerad rörelseförståelse, teknik och knäkontroll
          </p>
          {isSelectionMode && (
            <p className="mt-2 text-xs font-bold text-orange-400" aria-live="polite">
              {selectedIds.length} övningar valda till träningspasset
            </p>
          )}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="search"
            aria-label="Sök uppvärmningsövning"
            placeholder="Sök uppvärmningsövning..."
            value={searchQuery}
            onChange={event => {
              setSearchQuery(event.target.value);
              if (event.target.value.trim()) {
                setActivePhase('ALL');
                setMobileDetailOpen(true);
              }
            }}
            className="min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-7">
        <aside className={(mobileDetailOpen ? 'hidden lg:block ' : 'block ') + 'lg:col-span-4'} aria-label="Uppvärmningskategorier">
          <div className="space-y-3 lg:max-h-[76vh] lg:overflow-y-auto lg:pr-2">
            <button
              type="button"
              onClick={() => selectPhase('ALL')}
              aria-current={activePhase === 'ALL' ? 'true' : undefined}
              className={'flex min-h-[68px] w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ' +
                (activePhase === 'ALL' ? 'border-orange-500/50 bg-orange-600/20 text-white' :
                'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600')}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950/50">
                <BookOpen size={21} className="text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-black uppercase tracking-tight">Alla uppvärmningar</span>
                <span className="mt-1 block text-xs text-slate-400">{exercises.length} övningar</span>
              </div>
              <ChevronRight className="shrink-0" size={18} />
            </button>
            {phases.map((phase, index) => (
              <button
                type="button"
                key={phase}
                onClick={() => selectPhase(phase)}
                aria-current={activePhase === phase ? 'true' : undefined}
                className={'flex min-h-[76px] w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ' +
                  (activePhase === phase ? getPhaseStyle(phase) + ' text-white' :
                  'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600')}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950/70">
                  {getPhaseIcon(phase, 22)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-black uppercase tracking-tight">
                    <span className="mr-2 text-xs text-slate-500">{index + 1}.</span>
                    {phase}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {exercises.filter(ex => ex.phase === phase).length} övningar
                  </span>
                </div>
                <ChevronRight className="shrink-0" size={18} />
              </button>
            ))}
          </div>
        </aside>

        <main className={(mobileDetailOpen ? 'block ' : 'hidden lg:block ') + 'min-w-0 lg:col-span-8'}>
          <button
            type="button"
            onClick={() => setMobileDetailOpen(false)}
            className="mb-4 flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-300 hover:bg-slate-800 lg:hidden"
          >
            <ChevronLeft size={18} /> Tillbaka till kategorier
          </button>

          <section className="relative overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-900 p-4 shadow-2xl sm:p-6 lg:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-orange-600 to-amber-500" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tight text-white md:text-2xl">
                  {activePhase === 'ALL' ? 'Alla uppvärmningsövningar' : activePhase}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {filteredExercises.length} övningar • Välj en vy för video, pedagogik eller steg-för-steg
                </p>
              </div>
              {isSelectionMode && (
                <span className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-300">
                  {selectedIds.length} valda
                </span>
              )}
            </div>

            <div className="space-y-5 lg:max-h-[76vh] lg:overflow-y-auto lg:pr-2">
              {filteredExercises.map(ex => {
                const videoId = getVideoId(ex.videoUrl);
                const currentTab = activeVisual[ex.id] || 'video';
                const isSelected = selectedIds.includes(ex.id);
                return (
                  <article key={ex.id} className={'overflow-hidden rounded-2xl border bg-slate-950 p-4 sm:p-6 ' +
                    (isSelected ? 'border-orange-500/70' : 'border-slate-800')}>
                    <div className="mb-5 flex flex-col gap-4 border-b border-slate-800 pb-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ' + getPhaseStyle(ex.phase)}>
                            {getPhaseIcon(ex.phase, 21)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-orange-400">{ex.phase}</p>
                            <h4 className="break-words text-lg font-black uppercase italic tracking-tight text-white sm:text-2xl">
                              {ex.title}
                            </h4>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200">
                          <Clock size={15} className="text-orange-400" /> {ex.duration}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2" role="group" aria-label={'Visningsalternativ för ' + ex.title}>
                        {([
                          ['video', 'Video'],
                          ['pedagogy', 'Pedagogik'],
                          ['steps', 'Steg för steg']
                        ] as const).map(([tab, label]) => (
                          <button
                            type="button"
                            key={tab}
                            onClick={() => setActiveVisual(prev => ({ ...prev, [ex.id]: tab }))}
                            aria-pressed={currentTab === tab}
                            className={'min-h-[44px] flex-1 rounded-xl px-3 py-2 text-xs font-black uppercase transition-colors sm:flex-none ' +
                              (currentTab === tab ? 'bg-orange-600 text-white' :
                              'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {currentTab === 'video' && (
                      <div>
                        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                          {videoId ? (
                            playingVideos[ex.id] ? (
                              <iframe
                                title={'Demonstration: ' + ex.title}
                                src={'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0&playsinline=1'}
                                className="absolute inset-0 h-full w-full"
                                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                loading="lazy"
                              />
                            ) : (
                              <button
                                type="button"
                                aria-label={'Spela video: ' + ex.title}
                                onClick={() => setPlayingVideos(prev => ({ ...prev, [ex.id]: true }))}
                                className="relative flex h-full w-full items-center justify-center"
                              >
                                <img src={'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg'} alt="" loading="lazy"
                                  className="absolute inset-0 h-full w-full object-cover opacity-60" />
                                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-xl">
                                  <Play size={26} fill="currentColor" />
                                </span>
                              </button>
                            )
                          ) : (
                            <div className="space-y-2 p-5 text-center">
                              <Youtube size={34} className="mx-auto text-slate-500" />
                              <p className="text-sm font-semibold text-slate-300">Ingen verifierad video tillgänglig</p>
                              <p className="text-xs text-slate-500">Se Pedagogik och Steg för steg för instruktioner</p>
                            </div>
                          )}
                        </div>
                        {videoId && (
                          <a href={'https://www.youtube.com/watch?v=' + videoId} target="_blank" rel="noopener noreferrer"
                            className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-600/10 px-4 text-xs font-bold uppercase text-red-400 hover:bg-red-600/20">
                            <Youtube size={17} /> Se på YouTube
                          </a>
                        )}
                      </div>
                    )}

                    {currentTab === 'pedagogy' && (
                      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
                        <div>
                          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-emerald-400"><BookOpen size={16} /> Varför vi tränar</p>
                          <p className="text-sm leading-relaxed text-slate-200">{ex.description}</p>
                        </div>
                        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                          <p className="text-xs font-bold uppercase text-orange-400">Fokusområde</p>
                          <p className="mt-2 text-base font-black text-white">{ex.sbbfFocus}</p>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase text-emerald-400">Coachingpunkter</p>
                          <ul className="space-y-2">
                            {ex.coachingPoints.map((point, index) => (
                              <li key={index} className="rounded-xl bg-slate-950 p-3 text-sm text-slate-200">• {point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {currentTab === 'steps' && (
                      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase text-blue-400"><Info size={16} /> Genomförande</p>
                        {ex.visualSteps && ex.visualSteps.length > 0 ? (
                          <ol className="space-y-3">
                            {ex.visualSteps.map((step, index) => (
                              <li key={index} className="flex items-start gap-3 rounded-xl bg-slate-950 p-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-black text-blue-400">{index + 1}</span>
                                <span className="text-sm leading-relaxed text-slate-200">{step}</span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-sm leading-relaxed text-slate-200">{ex.description}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800 pt-5 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-900 p-4">
                        <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-slate-400"><Target size={15} /> Organisation</p>
                        <p className="text-sm leading-relaxed text-slate-200">{ex.setup || 'Anpassa upplägg efter antal spelare och tillgänglig yta.'}</p>
                      </div>
                      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                        <p className="mb-2 text-[11px] font-bold uppercase text-orange-400">Coaching tips</p>
                        <p className="text-sm leading-relaxed text-slate-200">{ex.coachingPoints.join(' • ')}</p>
                      </div>
                    </div>

                    {isSelectionMode && (
                      <button
                        type="button"
                        disabled={!onSelect}
                        onClick={() => onSelect?.(ex)}
                        aria-pressed={isSelected}
                        className={'mt-5 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-black uppercase transition-colors disabled:opacity-50 ' +
                          (isSelected ? 'border border-orange-500 bg-orange-500/20 text-orange-300' :
                          'bg-orange-600 text-white hover:bg-orange-500')}
                      >
                        {isSelected ? <CheckCircle2 size={19} /> : <Target size={19} />}
                        {isSelected ? 'Vald till träningspasset – ta bort' : 'Lägg till i träningspasset'}
                      </button>
                    )}
                  </article>
                );
              })}
              {filteredExercises.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
                  Inga uppvärmningsövningar matchar sökningen.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
