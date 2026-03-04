// ═══════════════════════════════════════════════════════════
// 전설의 포켓몬 — 거리/챌린지 기반 조우 + 포획 미션
// ═══════════════════════════════════════════════════════════

import { getRunningStats, type Challenge } from './running';
import { getOwnedSpeciesIds, getCollectionStats } from './collection';
import { getProfile } from './storage';
import { getCachedLegendaryState, setCachedLegendaryState, isCloudReady } from './cloud-storage';

// ─── Types ───────────────────────────────────────────────

export type MissionType = 'pace' | 'distance' | 'time' | 'combo';

export interface CatchMission {
  type: MissionType;
  label: string;
  description: string;
  requirements: { type: 'distance' | 'pace' | 'time'; targetValue: number; unit: string }[];
}

export interface LegendaryDefinition {
  speciesId: number;
  name: string;
  emoji: string;
  encounterCondition: string;
  encounterHint: string;
  mission: CatchMission;
}

export interface LegendaryEncounter {
  definition: LegendaryDefinition;
  mission: CatchMission;
  startedAt: number;
  missionActive: boolean;
}

export interface LegendaryEncounterResult {
  success: boolean;
  speciesId: number;
}

// ─── Special Event Types ─────────────────────────────────

export interface SpecialEvent {
  id: string;
  speciesId: number;
  name: string;
  emoji: string;
  condition: 'streak' | 'weekly_goal_streak' | 'session_count' | 'pokedex_count';
  targetValue: number;
  description: string;
  hint: string;
}

// ─── Legendary Definitions ──────────────────────────────

export const LEGENDARY_DEFS: LegendaryDefinition[] = [
  {
    speciesId: 144, // Articuno
    name: '프리져',
    emoji: '🧊',
    encounterCondition: '총 누적 50km 달성',
    encounterHint: '더 많이 달리면 얼음새의 기운이 느껴질지도...',
    mission: {
      type: 'combo',
      label: '인내의 시련',
      description: '한 세션에서 3km 달리기 + 15분 이상 유지',
      requirements: [
        { type: 'distance', targetValue: 3, unit: 'km' },
        { type: 'time', targetValue: 15, unit: '분' },
      ],
    },
  },
  {
    speciesId: 145, // Zapdos
    name: '썬더',
    emoji: '⚡',
    encounterCondition: '총 누적 100km 달성',
    encounterHint: '번개의 새는 빠른 러너에게 나타난다고 한다...',
    mission: {
      type: 'combo',
      label: '번개의 속도',
      description: '한 세션에서 2km + 6분/km 이하 페이스',
      requirements: [
        { type: 'distance', targetValue: 2, unit: 'km' },
        { type: 'pace', targetValue: 6, unit: '분/km' },
      ],
    },
  },
  {
    speciesId: 146, // Moltres
    name: '파이어',
    emoji: '🔥',
    encounterCondition: '총 누적 150km 달성',
    encounterHint: '불꽃의 새는 인내심 있는 러너를 시험한다...',
    mission: {
      type: 'distance',
      label: '불꽃의 의지',
      description: '한 세션에서 5km 완주',
      requirements: [
        { type: 'distance', targetValue: 5, unit: 'km' },
      ],
    },
  },
  {
    speciesId: 150, // Mewtwo
    name: '뮤츠',
    emoji: '🔮',
    encounterCondition: '모든 챌린지 완료',
    encounterHint: '모든 도전을 정복한 자만이 만날 수 있다...',
    mission: {
      type: 'combo',
      label: '초월의 시련',
      description: '한 세션 10km 또는 5분/km 이하로 5km',
      requirements: [
        { type: 'distance', targetValue: 10, unit: 'km' },
      ],
    },
  },
  {
    speciesId: 151, // Mew
    name: '뮤',
    emoji: '✨',
    encounterCondition: '총 누적 1500km 달성',
    encounterHint: '전설 속의 환상 포켓몬... 끝없는 여정 끝에 만날 수 있을까?',
    mission: {
      type: 'distance',
      label: '신비의 탐색',
      description: '한 세션에서 3km 달리기',
      requirements: [
        { type: 'distance', targetValue: 3, unit: 'km' },
      ],
    },
  },
];

