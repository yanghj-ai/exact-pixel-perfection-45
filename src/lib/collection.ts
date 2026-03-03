// ═══════════════════════════════════════════════════════════
// 포켓몬 콜렉션 / 파티 / 친밀도 / 알 시스템
// ═══════════════════════════════════════════════════════════

import { getPokemonById, getPokemonByRarity, type Rarity, type PokemonSpecies } from './pokemon-registry';

// ─── Types ───────────────────────────────────────────────

export interface OwnedPokemon {
  uid: string; // unique instance id
  speciesId: number;
  nickname: string | null;
  friendship: number; // 0-255
  level: number;
  acquiredDate: string; // ISO date
  acquiredMethod: 'egg' | 'encounter' | 'starter' | 'event' | 'milestone';
  isInParty: boolean;
}

export interface PokemonEgg {
  id: string;
  rarity: Rarity;
  speciesId: number; // hidden until hatched
  distanceRequired: number; // km
  distanceWalked: number; // km
  acquiredDate: string;
}

export interface CollectionState {
  owned: OwnedPokemon[];
  party: string[]; // uids, max 6
  eggs: PokemonEgg[]; // max 9 eggs
  seen: number[]; // species ids that have been seen (battle encounter) but not necessarily caught
  coins: number; // Pokécoin for gacha
  totalHatched: number;
  totalEncountered: number;
}

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'routinmon-collection';

function getDefaultState(): CollectionState {
  return {
    owned: [],
    party: [],
    eggs: [],
    seen: [],
    coins: 0,
    totalHatched: 0,
    totalEncountered: 0,
  };
}

export function getCollection(): CollectionState {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return { ...getDefaultState(), ...JSON.parse(data) };
  return getDefaultState();
}

