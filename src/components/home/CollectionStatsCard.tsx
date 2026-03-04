import { motion } from 'framer-motion';
import type { RunningStats } from '@/lib/running';

interface CollectionStatsCardProps {
  uniqueSpecies: number;
  completionRate: number;
  runStats: RunningStats;
}

export default function CollectionStatsCard({ uniqueSpecies, completionRate, runStats }: CollectionStatsCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="pokeball-badge" />
          <div>
            <p className="text-xs text-muted-foreground">포켓몬 도감</p>
            <p className="text-sm font-bold text-foreground">{uniqueSpecies} / 151</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-center">
          <div>
            <p className="text-xs font-bold text-foreground">🔥 {runStats.currentStreak}</p>
            <p className="text-[9px] text-muted-foreground">연속</p>
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">📏 {runStats.totalDistanceKm.toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground">km</p>
          </div>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full gradient-primary" style={{ width: `${completionRate}%` }} />
      </div>
    </motion.div>
  );
}
