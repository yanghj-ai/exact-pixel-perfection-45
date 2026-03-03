export interface RoutineReward {
  food: number;
  exp: number;
  bonusLabel?: string; // e.g. "파이리와 함께 산책!"
}

export interface RoutineItem {
  id: number;
  emoji: string;
  title: string;
  duration: number; // minutes
  category: string;
  reward: RoutineReward;
  isExercise?: boolean;
}

export type EnergyLevel = 'high' | 'normal' | 'tired';

const ROUTINE_PRESETS: Record<EnergyLevel, RoutineItem[]> = {
  high: [
    { id: 1, emoji: '💪', title: '홈트레이닝', duration: 30, category: '운동', reward: { food: 1, exp: 20 }, isExercise: true },
    { id: 2, emoji: '💻', title: '사이드프로젝트', duration: 45, category: '사이드프로젝트', reward: { food: 1, exp: 25 } },
    { id: 3, emoji: '🧘', title: '명상', duration: 10, category: '명상', reward: { food: 0, exp: 10 } },
  ],
  normal: [
    { id: 1, emoji: '🚶', title: '산책', duration: 20, category: '산책', reward: { food: 1, exp: 15, bonusLabel: '파이리와 함께 산책!' }, isExercise: true },
    { id: 2, emoji: '📚', title: '독서', duration: 30, category: '독서', reward: { food: 1, exp: 15 } },
    { id: 3, emoji: '🤸', title: '스트레칭', duration: 15, category: '스트레칭', reward: { food: 0, exp: 10 }, isExercise: true },
  ],
  tired: [
    { id: 1, emoji: '🤸', title: '가벼운 스트레칭', duration: 10, category: '스트레칭', reward: { food: 0, exp: 10 }, isExercise: true },
    { id: 2, emoji: '☕', title: '따뜻한 차 + 독서', duration: 20, category: '독서', reward: { food: 1, exp: 10 } },
    { id: 3, emoji: '✍️', title: '저널링', duration: 10, category: '저널링', reward: { food: 0, exp: 10 } },
  ],
};

export function generateRoutine(energy: EnergyLevel): RoutineItem[] {
  return ROUTINE_PRESETS[energy];
}

export function getTotalDuration(routines: RoutineItem[]): string {
  const total = routines.reduce((sum, r) => sum + r.duration, 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

export function calculateTotalRewards(routines: RoutineItem[], completed: boolean[]): RoutineReward {
  let totalFood = 0;
  let totalExp = 0;
  routines.forEach((r, i) => {
    if (completed[i]) {
      totalFood += r.reward.food;
      totalExp += r.reward.exp;
      // Exercise bonus: +1 food, +5 exp
      if (r.isExercise) {
        totalFood += 1;
        totalExp += 5;
      }
    }
  });
  return { food: totalFood, exp: totalExp };
}
