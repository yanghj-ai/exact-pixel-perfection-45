// ═══════════════════════════════════════════════════════════
// 전설의 포켓몬 — GPS 핫스팟 조우 + 도전 미션 포획
// ═══════════════════════════════════════════════════════════

import type { GeoPoint } from './running';

// ─── Types ───────────────────────────────────────────────

export interface LegendaryHotspot {
  id: string;
  speciesId: number;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
  radiusMeters: number; // player must be within this radius
  description: string;
  hint: string; // clue shown in map
}

export type MissionType = 'pace' | 'distance' | 'time';

export interface CatchMission {
  type: MissionType;
  label: string;
  description: string;
  targetValue: number;
  unit: string;
}

export interface LegendaryEncounter {
  hotspot: LegendaryHotspot;
  mission: CatchMission;
  startedAt: number; // timestamp
  missionActive: boolean;
}

export interface LegendaryEncounterResult {
  success: boolean;
  speciesId: number;
  hotspotId: string;
}

// ─── Hotspot Registry ────────────────────────────────────
// Famous landmarks mapped to legendary birds + Mewtwo + Mew

const LEGENDARY_HOTSPOTS: LegendaryHotspot[] = [
  // 프리져 — 한강공원 (여의도)
  {
    id: 'yeouido-hangang',
    speciesId: 144, // Articuno
    name: '프리져',
    emoji: '🧊',
    lat: 37.5284,
    lng: 126.9326,
    radiusMeters: 500,
    description: '한강의 차가운 바람 속에서 프리져가 목격되었다!',
    hint: '여의도 한강공원 근처에서 차가운 기운이 느껴진다...',
  },
  // 썬더 — 남산타워
  {
    id: 'namsan-tower',
    speciesId: 145, // Zapdos
    name: '썬더',
    emoji: '⚡',
    lat: 37.5512,
    lng: 126.9882,
    radiusMeters: 400,
    description: '남산 정상에서 번개를 동반한 거대한 새가 나타났다!',
    hint: '남산타워 근처에서 전기가 흐르는 듯한 기운...',
  },
  // 파이어 — 올림픽공원
  {
    id: 'olympic-park',
    speciesId: 146, // Moltres
    name: '파이어',
    emoji: '🔥',
    lat: 37.5209,
    lng: 127.1214,
    radiusMeters: 500,
    description: '올림픽공원 하늘에 불꽃의 새가 날고 있다!',
    hint: '올림픽공원 근처에서 뜨거운 열기가 느껴진다...',
  },
  // 뮤츠 — 서울숲
  {
    id: 'seoul-forest',
    speciesId: 150, // Mewtwo
    name: '뮤츠',
    emoji: '🔮',
    lat: 37.5444,
    lng: 127.0374,
    radiusMeters: 400,
    description: '서울숲 깊은 곳에서 강력한 사이코 에너지가 감지되었다!',
    hint: '서울숲 근처에서 정신적 압박감이 느껴진다...',
  },
  // 뮤 — 잠실 석촌호수
  {
    id: 'seokchon-lake',
    speciesId: 151, // Mew
    name: '뮤',
    emoji: '✨',
    lat: 37.5094,
    lng: 127.1001,
    radiusMeters: 350,
    description: '석촌호수 위에서 신비한 빛이 춤추고 있다!',
    hint: '석촌호수 근처에서 환상적인 기운이 느껴진다...',
  },
  // 뮤츠 — 센트럴파크 (뉴욕, 글로벌 유저용)
  {
    id: 'central-park',
    speciesId: 150,
    name: '뮤츠',
    emoji: '🔮',
    lat: 40.7829,
    lng: -73.9654,
    radiusMeters: 600,
    description: 'Central Park에서 강력한 사이코 에너지가 감지되었다!',
    hint: 'Central Park 근처에서 정신적 압박감이 느껴진다...',
  },
  // 프리져 — 도쿄 우에노공원 (글로벌)
  {
    id: 'ueno-park',
    speciesId: 144,
    name: '프리져',
    emoji: '🧊',
    lat: 35.7146,
    lng: 139.7714,
    radiusMeters: 400,
    description: '우에노공원에서 차가운 바람이 불고 있다!',
    hint: '우에노공원 근처에서 차가운 기운이 느껴진다...',
  },
];

// ─── Missions per legendary ─────────────────────────────

