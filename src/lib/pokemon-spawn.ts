// ═══════════════════════════════════════════════════════════
// 지역 기반 포켓몬 스폰 시스템
// 러닝 완료 후 조우 처리 — 조우 = 즉시 획득
// ═══════════════════════════════════════════════════════════

import { type RunContext, checkEncounterCondition, getGradeWeight } from './pokemon-grade';
import { type SpawnRegion, getPokemonGrade, getDefaultRegion, findRegionByGps } from './spawn-data';
import { getPokemonById } from './pokemon-registry';
import { getOwnedSpeciesIds } from './collection';
import { getRunningStreak } from './running-streak';

export interface SpawnResult {
  speciesId: number;
  name: string;
  grade: 'normal' | 'rare' | 'unique' | 'legendary';
  isNew: boolean; // 도감에 없는 새 포켓몬인지
}

/** 러닝 완료 후 조우 처리 */
export function processEncounters(
  region: SpawnRegion | null,
  distanceKm: number,
  paceMinPerKm: number,
  totalKm: number
): SpawnResult[] {
  const activeRegion = region || getDefaultRegion();
  const streak = getRunningStreak();
  const hour = new Date().getHours();
  const owned = getOwnedSpeciesIds();

  const runCtx: RunContext = {
    distanceKm,
    paceMinPerKm,
    streakDays: streak.currentStreak,
    totalKm,
    hour,
  };

  // 해당 권역의 야생 포켓몬 중 조건 충족하는 것만 필터
  const eligible: { id: number; weight: number }[] = [];

  for (const speciesId of activeRegion.pokemon) {
    const gradeEntry = getPokemonGrade(speciesId);
    if (!gradeEntry || !gradeEntry.wildCondition) continue; // 진화 전용이나 전설은 스킵
    if (gradeEntry.grade === 'legendary') continue;

    if (checkEncounterCondition(gradeEntry.wildCondition, runCtx)) {
      const weight = getGradeWeight(gradeEntry.grade);
      // 이미 보유한 포켓몬은 가중치 절반 (재조우는 가능하지만 우선순위 낮음)
      const adjustedWeight = owned.has(speciesId) ? weight * 0.3 : weight;
      if (adjustedWeight > 0) {
        eligible.push({ id: speciesId, weight: adjustedWeight });
      }
    }
  }

  if (eligible.length === 0) return [];

  // 거리 기반 조우 횟수: 1km당 1회, 최대 5회
  const maxEncounters = Math.min(Math.floor(distanceKm), 5);
  if (maxEncounters <= 0) return [];

  // 가중치 기반 랜덤 선택 (중복 없음)
  const results: SpawnResult[] = [];
  const remaining = [...eligible];

  for (let i = 0; i < maxEncounters && remaining.length > 0; i++) {
    const picked = weightedPick(remaining);
    if (!picked) break;

    const species = getPokemonById(picked.id);
    const gradeEntry = getPokemonGrade(picked.id);
    if (!species || !gradeEntry) continue;

    results.push({
      speciesId: picked.id,
      name: species.name,
      grade: gradeEntry.grade,
      isNew: !owned.has(picked.id),
    });

    // 중복 제거
    const idx = remaining.findIndex(e => e.id === picked.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  return results;
}

function weightedPick(items: { id: number; weight: number }[]): { id: number; weight: number } | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  if (total <= 0) return items[0];
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/** GPS 좌표로 권역 찾기 (편의 re-export) */
export { findRegionByGps, getDefaultRegion } from './spawn-data';

/** 권역의 포켓몬 목록을 등급별로 정리 */
export function getRegionPokemonByGrade(region: SpawnRegion) {
  const grouped: Record<string, { id: number; name: string; condition: string }[]> = {
    normal: [],
    rare: [],
    unique: [],
  };

  for (const speciesId of region.pokemon) {
    const species = getPokemonById(speciesId);
    const gradeEntry = getPokemonGrade(speciesId);
    if (!species || !gradeEntry) continue;

    const cond = gradeEntry.wildCondition;
    let condStr = '진화 전용';
    if (cond) {
      const parts: string[] = [];
      if (cond.minDistanceKm) parts.push(`${cond.minDistanceKm}km`);
      if (cond.maxPaceMinPerKm) parts.push(`페이스 ${cond.maxPaceMinPerKm}분/km 이하`);
      if (cond.minStreakDays) parts.push(`스트릭 ${cond.minStreakDays}일`);
      if (cond.minTotalKm) parts.push(`누적 ${cond.minTotalKm}km`);
      if (cond.timeWindow) {
        const [s, e] = cond.timeWindow;
        parts.push(`${s}~${e}시`);
      }
      condStr = parts.join(cond.conditionLogic === 'AND' ? ' + ' : ' 또는 ');
    }

    const gradeKey = gradeEntry.grade === 'legendary' ? 'unique' : gradeEntry.grade;
    grouped[gradeKey]?.push({ id: speciesId, name: species.name, condition: condStr });
  }

  return grouped;
}
