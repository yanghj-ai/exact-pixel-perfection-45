import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile } from '@/lib/storage';
import { getPet, savePet, applyHpDecay, feedPet, interactPet, getRandomDialogue, getStageInfo, getRequiredExp, grantRewards } from '@/lib/pet';
import type { PetState, LevelUpResult } from '@/lib/pet';
import { checkAndGrantAttendance } from '@/lib/attendance';
import { Flame, Apple, Handshake, Dumbbell, Zap, Bug } from 'lucide-react';
import { toast } from 'sonner';
import PetSprite from '@/components/PetSprite';
import BottomNav from '@/components/BottomNav';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import AttendanceBonus from '@/components/AttendanceBonus';

export default function Home() {
  const navigate = useNavigate();
  const [profile] = useState(getProfile());
  const [pet, setPet] = useState<PetState>(getPet());
  const [dialogue, setDialogue] = useState('');
  const [hearts, setHearts] = useState<number[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Overlays
  const [levelUpResult, setLevelUpResult] = useState<LevelUpResult | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ consecutiveDays: number; bonusFood: number; bonusExp: number } | null>(null);

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

    // Check attendance bonus
    const attendance = checkAndGrantAttendance();
    if (attendance.isNewDay) {
      setPet(getPet()); // refresh pet after rewards
      setAttendanceData({
        consecutiveDays: attendance.consecutiveDays,
        bonusFood: attendance.bonusFood,
        bonusExp: attendance.bonusExp,
      });
      // Show attendance after a short delay
      setTimeout(() => setShowAttendance(true), 800);
      // If level up from attendance, show after attendance closes
      if (attendance.levelUp) {
        setLevelUpResult(attendance.levelUp);
      }
    }
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
    const newHearts = Array.from({ length: 5 }, (_, i) => Date.now() + i);
    setHearts(newHearts);
    setTimeout(() => setHearts([]), 1500);
  }, [pet]);

  const handleExercise = useCallback(() => {
    navigate('/routine');
  }, [navigate]);

  // Pet touch callbacks
  const handlePetTap = useCallback(() => {
    const updated = interactPet(pet);
    setPet(updated);
    setDialogue(getRandomDialogue('interact'));
  }, [pet]);

  const handlePetLongPress = useCallback(() => {
    setDialogue('으악! 깜짝이야! 😲');
  }, []);

  const handleAttendanceClose = useCallback(() => {
    setShowAttendance(false);
    // Show level-up after attendance if any
    if (levelUpResult) {
      setTimeout(() => {}, 300);
    }
  }, [levelUpResult]);

  const handleDebugExp = useCallback((amount: number) => {
    const { pet: updatedPet, levelUp } = grantRewards(0, amount);
    setPet(updatedPet);
    if (levelUp) {
      setLevelUpResult(levelUp);
    }
    toast(`⚡ EXP +${amount}`, {
      description: `Lv.${updatedPet.level} | ${updatedPet.exp}/${getRequiredExp(updatedPet.level)} EXP`,
    });
  }, []);

  const handleDebugSetLevel = useCallback((targetLevel: number) => {
    // Calculate total EXP needed to reach target level
    let totalExp = 0;
    for (let i = 1; i < targetLevel; i++) {
      totalExp += getRequiredExp(i);
    }
    const currentPet = getPet();
    let currentTotal = 0;
    for (let i = 1; i < currentPet.level; i++) {
      currentTotal += getRequiredExp(i);
    }
    currentTotal += currentPet.exp;
    const needed = Math.max(1, totalExp - currentTotal);
    const { pet: updatedPet, levelUp } = grantRewards(5, needed);
    setPet(updatedPet);
    if (levelUp) {
      setLevelUpResult(levelUp);
    }
  }, []);

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
        <div className="relative flex flex-col items-center mb-6 min-h-[320px] justify-center">
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

          {/* Pixel art pet - now with touch interactions */}
          <PetSprite
            stage={pet.stage}
            hp={pet.hp}
            maxHp={pet.maxHp}
            happiness={pet.happiness}
            streak={profile.streak}
            onTap={handlePetTap}
            onLongPress={handlePetLongPress}
          />

          {/* Pet name */}
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
            <p className="text-lg font-bold text-foreground">{profile.consecutiveLoginDays || profile.streak}일</p>
          </div>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => {
              const days = profile.consecutiveLoginDays || profile.streak;
              return (
                <div
                  key={i}
                  className={`h-5 w-1.5 rounded-full ${
                    i < (days % 7 || (days > 0 ? 7 : 0)) ? 'gradient-primary' : 'bg-muted'
                  }`}
                />
              );
            })}
          </div>
        </motion.div>
        {/* Debug toggle */}
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mx-auto"
        >
          <Bug size={12} />
          디버그 모드
        </button>

        {/* Debug panel */}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 glass-card p-4 space-y-3 border border-destructive/30">
                <p className="text-xs font-bold text-destructive flex items-center gap-1">
                  <Bug size={12} /> 디버그 패널 (테스트용)
                </p>
                <p className="text-[10px] text-muted-foreground">
                  현재: Lv.{pet.level} | {pet.stage} | EXP {pet.exp}/{getRequiredExp(pet.level)}
                </p>
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium">EXP 추가:</p>
                  <div className="flex gap-2 flex-wrap">
                    {[50, 200, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleDebugExp(amount)}
                        className="flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Zap size={10} /> +{amount}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground font-medium">빠른 진화 (레벨 점프):</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleDebugSetLevel(15)}
                      className="rounded-lg bg-secondary/10 border border-secondary/30 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/20 transition-colors"
                    >
                      Lv.15 (진화 직전)
                    </button>
                    <button
                      onClick={() => handleDebugSetLevel(16)}
                      className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      Lv.16 → 리자드 진화!
                    </button>
                    <button
                      onClick={() => handleDebugSetLevel(35)}
                      className="rounded-lg bg-secondary/10 border border-secondary/30 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/20 transition-colors"
                    >
                      Lv.35 (진화 직전)
                    </button>
                    <button
                      onClick={() => handleDebugSetLevel(36)}
                      className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      Lv.36 → 리자몽 진화!
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('routinmon-pet');
                    localStorage.removeItem('routinmon-attendance');
                    setPet(getPet());
                    toast('🔄 펫 초기화 완료');
                  }}
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  🔄 펫 데이터 초기화
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />

      {/* Level Up Overlay */}
      <LevelUpOverlay
        result={levelUpResult}
        pet={pet}
        onClose={() => setLevelUpResult(null)}
      />

      {/* Attendance Bonus Overlay */}
      {attendanceData && (
        <AttendanceBonus
          show={showAttendance}
          consecutiveDays={attendanceData.consecutiveDays}
          bonusFood={attendanceData.bonusFood}
          bonusExp={attendanceData.bonusExp}
          onClose={handleAttendanceClose}
        />
      )}
    </div>
  );
}
