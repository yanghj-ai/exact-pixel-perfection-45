// ═══════════════════════════════════════════════════════════
// FIX #4: 진화 조건 전체 테이블 — v8
// 4가지 진화 유형: level / stone / intimacy / story
// ═══════════════════════════════════════════════════════════

import type { EvolutionInfo } from './constants';

// 전체 진화 테이블: fromSpeciesId → EvolutionInfo[]
const EVOLUTION_TABLE: Record<number, EvolutionInfo[]> = {
  // ─── 1단계 → 2단계 (레벨 진화) ──────────────────
  1:  [{ targetId: 2,  type: 'level', condition: { level: 16 } }],    // 이상해씨 → 이상해풀
  4:  [{ targetId: 5,  type: 'level', condition: { level: 16 } }],    // 파이리 → 리자드
  7:  [{ targetId: 8,  type: 'level', condition: { level: 16 } }],    // 꼬부기 → 어니부기
  10: [{ targetId: 11, type: 'level', condition: { level: 7 } }],     // 캐터피 → 단데기
  13: [{ targetId: 14, type: 'level', condition: { level: 7 } }],     // 뿔충이 → 딱충이
  16: [{ targetId: 17, type: 'level', condition: { level: 18 } }],    // 구구 → 피죤
  19: [{ targetId: 20, type: 'level', condition: { level: 20 } }],    // 꼬렛 → 레트라
  21: [{ targetId: 22, type: 'level', condition: { level: 20 } }],    // 깨비참 → 깨비드릴조
  23: [{ targetId: 24, type: 'level', condition: { level: 22 } }],    // 아보 → 아보크
  27: [{ targetId: 28, type: 'level', condition: { level: 22 } }],    // 모래두지 → 고지
  29: [{ targetId: 30, type: 'level', condition: { level: 16 } }],    // 니드런♀ → 니드리나
  32: [{ targetId: 33, type: 'level', condition: { level: 16 } }],    // 니드런♂ → 니드리노
  41: [{ targetId: 42, type: 'level', condition: { level: 22 } }],    // 주뱃 → 골뱃
  43: [{ targetId: 44, type: 'level', condition: { level: 21 } }],    // 뚜벅쵸 → 냄새꼬
  46: [{ targetId: 47, type: 'level', condition: { level: 24 } }],    // 파라스 → 파라섹트
  48: [{ targetId: 49, type: 'level', condition: { level: 31 } }],    // 콘팡 → 도나리
  50: [{ targetId: 51, type: 'level', condition: { level: 26 } }],    // 디그다 → 닥트리오
  52: [{ targetId: 53, type: 'level', condition: { level: 28 } }],    // 나옹 → 페르시온
  54: [{ targetId: 55, type: 'level', condition: { level: 33 } }],    // 고라파덕 → 골덕
  56: [{ targetId: 57, type: 'level', condition: { level: 28 } }],    // 망키 → 성원숭
  60: [{ targetId: 61, type: 'level', condition: { level: 25 } }],    // 발챙이 → 슈륙챙이
  63: [{ targetId: 64, type: 'level', condition: { level: 16 } }],    // 케이시 → 윤겔라
  66: [{ targetId: 67, type: 'level', condition: { level: 28 } }],    // 알통몬 → 근육몬
  69: [{ targetId: 70, type: 'level', condition: { level: 21 } }],    // 모다피 → 우츠동
  72: [{ targetId: 73, type: 'level', condition: { level: 30 } }],    // 왕눈해 → 독파리
  74: [{ targetId: 75, type: 'level', condition: { level: 25 } }],    // 꼬마돌 → 데구리
  77: [{ targetId: 78, type: 'level', condition: { level: 40 } }],    // 포니타 → 날쌩마
  79: [{ targetId: 80, type: 'level', condition: { level: 37 } }],    // 야돈 → 야도란
  81: [{ targetId: 82, type: 'level', condition: { level: 30 } }],    // 코일 → 레어코일
  84: [{ targetId: 85, type: 'level', condition: { level: 31 } }],    // 두두 → 두트리오
  86: [{ targetId: 87, type: 'level', condition: { level: 34 } }],    // 쥬쥬 → 쥬레곤
  88: [{ targetId: 89, type: 'level', condition: { level: 38 } }],    // 질퍽이 → 질뻐기
  92: [{ targetId: 93, type: 'level', condition: { level: 25 } }],    // 고오스 → 고우스트
  96: [{ targetId: 97, type: 'level', condition: { level: 26 } }],    // 슬리프 → 슬리퍼
  98: [{ targetId: 99, type: 'level', condition: { level: 28 } }],    // 크랩 → 킹크랩
  100: [{ targetId: 101, type: 'level', condition: { level: 30 } }],  // 찌리리공 → 붐볼
  104: [{ targetId: 105, type: 'level', condition: { level: 28 } }],  // 탕구리 → 텅구리
  109: [{ targetId: 110, type: 'level', condition: { level: 35 } }],  // 또가스 → 또도가스
  111: [{ targetId: 112, type: 'level', condition: { level: 42 } }],  // 뿔카노 → 코뿌리
  116: [{ targetId: 117, type: 'level', condition: { level: 32 } }],  // 쏘드라 → 시드라
  118: [{ targetId: 119, type: 'level', condition: { level: 33 } }],  // 콘치 → 왕콘치
  129: [{ targetId: 130, type: 'level', condition: { level: 20 } }],  // 잉어킹 → 갸라도스
  138: [{ targetId: 139, type: 'level', condition: { level: 40 } }],  // 암나이트 → 암스타
  140: [{ targetId: 141, type: 'level', condition: { level: 40 } }],  // 투구 → 투구푸스
  147: [{ targetId: 148, type: 'level', condition: { level: 30 } }],  // 미뇽 → 신뇽

  // ─── 2단계 → 3단계 (레벨 진화) ──────────────────
  2:  [{ targetId: 3,  type: 'level', condition: { level: 32 } }],    // 이상해풀 → 이상해꽃
  5:  [{ targetId: 6,  type: 'level', condition: { level: 36 } }],    // 리자드 → 리자몽
  8:  [{ targetId: 9,  type: 'level', condition: { level: 36 } }],    // 어니부기 → 거북왕
  11: [{ targetId: 12, type: 'level', condition: { level: 10 } }],    // 단데기 → 버터플
  14: [{ targetId: 15, type: 'level', condition: { level: 10 } }],    // 딱충이 → 독침붕
  17: [{ targetId: 18, type: 'level', condition: { level: 36 } }],    // 피죤 → 피죤투
  148: [{ targetId: 149, type: 'level', condition: { level: 55 } }],  // 신뇽 → 망나뇽

  // ─── 진화석 진화 ────────────────────────────────
  25: [{ targetId: 26, type: 'stone', condition: { item: 'thunder-stone', level: 15 } }],     // 피카츄 → 라이츄
  37: [{ targetId: 38, type: 'stone', condition: { item: 'fire-stone', level: 15 } }],         // 식스테일 → 나인테일
  58: [{ targetId: 59, type: 'stone', condition: { item: 'fire-stone', level: 15 } }],         // 가디 → 윈디
  133: [                                                                                        // 이브이 (3갈래)
    { targetId: 134, type: 'stone', condition: { item: 'water-stone', level: 15 } },        // → 샤미드
    { targetId: 135, type: 'stone', condition: { item: 'thunder-stone', level: 15 } },      // → 쥬피썬더
    { targetId: 136, type: 'stone', condition: { item: 'fire-stone', level: 15 } },         // → 부스터
  ],
  35: [{ targetId: 36, type: 'stone', condition: { item: 'moon-stone', level: 15 } }],        // 삐삐 → 픽시
  39: [{ targetId: 40, type: 'stone', condition: { item: 'moon-stone', level: 15 } }],         // 푸린 → 푸크린
  44: [{ targetId: 45, type: 'stone', condition: { item: 'leaf-stone', level: 15 } }],         // 냄새꼬 → 라플레시아
  61: [{ targetId: 62, type: 'stone', condition: { item: 'water-stone', level: 15 } }],        // 슈륙챙이 → 강챙이
  70: [{ targetId: 71, type: 'stone', condition: { item: 'leaf-stone', level: 15 } }],         // 우츠동 → 우츠보트
  90: [{ targetId: 91, type: 'stone', condition: { item: 'water-stone', level: 15 } }],        // 셀러 → 파르셀
  102: [{ targetId: 103, type: 'stone', condition: { item: 'leaf-stone', level: 15 } }],       // 아라리 → 나시
  120: [{ targetId: 121, type: 'stone', condition: { item: 'water-stone', level: 15 } }],      // 별가사리 → 아쿠스타

  // ─── 니드 계열 (달의돌) ─────────────────────────
  30: [{ targetId: 31, type: 'stone', condition: { item: 'moon-stone', level: 16 } }],         // 니드리나 → 니드퀸
  33: [{ targetId: 34, type: 'stone', condition: { item: 'moon-stone', level: 16 } }],         // 니드리노 → 니드킹

  // ─── 친밀도 진화 (교환 대체) ─────────────────────
  64: [{ targetId: 65, type: 'intimacy', condition: { intimacy: 200, level: 25 } }],   // 윤겔라 → 후딘
  93: [{ targetId: 94, type: 'intimacy', condition: { intimacy: 200, level: 25 } }],   // 고우스트 → 팬텀
  67: [{ targetId: 68, type: 'intimacy', condition: { intimacy: 200, level: 28 } }],   // 근육몬 → 괴력몬
  75: [{ targetId: 76, type: 'intimacy', condition: { intimacy: 200, level: 25 } }],   // 데구리 → 딱구리

  // ─── 스토리 진화 ───────────────────────────────
  151: [{ targetId: 150, type: 'story', condition: { item: 'gene-catalyst', storyMission: 'mewtwo-genesis' } }],
};

