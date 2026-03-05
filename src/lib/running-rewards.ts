// ═══════════════════════════════════════════════════════════
// v9: 러닝 보상 체계 — 친밀도 제거, 컨디션 단일 통합
// 최종: (걸음수 × 단가) × (거리배율 + 스트릭가산) × 동반배율
// ═══════════════════════════════════════════════════════════

import type { ValidationResult } from './activity-validator';
import { getRunningStreak } from './running-streak';
import {
  EXP_PER_STEP, COIN_PER_STEP,
  CONDITION_STEPS_PER_POINT, CONDITION_DAILY_MAX_RECOVERY,
  COMPANION_EXP_MULTIPLIER,
  getDistanceMultiplier, getStreakBonusV8,
} from './constants';

export interface RunRewards {
  exp: number;
  coins: number;
  conditionRecovery: number;
  friendshipGain: number; // v9: always 0, kept for compat
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
  // FIX #2: 0 걸음이면 보상 0 보장
  if (steps <= 0 || distanceKm < 0.1) {
    return {
      exp: 0, coins: 0, conditionRecovery: 0, friendshipGain: 0,
      bonusMultiplier: 1, paceBonus: 1, streakBonus: 1,
      distanceMultiplier: 1, streakExpAdd: 0, streakCoinAdd: 0,
    };
  }

  const mult = validationResult.rewardMultiplier;
  const streakDays = getRunningStreak().currentStreak;

  const baseExp = steps * EXP_PER_STEP;
  const baseCoin = steps * COIN_PER_STEP;
  const distMul = getDistanceMultiplier(distanceKm);
  const { expAdd: streakExpAdd, coinAdd: streakCoinAdd } = getStreakBonusV8(streakDays);
  const companionMul = isCompanion ? COMPANION_EXP_MULTIPLIER : 1.0;

  const finalExp = Math.floor(baseExp * (distMul + streakExpAdd) * companionMul * mult);
  const finalCoin = Math.floor(baseCoin * (distMul + streakCoinAdd) * mult);

  const conditionRecovery = Math.min(
    CONDITION_DAILY_MAX_RECOVERY,
    Math.floor(steps / CONDITION_STEPS_PER_POINT)
  );

  const paceBonus = 1.0;
  const streakBonus = distMul + streakExpAdd;
  const bonusMultiplier = (distMul + streakExpAdd) * companionMul * mult;

  return {
    exp: finalExp,
    coins: finalCoin,
    conditionRecovery,
    friendshipGain: 0, // v9: 친밀도 제거
    bonusMultiplier,
    paceBonus,
    streakBonus,
    distanceMultiplier: distMul,
    streakExpAdd,
    streakCoinAdd,
  };
}
