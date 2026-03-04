import { motion } from 'framer-motion';
import { Target, Flame, Footprints } from 'lucide-react';
import type { RunningStreakState } from '@/lib/running-streak';

interface RunningGoalsProps {
  todaySteps: number;
  streak: RunningStreakState;
}

const DAILY_STEP_GOAL = 3000;

export default function RunningGoals({ todaySteps, streak }: RunningGoalsProps) {
  const progress = Math.min(100, (todaySteps / DAILY_STEP_GOAL) * 100);
  const achieved = todaySteps >= DAILY_STEP_GOAL;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-heal" />
          <span className="text-xs font-bold text-foreground">오늘의 목표</span>
        </div>
        {streak.currentStreak > 0 && (
          <div className="flex items-center gap-1">
            <Flame size={12} className="text-destructive" />
            <span className="text-[10px] font-bold text-destructive">{streak.currentStreak}일 연속</span>
          </div>
        )}
      </div>

      {/* 일일 걸음 목표 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Footprints size={12} /> 일일 걸음수
          </span>
          <span className="text-xs font-semibold text-foreground">
            {todaySteps.toLocaleString()} / {DAILY_STEP_GOAL.toLocaleString()}보
            {achieved && ' ✅'}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: achieved
                ? 'linear-gradient(90deg, hsl(var(--heal-green)), hsl(var(--secondary)))'
                : 'hsl(var(--heal-green))',
            }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        {achieved && (
          <p className="text-[10px] text-heal mt-1">🎉 목표 달성! 배틀 버프 활성화됨</p>
        )}
      </div>

      {/* 스트릭 마일스톤 정보 */}
      {streak.currentStreak > 0 && streak.currentStreak < 30 && (
        <div className="pt-2 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground">
            🏆 다음 마일스톤: {
              streak.currentStreak < 3 ? `3일 (${3 - streak.currentStreak}일 남음)`
              : streak.currentStreak < 7 ? `7일 (${7 - streak.currentStreak}일 남음)`
              : streak.currentStreak < 14 ? `14일 (${14 - streak.currentStreak}일 남음)`
              : `30일 (${30 - streak.currentStreak}일 남음)`
            }
          </p>
        </div>
      )}
    </motion.div>
  );
}