/** Get all evolution options for a species */
export function getEvolutionsFor(speciesId: number): EvolutionInfo[] {
  return EVOLUTION_TABLE[speciesId] || [];
}

/** Check if a specific evolution is possible */
export function canEvolve(
  speciesId: number,
  level: number,
  friendship: number,
  inventoryItems?: Set<string>,
  completedMissions?: Set<string>,
): EvolutionInfo | null {
  const evolutions = getEvolutionsFor(speciesId);
  if (evolutions.length === 0) return null;

  for (const evo of evolutions) {
    switch (evo.type) {
      case 'level':
        if (level >= (evo.condition.level || 999)) return evo;
        break;
      case 'stone':
        if (level >= (evo.condition.level || 15) && inventoryItems?.has(evo.condition.item!)) return evo;
        break;
      case 'intimacy':
        if (friendship >= (evo.condition.intimacy || 200) && level >= (evo.condition.level || 25)) return evo;
        break;
      case 'story':
        if (inventoryItems?.has(evo.condition.item!) && completedMissions?.has(evo.condition.storyMission!)) return evo;
        break;
    }
  }
  return null;
}

/** Get the first level-based evolution (legacy compat) */
export function getLevelEvolution(speciesId: number): { targetId: number; level: number } | null {
  const evos = getEvolutionsFor(speciesId);
  const levelEvo = evos.find(e => e.type === 'level');
  if (levelEvo && levelEvo.condition.level) {
    return { targetId: levelEvo.targetId, level: levelEvo.condition.level };
  }
  return null;
}

/** Get evolution type label (Korean) */
export function getEvolutionTypeLabel(type: EvolutionInfo['type']): string {
  return { level: '레벨 진화', stone: '진화석 진화', intimacy: '친밀도 진화', story: '스토리 진화' }[type];
}

/** Get item name (Korean) */
export function getEvolutionItemName(itemId: string): string {
  const names: Record<string, string> = {
    'fire-stone': '불꽃의돌',
    'water-stone': '물의돌',
    'thunder-stone': '천둥의돌',
    'leaf-stone': '리프의돌',
    'moon-stone': '달의돌',
    'gene-catalyst': '유전자촉매',
  };
  return names[itemId] || itemId;
}
