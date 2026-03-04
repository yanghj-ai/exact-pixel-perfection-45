// ═══════════════════════════════════════════════════════════
// 1세대 포켓몬 전체 레지스트리 (151종)
// ═══════════════════════════════════════════════════════════

export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric'
  | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying'
  | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'fairy';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  types: PokemonType[];
  rarity: Rarity;
  evolveFrom: number | null;
  evolveTo: number[];
  evolveLevel?: number;
  spriteUrl: string;
  description: string;
  baseStats: BaseStats;
  learnset: string[];
}

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated';

function sprite(id: number) {
  return `${SPRITE_BASE}/${id}.gif`;
}

// Compact format: [id, name, types, rarity, evolveFrom, evolveTo[], evolveLevel?, description]
type PokemonTuple = [number, string, PokemonType[], Rarity, number | null, number[], number?, string?];

const RAW_DATA: PokemonTuple[] = [
  [1, '이상해씨', ['grass', 'poison'], 'uncommon', null, [2], 16, '등에 씨앗을 달고 태어나는 풀 포켓몬'],
  [2, '이상해풀', ['grass', 'poison'], 'uncommon', 1, [3], 32, '등의 꽃봉오리가 커지면 진화한다'],
  [3, '이상해꽃', ['grass', 'poison'], 'rare', 2, [], undefined, '거대한 꽃에서 향기를 뿜는다'],
  [4, '파이리', ['fire'], 'uncommon', null, [5], 16, '꼬리 불꽃으로 기분을 알 수 있다'],
  [5, '리자드', ['fire'], 'uncommon', 4, [6], 36, '날카로운 발톱으로 적을 찢는다'],
  [6, '리자몽', ['fire', 'flying'], 'rare', 5, [], undefined, '하늘을 날며 강력한 화염을 내뿜는다'],
  [7, '꼬부기', ['water'], 'uncommon', null, [8], 16, '등껍질에 숨어 물을 쏜다'],
  [8, '어니부기', ['water'], 'uncommon', 7, [9], 36, '털이 보송보송한 꼬리가 매력'],
  [9, '거북왕', ['water'], 'rare', 8, [], undefined, '등의 대포에서 강력한 물줄기를 발사'],
  [10, '캐터피', ['bug'], 'common', null, [11], 7, '머리의 더듬이에서 냄새를 풍긴다'],
  [11, '단데기', ['bug'], 'common', 10, [12], 10, '껍질 안에서 진화를 준비한다'],
  [12, '버터플', ['bug', 'flying'], 'uncommon', 11, [], undefined, '아름다운 날개로 하늘을 난다'],
  [13, '뿔충이', ['bug', 'poison'], 'common', null, [14], 7, '머리 뿔의 독은 강력하다'],
  [14, '딱충이', ['bug', 'poison'], 'common', 13, [15], 10, '속에서 진화를 기다리는 중'],
  [15, '독침붕', ['bug', 'poison'], 'uncommon', 14, [], undefined, '양팔의 독침으로 공격한다'],
  [16, '구구', ['normal', 'flying'], 'common', null, [17], 18, '방향 감각이 뛰어나 항상 집을 찾는다'],
  [17, '피죤', ['normal', 'flying'], 'common', 16, [18], 36, '넓은 영역을 날며 먹이를 찾는다'],
  [18, '피죤투', ['normal', 'flying'], 'uncommon', 17, [], undefined, '아름다운 머리 깃털을 가졌다'],
  [19, '꼬렛', ['normal'], 'common', null, [20], 20, '앞니가 계속 자라 갈아야 한다'],
  [20, '레트라', ['normal'], 'common', 19, [], undefined, '뒷다리의 물갈퀴로 강을 건넌다'],
  [21, '깨비참', ['normal', 'flying'], 'common', null, [22], 20, '짧은 날개로 바쁘게 날아다닌다'],
  [22, '깨비드릴조', ['normal', 'flying'], 'uncommon', 21, [], undefined, '긴 부리로 땅속 벌레를 잡는다'],
  [23, '아보', ['poison'], 'common', null, [24], 22, '몸을 동그랗게 말아 위협한다'],
  [24, '아보크', ['poison'], 'uncommon', 23, [], undefined, '배의 무늬로 적을 겁먹게 한다'],
  [25, '피카츄', ['electric'], 'rare', null, [26], undefined, '뺨의 전기 주머니에 전기를 모은다'],
  [26, '라이츄', ['electric'], 'rare', 25, [], undefined, '10만 볼트의 전기를 방출한다'],
  [27, '모래두지', ['ground'], 'common', null, [28], 22, '몸을 둥글게 말아 적을 막는다'],
  [28, '고지', ['ground'], 'uncommon', 27, [], undefined, '날카로운 발톱으로 땅을 판다'],
  [29, '니드런♀', ['poison'], 'common', null, [30], 16, '작은 뿔의 독은 강력하다'],
  [30, '니드리나', ['poison'], 'common', 29, [31], undefined, '온순한 성격의 포켓몬'],
  [31, '니드퀸', ['poison', 'ground'], 'uncommon', 30, [], undefined, '단단한 비늘로 새끼를 지킨다'],
  [32, '니드런♂', ['poison'], 'common', null, [33], 16, '큰 귀로 위험을 감지한다'],
  [33, '니드리노', ['poison'], 'common', 32, [34], undefined, '다이아몬드보다 단단한 뿔'],
  [34, '니드킹', ['poison', 'ground'], 'uncommon', 33, [], undefined, '꼬리 한 방으로 전봇대를 부순다'],
  [35, '삐삐', ['fairy'], 'uncommon', null, [36], undefined, '달빛에 춤추는 신비로운 포켓몬'],
  [36, '픽시', ['fairy'], 'rare', 35, [], undefined, '날개로 하늘을 자유롭게 날 수 있다'],
  [37, '식스테일', ['fire'], 'uncommon', null, [38], undefined, '6개의 꼬리가 아름답다'],
  [38, '나인테일', ['fire'], 'rare', 37, [], undefined, '9개의 꼬리에 신비한 힘이 깃들어 있다'],
  [39, '푸린', ['normal', 'fairy'], 'common', null, [40], undefined, '노래로 적을 잠재운다'],
  [40, '푸크린', ['normal', 'fairy'], 'uncommon', 39, [], undefined, '부드러운 털이 매력 포인트'],
  [41, '주뱃', ['poison', 'flying'], 'common', null, [42], 22, '초음파로 주변을 파악한다'],
  [42, '골뱃', ['poison', 'flying'], 'uncommon', 41, [], undefined, '날카로운 이빨로 피를 빤다'],
  [43, '뚜벅쵸', ['grass', 'poison'], 'common', null, [44], 21, '햇빛을 받으며 걷는 것을 좋아한다'],
  [44, '냄새꼬', ['grass', 'poison'], 'common', 43, [45], undefined, '꽃에서 지독한 냄새가 난다'],
  [45, '라플레시아', ['grass', 'poison'], 'uncommon', 44, [], undefined, '세상에서 가장 큰 꽃잎을 가졌다'],
  [46, '파라스', ['bug', 'grass'], 'common', null, [47], 24, '등의 버섯에서 양분을 받는다'],
  [47, '파라섹트', ['bug', 'grass'], 'uncommon', 46, [], undefined, '버섯이 본체를 지배하고 있다'],
  [48, '콘팡', ['bug', 'poison'], 'common', null, [49], 31, '큰 눈으로 어둠 속을 본다'],
  [49, '도나리', ['bug', 'poison'], 'uncommon', 48, [], undefined, '밤에 빛에 이끌려 날아온다'],
  [50, '디그다', ['ground'], 'common', null, [51], 26, '땅속 생활에 적응한 포켓몬'],
  [51, '닥트리오', ['ground'], 'uncommon', 50, [], undefined, '세 쌍둥이가 힘을 합쳐 판다'],
  [52, '나옹', ['normal'], 'common', null, [53], 28, '반짝이는 것을 모으는 습성'],
  [53, '페르시온', ['normal'], 'uncommon', 52, [], undefined, '우아한 걸음걸이의 고양이 포켓몬'],
  [54, '고라파덕', ['water'], 'common', null, [55], 33, '늘 두통에 시달리는 포켓몬'],
  [55, '골덕', ['water'], 'uncommon', 54, [], undefined, '올림픽 수영 선수보다 빠르다'],
  [56, '망키', ['fighting'], 'common', null, [57], 28, '화가 나면 손이 떨린다'],
  [57, '성원숭', ['fighting'], 'uncommon', 56, [], undefined, '항상 화가 나 있는 포켓몬'],
  [58, '가디', ['fire'], 'uncommon', null, [59], undefined, '충성스럽고 용감한 강아지 포켓몬'],
  [59, '윈디', ['fire'], 'rare', 58, [], undefined, '전설에 나오는 아름다운 포켓몬'],
  [60, '발챙이', ['water'], 'common', null, [61], 25, '배의 소용돌이 무늬가 비쳐 보인다'],
  [61, '슈륙챙이', ['water'], 'common', 60, [62], undefined, '육지에서도 생활할 수 있다'],
  [62, '강챙이', ['water', 'fighting'], 'uncommon', 61, [], undefined, '근육질의 강력한 포켓몬'],
  [63, '케이시', ['psychic'], 'uncommon', null, [64], 16, '하루에 18시간을 잔다'],
  [64, '윤겔라', ['psychic'], 'uncommon', 63, [65], undefined, '숟가락으로 초능력을 증폭한다'],
  [65, '후딘', ['psychic'], 'rare', 64, [], undefined, 'IQ 5000의 천재 포켓몬'],
  [66, '알통몬', ['fighting'], 'common', null, [67], 28, '온몸이 근육으로 이루어져 있다'],
  [67, '근육몬', ['fighting'], 'common', 66, [68], undefined, '팔이 4개처럼 보일 만큼 빠르다'],
  [68, '괴력몬', ['fighting'], 'uncommon', 67, [], undefined, '4개의 팔로 2초에 1000번 펀치'],
  [69, '모다피', ['grass', 'poison'], 'common', null, [70], 21, '가느다란 몸이 바람에 흔들린다'],
  [70, '우츠동', ['grass', 'poison'], 'common', 69, [71], undefined, '입에서 산성 액체를 뿜는다'],
  [71, '우츠보트', ['grass', 'poison'], 'uncommon', 70, [], undefined, '큰 입으로 먹이를 통째로 삼킨다'],
  [72, '왕눈해', ['water', 'poison'], 'common', null, [73], 30, '투명한 몸으로 바다를 떠다닌다'],
  [73, '독파리', ['water', 'poison'], 'uncommon', 72, [], undefined, '80개의 촉수로 사냥한다'],
  [74, '꼬마돌', ['rock', 'ground'], 'common', null, [75], 25, '산길에서 돌로 위장한다'],
  [75, '데구리', ['rock', 'ground'], 'common', 74, [76], undefined, '산에서 굴러떨어지며 몸을 단련'],
  [76, '딱구리', ['rock', 'ground'], 'uncommon', 75, [], undefined, '다이너마이트도 끄떡없는 몸'],
  [77, '포니타', ['fire'], 'uncommon', null, [78], 40, '태어난 직후부터 달릴 수 있다'],
  [78, '날쌩마', ['fire'], 'rare', 77, [], undefined, '시속 240km로 달리는 불꽃 말'],
  [79, '야돈', ['water', 'psychic'], 'common', null, [80], 37, '멍하지만 꼬리에 물린 셀러로 진화'],
  [80, '야도란', ['water', 'psychic'], 'uncommon', 79, [], undefined, '꼬리의 셀러와 공생하는 포켓몬'],
  [81, '코일', ['electric'], 'common', null, [82], 30, '자력으로 공중에 떠 있다'],
  [82, '레어코일', ['electric'], 'uncommon', 81, [], undefined, '3마리가 합체한 형태'],
  [83, '파오리', ['normal', 'flying'], 'uncommon', null, [], undefined, '대파를 무기처럼 휘두른다'],
  [84, '두두', ['normal', 'flying'], 'common', null, [85], 31, '머리가 2개라 잠을 교대로 잔다'],
  [85, '두트리오', ['normal', 'flying'], 'uncommon', 84, [], undefined, '3개의 머리가 각자 다른 생각을 한다'],
  [86, '쥬쥬', ['water'], 'common', null, [87], 34, '추운 바다에서 즐겁게 헤엄친다'],
  [87, '쥬레곤', ['water', 'ice'], 'uncommon', 86, [], undefined, '하얀 몸으로 눈 속에 숨는다'],
  [88, '질퍽이', ['poison'], 'common', null, [89], 38, '독성 슬라임으로 이루어져 있다'],
  [89, '질뻐기', ['poison'], 'uncommon', 88, [], undefined, '지나간 자리에 풀이 3년간 자라지 않는다'],
  [90, '셀러', ['water'], 'common', null, [91], undefined, '단단한 껍질로 몸을 보호한다'],
  [91, '파르셀', ['water', 'ice'], 'uncommon', 90, [], undefined, '껍질의 뾰족한 돌기로 공격한다'],
  [92, '고오스', ['ghost', 'poison'], 'uncommon', null, [93], 25, '가스로 이루어진 유령 포켓몬'],
  [93, '고우스트', ['ghost', 'poison'], 'uncommon', 92, [94], undefined, '어둠 속에서 혀를 내밀어 핥는다'],
  [94, '팬텀', ['ghost', 'poison'], 'rare', 93, [], undefined, '그림자에 숨어 생명력을 빼앗는다'],
  [95, '롱스톤', ['rock', 'ground'], 'uncommon', null, [], undefined, '땅속을 시속 80km로 파고든다'],
  [96, '슬리프', ['psychic'], 'common', null, [97], 26, '코를 흔들어 최면을 건다'],
  [97, '슬리퍼', ['psychic'], 'uncommon', 96, [], undefined, '추를 흔들어 누구든 잠재운다'],
  [98, '크랩', ['water'], 'common', null, [99], 28, '집게로 무엇이든 자른다'],
  [99, '킹크랩', ['water'], 'uncommon', 98, [], undefined, '거대한 집게의 힘은 10000마력'],
  [100, '찌리리공', ['electric'], 'common', null, [101], 30, '몬스터볼로 위장하는 포켓몬'],
  [101, '붐볼', ['electric'], 'uncommon', 100, [], undefined, '작은 자극에도 폭발한다'],
  [102, '아라리', ['grass', 'psychic'], 'common', null, [103], undefined, '6개의 알이 모여 하나가 된다'],
  [103, '나시', ['grass', 'psychic'], 'uncommon', 102, [], undefined, '3개의 머리가 각자 생각한다'],
  [104, '탕구리', ['ground'], 'common', null, [105], 28, '엄마의 뼈를 들고 다닌다'],
  [105, '텅구리', ['ground'], 'uncommon', 104, [], undefined, '뼈를 부메랑처럼 던진다'],
  [106, '시라소몬', ['fighting'], 'rare', null, [], undefined, '다리가 자유자재로 늘어난다'],
  [107, '홍수몬', ['fighting'], 'rare', null, [], undefined, '빛보다 빠른 펀치를 날린다'],
  [108, '내루미', ['normal'], 'uncommon', null, [], undefined, '2m나 되는 혀로 핥는다'],
  [109, '또가스', ['poison'], 'common', null, [110], 35, '독가스를 내뿜는 포켓몬'],
  [110, '또도가스', ['poison'], 'uncommon', 109, [], undefined, '2개의 몸에서 독가스를 내뿜는다'],
  [111, '뿔카노', ['ground', 'rock'], 'common', null, [112], 42, '달리면 멈출 수 없다'],
  [112, '코뿌리', ['ground', 'rock'], 'uncommon', 111, [], undefined, '뿔로 다이아몬드도 뚫는다'],
  [113, '럭키', ['normal'], 'rare', null, [], undefined, '알을 나눠주는 행복의 포켓몬'],
  [114, '덩쿠리', ['grass'], 'uncommon', null, [], undefined, '덩굴로 뒤덮인 수수께끼의 포켓몬'],
  [115, '캥카', ['normal'], 'rare', null, [], undefined, '주머니에서 새끼를 키운다'],
  [116, '쏘드라', ['water'], 'common', null, [117], 32, '입에서 먹물을 뿜는다'],
  [117, '시드라', ['water'], 'uncommon', 116, [], undefined, '가시에 독이 있어 만지면 기절한다'],
  [118, '콘치', ['water'], 'common', null, [119], 33, '우아하게 헤엄치는 금붕어 포켓몬'],
  [119, '왕콘치', ['water'], 'uncommon', 118, [], undefined, '뿔로 바위를 뚫는다'],
  [120, '별가사리', ['water'], 'common', null, [121], undefined, '중심의 코어가 붉게 빛난다'],
  [121, '아쿠스타', ['water', 'psychic'], 'uncommon', 120, [], undefined, '코어에서 신비한 빛을 발산한다'],
  [122, '마임맨', ['psychic', 'fairy'], 'rare', null, [], undefined, '투명한 벽을 만드는 마임 포켓몬'],
  [123, '스라크', ['bug', 'flying'], 'rare', null, [], undefined, '양팔의 낫으로 풀을 베어 넘긴다'],
  [124, '루주라', ['ice', 'psychic'], 'rare', null, [], undefined, '춤추듯이 걷는 인간형 포켓몬'],
  [125, '에레브', ['electric'], 'rare', null, [], undefined, '발전소에서 전기를 먹는다'],
  [126, '마그마', ['fire'], 'rare', null, [], undefined, '1200도의 화염을 내뿜는다'],
  [127, '쁘사이저', ['bug'], 'rare', null, [], undefined, '뿔의 집게로 적을 조인다'],
  [128, '켄타로스', ['normal'], 'rare', null, [], undefined, '3개의 꼬리로 몸에 채찍질한다'],
  [129, '잉어킹', ['water'], 'common', null, [130], 20, '튀어오르는 것밖에 할 줄 모른다'],
  [130, '갸라도스', ['water', 'flying'], 'epic', 129, [], undefined, '도시 하나를 파괴하는 포켓몬'],
  [131, '라프라스', ['water', 'ice'], 'epic', null, [], undefined, '사람을 등에 태워 바다를 건넌다'],
  [132, '메타몽', ['normal'], 'rare', null, [], undefined, '무엇이든 변신할 수 있다'],
  [133, '이브이', ['normal'], 'rare', null, [134, 135, 136], undefined, '불안정한 유전자의 진화 포켓몬'],
  [134, '샤미드', ['water'], 'rare', 133, [], undefined, '세포가 물 분자와 닮은 포켓몬'],
  [135, '쥬피썬더', ['electric'], 'rare', 133, [], undefined, '온몸의 털이 전기를 띤다'],
  [136, '부스터', ['fire'], 'rare', 133, [], undefined, '체내에서 1700도의 불꽃을 만든다'],
  [137, '폴리곤', ['normal'], 'rare', null, [], undefined, '프로그래밍으로 만들어진 포켓몬'],
  [138, '암나이트', ['rock', 'water'], 'rare', null, [139], 40, '고대의 바다에 살던 화석 포켓몬'],
  [139, '암스타', ['rock', 'water'], 'epic', 138, [], undefined, '촉수로 먹이를 붙잡는다'],
  [140, '투구', ['rock', 'water'], 'rare', null, [141], 40, '3억 년 전부터 살아온 포켓몬'],
  [141, '투구푸스', ['rock', 'water'], 'epic', 140, [], undefined, '날카로운 낫으로 사냥한다'],
  [142, '프테라', ['rock', 'flying'], 'epic', null, [], undefined, '호박에서 부활한 공룡 포켓몬'],
  [143, '잠만보', ['normal'], 'epic', null, [], undefined, '하루에 400kg의 음식을 먹는다'],
  [144, '프리져', ['ice', 'flying'], 'legendary', null, [], undefined, '눈보라를 일으키는 전설의 새'],
  [145, '썬더', ['electric', 'flying'], 'legendary', null, [], undefined, '번개 구름 속에 사는 전설의 새'],
  [146, '파이어', ['fire', 'flying'], 'legendary', null, [], undefined, '불꽃을 휘날리며 나는 전설의 새'],
  [147, '미뇽', ['dragon'], 'rare', null, [148], 30, '바다에서 발견되는 신비한 포켓몬'],
  [148, '신뇽', ['dragon'], 'rare', 147, [149], 55, '날씨를 바꾸는 힘을 가졌다'],
  [149, '망나뇽', ['dragon', 'flying'], 'epic', 148, [], undefined, '16시간 만에 지구를 한 바퀴 돈다'],
  [150, '뮤츠', ['psychic'], 'legendary', null, [], undefined, '유전자 조작으로 태어난 최강의 포켓몬'],
  [151, '뮤', ['psychic'], 'legendary', null, [], undefined, '모든 포켓몬의 유전자를 가지고 있다'],
];

