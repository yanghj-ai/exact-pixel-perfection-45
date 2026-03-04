// ═══════════════════════════════════════════════════════════
// 포켓몬 기술 시스템 — 포켓몬별 고유 기술 배정 (MOVE_DB 기반)
// ═══════════════════════════════════════════════════════════

import { type PokemonType, getPokemonById } from './pokemon-registry';

export interface BattleMove {
  name: string;
  type: PokemonType;
  power: number;
  accuracy: number; // 0-100, chance to hit
  emoji: string;
  learnLevel: number; // kept for compatibility, defaults to 1
  effect?: 'burn' | 'freeze' | 'paralyze' | 'flinch' | 'heal' | 'boost_atk' | 'lower_def';
  effectChance?: number; // 0-100
  category: 'physical' | 'special';
  description: string;
}

// ─── Move Database (76 moves) ───────────────────────────
// All moves keyed by internal name
const MOVE_DB: Record<string, BattleMove> = {
  tackle:       { name: '몸통박치기', type: 'normal', power: 40, accuracy: 100, emoji: '💥', learnLevel: 1, category: 'physical', description: '몸통으로 돌진' },
  growl:        { name: '울음소리', type: 'normal', power: 0, accuracy: 100, emoji: '📢', learnLevel: 1, category: 'special', effect: 'lower_def', effectChance: 100, description: '울음소리로 공격력을 낮춘다' },
  razorleaf:    { name: '잎날가르기', type: 'grass', power: 55, accuracy: 95, emoji: '🍃', learnLevel: 1, category: 'physical', description: '날카로운 잎으로 베기' },
  vinewhip:     { name: '덩굴채찍', type: 'grass', power: 45, accuracy: 100, emoji: '🌿', learnLevel: 1, category: 'physical', description: '덩굴로 채찍질' },
  scratch:      { name: '할퀴기', type: 'normal', power: 40, accuracy: 100, emoji: '🐾', learnLevel: 1, category: 'physical', description: '발톱으로 할퀴기' },
  ember:        { name: '불꽃세례', type: 'fire', power: 40, accuracy: 100, emoji: '🔥', learnLevel: 1, category: 'special', effect: 'burn', effectChance: 10, description: '작은 불꽃으로 공격' },
  smokescreen:  { name: '연막', type: 'normal', power: 0, accuracy: 100, emoji: '💨', learnLevel: 1, category: 'special', description: '연막으로 명중률을 낮춘다' },
  withdraw:     { name: '껍질에숨기', type: 'water', power: 0, accuracy: 0, emoji: '🐚', learnLevel: 1, category: 'physical', effect: 'boost_atk', effectChance: 100, description: '껍질에 숨어 방어력 상승' },
  watergun:     { name: '물대포', type: 'water', power: 40, accuracy: 100, emoji: '💧', learnLevel: 1, category: 'special', description: '물줄기를 발사' },
  bubblebeam:   { name: '거품광선', type: 'water', power: 65, accuracy: 100, emoji: '🫧', learnLevel: 1, category: 'special', description: '거품을 발사하여 공격' },
  confusion:    { name: '사념의파동', type: 'psychic', power: 50, accuracy: 100, emoji: '💜', learnLevel: 1, category: 'special', description: '정신파로 공격' },
  psybeam:      { name: '사이코빔', type: 'psychic', power: 65, accuracy: 100, emoji: '🔮', learnLevel: 1, category: 'special', description: '신비한 빔으로 공격' },
  poisonpowder: { name: '독가루', type: 'poison', power: 0, accuracy: 75, emoji: '☠️', learnLevel: 1, category: 'special', description: '독가루를 뿌린다' },
  sleeppowder:  { name: '수면가루', type: 'grass', power: 0, accuracy: 75, emoji: '💤', learnLevel: 1, category: 'special', description: '수면가루를 뿌린다' },
  leechlife:    { name: '흡혈', type: 'bug', power: 55, accuracy: 100, emoji: '🩸', learnLevel: 1, category: 'physical', effect: 'heal', effectChance: 100, description: '피를 빨아 HP 회복' },
  spore:        { name: '버섯포자', type: 'grass', power: 0, accuracy: 75, emoji: '🍄', learnLevel: 1, category: 'special', description: '포자를 뿌려 잠재운다' },
  peck:         { name: '쪼기', type: 'flying', power: 35, accuracy: 100, emoji: '🐦', learnLevel: 1, category: 'physical', description: '부리로 쪼기' },
  sandattack:   { name: '모래뿌리기', type: 'normal', power: 0, accuracy: 100, emoji: '🏜️', learnLevel: 1, category: 'physical', description: '모래를 뿌려 명중률 하락' },
  bite:         { name: '물기', type: 'normal', power: 60, accuracy: 100, emoji: '🦷', learnLevel: 1, category: 'physical', effect: 'flinch', effectChance: 20, description: '이빨로 물기' },
  acid:         { name: '산성액', type: 'poison', power: 40, accuracy: 100, emoji: '🧪', learnLevel: 1, category: 'special', effect: 'lower_def', effectChance: 10, description: '산성 액체를 뿜는다' },
  thunderbolt:  { name: '10만볼트', type: 'electric', power: 90, accuracy: 100, emoji: '⚡', learnLevel: 1, category: 'special', effect: 'paralyze', effectChance: 10, description: '강력한 전격!' },
  thunder:      { name: '번개', type: 'electric', power: 110, accuracy: 70, emoji: '🌩️', learnLevel: 1, category: 'special', effect: 'paralyze', effectChance: 30, description: '천둥번개를 내리친다' },
  thunderwave:  { name: '전기자석파', type: 'electric', power: 0, accuracy: 90, emoji: '⚡', learnLevel: 1, category: 'special', effect: 'paralyze', effectChance: 100, description: '전자파로 마비시킨다' },
  defensecurl:  { name: '웅크리기', type: 'normal', power: 0, accuracy: 0, emoji: '🔵', learnLevel: 1, category: 'physical', effect: 'boost_atk', effectChance: 100, description: '몸을 웅크려 방어력 상승' },
  earthquake:   { name: '지진', type: 'ground', power: 100, accuracy: 100, emoji: '🌍', learnLevel: 1, category: 'physical', description: '강력한 지진!' },
  leer:         { name: '눈부시기', type: 'normal', power: 0, accuracy: 100, emoji: '👁️', learnLevel: 1, category: 'special', effect: 'lower_def', effectChance: 100, description: '노려보아 방어를 낮춘다' },
  lowkick:      { name: '낮은발차기', type: 'fighting', power: 60, accuracy: 100, emoji: '🦵', learnLevel: 1, category: 'physical', description: '낮은 발차기' },
  focus:        { name: '기합', type: 'fighting', power: 0, accuracy: 0, emoji: '💪', learnLevel: 1, category: 'physical', effect: 'boost_atk', effectChance: 100, description: '기합을 넣어 공격력 상승' },
  absorb:       { name: '흡수', type: 'grass', power: 20, accuracy: 100, emoji: '🌱', learnLevel: 1, category: 'special', effect: 'heal', effectChance: 100, description: 'HP를 흡수' },
  leechseed:    { name: '씨뿌리기', type: 'grass', power: 0, accuracy: 90, emoji: '🌱', learnLevel: 1, category: 'special', description: '씨를 뿌려 HP를 흡수' },
  synthesis:    { name: '광합성', type: 'grass', power: 0, accuracy: 0, emoji: '☀️', learnLevel: 1, category: 'special', effect: 'heal', effectChance: 100, description: 'HP를 회복한다' },
  roar:         { name: '울부짖기', type: 'normal', power: 0, accuracy: 100, emoji: '📣', learnLevel: 1, category: 'special', description: '울부짖어 위협한다' },
  fury:         { name: '연속치기', type: 'normal', power: 15, accuracy: 85, emoji: '💢', learnLevel: 1, category: 'physical', description: '연속으로 치기' },
  minimize:     { name: '작아지기', type: 'normal', power: 0, accuracy: 0, emoji: '🔽', learnLevel: 1, category: 'physical', description: '몸을 작게 만든다' },
  doubleedge:   { name: '이판사판머리박기', type: 'normal', power: 120, accuracy: 100, emoji: '💥💥', learnLevel: 1, category: 'physical', description: '목숨을 건 돌진!' },
  bravebird:    { name: '브레이브버드', type: 'flying', power: 120, accuracy: 100, emoji: '🦅💥', learnLevel: 1, category: 'physical', description: '목숨을 건 돌진' },
  hyperbeam:    { name: '파괴광선', type: 'normal', power: 150, accuracy: 90, emoji: '💥💥', learnLevel: 1, category: 'special', description: '최강의 광선!' },
  astonish:     { name: '놀래키기', type: 'ghost', power: 30, accuracy: 100, emoji: '👻', learnLevel: 1, category: 'physical', effect: 'flinch', effectChance: 30, description: '놀래켜서 공격' },
  shadowball:   { name: '섀도볼', type: 'ghost', power: 80, accuracy: 100, emoji: '👻', learnLevel: 1, category: 'special', effect: 'lower_def', effectChance: 20, description: '그림자 에너지탄' },
  psychic:      { name: '사이코키네시스', type: 'psychic', power: 90, accuracy: 100, emoji: '🔮', learnLevel: 1, category: 'special', effect: 'lower_def', effectChance: 10, description: '강한 염동력!' },
  rockthrow:    { name: '돌떨구기', type: 'rock', power: 50, accuracy: 90, emoji: '🪨', learnLevel: 1, category: 'physical', description: '돌을 떨어뜨린다' },
  barrage:      { name: '구슬던지기', type: 'normal', power: 15, accuracy: 85, emoji: '⚾', learnLevel: 1, category: 'physical', description: '구슬을 연속으로 던진다' },
  boneclub:     { name: '뼈다귀치기', type: 'ground', power: 65, accuracy: 85, emoji: '🦴', learnLevel: 1, category: 'physical', description: '뼈로 내려치기' },
  highjumpkick: { name: '무릎차기', type: 'fighting', power: 100, accuracy: 90, emoji: '🦵💥', learnLevel: 1, category: 'physical', description: '높이 뛰어 차기' },
  punch:        { name: '펀치', type: 'fighting', power: 75, accuracy: 100, emoji: '👊', learnLevel: 1, category: 'physical', description: '주먹으로 공격' },
  machpunch:    { name: '마하펀치', type: 'fighting', power: 40, accuracy: 100, emoji: '👊⚡', learnLevel: 1, category: 'physical', description: '빠른 선제 펀치' },
  lick:         { name: '핥기', type: 'normal', power: 30, accuracy: 100, emoji: '👅', learnLevel: 1, category: 'physical', effect: 'paralyze', effectChance: 30, description: '혀로 핥아 마비시킨다' },
  wrap:         { name: '감기', type: 'normal', power: 15, accuracy: 90, emoji: '🌀', learnLevel: 1, category: 'physical', description: '몸으로 감아 조른다' },
  sludge:       { name: '오물공격', type: 'poison', power: 65, accuracy: 100, emoji: '☠️', learnLevel: 1, category: 'special', description: '독 오물을 던진다' },
  stomp:        { name: '짓밟기', type: 'normal', power: 65, accuracy: 100, emoji: '🦶', learnLevel: 1, category: 'physical', effect: 'flinch', effectChance: 30, description: '힘껏 밟기' },
  outrage:      { name: '역린', type: 'dragon', power: 120, accuracy: 100, emoji: '🐉💥', learnLevel: 1, category: 'physical', description: '분노에 찬 난타!' },
  icebeam:      { name: '냉동빔', type: 'ice', power: 90, accuracy: 100, emoji: '❄️', learnLevel: 1, category: 'special', effect: 'freeze', effectChance: 10, description: '얼어붙는 빔' },
  aurora:       { name: '오로라빔', type: 'ice', power: 65, accuracy: 100, emoji: '🌌', learnLevel: 1, category: 'special', description: '오로라 빔으로 공격' },
  barrier:      { name: '배리어', type: 'psychic', power: 0, accuracy: 0, emoji: '🛡️', learnLevel: 1, category: 'special', effect: 'boost_atk', effectChance: 100, description: '벽을 만들어 방어 상승' },
  swordsdance:  { name: '칼춤', type: 'normal', power: 0, accuracy: 0, emoji: '⚔️', learnLevel: 1, category: 'physical', effect: 'boost_atk', effectChance: 100, description: '춤을 춰 공격력 대폭 상승' },
  fireblast:    { name: '불대문자', type: 'fire', power: 110, accuracy: 85, emoji: '🔥💥', learnLevel: 1, category: 'special', effect: 'burn', effectChance: 10, description: '대문자 모양 불꽃' },
  overheat:     { name: '오버히트', type: 'fire', power: 130, accuracy: 90, emoji: '🌋', learnLevel: 1, category: 'special', description: '최대 화력! 반동이 크다' },
  dragonrage:   { name: '용의분노', type: 'dragon', power: 40, accuracy: 100, emoji: '🐲', learnLevel: 1, category: 'special', description: '용의 분노로 공격' },
  magnitude:    { name: '매그니튜드', type: 'ground', power: 60, accuracy: 100, emoji: '⛰️', learnLevel: 1, category: 'physical', description: '땅을 흔들어 공격' },
  vicegrip:     { name: '집게쥐기', type: 'normal', power: 55, accuracy: 100, emoji: '🦀', learnLevel: 1, category: 'physical', description: '집게로 힘껏 조이기' },
  harden:       { name: '단단해지기', type: 'normal', power: 0, accuracy: 0, emoji: '🛡️', learnLevel: 1, category: 'physical', effect: 'boost_atk', effectChance: 100, description: '몸을 단단하게 만든다' },
  bodypress:    { name: '바디프레스', type: 'normal', power: 85, accuracy: 100, emoji: '🏋️', learnLevel: 1, category: 'physical', description: '몸으로 누르기' },
  icywind:      { name: '얼음바람', type: 'ice', power: 55, accuracy: 95, emoji: '🌬️❄️', learnLevel: 1, category: 'special', description: '차가운 바람으로 공격' },
  discharge:    { name: '방전', type: 'electric', power: 80, accuracy: 100, emoji: '⚡', learnLevel: 1, category: 'special', effect: 'paralyze', effectChance: 30, description: '전기를 방출' },
  rockslide:    { name: '암석낙하', type: 'rock', power: 75, accuracy: 90, emoji: '🪨💥', learnLevel: 1, category: 'physical', effect: 'flinch', effectChance: 30, description: '바위를 떨어뜨린다' },
  rest:         { name: '잠자기', type: 'normal', power: 0, accuracy: 0, emoji: '😴', learnLevel: 1, category: 'special', effect: 'heal', effectChance: 100, description: '잠을 자서 HP 전부 회복' },
  spark:        { name: '스파크', type: 'electric', power: 65, accuracy: 100, emoji: '⚡', learnLevel: 1, category: 'physical', effect: 'paralyze', effectChance: 30, description: '전기를 두르고 돌진' },
  bubble:       { name: '거품', type: 'water', power: 40, accuracy: 100, emoji: '🫧', learnLevel: 1, category: 'special', description: '거품을 뿜어 공격' },
  splash:       { name: '튀어오르기', type: 'normal', power: 0, accuracy: 0, emoji: '💦', learnLevel: 1, category: 'physical', description: '튀어올라서... 아무 일도 없었다!' },
  quickattack:  { name: '전광석화', type: 'normal', power: 40, accuracy: 100, emoji: '⚡', learnLevel: 1, category: 'physical', description: '빠른 선제 공격' },
  pound:        { name: '막치기', type: 'normal', power: 40, accuracy: 100, emoji: '💥', learnLevel: 1, category: 'physical', description: '힘껏 때리기' },
  sing:         { name: '노래하기', type: 'normal', power: 0, accuracy: 55, emoji: '🎵', learnLevel: 1, category: 'special', description: '노래로 잠재운다' },
  tailwhip:     { name: '꼬리흔들기', type: 'normal', power: 0, accuracy: 100, emoji: '🐕', learnLevel: 1, category: 'physical', effect: 'lower_def', effectChance: 100, description: '꼬리를 흔들어 방어를 낮춘다' },
  stringshot:   { name: '실뿜기', type: 'grass', power: 0, accuracy: 95, emoji: '🕸️', learnLevel: 1, category: 'special', description: '실을 뿜어 속도를 낮춘다' },
  disable:      { name: '기술봉인', type: 'normal', power: 0, accuracy: 100, emoji: '🚫', learnLevel: 1, category: 'special', description: '기술을 사용하지 못하게 한다' },
  wingattack:   { name: '날개치기', type: 'flying', power: 60, accuracy: 100, emoji: '🪽', learnLevel: 1, category: 'physical', description: '날개로 공격' },
};

