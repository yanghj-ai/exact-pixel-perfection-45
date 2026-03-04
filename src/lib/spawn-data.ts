// ═══════════════════════════════════════════════════════════
// 151마리 등급 분류 + 한국 권역별 포켓몬 배치 데이터
// ═══════════════════════════════════════════════════════════

import type { PokemonGrade, EncounterCondition } from './pokemon-grade';

// ─── 포켓몬별 등급 + 조우 조건 ─────────────────────────────

export interface PokemonGradeEntry {
  id: number;
  grade: PokemonGrade;
  /** 야생 출몰 조건 (null = 진화 전용, 야생에서 만나지 못함) */
  wildCondition: EncounterCondition | null;
  /** 진화 방법 설명 (진화 전용일 경우) */
  evolveMethod?: string;
}

// Helpers for conditions
const km = (d: number): EncounterCondition => ({ minDistanceKm: d, conditionLogic: 'AND' });
const kmPace = (d: number, p: number): EncounterCondition => ({ minDistanceKm: d, maxPaceMinPerKm: p, conditionLogic: 'AND' });
const kmStreak = (d: number, s: number): EncounterCondition => ({ minDistanceKm: d, minStreakDays: s, conditionLogic: 'AND' });
const kmPaceTotal = (d: number, p: number, t: number): EncounterCondition => ({ minDistanceKm: d, maxPaceMinPerKm: p, minTotalKm: t, conditionLogic: 'AND' });
const kmStreakTime = (d: number, s: number, t: [number, number]): EncounterCondition => ({ minDistanceKm: d, minStreakDays: s, timeWindow: t, conditionLogic: 'AND' });
const kmPaceStreak = (d: number, p: number, s: number): EncounterCondition => ({ minDistanceKm: d, maxPaceMinPerKm: p, minStreakDays: s, conditionLogic: 'AND' });
const kmTotal = (d: number, t: number): EncounterCondition => ({ minDistanceKm: d, minTotalKm: t, conditionLogic: 'AND' });
const evo = (method: string): { wildCondition: null; evolveMethod: string } => ({ wildCondition: null, evolveMethod: method });

