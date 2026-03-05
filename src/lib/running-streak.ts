// ═══════════════════════════════════════════════════════════
// 러닝 스트릭 시스템 — 연속 출석 + 마일스톤 보상 + 기록 저장
// ═══════════════════════════════════════════════════════════

import { isCloudReady } from './cloud-storage';

export interface RunningStreakState {
  currentStreak: number;
  longestStreak: number;
  lastRunDate: string | null;
  totalRunDays: number;
  claimedMilestones: number[];
}

export interface StreakMilestone {
  days: number;
  coins: number;
  berries: number;
  label: string;
  emoji: string;
  title?: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, coins: 100, berries: 0, label: '시작 격려', emoji: '🔥' },
  { days: 7, coins: 300, berries: 0, label: '1주 달성', emoji: '⭐' },
  { days: 14, coins: 500, berries: 0, label: '2주 목표', emoji: '🏅' },
  { days: 30, coins: 1000, berries: 0, label: '한 달 챌린지', emoji: '👑', title: '마라토너' },
];

// ─── Run Records (v4: 러닝 기록 저장) ────────────────────

export interface RunRecord {
  date: string;
  steps: number;
  distanceKm: number;
  durationSec: number;
  paceMinPerKm: number | null;
  companionSpeciesId: number;
  companionName: string;
  rewards: { exp: number; coins: number; conditionRecovery: number; friendshipGain?: number };
  // v9 FIX #6: GPS 경로 + 조우 기록
  route?: { lat: number; lng: number; timestamp: number; pace?: number }[];
  encounters?: { speciesId: number; grade: string; distanceAtEncounter: number }[];
}

const STREAK_STORAGE = 'routinmon-running-streak';
const RECORDS_STORAGE = 'routinmon-run-records';
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

export function recordRunForStreak(steps: number): StreakMilestone[] {
  if (steps < MIN_STEPS_FOR_STREAK) return [];

  const state = getRunningStreak();
  const today = getToday();

  if (state.lastRunDate === today) return [];

  const yesterday = getYesterday();
  if (state.lastRunDate === yesterday) {
    state.currentStreak += 1;
  } else if (state.lastRunDate === null || state.lastRunDate < yesterday) {
    state.currentStreak = 1;
  }

  state.lastRunDate = today;
  state.totalRunDays += 1;
  if (state.currentStreak > state.longestStreak) {
    state.longestStreak = state.currentStreak;
  }

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

export function getStreakBonus(): number {
  return Math.min(2.0, 1.0 + getRunningStreak().currentStreak * 0.1);
}

// ─── Run Records ─────────────────────────────────────────

export function getRunRecords(): RunRecord[] {
  const data = localStorage.getItem(RECORDS_STORAGE);
  return data ? JSON.parse(data) : [];
}

export function saveRunRecord(record: RunRecord) {
  const records = getRunRecords();
  records.unshift(record);
  if (records.length > 50) records.length = 50;
  localStorage.setItem(RECORDS_STORAGE, JSON.stringify(records));
}

/** 최근 N일 일별 걸음수 합산 */
export function getDailyStepHistory(days: number = 7): { date: string; steps: number }[] {
  const records = getRunRecords();
  const result: { date: string; steps: number }[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySteps = records
      .filter(r => r.date === dateStr)
      .reduce((sum, r) => sum + r.steps, 0);
    result.push({ date: dateStr, steps: daySteps });
  }

  return result.reverse();
}

/** 러닝 기록이 있는 날짜 Set (최근 30일) */
export function getRunDates(days: number = 30): Set<string> {
  const records = getRunRecords();
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return new Set(records.filter(r => r.date >= cutoffStr).map(r => r.date));
}

export function resetRunRecords() {
  localStorage.removeItem(RECORDS_STORAGE);
}

export function resetStreakData() {
  localStorage.removeItem(STREAK_STORAGE);
  localStorage.removeItem(RECORDS_STORAGE);
}
