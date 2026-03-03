import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile } from '@/lib/storage';
import { getPet, savePet, applyHpDecay, feedPet, interactPet, getRandomDialogue, getStageInfo, getRequiredExp } from '@/lib/pet';
import type { PetState } from '@/lib/pet';
import { Flame, Apple, Handshake, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

export default function Home() {
  const navigate = useNavigate();
  const [profile] = useState(getProfile());
  const [pet, setPet] = useState<PetState>(getPet());
  const [dialogue, setDialogue] = useState('');
  const [hearts, setHearts] = useState<number[]>([]);

  useEffect(() => {
    if (!profile.onboardingComplete) {
      navigate('/', { replace: true });
      return;
    }
    // Apply HP decay on load
    const updated = applyHpDecay(pet);
    setPet(updated);
    // Set initial dialogue
    setDialogue(getRandomDialogue(updated.hp <= 0 ? 'hungry' : 'idle'));
  }, []);

  const stageInfo = getStageInfo(pet.stage);
  const requiredExp = getRequiredExp(pet.level);
  const expProgress = (pet.exp / requiredExp) * 100;

  const handleFeed = useCallback(() => {
    if (pet.foodCount <= 0) {
      toast('먹이가 없어요!', {
        description: '루틴을 완료하면 먹이를 얻을 수 있어요 🍎',
      });
      return;
    }
    const updated = feedPet(pet);
    if (updated) {
      setPet(updated);
      setDialogue(getRandomDialogue('fed'));
      toast('🍎 먹이를 줬어요!', { description: `HP +20 회복! (남은 먹이: ${updated.foodCount}개)` });
    }
  }, [pet]);

  const handleInteract = useCallback(() => {
    const updated = interactPet(pet);
    setPet(updated);
    setDialogue(getRandomDialogue('interact'));
    // Show floating hearts
    const newHearts = Array.from({ length: 5 }, (_, i) => Date.now() + i);
    setHearts(newHearts);
    setTimeout(() => setHearts([]), 1500);
  }, [pet]);

  const handleExercise = useCallback(() => {
    navigate('/routine');
  }, [navigate]);

  const happinessHearts = Math.round(pet.happiness);

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">Lv.{pet.level}</span>
            <span className="text-sm font-semibold text-foreground">{pet.name}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Flame size={14} className="text-primary" />
            <span className="text-sm font-bold text-primary">{pet.foodCount}</span>
          </div>
        </div>

        {/* Pet area */}
        <div className="relative flex flex-col items-center mb-6">
          {/* Floating hearts */}
          <AnimatePresence>
            {hearts.map((id, i) => (
              <motion.span
                key={id}
                initial={{ opacity: 1, y: 0, x: (i - 2) * 20 }}
                animate={{ opacity: 0, y: -60 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute top-20 text-2xl pointer-events-none z-10"
              >
                ❤️
              </motion.span>
            ))}
          </AnimatePresence>

          {/* Pet circle */}
          <motion.div
            className={`relative flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br ${stageInfo.bgGradient} border-2 ${stageInfo.borderColor}`}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-8xl select-none">{stageInfo.emoji.split('')[0] === '🐉' ? '🐉' : '🔥'}</span>
            {pet.stage === 'charmeleon' && <span className="absolute text-4xl -top-2">🔥</span>}
            {pet.stage === 'charizard' && (
              <>
                <span className="absolute text-3xl -top-2 -left-2">🔥</span>
                <span className="absolute text-3xl -top-2 -right-2">🔥</span>
              </>
            )}
          </motion.div>

          {/* Pet name (tappable) */}
          <p className="mt-3 text-lg font-bold text-foreground">{pet.name}</p>

          {/* Speech bubble */}
          <motion.div
            key={dialogue}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 glass-card px-4 py-2.5 max-w-[260px]"
          >
            <p className="text-sm text-foreground text-center">{dialogue}</p>
          </motion.div>
        </div>

        {/* Stat bars */}
        <div className="glass-card p-4 space-y-3 mb-6">
          {/* HP */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">❤️ HP</span>
              <span className="text-xs font-semibold text-foreground">{pet.hp}/{pet.maxHp}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-destructive"
                initial={false}
                animate={{ width: `${(pet.hp / pet.maxHp) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* EXP */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">⚡ EXP</span>
              <span className="text-xs font-semibold text-foreground">{pet.exp}/{requiredExp}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-primary"
                initial={false}
                animate={{ width: `${Math.min(100, expProgress)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Happiness */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">😊 행복도</span>
              <span className="text-xs font-semibold text-foreground">{pet.happiness.toFixed(1)}/5</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`text-lg ${i <= happinessHearts ? '' : 'opacity-20'}`}
                >
                  ❤️
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Interaction buttons */}
        <div className="grid grid-cols-3 gap-3">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleFeed}
            className="glass-card flex flex-col items-center gap-2 py-4 hover:bg-card/90 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Apple size={22} className="text-destructive" />
            </div>
            <span className="text-xs font-medium text-foreground">먹이주기</span>
            <span className="text-[10px] text-muted-foreground">{pet.foodCount}개</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleInteract}
            className="glass-card flex flex-col items-center gap-2 py-4 hover:bg-card/90 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <Handshake size={22} className="text-secondary" />
            </div>
            <span className="text-xs font-medium text-foreground">교감하기</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleExercise}
            className="glass-card flex flex-col items-center gap-2 py-4 hover:bg-card/90 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Dumbbell size={22} className="text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">함께 운동</span>
          </motion.button>
        </div>

        {/* Streak indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 glass-card p-4 flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Flame size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">연속 출석</p>
            <p className="text-lg font-bold text-foreground">{profile.streak}일</p>
          </div>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`h-5 w-1.5 rounded-full ${
                  i < (profile.streak % 7 || (profile.streak > 0 ? 7 : 0)) ? 'gradient-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