// ─── Base Stats (151종 공식 데이터) ────────────────────────
// Format: [hp, atk, def, spAtk, spDef, spd]
const BASE_STATS_DATA: Record<number, [number, number, number, number, number, number]> = {
  1: [45,49,49,65,65,45], 2: [60,62,63,80,80,60], 3: [80,82,83,100,100,80],
  4: [39,52,43,60,50,65], 5: [58,64,58,80,65,80], 6: [78,84,78,109,85,100],
  7: [44,48,65,50,64,43], 8: [59,63,80,65,80,58], 9: [79,83,100,85,105,78],
  10: [45,52,43,60,50,65], 11: [50,65,55,90,55,90], 12: [60,55,62,90,80,95],
  13: [40,65,43,50,50,80], 14: [45,63,48,60,55,95], 15: [65,90,40,45,80,75],
  16: [40,60,55,40,35,35], 17: [63,60,55,50,50,71], 18: [83,100,75,70,70,101],
  19: [30,56,35,25,35,72], 20: [55,81,60,50,70,97],
  21: [40,60,30,31,31,70], 22: [65,100,55,61,61,100],
  23: [35,60,44,40,54,55], 24: [60,85,69,65,79,80],
  25: [35,55,40,50,50,90], 26: [60,90,55,90,80,100],
  27: [50,75,60,30,30,40], 28: [75,100,85,55,55,65],
  29: [55,47,52,40,40,41], 30: [70,62,67,55,55,56],
  31: [90,92,87,75,85,76], 32: [46,57,40,40,40,50],
  33: [61,72,55,55,55,65], 34: [81,102,77,85,75,85],
  35: [35,20,65,25,35,55], 36: [55,40,85,40,55,65],
  37: [38,41,40,50,65,65], 38: [73,76,75,81,100,100],
  39: [115,45,20,45,25,20], 40: [140,70,45,85,50,45],
  41: [40,45,35,30,40,55], 42: [75,80,75,65,75,90],
  43: [45,50,55,75,65,30], 44: [60,65,70,85,75,40],
  45: [75,80,85,110,90,55], 46: [35,80,35,30,30,25],
  47: [60,95,60,60,60,30], 48: [35,48,35,40,40,45],
  49: [60,73,60,77,60,90], 50: [35,40,60,30,55,40],
  51: [60,80,90,50,80,120], 52: [40,45,35,40,40,90],
  53: [65,70,60,65,65,115], 54: [50,48,48,65,50,55],
  55: [80,78,78,95,80,85], 56: [40,80,35,35,35,35],
  57: [65,105,60,60,60,80], 58: [55,70,43,70,50,60],
  59: [90,110,80,100,80,100], 60: [40,50,40,40,40,90],
  61: [65,65,65,65,65,90], 62: [90,95,95,100,90,70],
  63: [25,20,20,105,35,95], 64: [40,35,30,120,70,105],
  65: [60,55,65,135,95,120], 66: [40,80,35,50,35,35],
  67: [60,100,62,65,65,55], 68: [80,130,80,65,85,55],
  69: [35,55,40,65,60,40], 70: [50,75,50,80,70,60],
  71: [80,105,65,100,90,70], 72: [40,40,35,50,100,70],
  73: [80,70,65,80,120,100], 74: [40,80,100,30,30,20],
  75: [55,95,115,45,45,35], 76: [80,120,130,55,65,45],
  77: [50,85,55,65,65,90], 78: [65,100,70,80,80,105],
  79: [90,65,65,40,40,15], 80: [95,75,78,60,80,30],
  81: [25,35,70,95,55,45], 82: [50,60,95,120,70,70],
  83: [52,65,66,58,62,60], 84: [35,40,100,40,80,55],
  85: [60,70,120,60,100,120], 86: [35,48,48,60,50,35],
  87: [70,80,70,70,80,70], 88: [80,100,50,100,50,30],
  89: [80,105,75,100,75,50], 90: [30,65,100,45,25,40],
  91: [50,95,180,85,45,70], 92: [30,35,30,100,35,80],
  93: [45,50,45,115,55,95], 94: [60,65,60,130,75,110],
  95: [35,45,160,30,45,70], 96: [60,48,45,43,90,42],
  97: [85,73,70,73,115,67], 98: [30,105,90,25,25,50],
  99: [55,130,115,50,50,60], 100: [20,40,100,50,50,100],
  101: [60,80,120,80,80,150], 102: [45,49,49,65,65,45],
  103: [60,95,85,125,75,55], 104: [50,75,95,30,30,40],
  105: [75,100,95,50,60,65], 106: [50,120,53,35,110,87],
  107: [50,105,79,35,110,76], 108: [90,55,75,60,75,30],
  109: [40,65,95,60,75,35], 110: [65,90,120,85,100,60],
  111: [81,120,102,65,45,40], 112: [100,145,130,55,55,40],
  113: [250,5,5,35,105,30], 114: [65,100,63,100,70,60],
  115: [105,95,80,40,80,90], 116: [45,67,60,64,58,32],
  117: [65,95,95,95,79,42], 118: [33,61,35,61,37,63],
  119: [80,92,65,65,80,93], 120: [30,45,55,70,55,85],
  121: [60,75,85,100,85,115], 122: [70,45,80,100,90,100],
  123: [70,110,80,55,80,105], 124: [65,50,35,115,95,95],
  125: [65,83,57,95,85,105], 126: [65,95,57,100,85,93],
  127: [65,125,100,55,70,65], 128: [100,100,95,40,70,111],
  129: [20,10,55,15,20,80], 130: [95,125,79,60,100,81],
  131: [130,85,80,85,95,60], 132: [48,48,48,48,48,48],
  133: [55,55,50,45,65,55], 134: [65,60,70,110,95,65],
  135: [65,65,60,110,95,130], 136: [65,130,60,95,110,65],
  137: [40,60,70,85,75,40], 138: [35,40,100,90,55,35],
  139: [60,65,125,115,70,55], 140: [30,85,65,55,55,55],
  141: [60,115,105,65,85,75], 142: [80,105,65,60,100,130],
  143: [250,10,65,10,75,30], 144: [90,100,73,85,95,85],
  145: [90,100,73,125,100,111], 146: [90,100,90,125,85,100],
  147: [41,64,45,72,55,50], 148: [61,84,65,92,75,70],
  149: [91,134,95,100,100,80], 150: [106,110,90,154,90,130],
  151: [100,100,100,100,100,100],
};

