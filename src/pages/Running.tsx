import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, MapPin, Timer, Flame, Trophy, Navigation, Map } from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateDistance,
  formatDuration,
  formatPace,
  completeRunningSession,
  type GeoPoint,
  type RunningSession,
  type Challenge,
} from '@/lib/running';
import { getPet, getRequiredExp } from '@/lib/pet';
import type { LevelUpResult } from '@/lib/pet';
import PetSprite from '@/components/PetSprite';
import BottomNav from '@/components/BottomNav';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import RunningMap from '@/components/RunningMap';

type RunState = 'idle' | 'running' | 'paused' | 'completed';

const PET_CHEERS = [
  '파이팅! 🔥', '잘하고 있어!', '조금만 더!', '대단해! 💪',
  '같이 달리자!', '최고야! ⚡', '멈추지 마!', '할 수 있어!',
];

export default function RunningPage() {
  const navigate = useNavigate();
  const [runState, setRunState] = useState<RunState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [route, setRoute] = useState<GeoPoint[]>([]);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [cheerMessage, setCheerMessage] = useState(PET_CHEERS[0]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [completedSession, setCompletedSession] = useState<RunningSession | null>(null);
  const [levelUpResult, setLevelUpResult] = useState<LevelUpResult | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [foodReward, setFoodReward] = useState(0);
  const [expReward, setExpReward] = useState(0);
  const [showMap, setShowMap] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cheerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeRef = useRef<GeoPoint[]>([]);
  const elapsedRef = useRef(0);

  const pet = getPet();

  // Timer - keep ref in sync
  useEffect(() => {
    if (runState === 'running') {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          const newVal = e + 1;
          elapsedRef.current = newVal;
          return newVal;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [runState]);

  // Pet cheers
  useEffect(() => {
    if (runState === 'running') {
      cheerRef.current = setInterval(() => {
        setCheerMessage(PET_CHEERS[Math.floor(Math.random() * PET_CHEERS.length)]);
      }, 15000);
    } else {
      if (cheerRef.current) clearInterval(cheerRef.current);
    }
    return () => { if (cheerRef.current) clearInterval(cheerRef.current); };
  }, [runState]);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS를 사용할 수 없습니다');
      return;
    }
    setGpsError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: GeoPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          speed: pos.coords.speed ?? undefined,
        };
        routeRef.current = [...routeRef.current, point];
        setRoute([...routeRef.current]);
        const dist = calculateDistance(routeRef.current);
        setCurrentDistance(dist);
        // Use elapsed timer (accounts for pauses) for pace
        if (dist > 0 && elapsedRef.current > 0) {
          const elapsedMin = elapsedRef.current / 60;
          setCurrentPace(elapsedMin / dist);
        }
      },
      (err) => {
        setGpsError(`GPS 오류: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const handleStart = () => {
    setRunState('running');
    setElapsed(0);
    elapsedRef.current = 0;
    setRoute([]);
    routeRef.current = [];
    setCurrentDistance(0);
    setCurrentPace(0);
    setShowMap(true);
    startGPS();
    toast('🏃 런닝 시작!', { description: '파이리와 함께 달려볼까요!' });
  };

  const handlePause = () => {
    setRunState('paused');
    stopGPS();
  };

  const handleResume = () => {
    setRunState('running');
    startGPS();
  };

  const handleStop = () => {
    stopGPS();
    if (routeRef.current.length < 2 || currentDistance < 0.01) {
      toast('런닝 기록이 너무 짧아요', { description: '조금 더 달려보세요!' });
      setRunState('idle');
      return;
    }
    const { session, stats, levelUp, completedChallenges: completed } = completeRunningSession(routeRef.current, elapsedRef.current);
    setCompletedSession(session);
    setLevelUpResult(levelUp);
    setCompletedChallenges(completed);
    const food = Math.max(1, Math.floor(session.distanceKm));
    const exp = Math.max(5, Math.round(session.distanceKm * 10));
    setFoodReward(food);
    setExpReward(exp);
    setRunState('completed');
  };

  useEffect(() => {
    return () => { stopGPS(); if (timerRef.current) clearInterval(timerRef.current); };
  }, [stopGPS]);

  // Completed screen
  if (runState === 'completed' && completedSession) {
    return (
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-5 pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <span className="text-4xl">🎉</span>
            <h1 className="text-2xl font-bold text-foreground mt-2">런닝 완료!</h1>
          </motion.div>

          {/* Route map */}
          {completedSession.route.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
              <RunningMap route={completedSession.route} className="h-48" />
            </motion.div>
          )}

          {/* Pet celebration */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center mb-6">
            <PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card px-4 py-2 mt-2">
              <p className="text-sm text-foreground">정말 대단해! 🔥</p>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <div className="glass-card p-5 space-y-4 mb-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{completedSession.distanceKm.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatDuration(completedSession.durationSeconds)}</p>
                <p className="text-xs text-muted-foreground">시간</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{completedSession.paceMinPerKm > 0 ? formatPace(completedSession.paceMinPerKm) : '-'}</p>
                <p className="text-xs text-muted-foreground">페이스</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-1.5">
                <Flame size={16} className="text-destructive" />
                <span className="text-sm font-semibold">{completedSession.caloriesBurned} kcal</span>
              </div>
            </div>
          </div>

          {/* Rewards */}
          <div className="glass-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3">🎁 획득 보상</p>
            <div className="flex gap-4 justify-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
                <span className="text-lg">🍎</span>
                <span className="font-bold text-primary">+{foodReward}</span>
              </motion.div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2">
                <span className="text-lg">⚡</span>
                <span className="font-bold text-secondary">+{expReward} EXP</span>
              </motion.div>
            </div>
          </div>

          {completedChallenges.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="glass-card p-4 mb-4 border border-secondary/30">
              <p className="text-xs text-muted-foreground mb-2">🏆 챌린지 달성!</p>
              {completedChallenges.map(c => (
                <div key={c.id} className="flex items-center gap-2 py-1">
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{c.title}</span>
                </div>
              ))}
            </motion.div>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/home')}
            className="w-full gradient-primary text-primary-foreground rounded-2xl py-4 font-bold text-lg mt-4"
          >
            홈으로 돌아가기
          </motion.button>
        </div>
        <BottomNav />
        <LevelUpOverlay result={levelUpResult} pet={getPet()} onClose={() => setLevelUpResult(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">🏃 런닝</h1>
          <div className="flex items-center gap-3">
            {runState !== 'idle' && (
              <button
                onClick={() => setShowMap(v => !v)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  showMap ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Map size={12} />
                지도
              </button>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <Flame size={14} className="text-primary" />
              <span className="text-sm font-bold text-primary">{pet.foodCount}</span>
            </div>
          </div>
        </div>

        {/* Live map */}
        {showMap && runState !== 'idle' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
            <RunningMap route={route} isLive className="h-48" />
          </motion.div>
        )}

        {/* Pet + Cheer during run */}
        {runState !== 'idle' && !showMap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mb-4">
            <div className="scale-75">
              <PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} />
            </div>
            <motion.div key={cheerMessage} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="glass-card px-3 py-1.5">
              <p className="text-xs text-foreground">{cheerMessage}</p>
            </motion.div>
          </motion.div>
        )}

        {/* Main stats display */}
        <div className="glass-card p-6 mb-4">
          {runState === 'idle' ? (
            <div className="text-center py-8">
              <div className="mb-6">
                <PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">파이리와 함께 달려볼까?</p>
              <p className="text-sm text-muted-foreground">GPS로 런닝을 기록하고 보상을 받으세요</p>
              {gpsError && <p className="text-xs text-destructive mt-2">{gpsError}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <motion.p
                  key={Math.floor(currentDistance * 100)}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-5xl font-bold text-primary tabular-nums"
                >
                  {currentDistance.toFixed(2)}
                </motion.p>
                <p className="text-sm text-muted-foreground">km</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Timer size={12} className="text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{formatDuration(elapsed)}</p>
                  <p className="text-[10px] text-muted-foreground">시간</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Navigation size={12} className="text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{currentPace > 0 ? formatPace(currentPace) : "-'--\""}</p>
                  <p className="text-[10px] text-muted-foreground">페이스</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Flame size={12} className="text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{Math.round(currentDistance * 60)}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
              </div>

              {gpsError && <p className="text-xs text-destructive text-center">{gpsError}</p>}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {runState === 'idle' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleStart}
              className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary glow-shadow"
            >
              <Play size={32} className="text-primary-foreground ml-1" />
            </motion.button>
          )}
          {runState === 'running' && (
            <>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handlePause} className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 border border-secondary/30">
                <Pause size={24} className="text-secondary" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleStop} className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 border border-destructive/30">
                <Square size={24} className="text-destructive" />
              </motion.button>
            </>
          )}
          {runState === 'paused' && (
            <>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleResume} className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary">
                <Play size={24} className="text-primary-foreground ml-0.5" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleStop} className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 border border-destructive/30">
                <Square size={24} className="text-destructive" />
              </motion.button>
            </>
          )}
        </div>

        {/* Reward preview */}
        {runState === 'idle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 glass-card p-4">
            <p className="text-xs text-muted-foreground mb-2">💡 런닝 보상</p>
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">🍎 1km당 먹이 1개</span>
              <span className="text-muted-foreground">⚡ 1km당 EXP 10</span>
            </div>
          </motion.div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
