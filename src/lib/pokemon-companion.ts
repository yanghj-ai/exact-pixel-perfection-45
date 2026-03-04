// ═══════════════════════════════════════════════════════════
// 동반 포켓몬 시스템 — 러닝 중 친밀도 & 기분
// ═══════════════════════════════════════════════════════════

export type CompanionMood = 'sad' | 'neutral' | 'happy' | 'excited';

export interface CompanionState {
  pokemonUid: string;
  friendship: number;      // 0 ~ 255
  totalStepsTogether: number;
  mood: CompanionMood;
}

/** Get mood based on steps in current session */
export function getMoodForSteps(steps: number): CompanionMood {
  if (steps >= 2000) return 'excited';
  if (steps >= 500) return 'happy';
  return 'neutral';
}

export function getMoodEmoji(mood: CompanionMood): string {
  switch (mood) {
    case 'excited': return '🤩';
    case 'happy': return '😊';
    case 'neutral': return '😐';
    case 'sad': return '😢';
  }
}

/** 친밀도 → 배틀 효과 */
export function getFriendshipBattleBonus(friendship: number): {
  critBonus: number;
  evadeChance: number;
  expBonus: number;
} {
  if (friendship >= 200) return { critBonus: 0.1, evadeChance: 0.05, expBonus: 1.2 };
  if (friendship >= 150) return { critBonus: 0.05, evadeChance: 0.02, expBonus: 1.1 };
  return { critBonus: 0, evadeChance: 0, expBonus: 1.0 };
}

/** Pet cheers based on mood */
const CHEERS: Record<CompanionMood, string[]> = {
  sad: ['...', '힘내자...', '괜찮아?'],
  neutral: ['파이팅!', '같이 달리자!', '할 수 있어!'],
  happy: ['잘하고 있어! 🔥', '대단해! 💪', '최고야! ⚡'],
  excited: ['멈추지 마!! 🔥🔥', '우리 무적이야!! ⚡⚡', '전설이 되는 거야!! 🌟'],
};

export function getCheerMessage(mood: CompanionMood): string {
  const list = CHEERS[mood];
  return list[Math.floor(Math.random() * list.length)];
}
