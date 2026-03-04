import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import type { PetState, PokemonStage } from '@/lib/pet';
import { getRequiredExp, getRandomDialogue } from '@/lib/pet';
import { interactWithPokemon, type OwnedPokemon } from '@/lib/collection';
import { getPokemonById, type PokemonSpecies } from '@/lib/pokemon-registry';
import type { RunningStats } from '@/lib/running';
import PetSprite from '@/components/PetSprite';
import { toast } from 'sonner';

interface PetCardProps {
  pet: PetState;
  leadPokemon: OwnedPokemon | undefined;
  leadSpecies: PokemonSpecies | undefined;
  dialogue: string;
  runStats: RunningStats;
  onDialogueChange: (d: string) => void;
  onFeed: () => void;
}

export default function PetCard({ pet, leadPokemon, leadSpecies, dialogue, runStats, onDialogueChange, onFeed }: PetCardProps) {
  const requiredExp = getRequiredExp(pet.level);
  const expProgress = (pet.exp / requiredExp) * 100;

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
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Heart size={10} className="text-primary" />
          <span>{leadPokemon ? leadPokemon.friendship : 0}/255</span>
        </div>
      </div>

      {/* Pet Sprite Arena */}
      <div className="relative h-48 flex items-center justify-center">
        {leadSpecies ? (
          <motion.div
            className="cursor-pointer"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            onClick={() => {
              if (leadPokemon) {
                const result = interactWithPokemon(leadPokemon.uid);
                toast(result.message);
              } else {
                onDialogueChange(getRandomDialogue('interact'));
              }
            }}
          >
            <img
              src={leadSpecies.spriteUrl}
              alt={leadSpecies.name}
              className="w-32 h-32 object-contain"
              style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 4px 16px hsl(18 100% 60% / 0.4))' }}
            />
          </motion.div>
        ) : (
          <PetSprite
            stage={pet.stage as PokemonStage}
            hp={pet.hp}
            maxHp={pet.maxHp}
            happiness={pet.happiness}
            streak={runStats.currentStreak}
            size="normal"
            onTap={() => onDialogueChange(getRandomDialogue('interact'))}
            onLongPress={onFeed}
          />
        )}
      </div>

      {/* HP & EXP bars */}
      <div className="px-5 pb-2 space-y-1.5">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground font-medium">HP</span>
            <span className="text-[10px] text-muted-foreground">{pet.hp}/{pet.maxHp}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: pet.hp / pet.maxHp > 0.5 ? 'hsl(var(--heal-green))' : pet.hp / pet.maxHp > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))' }}
              initial={false}
              animate={{ width: `${(pet.hp / pet.maxHp) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
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

      {/* Interaction hint */}
      <div className="text-center pb-3">
        <span className="text-[9px] text-muted-foreground/50">탭하여 교감 · 꾹 눌러 먹이주기</span>
      </div>
    </motion.div>
  );
}
