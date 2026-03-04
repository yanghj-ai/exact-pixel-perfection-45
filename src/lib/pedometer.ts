// ═══════════════════════════════════════════════════════════
// 만보기 엔진 — DeviceMotion API 기반 걸음수 카운팅
// 보상 계산의 메인 기준. GPS는 보조 데이터.
// ═══════════════════════════════════════════════════════════

export interface PedometerState {
  steps: number;
  isTracking: boolean;
  lastPeakTime: number;
  smoothedAccel: number;
}

// 걸음 감지 상수
const STEP_THRESHOLD = 1.2;       // 가속도 피크 임계값 (g)
const MIN_STEP_INTERVAL = 250;    // 최소 걸음 간격 (ms)
const SMOOTHING_FACTOR = 0.8;     // 저역 통과 필터 계수

// 보폭 (m)
const STRIDE_WALK = 0.65;
const STRIDE_RUN = 0.85;

export function stepsToKm(steps: number, isRunning: boolean = false): number {
  const stride = isRunning ? STRIDE_RUN : STRIDE_WALK;
  return (steps * stride) / 1000;
}

export function estimateCaloriesFromSteps(steps: number): number {
  return Math.round(steps * 0.04);
}

export class Pedometer {
  private state: PedometerState;
  private onStep: (steps: number) => void;
  private boundHandler: ((e: DeviceMotionEvent) => void) | null = null;

  constructor(onStep: (steps: number) => void) {
    this.state = {
      steps: 0,
      isTracking: false,
      lastPeakTime: 0,
      smoothedAccel: 0,
    };
    this.onStep = onStep;
  }

  async start(): Promise<boolean> {
    // Check if DeviceMotion is available
    if (typeof DeviceMotionEvent === 'undefined') {
      console.warn('DeviceMotionEvent not available');
      return false;
    }

    // iOS 13+ 권한 요청 필수
    if ('requestPermission' in DeviceMotionEvent) {
      try {
        const perm = await (DeviceMotionEvent as any).requestPermission();
        if (perm !== 'granted') {
          console.warn('DeviceMotion permission denied');
          return false;
        }
      } catch (e) {
        console.warn('DeviceMotion permission request failed:', e);
        return false;
      }
    }

    this.boundHandler = this.handleMotion.bind(this);
    window.addEventListener('devicemotion', this.boundHandler as any);
    this.state.isTracking = true;
    this.state.steps = 0;
    this.state.lastPeakTime = 0;
    this.state.smoothedAccel = 0;
    return true;
  }

  private handleMotion(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;

    // 3축 합성 가속도 (g 단위로 정규화)
    const magnitude = Math.sqrt(
      (a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2
    ) / 9.81;

    // 저역 통과 필터 (노이즈 제거)
    this.state.smoothedAccel =
      SMOOTHING_FACTOR * this.state.smoothedAccel +
      (1 - SMOOTHING_FACTOR) * magnitude;

    const now = Date.now();

    // 피크 감지: 임계값 초과 + 최소 간격
    if (
      this.state.smoothedAccel > STEP_THRESHOLD &&
      now - this.state.lastPeakTime > MIN_STEP_INTERVAL
    ) {
      this.state.steps++;
      this.state.lastPeakTime = now;
      this.onStep(this.state.steps);
    }
  }

  stop(): number {
    if (this.boundHandler) {
      window.removeEventListener('devicemotion', this.boundHandler as any);
      this.boundHandler = null;
    }
    this.state.isTracking = false;
    return this.state.steps;
  }

  getSteps(): number {
    return this.state.steps;
  }

  isActive(): boolean {
    return this.state.isTracking;
  }

  /** Check if DeviceMotion API is available on this device */
  static isAvailable(): boolean {
    return typeof DeviceMotionEvent !== 'undefined';
  }
}

// ─── Today's Steps Storage ───────────────────────────────

const TODAY_STEPS_KEY = 'routinmon-today-steps';

interface TodaySteps {
  date: string;
  steps: number;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTodaySteps(): number {
  const data = localStorage.getItem(TODAY_STEPS_KEY);
  if (!data) return 0;
  const parsed: TodaySteps = JSON.parse(data);
  if (parsed.date !== getToday()) return 0;
  return parsed.steps;
}

export function addTodaySteps(steps: number): number {
  const today = getToday();
  const current = getTodaySteps();
  const total = current + steps;
  localStorage.setItem(TODAY_STEPS_KEY, JSON.stringify({ date: today, steps: total }));
  return total;
}
