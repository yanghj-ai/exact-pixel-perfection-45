import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import type { RunningGoal } from '@/lib/running';

interface RunningGoalsProps {
  dailyGoal?: RunningGoal;
  weeklyGoal?: RunningGoal;
}

export default function RunningGoals({ dailyGoal, weeklyGoal }: RunningGoalsProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3 mb-4">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-heal" />
        <span className="text-xs font-bold text-foreground">런닝 목표</span>
      </div>
      {dailyGoal && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">🏃 일일</span>
            <span className="text-xs font-semibold text-foreground">{dailyGoal.currentKm.toFixed(1)} / {dailyGoal.targetKm} km</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full gradient-heal" initial={false} animate={{ width: `${Math.min(100, (dailyGoal.currentKm / dailyGoal.targetKm) * 100)}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      )}
      {weeklyGoal && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">📅 주간</span>
            <span className="text-xs font-semibold text-foreground">{weeklyGoal.currentKm.toFixed(1)} / {weeklyGoal.targetKm} km</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${Math.min(100, (weeklyGoal.currentKm / weeklyGoal.targetKm) * 100)}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
