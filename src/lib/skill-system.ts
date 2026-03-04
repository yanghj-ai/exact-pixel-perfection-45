// ═══════════════════════════════════════════════════════════
// FIX #1: 스킬 레벨 시스템
// 스킬별 사용 횟수 추적 + 레벨 기반 해금 + 위력/명중 보너스
// ═══════════════════════════════════════════════════════════

import { getMovesForPokemon, type BattleMove, MOVE_DB } from './battle-moves';
import { getPokemonById } from './pokemon-registry';

// ─── Types ───────────────────────────────────────────────

export interface SkillState {
  usageCount: number;
  skillLevel: number; // 1-5
}

export interface PokemonSkillStates {
  [pokemonUid: string]: {
    [moveKey: string]: SkillState;
  };
}

// ─── Constants ───────────────────────────────────────────

/** 스킬 레벨별 보너스 (위력, 명중) */
export const SKILL_LEVEL_TABLE: Record<number, { powerBonus: number; accuracyBonus: number; usageRequired: number }> = {
  1: { powerBonus: 0, accuracyBonus: 0, usageRequired: 0 },
  2: { powerBonus: 5, accuracyBonus: 3, usageRequired: 10 },
  3: { powerBonus: 12, accuracyBonus: 5, usageRequired: 30 },
  4: { powerBonus: 20, accuracyBonus: 8, usageRequired: 60 },
  5: { powerBonus: 30, accuracyBonus: 10, usageRequired: 100 },
};

/** 포켓몬 레벨 → 해금 스킬 슬롯 수 */
export const SKILL_UNLOCK_LEVELS: { level: number; slots: number }[] = [
  { level: 1, slots: 1 },
  { level: 5, slots: 2 },
  { level: 12, slots: 3 },
  { level: 20, slots: 4 },
];

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'routinmon-skill-states';

export function getAllSkillStates(): PokemonSkillStates {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

function saveSkillStates(states: PokemonSkillStates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

// ─── Core Functions ──────────────────────────────────────

/** 포켓몬 레벨에 따라 해금된 스킬 슬롯 수 반환 */
export function getUnlockedSlotCount(pokemonLevel: number): number {
  let slots = 1;
  for (const entry of SKILL_UNLOCK_LEVELS) {
    if (pokemonLevel >= entry.level) slots = entry.slots;
  }
  return slots;
}

/** 포켓몬 레벨에 따라 해금된 스킬만 반환 */
export function getUnlockedMoves(speciesId: number, pokemonLevel: number): BattleMove[] {
  const allMoves = getMovesForPokemon(speciesId);
  const slots = getUnlockedSlotCount(pokemonLevel);
  return allMoves.slice(0, slots);
}

/** 스킬 사용 기록 + 레벨업 체크. 레벨업 시 true 반환 */
export function onSkillUsed(pokemonUid: string, moveKey: string): { leveledUp: boolean; newLevel: number } {
  const states = getAllSkillStates();
  if (!states[pokemonUid]) states[pokemonUid] = {};
  if (!states[pokemonUid][moveKey]) {
    states[pokemonUid][moveKey] = { usageCount: 0, skillLevel: 1 };
  }

  const skill = states[pokemonUid][moveKey];
  skill.usageCount++;

  // Check level up
  let leveledUp = false;
  for (let lv = 5; lv >= 2; lv--) {
    if (skill.skillLevel < lv && skill.usageCount >= SKILL_LEVEL_TABLE[lv].usageRequired) {
      skill.skillLevel = lv;
      leveledUp = true;
      break;
    }
  }

  saveSkillStates(states);
  return { leveledUp, newLevel: skill.skillLevel };
}

/** 스킬 레벨 보너스가 적용된 move 반환 */
export function getEffectiveMove(move: BattleMove, pokemonUid: string): BattleMove {
  const states = getAllSkillStates();
  const moveKey = findMoveKey(move);
  const skill = states[pokemonUid]?.[moveKey];
  if (!skill || skill.skillLevel <= 1) return move;

  const bonus = SKILL_LEVEL_TABLE[skill.skillLevel];
  return {
    ...move,
    power: move.power > 0 ? move.power + bonus.powerBonus : 0,
    accuracy: move.accuracy > 0 ? Math.min(100, move.accuracy + bonus.accuracyBonus) : 0,
  };
}

/** 특정 포켓몬의 스킬 상태 조회 */
export function getSkillState(pokemonUid: string, moveKey: string): SkillState {
  const states = getAllSkillStates();
  return states[pokemonUid]?.[moveKey] || { usageCount: 0, skillLevel: 1 };
}

/** 진화 시 스킬 상태 계승 (이전 uid → 새 uid 동일하므로 별도 처리 불필요) */
export function inheritSkills(pokemonUid: string, oldSpeciesId: number, newSpeciesId: number) {
  // uid가 동일하므로 스킬 상태는 자동 유지
  // 새 종의 learnset에 없는 스킬은 자연스럽게 접근 불가
}

/** MOVE_DB에서 move의 key를 찾는 헬퍼 */
export function findMoveKey(move: BattleMove): string {
  for (const [key, m] of Object.entries(MOVE_DB)) {
    if (m.name === move.name) return key;
  }
  return move.name;
}

/** 스킬 레벨 라벨 반환 */
export function getSkillLevelLabel(level: number): { label: string; color: string; emoji: string } {
  switch (level) {
    case 5: return { label: 'MAX', color: 'text-amber-400', emoji: '⭐' };
    case 4: return { label: 'Lv.4', color: 'text-purple-400', emoji: '💎' };
    case 3: return { label: 'Lv.3', color: 'text-blue-400', emoji: '🔷' };
    case 2: return { label: 'Lv.2', color: 'text-green-400', emoji: '🔹' };
    default: return { label: 'Lv.1', color: 'text-muted-foreground', emoji: '' };
  }
}

export function resetSkillStates() {
  localStorage.removeItem(STORAGE_KEY);
}
