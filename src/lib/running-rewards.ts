// ═══════════════════════════════════════════════════════════
// 러닝 보상 체계 — 걸음수 기반 (v4)
// berries/food 제거 → conditionRecovery + friendshipGain
// ═══════════════════════════════════════════════════════════

import type { ValidationResult } from './activity-validator';
import { getRunningStreak } from './running-streak';

export interface RunRewards {
  exp: number;
  coins: number;
  conditionRecovery: number;
  friendshipGain: number;
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

  // 컨디션 회복: +1 per 100 steps (최대 50)
  const conditionRecovery = Math.min(50, Math.floor(steps / 100));

  // 친밀도 획득: 500보당 +5 (최대 100)
  const friendshipGain = Math.min(100, Math.floor(steps / 500) * 5);

  return {
    exp: Math.floor(steps * 0.1 * totalBonus),
    coins: Math.floor(steps * 0.005 * totalBonus),
    conditionRecovery,
    friendshipGain,
    bonusMultiplier: totalBonus,
    paceBonus,
    streakBonus,
  };
}
