import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Timer, Flame, Navigation, Map, Swords, Footprints, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDuration, formatPace, getRunningStats } from '@/lib/running';
import { Pedometer, stepsToKm, estimateCaloriesFromSteps, addTodaySteps, getTodaySteps } from '@/lib/pedometer';
import { GpsTracker, type GpsPoint } from '@/lib/gps-tracker';
import { validateRunSession } from '@/lib/activity-validator';
import { calculateRunRewards, type RunRewards } from '@/lib/running-rewards';
import { recordRunForStreak, getRunningStreak, saveRunRecord, type StreakMilestone } from '@/lib/running-streak';
import { calculateAutoMultiplier, checkMultiplierMilestone } from '@/lib/auto-multiplier';
import { getCompanionDialogue, getRunningCheer } from '@/lib/companion-dialogue';
import { getMoodForSteps, getMoodEmoji as getCompanionMoodEmoji, getCheerMessage, type CompanionMood } from '@/lib/pokemon-companion';
import { updateBondAfterRun, getBondState, getMoodEmoji as getBondMoodEmoji } from '@/lib/pokemon-bond';
import { recoverCondition, getConditionState } from '@/lib/pokemon-condition';
import { catchPokemon, markAsSeen, grantExpToParty, getParty, type PartyExpResult } from '@/lib/collection';
import { processEncounters, findRegionByGps, getDefaultRegion, type SpawnResult } from '@/lib/pokemon-spawn';
import { getGradeInfo } from '@/lib/pokemon-grade';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getPet, grantRewards } from '@/lib/pet';
import type { LevelUpResult } from '@/lib/pet';
import {
  checkLegendaryEncounterConditions,
  checkMissionComplete, getMissionProgress, recordLegendaryCatch,
  type LegendaryEncounter, type LegendaryDefinition,
} from '@/lib/legendary';
import {
  createCatchQuest, checkQuestProgress, addActiveQuest, completeQuest, failAllActiveQuests, clearActiveQuests,
  type CatchQuest, type QuestProgress,
} from '@/lib/catch-quest';
import { shouldEncounterNpc, generateAiNpc, resetEncounterDistance, type AiNpcTrainer } from '@/lib/npc-encounter';
import { addCoins } from '@/lib/collection';
import { updateChallengesAfterRun, type ChallengeUpdateResult, type ChallengeDefinition } from '@/lib/challenge';
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

import PetSprite from '@/components/PetSprite';
import BottomNav from '@/components/BottomNav';
import RunningMap from '@/components/RunningMap';
import DebugPanel from '@/components/DebugPanel';
import CatchQuestBanner from '@/components/CatchQuestBanner';
import SpecialEncounterOverlay from '@/components/SpecialEncounterOverlay';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import { LegendaryBanner, NpcEncounterBanner } from '@/components/running/RunningBanners';
import LegendaryPreview from '@/components/running/LegendaryPreview';
import RunningCountdown from '@/components/running/RunningCountdown';
import RunningAmoledScreen from '@/components/running/RunningAmoledScreen';
import LegendaryStoryIntro from '@/components/running/LegendaryStoryIntro';
import LegendaryCutscene from '@/components/running/LegendaryCutscene';
import EncounterPokemonCard from '@/components/running/EncounterPokemonCard';

type RunState = 'idle' | 'countdown' | 'legendaryIntro' | 'running' | 'paused' | 'completed' | 'legendaryCutscene';

