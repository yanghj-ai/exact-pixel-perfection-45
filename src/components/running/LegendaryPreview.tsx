import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getPokemonById } from '@/lib/pokemon-registry';
import {
  checkLegendaryEncounterConditions, checkSpecialEventConditions,
} from '@/lib/legendary';

export default function LegendaryPreview() {
  const available = checkLegendaryEncounterConditions();
  const events = checkSpecialEventConditions();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4 glass-card p-4 border border-secondary/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-secondary" />
        <span className="text-xs font-bold text-foreground">전설/특수 포켓몬</span>
      </div>
      <div className="space-y-2">
        {available.length > 0 || events.length > 0 ? (
          <>
            {available.map(def => {
              const sp = getPokemonById(def.speciesId);
              return (
                <div key={def.speciesId} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/5 border border-secondary/10">
                  {sp ? (
                    <img src={sp.spriteUrl} alt={sp.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <span className="text-xl">{def.emoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground">{def.name}</span>
                    <p className="text-[10px] text-secondary">🌟 조우 가능! 런닝을 시작하세요!</p>
                  </div>
                </div>
              );
            })}
            {events.map(evt => {
              const sp = getPokemonById(evt.speciesId);
              return (
                <div key={evt.id} className="flex items-center gap-3 p-2 rounded-xl bg-accent/5 border border-accent/10">
                  {sp ? (
                    <img src={sp.spriteUrl} alt={sp.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <span className="text-xl">{evt.emoji}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground">{evt.name}</span>
                    <p className="text-[10px] text-accent">✨ 특별 조우 가능!</p>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-2">
            더 많이 달리면 특별한 포켓몬을 만날 수 있어요!
          </p>
        )}
      </div>
    </motion.div>
  );
}