// ─── Learnset (151종 포켓몬별 기술) ────────────────────────
const LEARNSET_DATA: Record<number, string[]> = {
  1: ['tackle','growl','razorleaf','vinewhip'],
  2: ['tackle','growl','razorleaf','vinewhip'],
  3: ['tackle','growl','razorleaf','vinewhip'],
  4: ['scratch','growl','ember','smokescreen'],
  5: ['scratch','growl','ember','smokescreen'],
  6: ['scratch','growl','ember','smokescreen'],
  7: ['tackle','withdraw','watergun','bubblebeam'],
  8: ['tackle','withdraw','watergun','bubblebeam'],
  9: ['tackle','withdraw','watergun','bubblebeam'],
  10: ['tackle','stringshot'],
  11: ['tackle','stringshot'],
  12: ['tackle','stringshot','confusion','psybeam'],
  13: ['poisonpowder','tackle'],
  14: ['poisonpowder','harden'],
  15: ['poisonpowder','harden','peck','doubleedge'],
  16: ['peck','sandattack'],
  17: ['peck','sandattack','wingattack'],
  18: ['peck','sandattack','wingattack'],
  19: ['tackle','tailwhip'],
  20: ['tackle','tailwhip'],
  21: ['peck','growl'],
  22: ['peck','growl','bravebird'],
  23: ['wrap','bite','acid'],
  24: ['wrap','bite','acid'],
  25: ['thunderbolt','thunder','thunderwave'],
  26: ['thunderbolt','thunder','thunderwave'],
  27: ['scratch','defensecurl','sandattack','earthquake'],
  28: ['scratch','defensecurl','sandattack','earthquake'],
  29: ['scratch','tailwhip','poisonpowder'],
  30: ['scratch','tailwhip','poisonpowder'],
  31: ['scratch','tailwhip','poisonpowder'],
  32: ['scratch','leer','poisonpowder'],
  33: ['scratch','leer','poisonpowder'],
  34: ['scratch','leer','poisonpowder'],
  35: ['pound','sing','minimize'],
  36: ['pound','sing','minimize'],
  37: ['ember','tailwhip','roar'],
  38: ['ember','tailwhip','roar'],
  39: ['pound','sing','growl'],
  40: ['pound','sing','growl'],
  41: ['bite','astonish'],
  42: ['bite','astonish'],
  43: ['absorb','poisonpowder','sleeppowder'],
  44: ['absorb','poisonpowder','sleeppowder'],
  45: ['absorb','poisonpowder','sleeppowder'],
  46: ['scratch','spore','leechlife'],
  47: ['scratch','spore','leechlife'],
  48: ['tackle','disable','confusion'],
  49: ['tackle','disable','confusion'],
  50: ['scratch','growl','magnitude'],
  51: ['scratch','growl','magnitude'],
  52: ['scratch','growl','bite'],
  53: ['scratch','growl','bite'],
  54: ['scratch','tailwhip','watergun'],
  55: ['scratch','tailwhip','watergun'],
  56: ['scratch','lowkick'],
  57: ['scratch','lowkick'],
  58: ['bite','ember','roar'],
  59: ['bite','ember','roar'],
  60: ['bubble','watergun'],
  61: ['bubble','watergun'],
  62: ['bubble','watergun'],
  63: ['confusion','psychic'],
  64: ['confusion','psychic'],
  65: ['confusion','psychic'],
  66: ['lowkick','focus'],
  67: ['lowkick','focus'],
  68: ['lowkick','focus'],
  69: ['absorb','vinewhip'],
  70: ['absorb','vinewhip'],
  71: ['absorb','vinewhip'],
  72: ['bubblebeam','acid'],
  73: ['bubblebeam','acid'],
  74: ['tackle','rockthrow'],
  75: ['tackle','rockthrow'],
  76: ['tackle','rockthrow','earthquake'],
  77: ['ember','tailwhip'],
  78: ['ember','tailwhip'],
  79: ['watergun','confusion'],
  80: ['watergun','confusion'],
  81: ['spark','thunderbolt'],
  82: ['spark','thunderbolt'],
  83: ['peck','bravebird'],
  84: ['peck','fury'],
  85: ['peck','fury'],
  86: ['icebeam','aurora'],
  87: ['icebeam','aurora'],
  88: ['sludge','bite'],
  89: ['sludge','bite'],
  90: ['watergun','icebeam'],
  91: ['watergun','icebeam'],
  92: ['astonish','shadowball'],
  93: ['astonish','shadowball'],
  94: ['astonish','shadowball','psychic'],
  95: ['tackle','rockthrow'],
  96: ['confusion','psychic'],
  97: ['confusion','psychic'],
  98: ['bubble','vicegrip'],
  99: ['bubble','vicegrip'],
  100: ['tackle','spark'],
  101: ['tackle','spark','discharge'],
  102: ['barrage','leechseed'],
  103: ['barrage','leechseed','psychic'],
  104: ['boneclub','earthquake'],
  105: ['boneclub','earthquake'],
  106: ['lowkick','highjumpkick'],
  107: ['punch','machpunch'],
  108: ['lick','bodypress'],
  109: ['sludge','smokescreen'],
  110: ['sludge','smokescreen'],
  111: ['stomp','earthquake'],
  112: ['stomp','earthquake'],
  113: ['pound','sing'],
  114: ['vinewhip','sleeppowder'],
  115: ['outrage','fury'],
  116: ['bubble','watergun'],
  117: ['bubble','watergun'],
  118: ['peck','watergun'],
  119: ['peck','watergun'],
  120: ['tackle','watergun'],
  121: ['tackle','watergun','psychic'],
  122: ['barrier','confusion','psychic'],
  123: ['quickattack','swordsdance'],
  124: ['icebeam','psychic'],
  125: ['thunderbolt','thunderwave'],
  126: ['ember','fireblast'],
  127: ['fury','bite'],
  128: ['fury','doubleedge'],
  129: ['splash','tackle'],
  130: ['tackle','watergun','bite'],
  131: ['watergun','icebeam'],
  132: ['tackle'],
  133: ['tackle','growl'],
  134: ['watergun','icebeam'],
  135: ['thunderbolt','thunder'],
  136: ['ember','fireblast'],
  137: ['tackle','psybeam'],
  138: ['watergun','rockthrow'],
  139: ['watergun','rockthrow'],
  140: ['scratch','rockthrow'],
  141: ['scratch','rockthrow'],
  142: ['bite','rockslide'],
  143: ['bodypress','rest'],
  144: ['icebeam','icywind'],
  145: ['thunder','discharge'],
  146: ['fireblast','overheat'],
  147: ['dragonrage','wrap'],
  148: ['dragonrage','wrap'],
  149: ['dragonrage','outrage'],
  150: ['psychic','shadowball'],
  151: ['psychic','confusion'],
};