// ─── Struggle (fallback when no damaging moves) ────────
const STRUGGLE: BattleMove = {
  name: '발버둥', type: 'normal', power: 50, accuracy: 100, emoji: '💢',
  learnLevel: 1, category: 'physical', description: '다른 기술이 없을 때 발버둥친다',
};

/**
 * Get moves for a specific Pokemon species using its learnset.
 * Falls back to type-based selection if no learnset found.
 */
export function getMovesForPokemon(speciesId: number, pokemonLevel?: number): BattleMove[] {
  const species = getPokemonById(speciesId);
  if (!species) return [STRUGGLE];

  const moves = species.learnset
    .map(name => MOVE_DB[name])
    .filter((m): m is BattleMove => m != null);

  // Ensure at least one damaging move
  const hasDamaging = moves.some(m => m.power > 0);
  if (!hasDamaging) {
    moves.push(STRUGGLE);
  }

  // FIX #1: 레벨 기반 스킬 슬롯 해금
  if (pokemonLevel !== undefined) {
    const SLOT_TABLE = [
      { level: 1, slots: 1 },
      { level: 5, slots: 2 },
      { level: 12, slots: 3 },
      { level: 20, slots: 4 },
    ];
    let slots = 1;
    for (const entry of SLOT_TABLE) {
      if (pokemonLevel >= entry.level) slots = entry.slots;
    }
    return moves.slice(0, slots);
  }

  return moves.slice(0, 4);
}

