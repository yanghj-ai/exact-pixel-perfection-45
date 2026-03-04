// ═══════════════════════════════════════════════════════════
// 포켓몬 서식지/출몰 지역 시스템
// 타입 기반 + 개별 포켓몬 서식지 매핑
// ═══════════════════════════════════════════════════════════

import type { PokemonType } from './pokemon-registry';

export interface Habitat {
  id: string;
  name: string;
  emoji: string;
  description: string;
  terrain: string; // 지형 유형
}

// 서식지 정의
export const HABITATS: Record<string, Habitat> = {
  ocean: { id: 'ocean', name: '바다', emoji: '🌊', description: '깊고 넓은 바다와 해안가', terrain: '해양' },
  river: { id: 'river', name: '강/호수', emoji: '🏞️', description: '맑은 강과 호수 주변', terrain: '담수' },
  forest: { id: 'forest', name: '숲', emoji: '🌳', description: '울창한 숲과 나무가 많은 지역', terrain: '삼림' },
  mountain: { id: 'mountain', name: '산/동굴', emoji: '⛰️', description: '높은 산과 깊은 동굴', terrain: '산악' },
  grassland: { id: 'grassland', name: '초원/들판', emoji: '🌾', description: '넓은 풀밭과 들판', terrain: '평야' },
  city: { id: 'city', name: '도시/마을', emoji: '🏙️', description: '사람이 사는 도시와 마을 근처', terrain: '도시' },
  cave: { id: 'cave', name: '동굴/지하', emoji: '🕳️', description: '어둡고 깊은 동굴과 지하', terrain: '지하' },
  volcano: { id: 'volcano', name: '화산/열지', emoji: '🌋', description: '뜨거운 화산 지대와 온천', terrain: '화산' },
  swamp: { id: 'swamp', name: '늪/습지', emoji: '🐸', description: '축축한 늪지대와 습지', terrain: '습지' },
  sky: { id: 'sky', name: '하늘/고지대', emoji: '☁️', description: '높은 하늘과 산 꼭대기', terrain: '공중' },
  ruins: { id: 'ruins', name: '유적/신전', emoji: '🏛️', description: '고대 유적과 신비로운 장소', terrain: '유적' },
  snow: { id: 'snow', name: '설원/빙하', emoji: '❄️', description: '눈 덮인 설원과 빙하 지대', terrain: '빙설' },
  power_plant: { id: 'power_plant', name: '발전소/공장', emoji: '⚡', description: '전기가 흐르는 발전소 주변', terrain: '산업' },
  desert: { id: 'desert', name: '사막/건조지', emoji: '🏜️', description: '뜨겁고 건조한 사막 지대', terrain: '사막' },
};

// 타입 → 기본 서식지 매핑
const TYPE_HABITATS: Record<PokemonType, string[]> = {
  normal: ['grassland', 'city'],
  fire: ['volcano', 'desert'],
  water: ['ocean', 'river'],
  grass: ['forest', 'grassland'],
  electric: ['power_plant', 'city'],
  ice: ['snow', 'cave'],
  fighting: ['mountain', 'city'],
  poison: ['swamp', 'forest'],
  ground: ['desert', 'cave', 'mountain'],
  flying: ['sky', 'grassland', 'forest'],
  psychic: ['ruins', 'city'],
  bug: ['forest', 'grassland'],
  rock: ['mountain', 'cave'],
  ghost: ['ruins', 'cave'],
  dragon: ['mountain', 'cave'],
  fairy: ['forest', 'ruins'],
};

