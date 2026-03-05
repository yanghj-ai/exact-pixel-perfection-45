// ═══════════════════════════════════════════════════════════
// ROUTINMON v8: 전체 게임 상수 확정
// 모든 매직 넘버를 이 파일에서 중앙 관리
// ═══════════════════════════════════════════════════════════

// ─── 파티/보관 ────────────────────────────────────────────
export const MAX_PARTY_SIZE = 6;
export const MAX_BOX_SIZE = 30;
export const TOTAL_SPECIES = 151;
export const MAX_LEVEL = 100;

// ─── 스킬 ────────────────────────────────────────────────
export const MAX_SKILL_SLOTS = 4;
export const MAX_SKILL_LEVEL = 5;

// ─── 컨디션 (v9: 친밀도 제거, 컨디션 단일 통합) ──────────
export const CONDITION_MAX = 100;
export const CONDITION_DAILY_DECAY = 10;

// ─── 동반 포켓몬 ─────────────────────────────────────────
export const COMPANION_EXP_MULTIPLIER = 1.5;

// ─── 크리티컬 ────────────────────────────────────────────
export const CRIT_BASE_RATE = 0.0625; // 6.25% (1/16)
export const CRIT_DAMAGE = 1.5;

// ─── 보상 기본 단가 (걸음수 기반, v3) ──────────────────────
export const EXP_PER_STEP = 0.1;
export const COIN_PER_STEP = 0.005;
export const CONDITION_STEPS_PER_POINT = 100; // 100보당 +1
export const CONDITION_DAILY_MAX_RECOVERY = 50;

// ─── 거리 배율 (v8 확정) ──────────────────────────────────
export const DISTANCE_MULTIPLIER_TIERS = [
  { km: 10, mult: 2.0, label: '10km 달성!', emoji: '🏆' },
  { km: 5, mult: 1.5, label: '5km 달성!', emoji: '🔥' },
  { km: 3, mult: 1.3, label: '3km 달성!', emoji: '⚡' },
  { km: 1, mult: 1.1, label: '1km 달성!', emoji: '👟' },
] as const;

// ─── 스트릭 보너스 (v8 가산형 4단계) ──────────────────────
export const STREAK_BONUS_TIERS = [
  { days: 30, expAdd: 0.5, coinAdd: 0.25 },
  { days: 14, expAdd: 0.3, coinAdd: 0.15 },
  { days: 7, expAdd: 0.2, coinAdd: 0.1 },
  { days: 3, expAdd: 0.1, coinAdd: 0.05 },
] as const;

export function getStreakBonusV8(streakDays: number): { expAdd: number; coinAdd: number } {
  for (const tier of STREAK_BONUS_TIERS) {
    if (streakDays >= tier.days) return { expAdd: tier.expAdd, coinAdd: tier.coinAdd };
  }
  return { expAdd: 0, coinAdd: 0 };
}

export function getDistanceMultiplier(distanceKm: number): number {
  for (const tier of DISTANCE_MULTIPLIER_TIERS) {
    if (distanceKm >= tier.km) return tier.mult;
  }
  return 1.0;
}

// ─── 조우 시스템 (v8 확정, H6) ────────────────────────────
export const ENCOUNTER_CHECK_INTERVAL_KM = 0.5;
export const ENCOUNTER_COOLDOWN_SEC = 30;
export const MAX_ENCOUNTERS_PER_RUN = 5;
export const ENCOUNTER_WEIGHT_NORMAL = 0.6;
export const ENCOUNTER_WEIGHT_RARE = 0.3;
export const ENCOUNTER_WEIGHT_UNIQUE = 0.1;
// 전설은 0% (스토리 미션 전용)

// ─── 칼로리 (v3, 표시 전용) ──────────────────────────────
export const CALORIES_PER_STEP = 0.04;

// ─── 컨디션 → 배틀 보정 (v8 FIX #5) ─────────────────────
export const CONDITION_BATTLE_MODIFIERS = {
  exhausted: { statMult: 0.80, critBonus: -0.03 },
  tired:     { statMult: 0.90, critBonus: 0 },
  normal:    { statMult: 1.00, critBonus: 0 },
  good:      { statMult: 1.05, critBonus: 0.02 },
  perfect:   { statMult: 1.10, critBonus: 0.05 },
} as const;

// ─── 컨디션 → 배틀 EXP 보너스 (v9: 친밀도 통합) ──────────
export const CONDITION_BATTLE_EXP_THRESHOLD = 80;
export const CONDITION_BATTLE_EXP_MULTIPLIER = 1.1;

// ─── 진화 유형 ───────────────────────────────────────────
export type EvolutionType = 'level' | 'stone' | 'condition' | 'story';

export interface EvolutionCondition {
  level?: number;
  item?: string;
  condition?: number; // v9: 컨디션 80+ 유지 조건
  storyMission?: string;
}

export interface EvolutionInfo {
  targetId: number;
  type: EvolutionType;
  condition: EvolutionCondition;
}

// ─── 러닝 동반 애니메이션 상태 ─────────────────────────────
export type CompanionAnimState = 'idle' | 'walk' | 'run' | 'sprint' | 'cheer' | 'encounter' | 'tired';

export const RUNNING_MILESTONES = [1, 3, 5, 10] as const;

export function isAtMilestone(dist: number): boolean {
  return RUNNING_MILESTONES.some(m => dist >= m && dist < m + 0.05);
}
