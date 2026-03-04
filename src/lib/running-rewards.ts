// ═══════════════════════════════════════════════════════════
// 러닝 보상 체계 — 걸음수 기반
// 모든 보상은 걸음수 기준. GPS 거리로 보상 계산 금지.
// ═══════════════════════════════════════════════════════════

import type { ValidationResult } from './activity-validator';
import { getRunningStreak } from './running-streak';

export interface RunRewards {
  exp: number;
  coins: number;
  berries: number;       // 먹이 (food)
  friendship: number;
  bonusMultiplier: number;
  paceBonus: number;
  streakBonus: number;
}

export function calculateRunRewards(
  steps: number,
  paceMinPerKm: number | null,
  validationResult: ValidationResult,
): RunRewards {
  const mult = validationResult.rewardMultiplier;
  const streakDays = getRunningStreak().currentStreak;

  // 페이스 보너스 (GPS 있을 때만)
  let paceBonus = 1.0;
  if (paceMinPerKm !== null) {
    if (paceMinPerKm <= 5) paceBonus = 1.5;
    else if (paceMinPerKm <= 6) paceBonus = 1.3;
    else if (paceMinPerKm <= 7) paceBonus = 1.1;
  }

  // 스트릭 보너스 (최대 2.0배)
  const streakBonus = Math.min(2.0, 1.0 + streakDays * 0.1);

  const totalBonus = paceBonus * streakBonus * mult;

  return {
    exp: Math.floor(steps * 0.1 * totalBonus),
    coins: Math.floor(steps * 0.005 * totalBonus),
    berries: Math.min(20, Math.floor(steps / 500)),
    friendship: Math.floor(steps * 0.02),
    bonusMultiplier: totalBonus,
    paceBonus,
    streakBonus,
  };
}
