import { getProfile, saveProfile } from './storage';
import { grantRewards } from './pet';

export interface AttendanceResult {
  isNewDay: boolean;
  consecutiveDays: number;
  bonusFood: number;
  bonusExp: number;
  levelUp: import('./pet').LevelUpResult | null;
}

export function checkAndGrantAttendance(): AttendanceResult {
  const profile = getProfile();
  const today = new Date().toISOString().split('T')[0];

  // Already logged in today
  if (profile.lastLoginDate === today) {
    return {
      isNewDay: false,
      consecutiveDays: profile.consecutiveLoginDays,
      bonusFood: 0,
      bonusExp: 0,
      levelUp: null,
    };
  }

  // Calculate consecutive days
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const consecutive = profile.lastLoginDate === yesterdayStr
    ? profile.consecutiveLoginDays + 1
    : 1;

  // Rewards scale with consecutive days
  const is7DayBonus = consecutive % 7 === 0;
  const bonusFood = is7DayBonus ? 4 : Math.min(1 + Math.floor(consecutive / 3), 3);
  const bonusExp = is7DayBonus ? 30 : 5 + consecutive * 2;

  // Save attendance
  saveProfile({
    lastLoginDate: today,
    consecutiveLoginDays: consecutive,
  });

  // Grant rewards
  const { levelUp } = grantRewards(bonusFood, bonusExp);

  return {
    isNewDay: true,
    consecutiveDays: consecutive,
    bonusFood,
    bonusExp,
    levelUp,
  };
}
