// ═══════════════════════════════════════════════════════════
// 잠금화면 위젯 + 상단 알림바
// MediaSession API + Notification API
// ═══════════════════════════════════════════════════════════

import { formatPace } from './running';

let ongoingNotification: Notification | null = null;
let silentAudio: HTMLAudioElement | null = null;

/** MediaSession 초기화 (잠금화면 위젯용 무음 오디오 필요) */
export function initMediaSession() {
  if (!('mediaSession' in navigator)) return;
  
  // 무음 오디오 재생으로 MediaSession 활성화
  if (!silentAudio) {
    silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    silentAudio.loop = true;
    silentAudio.volume = 0.01;
  }
  silentAudio.play().catch(() => {});
}

/** MediaSession 정리 */
export function cleanupMediaSession() {
  if (silentAudio) {
    silentAudio.pause();
    silentAudio = null;
  }
}

/** 잠금화면 위젯 업데이트 */
export function updateLockScreenWidget(params: {
  distanceKm: number;
  pace: number | null;
  encounterCount: number;
  companionName: string;
  companionImageUrl?: string;
  isLegendaryMission?: boolean;
  legendaryName?: string;
  legendaryTargetKm?: number;
}) {
  if (!('mediaSession' in navigator)) return;

  const d = params.distanceKm.toFixed(1);
  const pace = params.pace ? formatPace(params.pace) : "-'--\"";

  const artistText = params.isLegendaryMission && params.legendaryName
    ? `${params.legendaryName} 미션: ${d}/${params.legendaryTargetKm}km`
    : `포켓몬 ${params.encounterCount}마리 획득`;

  const artwork: MediaImage[] = params.companionImageUrl
    ? [{ src: params.companionImageUrl, sizes: '96x96', type: 'image/png' }]
    : [];

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${d}km · 페이스 ${pace}`,
      artist: artistText,
      album: '루틴몬 러닝 중',
      artwork,
    });
  } catch (e) {
    console.warn('MediaSession 업데이트 실패:', e);
  }
}

/** Notification 권한 요청 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** 상단 알림바 업데이트 (상시 알림) */
export function updateNotificationBar(params: {
  distanceKm: number;
  pace: number | null;
  encounterCount: number;
}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const d = params.distanceKm.toFixed(1);
  const pace = params.pace ? formatPace(params.pace) : "-'--\"";

  try {
    if (ongoingNotification) ongoingNotification.close();
    ongoingNotification = new Notification('루틴몬 러닝 중', {
      body: `🏃 ${d}km | ${pace}/km | 🎮 ${params.encounterCount}마리`,
      icon: '/favicon.ico',
      tag: 'routinmon-running',
      requireInteraction: true,
      silent: true,
    } as NotificationOptions);
  } catch (e) {
    console.warn('알림 업데이트 실패:', e);
  }
}

/** 포켓몬 조우 알림 */
export function showEncounterNotification(params: {
  name: string;
  grade: 'normal' | 'rare' | 'unique';
  isNew: boolean;
  imageUrl?: string;
}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const gradeEmoji = { normal: '', rare: '⭐ ', unique: '⚡ ' };
  const prefix = params.isNew ? '🌟 새로운 포켓몬! ' : '';

  try {
    new Notification(`${prefix}${gradeEmoji[params.grade]}${params.name} 획득!`, {
      icon: params.imageUrl || '/favicon.ico',
      tag: 'routinmon-encounter',
      silent: false,
    });
  } catch (e) {
    console.warn('조우 알림 실패:', e);
  }
}

/** 러닝 종료 알림 */
export function showRunEndNotification(distanceKm: number, encounterCount: number) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    if (ongoingNotification) ongoingNotification.close();
    new Notification(`✅ ${distanceKm.toFixed(1)}km 완료!`, {
      body: `${encounterCount}마리 포켓몬 획득!`,
      icon: '/favicon.ico',
      tag: 'routinmon-running',
    });
  } catch (e) {
    console.warn('종료 알림 실패:', e);
  }
}

/** 알림 정리 */
export function clearNotifications() {
  if (ongoingNotification) {
    ongoingNotification.close();
    ongoingNotification = null;
  }
}
