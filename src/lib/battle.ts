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

export function getEffectiveness(attackType: PokemonType, defenderTypes: PokemonType[]): number {
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

// ─── Turn-based Battle State ─────────────────────────────

export interface TurnBasedBattleState {
  playerTeam: BattlePokemon[];
  opponentTeam: BattlePokemon[];
  playerIdx: number;
  opponentIdx: number;
  turnCount: number;
  turns: BattleTurnLog[];
  phase: 'player_choose' | 'animating' | 'finished';
  winner: 'player' | 'opponent' | null;
}

export function initTurnBattle(playerTeam: BattlePokemon[], opponentTeam: BattlePokemon[]): TurnBasedBattleState {
  return {
    playerTeam: playerTeam.map(p => ({ ...p })),
    opponentTeam: opponentTeam.map(p => ({ ...p })),
    playerIdx: 0,
    opponentIdx: 0,
    turnCount: 0,
    turns: [],
    phase: 'player_choose',
    winner: null,
  };
}

/** Choose best move for NPC (AI) */
function chooseNpcMove(attacker: BattlePokemon, defender: BattlePokemon): BattleMove {
  const moves = attacker.moves.length > 0 ? attacker.moves : getMovesForLevel(attacker.types, attacker.level);
  let bestMove = moves[0];
  let bestDmg = 0;
  for (const m of moves) {
    const eff = getEffectiveness(m.type, defender.types);
    const d = m.power * eff;
    if (d > bestDmg) { bestDmg = d; bestMove = m; }
  }
  return bestMove;
}

/** Execute one turn: player uses chosen move, opponent auto-picks. Returns new turn logs for this turn. */
export function executeTurn(state: TurnBasedBattleState, playerMove: BattleMove): BattleTurnLog[] {
  const newTurns: BattleTurnLog[] = [];
  const player = state.playerTeam[state.playerIdx];
  const opponent = state.opponentTeam[state.opponentIdx];

  if (!player || !opponent) return newTurns;

  const opponentMove = chooseNpcMove(opponent, player);

  state.turnCount++;

  // Speed determines who goes first
  const playerFirst = player.speed >= opponent.speed;
  const first = playerFirst ? player : opponent;
  const second = playerFirst ? opponent : player;
  const firstMove = playerFirst ? playerMove : opponentMove;
  const secondMove = playerFirst ? opponentMove : playerMove;
  const firstIsPlayer = playerFirst;

  // Skip checks for status
  const canAct = (p: BattlePokemon) => {
    if (p.status === 'freeze' && Math.random() > 0.1) return false;
    if (p.status === 'paralyze' && Math.random() < 0.25) return false;
    return true;
  };

  // First attacker
  if (canAct(first)) {
    const log1 = doAttack(first, second, state.turnCount, firstIsPlayer, firstMove);
    newTurns.push(log1);
    state.turns.push(log1);

    if (log1.defenderFainted) {
      if (firstIsPlayer) {
        state.opponentIdx++;
      } else {
        state.playerIdx++;
      }
      if (state.playerIdx >= state.playerTeam.length) {
        state.phase = 'finished';
        state.winner = 'opponent';
      } else if (state.opponentIdx >= state.opponentTeam.length) {
        state.phase = 'finished';
        state.winner = 'player';
      }
      return newTurns;
    }
  }

  // Second attacker
  if (canAct(second) && second.currentHp > 0) {
    const log2 = doAttack(second, first, state.turnCount, !firstIsPlayer, secondMove);
    newTurns.push(log2);
    state.turns.push(log2);

    if (log2.defenderFainted) {
      if (!firstIsPlayer) {
        state.opponentIdx++;
      } else {
        state.playerIdx++;
      }
      if (state.playerIdx >= state.playerTeam.length) {
        state.phase = 'finished';
        state.winner = 'opponent';
      } else if (state.opponentIdx >= state.opponentTeam.length) {
        state.phase = 'finished';
        state.winner = 'player';
      }
      return newTurns;
    }
  }

  // Check if battle should continue
  if (state.turnCount >= 200) {
    state.phase = 'finished';
    state.winner = 'opponent';
  }

  return newTurns;
}

/** Execute a switch turn: player switches pokemon, opponent gets a free attack */
export function executeSwitchTurn(state: TurnBasedBattleState, newPlayerIdx: number): BattleTurnLog[] {
  const newTurns: BattleTurnLog[] = [];
  const opponent = state.opponentTeam[state.opponentIdx];
  const oldPlayer = state.playerTeam[state.playerIdx];

  if (!opponent || !oldPlayer || newPlayerIdx < 0 || newPlayerIdx >= state.playerTeam.length) return newTurns;
  if (state.playerTeam[newPlayerIdx].currentHp <= 0) return newTurns;

  // Switch the player's active pokemon
  state.playerIdx = newPlayerIdx;
  state.turnCount++;

  const newPlayer = state.playerTeam[state.playerIdx];

  // Create a switch log entry (no damage, just informational)
  const switchLog: BattleTurnLog = {
    turn: state.turnCount,
    attackerUid: oldPlayer.uid,
    defenderUid: newPlayer.uid,
    move: { name: '교체', type: 'normal', power: 0, accuracy: 100, emoji: '🔄', learnLevel: 0, category: 'physical', description: '포켓몬을 교체한다' },
    damage: 0,
    effectiveness: 1,
    critical: false,
    missed: false,
    statusApplied: null,
    healAmount: 0,
    defenderHpAfter: newPlayer.currentHp,
    defenderFainted: false,
    message: `${oldPlayer.nickname || oldPlayer.name}에서 ${newPlayer.nickname || newPlayer.name}(으)로 교체!`,
  };
  newTurns.push(switchLog);
  state.turns.push(switchLog);

  // Opponent gets a free attack on the new pokemon
  const canAct = (p: BattlePokemon) => {
    if (p.status === 'freeze' && Math.random() > 0.1) return false;
    if (p.status === 'paralyze' && Math.random() < 0.25) return false;
    return true;
  };

  if (canAct(opponent)) {
    const opponentMove = chooseNpcMove(opponent, newPlayer);
    const attackLog = doAttack(opponent, newPlayer, state.turnCount, false, opponentMove);
    newTurns.push(attackLog);
    state.turns.push(attackLog);

    if (attackLog.defenderFainted) {
      // Find next alive player pokemon
      const nextAlive = state.playerTeam.findIndex((p, i) => i !== state.playerIdx && p.currentHp > 0);
      if (nextAlive === -1) {
        state.phase = 'finished';
        state.winner = 'opponent';
      } else {
        state.playerIdx = nextAlive;
      }
    }
  }

  if (state.turnCount >= 200) {
    state.phase = 'finished';
    state.winner = 'opponent';
  }

  return newTurns;
}

/** Calculate rewards after battle ends */
export function calculateBattleRewards(
  state: TurnBasedBattleState,
  originalPlayerTeam: BattlePokemon[],
  originalOpponentTeam: BattlePokemon[]
): BattleReward {
  const playerWon = state.winner === 'player';
  const avgOpponentLevel = originalOpponentTeam.reduce((s, p) => s + p.level, 0) / originalOpponentTeam.length;
  const avgPlayerLevel = originalPlayerTeam.reduce((s, p) => s + p.level, 0) / originalPlayerTeam.length;
  const levelDiff = avgOpponentLevel - avgPlayerLevel;

  let baseCoins = 10 + avgOpponentLevel * 2;
  let baseExp = 15 + avgOpponentLevel * 3;

  if (levelDiff > 0) {
    baseCoins *= 1 + levelDiff * 0.1;
    baseExp *= 1 + levelDiff * 0.15;
  }

  const teamSizeMult = 1 + (originalOpponentTeam.length - 1) * 0.15;
  baseCoins *= teamSizeMult;
  baseExp *= teamSizeMult;

  let coinsLost = 0;
  if (!playerWon) {
    const currentCoins = getCoins();
    const lossRate = Math.min(0.3, 0.1 + avgOpponentLevel * 0.005);
    coinsLost = Math.round(currentCoins * lossRate);
    coinsLost = Math.max(5, Math.min(coinsLost, currentCoins));
    baseCoins = 0;
    baseExp = 0;
  }

  const bonusItems: { name: string; emoji: string; count: number }[] = [];
  if (playerWon) {
    if (Math.random() < 0.3) bonusItems.push({ name: '상처약', emoji: '💊', count: 1 });
    if (Math.random() < 0.25) bonusItems.push({ name: '먹이', emoji: '🍎', count: Math.floor(Math.random() * 2) + 1 });
    if (avgOpponentLevel >= 20 && Math.random() < 0.1) bonusItems.push({ name: '알 교환권', emoji: '🎫', count: 1 });
  }

  return {
    coins: Math.round(baseCoins),
    exp: Math.round(baseExp),
    bonusItems,
    coinsLost,
  };
}

/** Legacy auto-battle (still used for NPC encounters during running, etc.) */
export function simulateBattle(playerTeam: BattlePokemon[], opponentTeam: BattlePokemon[]): BattleResult {
  const state = initTurnBattle(playerTeam, opponentTeam);

  while (state.phase !== 'finished' && state.turnCount < 200) {
    const player = state.playerTeam[state.playerIdx];
    const opponent = state.opponentTeam[state.opponentIdx];
    if (!player || !opponent) break;
    const autoMove = chooseNpcMove(player, opponent);
    executeTurn(state, autoMove);
  }

  const rewards = calculateBattleRewards(state, playerTeam, opponentTeam);
  const playerHpRatios = state.playerTeam.map(p => ({ uid: p.uid, hpRatio: p.currentHp / p.maxHp }));

  return {
    winner: state.winner || 'opponent',
    playerTeam: state.playerTeam,
    opponentTeam: state.opponentTeam,
    turns: state.turns,
    totalTurns: state.turnCount,
    rewards,
    playerHpRatios,
  };
}

function doAttack(attacker: BattlePokemon, defender: BattlePokemon, turn: number, isPlayerAttacking: boolean, chosenMove?: BattleMove): BattleTurnLog {
  let bestMove: BattleMove;
  if (chosenMove) {
    bestMove = chosenMove;
  } else {
    const moves = attacker.moves.length > 0 ? attacker.moves : getMovesForLevel(attacker.types, attacker.level);
    bestMove = moves[0];
    let bestDmg = 0;
    for (const m of moves) {
      const eff = getEffectiveness(m.type, defender.types);
      const d = m.power * eff;
      if (d > bestDmg) { bestDmg = d; bestMove = m; }
    }
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
