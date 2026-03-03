// ═══════════════════════════════════════════════════════════
// NPC 트레이너 데이터 + 주간 랭킹 시스템
// ═══════════════════════════════════════════════════════════

import { getRunningStats } from './running';
import { getParty } from './collection';
import { getWeeklyBattleStats } from './battle';

// ─── NPC Trainers ────────────────────────────────────────

export interface NpcTrainer {
  id: string;
  name: string;
  title: string;
  emoji: string;
  teamSpeciesIds: number[];
  level: number;
  friendship: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  weeklyDistanceKm: number; // simulated
  weeklyBattleWins: number; // simulated
  dialogue: { before: string; win: string; lose: string };
}

export const NPC_TRAINERS: NpcTrainer[] = [
  {
    id: 'npc-youngster',
    name: '꼬마 민수',
    title: '꼬마 트레이너',
    emoji: '👦',
    teamSpeciesIds: [19, 16], // Rattata, Pidgey
    level: 3,
    friendship: 50,
    difficulty: 'easy',
    weeklyDistanceKm: 5.2,
    weeklyBattleWins: 1,
    dialogue: {
      before: '나도 트레이너야! 배틀하자!',
      win: '으에에... 더 열심히 해야겠다',
      lose: '야호! 내가 이겼다!',
    },
  },
  {
    id: 'npc-hiker',
    name: '등산가 철수',
    title: '등산 트레이너',
    emoji: '🧗',
    teamSpeciesIds: [74, 95, 76], // Geodude, Onix, Golem
    level: 10,
    friendship: 80,
    difficulty: 'medium',
    weeklyDistanceKm: 15.3,
    weeklyBattleWins: 3,
    dialogue: {
      before: '산도 달리기도 체력이 중요하지!',
      win: '체력은 아직 내가 위야!... 아니, 너였다!',
      lose: '산에서 단련한 보람이 있군!',
    },
  },
  {
    id: 'npc-swimmer',
    name: '수영선수 지은',
    title: '수상 트레이너',
    emoji: '🏊‍♀️',
    teamSpeciesIds: [130, 121, 55], // Gyarados, Starmie, Golduck
    level: 15,
    friendship: 100,
    difficulty: 'medium',
    weeklyDistanceKm: 22.1,
    weeklyBattleWins: 5,
    dialogue: {
      before: '수영이든 달리기든 나한테 도전해봐!',
      win: '수영만큼 달리기도 잘 해야겠어...',
      lose: '물 속에서의 훈련이 배틀에도 도움이 되네!',
    },
  },
  {
    id: 'npc-runner',
    name: '마라토너 준혁',
    title: '런너 트레이너',
    emoji: '🏃',
    teamSpeciesIds: [78, 136, 59], // Rapidash, Flareon, Arcanine
    level: 20,
    friendship: 140,
    difficulty: 'hard',
    weeklyDistanceKm: 35.7,
    weeklyBattleWins: 7,
    dialogue: {
      before: '풀 마라톤을 뛰는 나에게 도전하다니!',
      win: '역시 내 파트너들을 과소평가하면 안 되지!',
      lose: '달리기만큼 배틀도 잘 하는군!',
    },
  },
  {
    id: 'npc-acetrainer',
    name: '에이스 소연',
    title: '에이스 트레이너',
    emoji: '🌟',
    teamSpeciesIds: [149, 131, 6], // Dragonite, Lapras, Charizard
    level: 30,
    friendship: 180,
    difficulty: 'hard',
    weeklyDistanceKm: 42.0,
    weeklyBattleWins: 9,
    dialogue: {
      before: '최강의 트레이너를 만나고 싶다면 나와 배틀해!',
      win: '좀 더 훈련이 필요할지도...',
      lose: '대단한 승부였어! 또 만나자!',
    },
  },
  {
    id: 'npc-champion',
    name: '챔피언 태민',
    title: '포켓몬 챔피언',
    emoji: '👑',
    teamSpeciesIds: [150, 149, 6, 130, 65, 94], // Mewtwo, Dragonite, Charizard, Gyarados, Alakazam, Gengar
    level: 40,
    friendship: 220,
    difficulty: 'elite',
    weeklyDistanceKm: 55.0,
    weeklyBattleWins: 12,
    dialogue: {
      before: '챔피언에게 도전하다니... 각오는 됐나?',
      win: '아직은 멀었어! 더 달리고, 더 키워서 와!',
      lose: '놀랍군... 새로운 챔피언의 탄생이야!',
    },
  },
];

export function getNpcByDifficulty(difficulty: NpcTrainer['difficulty']): NpcTrainer[] {
  return NPC_TRAINERS.filter(t => t.difficulty === difficulty);
}

export function getNpcById(id: string): NpcTrainer | undefined {
  return NPC_TRAINERS.find(t => t.id === id);
}

// ─── Ranking System ──────────────────────────────────────

export interface RankerEntry {
  id: string;
  name: string;
  emoji: string;
  isPlayer: boolean;
  weeklyDistanceKm: number;
  weeklyBattleWins: number;
  partySize: number;
  score: number; // composite
}

function computeScore(distanceKm: number, battleWins: number): number {
  return Math.round(distanceKm * 10 + battleWins * 25);
}

export function getWeeklyRanking(): RankerEntry[] {
  const runStats = getRunningStats();
  const battleStats = getWeeklyBattleStats();
  const party = getParty();

  // Calculate player's weekly distance from goals
  const weeklyGoal = runStats.goals.find(g => g.type === 'weekly');
  const playerDistance = weeklyGoal ? weeklyGoal.currentKm : 0;
  const playerEntry: RankerEntry = {
    id: 'player',
    name: '나',
    emoji: '🔥',
    isPlayer: true,
    weeklyDistanceKm: playerDistance,
    weeklyBattleWins: battleStats.wins,
    partySize: party.length,
    score: computeScore(playerDistance, battleStats.wins),
  };

  // NPC entries with slight randomization each week
  const weekSeed = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const npcEntries: RankerEntry[] = NPC_TRAINERS.map(npc => {
    // Randomize ±20% based on week
    const seedHash = (weekSeed * npc.id.length) % 100;
    const variance = 0.8 + (seedHash / 100) * 0.4;
    const dist = Math.round(npc.weeklyDistanceKm * variance * 10) / 10;
    const wins = Math.max(0, Math.round(npc.weeklyBattleWins * variance));
    return {
      id: npc.id,
      name: npc.name,
      emoji: npc.emoji,
      isPlayer: false,
      weeklyDistanceKm: dist,
      weeklyBattleWins: wins,
      partySize: npc.teamSpeciesIds.length,
      score: computeScore(dist, wins),
    };
  });

  const allEntries = [playerEntry, ...npcEntries];
  allEntries.sort((a, b) => b.score - a.score);
  return allEntries;
}
