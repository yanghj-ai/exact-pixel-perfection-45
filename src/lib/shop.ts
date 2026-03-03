// ═══════════════════════════════════════════════════════════
// 코인 샵 시스템 — 진화의 돌, 레어캔디 등 아이템
// ═══════════════════════════════════════════════════════════

import { getCollection, markAsSeen, type CollectionState } from './collection';
import { getPet, savePet, type PetState } from './pet';
import { getPokemonById } from './pokemon-registry';

// ─── Item definitions ────────────────────────────────────

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  category: 'evolution' | 'boost' | 'food';
  effect: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'rare_candy',
    name: '레어캔디',
    description: '포켓몬의 레벨을 1 올려줍니다',
    price: 50,
    emoji: '🍬',
    category: 'boost',
    effect: 'level_up',
  },
  {
    id: 'rare_candy_5',
    name: '레어캔디 5팩',
    description: '포켓몬의 레벨을 5 올려줍니다',
    price: 200,
    emoji: '🍬✨',
    category: 'boost',
    effect: 'level_up_5',
  },
  {
    id: 'fire_stone',
    name: '불꽃의 돌',
    description: '불꽃 타입 포켓몬을 진화시킵니다',
    price: 300,
    emoji: '🔥💎',
    category: 'evolution',
    effect: 'evolve_fire',
  },
  {
    id: 'water_stone',
    name: '물의 돌',
    description: '물 타입 포켓몬을 진화시킵니다',
    price: 300,
    emoji: '💧💎',
    category: 'evolution',
    effect: 'evolve_water',
  },
  {
    id: 'thunder_stone',
    name: '천둥의 돌',
    description: '전기 타입 포켓몬을 진화시킵니다',
    price: 300,
    emoji: '⚡💎',
    category: 'evolution',
    effect: 'evolve_electric',
  },
  {
    id: 'leaf_stone',
    name: '리프의 돌',
    description: '풀 타입 포켓몬을 진화시킵니다',
    price: 300,
    emoji: '🌿💎',
    category: 'evolution',
    effect: 'evolve_grass',
  },
  {
    id: 'moon_stone',
    name: '달의 돌',
    description: '특정 포켓몬을 진화시킵니다',
    price: 500,
    emoji: '🌙💎',
    category: 'evolution',
    effect: 'evolve_moon',
  },
  {
    id: 'super_food',
    name: '고급 포켓몬 사료',
    description: '먹이 3개를 획득합니다',
    price: 30,
    emoji: '🍎',
    category: 'food',
    effect: 'food_3',
  },
  {
    id: 'premium_food',
    name: '프리미엄 사료 팩',
    description: '먹이 10개를 획득합니다',
    price: 80,
    emoji: '🍎✨',
    category: 'food',
    effect: 'food_10',
  },
];

// ─── Inventory ───────────────────────────────────────────

const INVENTORY_KEY = 'routinmon-inventory';

export interface Inventory {
  items: Record<string, number>; // itemId -> count
}

export function getInventory(): Inventory {
  const data = localStorage.getItem(INVENTORY_KEY);
  return data ? JSON.parse(data) : { items: {} };
}

function saveInventory(inv: Inventory) {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
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
  col.coins -= item.price;
  localStorage.setItem('routinmon-collection', JSON.stringify(col));

  // Apply effect immediately for consumables, or add to inventory
  if (item.effect === 'food_3' || item.effect === 'food_10') {
    const amount = item.effect === 'food_3' ? 3 : 10;
    const pet = getPet();
    savePet({ foodCount: pet.foodCount + amount });
    return { success: true, message: `먹이 ${amount}개를 획득했습니다! 🍎` };
  }

  // Store in inventory for later use
  const inv = getInventory();
  inv.items[itemId] = (inv.items[itemId] || 0) + 1;
  saveInventory(inv);
  return { success: true, message: `${item.name}을(를) 구매했습니다!` };
}

// ─── Use Item on Pokemon ─────────────────────────────────

export function useRareCandy(pokemonUid: string, amount: number = 1): { success: boolean; message: string; newLevel?: number } {
  const inv = getInventory();
  const itemId = amount >= 5 ? 'rare_candy_5' : 'rare_candy';
  const count = inv.items[itemId] || 0;
  if (count <= 0) return { success: false, message: '레어캔디가 없습니다!' };

  const col = getCollection();
  const pokemon = col.owned.find(p => p.uid === pokemonUid);
  if (!pokemon) return { success: false, message: '포켓몬을 찾을 수 없습니다' };

  const levelGain = amount >= 5 ? 5 : 1;
  pokemon.level += levelGain;
  localStorage.setItem('routinmon-collection', JSON.stringify(col));

  inv.items[itemId] = count - 1;
  if (inv.items[itemId] <= 0) delete inv.items[itemId];
  saveInventory(inv);

  const species = getPokemonById(pokemon.speciesId);
  return {
    success: true,
    message: `${pokemon.nickname || species?.name}의 레벨이 ${pokemon.level}(으)로 올랐습니다! 🎉`,
    newLevel: pokemon.level,
  };
}

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

  // Map stone effect to required type for evolution
  const STONE_TYPE_MAP: Record<string, string> = {
    evolve_fire: 'fire',
    evolve_water: 'water',
    evolve_electric: 'electric',
    evolve_grass: 'grass',
    evolve_moon: 'moon', // special
  };

  const requiredType = STONE_TYPE_MAP[item.effect];

  // Find the correct evolution target based on stone type
  let evolvedId: number | null = null;

  if (species.evolveTo.length === 1) {
    // Single evolution path - check if stone type matches pokemon or evolution type
    const evoSpecies = getPokemonById(species.evolveTo[0]);
    if (evoSpecies) {
      const matchesType = evoSpecies.types.includes(requiredType as any) ||
                         species.types.includes(requiredType as any) ||
                         requiredType === 'moon'; // moon stone is universal
      if (matchesType) {
        evolvedId = species.evolveTo[0];
      }
    }
  } else {
    // Multiple evolution paths (e.g., Eevee) - find the one matching the stone type
    for (const evoId of species.evolveTo) {
      const evoSpecies = getPokemonById(evoId);
      if (evoSpecies && evoSpecies.types.includes(requiredType as any)) {
        evolvedId = evoId;
        break;
      }
    }
    // Moon stone: pick first available evolution if no type match
    if (!evolvedId && requiredType === 'moon') {
      evolvedId = species.evolveTo[0];
    }
  }

  if (!evolvedId) {
    return { success: false, message: `이 포켓몬에게는 ${item.name}을(를) 사용할 수 없습니다!` };
  }

  const evolvedSpecies = getPokemonById(evolvedId);
  if (!evolvedSpecies) return { success: false, message: '진화 대상을 찾을 수 없습니다' };

  // Evolve!
  pokemon.speciesId = evolvedId;
  // Auto-register evolved species in pokedex
  markAsSeen([evolvedId]);
  localStorage.setItem('routinmon-collection', JSON.stringify(col));

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
