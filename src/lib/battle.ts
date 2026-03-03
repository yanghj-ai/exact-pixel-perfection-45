// ═══════════════════════════════════════════════════════════
// 포켓몬 배틀 시뮬레이션 엔진
// 턴제 자동 배틀 — 친밀도/레벨/타입 상성 반영
// 레벨별 기술 습득 & 부상 시스템 통합
// ═══════════════════════════════════════════════════════════

import { getPokemonById, type PokemonType, type PokemonSpecies } from './pokemon-registry';
import { type OwnedPokemon, getCoins } from './collection';
import { getMovesForLevel, type BattleMove } from './battle-moves';
import { getEffectiveHpRatio } from './pokemon-health';

// Re-export BattleMove for convenience
export type { BattleMove } from './battle-moves';

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
  moves: BattleMove[]; // learned moves

  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;

  // Status effects from moves
  status: 'none' | 'burn' | 'freeze' | 'paralyze';
  atkModifier: number; // multiplicative, default 1
  defModifier: number;
}

export interface BattleTurnLog {
  turn: number;
  attackerUid: string;
  defenderUid: string;
  move: BattleMove;
  damage: number;
  effectiveness: number;
  critical: boolean;
  missed: boolean;
  statusApplied: string | null;
  healAmount: number;
  defenderHpAfter: number;
  defenderFainted: boolean;
  message: string;
}

export interface BattleReward {
  coins: number;       // positive = earned, negative = lost
  exp: number;
  bonusItems: { name: string; emoji: string; count: number }[];
  coinsLost: number;   // how much coins lost on defeat (always >= 0)
}

export interface BattleResult {
  winner: 'player' | 'opponent';
  playerTeam: BattlePokemon[];
  opponentTeam: BattlePokemon[];
  turns: BattleTurnLog[];
  totalTurns: number;
  rewards: BattleReward;
  /** HP ratios of player team after battle for injury tracking */
  playerHpRatios: { uid: string; hpRatio: number }[];
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

// ─── Stat Calculation ────────────────────────────────────

function computeBattleStats(owned: OwnedPokemon, species: PokemonSpecies, applyInjury: boolean = false): BattlePokemon {
  const friendshipBonus = 1 + (owned.friendship / 255) * 0.3;
  const levelFactor = owned.level;

  const baseHp = 40 + levelFactor * 3;
  const baseAtk = 15 + levelFactor * 2;
  const baseDef = 12 + levelFactor * 1.5;
  const baseSpd = 10 + levelFactor * 1.2;

  const rarityMult: Record<string, number> = {
    common: 0.85, uncommon: 0.95, rare: 1.05, epic: 1.15, legendary: 1.3,
  };
  const rMult = rarityMult[species.rarity] || 1;

  const maxHp = Math.round(baseHp * friendshipBonus * rMult);

  // Apply injury: start with reduced HP
  const injuryRatio = applyInjury ? getEffectiveHpRatio(owned.uid) : 1;
  const startingHp = Math.max(1, Math.round(maxHp * injuryRatio));

  // Get moves based on level
  const moves = getMovesForLevel(species.types, owned.level);

  return {
    uid: owned.uid,
    speciesId: owned.speciesId,
    name: species.name,
    nickname: owned.nickname,
    level: owned.level,
    friendship: owned.friendship,
    types: species.types,
    spriteUrl: species.spriteUrl,
    moves,
    maxHp,
    currentHp: startingHp,
    attack: Math.round(baseAtk * friendshipBonus * rMult),
    defense: Math.round(baseDef * friendshipBonus * rMult),
    speed: Math.round(baseSpd * friendshipBonus * rMult),
    status: 'none',
    atkModifier: 1,
    defModifier: 1,
  };
}

export function buildBattleTeam(ownedPokemon: OwnedPokemon[]): BattlePokemon[] {
  return ownedPokemon
    .map(p => {
      const species = getPokemonById(p.speciesId);
      if (!species) return null;
      return computeBattleStats(p, species, true); // apply injury
    })
    .filter(Boolean) as BattlePokemon[];
}

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
      return computeBattleStats(fake, species, false);
    })
    .filter(Boolean) as BattlePokemon[];
}

// ─── Battle Simulation ──────────────────────────────────

