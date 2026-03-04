// ═══════════════════════════════════════════════════════════
// 챌린지 시스템 — 거리/누적/스트릭/탐험/특수
// 보상: 코인 + 칭호. 유전자 촉매는 T4에서만 획득.
// ═══════════════════════════════════════════════════════════

import { getRunningStats } from './running';
import { getOwnedSpeciesIds } from './collection';
import { isCloudReady } from './cloud-storage';

// ─── Types ───────────────────────────────────────────────

export type ChallengeCategory = 'distance' | 'cumulative' | 'streak' | 'exploration' | 'special';

export interface ChallengeDefinition {
  id: string;
  category: ChallengeCategory;
  name: string;
  description: string;
  emoji: string;
  /** 코인 보상 */
  rewardCoins: number;
  /** 칭호 (없으면 null) */
  rewardTitle: string | null;
  /** 특수 보상 아이템 ID (유전자 촉매 등) */
  rewardItemId?: string;
}

export interface ChallengeProgress {
  id: string;
  current: number;
  target: number;
  completed: boolean;
  completedAt?: string; // ISO date
}

export interface ChallengeState {
  progress: Record<string, ChallengeProgress>;
  titles: string[]; // 획득한 칭호 목록
  activeTitle: string | null; // 현재 표시 중인 칭호
  visitedRegions: string[]; // 탐험 챌린지용
}

// ─── Challenge Definitions ───────────────────────────────

export const CHALLENGE_DEFS: ChallengeDefinition[] = [
  // ── 거리 챌린지 (D1~D6) ──
  { id: 'D1', category: 'distance', name: '첫 걸음', description: '첫 러닝 완료', emoji: '👟', rewardCoins: 50, rewardTitle: '루키 러너' },
  { id: 'D2', category: 'distance', name: '3km 러너', description: '1회 3km 달성', emoji: '🏃', rewardCoins: 100, rewardTitle: null },
  { id: 'D3', category: 'distance', name: '5km 러너', description: '1회 5km 달성', emoji: '🏅', rewardCoins: 200, rewardTitle: '5km 러너' },
  { id: 'D4', category: 'distance', name: '10km 정복', description: '1회 10km 달성', emoji: '🏆', rewardCoins: 500, rewardTitle: '철인' },
  { id: 'D5', category: 'distance', name: '하프 마라톤', description: '1회 21.1km 달성', emoji: '🥇', rewardCoins: 1000, rewardTitle: '하프 마라토너' },
  { id: 'D6', category: 'distance', name: '풀 마라톤', description: '1회 42.195km 달성', emoji: '👑', rewardCoins: 3000, rewardTitle: '마라토너' },

  // ── 누적 챌린지 (T1~T5) ──
  { id: 'T1', category: 'cumulative', name: '50km 누적', description: '총 50km 달성', emoji: '📏', rewardCoins: 200, rewardTitle: null },
  { id: 'T2', category: 'cumulative', name: '100km 누적', description: '총 100km 달성', emoji: '🛤️', rewardCoins: 500, rewardTitle: '백리길' },
  { id: 'T3', category: 'cumulative', name: '250km 누적', description: '총 250km 달성', emoji: '🗺️', rewardCoins: 1000, rewardTitle: '탐험가' },
  { id: 'T4', category: 'cumulative', name: '500km 누적', description: '총 500km 달성', emoji: '🧬', rewardCoins: 2000, rewardTitle: null, rewardItemId: 'gene_catalyst' },
  { id: 'T5', category: 'cumulative', name: '1000km 누적', description: '총 1000km 달성', emoji: '🐎', rewardCoins: 5000, rewardTitle: '천리마' },

  // ── 스트릭 챌린지 (S1~S5) ──
  { id: 'S1', category: 'streak', name: '3일 연속', description: '3일 연속 러닝', emoji: '🔥', rewardCoins: 50, rewardTitle: null },
  { id: 'S2', category: 'streak', name: '7일 연속', description: '7일 연속 러닝', emoji: '💪', rewardCoins: 200, rewardTitle: '꾸준러너' },
  { id: 'S3', category: 'streak', name: '14일 연속', description: '14일 연속 러닝', emoji: '⚡', rewardCoins: 500, rewardTitle: null },
  { id: 'S4', category: 'streak', name: '30일 연속', description: '30일 연속 러닝', emoji: '🏔️', rewardCoins: 1500, rewardTitle: '철의 의지' },
  { id: 'S5', category: 'streak', name: '100일 연속', description: '100일 연속 러닝', emoji: '🐉', rewardCoins: 5000, rewardTitle: '전설의 러너' },

  // ── 탐험 챌린지 (E1~E4) ──
  { id: 'E1', category: 'exploration', name: '탐험 시작', description: '3개 다른 지역에서 러닝', emoji: '🧭', rewardCoins: 100, rewardTitle: null },
  { id: 'E2', category: 'exploration', name: '방랑자', description: '5개 다른 지역에서 러닝', emoji: '🗺️', rewardCoins: 300, rewardTitle: '방랑자' },
  { id: 'E3', category: 'exploration', name: '전국구', description: '7개 권역 모두 방문', emoji: '🌏', rewardCoins: 2000, rewardTitle: '전국구' },
  { id: 'E4', category: 'exploration', name: '코스 마스터', description: '10개 다른 지역에서 러닝', emoji: '🏴', rewardCoins: 3000, rewardTitle: '코스 마스터' },

  // ── 특수 챌린지 (SP1~SP6) ──
  { id: 'SP1', category: 'special', name: '얼리버드', description: '06시 이전 러닝 5회', emoji: '🌅', rewardCoins: 200, rewardTitle: '새벽 러너' },
  { id: 'SP2', category: 'special', name: '나이트 러너', description: '21시 이후 러닝 5회', emoji: '🌙', rewardCoins: 200, rewardTitle: '야행성' },
  { id: 'SP3', category: 'special', name: '스피드스터', description: '페이스 5:00/km 이하 달성', emoji: '💨', rewardCoins: 300, rewardTitle: '질풍' },
  { id: 'SP4', category: 'special', name: '동반 마스터', description: '동반 포켓몬 친밀도 MAX', emoji: '❤️', rewardCoins: 500, rewardTitle: null },
  { id: 'SP5', category: 'special', name: '수집가', description: '50종 포켓몬 수집', emoji: '📚', rewardCoins: 1000, rewardTitle: '수집가' },
  { id: 'SP6', category: 'special', name: '도감 완성', description: '151종 포켓몬 수집', emoji: '🏅', rewardCoins: 10000, rewardTitle: '포켓몬 마스터' },
];

