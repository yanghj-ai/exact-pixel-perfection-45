import { motion } from 'framer-motion';
import type { PetState, PokemonStage } from '@/lib/pet';
import { getRequiredExp } from '@/lib/pet';
import type { OwnedPokemon } from '@/lib/collection';
import type { PokemonSpecies } from '@/lib/pokemon-registry';
import { getMoodEmoji, getMoodDialogue, type PokemonMood } from '@/lib/pokemon-bond';
import { getConditionEmoji, getConditionLabel, type ConditionLevel } from '@/lib/pokemon-condition';
import PetSprite from '@/components/PetSprite';

interface PetCardProps {
  pet: PetState;
  leadPokemon: OwnedPokemon | undefined;
  leadSpecies: PokemonSpecies | undefined;
  dialogue: string;
  mood: PokemonMood;
  condition: number;
  conditionLevel: ConditionLevel;
  friendship: number;
  onDialogueChange: (d: string) => void;
}

export default function PetCard({ pet, leadPokemon, leadSpecies, dialogue, mood, condition, conditionLevel, friendship, onDialogueChange }: PetCardProps) {
  const requiredExp = getRequiredExp(pet.level);
  const expProgress = (pet.exp / requiredExp) * 100;

  const conditionColor = condition >= 80
    ? 'hsl(var(--heal-green))'
    : condition >= 60
      ? 'hsl(var(--secondary))'
      : condition >= 40
        ? 'hsl(var(--amber))'
        : 'hsl(var(--destructive))';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card mb-4 relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full gradient-primary opacity-[0.07] blur-2xl" />
      </div>

      {/* Name & Level header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            {leadPokemon?.nickname || leadSpecies?.name || pet.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">Lv.{pet.level}</span>
          <span className="text-sm">{getMoodEmoji(mood)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>💕</span>
          <span>{friendship}/255</span>
        </div>
      </div>

      {/* Pet Sprite Arena */}
      <div className="relative h-48 flex items-center justify-center">
        {leadSpecies ? (
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            onClick={() => onDialogueChange(getMoodDialogue(mood))}
            className="cursor-pointer"
          >
            <img
              src={leadSpecies.spriteUrl}
              alt={leadSpecies.name}
              className="w-32 h-32 object-contain"
              style={{
                imageRendering: 'pixelated',
                filter: conditionLevel === 'exhausted'
                  ? 'grayscale(0.6) brightness(0.7)'
                  : conditionLevel === 'tired'
                    ? 'brightness(0.85)'
                    : conditionLevel === 'perfect'
                      ? 'drop-shadow(0 0 12px hsl(18 100% 60% / 0.5)) brightness(1.1)'
                      : 'drop-shadow(0 4px 16px hsl(18 100% 60% / 0.4))',
              }}
            />
          </motion.div>
        ) : (
          <PetSprite
            stage={pet.stage as PokemonStage}
            hp={condition}
            maxHp={100}
            happiness={Math.min(5, Math.floor(condition / 20))}
            streak={0}
            size="normal"
            onTap={() => onDialogueChange(getMoodDialogue(mood))}
          />
        )}
      </div>

      {/* Condition & EXP bars */}
      <div className="px-5 pb-2 space-y-1.5">
        {/* Condition bar */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              {getConditionEmoji(conditionLevel)} 컨디션
              <span className="text-[9px] px-1 py-0.5 rounded bg-muted">{getConditionLabel(conditionLevel)}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">{condition}/100</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: conditionColor }}
              initial={false}
              animate={{ width: `${condition}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* EXP bar */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground font-medium">EXP</span>
            <span className="text-[10px] text-muted-foreground">{pet.exp}/{requiredExp}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${Math.min(100, expProgress)}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Dialogue bubble */}
      <motion.div key={dialogue} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mb-4 p-2.5 rounded-xl bg-muted/50 border border-border/30">
        <p className="text-xs text-foreground text-center">{dialogue}</p>
      </motion.div>
    </motion.div>
  );
}
