// ═══════════════════════════════════════════════════════════
// 포켓몬 부상 & 회복 시스템
// 배틀 후 남은 HP를 영구 저장, 포켓몬 센터/시간 회복 필요
// ═══════════════════════════════════════════════════════════

const HEALTH_STORAGE = 'routinmon-pokemon-health';
const HEAL_TIME_MINUTES = 30;

import { getCachedHealthState, setCachedHealthState, isCloudReady } from './cloud-storage';

export interface PokemonHealthState {
  injuries: Record<string, { hpRatio: number; injuredAt: string }>;
  lastHealAllAt: string | null;
}

function getState(): PokemonHealthState {
  if (isCloudReady()) {
    const cached = getCachedHealthState();
    if (cached) return cached;
  }
  const data = localStorage.getItem(HEALTH_STORAGE);
  if (data) return JSON.parse(data);
  return { injuries: {}, lastHealAllAt: null };
}

function saveState(state: PokemonHealthState) {
  localStorage.setItem(HEALTH_STORAGE, JSON.stringify(state));
  if (isCloudReady()) {
    setCachedHealthState(state);
  }
}

/**
 * After battle: store remaining HP ratios for each party pokemon
 */
export function applyBattleDamage(partyHpRatios: { uid: string; hpRatio: number }[]) {
  const state = getState();
  const now = new Date().toISOString();

  for (const { uid, hpRatio } of partyHpRatios) {
    if (hpRatio < 1) {
      state.injuries[uid] = { hpRatio: Math.max(0, hpRatio), injuredAt: now };
    } else {
      // Full HP — remove any existing injury
      delete state.injuries[uid];
    }
  }
  saveState(state);
}

/**
 * Get effective HP ratio for a pokemon (0-1).
 * Considers natural time-based healing.
 */
export function getEffectiveHpRatio(uid: string): number {
  const state = getState();
  const injury = state.injuries[uid];
  if (!injury) return 1;

  // Time-based natural healing
  const now = Date.now();
  const injuredAt = new Date(injury.injuredAt).getTime();
  const minutesPassed = (now - injuredAt) / (1000 * 60);

  // Heal linearly over HEAL_TIME_MINUTES
  const timeHealing = Math.min(1, minutesPassed / HEAL_TIME_MINUTES);
  const currentRatio = injury.hpRatio + (1 - injury.hpRatio) * timeHealing;

  if (currentRatio >= 0.99) {
    // Fully healed — clean up
    delete state.injuries[uid];
    saveState(state);
    return 1;
  }

  return Math.min(1, currentRatio);
}

/**
 * Check if a pokemon is able to battle (HP > 0)
 */
export function canBattle(uid: string): boolean {
  return getEffectiveHpRatio(uid) > 0;
}

/**
 * Get number of injured pokemon
 */
export function getInjuredCount(): number {
  const state = getState();
  let count = 0;
  for (const uid of Object.keys(state.injuries)) {
    if (getEffectiveHpRatio(uid) < 1) count++;
  }
  return count;
}

/**
 * Get all injuries with current HP ratios
 */
export function getAllInjuries(): { uid: string; hpRatio: number; minutesLeft: number }[] {
  const state = getState();
  const result: { uid: string; hpRatio: number; minutesLeft: number }[] = [];

  for (const [uid, injury] of Object.entries(state.injuries)) {
    const currentRatio = getEffectiveHpRatio(uid);
    if (currentRatio < 1) {
      const now = Date.now();
      const injuredAt = new Date(injury.injuredAt).getTime();
      const minutesPassed = (now - injuredAt) / (1000 * 60);
      const minutesLeft = Math.max(0, Math.ceil(HEAL_TIME_MINUTES - minutesPassed));
      result.push({ uid, hpRatio: currentRatio, minutesLeft });
    }
  }
  return result;
}

/**
 * Pokemon Center: instantly heal all pokemon (costs coins)
 */
export function healAllAtCenter(): { healed: number } {
  const state = getState();
  const healedCount = Object.keys(state.injuries).length;
  state.injuries = {};
  state.lastHealAllAt = new Date().toISOString();
  saveState(state);
  return { healed: healedCount };
}

/**
 * Heal a single pokemon (e.g. with potion item)
 */
export function healSingle(uid: string, healAmount: number = 1): number {
  const state = getState();
  const injury = state.injuries[uid];
  if (!injury) return 1;

  const newRatio = Math.min(1, injury.hpRatio + healAmount);
  if (newRatio >= 1) {
    delete state.injuries[uid];
  } else {
    injury.hpRatio = newRatio;
  }
  saveState(state);
  return newRatio;
}

export function resetHealthData() {
  localStorage.removeItem(HEALTH_STORAGE);
}
