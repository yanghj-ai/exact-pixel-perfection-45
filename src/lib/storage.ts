import { getCachedProfile, setCachedProfile, isCloudReady } from './cloud-storage';

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
  // Try cloud cache first
  if (isCloudReady()) {
    const cached = getCachedProfile();
    if (cached) return { ...DEFAULT_PROFILE, ...cached };
  }
  // Fallback to localStorage
  const data = localStorage.getItem('routinmon-profile');
  if (data) return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
  return DEFAULT_PROFILE;
}

export function saveProfile(profile: Partial<UserProfile>): UserProfile {
  const current = getProfile();
  const updated = { ...current, ...profile };
  // Always write to localStorage as fallback
  localStorage.setItem('routinmon-profile', JSON.stringify(updated));
  // Sync to cloud
  if (isCloudReady()) {
    setCachedProfile(updated);
  }
  return updated;
}