function saveCollection(state: CollectionState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Starter ─────────────────────────────────────────────

export function hasStarter(): boolean {
  return getCollection().owned.some(p => p.acquiredMethod === 'starter');
}

export function chooseStarter(speciesId: number): OwnedPokemon {
  const col = getCollection();
  const species = getPokemonById(speciesId)!;
  const pokemon: OwnedPokemon = {
    uid: `pkmn_${Date.now()}`,
    speciesId,
    nickname: null,
    friendship: 70, // starter starts friendly
    level: 5,
    acquiredDate: new Date().toISOString().split('T')[0],
    acquiredMethod: 'starter',
    isInParty: true,
  };
  col.owned.push(pokemon);
  col.party.push(pokemon.uid);
  saveCollection(col);
  return pokemon;
}

// ─── Party Management ────────────────────────────────────

export function getParty(): OwnedPokemon[] {
  const col = getCollection();
  return col.party
    .map(uid => col.owned.find(p => p.uid === uid))
    .filter(Boolean) as OwnedPokemon[];
}

export function addToParty(uid: string): boolean {
  const col = getCollection();
  if (col.party.length >= 6) return false;
  if (col.party.includes(uid)) return false;
  col.party.push(uid);
  const pokemon = col.owned.find(p => p.uid === uid);
  if (pokemon) pokemon.isInParty = true;
  saveCollection(col);
  return true;
}

export function removeFromParty(uid: string): boolean {
  const col = getCollection();
  if (col.party.length <= 1) return false; // must have at least 1
  col.party = col.party.filter(u => u !== uid);
  const pokemon = col.owned.find(p => p.uid === uid);
  if (pokemon) pokemon.isInParty = false;
  saveCollection(col);
  return true;
}

/** Reorder party: move a member to a new index */
export function reorderParty(fromIndex: number, toIndex: number): boolean {
  const col = getCollection();
  if (fromIndex < 0 || fromIndex >= col.party.length) return false;
  if (toIndex < 0 || toIndex >= col.party.length) return false;
  if (fromIndex === toIndex) return false;
  const [moved] = col.party.splice(fromIndex, 1);
  col.party.splice(toIndex, 0, moved);
  saveCollection(col);
  return true;
}

/** Set a party member as the leader (move to index 0) */
export function setAsLeader(uid: string): boolean {
  const col = getCollection();
  const idx = col.party.indexOf(uid);
  if (idx <= 0) return false; // already leader or not found
  col.party.splice(idx, 1);
  col.party.unshift(uid);
  saveCollection(col);
  return true;
}

// ─── Friendship ──────────────────────────────────────────

export function getFriendshipLevel(friendship: number): { level: number; label: string; emoji: string } {
  if (friendship >= 220) return { level: 5, label: '최고의 친구', emoji: '💖' };
  if (friendship >= 170) return { level: 4, label: '절친한 사이', emoji: '❤️' };
  if (friendship >= 120) return { level: 3, label: '친한 사이', emoji: '😊' };
  if (friendship >= 70) return { level: 2, label: '보통', emoji: '🙂' };
  if (friendship >= 30) return { level: 1, label: '낯선 사이', emoji: '😐' };
  return { level: 0, label: '경계 중', emoji: '😨' };
}

export function interactWithPokemon(uid: string): { pokemon: OwnedPokemon; message: string } {
  const col = getCollection();
  const pokemon = col.owned.find(p => p.uid === uid);
  if (!pokemon) throw new Error('Pokemon not found');

  const oldLevel = getFriendshipLevel(pokemon.friendship).level;
  pokemon.friendship = Math.min(255, pokemon.friendship + 3);
  const newLevel = getFriendshipLevel(pokemon.friendship).level;

  const species = getPokemonById(pokemon.speciesId)!;
  let message: string;

  if (newLevel > oldLevel) {
    message = `${pokemon.nickname || species.name}와(과) 더 친해졌다! ${getFriendshipLevel(pokemon.friendship).emoji}`;
  } else {
    const msgs = [
      `${pokemon.nickname || species.name}이(가) 기뻐하고 있다!`,
      `${pokemon.nickname || species.name}이(가) 다가왔다!`,
      `${pokemon.nickname || species.name}이(가) 꼬리를 흔들었다!`,
      `${pokemon.nickname || species.name}이(가) 기분 좋아 보인다!`,
    ];
    message = msgs[Math.floor(Math.random() * msgs.length)];
  }

  saveCollection(col);
  return { pokemon, message };
}

export function feedPokemon(uid: string, foodCount: number): { pokemon: OwnedPokemon; foodUsed: number } | null {
  if (foodCount <= 0) return null;
  const col = getCollection();
  const pokemon = col.owned.find(p => p.uid === uid);
  if (!pokemon) return null;

  pokemon.friendship = Math.min(255, pokemon.friendship + 5);
  saveCollection(col);
  return { pokemon, foodUsed: 1 };
}

// ─── Egg System ──────────────────────────────────────────

const EGG_DISTANCE: Record<Rarity, number> = {
  common: 2,
  uncommon: 5,
  rare: 10,
  epic: 15,
  legendary: 25,
};

function pickRandomSpecies(rarity: Rarity): number {
  const candidates = getPokemonByRarity(rarity);
  // Prefer base forms (no evolveFrom) for eggs
  const baseFormsOnly = candidates.filter(p => p.evolveFrom === null);
  const pool = baseFormsOnly.length > 0 ? baseFormsOnly : candidates;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function createEgg(rarity: Rarity): PokemonEgg | null {
  const col = getCollection();
  if (col.eggs.length >= 9) return null; // egg storage full

  const egg: PokemonEgg = {
    id: `egg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    rarity,
    speciesId: pickRandomSpecies(rarity),
    distanceRequired: EGG_DISTANCE[rarity],
    distanceWalked: 0,
    acquiredDate: new Date().toISOString().split('T')[0],
  };

  col.eggs.push(egg);
  saveCollection(col);
  return egg;
}

export function addDistanceToEggs(distanceKm: number): PokemonEgg[] {
  const col = getCollection();
  const hatched: PokemonEgg[] = [];

  for (const egg of col.eggs) {
    egg.distanceWalked += distanceKm;
    if (egg.distanceWalked >= egg.distanceRequired) {
      hatched.push(egg);
    }
  }

  // Remove hatched eggs and add Pokemon
  for (const egg of hatched) {
    col.eggs = col.eggs.filter(e => e.id !== egg.id);
    const species = getPokemonById(egg.speciesId)!;
    const pokemon: OwnedPokemon = {
      uid: `pkmn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      speciesId: egg.speciesId,
      nickname: null,
      friendship: 50,
      level: 1,
      acquiredDate: new Date().toISOString().split('T')[0],
      acquiredMethod: 'egg',
      isInParty: false,
    };
    col.owned.push(pokemon);
    col.totalHatched++;
  }

  saveCollection(col);
  return hatched;
}

// ─── Encounter System (during running) ──────────────────

export function triggerEncounter(distanceKm: number): PokemonSpecies | null {
  // 30% chance per km over 1km
  const chance = Math.min(0.8, distanceKm * 0.15);
  if (Math.random() > chance) return null;

  // Rarity roll
  const roll = Math.random();
  let rarity: Rarity;
  if (roll < 0.01) rarity = 'legendary';
  else if (roll < 0.05) rarity = 'epic';
  else if (roll < 0.15) rarity = 'rare';
  else if (roll < 0.45) rarity = 'uncommon';
  else rarity = 'common';

  const candidates = getPokemonByRarity(rarity).filter(p => p.evolveFrom === null);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function catchPokemon(speciesId: number): OwnedPokemon {
  const col = getCollection();
  const pokemon: OwnedPokemon = {
    uid: `pkmn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    speciesId,
    nickname: null,
    friendship: 30,
    level: 1,
    acquiredDate: new Date().toISOString().split('T')[0],
    acquiredMethod: 'encounter',
    isInParty: false,
  };
  col.owned.push(pokemon);
  col.totalEncountered++;
  saveCollection(col);
  return pokemon;
}

// ─── Coin System ─────────────────────────────────────────

export function addCoins(amount: number) {
  const col = getCollection();
  col.coins = Math.max(0, col.coins + amount); // never go below 0
  saveCollection(col);
}

export function getCoins(): number {
  return getCollection().coins;
}

// ─── Collection Stats ────────────────────────────────────

export function getCollectionStats() {
  const col = getCollection();
  const uniqueSpecies = new Set(col.owned.map(p => p.speciesId));
  return {
    totalOwned: col.owned.length,
    uniqueSpecies: uniqueSpecies.size,
    totalPossible: 151,
    completionRate: Math.round((uniqueSpecies.size / 151) * 100),
    totalHatched: col.totalHatched,
    totalEncountered: col.totalEncountered,
    partySize: col.party.length,
    eggCount: col.eggs.length,
    coins: col.coins,
  };
}

export function getOwnedSpeciesIds(): Set<number> {
  return new Set(getCollection().owned.map(p => p.speciesId));
}

export function getSeenSpeciesIds(): Set<number> {
  const col = getCollection();
  const seen = new Set(col.seen || []);
  // Owned pokemon are also considered seen
  for (const p of col.owned) seen.add(p.speciesId);
  return seen;
}

export function markAsSeen(speciesIds: number[]) {
  const col = getCollection();
  if (!col.seen) col.seen = [];
  let changed = false;
  for (const id of speciesIds) {
    if (!col.seen.includes(id)) {
      col.seen.push(id);
      changed = true;
    }
  }
  if (changed) saveCollection(col);
}

export function setNickname(uid: string, nickname: string) {
  const col = getCollection();
  const pokemon = col.owned.find(p => p.uid === uid);
  if (pokemon) {
    pokemon.nickname = nickname || null;
    saveCollection(col);
  }
}

export function resetCollection() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Pet ↔ Collection Sync ──────────────────────────────
// The "pet" system tracks the main starter's level/stage,
// but the collection keeps its own level/speciesId.
// This function syncs them so battles use the correct data.

/** Map pet stage to species id */
function stageToSpeciesId(stage: string): number {
  switch (stage) {
    case 'charmeleon': return 5;
    case 'charizard': return 6;
    default: return 4; // charmander
  }
}

/**
 * Sync pet level & evolution to the starter pokemon in the collection.
 * Called after every grantRewards / level-up.
 */
export function syncStarterWithPet(level: number, stage: string) {
  const col = getCollection();
  const starter = col.owned.find(p => p.acquiredMethod === 'starter');
  if (!starter) return;

  const newSpeciesId = stageToSpeciesId(stage);
  starter.level = level;

  // If evolved, update species id and mark new species as owned
  if (starter.speciesId !== newSpeciesId) {
    starter.speciesId = newSpeciesId;
  }

  saveCollection(col);
}
