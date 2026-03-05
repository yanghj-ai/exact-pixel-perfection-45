import { motion } from 'framer-motion';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import type { OwnedPokemon } from '@/lib/collection';
import { getFriendshipLevel } from '@/lib/collection';
import { getPokemonById, RARITY_CONFIG, TYPE_CONFIG, type PokemonSpecies } from '@/lib/pokemon-registry';
import { getEffectiveHpRatio } from '@/lib/pokemon-health';
import { getConditionState, getConditionLevel, getConditionEmoji, getConditionLabel } from '@/lib/pokemon-condition';
import { getUnlockedMoves } from '@/lib/skill-system';

interface PokemonDetailSheetProps {
  pokemon: OwnedPokemon | undefined;
  species: PokemonSpecies | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PokemonDetailSheet({ pokemon, species, open, onOpenChange }: PokemonDetailSheetProps) {
  if (!pokemon || !species) return null;

  const friendship = getFriendshipLevel(pokemon.friendship);
  const hpRatio = getEffectiveHpRatio(pokemon.uid);
  const condition = getConditionState();
  const condLevel = getConditionLevel(condition.condition);
  const rarity = RARITY_CONFIG[species.rarity];
  const moves = getUnlockedMoves(pokemon.speciesId, pokemon.level);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            <motion.img
              src={species.spriteUrl}
              alt={species.name}
              className="w-16 h-16 object-contain"
              style={{ imageRendering: 'pixelated' }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-base">
                {pokemon.nickname || species.name}
              </DrawerTitle>
              <DrawerDescription className="text-xs flex items-center gap-1.5 flex-wrap">
                <span>Lv.{pokemon.level}</span>
                <span>·</span>
                <span className={rarity.color}>{rarity.label}</span>
                <span>·</span>
                <span>⭐ 리더</span>
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto max-h-[60vh] space-y-3">
          {/* Types */}
          <div className="flex items-center gap-1.5">
            {species.types.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${TYPE_CONFIG[t].color}22`, color: TYPE_CONFIG[t].color }}>
                {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
              </span>
            ))}
          </div>

          {/* Base Stats */}
          <div className="glass-card p-3">
            <p className="text-xs font-bold text-foreground mb-2">기본 스탯</p>
            <div className="space-y-1.5">
              {([
                ['HP', species.baseStats.hp],
                ['공격', species.baseStats.atk],
                ['방어', species.baseStats.def],
                ['특공', species.baseStats.spAtk],
                ['특방', species.baseStats.spDef],
                ['스피드', species.baseStats.spd],
              ] as const).map(([name, val]) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-10">{name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (val / 150) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-foreground w-6 text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card p-2.5 text-center">
              <p className="text-lg font-bold text-foreground">{Math.round(hpRatio * 100)}%</p>
              <p className="text-[9px] text-muted-foreground">체력</p>
            </div>
            <div className="glass-card p-2.5 text-center">
              <p className="text-lg">{getConditionEmoji(condLevel)}</p>
              <p className="text-[9px] text-muted-foreground">{getConditionLabel(condLevel)}</p>
            </div>
            <div className="glass-card p-2.5 text-center">
              <p className="text-lg">{friendship.emoji}</p>
              <p className="text-[9px] text-muted-foreground">{friendship.label}</p>
            </div>
          </div>

          {/* Friendship bar */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">친밀도</span>
              <span className="text-[10px] text-muted-foreground">{pokemon.friendship}/255</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full rounded-full bg-secondary" initial={false} animate={{ width: `${(pokemon.friendship / 255) * 100}%` }} />
            </div>
          </div>

          {/* Moves */}
          {moves.length > 0 && (
            <div className="glass-card p-3">
              <p className="text-xs font-bold text-foreground mb-2">배운 기술 ({moves.length})</p>
              <div className="grid grid-cols-2 gap-1.5">
                {moves.map((m, i) => (
                  <div key={m.name + i} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30">
                    <span className="text-[10px]">{TYPE_CONFIG[m.type]?.emoji || '⚡'}</span>
                    <span className="text-[10px] font-medium text-foreground">{m.name}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto">위력 {m.power}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {species.description && (
            <div className="p-3 rounded-xl bg-muted/20">
              <p className="text-[11px] text-muted-foreground italic">"{species.description}"</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