// ─── Storage ─────────────────────────────────────────────

const CHALLENGE_KEY = 'routinmon-challenges';

function getDefaultState(): ChallengeState {
  const progress: Record<string, ChallengeProgress> = {};
  for (const def of CHALLENGE_DEFS) {
    progress[def.id] = {
      id: def.id,
      current: 0,
      target: getTarget(def.id),
      completed: false,
    };
  }
  return { progress, titles: [], activeTitle: null, visitedRegions: [] };
}

function getTarget(id: string): number {
  switch (id) {
    case 'D1': return 1;    // 첫 러닝 (횟수)
    case 'D2': return 3;    // 1회 3km
    case 'D3': return 5;
    case 'D4': return 10;
    case 'D5': return 21.1;
    case 'D6': return 42.195;
    case 'T1': return 50;
    case 'T2': return 100;
    case 'T3': return 250;
    case 'T4': return 500;
    case 'T5': return 1000;
    case 'S1': return 3;
    case 'S2': return 7;
    case 'S3': return 14;
    case 'S4': return 30;
    case 'S5': return 100;
    case 'E1': return 3;
    case 'E2': return 5;
    case 'E3': return 7;   // 7개 권역
    case 'E4': return 10;
    case 'SP1': return 5;
    case 'SP2': return 5;
    case 'SP3': return 1;  // 1회 달성
    case 'SP4': return 1;  // 친밀도 MAX 1회
    case 'SP5': return 50;
    case 'SP6': return 151;
    default: return 1;
  }
}

