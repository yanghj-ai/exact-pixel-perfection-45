// ═══════════════════════════════════════════════════════════
// 포획 퀘스트 시스템 — 조우 후 조건 달성 시 포획
// ═══════════════════════════════════════════════════════════

import type { Rarity } from './pokemon-registry';

// ─── Types ───────────────────────────────────────────────

export type QuestRequirementType = 'distance' | 'pace' | 'time';
export type CatchQuestType = 'distance' | 'pace' | 'time' | 'combo';

export interface QuestRequirement {
  type: QuestRequirementType;
  target: number;
  unit: string;
  label: string;
}

export interface CatchQuest {
  id: string;
  speciesId: number;
  speciesName: string;
  encounterDistanceKm: number;
  questType: CatchQuestType;
  requirements: QuestRequirement[];
  startedAt: number;
  completed: boolean;
  failed: boolean;
}

// ─── Quest Generation per Rarity ─────────────────────────

function generateRequirements(rarity: Rarity, encounterDist: number): QuestRequirement[] {
  switch (rarity) {
    case 'common':
      return [{ type: 'distance', target: encounterDist + 0.5, unit: 'km', label: '0.5km 더 달리기' }];
    case 'uncommon': {
      const roll = Math.random();
      if (roll < 0.5) {
        return [{ type: 'distance', target: encounterDist + 1, unit: 'km', label: '1km 더 달리기' }];
      }
      return [{ type: 'pace', target: 8, unit: '분/km', label: '8분/km 이내 페이스' }];
    }
    case 'rare': {
      const roll = Math.random();
      if (roll < 0.5) {
        return [{ type: 'distance', target: encounterDist + 2, unit: 'km', label: '2km 더 달리기' }];
      }
      return [{ type: 'pace', target: 7, unit: '분/km', label: '7분/km 이내 페이스' }];
    }
    case 'epic':
      return [
        { type: 'distance', target: encounterDist + 3, unit: 'km', label: '3km 더 달리기' },
        { type: 'pace', target: 7, unit: '분/km', label: '7분/km 이내 페이스' },
      ];
    case 'legendary':
      // Legendary uses special system, but fallback
      return [
        { type: 'distance', target: encounterDist + 5, unit: 'km', label: '5km 더 달리기' },
      ];
    default:
      return [{ type: 'distance', target: encounterDist + 0.5, unit: 'km', label: '0.5km 더 달리기' }];
  }
}

export function createCatchQuest(
  speciesId: number,
  speciesName: string,
  rarity: Rarity,
  encounterDistanceKm: number,
): CatchQuest {
  const requirements = generateRequirements(rarity, encounterDistanceKm);
  const questType: CatchQuestType = requirements.length > 1 ? 'combo' : requirements[0].type;

  return {
    id: `quest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    speciesId,
    speciesName,
    encounterDistanceKm,
    questType,
    requirements,
    startedAt: Date.now(),
    completed: false,
    failed: false,
  };
}

// ─── Progress Checking ──────────────────────────────────

export interface QuestProgress {
  overall: number; // 0-100
  perRequirement: { label: string; progress: number; met: boolean }[];
  allMet: boolean;
}

export function checkQuestProgress(
  quest: CatchQuest,
  currentDistanceKm: number,
  elapsedSeconds: number,
  paceMinPerKm: number,
): QuestProgress {
  const perRequirement = quest.requirements.map(req => {
    let progress = 0;
    let met = false;

    switch (req.type) {
      case 'distance':
        progress = Math.min(100, (currentDistanceKm / req.target) * 100);
        met = currentDistanceKm >= req.target;
        break;
      case 'pace':
        if (currentDistanceKm >= 1 && paceMinPerKm > 0) {
          met = paceMinPerKm <= req.target;
          progress = met ? 100 : Math.max(0, (1 - (paceMinPerKm - req.target) / req.target) * 100);
        }
        break;
      case 'time':
        const elapsedMin = elapsedSeconds / 60;
        progress = Math.min(100, (elapsedMin / req.target) * 100);
        met = elapsedMin >= req.target;
        break;
    }

    return { label: req.label, progress: Math.round(progress), met };
  });

  const allMet = perRequirement.every(r => r.met);
  const overall = Math.round(perRequirement.reduce((sum, r) => sum + r.progress, 0) / perRequirement.length);

  return { overall, perRequirement, allMet };
}

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'routinmon-catch-quests';

interface CatchQuestState {
  activeQuests: CatchQuest[];
  completedCount: number;
  failedCount: number;
}

function getQuestState(): CatchQuestState {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { activeQuests: [], completedCount: 0, failedCount: 0 };
}

function saveQuestState(state: CatchQuestState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function addActiveQuest(quest: CatchQuest) {
  const state = getQuestState();
  state.activeQuests.push(quest);
  saveQuestState(state);
}

export function getActiveQuests(): CatchQuest[] {
  return getQuestState().activeQuests;
}

export function completeQuest(questId: string) {
  const state = getQuestState();
  const quest = state.activeQuests.find(q => q.id === questId);
  if (quest) {
    quest.completed = true;
    state.activeQuests = state.activeQuests.filter(q => q.id !== questId);
    state.completedCount++;
    saveQuestState(state);
  }
}

export function failAllActiveQuests() {
  const state = getQuestState();
  state.failedCount += state.activeQuests.length;
  state.activeQuests = [];
  saveQuestState(state);
}

export function clearActiveQuests() {
  const state = getQuestState();
  state.activeQuests = [];
  saveQuestState(state);
}

export function resetCatchQuestState() {
  localStorage.removeItem(STORAGE_KEY);
}
