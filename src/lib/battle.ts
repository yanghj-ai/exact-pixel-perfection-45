// ═══════════════════════════════════════════════════════════
// 포켓몬 배틀 시뮬레이션 엔진
// 턴제 자동 배틀 — 친밀도/레벨/타입 상성 반영
// ═══════════════════════════════════════════════════════════

import { getPokemonById, type PokemonType, type PokemonSpecies } from './pokemon-registry';
import type { OwnedPokemon } from './collection';

// ─── Types ───────────────────────────────────────────────

export interface BattlePokemon {
  uid: string;
  speciesId: number;
  name: string;
  nickname: string | null;
  level: number;
  friendship: number;
  types: PokemonType[];
  spriteUrl: string;

  // Computed battle stats
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface BattleMove {
  name: string;
  type: PokemonType;
  power: number;
  emoji: string;
}

export interface BattleTurnLog {
  turn: number;
  attackerUid: string;
  defenderUid: string;
  move: BattleMove;
  damage: number;
  effectiveness: number; // 0.5, 1, 2
  critical: boolean;
  defenderHpAfter: number;
  defenderFainted: boolean;
  message: string;
}

export interface BattleResult {
  winner: 'player' | 'opponent';
  playerTeam: BattlePokemon[];
  opponentTeam: BattlePokemon[];
  turns: BattleTurnLog[];
  totalTurns: number;
  rewards: { coins: number; exp: number };
}

// ─── Type Effectiveness ──────────────────────────────────

const TYPE_CHART: Partial<Record<PokemonType, { strong: PokemonType[]; weak: PokemonType[] }>> = {
  fire: { strong: ['grass', 'ice', 'bug'], weak: ['water', 'rock', 'ground'] },
  water: { strong: ['fire', 'rock', 'ground'], weak: ['grass', 'electric'] },
  grass: { strong: ['water', 'rock', 'ground'], weak: ['fire', 'ice', 'flying', 'bug', 'poison'] },
  electric: { strong: ['water', 'flying'], weak: ['ground'] },
  ice: { strong: ['grass', 'ground', 'flying', 'dragon'], weak: ['fire', 'fighting', 'rock'] },
  fighting: { strong: ['normal', 'ice', 'rock'], weak: ['flying', 'psychic', 'fairy'] },
  poison: { strong: ['grass', 'fairy'], weak: ['ground', 'psychic'] },
  ground: { strong: ['fire', 'electric', 'poison', 'rock'], weak: ['water', 'grass', 'ice'] },
  flying: { strong: ['grass', 'fighting', 'bug'], weak: ['electric', 'ice', 'rock'] },
  psychic: { strong: ['fighting', 'poison'], weak: ['bug', 'ghost'] },
  bug: { strong: ['grass', 'psychic'], weak: ['fire', 'flying', 'rock'] },
  rock: { strong: ['fire', 'ice', 'flying', 'bug'], weak: ['water', 'grass', 'fighting', 'ground'] },
  ghost: { strong: ['psychic', 'ghost'], weak: ['ghost'] },
  dragon: { strong: ['dragon'], weak: ['ice', 'dragon', 'fairy'] },
  fairy: { strong: ['fighting', 'dragon'], weak: ['poison'] },
  normal: { strong: [], weak: ['fighting'] },
};

function getEffectiveness(attackType: PokemonType, defenderTypes: PokemonType[]): number {
  let mult = 1;
  const chart = TYPE_CHART[attackType];
  if (!chart) return 1;
  for (const dt of defenderTypes) {
    if (chart.strong.includes(dt)) mult *= 2;
    if (chart.weak.includes(dt)) mult *= 0.5;
  }
  return mult;
}

// ─── Moves ───────────────────────────────────────────────

const TYPE_MOVES: Record<PokemonType, BattleMove[]> = {
  fire: [
    { name: '화염방사', type: 'fire', power: 90, emoji: '🔥' },
    { name: '불꽃세례', type: 'fire', power: 65, emoji: '🔥' },
  ],
  water: [
    { name: '파도타기', type: 'water', power: 90, emoji: '🌊' },
    { name: '물대포', type: 'water', power: 65, emoji: '💧' },
  ],
  grass: [
    { name: '솔라빔', type: 'grass', power: 90, emoji: '🌿' },
    { name: '잎날가르기', type: 'grass', power: 70, emoji: '🍃' },
  ],
  electric: [
    { name: '10만볼트', type: 'electric', power: 90, emoji: '⚡' },
    { name: '전기충격', type: 'electric', power: 65, emoji: '⚡' },
  ],
  ice: [
    { name: '냉동빔', type: 'ice', power: 90, emoji: '❄️' },
    { name: '얼음뭉치', type: 'ice', power: 60, emoji: '🧊' },
  ],
  psychic: [
    { name: '사이코키네시스', type: 'psychic', power: 90, emoji: '🔮' },
    { name: '사념의파동', type: 'psychic', power: 70, emoji: '💜' },
  ],
  fighting: [
    { name: '인파이팅', type: 'fighting', power: 85, emoji: '👊' },
    { name: '깨뜨리기', type: 'fighting', power: 65, emoji: '💥' },
  ],
  poison: [
    { name: '오물폭탄', type: 'poison', power: 80, emoji: '☠️' },
    { name: '독찌르기', type: 'poison', power: 60, emoji: '💀' },
  ],
  ground: [
    { name: '지진', type: 'ground', power: 100, emoji: '🌍' },
    { name: '땅고르기', type: 'ground', power: 60, emoji: '⛰️' },
  ],
  flying: [
    { name: '공중날기', type: 'flying', power: 85, emoji: '🦅' },
    { name: '공기베기', type: 'flying', power: 60, emoji: '💨' },
  ],
  bug: [
    { name: '시저크로스', type: 'bug', power: 80, emoji: '🪲' },
    { name: '벌레의저항', type: 'bug', power: 50, emoji: '🐛' },
  ],
  rock: [
    { name: '스톤에지', type: 'rock', power: 100, emoji: '🪨' },
    { name: '돌떨구기', type: 'rock', power: 60, emoji: '�ite' },
  ],
  ghost: [
    { name: '섀도볼', type: 'ghost', power: 80, emoji: '👻' },
    { name: '야습', type: 'ghost', power: 60, emoji: '🌑' },
  ],
  dragon: [
    { name: '용성군', type: 'dragon', power: 130, emoji: '🐉' },
    { name: '드래곤크루', type: 'dragon', power: 80, emoji: '🐲' },
  ],
  fairy: [
    { name: '문포스', type: 'fairy', power: 95, emoji: '🌙' },
    { name: '요정의바람', type: 'fairy', power: 60, emoji: '✨' },
  ],
  normal: [
    { name: '몸통박치기', type: 'normal', power: 50, emoji: '💥' },
    { name: '전광석화', type: 'normal', power: 40, emoji: '⚡' },
  ],
};

function getMovesForPokemon(types: PokemonType[]): BattleMove[] {
  const moves: BattleMove[] = [];
  for (const t of types) {
    const typeMoves = TYPE_MOVES[t] || TYPE_MOVES.normal;
    moves.push(typeMoves[0]);
  }
  // Add a normal move if only 1 type
  if (moves.length < 2) {
    moves.push(TYPE_MOVES.normal[0]);
  }
  return moves;
}

// ─── Stat Calculation ────────────────────────────────────

function computeBattleStats(owned: OwnedPokemon, species: PokemonSpecies): BattlePokemon {
  // Base stats scale with level + friendship bonus
  const friendshipBonus = 1 + (owned.friendship / 255) * 0.3; // up to +30%
  const levelFactor = owned.level;

  const baseHp = 40 + levelFactor * 3;
  const baseAtk = 15 + levelFactor * 2;
  const baseDef = 12 + levelFactor * 1.5;
  const baseSpd = 10 + levelFactor * 1.2;

  // Rarity multiplier
  const rarityMult: Record<string, number> = {
    common: 0.85, uncommon: 0.95, rare: 1.05, epic: 1.15, legendary: 1.3,
  };
  const rMult = rarityMult[species.rarity] || 1;

  return {
    uid: owned.uid,
    speciesId: owned.speciesId,
    name: species.name,
    nickname: owned.nickname,
    level: owned.level,
    friendship: owned.friendship,
    types: species.types,
    spriteUrl: species.spriteUrl,
    maxHp: Math.round(baseHp * friendshipBonus * rMult),
    currentHp: Math.round(baseHp * friendshipBonus * rMult),
    attack: Math.round(baseAtk * friendshipBonus * rMult),
    defense: Math.round(baseDef * friendshipBonus * rMult),
    speed: Math.round(baseSpd * friendshipBonus * rMult),
  };
}

export function buildBattleTeam(ownedPokemon: OwnedPokemon[]): BattlePokemon[] {
  return ownedPokemon
    .map(p => {
      const species = getPokemonById(p.speciesId);
      if (!species) return null;
      return computeBattleStats(p, species);
    })
    .filter(Boolean) as BattlePokemon[];
}

// ─── NPC Team Builder ────────────────────────────────────

export function buildNpcBattleTeam(speciesIds: number[], level: number, friendship: number): BattlePokemon[] {
  return speciesIds
    .map((id, i) => {
      const species = getPokemonById(id);
      if (!species) return null;
      const fake: OwnedPokemon = {
        uid: `npc_${id}_${i}`,
        speciesId: id,
        nickname: null,
        friendship,
        level,
        acquiredDate: '',
        acquiredMethod: 'encounter',
        isInParty: true,
      };
      return computeBattleStats(fake, species);
    })
    .filter(Boolean) as BattlePokemon[];
}

// ─── Battle Simulation ──────────────────────────────────

export function simulateBattle(playerTeam: BattlePokemon[], opponentTeam: BattlePokemon[]): BattleResult {
  const turns: BattleTurnLog[] = [];
  let turnCount = 0;
  const maxTurns = 100;

  // Clone HP
  const pTeam = playerTeam.map(p => ({ ...p }));
  const oTeam = opponentTeam.map(p => ({ ...p }));

  let pIdx = 0;
  let oIdx = 0;

  while (pIdx < pTeam.length && oIdx < oTeam.length && turnCount < maxTurns) {
    turnCount++;
    const attacker = pTeam[pIdx];
    const defender = oTeam[oIdx];

    // Determine who goes first by speed
    const playerFirst = attacker.speed >= defender.speed;
    const first = playerFirst ? attacker : defender;
    const second = playerFirst ? defender : attacker;
    const firstIsPlayer = playerFirst;

    // First attack
    const result1 = doAttack(first, second, turnCount, firstIsPlayer);
    turns.push(result1);
    if (result1.defenderFainted) {
      if (firstIsPlayer) oIdx++;
      else pIdx++;
      if (pIdx >= pTeam.length || oIdx >= oTeam.length) break;
      continue;
    }

    // Second attack
    turnCount++;
    const result2 = doAttack(second, first, turnCount, !firstIsPlayer);
    turns.push(result2);
    if (result2.defenderFainted) {
      if (!firstIsPlayer) oIdx++;
      else pIdx++;
    }
  }

  const playerWon = oIdx >= oTeam.length;
  const avgOpponentLevel = opponentTeam.reduce((s, p) => s + p.level, 0) / opponentTeam.length;
  const rewards = playerWon
    ? { coins: Math.round(10 + avgOpponentLevel * 2), exp: Math.round(15 + avgOpponentLevel * 3) }
    : { coins: Math.round(3 + avgOpponentLevel * 0.5), exp: Math.round(5 + avgOpponentLevel) };

  return {
    winner: playerWon ? 'player' : 'opponent',
    playerTeam: pTeam,
    opponentTeam: oTeam,
    turns,
    totalTurns: turnCount,
    rewards,
  };
}

function doAttack(attacker: BattlePokemon, defender: BattlePokemon, turn: number, isPlayerAttacking: boolean): BattleTurnLog {
  const moves = getMovesForPokemon(attacker.types);
  // Pick best move (highest effective damage)
  let bestMove = moves[0];
  let bestDmg = 0;
  for (const m of moves) {
    const eff = getEffectiveness(m.type, defender.types);
    const d = m.power * eff;
    if (d > bestDmg) { bestDmg = d; bestMove = m; }
  }

  const effectiveness = getEffectiveness(bestMove.type, defender.types);
  const critical = Math.random() < 0.1;
  const critMult = critical ? 1.5 : 1;
  const stab = attacker.types.includes(bestMove.type) ? 1.5 : 1;
  const randomFactor = 0.85 + Math.random() * 0.15;

  let damage = Math.round(
    ((attacker.attack * bestMove.power) / (defender.defense * 2.5)) *
    effectiveness * critMult * stab * randomFactor
  );
  damage = Math.max(1, damage);

  defender.currentHp = Math.max(0, defender.currentHp - damage);
  const fainted = defender.currentHp <= 0;

  const aName = attacker.nickname || attacker.name;
  const dName = defender.nickname || defender.name;
  let message = `${aName}의 ${bestMove.name}! `;
  if (effectiveness > 1) message += '효과는 굉장했다! ';
  else if (effectiveness < 1) message += '효과가 별로인 듯하다... ';
  if (critical) message += '급소에 맞았다! ';
  message += `${damage} 데미지!`;
  if (fainted) message += ` ${dName}은(는) 쓰러졌다!`;

  return {
    turn,
    attackerUid: attacker.uid,
    defenderUid: defender.uid,
    move: bestMove,
    damage,
    effectiveness,
    critical,
    defenderHpAfter: defender.currentHp,
    defenderFainted: fainted,
    message,
  };
}

// ─── Battle Records ──────────────────────────────────────

const BATTLE_STORAGE = 'routinmon-battles';

export interface BattleRecord {
  id: string;
  date: string;
  opponentName: string;
  result: 'win' | 'lose';
  coinsEarned: number;
  expEarned: number;
}

export function getBattleRecords(): BattleRecord[] {
  const data = localStorage.getItem(BATTLE_STORAGE);
  return data ? JSON.parse(data) : [];
}

export function saveBattleRecord(record: BattleRecord) {
  const records = getBattleRecords();
  records.unshift(record);
  if (records.length > 50) records.length = 50;
  localStorage.setItem(BATTLE_STORAGE, JSON.stringify(records));
}

export function getWeeklyBattleStats() {
  const records = getBattleRecords();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().split('T')[0];
  const thisWeek = records.filter(r => r.date >= weekStr);
  return {
    wins: thisWeek.filter(r => r.result === 'win').length,
    losses: thisWeek.filter(r => r.result === 'lose').length,
    totalCoins: thisWeek.reduce((s, r) => s + r.coinsEarned, 0),
  };
}

export function resetBattleRecords() {
  localStorage.removeItem(BATTLE_STORAGE);
}