export function getChallengeState(): ChallengeState {
  const data = localStorage.getItem(CHALLENGE_KEY);
  if (data) {
    const parsed = JSON.parse(data) as ChallengeState;
    // Merge any new challenge defs
    for (const def of CHALLENGE_DEFS) {
      if (!parsed.progress[def.id]) {
        parsed.progress[def.id] = { id: def.id, current: 0, target: getTarget(def.id), completed: false };
      }
    }
    return parsed;
  }
  return getDefaultState();
}

function saveChallengeState(state: ChallengeState) {
  localStorage.setItem(CHALLENGE_KEY, JSON.stringify(state));
}

// ─── Update Challenges ───────────────────────────────────

export interface ChallengeUpdateResult {
  newlyCompleted: ChallengeDefinition[];
  newTitles: string[];
  totalCoinsEarned: number;
  specialItems: string[];
}

/** 러닝 완료 후 챌린지 업데이트 */
export function updateChallengesAfterRun(params: {
  distanceKm: number;
  paceMinPerKm: number;
  regionId?: string;
  hour: number;
}): ChallengeUpdateResult {
  const state = getChallengeState();
  const stats = getRunningStats();
  const ownedCount = getOwnedSpeciesIds().size;

  const result: ChallengeUpdateResult = {
    newlyCompleted: [],
    newTitles: [],
    totalCoinsEarned: 0,
    specialItems: [],
  };

  // Track region visit
  if (params.regionId && !state.visitedRegions.includes(params.regionId)) {
    state.visitedRegions.push(params.regionId);
  }

  // Count unique areas from visited regions
  // (We'll use a simple heuristic: region IDs map to areas)
  const uniqueAreas = new Set<string>();
  for (const rid of state.visitedRegions) {
    // Extract area from region id pattern
    if (rid.startsWith('seoul') || rid.startsWith('gyeonggi') || rid.startsWith('incheon')) uniqueAreas.add('수도권');
    else if (rid.startsWith('chuncheon') || rid.startsWith('seorak') || rid.startsWith('gangneung')) uniqueAreas.add('강원권');
    else if (rid.startsWith('daejeon') || rid.startsWith('chungju')) uniqueAreas.add('충청권');
    else if (rid.startsWith('gwangju') || rid.startsWith('yeosu') || rid.startsWith('jeonju')) uniqueAreas.add('전라권');
    else if (rid.startsWith('busan') || rid.startsWith('daegu') || rid.startsWith('gyeongju') || rid.startsWith('ulsan')) uniqueAreas.add('경상권');
    else if (rid.startsWith('jeju') || rid.startsWith('hallasan')) uniqueAreas.add('제주권');
  }

  // Count early/night runs from sessions
  const earlyRuns = stats.sessions.filter(s => {
    const h = new Date(s.startTime).getHours();
    return h < 6;
  }).length;

  const nightRuns = stats.sessions.filter(s => {
    const h = new Date(s.startTime).getHours();
    return h >= 21;
  }).length;

  // Update each challenge progress
  for (const def of CHALLENGE_DEFS) {
    const prog = state.progress[def.id];
    if (!prog || prog.completed) continue;

    let newCurrent = prog.current;

    switch (def.id) {
      // Distance challenges (single run)
      case 'D1': newCurrent = stats.totalSessions; break;
      case 'D2': newCurrent = Math.max(prog.current, params.distanceKm); break;
      case 'D3': newCurrent = Math.max(prog.current, params.distanceKm); break;
      case 'D4': newCurrent = Math.max(prog.current, params.distanceKm); break;
      case 'D5': newCurrent = Math.max(prog.current, params.distanceKm); break;
      case 'D6': newCurrent = Math.max(prog.current, params.distanceKm); break;

      // Cumulative
      case 'T1': case 'T2': case 'T3': case 'T4': case 'T5':
        newCurrent = stats.totalDistanceKm; break;

      // Streak
      case 'S1': case 'S2': case 'S3': case 'S4': case 'S5':
        newCurrent = stats.currentStreak; break;

      // Exploration
      case 'E1': case 'E2': case 'E4':
        newCurrent = state.visitedRegions.length; break;
      case 'E3':
        newCurrent = uniqueAreas.size; break;

      // Special
      case 'SP1': newCurrent = earlyRuns; break;
      case 'SP2': newCurrent = nightRuns; break;
      case 'SP3': newCurrent = (params.paceMinPerKm > 0 && params.paceMinPerKm <= 5) ? 1 : prog.current; break;
      // SP4 handled externally (bond system)
      case 'SP5': newCurrent = ownedCount; break;
      case 'SP6': newCurrent = ownedCount; break;
    }

    prog.current = Math.round(newCurrent * 100) / 100;

    if (prog.current >= prog.target && !prog.completed) {
      prog.completed = true;
      prog.completedAt = new Date().toISOString();
      result.newlyCompleted.push(def);
      result.totalCoinsEarned += def.rewardCoins;

      if (def.rewardTitle) {
        state.titles.push(def.rewardTitle);
        result.newTitles.push(def.rewardTitle);
      }

      if (def.rewardItemId) {
        result.specialItems.push(def.rewardItemId);
      }
    }
  }

  saveChallengeState(state);
  return result;
}

