// ═══════════════════════════════════════════════════════════
// 포켓몬 기술 시스템 — 레벨별 기술 습득 & 데미지 차별화
// ═══════════════════════════════════════════════════════════

import type { PokemonType } from './pokemon-registry';

export interface BattleMove {
  name: string;
  type: PokemonType;
  power: number;
  accuracy: number; // 0-100, chance to hit
  emoji: string;
  learnLevel: number; // level at which this move is learned
  effect?: 'burn' | 'freeze' | 'paralyze' | 'flinch' | 'heal' | 'boost_atk' | 'lower_def';
  effectChance?: number; // 0-100
  category: 'physical' | 'special';
  description: string;
}

// Each type has moves unlocked at different levels
export const TYPE_MOVE_POOL: Record<PokemonType, BattleMove[]> = {
  fire: [
    { name: '불꽃세례', type: 'fire', power: 40, accuracy: 100, emoji: '🔥', learnLevel: 1, category: 'special', description: '작은 불꽃으로 공격' },
    { name: '불꽃엄니', type: 'fire', power: 65, accuracy: 95, emoji: '🔥', learnLevel: 8, category: 'physical', effect: 'burn', effectChance: 10, description: '불꽃을 두른 이빨로 물기' },
    { name: '화염방사', type: 'fire', power: 90, accuracy: 100, emoji: '🔥', learnLevel: 20, category: 'special', effect: 'burn', effectChance: 10, description: '강렬한 불꽃을 내뿜는다' },
    { name: '오버히트', type: 'fire', power: 130, accuracy: 90, emoji: '🌋', learnLevel: 35, category: 'special', description: '최대 화력! 반동이 크다' },
    { name: '블라스트번', type: 'fire', power: 150, accuracy: 90, emoji: '💥🔥', learnLevel: 45, category: 'special', description: '궁극의 불꽃 기술' },
  ],
  water: [
    { name: '물대포', type: 'water', power: 40, accuracy: 100, emoji: '💧', learnLevel: 1, category: 'special', description: '물줄기를 발사' },
    { name: '물의파동', type: 'water', power: 60, accuracy: 100, emoji: '🌊', learnLevel: 8, category: 'special', description: '파동으로 공격' },
    { name: '파도타기', type: 'water', power: 90, accuracy: 100, emoji: '🌊', learnLevel: 20, category: 'special', description: '거대한 파도로 공격' },
    { name: '아쿠아테일', type: 'water', power: 90, accuracy: 90, emoji: '💦', learnLevel: 30, category: 'physical', description: '물을 두른 꼬리로 공격' },
    { name: '하이드로펌프', type: 'water', power: 110, accuracy: 80, emoji: '🌊💥', learnLevel: 40, category: 'special', description: '초고압 물줄기' },
  ],
  grass: [
    { name: '흡수', type: 'grass', power: 40, accuracy: 100, emoji: '🌱', learnLevel: 1, category: 'special', effect: 'heal', effectChance: 100, description: 'HP를 흡수' },
    { name: '잎날가르기', type: 'grass', power: 55, accuracy: 95, emoji: '🍃', learnLevel: 8, category: 'physical', description: '날카로운 잎으로 베기' },
    { name: '기가드레인', type: 'grass', power: 75, accuracy: 100, emoji: '🌿', learnLevel: 18, category: 'special', effect: 'heal', effectChance: 100, description: '체력을 크게 흡수' },
    { name: '에너지볼', type: 'grass', power: 90, accuracy: 100, emoji: '🟢', learnLevel: 28, category: 'special', effect: 'lower_def', effectChance: 10, description: '자연의 에너지탄' },
    { name: '솔라빔', type: 'grass', power: 120, accuracy: 100, emoji: '☀️🌿', learnLevel: 40, category: 'special', description: '태양 에너지를 모아 발사' },
  ],
  electric: [
    { name: '전기충격', type: 'electric', power: 40, accuracy: 100, emoji: '⚡', learnLevel: 1, category: 'special', effect: 'paralyze', effectChance: 10, description: '전기로 공격' },
    { name: '스파크', type: 'electric', power: 65, accuracy: 100, emoji: '⚡', learnLevel: 10, category: 'physical', effect: 'paralyze', effectChance: 30, description: '전기를 두르고 돌진' },
    { name: '10만볼트', type: 'electric', power: 90, accuracy: 100, emoji: '⚡', learnLevel: 22, category: 'special', effect: 'paralyze', effectChance: 10, description: '강력한 전격!' },
    { name: '번개', type: 'electric', power: 110, accuracy: 70, emoji: '🌩️', learnLevel: 38, category: 'special', effect: 'paralyze', effectChance: 30, description: '천둥번개를 내리친다' },
  ],
  ice: [
    { name: '얼음뭉치', type: 'ice', power: 40, accuracy: 100, emoji: '🧊', learnLevel: 1, category: 'physical', description: '얼음 덩어리로 공격' },
    { name: '냉동빔', type: 'ice', power: 90, accuracy: 100, emoji: '❄️', learnLevel: 20, category: 'special', effect: 'freeze', effectChance: 10, description: '얼어붙는 빔' },
    { name: '눈보라', type: 'ice', power: 110, accuracy: 70, emoji: '🌨️', learnLevel: 35, category: 'special', effect: 'freeze', effectChance: 10, description: '맹렬한 눈보라' },
  ],
  fighting: [
    { name: '깨뜨리기', type: 'fighting', power: 40, accuracy: 100, emoji: '💥', learnLevel: 1, category: 'physical', description: '힘껏 때리기' },
    { name: '벽깨기', type: 'fighting', power: 75, accuracy: 100, emoji: '👊', learnLevel: 15, category: 'physical', effect: 'lower_def', effectChance: 50, description: '방어를 낮추며 공격' },
    { name: '인파이팅', type: 'fighting', power: 120, accuracy: 100, emoji: '🥊', learnLevel: 30, category: 'physical', description: '전력 난타!' },
  ],
  poison: [
    { name: '독찌르기', type: 'poison', power: 40, accuracy: 100, emoji: '💀', learnLevel: 1, category: 'physical', description: '독침으로 찌르기' },
    { name: '오물폭탄', type: 'poison', power: 90, accuracy: 100, emoji: '☠️', learnLevel: 20, category: 'special', description: '독 오물을 던진다' },
  ],
  ground: [
    { name: '땅고르기', type: 'ground', power: 60, accuracy: 100, emoji: '⛰️', learnLevel: 1, category: 'physical', description: '땅을 흔들어 공격' },
    { name: '지진', type: 'ground', power: 100, accuracy: 100, emoji: '🌍', learnLevel: 30, category: 'physical', description: '강력한 지진!' },
  ],
  flying: [
    { name: '공기베기', type: 'flying', power: 55, accuracy: 95, emoji: '💨', learnLevel: 1, category: 'special', description: '날카로운 바람으로 베기' },
    { name: '공중날기', type: 'flying', power: 90, accuracy: 95, emoji: '🦅', learnLevel: 22, category: 'physical', description: '하늘 높이 날아 공격' },
    { name: '브레이브버드', type: 'flying', power: 120, accuracy: 100, emoji: '🦅💥', learnLevel: 38, category: 'physical', description: '목숨을 건 돌진' },
  ],
  psychic: [
    { name: '사념의파동', type: 'psychic', power: 50, accuracy: 100, emoji: '💜', learnLevel: 1, category: 'special', description: '정신파로 공격' },
    { name: '사이코키네시스', type: 'psychic', power: 90, accuracy: 100, emoji: '🔮', learnLevel: 25, category: 'special', effect: 'lower_def', effectChance: 10, description: '강한 염동력!' },
  ],
  bug: [
    { name: '벌레의저항', type: 'bug', power: 50, accuracy: 100, emoji: '🐛', learnLevel: 1, category: 'special', description: '벌레의 저항' },
    { name: '시저크로스', type: 'bug', power: 80, accuracy: 100, emoji: '🪲', learnLevel: 20, category: 'physical', description: 'X자로 베기' },
  ],
  rock: [
    { name: '돌떨구기', type: 'rock', power: 50, accuracy: 90, emoji: '🪨', learnLevel: 1, category: 'physical', description: '돌을 떨어뜨린다' },
    { name: '스톤에지', type: 'rock', power: 100, accuracy: 80, emoji: '🪨💥', learnLevel: 28, category: 'physical', description: '날카로운 바위로 공격' },
  ],
  ghost: [
    { name: '야습', type: 'ghost', power: 50, accuracy: 100, emoji: '🌑', learnLevel: 1, category: 'physical', description: '어둠에서 기습' },
    { name: '섀도볼', type: 'ghost', power: 80, accuracy: 100, emoji: '👻', learnLevel: 22, category: 'special', effect: 'lower_def', effectChance: 20, description: '그림자 에너지탄' },
  ],
  dragon: [
    { name: '드래곤크루', type: 'dragon', power: 60, accuracy: 100, emoji: '🐲', learnLevel: 1, category: 'physical', description: '용의 발톱' },
    { name: '용의파동', type: 'dragon', power: 85, accuracy: 100, emoji: '🐉', learnLevel: 20, category: 'special', description: '파동으로 공격' },
    { name: '역린', type: 'dragon', power: 120, accuracy: 100, emoji: '🐉💥', learnLevel: 38, category: 'physical', description: '분노에 찬 난타!' },
    { name: '용성군', type: 'dragon', power: 140, accuracy: 90, emoji: '☄️', learnLevel: 50, category: 'special', description: '하늘에서 유성이 떨어진다' },
  ],
  fairy: [
    { name: '요정의바람', type: 'fairy', power: 50, accuracy: 100, emoji: '✨', learnLevel: 1, category: 'special', description: '요정 바람' },
    { name: '문포스', type: 'fairy', power: 95, accuracy: 100, emoji: '🌙', learnLevel: 28, category: 'special', effect: 'lower_def', effectChance: 30, description: '달의 힘으로 공격' },
  ],
  normal: [
    { name: '몸통박치기', type: 'normal', power: 40, accuracy: 100, emoji: '💥', learnLevel: 1, category: 'physical', description: '몸통으로 돌진' },
    { name: '전광석화', type: 'normal', power: 40, accuracy: 100, emoji: '⚡', learnLevel: 5, category: 'physical', description: '빠른 선제 공격' },
    { name: '파괴광선', type: 'normal', power: 150, accuracy: 90, emoji: '💥💥', learnLevel: 45, category: 'special', description: '최강의 광선!' },
  ],
};

