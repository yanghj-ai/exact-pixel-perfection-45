import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, MapPin, Timer, Flame, Navigation, Map, Swords } from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateDistance, formatDuration, formatPace, completeRunningSession,
  type GeoPoint, type RunningSession, type Challenge,
} from '@/lib/running';
import { createEgg, triggerEncounter, catchPokemon, markAsSeen, grantExpToParty, getParty, type PokemonEgg, type PartyExpResult } from '@/lib/collection';
import { getPokemonById, RARITY_CONFIG } from '@/lib/pokemon-registry';
import { getPet } from '@/lib/pet';
import type { LevelUpResult } from '@/lib/pet';
import {
  checkLegendaryEncounterConditions, checkSpecialEventConditions,
  checkMissionComplete, getMissionProgress, recordLegendaryCatch, recordSpecialEventCatch,
  type LegendaryEncounter,
} from '@/lib/legendary';
import {
  createCatchQuest, checkQuestProgress, addActiveQuest, completeQuest, failAllActiveQuests, clearActiveQuests,
  type CatchQuest, type QuestProgress,
} from '@/lib/catch-quest';
import { shouldEncounterNpc, generateAiNpc, resetEncounterDistance, type AiNpcTrainer } from '@/lib/npc-encounter';

import PetSprite from '@/components/PetSprite';
import BottomNav from '@/components/BottomNav';
import RunningMap from '@/components/RunningMap';
import DebugPanel from '@/components/DebugPanel';
import CatchQuestBanner from '@/components/CatchQuestBanner';
import SpecialEncounterOverlay from '@/components/SpecialEncounterOverlay';

// Sub-components
import RunningCompleted from '@/components/running/RunningCompleted';
import { LegendaryBanner, NpcEncounterBanner } from '@/components/running/RunningBanners';
import LegendaryPreview from '@/components/running/LegendaryPreview';

type RunState = 'idle' | 'running' | 'paused' | 'completed';

const PET_CHEERS = [
  '파이팅! 🔥', '잘하고 있어!', '조금만 더!', '대단해! 💪',
  '같이 달리자!', '최고야! ⚡', '멈추지 마!', '할 수 있어!',
];

