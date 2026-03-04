// ═══════════════════════════════════════════════════════════
// FIX #3: 자동 배율 계산 시스템
// 거리/스트릭 기반 보상 배율 자동 적용
// ═══════════════════════════════════════════════════════════

export interface AutoMultiplier {
  exp: number;
  coin: number;
  label: string;
  emoji: string;
}

const DISTANCE_TIERS = [
  { km: 10, mult: 2.0, label: '10km 달성!', emoji: '🏆' },
  { km: 5, mult: 1.5, label: '5km 달성!', emoji: '🔥' },
  { km: 3, mult: 1.3, label: '3km 달성!', emoji: '⚡' },
  { km: 1, mult: 1.1, label: '1km 달성!', emoji: '👟' },
];

/** 거리 + 스트릭 기반 자동 배율 계산 */
export function calculateAutoMultiplier(distanceKm: number, streakDays: number): AutoMultiplier {
  let baseMult = 1.0;
  let label = '기본';
  let emoji = '🏃';

  for (const tier of DISTANCE_TIERS) {
    if (distanceKm >= tier.km) {
      baseMult = tier.mult;
      label = tier.label;
      emoji = tier.emoji;
      break;
    }
  }

  // 연속 3일 이상 보너스
  const streakBonus = streakDays >= 7 ? 0.3 : streakDays >= 3 ? 0.15 : 0;

  return {
    exp: baseMult + streakBonus,
    coin: baseMult + streakBonus,
    label: streakBonus > 0 ? `${label} + 스트릭 보너스` : label,
    emoji,
  };
}

/** 현재 거리 기준 다음 배율 tier 정보 */
export function getNextTier(distanceKm: number): { km: number; mult: number; label: string } | null {
  const reversed = [...DISTANCE_TIERS].reverse();
  for (const tier of reversed) {
    if (distanceKm < tier.km) {
      return { km: tier.km, mult: tier.mult, label: tier.label };
    }
  }
  return null;
}

/** 배율 달성 체크 (toast 트리거용) */
export function checkMultiplierMilestone(
  currentDistanceKm: number,
  shownMilestones: Set<number>
): { km: number; mult: number; label: string; emoji: string } | null {
  for (const tier of DISTANCE_TIERS) {
    if (currentDistanceKm >= tier.km && !shownMilestones.has(tier.km)) {
      shownMilestones.add(tier.km);
      return tier;
    }
  }
  return null;
}
