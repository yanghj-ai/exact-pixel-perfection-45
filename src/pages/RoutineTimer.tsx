import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { type RoutineItem } from '@/lib/routines';
import { getProfile, saveProfile } from '@/lib/storage';
import { Pause, Play, Check, SkipForward, Home, PartyPopper } from 'lucide-react';

interface CircularTimerProps {
  remaining: number;
  total: number;
}

function CircularTimer({ remaining, total }: CircularTimerProps) {
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = remaining / total;
  const strokeDashoffset = circumference * (1 - progress);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        {/* Background circle */}
        <circle
          stroke="hsl(var(--muted))"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress circle */}
        <circle
          stroke="url(#timer-gradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-1000 ease-linear"
        />
        <defs>
          <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--teal))" />
            <stop offset="100%" stopColor="hsl(var(--mint))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-5xl font-bold tabular-nums text-foreground">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}

const END_MOODS = [
  { emoji: '😄', label: '좋아요' },
  { emoji: '😊', label: '괜찮아요' },
  { emoji: '😐', label: '보통' },
  { emoji: '😔', label: '별로예요' },
  { emoji: '😢', label: '힘들어요' },
];

export default function RoutineTimer() {
  const location = useLocation();
  const navigate = useNavigate();
  const routines: RoutineItem[] = location.state?.routines || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState<boolean[]>([]);
  const [allDone, setAllDone] = useState(false);
  const [endMood, setEndMood] = useState<string | null>(null);

  const currentRoutine = routines[currentIndex];
  const totalSeconds = currentRoutine ? currentRoutine.duration * 60 : 0;

  // Initialize
  useEffect(() => {
    if (routines.length === 0) {
      navigate('/home', { replace: true });
      return;
    }
    setRemaining(routines[0].duration * 60);
    setCompleted(new Array(routines.length).fill(false));
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isPaused || allDone || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, allDone, remaining]);

  const handleComplete = useCallback(() => {
    const newCompleted = [...completed];
    newCompleted[currentIndex] = true;
    setCompleted(newCompleted);

    if (currentIndex < routines.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setRemaining(routines[nextIndex].duration * 60);
    } else {
      // All done!
      finishRoutine(newCompleted);
    }
  }, [currentIndex, completed, routines]);

  const handleSkip = () => {
    const newCompleted = [...completed];
    newCompleted[currentIndex] = false;
    setCompleted(newCompleted);

    if (currentIndex < routines.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setRemaining(routines[nextIndex].duration * 60);
    } else {
      finishRoutine(newCompleted);
    }
  };

  const finishRoutine = (finalCompleted: boolean[]) => {
    setAllDone(true);
    // Update streak
    const profile = getProfile();
    const today = new Date().toISOString().split('T')[0];
    if (profile.lastCompletedDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = profile.lastCompletedDate === yesterdayStr ? profile.streak + 1 : 1;
      saveProfile({ streak: newStreak, lastCompletedDate: today });
    }
  };

  if (routines.length === 0) return null;

  // Celebration screen
  if (allDone) {
    const completedCount = completed.filter(Boolean).length;
    const profile = getProfile();

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6 text-7xl"
          >
            🎉
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold text-foreground mb-2"
          >
            오늘도 잘 했어요!
          </motion.h1>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
            className="my-6 inline-flex items-center gap-2 rounded-2xl gradient-primary px-6 py-3"
          >
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-bold text-primary-foreground">
              {profile.streak}일 연속 스트릭!
            </span>
          </motion.div>

          {/* Completed activities */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="glass-card mx-auto max-w-sm p-5 mb-6 text-left"
          >
            <p className="text-sm text-muted-foreground mb-3">완료한 활동</p>
            <div className="space-y-2.5">
              {routines.map((routine, i) => (
                <div key={routine.id} className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    completed[i]
                      ? 'gradient-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {completed[i] ? '✓' : '—'}
                  </div>
                  <span className="text-xl">{routine.emoji}</span>
                  <span className={`text-sm ${completed[i] ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                    {routine.title}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {completedCount}/{routines.length} 활동 완료
            </p>
          </motion.div>

          {/* End mood */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mb-8"
          >
            <p className="text-sm text-muted-foreground mb-3">오늘 기분은?</p>
            <div className="flex justify-center gap-3">
              {END_MOODS.map((mood) => (
                <button
                  key={mood.label}
                  onClick={() => setEndMood(mood.label)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 transition-all ${
                    endMood === mood.label
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/home')}
            className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold gradient-primary text-primary-foreground"
          >
            <Home size={18} />
            홈으로 돌아가기
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Timer screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12">
      {/* Top: Progress */}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1}/{routines.length}
          </p>
          <p className="text-sm text-muted-foreground">{currentRoutine.category}</p>
        </div>
        <div className="flex gap-1.5 mb-6">
          {routines.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i < currentIndex
                  ? 'gradient-primary'
                  : i === currentIndex
                  ? 'gradient-primary opacity-60'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Activity info */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="text-5xl mb-3 block">{currentRoutine.emoji}</span>
          <h1 className="text-2xl font-bold text-foreground">{currentRoutine.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{currentRoutine.duration}분</p>
        </motion.div>
      </div>

      {/* Center: Timer */}
      <CircularTimer remaining={remaining} total={totalSeconds} />

      {/* Bottom: Controls */}
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-center gap-6">
          {/* Skip */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSkip}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
              <SkipForward size={22} className="text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">스킵</span>
          </motion.button>

          {/* Pause/Play */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsPaused(!isPaused)}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary glow-shadow">
              {isPaused ? (
                <Play size={28} className="text-primary-foreground ml-1" />
              ) : (
                <Pause size={28} className="text-primary-foreground" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {isPaused ? '재개' : '일시정지'}
            </span>
          </motion.button>

          {/* Complete */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleComplete}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
              <Check size={22} className="text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">완료</span>
          </motion.button>
        </div>

        {/* Skip encouragement */}
        <AnimatePresence>
          {isPaused && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-muted-foreground"
            >
              잠시 쉬어가도 괜찮아요 ☕
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