export default function RunningPage() {
  const navigate = useNavigate();
  const [runState, setRunState] = useState<RunState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [route, setRoute] = useState<GeoPoint[]>([]);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [cheerMessage, setCheerMessage] = useState(PET_CHEERS[0]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [completedSession, setCompletedSession] = useState<RunningSession | null>(null);
  const [levelUpResult, setLevelUpResult] = useState<LevelUpResult | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [foodReward, setFoodReward] = useState(0);
  const [expReward, setExpReward] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [hatchedEggs, setHatchedEggs] = useState<PokemonEgg[]>([]);
  const [partyExpResults, setPartyExpResults] = useState<PartyExpResult[]>([]);

  const [legendaryEncounter, setLegendaryEncounter] = useState<LegendaryEncounter | null>(null);
  const [legendaryMissionProgress, setLegendaryMissionProgress] = useState(0);
  const [legendaryCaught, setLegendaryCaught] = useState(false);
  const legendaryCheckedRef = useRef(false);

  const [activeQuests, setActiveQuests] = useState<{ quest: CatchQuest; progress: QuestProgress }[]>([]);
  const lastEncounterDistRef = useRef(0);
  const [specialOverlay, setSpecialOverlay] = useState<{ show: boolean; speciesId: number | null; type: 'legendary' | 'event' | 'catch' }>({ show: false, speciesId: null, type: 'catch' });

  const [npcEncounter, setNpcEncounter] = useState<AiNpcTrainer | null>(null);
  const [isGeneratingNpc, setIsGeneratingNpc] = useState(false);
  const lastNpcCheckDistRef = useRef(0);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cheerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeRef = useRef<GeoPoint[]>([]);
  const elapsedRef = useRef(0);

  const pet = getPet();
  const partyLeader = getParty()[0];
  const leaderSpecies = partyLeader ? getPokemonById(partyLeader.speciesId) : null;

  // Timer
  useEffect(() => {
    if (runState === 'running') {
      timerRef.current = setInterval(() => {
        setElapsed(e => { const v = e + 1; elapsedRef.current = v; return v; });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [runState]);

  // Pet cheers
  useEffect(() => {
    if (runState === 'running') {
      cheerRef.current = setInterval(() => {
        setCheerMessage(PET_CHEERS[Math.floor(Math.random() * PET_CHEERS.length)]);
      }, 15000);
    } else {
      if (cheerRef.current) clearInterval(cheerRef.current);
    }
    return () => { if (cheerRef.current) clearInterval(cheerRef.current); };
  }, [runState]);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError('GPS를 사용할 수 없습니다'); return; }
    setGpsError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp, speed: pos.coords.speed ?? undefined };
        routeRef.current = [...routeRef.current, point];
        setRoute([...routeRef.current]);
        const dist = calculateDistance(routeRef.current);
        setCurrentDistance(dist);
        if (dist > 0 && elapsedRef.current > 0) setCurrentPace((elapsedRef.current / 60) / dist);
      },
      (err) => setGpsError(`GPS 오류: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
  }, []);

  // Legendary encounter check
  useEffect(() => {
    if (runState === 'running' && !legendaryCheckedRef.current) {
      legendaryCheckedRef.current = true;
      const availableLegendaries = checkLegendaryEncounterConditions();
      if (availableLegendaries.length > 0) {
        const def = availableLegendaries[0];
        setLegendaryEncounter({ definition: def, mission: def.mission, startedAt: Date.now(), missionActive: true });
        toast(`🌟 전설의 포켓몬 ${def.name} 조우!`, { description: def.mission.description, duration: 6000 });
      }
      const availableEvents = checkSpecialEventConditions();
      for (const event of availableEvents) {
        catchPokemon(event.speciesId);
        recordSpecialEventCatch(event.speciesId);
        setSpecialOverlay({ show: true, speciesId: event.speciesId, type: 'event' });
        toast(`✨ ${event.name}이(가) 나타났다!`, { description: event.description, duration: 6000 });
        break;
      }
    }
  }, [runState]);

  // Legendary mission progress
  useEffect(() => {
    if (!legendaryEncounter || !legendaryEncounter.missionActive || legendaryCaught) return;
    const pace = currentDistance > 0 && elapsed > 0 ? (elapsed / 60) / currentDistance : 0;
    setLegendaryMissionProgress(getMissionProgress(legendaryEncounter.mission, currentDistance, elapsed, pace));
    if (checkMissionComplete(legendaryEncounter.mission, currentDistance, elapsed, pace)) {
      setLegendaryCaught(true);
      catchPokemon(legendaryEncounter.definition.speciesId);
      recordLegendaryCatch(legendaryEncounter.definition.speciesId);
      setSpecialOverlay({ show: true, speciesId: legendaryEncounter.definition.speciesId, type: 'legendary' });
      toast(`🌟 ${legendaryEncounter.definition.name}을(를) 포획했다!`, { description: '전설의 포켓몬이 동료가 되었습니다!', duration: 8000 });
    }
  }, [legendaryEncounter, currentDistance, elapsed, legendaryCaught]);

  // Wild encounter + catch quest
  useEffect(() => {
    if (runState !== 'running') return;
    if (currentDistance - lastEncounterDistRef.current < 0.8) return;
    const encounter = triggerEncounter(currentDistance);
    if (encounter) {
      lastEncounterDistRef.current = currentDistance;
      const quest = createCatchQuest(encounter.id, encounter.name, encounter.rarity, currentDistance);
      addActiveQuest(quest);
      markAsSeen([encounter.id]);
      const pace = currentDistance > 0 && elapsed > 0 ? (elapsed / 60) / currentDistance : 0;
      setActiveQuests(prev => [...prev, { quest, progress: checkQuestProgress(quest, currentDistance, elapsed, pace) }]);
      toast(`🔴 야생의 ${encounter.name} 발견!`, { description: quest.requirements.map(r => r.label).join(' + '), duration: 4000 });
    }
  }, [runState, currentDistance, elapsed]);

  // Update quest progress
  useEffect(() => {
    if (activeQuests.length === 0) return;
    const pace = currentDistance > 0 && elapsed > 0 ? (elapsed / 60) / currentDistance : 0;
    const updated = activeQuests.map(({ quest, progress: _old }) => {
      if (quest.completed) return { quest, progress: _old };
      const newProgress = checkQuestProgress(quest, currentDistance, elapsed, pace);
      if (newProgress.allMet && !quest.completed) {
        quest.completed = true;
        completeQuest(quest.id);
        catchPokemon(quest.speciesId);
        toast(`✨ ${quest.speciesName} 포획 성공!`, { duration: 4000 });
      }
      return { quest, progress: newProgress };
    });
    const hasChange = updated.some((u, i) => u.progress.overall !== activeQuests[i]?.progress.overall || u.quest.completed !== activeQuests[i]?.quest.completed);
    if (hasChange) setActiveQuests(updated);
  }, [currentDistance, elapsed]);

  // NPC encounter
  useEffect(() => {
    if (runState !== 'running' || isGeneratingNpc || npcEncounter) return;
    if (currentDistance - lastNpcCheckDistRef.current < 0.3) return;
    lastNpcCheckDistRef.current = currentDistance;
    if (shouldEncounterNpc(currentDistance)) {
      setIsGeneratingNpc(true);
      generateAiNpc(currentDistance).then(npc => {
        if (npc) {
          markAsSeen(npc.teamSpeciesIds);
          setNpcEncounter(npc);
          toast(`⚔️ ${npc.emoji} ${npc.name}이(가) 승부를 걸어왔다!`, { description: `"${npc.dialogue.before}"`, duration: 5000 });
        }
        setIsGeneratingNpc(false);
      }).catch(() => setIsGeneratingNpc(false));
    }
  }, [runState, currentDistance, isGeneratingNpc, npcEncounter]);

  const handleBattleNpc = () => {
    if (!npcEncounter) return;
    sessionStorage.setItem('routinmon-ai-npc', JSON.stringify(npcEncounter));
    handlePause();
    navigate('/battle?aiNpc=true');
  };

  const handleStart = () => {
    setRunState('running'); setElapsed(0); elapsedRef.current = 0;
    setRoute([]); routeRef.current = []; setCurrentDistance(0); setCurrentPace(0);
    setShowMap(true); legendaryCheckedRef.current = false;
    setLegendaryEncounter(null); setLegendaryCaught(false); setLegendaryMissionProgress(0);
    setActiveQuests([]); clearActiveQuests(); lastEncounterDistRef.current = 0;
    setNpcEncounter(null); lastNpcCheckDistRef.current = 0; resetEncounterDistance();
    startGPS();
    toast('🏃 런닝 시작!', { description: `${leaderSpecies?.name || '포켓몬'}와 함께 달려볼까요!` });
  };

  const handlePause = () => { setRunState('paused'); stopGPS(); };
  const handleResume = () => { setRunState('running'); startGPS(); };

  const handleStop = () => {
    stopGPS();
    if (routeRef.current.length < 2 || currentDistance < 0.01) {
      toast('런닝 기록이 너무 짧아요', { description: '조금 더 달려보세요!' });
      setRunState('idle'); return;
    }
    const { session, levelUp, completedChallenges: completed, hatchedEggs: hatched } = completeRunningSession(routeRef.current, elapsedRef.current);
    setCompletedSession(session); setLevelUpResult(levelUp); setCompletedChallenges(completed);
    const food = Math.max(1, Math.floor(session.distanceKm));
    const exp = Math.max(5, Math.round(session.distanceKm * 10));
    setFoodReward(food); setExpReward(exp);
    setPartyExpResults(grantExpToParty(exp));
    if (hatched.length > 0) setHatchedEggs(hatched);
    let eggRarity: 'common' | 'uncommon' | 'rare' = 'common';
    if (session.distanceKm >= 5) eggRarity = 'rare';
    else if (session.distanceKm >= 3) eggRarity = 'uncommon';
    const newEgg = createEgg(eggRarity);
    if (newEgg) toast(`🥚 ${RARITY_CONFIG[eggRarity].label} 알을 획득했다!`);
    failAllActiveQuests();
    setActiveQuests(prev => prev.filter(q => q.quest.completed));
    setRunState('completed');
  };

  useEffect(() => {
    return () => { stopGPS(); if (timerRef.current) clearInterval(timerRef.current); };
  }, [stopGPS]);

  // === Completed screen ===
  if (runState === 'completed' && completedSession) {
    return (
      <RunningCompleted
        session={completedSession}
        foodReward={foodReward}
        expReward={expReward}
        partyExpResults={partyExpResults}
        activeQuests={activeQuests}
        completedChallenges={completedChallenges}
        levelUpResult={levelUpResult}
        hatchedEggs={hatchedEggs}
        leaderSpecies={leaderSpecies}
        onCloseLevelUp={() => setLevelUpResult(null)}
        onEggComplete={() => setHatchedEggs([])}
      />
    );
  }

  // === Active / Idle screen ===
  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">🏃 런닝</h1>
          <div className="flex items-center gap-3">
            {runState !== 'idle' && (
              <button onClick={() => setShowMap(v => !v)} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${showMap ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Map size={12} /> 지도
              </button>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <Flame size={14} className="text-primary" />
              <span className="text-sm font-bold text-primary">{pet.foodCount}</span>
            </div>
          </div>
        </div>

        {/* Live map */}
        {showMap && runState !== 'idle' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
            <RunningMap route={route} isLive className="h-48" />
          </motion.div>
        )}

        {/* Pet + Cheer */}
        {runState !== 'idle' && !showMap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mb-4">
            {leaderSpecies ? (
              <motion.img src={leaderSpecies.spriteUrl} alt={leaderSpecies.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
            ) : (
              <div className="scale-75"><PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} /></div>
            )}
            <motion.div key={cheerMessage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="glass-card px-3 py-1.5">
              <p className="text-xs text-foreground">{cheerMessage}</p>
            </motion.div>
          </motion.div>
        )}

        {/* Stats display */}
        <div className="glass-card p-6 mb-4">
          {runState === 'idle' ? (
            <div className="text-center py-8">
              {leaderSpecies ? (
                <div className="mb-6 flex justify-center">
                  <motion.img src={leaderSpecies.spriteUrl} alt={leaderSpecies.name} className="w-32 h-32 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                </div>
              ) : (
                <div className="mb-6"><PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} /></div>
              )}
              <p className="text-lg font-semibold text-foreground mb-2">{leaderSpecies?.name || '포켓몬'}와 함께 달려볼까?</p>
              <p className="text-sm text-muted-foreground">GPS로 런닝을 기록하고 보상을 받으세요</p>
              {gpsError && <p className="text-xs text-destructive mt-2">{gpsError}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <motion.p key={Math.floor(currentDistance * 100)} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="text-5xl font-bold text-primary tabular-nums">{currentDistance.toFixed(2)}</motion.p>
                <p className="text-sm text-muted-foreground">km</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1"><Timer size={12} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{formatDuration(elapsed)}</p>
                  <p className="text-[10px] text-muted-foreground">시간</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1"><Navigation size={12} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{currentPace > 0 ? formatPace(currentPace) : "-'--\""}</p>
                  <p className="text-[10px] text-muted-foreground">페이스</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1"><Flame size={12} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{Math.round(currentDistance * 60)}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
              </div>
              {gpsError && <p className="text-xs text-destructive text-center">{gpsError}</p>}
            </div>
          )}
        </div>

        {/* Catch Quest Banners */}
        {runState !== 'idle' && <CatchQuestBanner quests={activeQuests.filter(q => !q.quest.completed)} />}

        {/* Legendary Mission Banner */}
        <AnimatePresence>
          {legendaryEncounter && runState !== 'idle' && (
            <LegendaryBanner encounter={legendaryEncounter} progress={legendaryMissionProgress} caught={legendaryCaught} />
          )}
        </AnimatePresence>

        {/* NPC Encounter */}
        <AnimatePresence>
          {npcEncounter && runState !== 'idle' && (
            <NpcEncounterBanner npc={npcEncounter} onBattle={handleBattleNpc} onDecline={() => { setNpcEncounter(null); toast('트레이너가 떠나갔다...'); }} />
          )}
        </AnimatePresence>

        {/* NPC Loading */}
        {isGeneratingNpc && runState === 'running' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-3 mb-4 text-center border border-primary/20">
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block text-lg">⚡</motion.span>
            <p className="text-xs text-muted-foreground mt-1">풀숲에서 인기척이...</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {runState === 'idle' && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleStart} className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary glow-shadow">
              <Play size={32} className="text-primary-foreground ml-1" />
            </motion.button>
          )}
          {runState === 'running' && (
            <>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handlePause} className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 border border-secondary/30">
                <Pause size={24} className="text-secondary" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleStop} className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 border border-destructive/30">
                <Square size={24} className="text-destructive" />
              </motion.button>
            </>
          )}
          {runState === 'paused' && (
            <>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleResume} className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary">
                <Play size={24} className="text-primary-foreground ml-0.5" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleStop} className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 border border-destructive/30">
                <Square size={24} className="text-destructive" />
              </motion.button>
            </>
          )}
        </div>

        {/* Idle preview sections */}
        {runState === 'idle' && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 glass-card p-4">
              <p className="text-xs text-muted-foreground mb-2">💡 런닝 보상</p>
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">🍎 1km당 먹이 1개</span>
                <span className="text-muted-foreground">⚡ 1km당 EXP 10</span>
              </div>
            </motion.div>
            <LegendaryPreview />
          </>
        )}

        <div className="mx-auto max-w-md px-0 mt-6">
          <DebugPanel />
        </div>
      </div>
      <BottomNav />
      <SpecialEncounterOverlay
        show={specialOverlay.show}
        speciesId={specialOverlay.speciesId}
        type={specialOverlay.type}
        onClose={() => setSpecialOverlay({ show: false, speciesId: null, type: 'catch' })}
      />
    </div>
  );
}
