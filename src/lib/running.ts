import { grantRewards } from './pet';
import type { LevelUpResult } from './pet';

// ─── Types ───────────────────────────────────────────────

export interface RunningSession {
  id: string;
  date: string; // ISO date
  startTime: string; // ISO datetime
  endTime: string;
  distanceKm: number;
  durationSeconds: number;
  paceMinPerKm: number; // avg min/km
  route: GeoPoint[];
  caloriesBurned: number;
  rewardGranted: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed?: number; // m/s
}

export interface RunningGoal {
  type: 'daily' | 'weekly' | 'monthly';
  targetKm: number;
  currentKm: number;
  startDate: string;
  endDate: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  type: 'streak' | 'distance' | 'pace' | 'count';
  target: number;
  current: number;
  unit: string;
  completed: boolean;
  rewardFood: number;
  rewardExp: number;
}

export interface RunningStats {
  totalDistanceKm: number;
  totalSessions: number;
  totalDurationSeconds: number;
  bestPaceMinPerKm: number | null;
  longestRunKm: number;
  currentStreak: number; // consecutive days with a run
  sessions: RunningSession[];
  goals: RunningGoal[];
  challenges: Challenge[];
}

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'routinmon-running';

const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'first_run', title: '첫 런닝', description: '첫 번째 런닝을 완료하세요', emoji: '🏃', type: 'count', target: 1, current: 0, unit: '회', completed: false, rewardFood: 3, rewardExp: 50 },
  { id: 'run_3days', title: '3일 연속', description: '3일 연속으로 달리세요', emoji: '🔥', type: 'streak', target: 3, current: 0, unit: '일', completed: false, rewardFood: 5, rewardExp: 100 },
  { id: 'run_7days', title: '7일 연속', description: '7일 연속으로 달리세요', emoji: '💪', type: 'streak', target: 7, current: 0, unit: '일', completed: false, rewardFood: 10, rewardExp: 250 },
  { id: 'total_10km', title: '누적 10km', description: '총 10km를 달리세요', emoji: '📏', type: 'distance', target: 10, current: 0, unit: 'km', completed: false, rewardFood: 5, rewardExp: 150 },
  { id: 'total_50km', title: '누적 50km', description: '총 50km를 달리세요', emoji: '🏅', type: 'distance', target: 50, current: 0, unit: 'km', completed: false, rewardFood: 15, rewardExp: 500 },
  { id: 'total_100km', title: '누적 100km', description: '총 100km를 달리세요', emoji: '🏆', type: 'distance', target: 100, current: 0, unit: 'km', completed: false, rewardFood: 30, rewardExp: 1000 },
  { id: 'pace_6min', title: '6분 페이스', description: 'km당 6분 이하로 달리세요', emoji: '⚡', type: 'pace', target: 6, current: 0, unit: 'min/km', completed: false, rewardFood: 5, rewardExp: 200 },
  { id: 'single_5km', title: '5km 완주', description: '한 번에 5km를 달리세요', emoji: '🎯', type: 'distance', target: 5, current: 0, unit: 'km', completed: false, rewardFood: 5, rewardExp: 150 },
  { id: 'single_10km', title: '10km 완주', description: '한 번에 10km를 달리세요', emoji: '🌟', type: 'distance', target: 10, current: 0, unit: 'km', completed: false, rewardFood: 10, rewardExp: 300 },
  { id: 'run_30days', title: '30일 연속', description: '30일 연속으로 달리세요', emoji: '👑', type: 'streak', target: 30, current: 0, unit: '일', completed: false, rewardFood: 30, rewardExp: 1500 },
];

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getWeekEnd(): string {
  const start = new Date(getWeekStart());
  start.setDate(start.getDate() + 6);
  return start.toISOString().split('T')[0];
}

function getMonthEnd(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

export function getRunningStats(): RunningStats {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    const parsed = JSON.parse(data) as RunningStats;
    // Ensure goals exist and are current
    parsed.goals = refreshGoals(parsed);
    // Ensure all challenges exist
    parsed.challenges = mergeDefaultChallenges(parsed.challenges);
    return parsed;
  }
  return {
    totalDistanceKm: 0,
    totalSessions: 0,
    totalDurationSeconds: 0,
    bestPaceMinPerKm: null,
    longestRunKm: 0,
    currentStreak: 0,
    sessions: [],
    goals: createDefaultGoals(),
    challenges: [...DEFAULT_CHALLENGES],
  };
}

