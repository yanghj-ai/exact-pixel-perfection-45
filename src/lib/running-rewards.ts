// ═══════════════════════════════════════════════════════════
// FIX #2: 러닝 보상 체계 — v8 통합 공식
// 최종: (걸음수 × 단가) × (거리배율 + 스트릭가산) × 동반배율
// 컨디션/친밀도는 걸음수 직접 계산
// ═══════════════════════════════════════════════════════════

import type { ValidationResult } from './activity-validator';
import { getRunningStreak } from './running-streak';
import {
  EXP_PER_STEP, COIN_PER_STEP,
  CONDITION_STEPS_PER_POINT, CONDITION_DAILY_MAX_RECOVERY,
  INTIMACY_STEPS_PER_GAIN, INTIMACY_GAIN_PER_INTERVAL, INTIMACY_DAILY_MAX,
  COMPANION_EXP_MULTIPLIER,
  getDistanceMultiplier, getStreakBonusV8,
} from './constants';

export interface RunRewards {
  exp: number;
  coins: number;
  conditionRecovery: number;
  friendshipGain: number;
  bonusMultiplier: number;
  paceBonus: number;
  streakBonus: number;
  distanceMultiplier: number;
  streakExpAdd: number;
  streakCoinAdd: number;
}

export function calculateRunRewards(
  steps: number,
  paceMinPerKm: number | null,
  validationResult: ValidationResult,
  distanceKm: number = 0,
  isCompanion: boolean = false,
): RunRewards {
  const mult = validationResult.rewardMultiplier;
  const streakDays = getRunningStreak().currentStreak;

  // 1. 기본 보상 (걸음수 기반, v3)
  const baseExp = steps * EXP_PER_STEP;
  const baseCoin = steps * COIN_PER_STEP;

  // 2. 거리 배율 (v8)
  const distMul = getDistanceMultiplier(distanceKm);

  // 3. 스트릭 가산 (v8 4단계)
  const { expAdd: streakExpAdd, coinAdd: streakCoinAdd } = getStreakBonusV8(streakDays);

  // 4. 동반 배율 (v5, 러닝 전용)
  const companionMul = isCompanion ? COMPANION_EXP_MULTIPLIER : 1.0;

  // 5. 최종 계산: (기본 × 단가) × (거리배율 + 스트릭가산) × 동반배율 × 검증배율
  const finalExp = Math.floor(baseExp * (distMul + streakExpAdd) * companionMul * mult);
  const finalCoin = Math.floor(baseCoin * (distMul + streakCoinAdd) * mult);

  // 6. 컨디션/친밀도 (걸음수 직접, 배율 미적용)
  const conditionRecovery = Math.min(
    CONDITION_DAILY_MAX_RECOVERY,
    Math.floor(steps / CONDITION_STEPS_PER_POINT)
  );
  const friendshipGain = Math.min(
    INTIMACY_DAILY_MAX,
    Math.floor(steps / INTIMACY_STEPS_PER_GAIN) * INTIMACY_GAIN_PER_INTERVAL
  );

  // Legacy compat fields
  const paceBonus = 1.0; // removed in v8 (merged into distance multiplier)
  const streakBonus = distMul + streakExpAdd;
  const bonusMultiplier = (distMul + streakExpAdd) * companionMul * mult;

  return {
    exp: finalExp,
    coins: finalCoin,
    conditionRecovery,
    friendshipGain,
    bonusMultiplier,
    paceBonus,
    streakBonus,
    distanceMultiplier: distMul,
    streakExpAdd,
    streakCoinAdd,
  };
}
