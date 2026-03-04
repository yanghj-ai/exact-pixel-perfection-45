import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Swords } from 'lucide-react';
import { getPokemonById } from '@/lib/pokemon-registry';
import type { LegendaryEncounter } from '@/lib/legendary';
import type { AiNpcTrainer } from '@/lib/npc-encounter';

interface LegendaryBannerProps {
  encounter: LegendaryEncounter;
  progress: number;
  caught: boolean;
}

export function LegendaryBanner({ encounter, progress, caught }: LegendaryBannerProps) {
  const sp = getPokemonById(encounter.definition.speciesId);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className={`glass-card p-4 mb-4 border ${caught ? 'border-secondary/50' : 'border-primary/40'} relative overflow-hidden`}
    >
      {caught && <div className="absolute inset-0 gradient-primary opacity-5" />}
      <div className="flex items-center gap-3">
        <motion.div
          animate={caught ? { scale: [1, 1.2, 1] } : { rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex-shrink-0"
        >
          {sp ? (
            <img src={sp.spriteUrl} alt={sp.name} className="w-14 h-14 object-contain" style={{ imageRendering: 'pixelated' }} />
          ) : (
            <span className="text-3xl">{encounter.definition.emoji}</span>
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={12} className="text-secondary" />
            <span className="text-xs font-bold text-foreground">
              {caught ? `${encounter.definition.name} 포획 완료!` : `${encounter.definition.name} 조우!`}
            </span>
          </div>
          {!caught && (
            <>
              {encounter.definition.storyIntro && !caught && (
                <p className="text-[10px] text-secondary/80 italic mb-1.5">💬 {encounter.definition.storyIntro}</p>
              )}
              <p className="text-[10px] text-muted-foreground mb-1.5">{encounter.mission.label}: {encounter.mission.description}</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full gradient-warm" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5 text-right">{Math.round(progress)}%</p>
            </>
          )}
          {caught && <p className="text-[10px] text-secondary">{encounter.definition.storyOutro || '🎉 축하합니다! 전설의 포켓몬을 포획했습니다!'}</p>}
        </div>
      </div>
    </motion.div>
  );
}

interface NpcEncounterBannerProps {
  npc: AiNpcTrainer;
  onBattle: () => void;
  onDecline: () => void;
}

export function NpcEncounterBanner({ npc, onBattle, onDecline }: NpcEncounterBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-card p-4 mb-4 border border-destructive/40 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-primary/5" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <motion.span className="text-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            {npc.emoji}
          </motion.span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{npc.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                npc.difficulty === 'elite' ? 'bg-accent/20 text-accent' :
                npc.difficulty === 'hard' ? 'bg-primary/20 text-primary' :
                npc.difficulty === 'medium' ? 'bg-secondary/20 text-secondary' :
                'bg-muted text-muted-foreground'
              }`}>
                Lv.{npc.level}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">"{npc.dialogue.before}"</p>
          </div>
        </div>
        <div className="flex gap-1.5 mb-3">
          {npc.teamSpeciesIds.map(id => {
            const sp = getPokemonById(id);
            return sp ? (
              <img key={id} src={sp.spriteUrl} alt={sp.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
            ) : null;
          })}
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBattle}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 gradient-primary text-primary-foreground text-sm font-bold"
          >
            <Swords size={14} /> 배틀!
          </motion.button>
          <button onClick={onDecline} className="px-4 rounded-xl py-2.5 bg-muted text-muted-foreground text-sm">
            도망
          </button>
        </div>
      </div>
    </motion.div>
  );
}