// ─── Special Events ─────────────────────────────────────

export const SPECIAL_EVENTS: SpecialEvent[] = [
  {
    id: 'eevee_streak',
    speciesId: 133, // Eevee
    name: '이브이',
    emoji: '🦊',
    condition: 'streak',
    targetValue: 7,
    description: '연속 출석 7일 달성 시 이브이와 조우!',
    hint: '매일 꾸준히 접속하면 특별한 포켓몬을 만날 수 있다...',
  },
  {
    id: 'lapras_weekly',
    speciesId: 131, // Lapras
    name: '라프라스',
    emoji: '🐋',
    condition: 'weekly_goal_streak',
    targetValue: 3,
    description: '주간 목표 3주 연속 달성 시 라프라스와 조우!',
    hint: '꾸준한 주간 목표 달성이 바다의 전설을 불러온다...',
  },
  {
    id: 'snorlax_sessions',
    speciesId: 143, // Snorlax
    name: '잠만보',
    emoji: '😴',
    condition: 'session_count',
    targetValue: 50,
    description: '총 50회 런닝 세션 달성 시 잠만보와 조우!',
    hint: '수많은 런닝을 하다 보면 길을 막고 있는 녀석을 만날지도...',
  },
  {
    id: 'ditto_pokedex',
    speciesId: 132, // Ditto
    name: '메타몽',
    emoji: '🟣',
    condition: 'pokedex_count',
    targetValue: 50,
    description: '도감 50종 이상 등록 시 메타몽과 조우!',
    hint: '많은 포켓몬을 모은 트레이너 앞에 변신의 달인이 나타난다...',
  },
];

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'routinmon-legendary';

interface LegendaryState {
  caught: number[]; // speciesIds that were caught
  encounters: number;
  lastEncounterDate: string | null;
  weeklyGoalStreakCount: number; // for Lapras event tracking
}

function getLegendaryState(): LegendaryState {
  if (isCloudReady()) {
    const cached = getCachedLegendaryState();
    if (cached) return { weeklyGoalStreakCount: 0, ...cached };
  }
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    if (parsed.caught && parsed.caught.length > 0 && typeof parsed.caught[0] === 'string') {
      parsed.caught = [];
    }
    return { weeklyGoalStreakCount: 0, ...parsed };
  }
  return { caught: [], encounters: 0, lastEncounterDate: null, weeklyGoalStreakCount: 0 };
}

function saveLegendaryState(state: LegendaryState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (isCloudReady()) {
    setCachedLegendaryState(state);
  }
}

// ─── Encounter Condition Checks ─────────────────────────

export function checkLegendaryEncounterConditions(): LegendaryDefinition[] {
  const stats = getRunningStats();
  const ownedIds = getOwnedSpeciesIds();
  const state = getLegendaryState();
  const available: LegendaryDefinition[] = [];

  for (const def of LEGENDARY_DEFS) {
    // Already caught
    if (state.caught.includes(def.speciesId) || ownedIds.has(def.speciesId)) continue;

    let conditionMet = false;
    switch (def.speciesId) {
      case 144: // Articuno — 50km total
        conditionMet = stats.totalDistanceKm >= 50;
        break;
      case 145: // Zapdos — 100km total
        conditionMet = stats.totalDistanceKm >= 100;
        break;
      case 146: // Moltres — 150km total
        conditionMet = stats.totalDistanceKm >= 150;
        break;
      case 150: // Mewtwo — all challenges completed
        conditionMet = stats.challenges.length > 0 && stats.challenges.every(c => c.completed);
        break;
      case 151: // Mew — 1500km total
        conditionMet = stats.totalDistanceKm >= 1500;
        break;
    }

    if (conditionMet) available.push(def);
  }

  return available;
}

