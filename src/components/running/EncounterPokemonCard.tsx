import { motion } from 'framer-motion';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getGradeInfo } from '@/lib/pokemon-grade';
import type { AutoCollectResult } from '@/lib/auto-collect';

interface EncounterPokemonCardProps {
  encounter: AutoCollectResult;
  index: number;
}

const GRADE_BG: Record<string, string> = {
  normal: 'bg-muted/60',
  rare: 'bg-blue-500/10 border border-blue-500/20',
  unique: 'bg-violet-500/10 border border-violet-500/20',
};

export default function EncounterPokemonCard({ encounter, index }: EncounterPokemonCardProps) {
  const species = getPokemonById(encounter.speciesId);
  const gradeInfo = getGradeInfo(encounter.grade);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index }}
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${GRADE_BG[encounter.grade] || GRADE_BG.normal}`}
    >
      <div className="flex items-center gap-3">
        {species && (
          <img
            src={species.spriteUrl}
            alt={species.name}
            className="w-10 h-10 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{encounter.name}</span>
            {encounter.isNew && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/30">
                NEW
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {encounter.distanceAtEncounter.toFixed(1)}km 지점
          </span>
        </div>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ color: gradeInfo.color, backgroundColor: `${gradeInfo.color}15` }}
      >
        {gradeInfo.emoji} {gradeInfo.label}
      </span>
    </motion.div>
  );
}