// 목표 유형
// 목표는 자동 배율 시스템으로 대체 (FIX #3)
// GOAL_CONFIG 및 selectedGoal 제거

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
  const [amoledMode, setAmoledMode] = useState(false);
  const multiplierShownRef = useRef<Set<number>>(new Set());

  // Milestone messages during run
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);
  const milestoneShownRef = useRef<Set<number>>(new Set());

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
    conditionRecovery: number;
    friendshipGain: number;
    goalAchieved: boolean;
    goalBonus: number;
      spawnResults: SpawnResult[];
      challengeResults: ChallengeUpdateResult | null;
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
  // Auto-collect (실시간 자동 수집)
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

  // Companion cheers + milestone checks
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

  // Step milestones during running
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

  // 위젯 + 알림바 업데이트 (10초마다) — 전설 미션 진행도 포함
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

  const currentDistance = stepDistance;

  // Legendary encounter check — now handled by handleStart story flow
  // Old in-run legendary check removed; legendary missions use the 3-stage flow

  // Wild encounter - now handled at run completion via processEncounters

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

  // Auto-collect: 0.5km마다 실시간 포획 체크
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
      // 잠금화면 알림
      const species = getPokemonById(result.speciesId);
      showEncounterNotification({
        name: result.name,
        grade: result.grade,
        isNew: result.isNew,
        imageUrl: species?.spriteUrl,
      });
    }
  }, [runState, currentDistance, currentPace, gpsPoints.length]);

  // Legendary story mission milestone alerts (파이어 2/5/8km, 뮤츠 5km)
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

  const handleBattleNpc = () => {
    if (!npcEncounter) return;
    sessionStorage.setItem('routinmon-ai-npc', JSON.stringify(npcEncounter));
    handlePause();
    navigate('/battle?aiNpc=true');
  };

  // ─── Controls ──────────────────────────────────────────

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

    // 전설 포켓몬 스토리 체크
    const availableLegendaries = checkLegendaryEncounterConditions();
    if (availableLegendaries.length > 0) {
      const def = availableLegendaries[0];
      if (def.autoCatch) {
        // 뮤: 자동 포획 (러닝 없이)
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

    // 일반 러닝 카운트다운
    setLegendaryStoryDef(null);
    setLegendaryStoryMission(null);
    setRunState('countdown');
  };

  const handleLegendaryIntroStart = useCallback(() => {
    // 인트로 → 카운트다운 → 러닝
    setRunState('countdown');
  }, []);

  const handleLegendaryIntroCancel = useCallback(() => {
    setLegendaryStoryDef(null);
    setLegendaryStoryMission(null);
    setRunState('idle');
  }, []);

  const handleCountdownComplete = useCallback(async () => {
    // Wake Lock + 전체화면
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

    // 위젯 + 알림 초기화
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
    // Wake Lock + 전체화면 + 미디어세션 해제
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

    // FIX #3: 자동 배율 계산 (목표 선택 제거)
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

    // Grant EXP (no food)
    const { levelUp } = grantRewards(0, rewards.exp);
    addCoins(rewards.coins);

    // 컨디션 회복 + 유대감 업데이트
    const condResult = recoverCondition(finalSteps);
    const bondResult = updateBondAfterRun(finalSteps);

    // Party EXP
    const partyResults = grantExpToParty(rewards.exp);

    // 자동 수집된 포켓몬을 SpawnResult 형태로 변환 (이미 포획 완료)
    const autoCollectedIds = new Set(autoCollected.map(a => a.speciesId));
    const spawnResults: SpawnResult[] = autoCollected.map(a => ({
      speciesId: a.speciesId,
      name: a.name,
      grade: a.grade,
      isNew: a.isNew,
    }));

    // 추가 조우 처리 (자동 수집에서 놓친 것들)
    const lastGpsPoint = gpsPoints.length > 0 ? gpsPoints[gpsPoints.length - 1] : null;
    const region = lastGpsPoint ? findRegionByGps(lastGpsPoint.lat, lastGpsPoint.lng) : null;
    const distKm = Math.round(stepsToKm(finalSteps, true) * 100) / 100;
    const runPace = pace ?? 8.0;
    const totalKm = getRunningStats().totalDistanceKm + distKm;

    // 자동 수집으로 5마리 미만이면 추가 조우 가능
    if (spawnResults.length < 5) {
      const extraEncounters = processEncounters(region, distKm, runPace, totalKm);
      for (const spawn of extraEncounters) {
        if (autoCollectedIds.has(spawn.speciesId)) continue; // 중복 방지
        if (spawnResults.length >= 5) break;
        catchPokemon(spawn.speciesId);
        markAsSeen([spawn.speciesId]);
        spawnResults.push(spawn);
      }
    }

    // 챌린지 업데이트
    const challengeResults = updateChallengesAfterRun({
      distanceKm: distKm,
      paceMinPerKm: pace ?? 0,
      regionId: region?.id,
      hour: new Date().getHours(),
    });

    if (challengeResults.totalCoinsEarned > 0) {
      addCoins(challengeResults.totalCoinsEarned);
    }

    // 특수 아이템 보상 지급
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

    // 기록 저장
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

    // 종료 알림
    showRunEndNotification(distKm, spawnResults.length);
    clearNotifications();

    // 전설 미션 성공 시 컷신으로 전환
    if (legendaryStoryDef && legendaryStoryComplete) {
      setRunState('legendaryCutscene');
    } else {
      setRunState('completed');
    }
  };

  const handleLegendaryCutsceneComplete = useCallback(() => {
    setRunState('completed');
  }, []);

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

  // ─── Legendary Story Intro Screen ──────────────────────
  if (runState === 'legendaryIntro' && legendaryStoryDef) {
    return (
      <LegendaryStoryIntro
        definition={legendaryStoryDef}
        onStart={handleLegendaryIntroStart}
        onCancel={handleLegendaryIntroCancel}
      />
    );
  }

  // ─── Legendary Cutscene Screen ─────────────────────────
  if (runState === 'legendaryCutscene' && legendaryStoryDef) {
    return (
      <LegendaryCutscene
        definition={legendaryStoryDef}
        onComplete={handleLegendaryCutsceneComplete}
      />
    );
  }

  // ─── Countdown Screen ──────────────────────────────────
  if (runState === 'countdown') {
    return <RunningCountdown onComplete={handleCountdownComplete} />;
  }

  // ─── AMOLED Running Mode Screen ────────────────────────
  // 러닝 중이고 AMOLED 모드일 때 전체화면 검은 배경 표시
  const spawnCount = autoCollected.length;

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
              <PetSprite stage={pet.stage} hp={100} maxHp={100} happiness={5} streak={0} />
            )}
            <div className="glass-card px-4 py-2 mt-2">
              <p className="text-sm text-foreground">같이 달려서 즐거웠어! 😊</p>
            </div>
          </motion.div>

          {/* Stats */}
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

          {/* Goal achievement */}
          {completedData.goalAchieved && completedData.goalBonus > 1 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="glass-card p-3 mb-4 border border-secondary/30 text-center">
              <span className="text-lg">🎯</span>
              <p className="text-sm font-bold text-secondary">목표 달성! 보상 ×{completedData.goalBonus}</p>
            </motion.div>
          )}

          {/* Rewards */}
          <div className="glass-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3">🎁 획득 보상</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
                <span className="text-lg">⚡</span>
                <span className="font-bold text-primary">+{completedData.rewards.exp} EXP</span>
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2">
                <span className="text-lg">🪙</span>
                <span className="font-bold text-secondary">+{completedData.rewards.coins}</span>
              </motion.div>
            </div>
            <div className="flex gap-3 justify-center flex-wrap mt-2">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-heal/10 px-3 py-1.5">
                <span className="text-sm">💚</span>
                <span className="text-xs font-bold text-heal">컨디션 +{completedData.conditionRecovery}</span>
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-1.5">
                <span className="text-sm">💕</span>
                <span className="text-xs font-bold text-accent">친밀도 +{completedData.friendshipGain}</span>
              </motion.div>
            </div>
          </div>

          {/* Milestones */}
          {completedData.milestones.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="glass-card p-4 mb-4 border border-primary/30">
              <p className="text-xs text-muted-foreground mb-2">🏆 스트릭 마일스톤!</p>
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

          {/* Spawned Pokemon — Enhanced Cards */}
          {autoCollected.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="glass-card p-4 mb-4 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-3">🎊 포획한 포켓몬 ({autoCollected.length}마리)</p>
              <div className="space-y-2">
                {autoCollected.map((enc, i) => (
                  <EncounterPokemonCard key={`${enc.speciesId}-${i}`} encounter={enc} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Extra spawn results (non-auto-collected) */}
          {completedData.spawnResults.length > 0 && autoCollected.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="glass-card p-4 mb-4 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-2">🎊 포획한 포켓몬</p>
              <div className="space-y-2">
                {completedData.spawnResults.map((spawn, i) => {
                  const species = getPokemonById(spawn.speciesId);
                  const gradeInfo = getGradeInfo(spawn.grade);
                  return (
                    <motion.div
                      key={spawn.speciesId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.15 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {species && <img src={species.spriteUrl} alt={species.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />}
                        <div>
                          <span className="text-xs font-medium text-foreground">{spawn.name}</span>
                          {spawn.isNew && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">NEW</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: gradeInfo.color }}>{gradeInfo.emoji} {gradeInfo.label}</span>
                    </motion.div>
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

          {/* Challenge Achievements */}
          {completedData.challengeResults && completedData.challengeResults.newlyCompleted.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="glass-card p-4 mb-4 border border-accent/20">
              <p className="text-xs text-muted-foreground mb-2">🏅 챌린지 달성</p>
              <div className="space-y-2">
                {completedData.challengeResults.newlyCompleted.map((ch, i) => (
                  <motion.div
                    key={ch.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + i * 0.15 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{ch.emoji}</span>
                      <div>
                        <span className="text-xs font-medium text-foreground">{ch.name}</span>
                        <p className="text-[10px] text-muted-foreground">{ch.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-secondary font-bold">+{ch.rewardCoins} 🪙</span>
                      {ch.rewardTitle && <span className="px-1 py-0.5 rounded bg-accent/15 text-accent font-bold">🏷️ {ch.rewardTitle}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Legendary mission special card */}
          {legendaryStoryDef && legendaryStoryComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: 'spring' }}
              className="glass-card p-4 mb-4 border-2 border-primary/40 text-center"
            >
              <span className="text-3xl">{legendaryStoryDef.emoji}</span>
              <p className="text-sm font-bold text-primary mt-1">{legendaryStoryDef.name} 합류!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{legendaryStoryDef.storyOutro}</p>
            </motion.div>
          )}

          {/* Share + Home buttons */}
          <div className="flex gap-3 mt-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const text = `오늘 ${completedData.distanceKm.toFixed(1)}km 달리면서 ${autoCollected.length || completedData.spawnResults.length}마리 포켓몬을 만났습니다! #루틴몬`;
                if (navigator.share) {
                  navigator.share({ title: '루틴몬 런닝 기록', text }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(text).then(() => toast('클립보드에 복사됨!')).catch(() => {});
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-border py-3 font-medium text-sm text-foreground"
            >
              <Share2 size={16} /> 공유하기
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/home')}
              className="flex-[2] gradient-primary text-primary-foreground rounded-2xl py-3 font-bold text-lg"
            >
              홈으로 돌아가기
            </motion.button>
          </div>
        </div>
        <BottomNav />
        <LevelUpOverlay result={completedData.levelUpResult} pet={getPet()} onClose={() => setCompletedData(prev => prev ? { ...prev, levelUpResult: null } : null)} />
      </div>
    );
  }

  // ─── Active / Idle Screen ──────────────────────────────
  return (
    <div className="min-h-screen pb-24">
      {/* AMOLED Running Mode Overlay */}
      {amoledMode && (runState === 'running' || runState === 'paused') && (
        <RunningAmoledScreen
          elapsed={elapsed}
          distanceKm={currentDistance}
          pace={currentPace}
          encounterCount={spawnCount}
          companionSpeciesId={leaderSpecies?.id ?? null}
          companionName={leaderSpecies?.name || '포켓몬'}
          isPaused={runState === 'paused'}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          legendaryMissionName={legendaryStoryMission?.pokemonName}
          legendaryMissionTargetKm={legendaryStoryMission?.targetKm}
          legendaryMissionProgress={legendaryStoryMission ? getLegendaryMissionProgress(legendaryStoryMission, currentDistance) : undefined}
        />
      )}
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">🏃 런닝</h1>
          <div className="flex items-center gap-3">
            {runState !== 'idle' && (
              <button onClick={() => { setAmoledMode(v => !v); if (!amoledMode) requestFullscreen(); else exitFullscreen(); }} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${amoledMode ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                🖥️ {amoledMode ? 'ON' : 'OFF'}
              </button>
            )}
            {runState !== 'idle' && gpsAvailable && (
              <button onClick={() => setShowMap(v => !v)} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${showMap ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Map size={12} /> 지도
              </button>
            )}
            {streak.currentStreak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1">
                <Flame size={14} className="text-destructive" />
                <span className="text-sm font-bold text-destructive">{streak.currentStreak}일</span>
              </div>
            )}
          </div>
        </div>

        {/* Live map */}
        {showMap && runState !== 'idle' && gpsPoints.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
            <RunningMap route={gpsPoints.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp }))} isLive className="h-48" />
          </motion.div>
        )}

        {/* Companion + Mood during running */}
        {runState !== 'idle' && !showMap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mb-4">
            {leaderSpecies ? (
              <motion.img src={leaderSpecies.spriteUrl} alt={leaderSpecies.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
            ) : (
              <div className="scale-75"><PetSprite stage={pet.stage} hp={100} maxHp={100} happiness={5} streak={0} /></div>
            )}
            <AnimatePresence mode="wait">
              <motion.div key={milestoneMsg || cheerMessage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`glass-card px-3 py-1.5 flex items-center gap-1.5 ${milestoneMsg ? 'border border-primary/30' : ''}`}>
                <span>{getCompanionMoodEmoji(companionMood)}</span>
                <p className="text-xs text-foreground">{milestoneMsg || cheerMessage}</p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* Stats display */}
        <div className="glass-card p-6 mb-4">
          {runState === 'idle' ? (
            <div className="text-center py-4">
              {/* Companion card */}
              {leaderSpecies ? (
                <div className="mb-4 flex justify-center">
                  <motion.img src={leaderSpecies.spriteUrl} alt={leaderSpecies.name} className="w-32 h-32 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} />
                </div>
              ) : (
                <div className="mb-4"><PetSprite stage={pet.stage} hp={100} maxHp={100} happiness={5} streak={0} /></div>
              )}
              <p className="text-lg font-semibold text-foreground mb-1">
                {getBondMoodEmoji(bond.mood)} {leaderSpecies?.name || '포켓몬'}와 함께 달려볼까?
              </p>
              <p className="text-sm text-muted-foreground mb-4">걸음수로 컨디션을 올리고 포켓몬을 성장시키세요</p>

              {/* Today steps + streak */}
              <div className="flex items-center justify-center gap-4 text-sm">
                {getTodaySteps() > 0 && (
                  <span className="text-muted-foreground">오늘 {getTodaySteps().toLocaleString()}보</span>
                )}
                {streak.currentStreak > 0 && (
                  <span className="text-primary font-bold">🔥 {streak.currentStreak}일 연속</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Steps — MAIN display */}
              <div className="text-center">
                <motion.p key={Math.floor(steps / 10)} initial={{ scale: 1.02 }} animate={{ scale: 1 }} className="text-5xl font-bold text-primary tabular-nums">
                  {steps.toLocaleString()}
                </motion.p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Footprints size={14} /> 걸음 {getCompanionMoodEmoji(companionMood)}
                </p>
              </div>

              {/* Goal progress removed - auto multiplier system */}

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
                <p className="text-[10px] text-muted-foreground text-center">⚠️ 만보기 미지원 — GPS 모드</p>
              )}
            </div>
          )}
        </div>

        {/* Catch Quest Banners */}
        {runState !== 'idle' && <CatchQuestBanner quests={activeQuests.filter(q => !q.quest.completed)} />}

        <AnimatePresence>
          {legendaryEncounter && runState !== 'idle' && (
            <LegendaryBanner encounter={legendaryEncounter} progress={legendaryMissionProgress} caught={legendaryCaught} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {npcEncounter && runState !== 'idle' && (
            <NpcEncounterBanner npc={npcEncounter} onBattle={handleBattleNpc} onDecline={() => { setNpcEncounter(null); toast('트레이너가 떠나갔다...'); }} />
          )}
        </AnimatePresence>

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

        {/* Idle sections */}
        {runState === 'idle' && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 glass-card p-4">
              <p className="text-xs text-muted-foreground mb-2">💡 걸음수 보상</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>👟 1000보 = EXP 100 + 코인 5</p>
                <p>💚 컨디션 회복: 100보당 +1 (하루 최대 +50)</p>
                <p>💕 친밀도: 500보당 +5 (하루 최대 +100)</p>
                <p>⚡ 페이스/스트릭 보너스 별도 적용</p>
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