export function simulateBattle(playerTeam: BattlePokemon[], opponentTeam: BattlePokemon[]): BattleResult {
  const turns: BattleTurnLog[] = [];
  let turnCount = 0;
  const maxTurns = 100;

  const pTeam = playerTeam.map(p => ({ ...p }));
  const oTeam = opponentTeam.map(p => ({ ...p }));

  let pIdx = 0;
  let oIdx = 0;

  while (pIdx < pTeam.length && oIdx < oTeam.length && turnCount < maxTurns) {
    turnCount++;
    const attacker = pTeam[pIdx];
    const defender = oTeam[oIdx];

    // Skip if frozen (10% thaw chance)
    if (attacker.status === 'freeze' && Math.random() > 0.1) {
      // skip turn
    } else if (attacker.status === 'paralyze' && Math.random() < 0.25) {
      // paralysis skip
    } else {
      const playerFirst = attacker.speed >= defender.speed;
      const first = playerFirst ? attacker : defender;
      const second = playerFirst ? defender : attacker;
      const firstIsPlayer = playerFirst;

      const result1 = doAttack(first, second, turnCount, firstIsPlayer);
      turns.push(result1);
      if (result1.defenderFainted) {
        if (firstIsPlayer) oIdx++;
        else pIdx++;
        if (pIdx >= pTeam.length || oIdx >= oTeam.length) break;
        continue;
      }

      turnCount++;
      const result2 = doAttack(second, first, turnCount, !firstIsPlayer);
      turns.push(result2);
      if (result2.defenderFainted) {
        if (!firstIsPlayer) oIdx++;
        else pIdx++;
      }
    }
  }

  const playerWon = oIdx >= oTeam.length;

  // ─── Enhanced Rewards ─────────────────
  const avgOpponentLevel = opponentTeam.reduce((s, p) => s + p.level, 0) / opponentTeam.length;
  const avgPlayerLevel = playerTeam.reduce((s, p) => s + p.level, 0) / playerTeam.length;
  const levelDiff = avgOpponentLevel - avgPlayerLevel;

  // Base rewards
  let baseCoins = 10 + avgOpponentLevel * 2;
  let baseExp = 15 + avgOpponentLevel * 3;

  // Level difference bonus (harder opponents = more rewards)
  if (levelDiff > 0) {
    baseCoins *= 1 + levelDiff * 0.1;
    baseExp *= 1 + levelDiff * 0.15;
  }

  // Team size multiplier (fighting more pokemon = more rewards)
  const teamSizeMult = 1 + (opponentTeam.length - 1) * 0.15;
  baseCoins *= teamSizeMult;
  baseExp *= teamSizeMult;

  // Loss: lose coins instead of gaining
  let coinsLost = 0;
  if (!playerWon) {
    const currentCoins = getCoins();
    const lossRate = Math.min(0.3, 0.1 + avgOpponentLevel * 0.005);
    coinsLost = Math.round(currentCoins * lossRate);
    coinsLost = Math.max(5, Math.min(coinsLost, currentCoins));
    coinsLost = Math.round(currentCoins * lossRate);
    coinsLost = Math.max(5, Math.min(coinsLost, currentCoins)); // at least 5, at most all coins
    baseCoins = 0;
    baseExp = 0;
  }

  // Bonus items (only on win)
  const bonusItems: { name: string; emoji: string; count: number }[] = [];
  if (playerWon) {
    if (Math.random() < 0.3) {
      bonusItems.push({ name: '상처약', emoji: '💊', count: 1 });
    }
    if (Math.random() < 0.25) {
      bonusItems.push({ name: '먹이', emoji: '🍎', count: Math.floor(Math.random() * 2) + 1 });
    }
    if (avgOpponentLevel >= 20 && Math.random() < 0.1) {
      bonusItems.push({ name: '알 교환권', emoji: '🎫', count: 1 });
    }
  }

  const rewards: BattleReward = {
    coins: Math.round(baseCoins),
    exp: Math.round(baseExp),
    bonusItems,
    coinsLost,
  };

  // Track HP ratios for injury system
  const playerHpRatios = pTeam.map(p => ({
    uid: p.uid,
    hpRatio: p.currentHp / p.maxHp,
  }));

  return {
    winner: playerWon ? 'player' : 'opponent',
    playerTeam: pTeam,
    opponentTeam: oTeam,
    turns,
    totalTurns: turnCount,
    rewards,
    playerHpRatios,
  };
}

