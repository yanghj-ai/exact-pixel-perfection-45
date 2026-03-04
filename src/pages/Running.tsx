import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Timer, Flame, Navigation, Map, Swords, Footprints } from 'lucide-react';
import { toast } from 'sonner';
import { formatDuration, formatPace } from '@/lib/running';
import { Pedometer, stepsToKm, estimateCaloriesFromSteps, addTodaySteps, getTodaySteps } from '@/lib/pedometer';
import { GpsTracker, type GpsPoint } from '@/lib/gps-tracker';
import { validateRunSession } from '@/lib/activity-validator';
import { calculateRunRewards, type RunRewards } from '@/lib/running-rewards';
import { recordRunForStreak, getRunningStreak, type StreakMilestone } from '@/lib/running-streak';
import { getMoodForSteps, getMoodEmoji, getCheerMessage, type CompanionMood } from '@/lib/pokemon-companion';
import { triggerEncounter, catchPokemon, markAsSeen, grantExpToParty, getParty, type PartyExpResult } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getPet, grantRewards } from '@/lib/pet';
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
import { addCoins } from '@/lib/collection';

import PetSprite from '@/components/PetSprite';
import BottomNav from '@/components/BottomNav';
import RunningMap from '@/components/RunningMap';
import DebugPanel from '@/components/DebugPanel';
import CatchQuestBanner from '@/components/CatchQuestBanner';
import SpecialEncounterOverlay from '@/components/SpecialEncounterOverlay';
import RunningCompleted from '@/components/running/RunningCompleted';
import { LegendaryBanner, NpcEncounterBanner } from '@/components/running/RunningBanners';
import LegendaryPreview from '@/components/running/LegendaryPreview';

type RunState = 'idle' | 'running' | 'paused' | 'completed';

