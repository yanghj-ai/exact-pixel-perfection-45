// ═══════════════════════════════════════════════════════════
// 포켓몬 컨디션 시스템 — 먹이/하트 대체
// 컨디션: 0~100. 매일 -10 자연 감소, 러닝으로 회복.
// 배틀 스탯에 직접 반영.
// ═══════════════════════════════════════════════════════════

const CONDITION_STORAGE = 'routinmon-condition';

export type ConditionLevel = 'exhausted' | 'tired' | 'normal' | 'good' | 'perfect';

export interface ConditionState {
  condition: number;           // 0~100
  lastDecayDate: string | null;
  todayRecovery: number;       // 오늘 회복량 (최대 50)
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getConditionState(): ConditionState {
  const data = localStorage.getItem(CONDITION_STORAGE);
  const defaults: ConditionState = { condition: 50, lastDecayDate: null, todayRecovery: 0 };
  if (!data) {
    const init = { ...defaults, lastDecayDate: getToday() };
    saveConditionState(init);
    return init;
  }

  const parsed = { ...defaults, ...JSON.parse(data) };
  const today = getToday();

  // 일일 자연 감소 적용
  if (parsed.lastDecayDate && parsed.lastDecayDate < today) {
    const daysMissed = Math.min(5, Math.floor(
      (new Date(today + 'T00:00:00').getTime() - new Date(parsed.lastDecayDate + 'T00:00:00').getTime())
      / (1000 * 60 * 60 * 24)
    ));
    parsed.condition = Math.max(0, parsed.condition - daysMissed * 10);
    parsed.lastDecayDate = today;
    parsed.todayRecovery = 0;
    saveConditionState(parsed);
  }

  return parsed;
}

function saveConditionState(state: ConditionState) {
  localStorage.setItem(CONDITION_STORAGE, JSON.stringify(state));
}

export function getConditionLevel(condition: number): ConditionLevel {
  if (condition >= 80) return 'perfect';
  if (condition >= 60) return 'good';
  if (condition >= 40) return 'normal';
  if (condition >= 20) return 'tired';
  return 'exhausted';
}

export function getConditionEmoji(level: ConditionLevel): string {
  return { exhausted: '😰', tired: '😔', normal: '😐', good: '😊', perfect: '🤩' }[level];
}

export function getConditionLabel(level: ConditionLevel): string {
  return { exhausted: '탈진', tired: '피곤', normal: '보통', good: '좋음', perfect: '최고' }[level];
}

/** 배틀 스탯 배율 — v8: constants.ts CONDITION_BATTLE_MODIFIERS 사용 */
export function getConditionStatMultiplier(condition: number): number {
  const level = getConditionLevel(condition);
  return { exhausted: 0.80, tired: 0.90, normal: 1.00, good: 1.05, perfect: 1.10 }[level];
}

/** 컨디션 크리티컬 보너스 — v8: 5단계 */
export function getConditionCritBonus(condition: number): number {
  const level = getConditionLevel(condition);
  return { exhausted: -0.03, tired: 0, normal: 0, good: 0.02, perfect: 0.05 }[level];
}

/** 러닝 후 컨디션 회복: +1 per 100 steps, 하루 최대 +50 */
export function recoverCondition(steps: number): { newCondition: number; recovery: number } {
  const state = getConditionState();
  const maxDaily = 50;
  const available = Math.max(0, maxDaily - state.todayRecovery);
  if (available <= 0) return { newCondition: state.condition, recovery: 0 };

  const rawRecovery = Math.floor(steps / 100);
  const recovery = Math.min(rawRecovery, available);
  const newCondition = Math.min(100, state.condition + recovery);

  saveConditionState({
    condition: newCondition,
    lastDecayDate: getToday(),
    todayRecovery: state.todayRecovery + recovery,
  });

  return { newCondition, recovery };
}

/** 디버그: 컨디션 강제 설정 */
export function setCondition(value: number) {
  const state = getConditionState();
  state.condition = Math.max(0, Math.min(100, value));
  saveConditionState(state);
}

export function resetConditionState() {
  localStorage.removeItem(CONDITION_STORAGE);
}
