import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDuration, formatPace, getRunningStats } from '@/lib/running';
import { Pedometer, stepsToKm, estimateCaloriesFromSteps, addTodaySteps, getTodaySteps } from '@/lib/pedometer';
import { GpsTracker, type GpsPoint } from '@/lib/gps-tracker';
import { validateRunSession } from '@/lib/activity-validator';
import { calculateRunRewards, type RunRewards } from '@/lib/running-rewards';
import { recordRunForStreak, getRunningStreak, saveRunRecord, type StreakMilestone } from '@/lib/running-streak';
import { calculateAutoMultiplier, checkMultiplierMilestone, getNextTier } from '@/lib/auto-multiplier';
import { getCompanionDialogue, getRunningCheer } from '@/lib/companion-dialogue';
import { getMoodForSteps, getMoodEmoji as getCompanionMoodEmoji, getCheerMessage, type CompanionMood } from '@/lib/pokemon-companion';
import { updateBondAfterRun, getBondState, getMoodEmoji as getBondMoodEmoji } from '@/lib/pokemon-bond';
import { recoverCondition, getConditionState } from '@/lib/pokemon-condition';
import { catchPokemon, markAsSeen, grantExpToParty, getParty, addCoins, type PartyExpResult } from '@/lib/collection';
import { processEncounters, findRegionByGps, type SpawnResult } from '@/lib/pokemon-spawn';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getPet, grantRewards } from '@/lib/pet';
import type { LevelUpResult } from '@/lib/pet';
import {
  checkLegendaryEncounterConditions,
  recordLegendaryCatch,
  type LegendaryDefinition,
} from '@/lib/legendary';
import {
  createCatchQuest, checkQuestProgress, addActiveQuest, completeQuest, failAllActiveQuests, clearActiveQuests,
  type CatchQuest, type QuestProgress,
} from '@/lib/catch-quest';
import { shouldEncounterNpc, generateAiNpc, resetEncounterDistance, type AiNpcTrainer } from '@/lib/npc-encounter';
import { updateChallengesAfterRun, type ChallengeUpdateResult } from '@/lib/challenge';
import { requestWakeLock, releaseWakeLock, requestFullscreen, exitFullscreen } from '@/lib/running-mode';
import { checkAndAutoCollect, createAutoCollectState, type AutoCollectResult, type AutoCollectState } from '@/lib/auto-collect';
import {
  initMediaSession, cleanupMediaSession, updateLockScreenWidget, updateNotificationBar,
  requestNotificationPermission, showEncounterNotification, showRunEndNotification, clearNotifications,
} from '@/lib/widget-notification';
import {
  LEGENDARY_MISSIONS, checkMilestoneAlerts, getLegendaryMissionProgress,
  type LegendaryMission,
} from '@/lib/legendary-story-flow';

export type RunState = 'idle' | 'countdown' | 'legendaryIntro' | 'running' | 'paused' | 'completed' | 'legendaryCutscene';

export interface CompletedData {
  steps: number;
  distanceKm: number;
  durationSec: number;
  pace: number | null;
  calories: number;
  rewards: RunRewards;
  milestones: StreakMilestone[];
  partyExpResults: PartyExpResult[];
  levelUpResult: LevelUpResult | null;
  conditionRecovery: number;
  friendshipGain: number;
  goalAchieved: boolean;
  goalBonus: number;
  spawnResults: SpawnResult[];
  challengeResults: ChallengeUpdateResult | null;
}

