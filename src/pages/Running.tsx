import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, MapPin, Timer, Flame, Trophy, Navigation, Map, Sparkles, X, Swords } from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateDistance,
  formatDuration,
  formatPace,
  completeRunningSession,
  type GeoPoint,
  type RunningSession,
  type Challenge,
} from '@/lib/running';
import { createEgg, triggerEncounter, catchPokemon, markAsSeen, grantExpToParty, getParty, type PokemonEgg, type PartyExpResult } from '@/lib/collection';
import { getPokemonById, RARITY_CONFIG } from '@/lib/pokemon-registry';
import { getPet, getRequiredExp } from '@/lib/pet';
import type { LevelUpResult } from '@/lib/pet';
import {
  checkLegendaryEncounterConditions, checkSpecialEventConditions,
  checkMissionComplete, getMissionProgress, recordLegendaryCatch, recordSpecialEventCatch,
  type LegendaryEncounter, type LegendaryDefinition, type SpecialEvent,
} from '@/lib/legendary';
import {
  createCatchQuest, checkQuestProgress, addActiveQuest, completeQuest, failAllActiveQuests, clearActiveQuests,
  type CatchQuest, type QuestProgress,
} from '@/lib/catch-quest';
import {
  shouldEncounterNpc, generateAiNpc, resetEncounterDistance,
  type AiNpcTrainer,
} from '@/lib/npc-encounter';

