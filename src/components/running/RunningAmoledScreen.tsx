import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Pause, Square } from 'lucide-react';
import { formatDuration, formatPace } from '@/lib/running';
import { getPokemonById } from '@/lib/pokemon-registry';
import { calculateAutoMultiplier, getNextTier } from '@/lib/auto-multiplier';

interface RunningAmoledScreenProps {
  elapsed: number;
  distanceKm: number;
  pace: number | null;
  encounterCount: number;
  companionSpeciesId: number | null;
  companionName: string;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  legendaryMissionName?: string;
  legendaryMissionTargetKm?: number;
  legendaryMissionProgress?: number;
  streakDays?: number;
  estimatedExp?: number;
  estimatedCoins?: number;
}

export default function RunningAmoledScreen({
  elapsed,
  distanceKm,
  pace,
  encounterCount,
  companionSpeciesId,
  companionName,
  isPaused,
  onPause,
  onResume,
  onStop,
  legendaryMissionName,
  legendaryMissionTargetKm,
  legendaryMissionProgress,
  streakDays = 0,
  estimatedExp = 0,
  estimatedCoins = 0,
}: RunningAmoledScreenProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [unlockProgress, setUnlockProgress] = useState(0);
  const unlockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoLockRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const companionSpecies = companionSpeciesId ? getPokemonById(companionSpeciesId) : null;

  // 3초 길게 누르기로 잠금 해제
  const handleUnlockStart = useCallback(() => {
    if (!isLocked) return;
    setUnlockProgress(0);
    let progress = 0;
    unlockTimerRef.current = setInterval(() => {
      progress += 3.33; // ~3초에 100%
      setUnlockProgress(Math.min(100, progress));
      if (progress >= 100) {
        if (unlockTimerRef.current) clearInterval(unlockTimerRef.current);
        setIsLocked(false);
        if ('vibrate' in navigator) navigator.vibrate(200);
      }
    }, 100);
  }, [isLocked]);

  const handleUnlockEnd = useCallback(() => {
    if (unlockTimerRef.current) {
      clearInterval(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    setUnlockProgress(0);
  }, []);

  // 잠금 해제 후 10초 후 자동 재잠금
  useEffect(() => {
    if (!isLocked) {
      autoLockRef.current = setTimeout(() => {
        setIsLocked(true);
      }, 10000);
    }
    return () => {
      if (autoLockRef.current) clearTimeout(autoLockRef.current);
    };
  }, [isLocked]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) clearInterval(unlockTimerRef.current);
      if (autoLockRef.current) clearTimeout(autoLockRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col select-none" style={{ touchAction: isLocked ? 'none' : 'auto' }}>
      {/* Touch blocker when locked */}
      {isLocked && (
        <div
          className="absolute inset-0 z-50"
          onPointerDown={(e) => e.preventDefault()}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Elapsed time - top */}
        <p className="text-white/60 text-lg font-mono tabular-nums tracking-wider mb-4">
          {formatDuration(elapsed)}
        </p>

        {/* Distance - center main */}
        <motion.p
          key={Math.floor(distanceKm * 10)}
          initial={{ scale: 1.01 }}
          animate={{ scale: 1 }}
          className="text-white text-[96px] font-black tabular-nums leading-none tracking-tight"
        >
          {distanceKm.toFixed(2)}
        </motion.p>
        <p className="text-white/40 text-base font-medium mt-1">km</p>

        {/* Pace - below distance */}
        <p className="text-white/70 text-4xl font-bold tabular-nums mt-6">
          {pace ? formatPace(pace) : "-'--\""}
          <span className="text-white/30 text-lg ml-1">/km</span>
        </p>

        {/* Real-time reward counters (FIX #4) */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">⚡</span>
            <motion.span
              key={estimatedExp}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-white/70 text-sm font-bold tabular-nums"
            >
              {estimatedExp}
            </motion.span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🪙</span>
            <motion.span
              key={estimatedCoins}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-white/70 text-sm font-bold tabular-nums"
            >
              {estimatedCoins}
            </motion.span>
          </div>
          {(() => {
            const mult = calculateAutoMultiplier(distanceKm, streakDays);
            return mult.exp > 1 ? (
              <div className="flex items-center gap-1">
                <span className="text-sm">{mult.emoji}</span>
                <span className="text-white/50 text-xs font-bold">×{mult.exp.toFixed(1)}</span>
              </div>
            ) : null;
          })()}
        </div>

        {/* Next multiplier tier hint */}
        {(() => {
          const next = getNextTier(distanceKm);
          return next ? (
            <p className="text-white/20 text-[10px] mt-2 tabular-nums">
              {next.km}km 달성 시 ×{next.mult} 배율
            </p>
          ) : null;
        })()}

        {/* Legendary mission progress */}
        {legendaryMissionName && legendaryMissionTargetKm && (
          <div className="mt-6 w-full max-w-xs px-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/50 text-xs">{legendaryMissionName} 미션</span>
              <span className="text-white/70 text-xs font-bold tabular-nums">
                {distanceKm.toFixed(1)}/{legendaryMissionTargetKm}km
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white/40"
                initial={false}
                animate={{ width: `${Math.min(100, (legendaryMissionProgress ?? 0))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="px-6 pb-6">
        {/* Companion + encounter count */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {companionSpecies && (
              <img
                src={companionSpecies.spriteUrl}
                alt={companionName}
                className="w-8 h-8 object-contain"
                style={{ imageRendering: 'pixelated', filter: 'brightness(0.8)' }}
              />
            )}
            <span className="text-white/50 text-sm">{companionName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white/50 text-sm">🎮 포켓몬</span>
            <span className="text-white/80 text-sm font-bold tabular-nums">{encounterCount}마리</span>
          </div>
        </div>

        {/* Controls area */}
        <AnimatePresence mode="wait">
          {isLocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              {/* Unlock button */}
              <div
                className="relative w-16 h-16 flex items-center justify-center"
                onPointerDown={handleUnlockStart}
                onPointerUp={handleUnlockEnd}
                onPointerLeave={handleUnlockEnd}
                onPointerCancel={handleUnlockEnd}
                style={{ touchAction: 'none', zIndex: 60, position: 'relative' }}
              >
                {/* Progress ring */}
                <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="3"
                    strokeDasharray={`${unlockProgress * 1.76} 176`}
                    strokeLinecap="round"
                    className="transition-all duration-100"
                  />
                </svg>
                <Lock className="w-5 h-5 text-white/40" />
              </div>
              <p className="text-white/20 text-[10px] mt-2">3초 길게 눌러 잠금 해제</p>
            </motion.div>
          ) : (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-1 text-white/30 text-[10px]">
                <Unlock className="w-3 h-3" />
                <span>10초 후 자동 잠금</span>
              </div>
              <div className="flex items-center gap-4">
                {isPaused ? (
                  <button
                    onClick={onResume}
                    className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:bg-white/20"
                  >
                    <span className="text-white text-2xl ml-0.5">▶</span>
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:bg-white/20"
                  >
                    <Pause className="w-6 h-6 text-white" />
                  </button>
                )}
                <button
                  onClick={onStop}
                  className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center active:bg-red-500/30"
                >
                  <Square className="w-6 h-6 text-red-400" />
                </button>
              </div>
              <button
                onClick={() => setIsLocked(true)}
                className="text-white/20 text-[10px] underline mt-1"
              >
                다시 잠그기
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Paused overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 pointer-events-none">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white/60 text-2xl font-bold"
          >
            일시정지
          </motion.p>
        </div>
      )}
    </div>
  );
}
