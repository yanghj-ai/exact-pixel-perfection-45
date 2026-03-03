import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { type RoutineItem, calculateTotalRewards } from '@/lib/routines';
import { getProfile, saveProfile } from '@/lib/storage';
import { getPet, grantRewards, getRandomDialogue, getStageInfo } from '@/lib/pet';
import type { PetState, LevelUpResult } from '@/lib/pet';
import { toast } from 'sonner';
import { Pause, Play, Check, SkipForward, Home, Apple } from 'lucide-react';
import PetSprite from '@/components/PetSprite';
import charmanderImg from '@/assets/pet-charmander.png';

// --- Circular Timer ---
function CircularTimer({ remaining, total }: { remaining: number; total: number }) {
  const radius = 110;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = total > 0 ? remaining / total : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle stroke="hsl(var(--muted))" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
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
            <stop offset="0%" stopColor="hsl(var(--flame))" />
            <stop offset="100%" stopColor="hsl(var(--amber))" />
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

const PET_CHEER_INTERVAL = 30; // seconds

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
  const [cheerMessage, setCheerMessage] = useState('');
  const [rewardResult, setRewardResult] = useState<{ food: number; exp: number; levelUp: LevelUpResult | null } | null>(null);
  const cheerTimerRef = useRef(0);

  const currentIndexRef = useRef(currentIndex);
  const completedRef = useRef(completed);
  currentIndexRef.current = currentIndex;
  completedRef.current = completed;

  const currentRoutine = routines[currentIndex];
  const totalSeconds = currentRoutine ? currentRoutine.duration * 60 : 0;
  const pet = getPet();

  // Initialize
  useEffect(() => {
    if (routines.length === 0) {
      navigate('/home', { replace: true });
      return;
    }
    setRemaining(routines[0].duration * 60);
    setCompleted(new Array(routines.length).fill(false));
    setCheerMessage(getRandomDialogue(routines[0].isExercise ? 'exerciseCheer' : 'cheer'));
  }, []);

  // Rotate cheer message every 30 seconds
  useEffect(() => {
    if (isPaused || allDone) return;
    const interval = setInterval(() => {
      cheerTimerRef.current++;
      if (cheerTimerRef.current % PET_CHEER_INTERVAL === 0) {
        const routine = routines[currentIndexRef.current];
        setCheerMessage(getRandomDialogue(routine?.isExercise ? 'exerciseCheer' : 'cheer'));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, allDone]);

  const finishRoutine = () => {
    setAllDone(true);

    // Calculate rewards
    const completedArr = completedRef.current;
    const totalReward = calculateTotalRewards(routines, completedArr);

    // First-daily bonus
    const profile = getProfile();
    const today = new Date().toISOString().split('T')[0];
    let bonusExp = 0;
    if (profile.lastCompletedDate !== today) {
      bonusExp = 10; // daily first routine bonus
    }

    // Grant rewards to pet
    const { pet: updatedPet, levelUp } = grantRewards(totalReward.food, totalReward.exp + bonusExp);
    setRewardResult({ food: totalReward.food, exp: totalReward.exp + bonusExp, levelUp });

    // Update streak
    if (profile.lastCompletedDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = profile.lastCompletedDate === yesterdayStr ? profile.streak + 1 : 1;
      saveProfile({ streak: newStreak, lastCompletedDate: today });
    }

    // Level up toast
    if (levelUp) {
      setTimeout(() => {
        toast(`🎉 ${updatedPet.name}가 Lv.${levelUp.newLevel}가 되었어!`, {
          description: levelUp.evolved
            ? `✨ ${getStageInfo(levelUp.newStage!).name}로 진화했어!`
            : '더 강해진 느낌이야!',
          duration: 5000,
        });
      }, 2000);
    }
  };

  const advanceToNext = (wasCompleted: boolean) => {
    const idx = currentIndexRef.current;
    const newCompleted = [...completedRef.current];
    newCompleted[idx] = wasCompleted;
    setCompleted(newCompleted);

    if (idx < routines.length - 1) {
      const nextIndex = idx + 1;
      setCurrentIndex(nextIndex);
      setRemaining(routines[nextIndex].duration * 60);
      setCheerMessage(getRandomDialogue(routines[nextIndex].isExercise ? 'exerciseCheer' : 'cheer'));
      cheerTimerRef.current = 0;
    } else {
      completedRef.current = newCompleted;
      finishRoutine();
    }
  };

  // Timer countdown
  useEffect(() => {
    if (isPaused || allDone || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setTimeout(() => advanceToNext(true), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, allDone, remaining]);

  if (routines.length === 0) return null;

  // ===== CELEBRATION SCREEN =====
  if (allDone) {
    const completedCount = completedRef.current.filter(Boolean).length;
    const profile = getProfile();
    const currentPet = getPet();

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 overflow-y-auto py-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center w-full max-w-sm"
        >
          {/* Pet celebration */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <PetSprite stage={currentPet.stage} hp={currentPet.hp} maxHp={currentPet.maxHp} />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold text-foreground mb-1"
          >
            오늘도 잘 했어! 🎉
          </motion.h1>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-muted-foreground mb-4"
          >
            {getRandomDialogue('complete')}
          </motion.p>

          {/* Reward summary */}
          {rewardResult && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
              className="glass-card p-4 mb-4 space-y-2"
            >
              <p className="text-xs text-muted-foreground mb-2">획득 보상</p>
              <div className="flex justify-center gap-6">
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-3xl">🍎</span>
                  <span className="text-lg font-bold text-foreground">×{rewardResult.food}</span>
                  <span className="text-[10px] text-muted-foreground">먹이</span>
                </motion.div>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-3xl">⚡</span>
                  <span className="text-lg font-bold text-foreground">+{rewardResult.exp}</span>
                  <span className="text-[10px] text-muted-foreground">EXP</span>
                </motion.div>
              </div>

              {rewardResult.levelUp && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2, type: 'spring' }}
                  className="mt-3 rounded-xl gradient-primary px-4 py-2"
                >
                  <p className="text-sm font-bold text-primary-foreground">
                    🎉 Lv.{rewardResult.levelUp.newLevel} 달성!
                    {rewardResult.levelUp.evolved && ` ✨ ${getStageInfo(rewardResult.levelUp.newStage!).name}로 진화!`}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Streak */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 300 }}
            className="mb-4 inline-flex items-center gap-2 rounded-2xl gradient-primary px-5 py-2.5"
          >
            <span className="text-xl">🔥</span>
            <span className="text-lg font-bold text-primary-foreground">
              {profile.streak}일 연속 스트릭!
            </span>
          </motion.div>

          {/* Completed activities */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="glass-card p-4 mb-4 text-left"
          >
            <p className="text-xs text-muted-foreground mb-2">완료한 활동</p>
            <div className="space-y-2">
              {routines.map((routine, i) => (
                <div key={routine.id} className="flex items-center gap-2">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    completedRef.current[i] ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {completedRef.current[i] ? '✓' : '—'}
                  </div>
                  <span className="text-lg">{routine.emoji}</span>
                  <span className={`text-sm flex-1 ${completedRef.current[i] ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                    {routine.title}
                  </span>
                  {completedRef.current[i] && (
                    <span className="text-[10px] text-primary">
                      {routine.reward.food > 0 && `🍎${routine.reward.food} `}⚡{routine.reward.exp}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{completedCount}/{routines.length} 활동 완료</p>
          </motion.div>

          {/* Mood */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mb-6"
          >
            <p className="text-sm text-muted-foreground mb-2">오늘 기분은?</p>
            <div className="flex justify-center gap-2">
              {END_MOODS.map((mood) => (
                <button
                  key={mood.label}
                  onClick={() => setEndMood(mood.label)}
                  className={`flex flex-col items-center gap-0.5 rounded-2xl border-2 px-3 py-2 transition-all ${
                    endMood === mood.label ? 'border-primary bg-primary/10' : 'border-border bg-card'
                  }`}
                >
                  <span className="text-xl">{mood.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Action buttons */}
          <div className="space-y-3">
            {currentPet.foodCount > 0 && (
              <motion.button
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.7 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/home')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold border-2 border-primary bg-primary/10 text-primary"
              >
                <Apple size={18} />
                파이리에게 먹이주기 🍎
              </motion.button>
            )}
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.8 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/home')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold gradient-primary text-primary-foreground"
            >
              <Home size={18} />
              홈으로 돌아가기
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== TIMER SCREEN =====
  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-10">
      {/* Top: Progress + Activity info */}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{currentIndex + 1}/{routines.length}</p>
          <p className="text-sm text-muted-foreground">{currentRoutine.category}</p>
        </div>
        <div className="flex gap-1.5 mb-4">
          {routines.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i < currentIndex ? 'gradient-primary' : i === currentIndex ? 'gradient-primary opacity-60' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <motion.div key={currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
          <span className="text-4xl mb-2 block">{currentRoutine.emoji}</span>
          <h1 className="text-xl font-bold text-foreground">{currentRoutine.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentRoutine.duration}분</p>
          {/* Reward preview */}
          <p className="text-xs text-primary mt-1 font-medium">
            {currentRoutine.reward.food > 0 && `🍎×${currentRoutine.reward.food} + `}⚡{currentRoutine.reward.exp} EXP
            {currentRoutine.isExercise && ' + 🔥보너스'}
          </p>
        </motion.div>
      </div>

      {/* Center: Timer + Pet */}
      <div className="relative flex flex-col items-center">
        {/* Mini pet above timer */}
        <motion.div
          className="mb-3 flex items-center gap-2"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <img src={charmanderImg} alt="pet" className="w-10 h-10 object-contain" />
        </motion.div>

        <CircularTimer remaining={remaining} total={totalSeconds} />

        {/* Pet cheer message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={cheerMessage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-3 glass-card px-4 py-2 max-w-[250px]"
          >
            <p className="text-xs text-foreground text-center">{cheerMessage}</p>
          </motion.div>
        </AnimatePresence>

        {/* Exercise special indicator */}
        {currentRoutine.isExercise && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-[10px] text-primary font-medium"
          >
            🔥 파이리가 함께 운동 중! (EXP 보너스 +5)
          </motion.p>
        )}
      </div>

      {/* Bottom: Controls */}
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-center gap-6">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => advanceToNext(false)} className="flex flex-col items-center gap-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
              <SkipForward size={22} className="text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">스킵</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsPaused(!isPaused)} className="flex flex-col items-center gap-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary glow-shadow">
              {isPaused ? <Play size={28} className="text-primary-foreground ml-1" /> : <Pause size={28} className="text-primary-foreground" />}
            </div>
            <span className="text-[10px] text-muted-foreground">{isPaused ? '재개' : '일시정지'}</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.9 }} onClick={() => advanceToNext(true)} className="flex flex-col items-center gap-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
              <Check size={22} className="text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">완료</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {isPaused && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-muted-foreground"
            >
              잠시 쉬어가도 괜찮아요 ☕ 파이리도 기다리고 있어!
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
