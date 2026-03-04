// Pet state management for Routinmon
// v4: food/feed/interact/hpDecay 제거. 교감은 pokemon-bond.ts, 체력은 pokemon-condition.ts로 이관.
import { syncStarterWithPet } from '@/lib/collection';
import { getPokemonById } from './pokemon-registry';
import { getCachedPet, setCachedPet, isCloudReady } from './cloud-storage';

export type PokemonStage = 'charmander' | 'charmeleon' | 'charizard';

export interface PetState {
  name: string;
  level: number;
  exp: number;
  stage: PokemonStage;
  // Legacy fields (kept for DB compat, not used in UI)
  hp: number;
  maxHp: number;
  happiness: number;
  foodCount: number;
  totalFoodCollected: number;
  lastHpDecay: string | null;
}

export interface LevelUpResult {
  levelsGained: number;
  newLevel: number;
  evolved: boolean;
  newStage?: PokemonStage;
}

const DEFAULT_PET: PetState = {
  name: '파이리',
  level: 1,
  exp: 0,
  stage: 'charmander',
  // Legacy defaults
  hp: 100,
  maxHp: 100,
  happiness: 3,
  foodCount: 0,
  totalFoodCollected: 0,
  lastHpDecay: null,
};

export function getPet(): PetState {
  if (isCloudReady()) {
    const cached = getCachedPet();
    if (cached) return { ...DEFAULT_PET, ...cached };
  }
  const data = localStorage.getItem('routinmon-pet');
  return data ? { ...DEFAULT_PET, ...JSON.parse(data) } : DEFAULT_PET;
}

export function savePet(updates: Partial<PetState>): PetState {
  const current = getPet();
  const updated = { ...current, ...updates };
  localStorage.setItem('routinmon-pet', JSON.stringify(updated));
  if (isCloudReady()) {
    setCachedPet(updated);
  }
  return updated;
}

export function getRequiredExp(level: number): number {
  return Math.floor(100 * Math.pow(1.1, level - 1));
}

export function getStageForLevel(level: number): PokemonStage {
  if (level >= 36) return 'charizard';
  if (level >= 16) return 'charmeleon';
  return 'charmander';
}

export function getMaxHpForStage(stage: PokemonStage): number {
  if (stage === 'charizard') return 200;
  if (stage === 'charmeleon') return 150;
  return 100;
}

export function getStageInfo(stage: PokemonStage) {
  const stages = {
    charmander: { emoji: '🔥', name: '파이리', bgGradient: 'from-orange-500/30 to-amber-500/30', borderColor: 'border-orange-500/30', fireCount: 1 },
    charmeleon: { emoji: '🔥🔥', name: '리자드', bgGradient: 'from-red-500/30 to-orange-500/30', borderColor: 'border-red-500/30', fireCount: 2 },
    charizard: { emoji: '🐉🔥🔥🔥', name: '리자몽', bgGradient: 'from-red-700/30 to-red-500/30', borderColor: 'border-red-700/30', fireCount: 3 },
  };
  return stages[stage];
}

/** Grant EXP to pet, handle level-ups. Food parameter is legacy (ignored). */
export function grantRewards(food: number, exp: number): { pet: PetState; levelUp: LevelUpResult | null } {
  let pet = getPet();
  const startLevel = pet.level;
  const startStage = pet.stage;

  // Add EXP and check level ups
  let remainingExp = pet.exp + exp;
  let currentLevel = pet.level;
  let levelsGained = 0;

  while (remainingExp >= getRequiredExp(currentLevel)) {
    remainingExp -= getRequiredExp(currentLevel);
    currentLevel++;
    levelsGained++;
  }

  const newStage = getStageForLevel(currentLevel);
  const evolved = newStage !== startStage;
  const newMaxHp = getMaxHpForStage(newStage);

  const syncedStarterSpeciesId = syncStarterWithPet(currentLevel, newStage, pet.name);
  const syncedStarterName = syncedStarterSpeciesId ? getPokemonById(syncedStarterSpeciesId)?.name : undefined;

  pet = savePet({
    exp: remainingExp,
    level: currentLevel,
    stage: newStage,
    name: syncedStarterName || pet.name,
    maxHp: newMaxHp,
    hp: evolved ? newMaxHp : pet.hp,
  });

  const levelUp: LevelUpResult | null = levelsGained > 0
    ? { levelsGained, newLevel: currentLevel, evolved, newStage: evolved ? newStage : undefined }
    : null;

  return { pet, levelUp };
}

// ─── Dialogues (mood-based, from pokemon-bond.ts) ────────

const DIALOGUES = {
  cheer: [
    '힘내! 거의 다 왔어! 💪',
    '우리 같이 하는 거야!',
    '대단해! 계속 가자! 🔥',
    '너 때문에 나도 강해지고 있어!',
    '조금만 더! 할 수 있어!',
    '최고야! 이 느낌! 🔥🔥',
    '우리 최고의 팀이야!',
    '나도 옆에서 열심히 하고 있어!',
  ],
  complete: [
    '오늘도 잘 했어! 최고야! 🎉',
    '너랑 함께해서 행복해!',
    '우리 점점 강해지고 있어! 🔥',
    '같이 달려서 즐거웠어! 😊',
  ],
};

export function getRandomDialogue(type: keyof typeof DIALOGUES): string {
  const list = DIALOGUES[type];
  if (!list) return '...';
  return list[Math.floor(Math.random() * list.length)];
}
