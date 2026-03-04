/**
 * Cloud Storage Cache Layer
 * 
 * Loads data from Supabase into an in-memory cache on app start.
 * Provides synchronous reads and fire-and-forget async writes to DB.
 * This preserves the synchronous API that all consumers depend on.
 */
import { supabase } from '@/integrations/supabase/client';
import type { UserProfile } from './storage';
import type { PetState } from './pet';
import type { CollectionState, OwnedPokemon, PokemonEgg } from './collection';

// ─── In-memory cache ────────────────────────────────────
let _userId: string | null = null;
let _profile: UserProfile | null = null;
let _pet: PetState | null = null;
let _collection: CollectionState | null = null;
let _initialized = false;

export function isCloudReady(): boolean {
  return _initialized && _userId !== null;
}

export function getCloudUserId(): string | null {
  return _userId;
}

// ─── Profile Cache ──────────────────────────────────────

export function getCachedProfile(): UserProfile | null {
  return _profile;
}

export function setCachedProfile(profile: UserProfile) {
  _profile = profile;
  if (_userId) {
    supabase.from('profiles').update({
      name: profile.name,
      off_work_time: profile.offWorkTime,
      streak: profile.streak,
      last_completed_date: profile.lastCompletedDate,
      notifications_enabled: profile.notificationsEnabled,
      dark_mode: profile.darkMode,
      last_login_date: profile.lastLoginDate,
      consecutive_login_days: profile.consecutiveLoginDays,
    }).eq('id', _userId).then(({ error }) => {
      if (error) console.error('Profile sync error:', error);
    });
  }
}

// ─── Pet Cache ──────────────────────────────────────────

export function getCachedPet(): PetState | null {
  return _pet;
}

export function setCachedPet(pet: PetState) {
  _pet = pet;
  if (_userId) {
    supabase.from('pets').upsert({
      user_id: _userId,
      name: pet.name,
      level: pet.level,
      exp: pet.exp,
      hp: pet.hp,
      max_hp: pet.maxHp,
      happiness: pet.happiness,
      stage: pet.stage,
      food_count: pet.foodCount,
      total_food_collected: pet.totalFoodCollected,
      last_hp_decay: pet.lastHpDecay,
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.error('Pet sync error:', error);
    });
  }
}

// ─── Collection Cache ───────────────────────────────────

export function getCachedCollection(): CollectionState | null {
  return _collection;
}

export function setCachedCollection(col: CollectionState) {
  _collection = col;
  if (_userId) {
    // Sync top-level collection data
    const seenIds = col.seen || [];
    const encounteredIds = col.owned.map(p => p.speciesId);
    supabase.from('collections').upsert({
      user_id: _userId,
      coins: col.coins,
      seen_species_ids: seenIds,
      encountered_species_ids: [...new Set(encounteredIds)],
      starter_chosen: col.owned.some(p => p.acquiredMethod === 'starter'),
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.error('Collection sync error:', error);
    });
  }
}

/** Sync all owned pokemon to DB (full replace strategy) */
export function syncOwnedPokemonToDB(owned: OwnedPokemon[]) {
  if (!_userId) return;
  const rows = owned.map(p => ({
    user_id: _userId!,
    uid: p.uid,
    species_id: p.speciesId,
    nickname: p.nickname || null,
    friendship: p.friendship,
    level: p.level,
    acquired_date: p.acquiredDate,
    acquired_method: p.acquiredMethod,
    is_in_party: p.isInParty,
  }));
  if (rows.length > 0) {
    supabase.from('owned_pokemon').upsert(rows, { onConflict: 'user_id,uid' })
      .then(({ error }) => {
        if (error) console.error('Pokemon sync error:', error);
      });
  }
}

