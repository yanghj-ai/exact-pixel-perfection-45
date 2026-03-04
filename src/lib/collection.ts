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

/** Ensure starter exists and is the currently selected one */
export function upsertStarter(speciesId: number): OwnedPokemon {
  const col = getCollection();
  const existingStarter = col.owned.find(p => p.acquiredMethod === 'starter');

  if (!existingStarter) {
    return chooseStarter(speciesId);
  }

  existingStarter.speciesId = speciesId;
  existingStarter.level = 5;
  existingStarter.friendship = 70;
  existingStarter.nickname = null;
  existingStarter.isInParty = true;

  // Move starter to party leader position
  if (!col.party.includes(existingStarter.uid)) {
    col.party.unshift(existingStarter.uid);
  }
  col.party = [existingStarter.uid, ...col.party.filter(uid => uid !== existingStarter.uid)].slice(0, 6);

  saveCollection(col);
  return existingStarter;
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

  // Also consume food from pet state (direct localStorage to avoid circular import)
  const petData = localStorage.getItem('routinmon-pet');
  if (petData) {
    const pet = JSON.parse(petData);
    if (pet.foodCount > 0) {
      pet.foodCount = pet.foodCount - 1;
      localStorage.setItem('routinmon-pet', JSON.stringify(pet));
    }
  }

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
    const partyCount = col.party.length;
    const autoAddToParty = partyCount < 6;
    const pokemon: OwnedPokemon = {
      uid: `pkmn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      speciesId: egg.speciesId,
      nickname: null,
      friendship: 50,
      level: 1,
      acquiredDate: new Date().toISOString().split('T')[0],
      acquiredMethod: 'egg',
      isInParty: autoAddToParty,
    };
    if (autoAddToParty) {
      col.party.push(pokemon.uid);
    }
    col.owned.push(pokemon);
    col.totalHatched++;
  }

  saveCollection(col);
  return hatched;
}

// ─── Party EXP System ────────────────────────────────────

export interface PartyExpResult {
  uid: string;
  speciesId: number;
  name: string;
  expGained: number;
  levelBefore: number;
  levelAfter: number;
  evolved: boolean;
  evolvedTo?: number;
}

/** Grant EXP to all party Pokémon (from running, battles, etc.) */
export function grantExpToParty(totalExp: number): PartyExpResult[] {
  const col = getCollection();
  const partyMembers = col.party
    .map(uid => col.owned.find(p => p.uid === uid))
    .filter(Boolean) as OwnedPokemon[];

  if (partyMembers.length === 0) return [];

  const expPerMember = Math.max(1, Math.floor(totalExp / partyMembers.length));
  const results: PartyExpResult[] = [];

  for (const pokemon of partyMembers) {
    const species = getPokemonById(pokemon.speciesId);
    if (!species) continue;

    const levelBefore = pokemon.level;
    // Simple EXP formula: need (level * 25) EXP per level
    let remainingExp = expPerMember;
    let currentLevel = pokemon.level;

    while (remainingExp > 0) {
      const neededForLevel = currentLevel * 25;
      if (remainingExp >= neededForLevel) {
        remainingExp -= neededForLevel;
        currentLevel++;
        if (currentLevel > 100) { currentLevel = 100; break; }
      } else {
        break;
      }
    }

    pokemon.level = currentLevel;

    // Check evolution
    let evolved = false;
    let evolvedTo: number | undefined;
    if (species.evolveTo.length > 0 && species.evolveLevel && currentLevel >= species.evolveLevel) {
      const nextSpeciesId = species.evolveTo[0];
      pokemon.speciesId = nextSpeciesId;
      evolved = true;
      evolvedTo = nextSpeciesId;
      // Auto-register evolved species in pokedex
      if (!col.seen) col.seen = [];
      if (!col.seen.includes(nextSpeciesId)) col.seen.push(nextSpeciesId);
    }

    // Boost friendship slightly on level up
    if (currentLevel > levelBefore) {
      pokemon.friendship = Math.min(255, pokemon.friendship + (currentLevel - levelBefore) * 2);
    }

    results.push({
      uid: pokemon.uid,
      speciesId: pokemon.speciesId,
      name: species.name,
      expGained: expPerMember,
      levelBefore,
      levelAfter: currentLevel,
      evolved,
      evolvedTo,
    });
  }

  saveCollection(col);
  return results;
}

// ─── Encounter System (during running) ──────────────────

/** Returns encountered species with rarity (no legendary — those use legendary.ts) */
export function triggerEncounter(distanceKm: number): PokemonSpecies | null {
  // 30% chance per km over 1km
  const chance = Math.min(0.8, distanceKm * 0.15);
  if (Math.random() > chance) return null;

  // Rarity roll (no legendary here)
  const roll = Math.random();
  let rarity: Rarity;
  if (roll < 0.05) rarity = 'epic';
  else if (roll < 0.15) rarity = 'rare';
  else if (roll < 0.45) rarity = 'uncommon';
  else rarity = 'common';

  // Exclude legendary/special event species
  const EXCLUDED_IDS = new Set([131, 132, 133, 143, 144, 145, 146, 150, 151]);
  const candidates = getPokemonByRarity(rarity).filter(p => p.evolveFrom === null && !EXCLUDED_IDS.has(p.id));
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
// Pet level is the source of truth for starter level.
// Starter evolution family is determined by selected starter species.

const STARTER_CHAINS: number[][] = [
  [1, 2, 3], // Bulbasaur line
  [4, 5, 6], // Charmander line
  [7, 8, 9], // Squirtle line
];

const STARTER_NAME_TO_BASE: Record<string, number> = {
  '이상해씨': 1,
  '이상해풀': 1,
  '이상해꽃': 1,
  '파이리': 4,
  '리자드': 4,
  '리자몽': 4,
  '꼬부기': 7,
  '어니부기': 7,
  '거북왕': 7,
};

function resolveStarterSpecies(currentSpeciesId: number, level: number, petName?: string): number {
  const baseByName = petName ? STARTER_NAME_TO_BASE[petName] : undefined;
  const chain = STARTER_CHAINS.find(c => c.includes(baseByName ?? currentSpeciesId)) ?? [4, 5, 6];

  if (level >= 36) return chain[2];
  if (level >= 16) return chain[1];
  return chain[0];
}

/**
 * Sync starter level/evolution from pet level.
 * Returns synced starter speciesId (or null when starter does not exist).
 */
export function syncStarterWithPet(level: number, _stage: string, petName?: string): number | null {
  const col = getCollection();
  const starter = col.owned.find(p => p.acquiredMethod === 'starter');
  if (!starter) return null;

  const oldSpeciesId = starter.speciesId;
  starter.level = level;
  starter.speciesId = resolveStarterSpecies(starter.speciesId, level, petName);
  // Auto-register evolved species in pokedex
  if (starter.speciesId !== oldSpeciesId) {
    if (!col.seen) col.seen = [];
    if (!col.seen.includes(starter.speciesId)) col.seen.push(starter.speciesId);
  }
  saveCollection(col);

  return starter.speciesId;
}
