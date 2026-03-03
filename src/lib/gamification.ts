export interface LevelInfo {
  level: number;
  title: string;
  emoji: string;
  currentXP: number;
  requiredXP: number;
  progress: number; // 0-100
}

const LEVELS = [
  { xp: 0, title: '루틴 새내기', emoji: '🌱' },
  { xp: 100, title: '습관 탐험가', emoji: '🌿' },
  { xp: 300, title: '꾸준한 실천러', emoji: '🌳' },
  { xp: 600, title: '루틴 마스터', emoji: '🔥' },
  { xp: 1000, title: '자기관리 달인', emoji: '⭐' },
  { xp: 1500, title: '전설의 루티너', emoji: '👑' },
];

export function getLevelInfo(totalXP: number): LevelInfo {
  let levelIdx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].xp) { levelIdx = i; break; }
  }
  const current = LEVELS[levelIdx];
  const next = LEVELS[levelIdx + 1];
  const requiredXP = next ? next.xp - current.xp : 0;
  const currentXP = next ? totalXP - current.xp : requiredXP;
  const progress = next ? Math.min(100, (currentXP / requiredXP) * 100) : 100;

  return {
    level: levelIdx + 1,
    title: current.title,
    emoji: current.emoji,
    currentXP,
    requiredXP,
    progress,
  };
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlocked: boolean;
}

export function getBadges(streak: number, totalRoutines: number): Badge[] {
  return [
    { id: 'first', name: '첫 루틴', emoji: '🎯', description: '첫 루틴 완료', unlocked: totalRoutines >= 1 },
    { id: 'streak3', name: '3일 연속', emoji: '🔥', description: '3일 연속 달성', unlocked: streak >= 3 },
    { id: 'streak7', name: '7일 연속', emoji: '💎', description: '7일 연속 달성', unlocked: streak >= 7 },
    { id: 'ten', name: '10회 완료', emoji: '🏅', description: '루틴 10회 완료', unlocked: totalRoutines >= 10 },
    { id: 'streak14', name: '2주 연속', emoji: '🌟', description: '14일 연속 달성', unlocked: streak >= 14 },
    { id: 'thirty', name: '30회 완료', emoji: '🏆', description: '루틴 30회 완료', unlocked: totalRoutines >= 30 },
    { id: 'streak30', name: '30일 연속', emoji: '👑', description: '30일 연속 달성', unlocked: streak >= 30 },
    { id: 'hundred', name: '100회 완료', emoji: '💯', description: '루틴 100회 완료', unlocked: totalRoutines >= 100 },
    { id: 'legend', name: '전설', emoji: '🐉', description: '스트릭 100일', unlocked: streak >= 100 },
  ];
}
