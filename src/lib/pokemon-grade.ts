// ═══════════════════════════════════════════════════════════
// 4등급 체계 + 조우 조건 시스템
// 등급 = 난이도, 조우 = 획득, 조건 = 러닝 실력
// ═══════════════════════════════════════════════════════════

export type PokemonGrade = 'normal' | 'rare' | 'unique' | 'legendary';

export interface EncounterCondition {
  minDistanceKm?: number;        // 최소 러닝 거리
  maxPaceMinPerKm?: number;      // 최대 페이스 (분/km, 낮을수록 빠름)
  minStreakDays?: number;         // 최소 연속 러닝 일수
  minTotalKm?: number;           // 최소 누적 거리
  timeWindow?: [number, number]; // 시간대 [시작시, 종료시]
  conditionLogic: 'AND' | 'OR';  // 조건 조합 방식
}

export interface RunContext {
  distanceKm: number;
  paceMinPerKm: number;
  streakDays: number;
  totalKm: number;
  hour: number;
}

/** 조우 조건 검증 */
export function checkEncounterCondition(
  cond: EncounterCondition,
  run: RunContext
): boolean {
  const checks: boolean[] = [];

  if (cond.minDistanceKm != null)
    checks.push(run.distanceKm >= cond.minDistanceKm);
  if (cond.maxPaceMinPerKm != null)
    checks.push(run.paceMinPerKm <= cond.maxPaceMinPerKm);
  if (cond.minStreakDays != null)
    checks.push(run.streakDays >= cond.minStreakDays);
  if (cond.minTotalKm != null)
    checks.push(run.totalKm >= cond.minTotalKm);
  if (cond.timeWindow) {
    const [s, e] = cond.timeWindow;
    checks.push(s < e ? (run.hour >= s && run.hour < e) : (run.hour >= s || run.hour < e));
  }

  if (checks.length === 0) return true;

  return cond.conditionLogic === 'AND'
    ? checks.every(c => c)
    : checks.some(c => c);
}

/** 등급 정보 */
export function getGradeInfo(grade: PokemonGrade): { label: string; emoji: string; color: string } {
  switch (grade) {
    case 'normal': return { label: '일반', emoji: '⚪', color: 'hsl(var(--muted-foreground))' };
    case 'rare': return { label: '레어', emoji: '🔵', color: 'hsl(210, 80%, 55%)' };
    case 'unique': return { label: '유니크', emoji: '🟣', color: 'hsl(270, 70%, 55%)' };
    case 'legendary': return { label: '전설', emoji: '🟡', color: 'hsl(45, 90%, 55%)' };
  }
}

/** 등급별 가중치 (낮은 등급이 더 자주 선택됨) */
export function getGradeWeight(grade: PokemonGrade): number {
  switch (grade) {
    case 'normal': return 10;
    case 'rare': return 4;
    case 'unique': return 1;
    case 'legendary': return 0; // 전설은 스토리 전용
  }
}
