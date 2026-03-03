export interface UserProfile {
  name: string;
  offWorkTime: string;
  categories: string[];
  onboardingComplete: boolean;
  streak: number;
  lastCompletedDate: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  offWorkTime: '18:00',
  categories: [],
  onboardingComplete: false,
  streak: 0,
  lastCompletedDate: null,
};

export function getProfile(): UserProfile {
  const data = localStorage.getItem('routinit-profile');
  return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : DEFAULT_PROFILE;
}

export function saveProfile(profile: Partial<UserProfile>) {
  const current = getProfile();
  const updated = { ...current, ...profile };
  localStorage.setItem('routinit-profile', JSON.stringify(updated));
  return updated;
}

export const CATEGORIES = [
  { id: 'exercise', label: '운동', emoji: '💪' },
  { id: 'reading', label: '독서', emoji: '📚' },
  { id: 'meditation', label: '명상', emoji: '🧘' },
  { id: 'walk', label: '산책', emoji: '🚶' },
  { id: 'stretching', label: '스트레칭', emoji: '🤸' },
  { id: 'english', label: '영어', emoji: '🇬🇧' },
  { id: 'sideproject', label: '사이드프로젝트', emoji: '💻' },
  { id: 'journaling', label: '저널링', emoji: '✍️' },
] as const;
