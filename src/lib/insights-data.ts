import { CATEGORIES } from './storage';

export interface DayData {
  date: string;
  day: string;
  completionRate: number;
  completedActivities: string[];
  mood: number; // 1-5
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getRecentDays(count: number): { date: string; day: string }[] {
  const result: { date: string; day: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toISOString().slice(0, 10),
      day: DAYS[d.getDay()],
    });
  }
  return result;
}

export function getWeeklyData(): DayData[] {
  const days = getRecentDays(7);
  const dummyRates = [85, 60, 100, 40, 90, 75, 0];
  const dummyMoods = [4, 3, 5, 2, 5, 4, 0];
  const activitySets = [
    ['exercise', 'meditation', 'reading'],
    ['walk', 'stretching'],
    ['exercise', 'reading', 'journaling', 'meditation'],
    ['stretching'],
    ['exercise', 'walk', 'meditation', 'english'],
    ['reading', 'exercise', 'stretching'],
    [],
  ];

  return days.map((d, i) => ({
    date: d.date,
    day: d.day,
    completionRate: dummyRates[i],
    completedActivities: activitySets[i],
    mood: dummyMoods[i],
  }));
}

export interface TopActivity {
  id: string;
  label: string;
  emoji: string;
  count: number;
}

export function getTopActivities(data: DayData[], limit = 3): TopActivity[] {
  const counts: Record<string, number> = {};
  data.forEach((d) => d.completedActivities.forEach((a) => {
    counts[a] = (counts[a] || 0) + 1;
  }));

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id, count]) => {
      const cat = CATEGORIES.find((c) => c.id === id);
      return {
        id,
        label: cat?.label ?? id,
        emoji: cat?.emoji ?? '📌',
        count,
      };
    });
}

export function getMoodData(data: DayData[]) {
  return data
    .filter((d) => d.mood > 0)
    .map((d) => ({ day: d.day, mood: d.mood }));
}
