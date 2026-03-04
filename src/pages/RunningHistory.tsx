import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Flame, TrendingUp, Footprints } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRunningStreak, getRunRecords, getDailyStepHistory, getRunDates, type RunRecord } from '@/lib/running-streak';
import { formatDuration, formatPace } from '@/lib/running';
import { getPokemonById } from '@/lib/pokemon-registry';
import BottomNav from '@/components/BottomNav';
import DebugPanel from '@/components/DebugPanel';

function StreakCalendar() {
  const runDates = getRunDates(35);
  const today = new Date();
  const days: { date: string; hasRun: boolean; isFuture: boolean; isToday: boolean }[] = [];

  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      hasRun: runDates.has(dateStr),
      isFuture: i < 0,
      isToday: i === 0,
    });
  }

  return (
    <div className="glass-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame size={14} className="text-destructive" />
        <span className="text-xs font-bold text-foreground">스트릭 캘린더</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className="text-center text-[8px] text-muted-foreground/60">{d}</div>
        ))}
        {/* Pad to align with weekdays */}
        {Array.from({ length: new Date(days[0]?.date || '').getDay() }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(day => (
          <div
            key={day.date}
            className={`aspect-square rounded-sm flex items-center justify-center text-[8px] font-bold ${
              day.isToday
                ? 'ring-1 ring-primary'
                : ''
            } ${
              day.hasRun
                ? 'bg-heal/60 text-foreground'
                : 'bg-muted/30 text-muted-foreground/30'
            }`}
            title={day.date}
          >
            {new Date(day.date + 'T12:00:00').getDate()}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-heal/60" /> 러닝 완료</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted/30" /> 미완료</span>
      </div>
    </div>
  );
}

function WeeklyStepChart() {
  const history = getDailyStepHistory(7);
  const maxSteps = Math.max(1, ...history.map(d => d.steps));
  const goalLine = 3000;

  return (
    <div className="glass-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-primary" />
        <span className="text-xs font-bold text-foreground">주간 걸음수</span>
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {history.map((day, i) => {
          const height = maxSteps > 0 ? (day.steps / Math.max(maxSteps, goalLine)) * 100 : 0;
          const isToday = i === history.length - 1;
          const achieved = day.steps >= goalLine;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] text-muted-foreground tabular-nums">
                {day.steps > 0 ? (day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps) : ''}
              </span>
              <div className="w-full flex-1 relative flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(2, height)}%` }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className={`w-full rounded-t-sm ${
                    achieved ? 'bg-heal' : isToday ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              </div>
              <span className={`text-[9px] ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {new Date(day.date + 'T12:00:00').toLocaleDateString('ko-KR', { weekday: 'narrow' })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="border-t border-dashed border-muted-foreground/40 w-4" />
        <span>목표: {goalLine.toLocaleString()}보</span>
      </div>
    </div>
  );
}

function RunRecordCard({ record, index }: { record: RunRecord; index: number }) {
  const species = getPokemonById(record.companionSpeciesId);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass-card p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {species && (
            <img src={species.spriteUrl} alt={species.name} className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(record.date + 'T12:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{record.companionName}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-sm font-bold text-primary">{record.steps.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">걸음</p>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{record.distanceKm.toFixed(2)}</p>
          <p className="text-[9px] text-muted-foreground">km</p>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{formatDuration(record.durationSec)}</p>
          <p className="text-[9px] text-muted-foreground">시간</p>
        </div>
        <div>
          <p className="text-sm font-bold text-secondary">{record.paceMinPerKm ? formatPace(record.paceMinPerKm) : '-'}</p>
          <p className="text-[9px] text-muted-foreground">페이스</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function RunningHistory() {
  const navigate = useNavigate();
  const streak = getRunningStreak();
  const records = getRunRecords();

  const totalSteps = records.reduce((s, r) => s + r.steps, 0);
  const totalDistance = records.reduce((s, r) => s + r.distanceKm, 0);

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/home')} className="p-2 -ml-2">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">런닝 기록</h1>
        </div>

        {/* Overall stats */}
        <div className="glass-card p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl bg-primary/5">
              <p className="text-2xl font-bold text-primary">{totalSteps.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">총 걸음수</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/5">
              <p className="text-2xl font-bold text-secondary">{records.length}</p>
              <p className="text-[10px] text-muted-foreground">총 러닝 횟수</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-2xl font-bold text-foreground">{totalDistance.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">총 거리 (km)</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <div className="flex items-center justify-center gap-1">
                <Flame size={16} className="text-destructive" />
                <p className="text-2xl font-bold text-foreground">{streak.currentStreak}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">연속 (최장 {streak.longestStreak}일)</p>
            </div>
          </div>
        </div>

        {/* Streak Calendar */}
        <StreakCalendar />

        {/* Weekly Chart */}
        <WeeklyStepChart />

        {/* Recent Runs */}
        <div className="flex items-center gap-2 mb-3">
          <Footprints size={14} className="text-primary" />
          <span className="text-xs font-bold text-foreground">최근 러닝</span>
        </div>
        <div className="space-y-2">
          {records.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">아직 런닝 기록이 없어요</p>
              <p className="text-muted-foreground/60 text-xs mt-1">첫 런닝을 시작해보세요! 🏃</p>
            </div>
          ) : (
            records.slice(0, 20).map((r, i) => (
              <RunRecordCard key={`${r.date}-${i}`} record={r} index={i} />
            ))
          )}
        </div>
        <DebugPanel />
      </div>
      <BottomNav />
    </div>
  );
}
