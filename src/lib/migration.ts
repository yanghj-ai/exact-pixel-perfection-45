import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const MIGRATION_KEY = 'routinmon-cloud-migrated';

/**
 * Migrate localStorage data to Supabase on first login.
 * This runs once per user and marks migration as complete.
 */
export async function migrateLocalStorageToCloud(user: User): Promise<boolean> {
  // Check if already migrated
  if (localStorage.getItem(MIGRATION_KEY) === user.id) return false;

  const userId = user.id;
  let migrated = false;

  try {
    // 1. Profile
    const profileData = localStorage.getItem('routinmon-profile');
    if (profileData) {
      const p = JSON.parse(profileData);
      await supabase.from('profiles').upsert({
        id: userId,
        name: p.name || '',
        off_work_time: p.offWorkTime || '18:00',
        streak: p.streak || 0,
        last_completed_date: p.lastCompletedDate || null,
        notifications_enabled: p.notificationsEnabled ?? true,
        dark_mode: p.darkMode ?? true,
        last_login_date: p.lastLoginDate || null,
        consecutive_login_days: p.consecutiveLoginDays || 0,
      });
      migrated = true;
    }

    // 2. Pet
    const petData = localStorage.getItem('routinmon-pet');
    if (petData) {
      const p = JSON.parse(petData);
      await supabase.from('pets').upsert({
        user_id: userId,
        name: p.name || '파이리',
        level: p.level || 1,
        exp: p.exp || 0,
        hp: p.hp || 80,
        max_hp: p.maxHp || 100,
        happiness: p.happiness ?? 3,
        stage: p.stage || 'charmander',
        food_count: p.foodCount || 0,
        total_food_collected: p.totalFoodCollected || 0,
        last_hp_decay: p.lastHpDecay || null,
      }, { onConflict: 'user_id' });
      migrated = true;
    }

    // 3. Collection
    const colData = localStorage.getItem('routinmon-collection');
    if (colData) {
      const c = JSON.parse(colData);
      await supabase.from('collections').upsert({
        user_id: userId,
        coins: c.coins || 0,
        seen_species_ids: c.seenSpeciesIds || [],
        encountered_species_ids: c.encounteredSpeciesIds || [],
        starter_chosen: c.starterChosen || false,
      }, { onConflict: 'user_id' });

      // Owned Pokemon
      if (c.owned && c.owned.length > 0) {
        const pokemonRows = c.owned.map((p: any) => ({
          user_id: userId,
          uid: p.uid,
          species_id: p.speciesId,
          nickname: p.nickname || null,
          friendship: p.friendship || 70,
          level: p.level || 1,
          acquired_date: p.acquiredDate || '',
          acquired_method: p.acquiredMethod || 'encounter',
          is_in_party: p.isInParty || false,
        }));
        await supabase.from('owned_pokemon').upsert(pokemonRows, { onConflict: 'user_id,uid' });
      }

      // Eggs
      if (c.eggs && c.eggs.length > 0) {
        const eggRows = c.eggs.map((e: any) => ({
          user_id: userId,
          egg_id: e.id,
          rarity: e.rarity || 'common',
          distance_walked: e.distanceWalked || 0,
          distance_required: e.distanceRequired || 2,
          hatched: e.hatched || false,
          hatched_species_id: e.hatchedSpeciesId || null,
        }));
        await supabase.from('pokemon_eggs').upsert(eggRows, { onConflict: 'user_id,egg_id' });
      }

      migrated = true;
    }

    // 4. Running Stats
    const runData = localStorage.getItem('routinmon-running');
    if (runData) {
      const r = JSON.parse(runData);
      await supabase.from('running_stats').upsert({
        user_id: userId,
        total_distance_km: r.totalDistanceKm || 0,
        total_sessions: r.totalSessions || 0,
        total_duration_seconds: r.totalDurationSeconds || 0,
        best_pace_min_per_km: r.bestPaceMinPerKm || null,
        longest_run_km: r.longestRunKm || 0,
        current_streak: r.currentStreak || 0,
        goals: r.goals || [],
        challenges: r.challenges || [],
      }, { onConflict: 'user_id' });

      // Sessions
      if (r.sessions && r.sessions.length > 0) {
        const sessionRows = r.sessions.map((s: any) => ({
          user_id: userId,
          session_id: s.id,
          session_date: s.date,
          start_time: s.startTime,
          end_time: s.endTime,
          distance_km: s.distanceKm || 0,
          duration_seconds: s.durationSeconds || 0,
          pace_min_per_km: s.paceMinPerKm || 0,
          route: s.route || [],
          calories_burned: s.caloriesBurned || 0,
          reward_granted: s.rewardGranted || false,
        }));
        // Insert in batches of 50
        for (let i = 0; i < sessionRows.length; i += 50) {
          await supabase.from('running_sessions').insert(sessionRows.slice(i, i + 50));
        }
      }

      migrated = true;
    }

    // 5. Battle Records
    const battleData = localStorage.getItem('routinmon-battles');
    if (battleData) {
      const records = JSON.parse(battleData);
      if (records.length > 0) {
        const rows = records.map((r: any) => ({
          user_id: userId,
          battle_id: r.id,
          battle_date: r.date,
          opponent_name: r.opponentName,
          result: r.result,
          coins_earned: r.coinsEarned || 0,
          exp_earned: r.expEarned || 0,
        }));
        await supabase.from('battle_records').insert(rows);
      }
      migrated = true;
    }

    // 6. Inventory
    const invData = localStorage.getItem('routinmon-inventory');
    if (invData) {
      const inv = JSON.parse(invData);
      await supabase.from('inventory').upsert({
        user_id: userId,
        items: inv.items || {},
      }, { onConflict: 'user_id' });
      migrated = true;
    }

    // 7. Pokemon Health
    const healthData = localStorage.getItem('routinmon-pokemon-health');
    if (healthData) {
      const h = JSON.parse(healthData);
      await supabase.from('pokemon_health').upsert({
        user_id: userId,
        injuries: h.injuries || {},
        last_heal_all_at: h.lastHealAllAt || null,
      }, { onConflict: 'user_id' });
      migrated = true;
    }

    // 8. Legendary State
    const legData = localStorage.getItem('routinmon-legendary');
    if (legData) {
      const l = JSON.parse(legData);
      await supabase.from('legendary_state').upsert({
        user_id: userId,
        caught: l.caught || [],
        encounters: l.encounters || 0,
        last_encounter_date: l.lastEncounterDate || null,
        weekly_goal_streak_count: l.weeklyGoalStreakCount || 0,
      }, { onConflict: 'user_id' });
      migrated = true;
    }

    // 9. Catch Quests
    const questData = localStorage.getItem('routinmon-catch-quests');
    if (questData) {
      const q = JSON.parse(questData);
      await supabase.from('catch_quests').upsert({
        user_id: userId,
        active_quests: q.activeQuests || [],
        completed_count: q.completedCount || 0,
        failed_count: q.failedCount || 0,
      }, { onConflict: 'user_id' });
      migrated = true;
    }

    // Mark migration complete
    localStorage.setItem(MIGRATION_KEY, userId);
    return migrated;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}
