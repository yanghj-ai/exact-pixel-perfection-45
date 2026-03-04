// FIX #6: 파티 아이템 탭
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { type OwnedPokemon, feedPokemon } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getInventory, useRareCandy, useEvolutionStone } from '@/lib/shop';
import { healSingle } from '@/lib/pokemon-health';
import { getPet } from '@/lib/pet';
import { type ItemEffectData } from '@/components/ItemEffectOverlay';

interface PartyItemTabProps {
  pokemon: OwnedPokemon;
  onItemUsed: (effect: ItemEffectData | null) => void;
  onRefresh: () => void;
}

interface ItemCard {
  id: string;
  name: string;
  emoji: string;
  description: string;
  count: number;
  canUse: boolean;
  onUse: () => void;
}

export default function PartyItemTab({ pokemon, onItemUsed, onRefresh }: PartyItemTabProps) {
  const species = getPokemonById(pokemon.speciesId);
  const inventory = getInventory();
  const pet = getPet();

  if (!species) return null;

  const items: ItemCard[] = [
    {
      id: 'food',
      name: '먹이',
      emoji: '🍎',
      description: '친밀도를 높여줍니다',
      count: pet.foodCount,
      canUse: pet.foodCount > 0,
      onUse: () => {
        const result = feedPokemon(pokemon.uid, pet.foodCount);
        if (result) {
          toast('🍎 먹이를 줬어요!', { description: '친밀도가 올랐습니다!' });
          onRefresh();
        }
      },
    },
    {
      id: 'potion',
      name: '상처약',
      emoji: '💊',
      description: 'HP를 회복합니다',
      count: inventory.items?.potion || 0,
      canUse: (inventory.items?.potion || 0) > 0,
      onUse: () => {
        const healed = healSingle(pokemon.uid);
        if (healed) {
          // Consume potion from inventory
          const inv = getInventory();
          if (inv.items.potion && inv.items.potion > 0) {
            inv.items.potion--;
            localStorage.setItem('routinmon-inventory', JSON.stringify(inv));
          }
          toast('💊 상처약을 사용했어요!');
          onRefresh();
        }
      },
    },
    {
      id: 'rare_candy',
      name: '이상한사탕',
      emoji: '🍬',
      description: '레벨을 1 올려줍니다',
      count: inventory.items?.rare_candy || 0,
      canUse: (inventory.items?.rare_candy || 0) > 0,
      onUse: () => {
        const result = useRareCandy(pokemon.uid, 1);
        if (result?.success) {
          onItemUsed({
            type: result.evolvedSpeciesId ? 'evolution' : 'level_up',
            pokemonUid: pokemon.uid,
            speciesId: result.evolvedSpeciesId || pokemon.speciesId,
            levelBefore: pokemon.level,
            levelAfter: result.newLevel,
            levelsGained: 1,
            prevSpeciesId: result.evolvedSpeciesId ? pokemon.speciesId : undefined,
            newSpeciesId: result.evolvedSpeciesId,
          });
          onRefresh();
        }
      },
    },
    {
      id: 'evolution_stone',
      name: '진화의 돌',
      emoji: '🧬',
      description: '특정 포켓몬을 진화시킵니다',
      count: inventory.items?.evolution_stone || 0,
      canUse: (inventory.items?.evolution_stone || 0) > 0 && species.evolveTo.length > 0,
      onUse: () => {
        const result = useEvolutionStone(pokemon.uid, 'evolution_stone');
        if (result?.success) {
          onItemUsed({
            type: 'evolution',
            pokemonUid: pokemon.uid,
            speciesId: result.evolvedSpeciesId || pokemon.speciesId,
            prevSpeciesId: pokemon.speciesId,
            newSpeciesId: result.evolvedSpeciesId,
          });
          onRefresh();
        } else {
          toast('이 포켓몬에게는 효과가 없어요');
        }
      },
    },
  ];

  return (
    <div className="space-y-2 p-4">
      <p className="text-xs text-muted-foreground mb-3">
        {pokemon.nickname || species.name}에게 아이템을 사용하세요
      </p>
      {items.map((item, i) => (
        <motion.button
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          whileTap={item.canUse ? { scale: 0.97 } : {}}
          onClick={item.canUse ? item.onUse : undefined}
          disabled={!item.canUse}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
            item.canUse
              ? 'border-border/50 bg-card/80 hover:border-primary/30 active:bg-primary/5'
              : 'border-border/20 bg-muted/20 opacity-40'
          }`}
        >
          <span className="text-2xl">{item.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">{item.description}</p>
          </div>
          <span className={`text-xs font-bold ${item.count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
            ×{item.count}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
