import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Target, Flame, TrendingUp, ChevronDown, MapPin, Timer, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRunningStats, formatDuration, formatPace, type RunningStats, type RunningSession } from '@/lib/running';
import RunningMap from '@/components/RunningMap';
import BottomNav from '@/components/BottomNav';

function SessionCard({ session, index }: { session: RunningSession; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasRoute = session.route && session.route.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card overflow-hidden"
    >
      <button onClick={() => setExpanded(v => !v)} className="w-full text-left p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {hasRoute && <MapPin size={12} className="text-primary" />}
            <span className="text-xs text-muted-foreground">
              {new Date(session.startTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(session.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-primary">{session.distanceKm.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">km</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{formatDuration(session.durationSeconds)}</p>
            <p className="text-[10px] text-muted-foreground">시간</p>
          </div>
          <div>
            <p className="text-lg font-bold text-secondary">{session.paceMinPerKm > 0 ? formatPace(session.paceMinPerKm) : '-'}</p>
            <p className="text-[10px] text-muted-foreground">페이스</p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* Route Map */}
            {hasRoute && (
              <div className="px-4 pb-3">
                <RunningMap route={session.route} className="h-44" />
              </div>
            )}

            {/* Detailed stats */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/20">
                  <Flame size={14} className="text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">칼로리</p>
                    <p className="font-semibold text-foreground">{session.caloriesBurned} kcal</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/20">
                  <Timer size={14} className="text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">시작</p>
                    <p className="font-semibold text-foreground">
                      {new Date(session.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/20">
                  <Navigation size={14} className="text-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">평균 속도</p>
                    <p className="font-semibold text-foreground">
                      {session.durationSeconds > 0
                        ? ((session.distanceKm / (session.durationSeconds / 3600))).toFixed(1)
                        : '0'} km/h
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/20">
                  <MapPin size={14} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">GPS 포인트</p>
                    <p className="font-semibold text-foreground">{session.route?.length || 0}개</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RunningHistory() {
  const navigate = useNavigate();
  const [stats] = useState<RunningStats>(getRunningStats());
  const [tab, setTab] = useState<'history' | 'challenges'>('history');

  const avgPace = stats.totalSessions > 0 && stats.totalDurationSeconds > 0 && stats.totalDistanceKm > 0
    ? (stats.totalDurationSeconds / 60) / stats.totalDistanceKm
    : null;

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
          {/* Extra aggregate stats */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{formatDuration(stats.totalDurationSeconds)}</p>
              <p className="text-[9px] text-muted-foreground">총 시간</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{avgPace ? formatPace(avgPace) : '-'}</p>
              <p className="text-[9px] text-muted-foreground">평균 페이스</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{stats.longestRunKm.toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">최장 거리 (km)</p>
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
                <SessionCard key={s.id} session={s} index={i} />
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
