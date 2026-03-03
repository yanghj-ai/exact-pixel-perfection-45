import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Target, Flame, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRunningStats, formatDuration, formatPace, type RunningStats } from '@/lib/running';
import BottomNav from '@/components/BottomNav';

export default function RunningHistory() {
  const navigate = useNavigate();
  const [stats] = useState<RunningStats>(getRunningStats());
  const [tab, setTab] = useState<'history' | 'challenges'>('history');

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
              <p className="text-2xl font-bold text-primary">{stats.totalDistanceKm.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">총 거리 (km)</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/5">
              <p className="text-2xl font-bold text-secondary">{stats.totalSessions}</p>
              <p className="text-[10px] text-muted-foreground">총 런닝 횟수</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-2xl font-bold text-foreground">{stats.bestPaceMinPerKm ? formatPace(stats.bestPaceMinPerKm) : '-'}</p>
              <p className="text-[10px] text-muted-foreground">최고 페이스</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-2xl font-bold text-foreground">{stats.currentStreak}</p>
              <p className="text-[10px] text-muted-foreground">연속 런닝 (일)</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'history' ? 'gradient-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground'}`}
          >
            기록
          </button>
          <button
            onClick={() => setTab('challenges')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'challenges' ? 'gradient-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground'}`}
          >
            챌린지
          </button>
        </div>

        {tab === 'history' && (
          <div className="space-y-3">
            {stats.sessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">아직 런닝 기록이 없어요</p>
                <p className="text-muted-foreground/60 text-xs mt-1">첫 런닝을 시작해보세요! 🏃</p>
              </div>
            ) : (
              [...stats.sessions].reverse().map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{new Date(s.startTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}</span>
                    <span className="text-xs text-muted-foreground">{new Date(s.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-primary">{s.distanceKm.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">km</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{formatDuration(s.durationSeconds)}</p>
                      <p className="text-[10px] text-muted-foreground">시간</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-secondary">{s.paceMinPerKm > 0 ? formatPace(s.paceMinPerKm) : '-'}</p>
                      <p className="text-[10px] text-muted-foreground">페이스</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {tab === 'challenges' && (
          <div className="space-y-3">
            {stats.challenges.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`glass-card p-4 ${c.completed ? 'border border-secondary/30' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{c.title}</p>
                      {c.completed && <span className="text-xs text-secondary font-bold">✓ 완료</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                    {!c.completed && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full gradient-primary transition-all"
                            style={{ width: `${Math.min(100, (c.current / c.target) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{c.current} / {c.target} {c.unit}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    <p>🍎 {c.rewardFood}</p>
                    <p>⚡ {c.rewardExp}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