/**
 * Get available moves for a Pokemon based on its types and level.
 * Returns up to 4 moves (best ones available at current level).
 */
export function getMovesForLevel(types: PokemonType[], level: number): BattleMove[] {
  const allMoves: BattleMove[] = [];

  // Collect moves from all types this pokemon has
  for (const t of types) {
    const pool = TYPE_MOVE_POOL[t] || TYPE_MOVE_POOL.normal;
    const available = pool.filter(m => m.learnLevel <= level);
    allMoves.push(...available);
  }

  // Always include at least one normal move if available
  if (types.length === 1 || allMoves.length < 2) {
    const normalMoves = TYPE_MOVE_POOL.normal.filter(m => m.learnLevel <= level);
    allMoves.push(...normalMoves);
  }

  // Remove duplicates by name
  const unique = Array.from(new Map(allMoves.map(m => [m.name, m])).values());

  // Sort by power descending, then pick top 4
  unique.sort((a, b) => b.power - a.power);
  return unique.slice(0, 4);
}

/**
 * Get ALL moves a Pokemon can ever learn (for display)
 */
export function getAllLearnableMoves(types: PokemonType[]): BattleMove[] {
  const allMoves: BattleMove[] = [];
  for (const t of types) {
    const pool = TYPE_MOVE_POOL[t] || [];
    allMoves.push(...pool);
  }
  const normalMoves = TYPE_MOVE_POOL.normal;
  allMoves.push(...normalMoves);
  const unique = Array.from(new Map(allMoves.map(m => [m.name, m])).values());
  unique.sort((a, b) => a.learnLevel - b.learnLevel);
  return unique;
}