// 개별 포켓몬 서식지 오버라이드 (타입 기반이 아닌 고유 서식지)
const POKEMON_HABITAT_OVERRIDES: Record<number, string[]> = {
  // 물 포켓몬 세부 분류
  7: ['river', 'ocean'],       // 꼬부기 - 강/바다
  8: ['river', 'ocean'],       // 어니부기
  9: ['ocean'],                // 거북왕 - 바다
  54: ['river'],               // 고라파덕 - 강
  55: ['river', 'ocean'],      // 골덕
  60: ['river', 'swamp'],      // 발챙이 - 강/늪
  61: ['river', 'swamp'],      // 슈륙챙이
  62: ['river', 'swamp'],      // 강챙이
  72: ['ocean'],               // 왕눈해 - 바다
  73: ['ocean'],               // 독파리
  86: ['ocean', 'snow'],       // 쥬쥬 - 바다/빙하
  87: ['ocean', 'snow'],       // 쥬레곤
  90: ['ocean'],               // 셸더 - 바다
  91: ['ocean'],               // 파르셀
  98: ['ocean', 'river'],      // 크랩 - 해안가/강
  99: ['ocean'],               // 킹크랩
  116: ['ocean'],              // 쏘드라
  117: ['ocean'],              // 시드라
  118: ['river'],              // 콘치 - 강
  119: ['river'],              // 왕콘치
  120: ['ocean'],              // 별가사리
  121: ['ocean'],              // 아쿠스타
  129: ['river', 'ocean'],     // 잉어킹 - 어디든
  130: ['ocean'],              // 갸라도스 - 바다
  131: ['ocean'],              // 라프라스 - 바다
  134: ['river', 'ocean'],     // 샤미드 - 물가
  138: ['ocean'],              // 암나이트 - 바다 (화석)
  139: ['ocean'],              // 암스타
  140: ['ocean'],              // 투구 - 바다 (화석)
  141: ['ocean'],              // 투구푸스

  // 불 포켓몬
  4: ['grassland', 'volcano'], // 파이리
  5: ['volcano'],              // 리자드
  6: ['volcano', 'sky'],       // 리자몽
  37: ['grassland', 'mountain'], // 식스테일
  38: ['mountain'],            // 나인테일
  58: ['grassland', 'city'],   // 가디 - 도시 근처
  59: ['grassland', 'mountain'], // 윈디
  77: ['grassland'],           // 포니타 - 초원
  78: ['grassland'],           // 날쌩마
  126: ['volcano'],            // 마그마
  136: ['volcano'],            // 부스터
  146: ['volcano', 'sky'],     // 파이어

  // 풀 포켓몬
  1: ['forest', 'grassland'],  // 이상해씨
  43: ['forest', 'swamp'],     // 뚜벅쵸
  69: ['forest', 'swamp'],     // 모다피

  // 전기 포켓몬
  25: ['forest', 'power_plant'], // 피카츄 - 숲/발전소
  26: ['power_plant'],         // 라이츄
  81: ['power_plant', 'city'], // 코일
  82: ['power_plant'],         // 레어코일
  100: ['power_plant'],        // 찌리리공
  101: ['power_plant'],        // 붐볼
  125: ['power_plant'],        // 에레브
  135: ['power_plant'],        // 쥬피썬더
  145: ['power_plant', 'sky'], // 썬더

  // 노말 포켓몬
  16: ['city', 'forest'],      // 구구
  19: ['city', 'grassland'],   // 꼬렛
  20: ['city', 'grassland'],   // 레트라
  39: ['city', 'grassland'],   // 푸린
  52: ['city'],                // 나옹
  53: ['city'],                // 페르시온
  83: ['grassland'],           // 파오리 - 초원
  84: ['grassland'],           // 두두
  85: ['grassland', 'sky'],    // 두트리오
  108: ['forest', 'grassland'], // 내루미
  113: ['city', 'forest'],     // 럭키
  115: ['grassland'],          // 캥카
  128: ['grassland'],          // 켄타로스
  132: ['city'],               // 메타몽
  133: ['city', 'forest'],     // 이브이
  137: ['city', 'ruins'],      // 폴리곤
  143: ['grassland', 'mountain'], // 잠만보

  // 에스퍼
  63: ['city', 'ruins'],       // 캐이시
  96: ['city', 'ruins'],       // 슬리프
  122: ['city'],               // 마임맨
  150: ['ruins'],              // 뮤츠 - 유적
  151: ['ruins', 'forest'],    // 뮤

  // 고스트
  92: ['ruins', 'cave'],       // 고오스
  93: ['ruins', 'cave'],       // 고우스트
  94: ['ruins', 'city'],       // 팬텀

  // 격투
  56: ['mountain', 'forest'],  // 망키
  66: ['mountain', 'city'],    // 알통몬
  106: ['city'],               // 시라소몬
  107: ['city'],               // 홍수몬

  // 바위/땅
  50: ['cave', 'city'],        // 디그다
  74: ['mountain', 'cave'],    // 꼬마돌
  95: ['mountain', 'cave'],    // 롱스톤
  104: ['ruins', 'cave'],      // 탕구리
  105: ['ruins', 'cave'],      // 텅구리
  111: ['grassland', 'desert'], // 뿔카노
  112: ['desert', 'mountain'], // 코뿌리
  142: ['sky', 'mountain'],    // 프테라 - 하늘/산 (화석)

  // 독
  23: ['forest', 'swamp'],     // 아보
  29: ['grassland', 'forest'], // 니드런♀
  32: ['grassland', 'forest'], // 니드런♂
  41: ['cave'],                // 주뱃
  42: ['cave'],                // 골뱃
  48: ['forest', 'swamp'],     // 콘팡
  88: ['city', 'swamp'],       // 질퍽이
  89: ['city', 'swamp'],       // 질뻐기
  109: ['city', 'power_plant'], // 또가스
  110: ['city', 'power_plant'], // 또도가스

  // 벌레
  10: ['forest'],              // 캐터피
  13: ['forest'],              // 뿔충이
  46: ['forest', 'cave'],      // 파라스
  47: ['forest', 'cave'],      // 파라섹트
  123: ['forest', 'grassland'], // 스라크
  127: ['forest'],             // 쁘사이저

  // 얼음
  124: ['snow'],               // 루주라
  144: ['snow', 'sky'],        // 프리져

  // 드래곤
  147: ['river', 'ocean'],     // 미뇽 - 물가
  148: ['ocean'],              // 신뇽
  149: ['sky', 'ocean'],       // 망나뇽 - 하늘/바다
};

