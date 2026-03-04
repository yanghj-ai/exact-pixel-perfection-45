// ═══════════════════════════════════════════════════════════
// 상점 시스템 — 진화의 돌 5종 전용
// 코인은 러닝으로만 획득. 상점에서는 진화의 돌만 판매.
// ═══════════════════════════════════════════════════════════

import { getCollection, addCoins, markAsSeen } from './collection';
import { getPokemonById } from './pokemon-registry';
import { getCachedInventory, setCachedInventory, setCachedCollection, syncOwnedPokemonToDB, isCloudReady } from './cloud-storage';

// ─── Item definitions ────────────────────────────────────

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  category: 'evolution';
  effect: string;
  /** 진화 가능 포켓몬 목록 (표시용) */
  targets: string;
  /** 진화 결과 (표시용) */
  results: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'fire_stone',
    name: '불꽃의 돌',
    description: '불꽃 타입 포켓몬을 진화시킵니다',
    price: 500,
    emoji: '🔥💎',
    category: 'evolution',
    effect: 'evolve_fire',
    targets: '이브이, 가디, 식스테일',
    results: '부스터, 윈디, 나인테일',
  },
  {
    id: 'water_stone',
    name: '물의 돌',
    description: '물 타입 포켓몬을 진화시킵니다',
    price: 500,
    emoji: '💧💎',
    category: 'evolution',
    effect: 'evolve_water',
    targets: '이브이, 슈륙챙이, 셀러, 별가사리',
    results: '샤미드, 강챙이, 파르셀, 아쿠스타',
  },
  {
    id: 'thunder_stone',
    name: '천둥의 돌',
    description: '전기 타입 포켓몬을 진화시킵니다',
    price: 500,
    emoji: '⚡💎',
    category: 'evolution',
    effect: 'evolve_electric',
    targets: '이브이, 피카츄',
    results: '쥬피썬더, 라이츄',
  },
  {
    id: 'leaf_stone',
    name: '리프의 돌',
    description: '풀 타입 포켓몬을 진화시킵니다',
    price: 500,
    emoji: '🌿💎',
    category: 'evolution',
    effect: 'evolve_grass',
    targets: '냄새꼬, 우츠동, 아라리',
    results: '라플레시아, 우츠보트, 나시',
  },
  {
    id: 'moon_stone',
    name: '달의 돌',
    description: '특정 포켓몬을 진화시킵니다',
    price: 800,
    emoji: '🌙💎',
    category: 'evolution',
    effect: 'evolve_moon',
    targets: '삐삐, 푸린, 니드리나, 니드리노',
    results: '픽시, 푸크린, 니드퀸, 니드킹',
  },
];

// ─── Inventory ───────────────────────────────────────────

const INVENTORY_KEY = 'routinmon-inventory';

export interface Inventory {
  items: Record<string, number>; // itemId -> count
}

export function getInventory(): Inventory {
  if (isCloudReady()) {
    const cached = getCachedInventory();
    if (cached) return cached;
  }
  const data = localStorage.getItem(INVENTORY_KEY);
  return data ? JSON.parse(data) : { items: {} };
}

function saveInventory(inv: Inventory) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  if (isCloudReady()) {
    setCachedInventory(inv);
  }
}

/** 아이템을 인벤토리에 직접 추가 (챌린지 보상 등) */
export function addItemToInventory(itemId: string, count: number = 1) {
  const inv = getInventory();
  inv.items[itemId] = (inv.items[itemId] || 0) + count;
  saveInventory(inv);
}

// ─── Coin Earning (러닝 기반) ────────────────────────────

/** 러닝 완료 시 코인 보상 계산 */
export function calculateRunCoins(params: {
  steps: number;
  distanceKm: number;
  streakDays: number;
  isFirstRunToday: boolean;
}): { total: number; breakdown: { label: string; amount: number }[] } {
  const breakdown: { label: string; amount: number }[] = [];

  // 100보당 1코인
  const stepCoins = Math.floor(params.steps / 100);
  if (stepCoins > 0) breakdown.push({ label: '걸음 수 보상', amount: stepCoins });

  // 거리 보너스
  if (params.distanceKm >= 10) {
    breakdown.push({ label: '10km 완주 보너스', amount: 150 });
  } else if (params.distanceKm >= 5) {
    breakdown.push({ label: '5km 완주 보너스', amount: 50 });
  } else if (params.distanceKm >= 1) {
    breakdown.push({ label: '1km 완주 보너스', amount: 10 });
  }

  // 일일 첫 러닝
  if (params.isFirstRunToday) {
    breakdown.push({ label: '일일 첫 러닝', amount: 20 });
  }

  // 스트릭 보너스 (최대 50)
  if (params.streakDays > 0) {
    const streakBonus = Math.min(params.streakDays * 5, 50);
    breakdown.push({ label: `스트릭 ${params.streakDays}일`, amount: streakBonus });
  }

  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  return { total, breakdown };
}

// ─── Purchase ────────────────────────────────────────────

export function purchaseItem(itemId: string): { success: boolean; message: string } {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return { success: false, message: '아이템을 찾을 수 없습니다' };

  const col = getCollection();
  if (col.coins < item.price) {
    return { success: false, message: `코인이 부족합니다! (필요: ${item.price}, 보유: ${col.coins})` };
  }

  // Deduct coins
  addCoins(-item.price);

  // Store in inventory
  const inv = getInventory();
  inv.items[itemId] = (inv.items[itemId] || 0) + 1;
  saveInventory(inv);
  return { success: true, message: `${item.name}을(를) 구매했습니다!` };
}