export function useRunningSession() {
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
  const [amoledMode, setAmoledMode] = useState(false);
  const multiplierShownRef = useRef<Set<number>>(new Set());

  // Milestone messages during run
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);
  const milestoneShownRef = useRef<Set<number>>(new Set());

  // Completion state
  const [completedData, setCompletedData] = useState<CompletedData | null>(null);

  // Encounters
  const [legendaryEncounter, setLegendaryEncounter] = useState<any>(null);
  const [legendaryMissionProgress, setLegendaryMissionProgress] = useState(0);
  const [legendaryCaught, setLegendaryCaught] = useState(false);
  const legendaryCheckedRef = useRef(false);
  const [activeQuests, setActiveQuests] = useState<{ quest: CatchQuest; progress: QuestProgress }[]>([]);
  const lastEncounterDistRef = useRef(0);
  const [specialOverlay, setSpecialOverlay] = useState<{ show: boolean; speciesId: number | null; type: 'legendary' | 'event' | 'catch' }>({ show: false, speciesId: null, type: 'catch' });
  const [npcEncounter, setNpcEncounter] = useState<AiNpcTrainer | null>(null);
  const [isGeneratingNpc, setIsGeneratingNpc] = useState(false);
  const lastNpcCheckDistRef = useRef(0);
  // Auto-collect
  const autoCollectRef = useRef<AutoCollectState>(createAutoCollectState());
  const [autoCollected, setAutoCollected] = useState<AutoCollectResult[]>([]);

  // Legendary story flow
  const [legendaryStoryDef, setLegendaryStoryDef] = useState<LegendaryDefinition | null>(null);
  const [legendaryStoryMission, setLegendaryStoryMission] = useState<LegendaryMission | null>(null);
  const [legendaryStoryComplete, setLegendaryStoryComplete] = useState(false);
  const legendaryMilestoneShownRef = useRef<Set<number>>(new Set());

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
  const bond = getBondState();
  const condition = getConditionState();

  const stepDistance = stepsToKm(steps, true);
  const currentDistance = stepDistance;
  const spawnCount = autoCollected.length;

  // ─── Timer ──────────────────────────────────────
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
        const runCheer = getRunningCheer(leaderSpecies?.name || '포켓몬', stepsRef.current, bond.friendship);
        setCheerMessage(runCheer);
      }, 10000);
    } else {
      if (cheerRef.current) clearInterval(cheerRef.current);
    }
    return () => { if (cheerRef.current) clearInterval(cheerRef.current); };
  }, [runState, bond.friendship]);

  // Multiplier milestone toasts
  useEffect(() => {
    if (runState !== 'running') return;
    const dist = stepsToKm(steps, true);
    const milestone = checkMultiplierMilestone(dist, multiplierShownRef.current);
    if (milestone) {
      toast(`${milestone.emoji} ${milestone.label}`, {
        description: `보상 배율 ×${milestone.mult} 적용!`,
        duration: 4000,
      });
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    }
  }, [steps, runState]);

  // Step milestones
  useEffect(() => {
    if (runState !== 'running') return;
    const milestones = [
      { steps: 500, msg: '좋은 페이스야! 💪', vibrate: 100 },
      { steps: 1000, msg: '1000보 달성! 🎉 버프 획득!', vibrate: 200 },
      { steps: 2000, msg: '같이 달리니까 즐거워! ⭐', vibrate: 100 },
      { steps: 3000, msg: '3000보! 대단해! 🔥 버프 업그레이드!', vibrate: 200 },
      { steps: 5000, msg: '최고의 러닝이야! 🏆', vibrate: 300 },
    ];
    for (const m of milestones) {
      if (steps >= m.steps && !milestoneShownRef.current.has(m.steps)) {
        milestoneShownRef.current.add(m.steps);
        setMilestoneMsg(m.msg);
        toast(m.msg, { duration: 3000 });
        if ('vibrate' in navigator) navigator.vibrate(m.vibrate);
        setTimeout(() => setMilestoneMsg(null), 3000);
      }
    }
  }, [steps, runState]);

  // GPS pace update
  useEffect(() => {
    if (runState !== 'running') return;
    const id = setInterval(() => {
      if (gpsTrackerRef.current) setCurrentPace(gpsTrackerRef.current.getCurrentPace());
    }, 3000);
    return () => clearInterval(id);
  }, [runState]);

  // Widget + notification bar updates
  useEffect(() => {
    if (runState !== 'running') return;
    const id = setInterval(() => {
      const dist = stepsToKm(stepsRef.current, true);
      const pace = gpsTrackerRef.current?.getCurrentPace() ?? null;
      const isLegMission = !!legendaryStoryMission;
      updateLockScreenWidget({
        distanceKm: dist,
        pace,
        encounterCount: autoCollectRef.current.encounters.length,
        companionName: leaderSpecies?.name || '포켓몬',
        companionImageUrl: leaderSpecies?.spriteUrl,
        isLegendaryMission: isLegMission,
        legendaryName: legendaryStoryMission?.pokemonName,
        legendaryTargetKm: legendaryStoryMission?.targetKm,
      });
      updateNotificationBar({
        distanceKm: dist,
        pace,
        encounterCount: autoCollectRef.current.encounters.length,
      });
    }, 10000);
    return () => clearInterval(id);
  }, [runState, leaderSpecies, legendaryStoryMission]);

  // Quest progress
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

  // Auto-collect
  useEffect(() => {
    if (runState !== 'running') return;
    const lastGps = gpsPoints.length > 0 ? gpsPoints[gpsPoints.length - 1] : null;
    const result = checkAndAutoCollect(
      autoCollectRef.current,
      currentDistance,
      currentPace ?? 8.0,
      lastGps?.lat,
      lastGps?.lng,
    );
    if (result) {
      setAutoCollected(prev => [...prev, result]);
      const gradeEmoji = { normal: '', rare: '⭐ ', unique: '⚡ ' };
      const prefix = result.isNew ? '🌟 새로운 포켓몬! ' : '';
      toast(`${prefix}${gradeEmoji[result.grade]}${result.name} 획득!`, {
        description: `${result.distanceAtEncounter.toFixed(1)}km 지점`,
        duration: result.grade === 'unique' ? 5000 : 3000,
      });
      const species = getPokemonById(result.speciesId);
      showEncounterNotification({
        name: result.name,
        grade: result.grade,
        isNew: result.isNew,
        imageUrl: species?.spriteUrl,
      });
    }
  }, [runState, currentDistance, currentPace, gpsPoints.length]);

  // Legendary story milestone alerts
  useEffect(() => {
    if (runState !== 'running' || !legendaryStoryMission) return;
    const alert = checkMilestoneAlerts(legendaryStoryMission, currentDistance, legendaryMilestoneShownRef.current);
    if (alert) {
      toast(`🔥 ${legendaryStoryMission.pokemonName}`, {
        description: alert.message,
        duration: 5000,
      });
      if ('vibrate' in navigator) navigator.vibrate([300, 100, 300]);
    }
  }, [runState, currentDistance, legendaryStoryMission]);

  // Legendary story mission complete check
  useEffect(() => {
    if (runState !== 'running' || !legendaryStoryDef || !legendaryStoryMission || legendaryStoryComplete) return;
    const distOk = currentDistance >= legendaryStoryMission.targetKm;
    const paceOk = !legendaryStoryMission.targetPace || (currentPace && currentPace > 0 && currentPace <= legendaryStoryMission.targetPace);
    if (distOk && paceOk) {
      setLegendaryStoryComplete(true);
      catchPokemon(legendaryStoryDef.speciesId);
      recordLegendaryCatch(legendaryStoryDef.speciesId);
      toast(`🌟 ${legendaryStoryDef.name} 미션 완료!`, { duration: 5000 });
    }
  }, [runState, currentDistance, currentPace, legendaryStoryDef, legendaryStoryMission, legendaryStoryComplete]);

  // ─── Handlers ──────────────────────────────────
  const handleBattleNpc = () => {
    if (!npcEncounter) return;
    sessionStorage.setItem('routinmon-ai-npc', JSON.stringify(npcEncounter));
    handlePause();
    navigate('/battle?aiNpc=true');
  };

  const handleStart = async () => {
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
    milestoneShownRef.current.clear();
    setMilestoneMsg(null);
    autoCollectRef.current = createAutoCollectState();
    setAutoCollected([]);
    legendaryMilestoneShownRef.current.clear();
    setLegendaryStoryComplete(false);

    const availableLegendaries = checkLegendaryEncounterConditions();
    if (availableLegendaries.length > 0) {
      const def = availableLegendaries[0];
      if (def.autoCatch) {
        catchPokemon(def.speciesId);
        recordLegendaryCatch(def.speciesId);
        setLegendaryStoryDef(def);
        setRunState('legendaryCutscene');
        return;
      }
      const mission = LEGENDARY_MISSIONS[def.speciesId];
      if (mission) {
        setLegendaryStoryDef(def);
        setLegendaryStoryMission(mission);
        setRunState('legendaryIntro');
        return;
      }
    }

    setLegendaryStoryDef(null);
    setLegendaryStoryMission(null);
    setRunState('countdown');
  };

  const handleLegendaryIntroStart = useCallback(() => {
    setRunState('countdown');
  }, []);

  const handleLegendaryIntroCancel = useCallback(() => {
    setLegendaryStoryDef(null);
    setLegendaryStoryMission(null);
    setRunState('idle');
  }, []);

  const handleCountdownComplete = useCallback(async () => {
    await requestWakeLock();
    await requestFullscreen();

    const pedometer = new Pedometer((s) => { stepsRef.current = s; setSteps(s); });
    const pedometerStarted = await pedometer.start();
    setPedometerAvailable(pedometerStarted);
    pedometerRef.current = pedometer;

    const gpsTracker = new GpsTracker();
    const gpsStarted = gpsTracker.start((point, distKm) => {
      setGpsDistance(distKm);
      setGpsPoints(gpsTracker.getPoints());
    });
    setGpsAvailable(gpsStarted);
    gpsTrackerRef.current = gpsTracker;
    if (gpsStarted) setShowMap(true);

    initMediaSession();
    requestNotificationPermission();

    setAmoledMode(true);
    setRunState('running');

    const missionName = legendaryStoryMission?.pokemonName;
    toast(missionName ? `🌟 ${missionName} 미션 시작!` : '🏃 런닝 시작!', {
      description: `${leaderSpecies?.name || '포켓몬'}와 함께 출발!`,
    });
  }, [leaderSpecies, legendaryStoryMission]);

  const handlePause = () => {
    setRunState('paused');
    pedometerRef.current?.stop();
    gpsTrackerRef.current?.stop();
  };

  const handleResume = async () => {
    setRunState('running');
    const currentSteps = stepsRef.current;
    const pedometer = new Pedometer((s) => { const total = currentSteps + s; stepsRef.current = total; setSteps(total); });
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
    releaseWakeLock();
    exitFullscreen();
    cleanupMediaSession();
    setAmoledMode(false);

    const finalSteps = stepsRef.current;
    const finalDuration = elapsedRef.current;
    pedometerRef.current?.stop();
    const gpsResult = gpsTrackerRef.current?.stop();

    if (finalSteps < 50 && (!gpsResult || gpsResult.distanceKm < 0.01)) {
      toast('러닝 기록이 너무 짧아요', { description: '조금 더 달려보세요!' });
      setRunState('idle');
      return;
    }

    const validation = validateRunSession({
      steps: finalSteps,
      gpsDistanceKm: gpsResult?.distanceKm ?? null,
      durationSec: finalDuration,
      hasGps: gpsAvailable && !!gpsResult,
    });

    const pace = currentPace;
    const rewards = calculateRunRewards(finalSteps, pace, validation);

    const distKmForMult = Math.round(stepsToKm(finalSteps, true) * 100) / 100;
    const autoMult = calculateAutoMultiplier(distKmForMult, streak.currentStreak);
    const goalAchieved = autoMult.exp > 1;
    const goalBonus = autoMult.exp;

    const milestones = recordRunForStreak(finalSteps);
    for (const m of milestones) {
      addCoins(m.coins);
      toast(`🏆 스트릭 마일스톤: ${m.emoji} ${m.label}!`, { description: `코인 +${m.coins}`, duration: 5000 });
    }

    addTodaySteps(finalSteps);

    const { levelUp } = grantRewards(0, rewards.exp);
    addCoins(rewards.coins);

    const condResult = recoverCondition(finalSteps);
    const bondResult = updateBondAfterRun(finalSteps);

    const partyResults = grantExpToParty(rewards.exp);

    const autoCollectedIds = new Set(autoCollected.map(a => a.speciesId));
    const spawnResults: SpawnResult[] = autoCollected.map(a => ({
      speciesId: a.speciesId,
      name: a.name,
      grade: a.grade,
      isNew: a.isNew,
    }));

    const lastGpsPoint = gpsPoints.length > 0 ? gpsPoints[gpsPoints.length - 1] : null;
    const region = lastGpsPoint ? findRegionByGps(lastGpsPoint.lat, lastGpsPoint.lng) : null;
    const distKm = Math.round(stepsToKm(finalSteps, true) * 100) / 100;
    const runPace = pace ?? 8.0;
    const totalKm = getRunningStats().totalDistanceKm + distKm;

    if (spawnResults.length < 5) {
      const extraEncounters = processEncounters(region, distKm, runPace, totalKm);
      for (const spawn of extraEncounters) {
        if (autoCollectedIds.has(spawn.speciesId)) continue;
        if (spawnResults.length >= 5) break;
        catchPokemon(spawn.speciesId);
        markAsSeen([spawn.speciesId]);
        spawnResults.push(spawn);
      }
    }

    const challengeResults = updateChallengesAfterRun({
      distanceKm: distKm,
      paceMinPerKm: pace ?? 0,
      regionId: region?.id,
      hour: new Date().getHours(),
    });

    if (challengeResults.totalCoinsEarned > 0) {
      addCoins(challengeResults.totalCoinsEarned);
    }

    if (challengeResults.specialItems.length > 0) {
      import('@/lib/shop').then(({ addItemToInventory }) => {
        for (const itemId of challengeResults.specialItems) {
          addItemToInventory(itemId, 1);
        }
      });
    }

    for (const ch of challengeResults.newlyCompleted) {
      toast(`🏅 챌린지 달성: ${ch.emoji} ${ch.name}!`, {
        description: `코인 +${ch.rewardCoins}${ch.rewardTitle ? ` | 칭호: ${ch.rewardTitle}` : ''}${ch.rewardItemId ? ' | 🧬 특수 아이템 획득!' : ''}`,
        duration: 5000,
      });
    }

    saveRunRecord({
      date: new Date().toISOString().split('T')[0],
      steps: finalSteps,
      distanceKm: distKm,
      durationSec: finalDuration,
      paceMinPerKm: pace,
      companionSpeciesId: leaderSpecies?.id ?? 0,
      companionName: leaderSpecies?.name ?? '포켓몬',
      rewards: {
        exp: rewards.exp,
        coins: rewards.coins,
        conditionRecovery: condResult.recovery,
        friendshipGain: rewards.friendshipGain,
      },
    });

    failAllActiveQuests();
    setActiveQuests(prev => prev.filter(q => q.quest.completed));

    setCompletedData({
      steps: finalSteps,
      distanceKm: distKm,
      durationSec: finalDuration,
      pace,
      calories: estimateCaloriesFromSteps(finalSteps),
      rewards,
      milestones,
      partyExpResults: partyResults,
      levelUpResult: levelUp,
      conditionRecovery: condResult.recovery,
      friendshipGain: rewards.friendshipGain,
      goalAchieved,
      goalBonus,
      spawnResults,
      challengeResults: challengeResults.newlyCompleted.length > 0 ? challengeResults : null,
    });

    showRunEndNotification(distKm, spawnResults.length);
    clearNotifications();

    if (legendaryStoryDef && legendaryStoryComplete) {
      setRunState('legendaryCutscene');
    } else {
      setRunState('completed');
    }
  };

  const handleLegendaryCutsceneComplete = useCallback(() => {
    setRunState('completed');
  }, []);

  const toggleAmoledMode = useCallback(() => {
    setAmoledMode(v => {
      if (!v) requestFullscreen(); else exitFullscreen();
      return !v;
    });
  }, []);

  const toggleMap = useCallback(() => {
    setShowMap(v => !v);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pedometerRef.current?.stop();
      gpsTrackerRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      releaseWakeLock();
      exitFullscreen();
      cleanupMediaSession();
      clearNotifications();
    };
  }, []);

  return {
    // State
    runState,
    elapsed,
    steps,
    gpsDistance,
    gpsPoints,
    currentPace,
    companionMood,
    cheerMessage,
    gpsAvailable,
    pedometerAvailable,
    showMap,
    amoledMode,
    milestoneMsg,
    completedData,
    legendaryEncounter,
    legendaryMissionProgress,
    legendaryCaught,
    activeQuests,
    specialOverlay,
    npcEncounter,
    isGeneratingNpc,
    autoCollected,
    legendaryStoryDef,
    legendaryStoryMission,
    legendaryStoryComplete,
    currentDistance,
    spawnCount,

    // Derived
    pet,
    partyLeader,
    leaderSpecies,
    streak,
    bond,
    condition,

    // Handlers
    handleStart,
    handleCountdownComplete,
    handlePause,
    handleResume,
    handleStop,
    handleBattleNpc,
    handleLegendaryIntroStart,
    handleLegendaryIntroCancel,
    handleLegendaryCutsceneComplete,
    toggleAmoledMode,
    toggleMap,
    setSpecialOverlay,
    setNpcEncounter,
    setCompletedData,
    navigate,
  };
}
