export interface RoutineItem {
  id: number;
  emoji: string;
  title: string;
  duration: number; // minutes
  category: string;
}

export type EnergyLevel = 'high' | 'normal' | 'tired';

const ROUTINE_PRESETS: Record<EnergyLevel, RoutineItem[]> = {
  tired: [
    { id: 1, emoji: '🤸', title: '가벼운 스트레칭', duration: 15, category: '스트레칭' },
    { id: 2, emoji: '📚', title: '따뜻한 차와 독서', duration: 30, category: '독서' },
    { id: 3, emoji: '✍️', title: '저널링', duration: 10, category: '저널링' },
  ],
  normal: [
    { id: 1, emoji: '🚶', title: '산책', duration: 20, category: '산책' },
    { id: 2, emoji: '🇬🇧', title: '영어 공부', duration: 30, category: '영어' },
    { id: 3, emoji: '🤸', title: '스트레칭', duration: 15, category: '스트레칭' },
  ],
  high: [
    { id: 1, emoji: '💪', title: '홈트레이닝', duration: 30, category: '운동' },
    { id: 2, emoji: '💻', title: '사이드프로젝트', duration: 45, category: '사이드프로젝트' },
    { id: 3, emoji: '🧘', title: '명상', duration: 10, category: '명상' },
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
