// ═══════════════════════════════════════════════════════════
// 전설의 포켓몬 — 챌린지 기반 스토리 해금 + 포획 미션
// ═══════════════════════════════════════════════════════════

import { getOwnedSpeciesIds } from './collection';
import { isChallengeCompleted, areAllChallengesCompleted } from './challenge';
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
  /** 해금에 필요한 챌린지 ID 목록 */
  requiredChallenges: string[];
  /** 조우 시 스토리 메시지 */
  storyIntro: string;
  /** 포획 시 스토리 메시지 */
  storyOutro: string;
  /** 자동 포획 여부 (뮤) */
  autoCatch?: boolean;
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

// ─── Legendary Definitions ──────────────────────────────

export const LEGENDARY_DEFS: LegendaryDefinition[] = [
  {
    speciesId: 144, // Articuno
    name: '프리져',
    emoji: '🧊',
    encounterCondition: 'SP1(얼리버드) + S2(7일 연속) 챌린지 완료',
    encounterHint: '새벽의 차가운 공기 속에서 꾸준히 달리는 자에게 얼음새가 나타난다...',
    requiredChallenges: ['SP1', 'S2'],
    storyIntro: '새벽 안개 속에서 차가운 기운이 감돈다... 프리져가 당신의 인내를 시험하러 나타났다!',
    storyOutro: '프리져가 당신의 꾸준한 새벽 러닝에 감복하여 동료가 되었습니다! ❄️',
    mission: {
      type: 'distance',
      label: '인내의 시련',
      description: '한 세션에서 5km 완주',
      requirements: [
        { type: 'distance', targetValue: 5, unit: 'km' },
      ],
    },
  },
  {
    speciesId: 145, // Zapdos
    name: '썬더',
    emoji: '⚡',
    encounterCondition: 'SP3(스피드스터) + D3(5km 러너) 챌린지 완료',
    encounterHint: '빠른 발걸음에 번개가 이끌리듯... 스피드와 거리를 정복한 자만이...',
    requiredChallenges: ['SP3', 'D3'],
    storyIntro: '하늘에서 번개가 내리치며 썬더가 나타났다! 당신의 속도를 증명하라!',
    storyOutro: '번개처럼 빠른 당신의 러닝에 썬더가 인정하며 동료가 되었습니다! ⚡',
    mission: {
      type: 'combo',
      label: '번개의 속도',
      description: '3km + 페이스 4:30/km 이하',
      requirements: [
        { type: 'distance', targetValue: 3, unit: 'km' },
        { type: 'pace', targetValue: 4.5, unit: '분/km' },
      ],
    },
  },
  {
    speciesId: 146, // Moltres
    name: '파이어',
    emoji: '🔥',
    encounterCondition: 'S4(30일 연속) + D4(10km 정복) 챌린지 완료',
    encounterHint: '30일간 타오르는 의지와 10km의 거리를 넘은 자에게 불꽃이...',
    requiredChallenges: ['S4', 'D4'],
    storyIntro: '하늘이 붉게 물들며 파이어가 강림했다! 당신의 불꽃 같은 의지를 보여줘!',
    storyOutro: '끝까지 포기하지 않는 당신의 의지에 파이어가 동료가 되었습니다! 🔥',
    mission: {
      type: 'distance',
      label: '불꽃의 의지',
      description: '한 세션에서 10km 완주',
      requirements: [
        { type: 'distance', targetValue: 10, unit: 'km' },
      ],
    },
  },
  {
    speciesId: 151, // Mew
    name: '뮤',
    emoji: '✨',
    encounterCondition: '전 챌린지 100% 달성',
    encounterHint: '모든 도전을 완수한 진정한 마스터에게만 환상의 포켓몬이 모습을 드러낸다...',
    requiredChallenges: [], // Special: all challenges
    storyIntro: '공기가 반짝이며 신비로운 기운이 감싼다... 뮤가 당신 앞에 모습을 드러냈다!',
    storyOutro: '뮤가 당신을 진정한 포켓몬 마스터로 인정하며 스스로 동료가 되었습니다! ✨',
    autoCatch: true,
    mission: {
      type: 'distance',
      label: '자동 합류',
      description: '배틀 없이 합류',
      requirements: [
        { type: 'distance', targetValue: 0.1, unit: 'km' },
      ],
    },
  },
  {
    speciesId: 150, // Mewtwo
    name: '뮤츠',
    emoji: '🔮',
    encounterCondition: '뮤 보유 + T4(500km) 완료 + 유전자 촉매 사용',
    encounterHint: '뮤의 유전자에서 태어난 최강의 포켓몬... 유전자 촉매가 열쇠가 된다...',
    requiredChallenges: ['T4'], // + Mew owned + gene_catalyst checked separately
    storyIntro: '유전자 촉매가 빛나며 공간이 일그러진다... 뮤츠가 당신의 힘을 시험하러 나타났다!',
    storyOutro: '뮤츠가 당신의 끝없는 도전 정신을 인정하며 동료가 되었습니다! 🔮',
    mission: {
      type: 'distance',
      label: '초월의 시련',
      description: '한 세션에서 10km 완주',
      requirements: [
        { type: 'distance', targetValue: 10, unit: 'km' },
      ],
    },
  },
];

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'routinmon-legendary';

