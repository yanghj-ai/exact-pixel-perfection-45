export interface UserProfile {
  name: string;
  offWorkTime: string;
  onboardingComplete: boolean;
  streak: number;
  lastCompletedDate: string | null;
  notificationsEnabled: boolean;
  darkMode: boolean;
  // Attendance
  lastLoginDate: string | null;
  consecutiveLoginDays: number;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  offWorkTime: '18:00',
  onboardingComplete: false,
  streak: 0,
  lastCompletedDate: null,
  notificationsEnabled: true,
  darkMode: true,
  lastLoginDate: null,
  consecutiveLoginDays: 0,
};

export function getProfile(): UserProfile {
  const data = localStorage.getItem('routinmon-profile');
  if (data) return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
  const old = localStorage.getItem('routinit-profile');
  if (old) {
    const parsed = { ...DEFAULT_PROFILE, ...JSON.parse(old) };
    localStorage.setItem('routinmon-profile', JSON.stringify(parsed));
    localStorage.removeItem('routinit-profile');
    return parsed;
  }
  return DEFAULT_PROFILE;
}

export function saveProfile(profile: Partial<UserProfile>) {
  const current = getProfile();
  const updated = { ...current, ...profile };
  localStorage.setItem('routinmon-profile', JSON.stringify(updated));
  return updated;
}
