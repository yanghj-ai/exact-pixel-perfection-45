// ═══════════════════════════════════════════════════════════
// FIX #3: 자동 배율 계산 시스템 — v8 constants 연동
// ═══════════════════════════════════════════════════════════

import { DISTANCE_MULTIPLIER_TIERS, getStreakBonusV8 } from './constants';

export interface AutoMultiplier {
  exp: number;
  coin: number;
  label: string;
  emoji: string;
}

/** 거리 + 스트릭 기반 자동 배율 계산 */
export function calculateAutoMultiplier(distanceKm: number, streakDays: number): AutoMultiplier {
  let baseMult = 1.0;
  let label = '기본';
  let emoji = '🏃';

  for (const tier of DISTANCE_MULTIPLIER_TIERS) {
    if (distanceKm >= tier.km) {
      baseMult = tier.mult;
      label = tier.label;
      emoji = tier.emoji;
      break;
    }
  }

  // v8 가산형 스트릭
  const { expAdd, coinAdd } = getStreakBonusV8(streakDays);
  const avgAdd = (expAdd + coinAdd) / 2;

  return {
    exp: baseMult + expAdd,
    coin: baseMult + coinAdd,
    label: avgAdd > 0 ? `${label} + 스트릭 보너스` : label,
    emoji,
  };
}

/** 현재 거리 기준 다음 배율 tier 정보 */
export function getNextTier(distanceKm: number): { km: number; mult: number; label: string } | null {
  const reversed = [...DISTANCE_MULTIPLIER_TIERS].reverse();
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
  for (const tier of DISTANCE_MULTIPLIER_TIERS) {
    if (currentDistanceKm >= tier.km && !shownMilestones.has(tier.km)) {
      shownMilestones.add(tier.km);
      return tier;
    }
  }
  return null;
}
