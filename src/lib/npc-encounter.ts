// ═══════════════════════════════════════════════════════════
// 런닝 중 NPC 트레이너 조우 시스템
// AI 기반 NPC 생성 + 레벨 매칭
// ═══════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { getParty } from './collection';
import { getPokemonById } from './pokemon-registry';
import type { NpcTrainer } from './npc-trainers';

// ─── Types ───────────────────────────────────────────────

export interface AiNpcTrainer extends NpcTrainer {
  personality?: string;
  isAiGenerated: boolean;
}

// ─── Encounter Check ────────────────────────────────────

const ENCOUNTER_STORAGE = 'routinmon-npc-encounter';

interface EncounterState {
  lastEncounterDistance: number; // km at which last encounter happened
  pendingNpc: AiNpcTrainer | null;
}

function getEncounterState(): EncounterState {
  const data = localStorage.getItem(ENCOUNTER_STORAGE);
  return data ? JSON.parse(data) : { lastEncounterDistance: 0, pendingNpc: null };
}

function saveEncounterState(state: EncounterState) {
  localStorage.setItem(ENCOUNTER_STORAGE, JSON.stringify(state));
}

export function clearPendingEncounter() {
  const state = getEncounterState();
  state.pendingNpc = null;
  saveEncounterState(state);
}

export function getPendingEncounter(): AiNpcTrainer | null {
  return getEncounterState().pendingNpc;
}

export function resetEncounterDistance() {
  saveEncounterState({ lastEncounterDistance: 0, pendingNpc: null });
}

/**
 * Check if an NPC encounter should trigger during running.
 * Encounters happen roughly every 1-3km with increasing probability.
 */
export function shouldEncounterNpc(currentDistanceKm: number): boolean {
  const state = getEncounterState();
  const distanceSinceLast = currentDistanceKm - state.lastEncounterDistance;
  
  // Minimum 0.8km between encounters
  if (distanceSinceLast < 0.8) return false;
  
  // Probability increases with distance: ~30% at 1km, ~60% at 2km, ~90% at 3km
  const probability = Math.min(0.95, distanceSinceLast * 0.3);
  return Math.random() < probability;
}

/**
 * Generate an AI-powered NPC trainer matched to player level.
 */
export async function generateAiNpc(currentDistanceKm: number): Promise<AiNpcTrainer | null> {
  const party = getParty();
  if (party.length === 0) return null;

  // Calculate player's average level
  const avgLevel = Math.round(party.reduce((sum, p) => sum + p.level, 0) / party.length);
  
  // Get player team types for type-matchup consideration
  const playerTeamTypes = [...new Set(
    party.flatMap(p => {
      const species = getPokemonById(p.speciesId);
      return species ? species.types : [];
    })
  )];

  try {
    const { data, error } = await supabase.functions.invoke('generate-npc', {
      body: {
        playerLevel: avgLevel,
        playerTeamTypes,
        distanceKm: currentDistanceKm,
      },
    });

    if (error) {
      console.error('NPC generation error:', error);
      return createFallbackNpc(avgLevel);
    }

    const npc: AiNpcTrainer = {
      ...data,
      isAiGenerated: true,
      weeklyDistanceKm: 0,
      weeklyBattleWins: 0,
    };

    // Save encounter state
    const state = getEncounterState();
    state.lastEncounterDistance = currentDistanceKm;
    state.pendingNpc = npc;
    saveEncounterState(state);

    return npc;
  } catch (err) {
    console.error('Failed to generate AI NPC:', err);
    return createFallbackNpc(avgLevel);
  }
}

/**
 * Fallback NPC when AI is unavailable
 */
function createFallbackNpc(playerLevel: number): AiNpcTrainer {
  const fallbacks = [
    { name: '꼬마 민수', title: '꼬마 트레이너', emoji: '👦', team: [19, 16], personality: '호기심' },
    { name: '등산가 영호', title: '등산 트레이너', emoji: '🧗', team: [74, 95], personality: '강인한' },
    { name: '낚시꾼 대철', title: '낚시 트레이너', emoji: '🎣', team: [129, 118], personality: '느긋한' },
    { name: '미녀 수진', title: '미녀 트레이너', emoji: '💃', team: [35, 36], personality: '우아한' },
    { name: '불량배 지훈', title: '불량배', emoji: '😎', team: [23, 88], personality: '거친' },
    { name: '과학자 민호', title: '과학자', emoji: '🔬', team: [81, 100], personality: '논리적' },
  ];

  const pick = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  const level = Math.max(3, playerLevel + Math.floor(Math.random() * 5) - 2);
  const difficulty = level >= 25 ? 'hard' : level >= 15 ? 'medium' : 'easy';

  return {
    id: `fallback_${Date.now()}`,
    name: pick.name,
    title: pick.title,
    emoji: pick.emoji,
    teamSpeciesIds: pick.team,
    level,
    friendship: Math.min(180, 50 + level * 2),
    difficulty: difficulty as 'easy' | 'medium' | 'hard' | 'elite',
    weeklyDistanceKm: 0,
    weeklyBattleWins: 0,
    dialogue: {
      before: '승부하자!',
      win: '다음엔 이긴다!',
      lose: '내가 이겼다!',
    },
    personality: pick.personality,
    isAiGenerated: false,
  };
}
