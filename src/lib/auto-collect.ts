// ═══════════════════════════════════════════════════════════
// 자동 수집 시스템 — 러닝 중 실시간 포켓몬 자동 포획
// 0.5km마다 조우 체크, 쿨다운 30초, 최대 5마리
// ═══════════════════════════════════════════════════════════

import { type RunContext, checkEncounterCondition, getGradeWeight } from './pokemon-grade';
import { type SpawnRegion, getPokemonGrade, getDefaultRegion, findRegionByGps } from './spawn-data';
import { getPokemonById } from './pokemon-registry';
import { getOwnedSpeciesIds, catchPokemon, markAsSeen } from './collection';
import { getRunningStreak } from './running-streak';
import { getRunningStats } from './running';
import { vibrateForGrade } from './running-mode';

export interface AutoCollectResult {
  speciesId: number;
  name: string;
  grade: 'normal' | 'rare' | 'unique';
  isNew: boolean;
  distanceAtEncounter: number;
}

export interface AutoCollectState {
  encounters: AutoCollectResult[];
  lastEncounterTime: number;
  lastCheckDistance: number;
}

export function createAutoCollectState(): AutoCollectState {
  return {
    encounters: [],
    lastEncounterTime: 0,
    lastCheckDistance: 0,
  };
}

const CHECK_INTERVAL_KM = 0.5;
const COOLDOWN_MS = 30000;
const MAX_ENCOUNTERS = 5;

/** 0.5km 간격 조우 체크. 조건 충족 시 자동 포획. */
export function checkAndAutoCollect(
  state: AutoCollectState,
  currentDistanceKm: number,
  currentPace: number,
  lat?: number,
  lng?: number,
): AutoCollectResult | null {
  // 간격 체크
  if (currentDistanceKm - state.lastCheckDistance < CHECK_INTERVAL_KM) return null;
  state.lastCheckDistance = currentDistanceKm;

  // 쿨다운 체크
  if (Date.now() - state.lastEncounterTime < COOLDOWN_MS) return null;

  // 최대 5마리 체크
  if (state.encounters.length >= MAX_ENCOUNTERS) return null;

  // 지역 감지
  const region = (lat && lng) ? findRegionByGps(lat, lng) : null;
  const activeRegion = region || getDefaultRegion();

  const streak = getRunningStreak();
  const stats = getRunningStats();
  const hour = new Date().getHours();
  const owned = getOwnedSpeciesIds();

  const runCtx: RunContext = {
    distanceKm: currentDistanceKm,
    paceMinPerKm: currentPace,
    streakDays: streak.currentStreak,
    totalKm: stats.totalDistanceKm + currentDistanceKm,
    hour,
  };

  // 조건 충족 포켓몬 필터
  const eligible: { id: number; weight: number; grade: 'normal' | 'rare' | 'unique' }[] = [];

  for (const speciesId of activeRegion.pokemon) {
    const gradeEntry = getPokemonGrade(speciesId);
    if (!gradeEntry || !gradeEntry.wildCondition) continue;
    if (gradeEntry.grade === 'legendary') continue;

    if (checkEncounterCondition(gradeEntry.wildCondition, runCtx)) {
      const weight = getGradeWeight(gradeEntry.grade);
      const adjustedWeight = owned.has(speciesId) ? weight * 0.3 : weight;
      if (adjustedWeight > 0) {
        eligible.push({ id: speciesId, weight: adjustedWeight, grade: gradeEntry.grade as 'normal' | 'rare' | 'unique' });
      }
    }
  }

  if (eligible.length === 0) return null;

  // 등급 가중치 랜덤 선택
  const picked = weightedPick(eligible);
  if (!picked) return null;

  const species = getPokemonById(picked.id);
  if (!species) return null;

  // 자동 포획
  catchPokemon(picked.id);
  markAsSeen([picked.id]);

  // 진동
  vibrateForGrade(picked.grade);

  const result: AutoCollectResult = {
    speciesId: picked.id,
    name: species.name,
    grade: picked.grade,
    isNew: !owned.has(picked.id),
    distanceAtEncounter: currentDistanceKm,
  };

  state.encounters.push(result);
  state.lastEncounterTime = Date.now();

  return result;
}

function weightedPick<T extends { weight: number }>(items: T[]): T | null {
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
