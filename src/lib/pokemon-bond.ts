// ═══════════════════════════════════════════════════════════
// 포켓몬 유대감(Bond) 시스템 — 러닝 = 교감
// interact()/feed() 제거. 교감은 오직 러닝으로만 발생.
// ═══════════════════════════════════════════════════════════

export type PokemonMood = 'lonely' | 'bored' | 'normal' | 'happy' | 'excited';

export interface BondState {
  friendship: number;            // 0~255
  totalStepsTogether: number;    // 누적 동반 걸음수
  todayStepsTogether: number;    // 오늘 동반 걸음수
  lastRunDate: string | null;    // 마지막 러닝 날짜
  consecutiveRunDays: number;    // 연속 함께 달린 일수
  mood: PokemonMood;
}

const BOND_STORAGE = 'routinmon-bond';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getDaysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const diff = Date.now() - new Date(dateStr + 'T12:00:00').getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function computeMood(bond: BondState): PokemonMood {
  const daysSinceRun = getDaysSince(bond.lastRunDate);
  if (daysSinceRun >= 3) return 'lonely';
  if (daysSinceRun >= 1 && bond.todayStepsTogether === 0) return 'bored';
  if (bond.todayStepsTogether >= 3000) return 'excited';
  if (bond.todayStepsTogether >= 1000) return 'happy';
  return 'normal';
}

export function getBondState(): BondState {
  const data = localStorage.getItem(BOND_STORAGE);
  const defaults: BondState = {
    friendship: 70,
    totalStepsTogether: 0,
    todayStepsTogether: 0,
    lastRunDate: null,
    consecutiveRunDays: 0,
    mood: 'normal',
  };
  if (!data) return { ...defaults, mood: computeMood(defaults) };
  const parsed = { ...defaults, ...JSON.parse(data) };
  // Reset today if new day
  const today = getToday();
  if (parsed.lastRunDate !== today) {
    parsed.todayStepsTogether = 0;
  }
  parsed.mood = computeMood(parsed);
  return parsed;
}

function saveBondState(state: BondState) {
  localStorage.setItem(BOND_STORAGE, JSON.stringify(state));
}

/** 러닝 완료 시 호출 — 교감 업데이트 */
export function updateBondAfterRun(steps: number): BondState {
  const bond = getBondState();
  const today = getToday();

  // 친밀도 획득: 500보당 +5, 하루 최대 +100
  const friendshipGain = Math.min(100, Math.floor(steps / 500) * 5);

  // 연속 러닝 일수 업데이트
  let consecutiveRunDays = bond.consecutiveRunDays;
  if (bond.lastRunDate !== today) {
    if (bond.lastRunDate === getYesterday()) {
      consecutiveRunDays += 1;
    } else {
      consecutiveRunDays = 1;
    }
  }

  const updated: BondState = {
    friendship: Math.min(255, bond.friendship + friendshipGain),
    totalStepsTogether: bond.totalStepsTogether + steps,
    todayStepsTogether: bond.todayStepsTogether + steps,
    lastRunDate: today,
    consecutiveRunDays,
    mood: 'normal',
  };
  updated.mood = computeMood(updated);
  saveBondState(updated);
  return updated;
}

export function getMoodEmoji(mood: PokemonMood): string {
  return { lonely: '😢', bored: '😔', normal: '😐', happy: '😊', excited: '🤩' }[mood];
}

export function getMoodDialogue(mood: PokemonMood): string {
  const dialogues: Record<PokemonMood, string[]> = {
    lonely: ['힘이 없어...같이 달리고 싶어', '오래 못 만났네... 😢', '같이 달리면 힘이 날 텐데...'],
    bored: ['오늘은 같이 달릴까?', '좀 심심해... 😔', '달리고 싶다!'],
    normal: ['같이 달릴까? 😐', '오늘도 파이팅!', '준비됐어!'],
    happy: ['오늘도 신나게 달리자! 😊', '같이 달리니까 좋아!', '기분 최고야!'],
    excited: ['최고 컨디션! 어디든 갈 수 있어! 🤩', '멈출 수 없어!! 🔥', '우리 무적이야!!'],
  };
  const list = dialogues[mood];
  return list[Math.floor(Math.random() * list.length)];
}

/** 친밀도 → 배틀 보너스 */
export function getFriendshipBattleBonus(friendship: number): {
  critBonus: number;
  evadeChance: number;
  expBonus: number;
} {
  if (friendship >= 200) return { critBonus: 0.10, evadeChance: 0.05, expBonus: 1.20 };
  if (friendship >= 150) return { critBonus: 0.05, evadeChance: 0.02, expBonus: 1.10 };
  if (friendship >= 100) return { critBonus: 0.03, evadeChance: 0.01, expBonus: 1.05 };
  return { critBonus: 0, evadeChance: 0, expBonus: 1.0 };
}

export function resetBondState() {
  localStorage.removeItem(BOND_STORAGE);
}
