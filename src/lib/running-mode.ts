// ═══════════════════════════════════════════════════════════
// 러닝 모드 — Wake Lock + 터치 잠금 + 전체화면
// AMOLED 최적화 검은 배경 러닝 모드 관리
// ═══════════════════════════════════════════════════════════

export interface RunningModeState {
  isActive: boolean;
  isLocked: boolean;
  wakeLock: WakeLockSentinel | null;
}

let wakeLockSentinel: WakeLockSentinel | null = null;

/** Wake Lock 요청 (화면 꺼짐 방지) */
export async function requestWakeLock(): Promise<boolean> {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      // 탭 전환 시 자동 재요청
      wakeLockSentinel?.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    }
  } catch (e) {
    console.warn('Wake Lock 요청 실패:', e);
  }
  return false;
}

/** Wake Lock 해제 */
export async function releaseWakeLock() {
  try {
    await wakeLockSentinel?.release();
    wakeLockSentinel = null;
  } catch (e) {
    console.warn('Wake Lock 해제 실패:', e);
  }
}

/** 전체화면 요청 */
export async function requestFullscreen(): Promise<boolean> {
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      return true;
    }
  } catch (e) {
    console.warn('전체화면 요청 실패:', e);
  }
  return false;
}

/** 전체화면 해제 */
export async function exitFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch (e) {
    console.warn('전체화면 해제 실패:', e);
  }
}

/** 진동 패턴 (등급별) */
export const GRADE_VIBRATION = {
  normal: [100],
  rare: [100, 100, 100],
  unique: [400, 200, 100, 100, 100],
} as const;

export function vibrateForGrade(grade: 'normal' | 'rare' | 'unique') {
  if ('vibrate' in navigator) {
    navigator.vibrate(GRADE_VIBRATION[grade]);
  }
}

/** 카운트다운 진동 */
export function vibrateCountdown() {
  if ('vibrate' in navigator) {
    navigator.vibrate(100);
  }
}

/** GO! 진동 */
export function vibrateGo() {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}
