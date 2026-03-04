// ═══════════════════════════════════════════════════════════
// 러닝 스트릭 시스템 — 연속 출석 + 마일스톤 보상
// ═══════════════════════════════════════════════════════════

import { isCloudReady } from './cloud-storage';

export interface RunningStreakState {
  currentStreak: number;
  longestStreak: number;
  lastRunDate: string | null;  // ISO date
  totalRunDays: number;
  claimedMilestones: number[]; // streak days already claimed
}

export interface StreakMilestone {
  days: number;
  coins: number;
  berries: number;
  label: string;
  emoji: string;
  title?: string; // 특별 칭호
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, coins: 100, berries: 5, label: '시작 격려', emoji: '🔥' },
  { days: 7, coins: 300, berries: 3, label: '1주 달성', emoji: '⭐' },
  { days: 14, coins: 500, berries: 5, label: '2주 목표', emoji: '🏅' },
  { days: 30, coins: 1000, berries: 10, label: '한 달 챌린지', emoji: '👑', title: '마라토너' },
];

const STREAK_STORAGE = 'routinmon-running-streak';
const MIN_STEPS_FOR_STREAK = 500;

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function getRunningStreak(): RunningStreakState {
  const data = localStorage.getItem(STREAK_STORAGE);
  if (!data) return { currentStreak: 0, longestStreak: 0, lastRunDate: null, totalRunDays: 0, claimedMilestones: [] };
  return JSON.parse(data);
}

function saveStreak(state: RunningStreakState) {
  localStorage.setItem(STREAK_STORAGE, JSON.stringify(state));
}

/**
 * Record a run for today. Returns newly achieved milestones.
 * Only counts if steps >= MIN_STEPS_FOR_STREAK.
 */
export function recordRunForStreak(steps: number): StreakMilestone[] {
  if (steps < MIN_STEPS_FOR_STREAK) return [];

  const state = getRunningStreak();
  const today = getToday();

  // Already recorded today
  if (state.lastRunDate === today) {
    saveStreak(state);
    return [];
  }

  const yesterday = getYesterday();

  if (state.lastRunDate === yesterday) {
    // Continue streak
    state.currentStreak += 1;
  } else if (state.lastRunDate === null || state.lastRunDate < yesterday) {
    // Streak broken, restart
    state.currentStreak = 1;
  }

  state.lastRunDate = today;
  state.totalRunDays += 1;
  if (state.currentStreak > state.longestStreak) {
    state.longestStreak = state.currentStreak;
  }

  // Check milestones
  const newMilestones: StreakMilestone[] = [];
  for (const m of STREAK_MILESTONES) {
    if (state.currentStreak >= m.days && !state.claimedMilestones.includes(m.days)) {
      state.claimedMilestones.push(m.days);
      newMilestones.push(m);
    }
  }

  saveStreak(state);
  return newMilestones;
}

/** Get streak bonus multiplier for rewards */
export function getStreakBonus(): number {
  const state = getRunningStreak();
  return Math.min(2.0, 1.0 + state.currentStreak * 0.1);
}