interface LegendaryState {
  caught: number[];
  encounters: number;
  lastEncounterDate: string | null;
  weeklyGoalStreakCount?: number; // legacy compat
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
    return parsed;
  }
  return { caught: [], encounters: 0, lastEncounterDate: null };
}

function saveLegendaryState(state: LegendaryState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (isCloudReady()) {
    setCachedLegendaryState({ ...state, weeklyGoalStreakCount: state.weeklyGoalStreakCount ?? 0 });
  }
}

// ─── Encounter Condition Checks ─────────────────────────

/** 인벤토리에 유전자 촉매가 있는지 확인 */
function hasGeneCatalyst(): boolean {
  try {
    const inv = localStorage.getItem('routinmon-inventory');
    if (!inv) return false;
    const items = JSON.parse(inv);
    if (Array.isArray(items)) {
      return items.some((it: any) => it.id === 'gene_catalyst' && it.quantity > 0);
    }
    return false;
  } catch { return false; }
}

export function checkLegendaryEncounterConditions(): LegendaryDefinition[] {
  const ownedIds = getOwnedSpeciesIds();
  const state = getLegendaryState();
  const available: LegendaryDefinition[] = [];

  for (const def of LEGENDARY_DEFS) {
    if (state.caught.includes(def.speciesId) || ownedIds.has(def.speciesId)) continue;

    let conditionMet = false;

    switch (def.speciesId) {
      case 144: // Articuno — SP1 + S2
      case 145: // Zapdos — SP3 + D3
      case 146: // Moltres — S4 + D4
        conditionMet = def.requiredChallenges.every(id => isChallengeCompleted(id));
        break;
      case 151: // Mew — all challenges 100%
        conditionMet = areAllChallengesCompleted();
        break;
      case 150: // Mewtwo — Mew owned + T4 + gene catalyst
        conditionMet = ownedIds.has(151) &&
          isChallengeCompleted('T4') &&
          hasGeneCatalyst();
        break;
    }

    if (conditionMet) available.push(def);
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

// ─── Info helpers ───────────────────────────────────────

export function getAllLegendaryDefs(): (LegendaryDefinition & { caught: boolean })[] {
  const state = getLegendaryState();
  const ownedIds = getOwnedSpeciesIds();
  return LEGENDARY_DEFS.map(d => ({
    ...d,
    caught: state.caught.includes(d.speciesId) || ownedIds.has(d.speciesId),
  }));
}

export function getLegendaryCaughtCount(): number {
  return getLegendaryState().caught.length;
}

export function resetLegendaryState() {
  localStorage.removeItem(STORAGE_KEY);
}