export default function RunningPage() {
  const navigate = useNavigate();
  const [runState, setRunState] = useState<RunState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState(0);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>([]);
  const [currentPace, setCurrentPace] = useState<number | null>(null);
  const [companionMood, setCompanionMood] = useState<CompanionMood>('neutral');
  const [cheerMessage, setCheerMessage] = useState('파이팅!');
  const [gpsAvailable, setGpsAvailable] = useState(true);
  const [pedometerAvailable, setPedometerAvailable] = useState(true);
  const [showMap, setShowMap] = useState(false);

  // Completion state
  const [completedData, setCompletedData] = useState<{
    steps: number;
    distanceKm: number;
    durationSec: number;
    pace: number | null;
    calories: number;
    rewards: RunRewards;
    milestones: StreakMilestone[];
    partyExpResults: PartyExpResult[];
    levelUpResult: LevelUpResult | null;
  } | null>(null);

  // Encounters
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

  // Refs
  const pedometerRef = useRef<Pedometer | null>(null);
  const gpsTrackerRef = useRef<GpsTracker | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cheerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const stepsRef = useRef(0);

  const pet = getPet();
  const partyLeader = getParty()[0];
  const leaderSpecies = partyLeader ? getPokemonById(partyLeader.speciesId) : null;
  const streak = getRunningStreak();

  // Computed distance from steps
  const stepDistance = stepsToKm(steps, true);

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

  // Companion cheers
  useEffect(() => {
    if (runState === 'running') {
      cheerRef.current = setInterval(() => {
        const mood = getMoodForSteps(stepsRef.current);
        setCompanionMood(mood);
        setCheerMessage(getCheerMessage(mood));
      }, 10000);
    } else {
      if (cheerRef.current) clearInterval(cheerRef.current);
    }
    return () => { if (cheerRef.current) clearInterval(cheerRef.current); };
  }, [runState]);

  // GPS pace update
  useEffect(() => {
    if (runState !== 'running') return;
    const id = setInterval(() => {
      if (gpsTrackerRef.current) {
        setCurrentPace(gpsTrackerRef.current.getCurrentPace());
      }
    }, 3000);
    return () => clearInterval(id);
  }, [runState]);

  // Encounter check (using step-based distance)
  const currentDistance = stepDistance;

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
        break;
      }
    }
  }, [runState]);

  // Legendary mission progress
  useEffect(() => {
    if (!legendaryEncounter || !legendaryEncounter.missionActive || legendaryCaught) return;
    const pace = currentPace ?? 0;
    setLegendaryMissionProgress(getMissionProgress(legendaryEncounter.mission, currentDistance, elapsed, pace));
    if (checkMissionComplete(legendaryEncounter.mission, currentDistance, elapsed, pace)) {
      setLegendaryCaught(true);
      catchPokemon(legendaryEncounter.definition.speciesId);
      recordLegendaryCatch(legendaryEncounter.definition.speciesId);
      setSpecialOverlay({ show: true, speciesId: legendaryEncounter.definition.speciesId, type: 'legendary' });
      toast(`🌟 ${legendaryEncounter.definition.name}을(를) 포획했다!`, { duration: 8000 });
    }
  }, [legendaryEncounter, currentDistance, elapsed, legendaryCaught, currentPace]);

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
      const pace = currentPace ?? 0;
      setActiveQuests(prev => [...prev, { quest, progress: checkQuestProgress(quest, currentDistance, elapsed, pace) }]);
      toast(`🔴 야생의 ${encounter.name} 발견!`, { description: quest.requirements.map(r => r.label).join(' + '), duration: 4000 });
    }
  }, [runState, currentDistance, elapsed]);

  // Update quest progress
  useEffect(() => {
    if (activeQuests.length === 0) return;
    const pace = currentPace ?? 0;
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
          toast(`⚔️ ${npc.emoji} ${npc.name}이(가) 승부를 걸어왔다!`, { duration: 5000 });
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

  // ─── Controls ──────────────────────────────────────────

  const handleStart = async () => {
    // Reset state
    setSteps(0); stepsRef.current = 0;
    setElapsed(0); elapsedRef.current = 0;
    setGpsDistance(0); setGpsPoints([]);
    setCurrentPace(null);
    setCompanionMood('neutral');
    setCheerMessage(getCheerMessage('neutral'));
    legendaryCheckedRef.current = false;
    setLegendaryEncounter(null); setLegendaryCaught(false); setLegendaryMissionProgress(0);
    setActiveQuests([]); clearActiveQuests(); lastEncounterDistRef.current = 0;
    setNpcEncounter(null); lastNpcCheckDistRef.current = 0; resetEncounterDistance();
    setCompletedData(null);

    // Start pedometer
    const pedometer = new Pedometer((s) => {
      stepsRef.current = s;
      setSteps(s);
    });
    const pedometerStarted = await pedometer.start();
    setPedometerAvailable(pedometerStarted);
    pedometerRef.current = pedometer;

    // Start GPS (auxiliary)
    const gpsTracker = new GpsTracker();
    const gpsStarted = gpsTracker.start((point, distKm) => {
      setGpsDistance(distKm);
      setGpsPoints(gpsTracker.getPoints());
    });
    setGpsAvailable(gpsStarted);
    gpsTrackerRef.current = gpsTracker;

    if (gpsStarted) setShowMap(true);

    setRunState('running');
    toast('🏃 런닝 시작!', {
      description: `${leaderSpecies?.name || '포켓몬'}와 함께 달려볼까요!${!pedometerStarted ? ' (만보기 센서 미지원 — GPS 모드)' : ''}`,
    });
  };

  const handlePause = () => {
    setRunState('paused');
    pedometerRef.current?.stop();
    gpsTrackerRef.current?.stop();
  };

  const handleResume = async () => {
    setRunState('running');
    // Restart sensors (continuing counts)
    const currentSteps = stepsRef.current;
    const pedometer = new Pedometer((s) => {
      const total = currentSteps + s;
      stepsRef.current = total;
      setSteps(total);
    });
    await pedometer.start();
    pedometerRef.current = pedometer;

    const gpsTracker = new GpsTracker();
    gpsTracker.start((point, distKm) => {
      setGpsDistance(prev => prev + distKm);
      setGpsPoints(prev => [...prev, ...gpsTracker.getPoints()]);
    });
    gpsTrackerRef.current = gpsTracker;
  };

  const handleStop = () => {
    const finalSteps = stepsRef.current;
    const finalDuration = elapsedRef.current;
    pedometerRef.current?.stop();
    const gpsResult = gpsTrackerRef.current?.stop();

    // Minimum threshold
    if (finalSteps < 50 && (!gpsResult || gpsResult.distanceKm < 0.01)) {
      toast('러닝 기록이 너무 짧아요', { description: '조금 더 달려보세요!' });
      setRunState('idle');
      return;
    }

    // Validate session
    const validation = validateRunSession({
      steps: finalSteps,
      gpsDistanceKm: gpsResult?.distanceKm ?? null,
      durationSec: finalDuration,
      hasGps: gpsAvailable && !!gpsResult,
    });

    // Calculate rewards
    const pace = currentPace;
    const rewards = calculateRunRewards(finalSteps, pace, validation);

    // Record streak
    const milestones = recordRunForStreak(finalSteps);
    for (const m of milestones) {
      addCoins(m.coins);
      toast(`🏆 스트릭 마일스톤: ${m.emoji} ${m.label}!`, { description: `코인 +${m.coins}, 먹이 +${m.berries}`, duration: 5000 });
    }

    // Add today's steps
    addTodaySteps(finalSteps);

    // Grant rewards
    const { levelUp } = grantRewards(rewards.berries, rewards.exp);
    addCoins(rewards.coins);

    // Party EXP
    const partyResults = grantExpToParty(rewards.exp);

    // Fail incomplete quests
    failAllActiveQuests();
    setActiveQuests(prev => prev.filter(q => q.quest.completed));

    const distKm = stepsToKm(finalSteps, true);

    setCompletedData({
      steps: finalSteps,
      distanceKm: Math.round(distKm * 100) / 100,
      durationSec: finalDuration,
      pace,
      calories: estimateCaloriesFromSteps(finalSteps),
      rewards,
      milestones,
      partyExpResults: partyResults,
      levelUpResult: levelUp,
    });

    setRunState('completed');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      pedometerRef.current?.stop();
      gpsTrackerRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Completed Screen ──────────────────────────────────
  if (runState === 'completed' && completedData) {
    return (
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-5 pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <span className="text-4xl">🎉</span>
            <h1 className="text-2xl font-bold text-foreground mt-2">런닝 완료!</h1>
          </motion.div>

          {gpsPoints.length > 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-4">
              <RunningMap route={gpsPoints.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp }))} className="h-48" />
            </motion.div>
          )}

          {/* Companion */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center mb-6">
            {leaderSpecies ? (
              <motion.img src={leaderSpecies.spriteUrl} alt={leaderSpecies.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
            ) : (
              <PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} />
            )}
            <div className="glass-card px-4 py-2 mt-2">
              <p className="text-sm text-foreground">정말 대단해! 🔥</p>
            </div>
          </motion.div>

          {/* Stats — steps as main */}
          <div className="glass-card p-5 space-y-4 mb-4">
            <div className="text-center">
              <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-5xl font-bold text-primary tabular-nums">{completedData.steps.toLocaleString()}</motion.p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Footprints size={14} /> 걸음</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-foreground">{completedData.distanceKm.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{formatDuration(completedData.durationSec)}</p>
                <p className="text-xs text-muted-foreground">시간</p>
              </div>
              <div>
                <p className="text-xl font-bold text-secondary">{completedData.pace ? formatPace(completedData.pace) : '-'}</p>
                <p className="text-xs text-muted-foreground">페이스</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-1.5">
                <Flame size={16} className="text-destructive" />
                <span className="text-sm font-semibold">{completedData.calories} kcal</span>
              </div>
            </div>
          </div>

          {/* Bonus multiplier */}
          {completedData.rewards.bonusMultiplier > 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-3 mb-4 border border-secondary/30">
              <div className="flex items-center gap-2 text-sm">
                <span>⚡</span>
                <span className="text-foreground font-medium">보너스 ×{completedData.rewards.bonusMultiplier.toFixed(1)}</span>
                {completedData.rewards.paceBonus > 1 && <span className="text-xs text-muted-foreground">(페이스 ×{completedData.rewards.paceBonus})</span>}
                {completedData.rewards.streakBonus > 1 && <span className="text-xs text-muted-foreground">(스트릭 ×{completedData.rewards.streakBonus.toFixed(1)})</span>}
              </div>
            </motion.div>
          )}

          {/* Rewards */}
          <div className="glass-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3">🎁 획득 보상</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
                <span className="text-lg">⚡</span>
                <span className="font-bold text-primary">+{completedData.rewards.exp} EXP</span>
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2">
                <span className="text-lg">🪙</span>
                <span className="font-bold text-secondary">+{completedData.rewards.coins}</span>
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2">
                <span className="text-lg">🍎</span>
                <span className="font-bold text-accent">+{completedData.rewards.berries}</span>
              </motion.div>
            </div>
          </div>

          {/* Milestones */}
          {completedData.milestones.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="glass-card p-4 mb-4 border border-primary/30">
              <p className="text-xs text-muted-foreground mb-2">🏆 스트릭 마일스톤 달성!</p>
              {completedData.milestones.map(m => (
                <div key={m.days} className="flex items-center gap-2 py-1">
                  <span className="text-lg">{m.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{m.label}</span>
                  <span className="text-xs text-muted-foreground">({m.days}일 연속)</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Party EXP */}
          {completedData.partyExpResults.length > 0 && completedData.partyExpResults.some(r => r.expGained > 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="glass-card p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-2">⚡ 파티 경험치</p>
              <div className="space-y-1.5">
                {completedData.partyExpResults.map(r => {
                  const species = getPokemonById(r.speciesId);
                  return (
                    <div key={r.uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {species && <img src={species.spriteUrl} alt={species.name} className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />}
                        <span className="text-xs font-medium text-foreground">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-secondary font-bold">+{r.expGained} EXP</span>
                        {r.levelAfter > r.levelBefore && <span className="text-primary font-bold">Lv.{r.levelBefore}→{r.levelAfter}</span>}
                        {r.evolved && <span className="text-accent font-bold">✨ 진화!</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Caught Pokémon */}
          {activeQuests.filter(q => q.quest.completed).length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="glass-card p-4 mb-4 border border-secondary/30">
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

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/home')}
            className="w-full gradient-primary text-primary-foreground rounded-2xl py-4 font-bold text-lg mt-4"
          >
            홈으로 돌아가기
          </motion.button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── Active / Idle Screen ──────────────────────────────
  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">🏃 런닝</h1>
          <div className="flex items-center gap-3">
            {runState !== 'idle' && gpsAvailable && (
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
        {showMap && runState !== 'idle' && gpsPoints.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
            <RunningMap route={gpsPoints.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp }))} isLive className="h-48" />
          </motion.div>
        )}

        {/* Companion + Mood */}
        {runState !== 'idle' && !showMap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mb-4">
            {leaderSpecies ? (
              <motion.img src={leaderSpecies.spriteUrl} alt={leaderSpecies.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
            ) : (
              <div className="scale-75"><PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} /></div>
            )}
            <motion.div key={cheerMessage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="glass-card px-3 py-1.5 flex items-center gap-1.5">
              <span>{getMoodEmoji(companionMood)}</span>
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
                  <motion.img src={leaderSpecies.spriteUrl} alt={leaderSpecies.name} className="w-32 h-32 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} />
                </div>
              ) : (
                <div className="mb-6"><PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} /></div>
              )}
              <p className="text-lg font-semibold text-foreground mb-2">{leaderSpecies?.name || '포켓몬'}와 함께 달려볼까?</p>
              <p className="text-sm text-muted-foreground">걸음수로 보상을 받고 포켓몬을 성장시키세요</p>

              {/* Streak info */}
              {streak.currentStreak > 0 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-bold text-primary">{streak.currentStreak}일 연속</span>
                  <span className="text-xs text-muted-foreground">(보너스 ×{Math.min(2.0, 1 + streak.currentStreak * 0.1).toFixed(1)})</span>
                </div>
              )}

              {/* Today's steps */}
              {getTodaySteps() > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  오늘 총 걸음: {getTodaySteps().toLocaleString()}보
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Steps — MAIN display (largest) */}
              <div className="text-center">
                <motion.p
                  key={Math.floor(steps / 10)}
                  initial={{ scale: 1.02 }}
                  animate={{ scale: 1 }}
                  className="text-5xl font-bold text-primary tabular-nums"
                >
                  {steps.toLocaleString()}
                </motion.p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Footprints size={14} /> 걸음 {getMoodEmoji(companionMood)}
                </p>
              </div>

              {/* Sub stats */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground tabular-nums">{stepDistance.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">km</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5"><Timer size={10} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{formatDuration(elapsed)}</p>
                  <p className="text-[10px] text-muted-foreground">시간</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5"><Navigation size={10} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{currentPace ? formatPace(currentPace) : "-'--\""}</p>
                  <p className="text-[10px] text-muted-foreground">페이스</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5"><Flame size={10} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{estimateCaloriesFromSteps(steps)}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
              </div>

              {!pedometerAvailable && (
                <p className="text-[10px] text-muted-foreground text-center">⚠️ 만보기 센서 미지원 — GPS 거리 기반으로 동작 중</p>
              )}
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
              <p className="text-xs text-muted-foreground mb-2">💡 걸음수 보상</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>👟 1000보 = EXP 100 + 코인 5 + 먹이 2</p>
                <p>⚡ 페이스 보너스: 6분/km 이하 ×1.3</p>
                <p>🔥 스트릭 보너스: 연속일수 × 0.1 (최대 ×2.0)</p>
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