function doAttack(attacker: BattlePokemon, defender: BattlePokemon, turn: number, isPlayerAttacking: boolean): BattleTurnLog {
  const moves = attacker.moves.length > 0 ? attacker.moves : getMovesForLevel(attacker.types, attacker.level);

  // Pick best effective move
  let bestMove = moves[0];
  let bestDmg = 0;
  for (const m of moves) {
    const eff = getEffectiveness(m.type, defender.types);
    const d = m.power * eff;
    if (d > bestDmg) { bestDmg = d; bestMove = m; }
  }

  // Accuracy check
  const accuracyRoll = Math.random() * 100;
  const missed = accuracyRoll > bestMove.accuracy;

  if (missed) {
    const aName = attacker.nickname || attacker.name;
    return {
      turn,
      attackerUid: attacker.uid,
      defenderUid: defender.uid,
      move: bestMove,
      damage: 0,
      effectiveness: 1,
      critical: false,
      missed: true,
      statusApplied: null,
      healAmount: 0,
      defenderHpAfter: defender.currentHp,
      defenderFainted: false,
      message: `${aName}의 ${bestMove.name}! 하지만 빗나갔다!`,
    };
  }

  const effectiveness = getEffectiveness(bestMove.type, defender.types);
  const critical = Math.random() < 0.1;
  const critMult = critical ? 1.5 : 1;
  const stab = attacker.types.includes(bestMove.type) ? 1.5 : 1;
  const randomFactor = 0.85 + Math.random() * 0.15;

  // Status modifiers
  const atkMod = attacker.atkModifier * (attacker.status === 'burn' ? 0.5 : 1);
  const defMod = defender.defModifier;

  let damage = Math.round(
    ((attacker.attack * atkMod * bestMove.power) / (defender.defense * defMod * 2.5)) *
    effectiveness * critMult * stab * randomFactor
  );
  damage = Math.max(1, damage);

  defender.currentHp = Math.max(0, defender.currentHp - damage);
  const fainted = defender.currentHp <= 0;

  // Apply move effects
  let statusApplied: string | null = null;
  let healAmount = 0;

  if (bestMove.effect && bestMove.effectChance && !fainted) {
    const effectRoll = Math.random() * 100;
    if (effectRoll < bestMove.effectChance) {
      switch (bestMove.effect) {
        case 'burn':
          if (defender.status === 'none') { defender.status = 'burn'; statusApplied = 'burn'; }
          break;
        case 'freeze':
          if (defender.status === 'none') { defender.status = 'freeze'; statusApplied = 'freeze'; }
          break;
        case 'paralyze':
          if (defender.status === 'none') { defender.status = 'paralyze'; statusApplied = 'paralyze'; }
          break;
        case 'heal':
          healAmount = Math.round(damage * 0.5);
          attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
          break;
        case 'boost_atk':
          attacker.atkModifier = Math.min(2, attacker.atkModifier * 1.3);
          break;
        case 'lower_def':
          defender.defModifier = Math.max(0.5, defender.defModifier * 0.8);
          statusApplied = 'lower_def';
          break;
      }
    }
  }

  // Burn damage
  if (defender.status === 'burn' && !fainted) {
    const burnDmg = Math.max(1, Math.round(defender.maxHp * 0.06));
    defender.currentHp = Math.max(0, defender.currentHp - burnDmg);
  }

  const aName = attacker.nickname || attacker.name;
  const dName = defender.nickname || defender.name;
  let message = `${aName}의 ${bestMove.name}! `;
  if (effectiveness > 1) message += '효과는 굉장했다! ';
  else if (effectiveness < 1) message += '효과가 별로인 듯하다... ';
  if (critical) message += '급소에 맞았다! ';
  message += `${damage} 데미지!`;
  if (statusApplied === 'burn') message += ` ${dName}은(는) 화상을 입었다!`;
  if (statusApplied === 'freeze') message += ` ${dName}은(는) 얼어붙었다!`;
  if (statusApplied === 'paralyze') message += ` ${dName}은(는) 마비되었다!`;
  if (statusApplied === 'lower_def') message += ` ${dName}의 방어가 떨어졌다!`;
  if (healAmount > 0) message += ` ${aName}은(는) ${healAmount} HP 회복!`;
  if (fainted || defender.currentHp <= 0) message += ` ${dName}은(는) 쓰러졌다!`;

  return {
    turn,
    attackerUid: attacker.uid,
    defenderUid: defender.uid,
    move: bestMove,
    damage,
    effectiveness,
    critical,
    missed: false,
    statusApplied,
    healAmount,
    defenderHpAfter: defender.currentHp,
    defenderFainted: fainted || defender.currentHp <= 0,
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
