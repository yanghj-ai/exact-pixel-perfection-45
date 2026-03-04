// ═══════════════════════════════════════════════════════════
// 전설 포켓몬 스토리 플로우 — 3단계 (인트로 → 러닝 → 컷신)
// ═══════════════════════════════════════════════════════════

export interface LegendaryMission {
  pokemonId: number;
  pokemonName: string;
  targetKm: number;
  targetPace?: number; // 페이스 조건 (썬더만)
  timeWindow?: [number, number]; // 시간대 조건 (프리져만)
  milestoneAlerts?: { km: number; message: string }[];
}

export const LEGENDARY_MISSIONS: Record<number, LegendaryMission> = {
  144: {
    pokemonId: 144,
    pokemonName: '프리져',
    targetKm: 5,
    timeWindow: [5, 7],
  },
  145: {
    pokemonId: 145,
    pokemonName: '썬더',
    targetKm: 3,
    targetPace: 4.5,
  },
  146: {
    pokemonId: 146,
    pokemonName: '파이어',
    targetKm: 10,
    milestoneAlerts: [
      { km: 2, message: '포기하시겠습니까?' },
      { km: 5, message: '정말 포기하시겠습니까?' },
      { km: 8, message: '마지막으로 묻겠습니다. 포기하시겠습니까?' },
    ],
  },
  150: {
    pokemonId: 150,
    pokemonName: '뮤츠',
    targetKm: 10,
    milestoneAlerts: [
      { km: 5, message: '나는 네가 만든 한계의 산물이다. 네가 멈추면 나는 폭주한다.' },
    ],
  },
};

/** 전설 미션 완료 체크 */
export function checkLegendaryMissionComplete(
  mission: LegendaryMission,
  distanceKm: number,
  avgPace: number,
  startTime: number,
): boolean {
  if (distanceKm < mission.targetKm) return false;
  if (mission.targetPace && (avgPace <= 0 || avgPace > mission.targetPace)) return false;
  if (mission.timeWindow) {
    const h = new Date(startTime).getHours();
    if (h < mission.timeWindow[0] || h >= mission.timeWindow[1]) return false;
  }
  return true;
}

/** 마일스톤 알림 체크 — 해당 km를 처음 통과했는지 */
export function checkMilestoneAlerts(
  mission: LegendaryMission,
  currentKm: number,
  shownKms: Set<number>,
): { km: number; message: string } | null {
  if (!mission.milestoneAlerts) return null;
  for (const alert of mission.milestoneAlerts) {
    if (currentKm >= alert.km && !shownKms.has(alert.km)) {
      shownKms.add(alert.km);
      return alert;
    }
  }
  return null;
}

/** 미션 진행도 (0~100) */
export function getLegendaryMissionProgress(
  mission: LegendaryMission,
  distanceKm: number,
): number {
  return Math.min(100, Math.round((distanceKm / mission.targetKm) * 100));
}
