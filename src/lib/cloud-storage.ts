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
import type { RunningStats } from './running';
import type { PokemonHealthState } from './pokemon-health';

// ─── In-memory cache ────────────────────────────────────
let _userId: string | null = null;
let _profile: UserProfile | null = null;
let _pet: PetState | null = null;
let _collection: CollectionState | null = null;
let _runningStats: RunningStats | null = null;
let _inventory: { items: Record<string, number> } | null = null;
let _legendaryState: { caught: number[]; encounters: number; lastEncounterDate: string | null; weeklyGoalStreakCount: number } | null = null;
let _healthState: PokemonHealthState | null = null;
let _catchQuestState: { activeQuests: any[]; completedCount: number; failedCount: number } | null = null;
let _battleRecords: any[] | null = null;
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

export function syncEggsToDB(eggs: PokemonEgg[]) {
  if (!_userId) return;
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

// ─── Running Stats Cache ────────────────────────────────

export function getCachedRunningStats(): RunningStats | null {
  return _runningStats;
}

export function setCachedRunningStats(stats: RunningStats) {
  _runningStats = stats;
  if (_userId) {
    supabase.from('running_stats').upsert({
      user_id: _userId,
      total_distance_km: stats.totalDistanceKm,
      total_sessions: stats.totalSessions,
      total_duration_seconds: stats.totalDurationSeconds,
      best_pace_min_per_km: stats.bestPaceMinPerKm,
      longest_run_km: stats.longestRunKm,
      current_streak: stats.currentStreak,
      goals: stats.goals as any,
      challenges: stats.challenges as any,
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.error('Running stats sync error:', error);
    });
  }
}

export function syncRunningSessionToDB(session: any) {
  if (!_userId) return;
  supabase.from('running_sessions').upsert({
    user_id: _userId,
    session_id: session.id,
    session_date: session.date,
    start_time: session.startTime,
    end_time: session.endTime,
    distance_km: session.distanceKm,
    duration_seconds: session.durationSeconds,
    pace_min_per_km: session.paceMinPerKm,
    route: session.route as any,
    calories_burned: session.caloriesBurned,
    reward_granted: session.rewardGranted,
  }, { onConflict: 'user_id,session_id' }).then(({ error }) => {
    if (error) console.error('Session sync error:', error);
  });
}

// ─── Inventory Cache ────────────────────────────────────

export function getCachedInventory(): { items: Record<string, number> } | null {
  return _inventory;
}

export function setCachedInventory(inv: { items: Record<string, number> }) {
  _inventory = inv;
  if (_userId) {
    supabase.from('inventory').upsert({
      user_id: _userId,
      items: inv.items as any,
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.error('Inventory sync error:', error);
    });
  }
}

// ─── Legendary State Cache ──────────────────────────────

export function getCachedLegendaryState() {
  return _legendaryState;
}

export function setCachedLegendaryState(state: { caught: number[]; encounters: number; lastEncounterDate: string | null; weeklyGoalStreakCount: number }) {
  _legendaryState = state;
  if (_userId) {
    supabase.from('legendary_state').upsert({
      user_id: _userId,
      caught: state.caught,
      encounters: state.encounters,
      last_encounter_date: state.lastEncounterDate,
      weekly_goal_streak_count: state.weeklyGoalStreakCount,
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.error('Legendary sync error:', error);
    });
  }
}

// ─── Pokemon Health Cache ───────────────────────────────

export function getCachedHealthState(): PokemonHealthState | null {
  return _healthState;
}

export function setCachedHealthState(state: PokemonHealthState) {
  _healthState = state;
  if (_userId) {
    supabase.from('pokemon_health').upsert({
      user_id: _userId,
      injuries: state.injuries as any,
      last_heal_all_at: state.lastHealAllAt,
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.error('Health sync error:', error);
    });
  }
}

// ─── Catch Quest Cache ──────────────────────────────────

export function getCachedCatchQuestState() {
  return _catchQuestState;
}

export function setCachedCatchQuestState(state: { activeQuests: any[]; completedCount: number; failedCount: number }) {
  _catchQuestState = state;
  if (_userId) {
    supabase.from('catch_quests').upsert({
      user_id: _userId,
      active_quests: state.activeQuests as any,
      completed_count: state.completedCount,
      failed_count: state.failedCount,
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.error('Quest sync error:', error);
    });
  }
}

// ─── Battle Records Cache ───────────────────────────────

export function getCachedBattleRecords(): any[] | null {
  return _battleRecords;
}

export function setCachedBattleRecords(records: any[]) {
  _battleRecords = records;
  // Battle records are append-only, synced individually via syncBattleRecordToDB
}

export function syncBattleRecordToDB(record: any) {
  if (!_userId) return;
  supabase.from('battle_records').insert({
    user_id: _userId,
    battle_id: record.id,
    battle_date: record.date,
    opponent_name: record.opponentName,
    result: record.result,
    coins_earned: record.coinsEarned || 0,
    exp_earned: record.expEarned || 0,
  }).then(({ error }) => {
    if (error) console.error('Battle record sync error:', error);
  });
}

// ─── Initialization ─────────────────────────────────────

export async function initializeCloudCache(userId: string): Promise<void> {
  _userId = userId;

  // Load all data in parallel
  const [
    { data: profileRow },
    { data: petRow },
    { data: colRow },
    { data: ownedRows },
    { data: eggRows },
    { data: runStatsRow },
    { data: sessionRows },
    { data: invRow },
    { data: legRow },
    { data: healthRow },
    { data: questRow },
    { data: battleRows },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('pets').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('collections').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('owned_pokemon').select('*').eq('user_id', userId),
    supabase.from('pokemon_eggs').select('*').eq('user_id', userId).eq('hatched', false),
    supabase.from('running_stats').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('running_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('inventory').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('legendary_state').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('pokemon_health').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('catch_quests').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('battle_records').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
  ]);

  // Profile
  if (profileRow) {
    _profile = {
      name: profileRow.name || '',
      offWorkTime: profileRow.off_work_time || '18:00',
      onboardingComplete: true,
      streak: profileRow.streak || 0,
      lastCompletedDate: profileRow.last_completed_date || null,
      notificationsEnabled: profileRow.notifications_enabled ?? true,
      darkMode: profileRow.dark_mode ?? true,
      lastLoginDate: profileRow.last_login_date || null,
      consecutiveLoginDays: profileRow.consecutive_login_days || 0,
    };
  }

  // Pet
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

  // Collection
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
    pokedex: {},
    coins: colRow?.coins || 0,
    totalHatched: 0,
    totalEncountered: colRow?.encountered_species_ids?.length || 0,
  };

  // Running Stats
  const sessions = (sessionRows || []).map(s => ({
    id: s.session_id,
    date: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    distanceKm: s.distance_km,
    durationSeconds: s.duration_seconds,
    paceMinPerKm: s.pace_min_per_km,
    route: s.route as any || [],
    caloriesBurned: s.calories_burned,
    rewardGranted: s.reward_granted,
  }));

  _runningStats = {
    totalDistanceKm: runStatsRow?.total_distance_km || 0,
    totalSessions: runStatsRow?.total_sessions || 0,
    totalDurationSeconds: runStatsRow?.total_duration_seconds || 0,
    bestPaceMinPerKm: runStatsRow?.best_pace_min_per_km || null,
    longestRunKm: runStatsRow?.longest_run_km || 0,
    currentStreak: runStatsRow?.current_streak || 0,
    sessions,
    goals: (runStatsRow?.goals as any) || [],
    challenges: (runStatsRow?.challenges as any) || [],
  };

  // Inventory
  _inventory = {
    items: (invRow?.items as any) || {},
  };

  // Legendary
  _legendaryState = {
    caught: legRow?.caught || [],
    encounters: legRow?.encounters || 0,
    lastEncounterDate: legRow?.last_encounter_date || null,
    weeklyGoalStreakCount: legRow?.weekly_goal_streak_count || 0,
  };

  // Health
  _healthState = {
    injuries: (healthRow?.injuries as any) || {},
    lastHealAllAt: healthRow?.last_heal_all_at || null,
  };

  // Catch Quests
  _catchQuestState = {
    activeQuests: (questRow?.active_quests as any) || [],
    completedCount: questRow?.completed_count || 0,
    failedCount: questRow?.failed_count || 0,
  };

  // Battle Records
  _battleRecords = (battleRows || []).map(r => ({
    id: r.battle_id,
    date: r.battle_date,
    opponentName: r.opponent_name,
    result: r.result,
    coinsEarned: r.coins_earned,
    expEarned: r.exp_earned,
  }));

  // Write to localStorage as fallback
  if (_profile) localStorage.setItem('routinmon-profile', JSON.stringify(_profile));
  if (_pet) localStorage.setItem('routinmon-pet', JSON.stringify(_pet));
  if (_collection) localStorage.setItem('routinmon-collection', JSON.stringify(_collection));
  if (_runningStats) localStorage.setItem('routinmon-running', JSON.stringify(_runningStats));
  if (_inventory) localStorage.setItem('routinmon-inventory', JSON.stringify(_inventory));
  if (_legendaryState) localStorage.setItem('routinmon-legendary', JSON.stringify(_legendaryState));
  if (_healthState) localStorage.setItem('routinmon-pokemon-health', JSON.stringify(_healthState));
  if (_catchQuestState) localStorage.setItem('routinmon-catch-quests', JSON.stringify(_catchQuestState));
  if (_battleRecords) localStorage.setItem('routinmon-battles', JSON.stringify(_battleRecords));

  _initialized = true;
}

/** Reset cache (on logout) */
export function clearCloudCache() {
  _userId = null;
  _profile = null;
  _pet = null;
  _collection = null;
  _runningStats = null;
  _inventory = null;
  _legendaryState = null;
  _healthState = null;
  _catchQuestState = null;
  _battleRecords = null;
  _initialized = false;
}