const MISSIONS: Record<number, CatchMission[]> = {
  144: [ // Articuno — endurance
    { type: 'distance', label: '인내의 시련', description: '프리져를 포획하려면 2km를 달려야 합니다', targetValue: 2, unit: 'km' },
    { type: 'time', label: '차가운 집중', description: '15분 이상 런닝을 유지하세요', targetValue: 15, unit: '분' },
  ],
  145: [ // Zapdos — speed
    { type: 'pace', label: '번개의 속도', description: '6분/km 이하의 페이스로 1km를 달리세요', targetValue: 6, unit: '분/km' },
    { type: 'distance', label: '전격 질주', description: '1.5km를 빠르게 달리세요', targetValue: 1.5, unit: 'km' },
  ],
  146: [ // Moltres — intensity
    { type: 'distance', label: '불꽃의 의지', description: '3km를 완주하세요', targetValue: 3, unit: 'km' },
    { type: 'pace', label: '맹렬한 질주', description: '5분30초/km 이하 페이스로 2km', targetValue: 5.5, unit: '분/km' },
  ],
  150: [ // Mewtwo — extreme
    { type: 'distance', label: '초월의 시련', description: '5km를 완주해야 뮤츠를 포획할 수 있습니다', targetValue: 5, unit: 'km' },
    { type: 'time', label: '정신력 시험', description: '30분 이상 런닝을 유지하세요', targetValue: 30, unit: '분' },
  ],
  151: [ // Mew — mystery
    { type: 'distance', label: '신비의 탐색', description: '3km를 달리며 뮤를 쫓으세요', targetValue: 3, unit: 'km' },
    { type: 'time', label: '환상의 추적', description: '20분 이상 달리세요', targetValue: 20, unit: '분' },
  ],
};

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'routinmon-legendary';

interface LegendaryState {
  caught: string[]; // hotspot ids that were caught
  encounters: number; // total encounter count
  lastEncounterDate: string | null;
}

function getLegendaryState(): LegendaryState {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { caught: [], encounters: 0, lastEncounterDate: null };
}

function saveLegendaryState(state: LegendaryState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Core Functions ──────────────────────────────────────

/** Haversine distance in meters */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Check if current position is near any legendary hotspot */
export function checkLegendaryProximity(lat: number, lng: number): LegendaryHotspot | null {
  const state = getLegendaryState();
  for (const hotspot of LEGENDARY_HOTSPOTS) {
    if (state.caught.includes(hotspot.id)) continue; // already caught here
    const dist = haversineMeters(lat, lng, hotspot.lat, hotspot.lng);
    if (dist <= hotspot.radiusMeters) {
      return hotspot;
    }
  }
  return null;
}

/** Pick a random mission for a species */
export function getMissionForSpecies(speciesId: number): CatchMission {
  const missions = MISSIONS[speciesId] || MISSIONS[144];
  return missions[Math.floor(Math.random() * missions.length)];
}

/** Check mission completion based on current run stats */
export function checkMissionComplete(
  mission: CatchMission,
  distanceKm: number,
  elapsedSeconds: number,
  paceMinPerKm: number,
): boolean {
  switch (mission.type) {
    case 'distance':
      return distanceKm >= mission.targetValue;
    case 'time':
      return (elapsedSeconds / 60) >= mission.targetValue;
    case 'pace':
      // Pace must be BELOW target (faster), and minimum 1km run
      return distanceKm >= 1 && paceMinPerKm > 0 && paceMinPerKm <= mission.targetValue;
    default:
      return false;
  }
}

/** Record a successful catch */
export function recordLegendaryCatch(hotspotId: string): void {
  const state = getLegendaryState();
  if (!state.caught.includes(hotspotId)) {
    state.caught.push(hotspotId);
  }
  state.encounters++;
  state.lastEncounterDate = new Date().toISOString().split('T')[0];
  saveLegendaryState(state);
}

/** Get mission progress as 0-100 */
export function getMissionProgress(
  mission: CatchMission,
  distanceKm: number,
  elapsedSeconds: number,
  paceMinPerKm: number,
): number {
  switch (mission.type) {
    case 'distance':
      return Math.min(100, (distanceKm / mission.targetValue) * 100);
    case 'time':
      return Math.min(100, ((elapsedSeconds / 60) / mission.targetValue) * 100);
    case 'pace':
      if (distanceKm < 1 || paceMinPerKm <= 0) return 0;
      // Closer to target = higher progress, being faster = 100%
      return paceMinPerKm <= mission.targetValue ? 100 : Math.max(0, (1 - (paceMinPerKm - mission.targetValue) / mission.targetValue) * 100);
    default:
      return 0;
  }
}

/** Get all hotspots (for map display) */
export function getAllHotspots(): (LegendaryHotspot & { caught: boolean })[] {
  const state = getLegendaryState();
  return LEGENDARY_HOTSPOTS.map(h => ({
    ...h,
    caught: state.caught.includes(h.id),
  }));
}

/** Get nearby hotspots within a larger scan radius */
export function getNearbyHotspots(lat: number, lng: number, scanRadiusKm: number = 50): (LegendaryHotspot & { distanceKm: number; caught: boolean })[] {
  const state = getLegendaryState();
  return LEGENDARY_HOTSPOTS
    .map(h => ({
      ...h,
      distanceKm: haversineMeters(lat, lng, h.lat, h.lng) / 1000,
      caught: state.caught.includes(h.id),
    }))
    .filter(h => h.distanceKm <= scanRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function getLegendaryCaughtCount(): number {
  return getLegendaryState().caught.length;
}

export function resetLegendaryState() {
  localStorage.removeItem(STORAGE_KEY);
}
