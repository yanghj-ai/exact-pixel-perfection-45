// ═══════════════════════════════════════════════════════════
// 부정 방지 검증 시스템 — 만보기 vs GPS 교차 검증
// 부정 사용 시 조용히 보상 감산 (경고 메시지 표시 금지)
// ═══════════════════════════════════════════════════════════

export interface RunSessionData {
  steps: number;
  gpsDistanceKm: number | null; // GPS 없으면 null
  durationSec: number;
  hasGps: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  rewardMultiplier: number; // 0.0 ~ 1.0
  reason: string;
}

export function validateRunSession(session: RunSessionData): ValidationResult {
  const { steps, gpsDistanceKm, durationSec, hasGps } = session;

  // 최소 기준: 100보 미만이면 무효
  if (steps < 100) {
    return { isValid: false, rewardMultiplier: 0, reason: '걸음수 부족' };
  }

  // GPS 없음 (실내/권한거부): 만보기만으로 판정
  if (!hasGps || gpsDistanceKm === null) {
    // 걸음 빈도 체크 (분당 200보 이상이면 비정상)
    const stepsPerMin = steps / (durationSec / 60);
    if (stepsPerMin > 200) {
      return {
        isValid: true,
        rewardMultiplier: 0.5,
        reason: '비정상 걸음 빈도',
      };
    }
    return { isValid: true, rewardMultiplier: 1.0, reason: '정상 (실내 모드)' };
  }

  // GPS 있음: 교차 검증
  const expectedKm = (steps * 0.75) / 1000; // 평균 보폭

  // GPS 거리가 거의 0이면 실내로 판단
  if (gpsDistanceKm < 0.05) {
    return { isValid: true, rewardMultiplier: 1.0, reason: '정상 (실내 모드)' };
  }

  const ratio = gpsDistanceKm / expectedKm;

  // 비율 3배 이상: 차량/자전거 (GPS거리 >> 걸음거리)
  if (ratio > 3.0) {
    return { isValid: false, rewardMultiplier: 0, reason: '이동수단 사용 의심' };
  }

  // 비율 0.3 미만: 폰 흔들기 (걸음수 >> GPS거리)
  if (ratio < 0.3 && gpsDistanceKm > 0.1) {
    return {
      isValid: true,
      rewardMultiplier: 0.5,
      reason: '걸음수 대비 이동거리 과소',
    };
  }

  return { isValid: true, rewardMultiplier: 1.0, reason: '정상' };
}