/** Sync eggs to DB */
export function syncEggsToDB(eggs: PokemonEgg[]) {
  if (!_userId) return;
  // Delete old eggs then insert current
  supabase.from('pokemon_eggs').delete().eq('user_id', _userId).then(() => {
    if (eggs.length > 0) {
      const rows = eggs.map(e => ({
        user_id: _userId!,
        egg_id: e.id,
        rarity: e.rarity,
        distance_walked: e.distanceWalked,
        distance_required: e.distanceRequired,
        hatched: false,
        hatched_species_id: null,
      }));
      supabase.from('pokemon_eggs').insert(rows).then(({ error }) => {
        if (error) console.error('Egg sync error:', error);
      });
    }
  });
}

// ─── Initialization ─────────────────────────────────────

export async function initializeCloudCache(userId: string): Promise<void> {
  _userId = userId;

  // Load profile
  const { data: profileRow } = await supabase
    .from('profiles').select('*').eq('id', userId).maybeSingle();

  if (profileRow) {
    _profile = {
      name: profileRow.name || '',
      offWorkTime: profileRow.off_work_time || '18:00',
      onboardingComplete: true, // if profile exists in DB, onboarding is done
      streak: profileRow.streak || 0,
      lastCompletedDate: profileRow.last_completed_date || null,
      notificationsEnabled: profileRow.notifications_enabled ?? true,
      darkMode: profileRow.dark_mode ?? true,
      lastLoginDate: profileRow.last_login_date || null,
      consecutiveLoginDays: profileRow.consecutive_login_days || 0,
    };
  }

  // Load pet
  const { data: petRow } = await supabase
    .from('pets').select('*').eq('user_id', userId).maybeSingle();

  if (petRow) {
    _pet = {
      name: petRow.name || '파이리',
      level: petRow.level || 1,
      exp: petRow.exp || 0,
      hp: petRow.hp || 80,
      maxHp: petRow.max_hp || 100,
      happiness: petRow.happiness ?? 3,
      stage: (petRow.stage as any) || 'charmander',
      foodCount: petRow.food_count || 0,
      totalFoodCollected: petRow.total_food_collected || 0,
      lastHpDecay: petRow.last_hp_decay || null,
    };
  }

  // Load collection
  const { data: colRow } = await supabase
    .from('collections').select('*').eq('user_id', userId).maybeSingle();

  const { data: ownedRows } = await supabase
    .from('owned_pokemon').select('*').eq('user_id', userId);

  const { data: eggRows } = await supabase
    .from('pokemon_eggs').select('*').eq('user_id', userId).eq('hatched', false);

  const owned: OwnedPokemon[] = (ownedRows || []).map(r => ({
    uid: r.uid,
    speciesId: r.species_id,
    nickname: r.nickname || null,
    friendship: r.friendship || 70,
    level: r.level || 1,
    acquiredDate: r.acquired_date || '',
    acquiredMethod: r.acquired_method as any || 'encounter',
    isInParty: r.is_in_party || false,
  }));

  const eggs: PokemonEgg[] = (eggRows || []).map(r => ({
    id: r.egg_id,
    rarity: r.rarity as any || 'common',
    speciesId: r.hatched_species_id || 0,
    distanceRequired: r.distance_required || 2,
    distanceWalked: r.distance_walked || 0,
    acquiredDate: r.created_at?.split('T')[0] || '',
  }));

  const party = owned.filter(p => p.isInParty).map(p => p.uid);

  _collection = {
    owned,
    party,
    eggs,
    seen: colRow?.seen_species_ids || [],
    coins: colRow?.coins || 0,
    totalHatched: 0,
    totalEncountered: colRow?.encountered_species_ids?.length || 0,
  };

  // Also write to localStorage as fallback for any code that still reads it
  if (_profile) {
    localStorage.setItem('routinmon-profile', JSON.stringify(_profile));
  }
  if (_pet) {
    localStorage.setItem('routinmon-pet', JSON.stringify(_pet));
  }
  if (_collection) {
    localStorage.setItem('routinmon-collection', JSON.stringify(_collection));
  }

  _initialized = true;
}

/** Reset cache (on logout) */
export function clearCloudCache() {
  _userId = null;
  _profile = null;
  _pet = null;
  _collection = null;
  _initialized = false;
}