// Build the registry
const POKEMON_MAP = new Map<number, PokemonSpecies>();
const POKEMON_LIST: PokemonSpecies[] = [];

for (const [id, name, types, rarity, evolveFrom, evolveTo, evolveLevel, description] of RAW_DATA) {
  const stats = BASE_STATS_DATA[id] || [50,50,50,50,50,50];
  const species: PokemonSpecies = {
    id,
    name,
    types,
    rarity,
    evolveFrom,
    evolveTo,
    evolveLevel,
    spriteUrl: sprite(id),
    description: description || '',
    baseStats: {
      hp: stats[0],
      atk: stats[1],
      def: stats[2],
      spAtk: stats[3],
      spDef: stats[4],
      spd: stats[5],
    },
    learnset: LEARNSET_DATA[id] || ['tackle'],
  };
  POKEMON_MAP.set(id, species);
  POKEMON_LIST.push(species);
}

export function getPokemonById(id: number): PokemonSpecies | undefined {
  return POKEMON_MAP.get(id);
}

export function getAllPokemon(): PokemonSpecies[] {
  return POKEMON_LIST;
}

export function getPokemonByRarity(rarity: Rarity): PokemonSpecies[] {
  return POKEMON_LIST.filter(p => p.rarity === rarity);
}

export function getPokemonByType(type: PokemonType): PokemonSpecies[] {
  return POKEMON_LIST.filter(p => p.types.includes(type));
}