function saveRunningStats(stats: RunningStats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function mergeDefaultChallenges(existing: Challenge[]): Challenge[] {
  const byId = new Map(existing.map(c => [c.id, c]));
  return DEFAULT_CHALLENGES.map(dc => byId.get(dc.id) || { ...dc });
}

function createDefaultGoals(): RunningGoal[] {
  return [
    { type: 'daily', targetKm: 3, currentKm: 0, startDate: getToday(), endDate: getToday() },
    { type: 'weekly', targetKm: 15, currentKm: 0, startDate: getWeekStart(), endDate: getWeekEnd() },
    { type: 'monthly', targetKm: 60, currentKm: 0, startDate: getMonthStart(), endDate: getMonthEnd() },
  ];
}

function refreshGoals(stats: RunningStats): RunningGoal[] {
  const today = getToday();
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();
  
  const goals = stats.goals.length > 0 ? [...stats.goals] : createDefaultGoals();
  
  // Reset goals if period changed
  for (const g of goals) {
    if (g.type === 'daily' && g.startDate !== today) {
      g.startDate = today; g.endDate = today; g.currentKm = 0;
      // Recalculate from sessions today
      g.currentKm = stats.sessions.filter(s => s.date === today).reduce((sum, s) => sum + s.distanceKm, 0);
    }
    if (g.type === 'weekly' && g.startDate !== weekStart) {
      g.startDate = weekStart; g.endDate = getWeekEnd(); g.currentKm = 0;
      g.currentKm = stats.sessions.filter(s => s.date >= weekStart).reduce((sum, s) => sum + s.distanceKm, 0);
    }
    if (g.type === 'monthly' && g.startDate !== monthStart) {
      g.startDate = monthStart; g.endDate = getMonthEnd(); g.currentKm = 0;
      g.currentKm = stats.sessions.filter(s => s.date >= monthStart).reduce((sum, s) => sum + s.distanceKm, 0);
    }
  }
  return goals;
}

// ─── GPS Helpers ─────────────────────────────────────────

export function calculateDistance(points: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }
  return total;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatPace(paceMinPerKm: number): string {
  const min = Math.floor(paceMinPerKm);
  const sec = Math.round((paceMinPerKm - min) * 60);
  return `${min}'${sec.toString().padStart(2, '0')}\"`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function estimateCalories(distanceKm: number, durationSeconds: number): number {
  // Rough estimate: ~60 cal per km for avg person
  return Math.round(distanceKm * 60);
}

// ─── Session Complete & Rewards ──────────────────────────

export function completeRunningSession(
  route: GeoPoint[],
  durationSeconds: number,
): { session: RunningSession; stats: RunningStats; levelUp: LevelUpResult | null; completedChallenges: Challenge[] } {
  const distanceKm = Math.round(calculateDistance(route) * 100) / 100;
  const paceMinPerKm = durationSeconds > 0 && distanceKm > 0 ? (durationSeconds / 60) / distanceKm : 0;
  const calories = estimateCalories(distanceKm, durationSeconds);
  
  const session: RunningSession = {
    id: `run_${Date.now()}`,
    date: getToday(),
    startTime: new Date(route[0]?.timestamp || Date.now()).toISOString(),
    endTime: new Date().toISOString(),
    distanceKm,
    durationSeconds,
    paceMinPerKm,
    route,
    caloriesBurned: calories,
    rewardGranted: true,
  };
  
  const stats = getRunningStats();
  stats.sessions.push(session);
  stats.totalDistanceKm = Math.round((stats.totalDistanceKm + distanceKm) * 100) / 100;
  stats.totalSessions += 1;
  stats.totalDurationSeconds += durationSeconds;
  if (distanceKm > stats.longestRunKm) stats.longestRunKm = distanceKm;
  if (paceMinPerKm > 0 && (stats.bestPaceMinPerKm === null || paceMinPerKm < stats.bestPaceMinPerKm)) {
    stats.bestPaceMinPerKm = paceMinPerKm;
  }
  
  // Update streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const hadRunYesterday = stats.sessions.some(s => s.date === yesterdayStr);
  const hadRunToday = stats.sessions.filter(s => s.date === getToday()).length > 1; // more than current
  if (hadRunToday) {
    // Already ran today, streak unchanged
  } else if (hadRunYesterday || stats.currentStreak === 0) {
    stats.currentStreak += 1;
  } else {
    stats.currentStreak = 1;
  }
  
  // Update goals
  for (const g of stats.goals) {
    if (g.type === 'daily' && g.startDate === getToday()) g.currentKm += distanceKm;
    if (g.type === 'weekly' && session.date >= g.startDate) g.currentKm += distanceKm;
    if (g.type === 'monthly' && session.date >= g.startDate) g.currentKm += distanceKm;
  }
  
  // Calculate rewards: 1 food per km, 10 exp per km + goal bonuses
  let foodReward = Math.max(1, Math.floor(distanceKm));
  let expReward = Math.max(5, Math.round(distanceKm * 10));
  
  // Bonus for completing goals
  for (const g of stats.goals) {
    if (g.currentKm >= g.targetKm) {
      if (g.type === 'daily') { foodReward += 1; expReward += 15; }
      if (g.type === 'weekly') { foodReward += 3; expReward += 50; }
      if (g.type === 'monthly') { foodReward += 10; expReward += 200; }
    }
  }
  
  // Update challenges
  const completedChallenges: Challenge[] = [];
  for (const c of stats.challenges) {
    if (c.completed) continue;
    let newCurrent = c.current;
    if (c.type === 'count') newCurrent = stats.totalSessions;
    if (c.type === 'streak') newCurrent = stats.currentStreak;
    if (c.type === 'distance') {
      if (c.id.startsWith('single_')) newCurrent = distanceKm;
      else newCurrent = stats.totalDistanceKm;
    }
    if (c.type === 'pace' && paceMinPerKm > 0) newCurrent = paceMinPerKm <= c.target ? c.target : 0;
    
    c.current = Math.round(newCurrent * 100) / 100;
    if (c.current >= c.target && !c.completed) {
      c.completed = true;
      foodReward += c.rewardFood;
      expReward += c.rewardExp;
      completedChallenges.push(c);
    }
  }
  
  saveRunningStats(stats);
  
  // Grant rewards to pet
  const { levelUp } = grantRewards(foodReward, expReward);
  
  return { session, stats, levelUp, completedChallenges };
}

// ─── Goal Management ─────────────────────────────────────

export function updateGoalTarget(type: 'daily' | 'weekly' | 'monthly', newTargetKm: number) {
  const stats = getRunningStats();
  const goal = stats.goals.find(g => g.type === type);
  if (goal) {
    goal.targetKm = newTargetKm;
    saveRunningStats(stats);
  }
}

export function getRecentSessions(count: number = 10): RunningSession[] {
  const stats = getRunningStats();
  return stats.sessions.slice(-count).reverse();
}

export function getTodayDistance(): number {
  const stats = getRunningStats();
  const today = getToday();
  return stats.sessions.filter(s => s.date === today).reduce((sum, s) => sum + s.distanceKm, 0);
}

/** Debug: add a fake running session with given distance */
export function debugAddDistance(distanceKm: number): { levelUp: LevelUpResult | null } {
  const durationSeconds = Math.round(distanceKm * 6 * 60); // ~6 min/km pace
  const paceMinPerKm = 6;
  const calories = estimateCalories(distanceKm, durationSeconds);

  const session: RunningSession = {
    id: `run_debug_${Date.now()}`,
    date: getToday(),
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    distanceKm,
    durationSeconds,
    paceMinPerKm,
    route: [],
    caloriesBurned: calories,
    rewardGranted: true,
  };

  const stats = getRunningStats();
  stats.sessions.push(session);
  stats.totalDistanceKm = Math.round((stats.totalDistanceKm + distanceKm) * 100) / 100;
  stats.totalSessions += 1;
  stats.totalDurationSeconds += durationSeconds;
  if (distanceKm > stats.longestRunKm) stats.longestRunKm = distanceKm;

  // Update goals
  for (const g of stats.goals) {
    if (g.type === 'daily' && g.startDate === getToday()) g.currentKm += distanceKm;
    if (g.type === 'weekly' && session.date >= g.startDate) g.currentKm += distanceKm;
    if (g.type === 'monthly' && session.date >= g.startDate) g.currentKm += distanceKm;
  }

  saveRunningStats(stats);

  const foodReward = Math.max(1, Math.floor(distanceKm));
  const expReward = Math.max(5, Math.round(distanceKm * 10));
  const { levelUp } = grantRewards(foodReward, expReward);

  return { levelUp };
}