/**
 * Legacy compatibility: Get available moves for a Pokemon based on its types and level.
 * Now delegates to getMovesForPokemon when possible.
 * @deprecated Use getMovesForPokemon(speciesId) instead
 */
export function getMovesForLevel(types: PokemonType[], level: number, speciesId?: number): BattleMove[] {
  if (speciesId) {
    return getMovesForPokemon(speciesId);
  }

  // Fallback: type-based selection for NPCs without a speciesId
  const allMoves: BattleMove[] = [];
  for (const t of types) {
    // Find damaging moves of this type in MOVE_DB
    const typeMoves = Object.values(MOVE_DB).filter(m => m.type === t && m.power > 0);
    allMoves.push(...typeMoves);
  }

  // Add normal moves
  const normalMoves = Object.values(MOVE_DB).filter(m => m.type === 'normal' && m.power > 0);
  allMoves.push(...normalMoves);

  // Remove duplicates by name
  const unique = Array.from(new Map(allMoves.map(m => [m.name, m])).values());

  // Sort by power descending, then pick top 4
  unique.sort((a, b) => b.power - a.power);
  return unique.length > 0 ? unique.slice(0, 4) : [STRUGGLE];
}

/**
 * Get ALL moves a Pokemon can ever learn (for display)
 */
export function getAllLearnableMoves(types: PokemonType[], speciesId?: number): BattleMove[] {
  if (speciesId) {
    const species = getPokemonById(speciesId);
    if (species) {
      return species.learnset
        .map(name => MOVE_DB[name])
        .filter((m): m is BattleMove => m != null);
    }
  }

  // Fallback
  const allMoves: BattleMove[] = [];
  for (const t of types) {
    const typeMoves = Object.values(MOVE_DB).filter(m => m.type === t);
    allMoves.push(...typeMoves);
  }
  const normalMoves = Object.values(MOVE_DB).filter(m => m.type === 'normal');
  allMoves.push(...normalMoves);
  const unique = Array.from(new Map(allMoves.map(m => [m.name, m])).values());
  unique.sort((a, b) => a.power - b.power);
  return unique;
}

// Re-export for external use if needed
export { MOVE_DB };