import PetSprite from '@/components/PetSprite';
import BottomNav from '@/components/BottomNav';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import RunningMap from '@/components/RunningMap';
import DebugPanel from '@/components/DebugPanel';
import EggHatchOverlay from '@/components/EggHatchOverlay';
import CatchQuestBanner from '@/components/CatchQuestBanner';
import SpecialEncounterOverlay from '@/components/SpecialEncounterOverlay';

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

  // Legendary encounter state
  const [legendaryEncounter, setLegendaryEncounter] = useState<LegendaryEncounter | null>(null);
  const [legendaryMissionProgress, setLegendaryMissionProgress] = useState(0);
  const [legendaryCaught, setLegendaryCaught] = useState(false);
  const legendaryCheckedRef = useRef(false);

  // Catch quest state
  const [activeQuests, setActiveQuests] = useState<{ quest: CatchQuest; progress: QuestProgress }[]>([]);
  const lastEncounterDistRef = useRef(0);
  const [specialOverlay, setSpecialOverlay] = useState<{ show: boolean; speciesId: number | null; type: 'legendary' | 'event' | 'catch' }>({ show: false, speciesId: null, type: 'catch' });

  // NPC encounter state
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
        setElapsed(e => {
          const newVal = e + 1;
          elapsedRef.current = newVal;
          return newVal;
        });
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
    if (!navigator.geolocation) {
      setGpsError('GPS를 사용할 수 없습니다');
      return;
    }
    setGpsError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: GeoPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          speed: pos.coords.speed ?? undefined,
        };
        routeRef.current = [...routeRef.current, point];
        setRoute([...routeRef.current]);
        const dist = calculateDistance(routeRef.current);
        setCurrentDistance(dist);
        if (dist > 0 && elapsedRef.current > 0) {
          const elapsedMin = elapsedRef.current / 60;
          setCurrentPace(elapsedMin / dist);
        }
      },
      (err) => {
        setGpsError(`GPS 오류: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Check legendary encounter on run start
  useEffect(() => {
    if (runState === 'running' && !legendaryCheckedRef.current) {
      legendaryCheckedRef.current = true;

      // Check legendary conditions
      const availableLegendaries = checkLegendaryEncounterConditions();
      if (availableLegendaries.length > 0) {
        const def = availableLegendaries[0];
        setLegendaryEncounter({ definition: def, mission: def.mission, startedAt: Date.now(), missionActive: true });
        toast(`🌟 전설의 포켓몬 ${def.name} 조우!`, {
          description: def.mission.description,
          duration: 6000,
        });
      }

      // Check special events
      const availableEvents = checkSpecialEventConditions();
      for (const event of availableEvents) {
        // Auto-catch special event Pokémon (no mission required)
        catchPokemon(event.speciesId);
        recordSpecialEventCatch(event.speciesId);
        setSpecialOverlay({ show: true, speciesId: event.speciesId, type: 'event' });
        toast(`✨ ${event.name}이(가) 나타났다!`, {
          description: event.description,
          duration: 6000,
        });
        break; // One at a time
      }
    }
  }, [runState]);

  // Legendary mission progress check
  useEffect(() => {
    if (!legendaryEncounter || !legendaryEncounter.missionActive || legendaryCaught) return;
    const pace = currentDistance > 0 && elapsed > 0 ? (elapsed / 60) / currentDistance : 0;
    const progress = getMissionProgress(legendaryEncounter.mission, currentDistance, elapsed, pace);
    setLegendaryMissionProgress(progress);

    if (checkMissionComplete(legendaryEncounter.mission, currentDistance, elapsed, pace)) {
      setLegendaryCaught(true);
      catchPokemon(legendaryEncounter.definition.speciesId);
      recordLegendaryCatch(legendaryEncounter.definition.speciesId);
      setSpecialOverlay({ show: true, speciesId: legendaryEncounter.definition.speciesId, type: 'legendary' });
      toast(`🌟 ${legendaryEncounter.definition.name}을(를) 포획했다!`, {
        description: '전설의 포켓몬이 동료가 되었습니다!',
        duration: 8000,
      });
    }
  }, [legendaryEncounter, currentDistance, elapsed, legendaryCaught]);

  // Wild encounter + catch quest system
  useEffect(() => {
    if (runState !== 'running') return;
    const distSinceLast = currentDistance - lastEncounterDistRef.current;
    if (distSinceLast < 0.8) return;

    const encounter = triggerEncounter(currentDistance);
    if (encounter) {
      lastEncounterDistRef.current = currentDistance;
      const quest = createCatchQuest(encounter.id, encounter.name, encounter.rarity, currentDistance);
      addActiveQuest(quest);
      markAsSeen([encounter.id]);

      const pace = currentDistance > 0 && elapsed > 0 ? (elapsed / 60) / currentDistance : 0;
      const progress = checkQuestProgress(quest, currentDistance, elapsed, pace);
      setActiveQuests(prev => [...prev, { quest, progress }]);

      toast(`🔴 야생의 ${encounter.name} 발견!`, {
        description: quest.requirements.map(r => r.label).join(' + '),
        duration: 4000,
      });
    }
  }, [runState, currentDistance, elapsed]);

  // Update catch quest progress
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

    // Only update if something changed
    const hasChange = updated.some((u, i) => u.progress.overall !== activeQuests[i]?.progress.overall || u.quest.completed !== activeQuests[i]?.quest.completed);
    if (hasChange) setActiveQuests(updated);
  }, [currentDistance, elapsed]);

  // NPC encounter check
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
          toast(`⚔️ ${npc.emoji} ${npc.name}이(가) 승부를 걸어왔다!`, {
            description: `"${npc.dialogue.before}"`,
            duration: 5000,
          });
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

  const handleDeclineBattle = () => {
    setNpcEncounter(null);
    toast('트레이너가 떠나갔다...');
  };

  const handleStart = () => {
    setRunState('running');
    setElapsed(0);
    elapsedRef.current = 0;
    setRoute([]);
    routeRef.current = [];
    setCurrentDistance(0);
    setCurrentPace(0);
    setShowMap(true);
    legendaryCheckedRef.current = false;
    setLegendaryEncounter(null);
    setLegendaryCaught(false);
    setLegendaryMissionProgress(0);
    setActiveQuests([]);
    clearActiveQuests();
    lastEncounterDistRef.current = 0;
    setNpcEncounter(null);
    lastNpcCheckDistRef.current = 0;
    resetEncounterDistance();
    startGPS();
    toast('🏃 런닝 시작!', { description: `${leaderSpecies?.name || '포켓몬'}와 함께 달려볼까요!` });
  };

  const handlePause = () => {
    setRunState('paused');
    stopGPS();
  };

  const handleResume = () => {
    setRunState('running');
    startGPS();
  };

  const handleStop = () => {
    stopGPS();
    if (routeRef.current.length < 2 || currentDistance < 0.01) {
      toast('런닝 기록이 너무 짧아요', { description: '조금 더 달려보세요!' });
      setRunState('idle');
      return;
    }
    const { session, stats, levelUp, completedChallenges: completed, hatchedEggs: hatched } = completeRunningSession(routeRef.current, elapsedRef.current);
    setCompletedSession(session);
    setLevelUpResult(levelUp);
    setCompletedChallenges(completed);
    const food = Math.max(1, Math.floor(session.distanceKm));
    const exp = Math.max(5, Math.round(session.distanceKm * 10));
    setFoodReward(food);
    setExpReward(exp);

    const partyResults = grantExpToParty(exp);
    setPartyExpResults(partyResults);

    if (hatched.length > 0) {
      setHatchedEggs(hatched);
    }

    let eggRarity: 'common' | 'uncommon' | 'rare' = 'common';
    if (session.distanceKm >= 5) eggRarity = 'rare';
    else if (session.distanceKm >= 3) eggRarity = 'uncommon';
    const newEgg = createEgg(eggRarity);
    if (newEgg) toast(`🥚 ${RARITY_CONFIG[eggRarity].label} 알을 획득했다!`);

    // Fail uncompleted quests
    failAllActiveQuests();
    // Remove completed quests from display (keep caught ones briefly)
    setActiveQuests(prev => prev.filter(q => q.quest.completed));

    setRunState('completed');
  };

  useEffect(() => {
    return () => { stopGPS(); if (timerRef.current) clearInterval(timerRef.current); };
  }, [stopGPS]);

  // Completed screen
  if (runState === 'completed' && completedSession) {
    return (
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-5 pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <span className="text-4xl">🎉</span>
            <h1 className="text-2xl font-bold text-foreground mt-2">런닝 완료!</h1>
          </motion.div>

          {completedSession.route.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
              <RunningMap route={completedSession.route} className="h-48" />
            </motion.div>
          )}

          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center mb-6">
            {leaderSpecies ? (
              <motion.img
                src={leaderSpecies.spriteUrl}
                alt={leaderSpecies.name}
                className="w-24 h-24 object-contain"
                style={{ imageRendering: 'pixelated' }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} />
            )}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card px-4 py-2 mt-2">
              <p className="text-sm text-foreground">정말 대단해! 🔥</p>
            </motion.div>
          </motion.div>

          <div className="glass-card p-5 space-y-4 mb-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{completedSession.distanceKm.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatDuration(completedSession.durationSeconds)}</p>
                <p className="text-xs text-muted-foreground">시간</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{completedSession.paceMinPerKm > 0 ? formatPace(completedSession.paceMinPerKm) : '-'}</p>
                <p className="text-xs text-muted-foreground">페이스</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-1.5">
                <Flame size={16} className="text-destructive" />
                <span className="text-sm font-semibold">{completedSession.caloriesBurned} kcal</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3">🎁 획득 보상</p>
            <div className="flex gap-4 justify-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
                <span className="text-lg">🍎</span>
                <span className="font-bold text-primary">+{foodReward}</span>
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2">
                <span className="text-lg">⚡</span>
                <span className="font-bold text-secondary">+{expReward} EXP</span>
              </motion.div>
            </div>
          </div>

          {partyExpResults.length > 0 && partyExpResults.some(r => r.expGained > 0) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="glass-card p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-2">⚡ 파티 경험치</p>
              <div className="space-y-1.5">
                {partyExpResults.map(r => {
                  const species = getPokemonById(r.speciesId);
                  return (
                    <div key={r.uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {species && <img src={species.spriteUrl} alt={species.name} className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />}
                        <span className="text-xs font-medium text-foreground">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-secondary font-bold">+{r.expGained} EXP</span>
                        {r.levelAfter > r.levelBefore && (
                          <span className="text-primary font-bold">Lv.{r.levelBefore}→{r.levelAfter}</span>
                        )}
                        {r.evolved && r.evolvedTo && (
                          <span className="text-accent font-bold">✨ 진화!</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Caught Pokémon summary */}
          {activeQuests.filter(q => q.quest.completed).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }} className="glass-card p-4 mb-4 border border-secondary/30">
              <p className="text-xs text-muted-foreground mb-2">🔴 포획한 포켓몬</p>
              <div className="flex gap-2 flex-wrap">
                {activeQuests.filter(q => q.quest.completed).map(({ quest }) => {
                  const sp = getPokemonById(quest.speciesId);
                  return sp ? (
                    <div key={quest.id} className="flex items-center gap-1.5 bg-secondary/10 rounded-lg px-2 py-1">
                      <img src={sp.spriteUrl} alt={sp.name} className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
                      <span className="text-[10px] font-medium text-foreground">{sp.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </motion.div>
          )}

          {completedChallenges.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="glass-card p-4 mb-4 border border-secondary/30">
              <p className="text-xs text-muted-foreground mb-2">🏆 챌린지 달성!</p>
              {completedChallenges.map(c => (
                <div key={c.id} className="flex items-center gap-2 py-1">
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{c.title}</span>
                </div>
              ))}
            </motion.div>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/home')}
            className="w-full gradient-primary text-primary-foreground rounded-2xl py-4 font-bold text-lg mt-4"
          >
            홈으로 돌아가기
          </motion.button>
        </div>
        <BottomNav />
        <LevelUpOverlay result={levelUpResult} pet={getPet()} onClose={() => setLevelUpResult(null)} />
        <AnimatePresence>
          {hatchedEggs.length > 0 && (
            <EggHatchOverlay hatchedEggs={hatchedEggs} onComplete={() => setHatchedEggs([])} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">🏃 런닝</h1>
          <div className="flex items-center gap-3">
            {runState !== 'idle' && (
              <button
                onClick={() => setShowMap(v => !v)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  showMap ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Map size={12} />
                지도
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

        {/* Pet + Cheer during run */}
        {runState !== 'idle' && !showMap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mb-4">
            {leaderSpecies ? (
              <motion.img
                src={leaderSpecies.spriteUrl}
                alt={leaderSpecies.name}
                className="w-24 h-24 object-contain"
                style={{ imageRendering: 'pixelated' }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : (
              <div className="scale-75">
                <PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} />
              </div>
            )}
            <motion.div key={cheerMessage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="glass-card px-3 py-1.5">
              <p className="text-xs text-foreground">{cheerMessage}</p>
            </motion.div>
          </motion.div>
        )}

        {/* Main stats display */}
        <div className="glass-card p-6 mb-4">
          {runState === 'idle' ? (
             <div className="text-center py-8">
              {leaderSpecies ? (
                <div className="mb-6 flex justify-center">
                  <motion.img
                    src={leaderSpecies.spriteUrl}
                    alt={leaderSpecies.name}
                    className="w-32 h-32 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} />
                </div>
              )}
              <p className="text-lg font-semibold text-foreground mb-2">{leaderSpecies?.name || '포켓몬'}와 함께 달려볼까?</p>
              <p className="text-sm text-muted-foreground">GPS로 런닝을 기록하고 보상을 받으세요</p>
              {gpsError && <p className="text-xs text-destructive mt-2">{gpsError}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <motion.p
                  key={Math.floor(currentDistance * 100)}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-5xl font-bold text-primary tabular-nums"
                >
                  {currentDistance.toFixed(2)}
                </motion.p>
                <p className="text-sm text-muted-foreground">km</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Timer size={12} className="text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{formatDuration(elapsed)}</p>
                  <p className="text-[10px] text-muted-foreground">시간</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Navigation size={12} className="text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{currentPace > 0 ? formatPace(currentPace) : "-'--\""}</p>
                  <p className="text-[10px] text-muted-foreground">페이스</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Flame size={12} className="text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{Math.round(currentDistance * 60)}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
              </div>

              {gpsError && <p className="text-xs text-destructive text-center">{gpsError}</p>}
            </div>
          )}
        </div>

        {/* Catch Quest Banners */}
        {runState !== 'idle' && (
          <CatchQuestBanner quests={activeQuests.filter(q => !q.quest.completed)} />
        )}

        {/* Legendary Mission Banner */}
        <AnimatePresence>
          {legendaryEncounter && runState !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className={`glass-card p-4 mb-4 border ${legendaryCaught ? 'border-secondary/50' : 'border-primary/40'} relative overflow-hidden`}
            >
              {legendaryCaught && (
                <div className="absolute inset-0 gradient-primary opacity-5" />
              )}
              <div className="flex items-center gap-3">
                <motion.div
                  animate={legendaryCaught ? { scale: [1, 1.2, 1] } : { rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex-shrink-0"
                >
                  {(() => {
                    const sp = getPokemonById(legendaryEncounter.definition.speciesId);
                    return sp ? (
                      <img src={sp.spriteUrl} alt={sp.name} className="w-14 h-14 object-contain" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <span className="text-3xl">{legendaryEncounter.definition.emoji}</span>
                    );
                  })()}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={12} className="text-secondary" />
                    <span className="text-xs font-bold text-foreground">
                      {legendaryCaught ? `${legendaryEncounter.definition.name} 포획 완료!` : `${legendaryEncounter.definition.name} 조우!`}
                    </span>
                  </div>
                  {!legendaryCaught && (
                    <>
                      <p className="text-[10px] text-muted-foreground mb-1.5">{legendaryEncounter.mission.label}: {legendaryEncounter.mission.description}</p>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full gradient-warm"
                          initial={false}
                          animate={{ width: `${legendaryMissionProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5 text-right">{Math.round(legendaryMissionProgress)}%</p>
                    </>
                  )}
                  {legendaryCaught && (
                    <p className="text-[10px] text-secondary">🎉 축하합니다! 전설의 포켓몬을 포획했습니다!</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NPC Trainer Encounter Banner */}
        <AnimatePresence>
          {npcEncounter && runState !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-4 mb-4 border border-destructive/40 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-primary/5" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <motion.span
                    className="text-3xl"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {npcEncounter.emoji}
                  </motion.span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{npcEncounter.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        npcEncounter.difficulty === 'elite' ? 'bg-accent/20 text-accent' :
                        npcEncounter.difficulty === 'hard' ? 'bg-primary/20 text-primary' :
                        npcEncounter.difficulty === 'medium' ? 'bg-secondary/20 text-secondary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        Lv.{npcEncounter.level}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">"{npcEncounter.dialogue.before}"</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mb-3">
                  {npcEncounter.teamSpeciesIds.map(id => {
                    const sp = getPokemonById(id);
                    return sp ? (
                      <img key={id} src={sp.spriteUrl} alt={sp.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
                    ) : null;
                  })}
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleBattleNpc}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 gradient-primary text-primary-foreground text-sm font-bold"
                  >
                    <Swords size={14} /> 배틀!
                  </motion.button>
                  <button
                    onClick={handleDeclineBattle}
                    className="px-4 rounded-xl py-2.5 bg-muted text-muted-foreground text-sm"
                  >
                    도망
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NPC Loading indicator */}
        {isGeneratingNpc && runState === 'running' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-3 mb-4 text-center border border-primary/20"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block text-lg"
            >
              ⚡
            </motion.span>
            <p className="text-xs text-muted-foreground mt-1">풀숲에서 인기척이...</p>
          </motion.div>
        )}

        <div className="flex justify-center gap-4">
          {runState === 'idle' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleStart}
              className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary glow-shadow"
            >
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

        {/* Reward preview */}
        {runState === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 glass-card p-4">
            <p className="text-xs text-muted-foreground mb-2">💡 런닝 보상</p>
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">🍎 1km당 먹이 1개</span>
              <span className="text-muted-foreground">⚡ 1km당 EXP 10</span>
            </div>
          </motion.div>
        )}

        {/* Legendary & Event Conditions Preview */}
        {runState === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4 glass-card p-4 border border-secondary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-secondary" />
              <span className="text-xs font-bold text-foreground">전설/특수 포켓몬</span>
            </div>
            <div className="space-y-2">
              {(() => {
                const available = checkLegendaryEncounterConditions();
                const events = checkSpecialEventConditions();
                if (available.length > 0 || events.length > 0) {
                  return (
                    <>
                      {available.map(def => {
                        const sp = getPokemonById(def.speciesId);
                        return (
                          <div key={def.speciesId} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/5 border border-secondary/10">
                            {sp ? (
                              <img src={sp.spriteUrl} alt={sp.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
                            ) : (
                              <span className="text-xl">{def.emoji}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-foreground">{def.name}</span>
                              <p className="text-[10px] text-secondary">🌟 조우 가능! 런닝을 시작하세요!</p>
                            </div>
                          </div>
                        );
                      })}
                      {events.map(evt => {
                        const sp = getPokemonById(evt.speciesId);
                        return (
                          <div key={evt.id} className="flex items-center gap-3 p-2 rounded-xl bg-accent/5 border border-accent/10">
                            {sp ? (
                              <img src={sp.spriteUrl} alt={sp.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
                            ) : (
                              <span className="text-xl">{evt.emoji}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-foreground">{evt.name}</span>
                              <p className="text-[10px] text-accent">✨ 특별 조우 가능!</p>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                }
                return (
                  <p className="text-[10px] text-muted-foreground text-center py-2">
                    더 많이 달리면 특별한 포켓몬을 만날 수 있어요!
                  </p>
                );
              })()}
            </div>
          </motion.div>
        )}

        <div className="mx-auto max-w-md px-0 mt-6">
          <DebugPanel />
        </div>
      </div>
      <BottomNav />

      {/* Special Encounter Overlay */}
      <SpecialEncounterOverlay
        show={specialOverlay.show}
        speciesId={specialOverlay.speciesId}
        type={specialOverlay.type}
        onClose={() => setSpecialOverlay({ show: false, speciesId: null, type: 'catch' })}
      />
    </div>
  );
}