// ─── Use Evolution Stone on Pokemon ──────────────────────

export function useEvolutionStone(pokemonUid: string, stoneItemId: string): { success: boolean; message: string; evolvedSpeciesId?: number } {
  const inv = getInventory();
  const count = inv.items[stoneItemId] || 0;
  if (count <= 0) return { success: false, message: '진화의 돌이 없습니다!' };

  const item = SHOP_ITEMS.find(i => i.id === stoneItemId);
  if (!item) return { success: false, message: '아이템을 찾을 수 없습니다' };

  const col = getCollection();
  const pokemon = col.owned.find(p => p.uid === pokemonUid);
  if (!pokemon) return { success: false, message: '포켓몬을 찾을 수 없습니다' };

  const species = getPokemonById(pokemon.speciesId);
  if (!species || species.evolveTo.length === 0) {
    return { success: false, message: '이 포켓몬은 더 이상 진화할 수 없습니다!' };
  }

  const STONE_TYPE_MAP: Record<string, string> = {
    evolve_fire: 'fire',
    evolve_water: 'water',
    evolve_electric: 'electric',
    evolve_grass: 'grass',
    evolve_moon: 'moon',
  };

  const requiredType = STONE_TYPE_MAP[item.effect];

  let evolvedId: number | null = null;

  if (species.evolveTo.length === 1) {
    const evoSpecies = getPokemonById(species.evolveTo[0]);
    if (evoSpecies) {
      const matchesType = evoSpecies.types.includes(requiredType as any) ||
                         species.types.includes(requiredType as any) ||
                         requiredType === 'moon';
      if (matchesType) {
        evolvedId = species.evolveTo[0];
      }
    }
  } else {
    for (const evoId of species.evolveTo) {
      const evoSpecies = getPokemonById(evoId);
      if (evoSpecies && evoSpecies.types.includes(requiredType as any)) {
        evolvedId = evoId;
        break;
      }
    }
    if (!evolvedId && requiredType === 'moon') {
      evolvedId = species.evolveTo[0];
    }
  }

  if (!evolvedId) {
    return { success: false, message: `이 포켓몬에게는 ${item.name}을(를) 사용할 수 없습니다!` };
  }

  const evolvedSpecies = getPokemonById(evolvedId);
  if (!evolvedSpecies) return { success: false, message: '진화 대상을 찾을 수 없습니다' };

  pokemon.speciesId = evolvedId;
  markAsSeen([evolvedId]);
  localStorage.setItem('routinmon-collection', JSON.stringify(col));
  if (isCloudReady()) {
    setCachedCollection(col);
    syncOwnedPokemonToDB(col.owned);
  }

  inv.items[stoneItemId] = count - 1;
  if (inv.items[stoneItemId] <= 0) delete inv.items[stoneItemId];
  saveInventory(inv);

  return {
    success: true,
    message: `${species.name}이(가) ${evolvedSpecies.name}(으)로 진화했습니다! ✨`,
    evolvedSpeciesId: evolvedId,
  };
}

export function resetInventory() {
  localStorage.removeItem(INVENTORY_KEY);
}

// ─── Legacy: Rare Candy (backward compat for existing inventory) ──

export function useRareCandy(pokemonUid: string, amount: number = 1): { success: boolean; message: string; newLevel?: number; evolvedSpeciesId?: number } {
  const inv = getInventory();
  const itemId = amount >= 5 ? 'rare_candy_5' : 'rare_candy';
  const count = inv.items[itemId] || 0;
  if (count <= 0) return { success: false, message: '레어캔디가 없습니다!' };

  const col = getCollection();
  const pokemon = col.owned.find(p => p.uid === pokemonUid);
  if (!pokemon) return { success: false, message: '포켓몬을 찾을 수 없습니다' };

  const levelGain = amount >= 5 ? 5 : 1;
  pokemon.level += levelGain;

  let evolvedSpeciesId: number | undefined;
  const species = getPokemonById(pokemon.speciesId);
  if (species && species.evolveTo.length > 0 && species.evolveLevel && pokemon.level >= species.evolveLevel) {
    const nextSpeciesId = species.evolveTo[0];
    pokemon.speciesId = nextSpeciesId;
    evolvedSpeciesId = nextSpeciesId;
    markAsSeen([nextSpeciesId]);
  }

  localStorage.setItem('routinmon-collection', JSON.stringify(col));
  if (isCloudReady()) {
    setCachedCollection(col);
    syncOwnedPokemonToDB(col.owned);
  }

  inv.items[itemId] = count - 1;
  if (inv.items[itemId] <= 0) delete inv.items[itemId];
  saveInventory(inv);

  const currentSpecies = getPokemonById(pokemon.speciesId);
  if (evolvedSpeciesId) {
    return {
      success: true,
      message: `${pokemon.nickname || species?.name}이(가) ${currentSpecies?.name}(으)로 진화했습니다! ✨`,
      newLevel: pokemon.level,
      evolvedSpeciesId,
    };
  }
  return {
    success: true,
    message: `${pokemon.nickname || currentSpecies?.name}의 레벨이 ${pokemon.level}(으)로 올랐습니다! 🎉`,
    newLevel: pokemon.level,
  };
}
