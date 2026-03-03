// Pet state management for Routinmon
import { syncStarterWithPet } from '@/lib/collection';
import { getPokemonById } from './pokemon-registry';

export type PokemonStage = 'charmander' | 'charmeleon' | 'charizard';

export interface PetState {
  name: string;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  happiness: number; // 0-5
  stage: PokemonStage;
  foodCount: number;
  totalFoodCollected: number;
  lastHpDecay: string | null; // ISO date
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
  hp: 80,
  maxHp: 100,
  happiness: 3,
  stage: 'charmander',
  foodCount: 0,
  totalFoodCollected: 0,
  lastHpDecay: null,
};

export function getPet(): PetState {
  const data = localStorage.getItem('routinmon-pet');
  return data ? { ...DEFAULT_PET, ...JSON.parse(data) } : DEFAULT_PET;
}

export function savePet(updates: Partial<PetState>): PetState {
  const current = getPet();
  const updated = { ...current, ...updates };
  localStorage.setItem('routinmon-pet', JSON.stringify(updated));
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
    charmander: {
      emoji: '🔥',
      name: '파이리',
      bgGradient: 'from-orange-500/30 to-amber-500/30',
      borderColor: 'border-orange-500/30',
      fireCount: 1,
    },
    charmeleon: {
      emoji: '🔥🔥',
      name: '리자드',
      bgGradient: 'from-red-500/30 to-orange-500/30',
      borderColor: 'border-red-500/30',
      fireCount: 2,
    },
    charizard: {
      emoji: '🐉🔥🔥🔥',
      name: '리자몽',
      bgGradient: 'from-red-700/30 to-red-500/30',
      borderColor: 'border-red-700/30',
      fireCount: 3,
    },
  };
  return stages[stage];
}

/** Grant food and EXP to pet, handle level-ups */
export function grantRewards(food: number, exp: number): { pet: PetState; levelUp: LevelUpResult | null } {
  let pet = getPet();
  const startLevel = pet.level;
  const startStage = pet.stage;

  // Add food
  pet = savePet({
    foodCount: pet.foodCount + food,
    totalFoodCollected: pet.totalFoodCollected + food,
  });

  // Add EXP and check level ups
  let remainingExp = pet.exp + exp;
  let currentLevel = pet.level;
  let levelsGained = 0;

  while (remainingExp >= getRequiredExp(currentLevel)) {
    remainingExp -= getRequiredExp(currentLevel);
    currentLevel++;
    levelsGained++;
  }

  // Check evolution
  const newStage = getStageForLevel(currentLevel);
  const evolved = newStage !== startStage;
  const newMaxHp = getMaxHpForStage(newStage);

  // Sync starter species/level first, then use synced species name
  const syncedStarterSpeciesId = syncStarterWithPet(currentLevel, newStage, pet.name);
  const syncedStarterName = syncedStarterSpeciesId ? getPokemonById(syncedStarterSpeciesId)?.name : undefined;

  pet = savePet({
    exp: remainingExp,
    level: currentLevel,
    stage: newStage,
    name: syncedStarterName || pet.name,
    maxHp: newMaxHp,
    // Heal on evolution
    ...(evolved ? { hp: newMaxHp } : {}),
  });

  const levelUp: LevelUpResult | null = levelsGained > 0
    ? { levelsGained, newLevel: currentLevel, evolved, newStage: evolved ? newStage : undefined }
    : null;

  return { pet, levelUp };
}

const DIALOGUES = {
  idle: [
    '배고파... 루틴 완료하면 밥 줘!',
    '오늘 루틴 했어? 같이 하자!',
    '심심해~ 놀아줘!',
    '오늘도 화이팅! 🔥',
    '너랑 있으면 좋아 😊',
  ],
  interact: [
    '오늘 하루 어땠어?',
    '같이 운동하고 싶어!',
    '너랑 있으면 좋아 😊',
    '밥 줘... 배고파...',
    '오늘도 화이팅!',
    '나 점점 강해지고 있어!',
  ],
  hungry: [
    '배고파... 힘이 없어...',
    '밥... 밥 줘...',
    '루틴 완료하면 먹이 얻을 수 있어!',
  ],
  fed: [
    '맛있다! 고마워~ 🍎',
    '힘이 나! 더 강해진 느낌이야!',
    '역시 넌 최고의 트레이너야!',
  ],
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
  exerciseCheer: [
    '🔥 파이리가 함께 운동 중!',
    '같이 운동하니까 더 재밌어!',
    '나도 더 강해질 거야! 💪',
    '파이리의 불꽃이 활활! 🔥',
  ],
  complete: [
    '고마워! 맛있겠다~ 🍎',
    '오늘도 잘 했어! 최고야! 🎉',
    '너랑 함께해서 행복해! ❤️',
    '우리 점점 강해지고 있어! 🔥',
  ],
};

export function getRandomDialogue(type: keyof typeof DIALOGUES): string {
  const list = DIALOGUES[type];
  return list[Math.floor(Math.random() * list.length)];
}

export function applyHpDecay(pet: PetState): PetState {
  const today = new Date().toISOString().split('T')[0];
  if (pet.lastHpDecay === today) return pet;

  const newHp = Math.max(0, pet.hp - 10);
  return savePet({ hp: newHp, lastHpDecay: today });
}

export function feedPet(pet: PetState): PetState | null {
  if (pet.foodCount <= 0) return null;
  const newHp = Math.min(pet.maxHp, pet.hp + 20);
  const newHappiness = Math.min(5, pet.happiness + 0.5);
  return savePet({
    foodCount: pet.foodCount - 1,
    hp: newHp,
    happiness: newHappiness,
  });
}

export function interactPet(pet: PetState): PetState {
  const newHappiness = Math.min(5, pet.happiness + 0.5);
  return savePet({ happiness: newHappiness });
}