export function getEvolutionChain(id: number): PokemonSpecies[] {
  const chain: PokemonSpecies[] = [];
  // Find root
  let current = POKEMON_MAP.get(id);
  while (current?.evolveFrom) {
    current = POKEMON_MAP.get(current.evolveFrom);
  }
  // Build chain
  if (current) {
    chain.push(current);
    const queue = [...current.evolveTo];
    while (queue.length > 0) {
      const nextId = queue.shift()!;
      const next = POKEMON_MAP.get(nextId);
      if (next) {
        chain.push(next);
        queue.push(...next.evolveTo);
      }
    }
  }
  return chain;
}

// Rarity config
export const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bgColor: string; emoji: string }> = {
  common: { label: '커먼', color: 'text-muted-foreground', bgColor: 'bg-muted', emoji: '⚪' },
  uncommon: { label: '언커먼', color: 'text-green', bgColor: 'bg-green/10', emoji: '🟢' },
  rare: { label: '레어', color: 'text-blue-400', bgColor: 'bg-blue-400/10', emoji: '🔵' },
  epic: { label: '에픽', color: 'text-purple-400', bgColor: 'bg-purple-400/10', emoji: '🟣' },
  legendary: { label: '레전더리', color: 'text-amber', bgColor: 'bg-amber/10', emoji: '🌟' },
};