/**
 * 포켓몬의 서식지 목록을 반환
 * 개별 오버라이드가 있으면 그것을 사용, 없으면 타입 기반
 */
export function getPokemonHabitats(speciesId: number, types: PokemonType[]): Habitat[] {
  const habitatIds = POKEMON_HABITAT_OVERRIDES[speciesId] 
    || [...new Set(types.flatMap(t => TYPE_HABITATS[t] || []))];
  
  return habitatIds
    .map(id => HABITATS[id])
    .filter(Boolean);
}

/**
 * 특정 서식지에서 출몰하는 포켓몬 종 ID 목록
 */
export function getPokemonByHabitat(habitatId: string): number[] {
  const result: number[] = [];
  // Check overrides first
  for (const [idStr, habitats] of Object.entries(POKEMON_HABITAT_OVERRIDES)) {
    if (habitats.includes(habitatId)) {
      result.push(Number(idStr));
    }
  }
  return result;
}

/**
 * 서식지 기반 출몰 확률 보정 (향후 위치 기반 조우 시스템에 활용)
 */
export function getHabitatEncounterBonus(habitatId: string): number {
  // 특수 서식지일수록 레어 포켓몬 확률 상승
  const bonusMap: Record<string, number> = {
    ocean: 1.2,
    volcano: 1.5,
    ruins: 1.8,
    snow: 1.3,
    power_plant: 1.4,
    cave: 1.1,
    mountain: 1.2,
    forest: 1.0,
    grassland: 0.9,
    city: 0.8,
    river: 1.0,
    swamp: 1.1,
    sky: 1.3,
    desert: 1.2,
  };
  return bonusMap[habitatId] || 1.0;
}