/** 특수 챌린지 SP4 (동반 마스터) 수동 업데이트 */
export function completeCompanionMasterChallenge(): ChallengeUpdateResult | null {
  const state = getChallengeState();
  const prog = state.progress['SP4'];
  if (!prog || prog.completed) return null;

  prog.current = 1;
  prog.completed = true;
  prog.completedAt = new Date().toISOString();
  const def = CHALLENGE_DEFS.find(d => d.id === 'SP4')!;
  if (def.rewardTitle) state.titles.push(def.rewardTitle);
  saveChallengeState(state);

  return {
    newlyCompleted: [def],
    newTitles: def.rewardTitle ? [def.rewardTitle] : [],
    totalCoinsEarned: def.rewardCoins,
    specialItems: [],
  };
}

/** 전체 챌린지 진행도를 카테고리별로 반환 */
export function getChallengesByCategory(): Map<ChallengeCategory, { def: ChallengeDefinition; progress: ChallengeProgress }[]> {
  const state = getChallengeState();
  const map = new Map<ChallengeCategory, { def: ChallengeDefinition; progress: ChallengeProgress }[]>();

  for (const def of CHALLENGE_DEFS) {
    const list = map.get(def.category) || [];
    list.push({ def, progress: state.progress[def.id] || { id: def.id, current: 0, target: getTarget(def.id), completed: false } });
    map.set(def.category, list);
  }

  return map;
}

/** 전체 챌린지 완료율 */
export function getChallengeCompletionRate(): { completed: number; total: number; pct: number } {
  const state = getChallengeState();
  const total = CHALLENGE_DEFS.length;
  const completed = Object.values(state.progress).filter(p => p.completed).length;
  return { completed, total, pct: Math.round((completed / total) * 100) };
}

/** 모든 챌린지가 완료되었는지 */
export function isAllChallengesComplete(): boolean {
  const { completed, total } = getChallengeCompletionRate();
  return completed >= total;
}

/** 획득한 칭호 목록 */
export function getEarnedTitles(): string[] {
  return getChallengeState().titles;
}

/** 활성 칭호 설정 */
export function setActiveTitle(title: string | null) {
  const state = getChallengeState();
  state.activeTitle = title;
  saveChallengeState(state);
}

/** 활성 칭호 가져오기 */
export function getActiveTitle(): string | null {
  return getChallengeState().activeTitle;
}

/** 특정 챌린지가 완료되었는지 */
export function isChallengeCompleted(id: string): boolean {
  const state = getChallengeState();
  return state.progress[id]?.completed ?? false;
}

/** 모든 챌린지가 완료되었는지 (isAllChallengesComplete alias) */
export function areAllChallengesCompleted(): boolean {
  return isAllChallengesComplete();
}

export const CATEGORY_LABELS: Record<ChallengeCategory, { label: string; emoji: string }> = {
  distance: { label: '거리', emoji: '🏃' },
  cumulative: { label: '누적', emoji: '📏' },
  streak: { label: '스트릭', emoji: '🔥' },
  exploration: { label: '탐험', emoji: '🧭' },
  special: { label: '특수', emoji: '⭐' },
};