export const TYPE_CONFIG: Record<PokemonType, { label: string; color: string; emoji: string }> = {
  normal: { label: '노말', color: 'bg-gray-400', emoji: '⚪' },
  fire: { label: '불꽃', color: 'bg-orange-500', emoji: '🔥' },
  water: { label: '물', color: 'bg-blue-500', emoji: '💧' },
  grass: { label: '풀', color: 'bg-green-500', emoji: '🌿' },
  electric: { label: '전기', color: 'bg-yellow-400', emoji: '⚡' },
  ice: { label: '얼음', color: 'bg-cyan-300', emoji: '❄️' },
  fighting: { label: '격투', color: 'bg-red-700', emoji: '🥊' },
  poison: { label: '독', color: 'bg-purple-500', emoji: '☠️' },
  ground: { label: '땅', color: 'bg-amber-700', emoji: '🏔️' },
  flying: { label: '비행', color: 'bg-indigo-300', emoji: '🕊️' },
  psychic: { label: '에스퍼', color: 'bg-pink-500', emoji: '🔮' },
  bug: { label: '벌레', color: 'bg-lime-500', emoji: '🐛' },
  rock: { label: '바위', color: 'bg-stone-500', emoji: '🪨' },
  ghost: { label: '고스트', color: 'bg-purple-800', emoji: '👻' },
  dragon: { label: '드래곤', color: 'bg-indigo-700', emoji: '🐉' },
  fairy: { label: '페어리', color: 'bg-pink-300', emoji: '✨' },
};