export const POKEMON_GRADES: PokemonGradeEntry[] = [
  // ─── 일반 등급 (80마리) ─────────────────────────────────
  { id: 1, grade: 'normal', wildCondition: km(1) },
  { id: 2, grade: 'normal', ...evo('이상해씨 Lv.16') },
  { id: 4, grade: 'normal', wildCondition: km(1) },
  { id: 5, grade: 'normal', ...evo('파이리 Lv.16') },
  { id: 7, grade: 'normal', wildCondition: km(1) },
  { id: 8, grade: 'normal', ...evo('꼬부기 Lv.16') },
  { id: 10, grade: 'normal', wildCondition: km(1) },
  { id: 11, grade: 'normal', ...evo('캐터피 Lv.7') },
  { id: 12, grade: 'normal', ...evo('단데기 Lv.10') },
  { id: 13, grade: 'normal', wildCondition: km(1) },
  { id: 14, grade: 'normal', ...evo('뿔충이 Lv.7') },
  { id: 15, grade: 'normal', ...evo('딱충이 Lv.10') },
  { id: 16, grade: 'normal', wildCondition: km(1) },
  { id: 17, grade: 'normal', ...evo('구구 Lv.18') },
  { id: 19, grade: 'normal', wildCondition: km(1) },
  { id: 20, grade: 'normal', ...evo('꼬렛 Lv.20') },
  { id: 21, grade: 'normal', wildCondition: km(1) },
  { id: 22, grade: 'normal', ...evo('깨비참 Lv.20') },
  { id: 23, grade: 'normal', wildCondition: km(1) },
  { id: 24, grade: 'normal', ...evo('아보 Lv.22') },
  { id: 27, grade: 'normal', wildCondition: km(1) },
  { id: 28, grade: 'normal', ...evo('모래두지 Lv.22') },
  { id: 29, grade: 'normal', wildCondition: km(1) },
  { id: 30, grade: 'normal', ...evo('니드런♀ Lv.16') },
  { id: 32, grade: 'normal', wildCondition: km(1) },
  { id: 33, grade: 'normal', ...evo('니드런♂ Lv.16') },
  { id: 35, grade: 'normal', wildCondition: km(2) },
  { id: 37, grade: 'normal', wildCondition: km(2) },
  { id: 39, grade: 'normal', wildCondition: km(1) },
  { id: 41, grade: 'normal', wildCondition: { minDistanceKm: 1, timeWindow: [21, 5], conditionLogic: 'AND' } },
  { id: 42, grade: 'normal', ...evo('주뱃 Lv.22') },
  { id: 43, grade: 'normal', wildCondition: km(1) },
  { id: 44, grade: 'normal', ...evo('뚜벅쵸 Lv.21') },
  { id: 46, grade: 'normal', wildCondition: km(2) },
  { id: 47, grade: 'normal', ...evo('파라스 Lv.24') },
  { id: 48, grade: 'normal', wildCondition: km(1) },
  { id: 49, grade: 'normal', ...evo('콘팡 Lv.31') },
  { id: 50, grade: 'normal', wildCondition: km(1) },
  { id: 51, grade: 'normal', ...evo('디그다 Lv.26') },
  { id: 52, grade: 'normal', wildCondition: km(1) },
  { id: 53, grade: 'normal', ...evo('나옹 Lv.28') },
  { id: 54, grade: 'normal', wildCondition: km(1) },
  { id: 55, grade: 'normal', ...evo('고라파덕 Lv.33') },
  { id: 56, grade: 'normal', wildCondition: km(1) },
  { id: 57, grade: 'normal', ...evo('망키 Lv.28') },
  { id: 60, grade: 'normal', wildCondition: km(1) },
  { id: 61, grade: 'normal', ...evo('발챙이 Lv.25') },
  { id: 63, grade: 'normal', wildCondition: km(2) },
  { id: 66, grade: 'normal', wildCondition: km(1) },
  { id: 67, grade: 'normal', ...evo('알통몬 Lv.28') },
  { id: 69, grade: 'normal', wildCondition: km(1) },
  { id: 70, grade: 'normal', ...evo('모다피 Lv.21') },
  { id: 72, grade: 'normal', wildCondition: km(1) },
  { id: 73, grade: 'normal', ...evo('왕눈해 Lv.30') },
  { id: 74, grade: 'normal', wildCondition: km(1) },
  { id: 75, grade: 'normal', ...evo('꼬마돌 Lv.25') },
  { id: 77, grade: 'normal', wildCondition: km(2) },
  { id: 78, grade: 'normal', ...evo('포니타 Lv.40') },
  { id: 79, grade: 'normal', wildCondition: km(1) },
  { id: 80, grade: 'normal', ...evo('야돈 Lv.37') },
  { id: 81, grade: 'normal', wildCondition: km(1) },
  { id: 84, grade: 'normal', wildCondition: km(1) },
  { id: 85, grade: 'normal', ...evo('두두 Lv.31') },
  { id: 86, grade: 'normal', wildCondition: km(1) },
  { id: 88, grade: 'normal', wildCondition: km(2) },
  { id: 89, grade: 'normal', ...evo('질퍽이 Lv.38') },
  { id: 90, grade: 'normal', wildCondition: km(1) },
  { id: 92, grade: 'normal', wildCondition: { minDistanceKm: 1, timeWindow: [21, 5], conditionLogic: 'AND' } },
  { id: 93, grade: 'normal', ...evo('고오스 Lv.25') },
  { id: 95, grade: 'normal', wildCondition: km(2) },
  { id: 96, grade: 'normal', wildCondition: { minDistanceKm: 1, timeWindow: [21, 5], conditionLogic: 'AND' } },
  { id: 97, grade: 'normal', ...evo('슬리프 Lv.26') },
  { id: 98, grade: 'normal', wildCondition: km(1) },
  { id: 99, grade: 'normal', ...evo('크랩 Lv.28') },
  { id: 100, grade: 'normal', wildCondition: km(2) },
  { id: 101, grade: 'normal', ...evo('찌리리공 Lv.30') },
  { id: 102, grade: 'normal', wildCondition: km(2) },
  { id: 104, grade: 'normal', wildCondition: km(1) },
  { id: 105, grade: 'normal', ...evo('탕구리 Lv.28') },
  { id: 109, grade: 'normal', wildCondition: km(1) },
  { id: 110, grade: 'normal', ...evo('또가스 Lv.35') },
  { id: 111, grade: 'normal', wildCondition: km(1) },
  { id: 112, grade: 'normal', ...evo('뿔카노 Lv.42') },
  { id: 116, grade: 'normal', wildCondition: km(2) },
  { id: 118, grade: 'normal', wildCondition: km(1) },
  { id: 119, grade: 'normal', ...evo('콘치 Lv.33') },
  { id: 120, grade: 'normal', wildCondition: km(1) },
  { id: 129, grade: 'normal', wildCondition: km(1) },

  // ─── 레어 등급 (45마리) ─────────────────────────────────
  { id: 3, grade: 'rare', ...evo('이상해풀 Lv.32') },
  { id: 6, grade: 'rare', ...evo('리자드 Lv.36') },
  { id: 9, grade: 'rare', ...evo('어니부기 Lv.36') },
  { id: 18, grade: 'rare', ...evo('피죤 Lv.36') },
  { id: 25, grade: 'rare', wildCondition: km(3) },
  { id: 26, grade: 'rare', ...evo('피카츄 + 천둥의 돌') },
  { id: 31, grade: 'rare', ...evo('니드리나 + 달의 돌') },
  { id: 34, grade: 'rare', ...evo('니드리노 + 달의 돌') },
  { id: 36, grade: 'rare', ...evo('삐삐 + 달의 돌') },
  { id: 38, grade: 'rare', ...evo('식스테일 + 불꽃의 돌') },
  { id: 40, grade: 'rare', ...evo('푸린 + 달의 돌') },
  { id: 45, grade: 'rare', ...evo('냄새꼬 + 리프의 돌') },
  { id: 58, grade: 'rare', wildCondition: kmPace(3, 6.5) },
  { id: 59, grade: 'rare', ...evo('가디 + 불꽃의 돌') },
  { id: 62, grade: 'rare', ...evo('슈륙챙이 + 물의 돌') },
  { id: 64, grade: 'rare', wildCondition: km(3) },
  { id: 65, grade: 'rare', ...evo('윤겔라 친밀도 MAX') },
  { id: 68, grade: 'rare', ...evo('근육몬 친밀도 MAX') },
  { id: 71, grade: 'rare', ...evo('우츠동 + 리프의 돌') },
  { id: 76, grade: 'rare', ...evo('데구리 친밀도 MAX') },
  { id: 82, grade: 'rare', wildCondition: km(3) },
  { id: 83, grade: 'rare', wildCondition: kmPace(3, 6.5) },
  { id: 87, grade: 'rare', wildCondition: kmStreak(3, 3) },
  { id: 91, grade: 'rare', ...evo('셀러 + 물의 돌') },
  { id: 94, grade: 'rare', ...evo('고우스트 친밀도 MAX') },
  { id: 103, grade: 'rare', ...evo('아라리 + 리프의 돌') },
  { id: 106, grade: 'rare', wildCondition: kmPace(3, 6.0) },
  { id: 107, grade: 'rare', wildCondition: kmStreak(3, 5) },
  { id: 108, grade: 'rare', wildCondition: km(3) },
  { id: 114, grade: 'rare', wildCondition: km(3) },
  { id: 117, grade: 'rare', wildCondition: km(3) },
  { id: 121, grade: 'rare', ...evo('별가사리 + 물의 돌') },
  { id: 122, grade: 'rare', wildCondition: kmStreak(3, 3) },
  { id: 130, grade: 'rare', ...evo('잉어킹 Lv.20') },
  { id: 133, grade: 'rare', wildCondition: km(3) },
  { id: 134, grade: 'rare', ...evo('이브이 + 물의 돌') },
  { id: 135, grade: 'rare', ...evo('이브이 + 천둥의 돌') },
  { id: 136, grade: 'rare', ...evo('이브이 + 불꽃의 돌') },
  { id: 138, grade: 'rare', wildCondition: kmStreak(3, 5) },
  { id: 139, grade: 'rare', ...evo('암나이트 Lv.40') },
  { id: 140, grade: 'rare', wildCondition: kmStreak(3, 5) },
  { id: 141, grade: 'rare', ...evo('투구 Lv.40') },

  // ─── 유니크 등급 (21마리) ───────────────────────────────
  { id: 113, grade: 'unique', wildCondition: kmStreakTime(5, 5, [5, 7]) },
  { id: 115, grade: 'unique', wildCondition: kmTotal(5, 50) },
  { id: 123, grade: 'unique', wildCondition: kmPace(5, 5.5) },
  { id: 124, grade: 'unique', wildCondition: kmStreakTime(5, 7, [21, 5]) },
  { id: 125, grade: 'unique', wildCondition: kmPaceTotal(5, 6.0, 100) },
  { id: 126, grade: 'unique', wildCondition: kmPaceTotal(5, 6.0, 100) },
  { id: 127, grade: 'unique', wildCondition: kmStreak(5, 7) },
  { id: 128, grade: 'unique', wildCondition: kmPaceStreak(5, 5.5, 5) },
  { id: 131, grade: 'unique', wildCondition: kmStreak(7, 7) },
  { id: 132, grade: 'unique', wildCondition: kmStreak(7, 14) },
  { id: 137, grade: 'unique', wildCondition: kmTotal(5, 150) },
  { id: 142, grade: 'unique', wildCondition: kmPace(7, 5.5) },
  { id: 143, grade: 'unique', wildCondition: kmTotal(10, 100) },
  { id: 147, grade: 'unique', wildCondition: kmPace(5, 6.0) },
  { id: 148, grade: 'unique', wildCondition: kmPaceTotal(7, 5.5, 150) },
  { id: 149, grade: 'unique', wildCondition: kmPaceTotal(10, 5.5, 200) },

  // ─── 전설 등급 (5마리) — 야생 스폰 없음, 스토리 전용 ───
  { id: 144, grade: 'legendary', wildCondition: null, evolveMethod: '챌린지: 얼리버드(SP1) + 7일연속(S2)' },
  { id: 145, grade: 'legendary', wildCondition: null, evolveMethod: '챌린지: 스피드스터(SP3) + 5km러너(D3)' },
  { id: 146, grade: 'legendary', wildCondition: null, evolveMethod: '챌린지: 30일연속(S4) + 10km정복(D4)' },
  { id: 150, grade: 'legendary', wildCondition: null, evolveMethod: '뮤 보유 + 유전자 촉매' },
  { id: 151, grade: 'legendary', wildCondition: null, evolveMethod: '전 챌린지 100% 달성' },
];