export function checkSpecialEventConditions(): SpecialEvent[] {
  const stats = getRunningStats();
  const ownedIds = getOwnedSpeciesIds();
  const state = getLegendaryState();
  const profile = getProfile();
  const collectionStats = getCollectionStats();
  const available: SpecialEvent[] = [];

  for (const event of SPECIAL_EVENTS) {
    if (state.caught.includes(event.speciesId) || ownedIds.has(event.speciesId)) continue;

    let conditionMet = false;
    switch (event.condition) {
      case 'streak':
        conditionMet = (profile.consecutiveLoginDays || 0) >= event.targetValue;
        break;
      case 'weekly_goal_streak':
        conditionMet = (state.weeklyGoalStreakCount || 0) >= event.targetValue;
        break;
      case 'session_count':
        conditionMet = stats.totalSessions >= event.targetValue;
        break;
      case 'pokedex_count':
        conditionMet = collectionStats.uniqueSpecies >= event.targetValue;
        break;
    }

    if (conditionMet) available.push(event);
  }

  return available;
}

// ─── Mission Progress ───────────────────────────────────

export function checkMissionComplete(
  mission: CatchMission,
  distanceKm: number,
  elapsedSeconds: number,
  paceMinPerKm: number,
): boolean {
  // For Mewtwo special: 10km OR (5km + pace ≤ 5)
  if (mission.requirements.length === 1 && mission.label === '초월의 시련') {
    const dist = distanceKm >= 10;
    const combo = distanceKm >= 5 && paceMinPerKm > 0 && paceMinPerKm <= 5;
    return dist || combo;
  }

  return mission.requirements.every(req => {
    switch (req.type) {
      case 'distance':
        return distanceKm >= req.targetValue;
      case 'time':
        return (elapsedSeconds / 60) >= req.targetValue;
      case 'pace':
        return distanceKm >= 1 && paceMinPerKm > 0 && paceMinPerKm <= req.targetValue;
      default:
        return false;
    }
  });
}

export function getMissionProgress(
  mission: CatchMission,
  distanceKm: number,
  elapsedSeconds: number,
  paceMinPerKm: number,
): number {
  if (mission.requirements.length === 0) return 0;

  const progresses = mission.requirements.map(req => {
    switch (req.type) {
      case 'distance':
        return Math.min(100, (distanceKm / req.targetValue) * 100);
      case 'time':
        return Math.min(100, ((elapsedSeconds / 60) / req.targetValue) * 100);
      case 'pace':
        if (distanceKm < 1 || paceMinPerKm <= 0) return 0;
        return paceMinPerKm <= req.targetValue ? 100 : Math.max(0, (1 - (paceMinPerKm - req.targetValue) / req.targetValue) * 100);
      default:
        return 0;
    }
  });

  return Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
}

// ─── Record ─────────────────────────────────────────────

export function recordLegendaryCatch(speciesId: number): void {
  const state = getLegendaryState();
  if (!state.caught.includes(speciesId)) {
    state.caught.push(speciesId);
  }
  state.encounters++;
  state.lastEncounterDate = new Date().toISOString().split('T')[0];
  saveLegendaryState(state);
}

export function recordSpecialEventCatch(speciesId: number): void {
  recordLegendaryCatch(speciesId); // Same storage
}

export function incrementWeeklyGoalStreak(): void {
  const state = getLegendaryState();
  state.weeklyGoalStreakCount = (state.weeklyGoalStreakCount || 0) + 1;
  saveLegendaryState(state);
}

export function resetWeeklyGoalStreak(): void {
  const state = getLegendaryState();
  state.weeklyGoalStreakCount = 0;
  saveLegendaryState(state);
}

// ─── Info helpers ───────────────────────────────────────

export function getAllLegendaryDefs(): (LegendaryDefinition & { caught: boolean })[] {
  const state = getLegendaryState();
  const ownedIds = getOwnedSpeciesIds();
  return LEGENDARY_DEFS.map(d => ({
    ...d,
    caught: state.caught.includes(d.speciesId) || ownedIds.has(d.speciesId),
  }));
}

export function getAllSpecialEvents(): (SpecialEvent & { caught: boolean })[] {
  const state = getLegendaryState();
  const ownedIds = getOwnedSpeciesIds();
  return SPECIAL_EVENTS.map(e => ({
    ...e,
    caught: state.caught.includes(e.speciesId) || ownedIds.has(e.speciesId),
  }));
}

export function getLegendaryCaughtCount(): number {
  return getLegendaryState().caught.length;
}

export function resetLegendaryState() {
  localStorage.removeItem(STORAGE_KEY);
}