/** 포켓몬 ID → 등급 정보 빠른 조회 */
const gradeMap = new Map<number, PokemonGradeEntry>();
for (const entry of POKEMON_GRADES) {
  gradeMap.set(entry.id, entry);
}

export function getPokemonGrade(id: number): PokemonGradeEntry | undefined {
  return gradeMap.get(id);
}

export function getGradeForPokemon(id: number): PokemonGrade {
  return gradeMap.get(id)?.grade ?? 'normal';
}

// ─── 한국 권역별 포켓몬 배치 ─────────────────────────────

export interface SpawnRegion {
  id: string;
  name: string;
  emoji: string;
  area: string;          // 상위 권역
  lat: [number, number]; // [min, max]
  lng: [number, number]; // [min, max]
  pokemon: number[];     // species ids that spawn here
}

export const SPAWN_REGIONS: SpawnRegion[] = [
  // ── 수도권 ──────────────────────────────────
  {
    id: 'seoul-hangang',
    name: '서울 한강',
    emoji: '🌊',
    area: '수도권',
    lat: [37.50, 37.55],
    lng: [126.89, 127.10],
    pokemon: [129, 54, 60, 118, 16, 19, 25, 133, 108, 113, 143],
  },
  {
    id: 'seoul-namsan',
    name: '서울 남산',
    emoji: '⛰️',
    area: '수도권',
    lat: [37.54, 37.56],
    lng: [126.97, 127.00],
    pokemon: [4, 52, 21, 84, 37, 77, 58],
  },
  {
    id: 'seoul-park',
    name: '서울 공원',
    emoji: '🌳',
    area: '수도권',
    lat: [37.50, 37.58],
    lng: [126.90, 127.15],
    pokemon: [1, 43, 10, 13, 69, 46, 7, 102, 114],
  },
  {
    id: 'gyeonggi-north',
    name: '경기 북부 (북한산)',
    emoji: '🏔️',
    area: '수도권',
    lat: [37.60, 37.75],
    lng: [126.90, 127.10],
    pokemon: [74, 66, 111, 104, 50, 95, 106, 107],
  },
  {
    id: 'gyeonggi-south',
    name: '경기 남부',
    emoji: '🏘️',
    area: '수도권',
    lat: [37.20, 37.50],
    lng: [126.80, 127.20],
    pokemon: [16, 19, 21, 23, 29, 32, 128],
  },
  {
    id: 'incheon',
    name: '인천/서해안',
    emoji: '🌅',
    area: '수도권',
    lat: [37.35, 37.55],
    lng: [126.30, 126.75],
    pokemon: [98, 90, 72, 27, 109, 116, 88, 117],
  },

  // ── 강원권 ──────────────────────────────────
  {
    id: 'chuncheon',
    name: '춘천/소양강',
    emoji: '🏞️',
    area: '강원권',
    lat: [37.80, 37.95],
    lng: [127.68, 127.80],
    pokemon: [129, 60, 79, 63, 64, 147],
  },
  {
    id: 'seorak',
    name: '설악산/오대산',
    emoji: '🏔️',
    area: '강원권',
    lat: [37.95, 38.20],
    lng: [128.40, 128.70],
    pokemon: [74, 66, 95, 106, 68, 142],
  },
  {
    id: 'gangneung',
    name: '강릉/동해안',
    emoji: '🌊',
    area: '강원권',
    lat: [37.65, 37.85],
    lng: [128.85, 129.00],
    pokemon: [120, 116, 86, 117, 87, 124, 131],
  },

  // ── 충청권 ──────────────────────────────────
  {
    id: 'daejeon',
    name: '대전/세종',
    emoji: '🏙️',
    area: '충청권',
    lat: [36.30, 36.50],
    lng: [127.30, 127.50],
    pokemon: [43, 69, 81, 48, 100, 82],
  },
  {
    id: 'chungju',
    name: '충주/단양',
    emoji: '⛰️',
    area: '충청권',
    lat: [36.80, 37.10],
    lng: [127.80, 128.50],
    pokemon: [79, 74, 41, 63, 64, 147],
  },

  // ── 전라권 ──────────────────────────────────
  {
    id: 'gwangju',
    name: '광주/무등산',
    emoji: '🔥',
    area: '전라권',
    lat: [35.05, 35.20],
    lng: [126.85, 127.00],
    pokemon: [4, 37, 77, 58, 106, 126],
  },
  {
    id: 'yeosu',
    name: '여수/순천만',
    emoji: '🌊',
    area: '전라권',
    lat: [34.70, 34.90],
    lng: [127.60, 127.80],
    pokemon: [129, 118, 72, 79, 116, 83],
  },
  {
    id: 'jeonju',
    name: '전주',
    emoji: '🏛️',
    area: '전라권',
    lat: [35.78, 35.88],
    lng: [127.10, 127.18],
    pokemon: [39, 52, 56, 122, 113, 132],
  },

  // ── 경상권 ──────────────────────────────────
  {
    id: 'busan',
    name: '부산 해운대/광안리',
    emoji: '🏖️',
    area: '경상권',
    lat: [35.10, 35.20],
    lng: [129.10, 129.20],
    pokemon: [72, 120, 90, 116, 117, 87, 131],
  },
  {
    id: 'daegu',
    name: '대구/팔공산',
    emoji: '⛰️',
    area: '경상권',
    lat: [35.80, 36.00],
    lng: [128.50, 128.80],
    pokemon: [4, 37, 77, 74, 58, 126],
  },
  {
    id: 'gyeongju',
    name: '경주',
    emoji: '🏛️',
    area: '경상권',
    lat: [35.75, 35.90],
    lng: [129.15, 129.35],
    pokemon: [92, 96, 104, 63, 138, 140, 142],
  },
  {
    id: 'ulsan',
    name: '울산',
    emoji: '⚡',
    area: '경상권',
    lat: [35.50, 35.60],
    lng: [129.20, 129.40],
    pokemon: [81, 100, 129, 82, 125, 137],
  },

  // ── 제주권 ──────────────────────────────────
  {
    id: 'jeju-coast',
    name: '제주 올레길',
    emoji: '🌺',
    area: '제주권',
    lat: [33.20, 33.55],
    lng: [126.10, 126.95],
    pokemon: [120, 116, 72, 117, 87, 131],
  },
  {
    id: 'hallasan',
    name: '한라산',
    emoji: '🏔️',
    area: '제주권',
    lat: [33.30, 33.40],
    lng: [126.48, 126.58],
    pokemon: [74, 66, 147, 148, 142, 149],
  },
  {
    id: 'jeju-forest',
    name: '제주 곶자왈',
    emoji: '🌿',
    area: '제주권',
    lat: [33.25, 33.45],
    lng: [126.20, 126.80],
    pokemon: [69, 46, 48, 102, 123, 127],
  },
];

/** GPS 좌표로 현재 위치의 권역 찾기 */
export function findRegionByGps(lat: number, lng: number): SpawnRegion | null {
  return SPAWN_REGIONS.find(r =>
    lat >= r.lat[0] && lat <= r.lat[1] &&
    lng >= r.lng[0] && lng <= r.lng[1]
  ) || null;
}

/** 기본 권역 (GPS 없을 때) — 서울 공원 */
export function getDefaultRegion(): SpawnRegion {
  return SPAWN_REGIONS.find(r => r.id === 'seoul-park')!;
}

/** 권역 목록을 상위 area별로 그룹 */
export function getRegionsByArea(): Map<string, SpawnRegion[]> {
  const map = new Map<string, SpawnRegion[]>();
  for (const r of SPAWN_REGIONS) {
    const list = map.get(r.area) || [];
    list.push(r);
    map.set(r.area, list);
  }
  return map;
}
