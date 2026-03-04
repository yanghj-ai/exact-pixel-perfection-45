import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LevelUpResult, PokemonStage } from '@/lib/pet';
import { getStageInfo } from '@/lib/pet';
import PetSprite from './PetSprite';
import type { PetState } from '@/lib/pet';

interface LevelUpOverlayProps {
  result: LevelUpResult | null;
  pet: PetState;
  onClose: () => void;
}

function getPreviousStage(stage: PokemonStage): PokemonStage {
  if (stage === 'charizard') return 'charmeleon';
  if (stage === 'charmeleon') return 'charmander';
  return 'charmander';
}

const LevelUpOverlay = React.forwardRef<HTMLDivElement, LevelUpOverlayProps>(function LevelUpOverlay({ result, pet, onClose }, ref) {
  const [phase, setPhase] = useState<'enter' | 'glow' | 'evolve' | 'reveal' | 'done'>('enter');

  const isEvolution = result?.evolved && result?.newStage;
  const stageInfo = isEvolution ? getStageInfo(result.newStage!) : null;
  const prevStage = isEvolution ? getPreviousStage(result.newStage!) : null;
  const prevStageInfo = prevStage ? getStageInfo(prevStage) : null;

  useEffect(() => {
    if (!result) return;
    if (!isEvolution) {
      // Simple level up: quick sequence
      setPhase('reveal');
      return;
    }
    // Evolution sequence
    const timers = [
      setTimeout(() => setPhase('glow'), 800),
      setTimeout(() => setPhase('evolve'), 2200),
      setTimeout(() => setPhase('reveal'), 3500),
      setTimeout(() => setPhase('done'), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [result, isEvolution]);

  if (!result) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        onClick={phase === 'reveal' || phase === 'done' || !isEvolution ? onClose : undefined}
      >
        {/* Animated background */}
        <motion.div
          className="absolute inset-0"
          initial={{ background: 'hsl(var(--background) / 0.8)' }}
          animate={
            phase === 'glow' || phase === 'evolve'
              ? { background: 'hsl(var(--background) / 0.95)' }
              : { background: 'hsl(var(--background) / 0.85)' }
          }
          style={{ backdropFilter: 'blur(12px)' }}
        />

        {/* Radial light burst during evolution */}
        {isEvolution && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              width: 500,
              height: 500,
              background: 'radial-gradient(circle, hsl(var(--flame) / 0.6) 0%, hsl(var(--amber) / 0.3) 30%, transparent 70%)',
              borderRadius: '50%',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              phase === 'glow'
                ? { scale: [0, 1.5], opacity: [0, 0.8] }
                : phase === 'evolve'
                ? { scale: [1.5, 3, 0], opacity: [0.8, 1, 0] }
                : { scale: 0, opacity: 0 }
            }
            transition={{ duration: phase === 'evolve' ? 1.3 : 1.4, ease: 'easeInOut' }}
          />
        )}

        {/* Rotating light rays */}
        {isEvolution && (phase === 'glow' || phase === 'evolve') && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`ray-${i}`}
                className="absolute pointer-events-none"
                style={{
                  width: 3,
                  height: 200,
                  background: `linear-gradient(to top, hsl(var(--flame) / 0.5), transparent)`,
                  transformOrigin: 'bottom center',
                  rotate: `${i * 30}deg`,
                }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: [0, 0.7, 0], scaleY: [0, 1, 0] }}
                transition={{ duration: 2, delay: i * 0.08, ease: 'easeOut' }}
              />
            ))}
          </>
        )}

        {/* Sparkle particles throughout */}
        {[...Array(isEvolution ? 20 : 10)].map((_, i) => (
          <motion.div
            key={`spark-${i}`}
            className="absolute pointer-events-none"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              borderRadius: '50%',
              background: i % 3 === 0
                ? 'hsl(var(--flame))'
                : i % 3 === 1
                ? 'hsl(var(--amber))'
                : 'hsl(var(--foreground))',
            }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: (Math.random() - 0.5) * 300,
              y: (Math.random() - 0.5) * 400,
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 1.5 + Math.random(),
              delay: (isEvolution ? 1.5 : 0.2) + i * 0.12,
              repeat: Infinity,
              repeatDelay: 1.5 + Math.random() * 2,
            }}
          />
        ))}

        {/* Main content container */}
        <div className="relative flex flex-col items-center gap-4 p-8 z-10">

          {/* === EVOLUTION SEQUENCE === */}
          {isEvolution && (
            <>
              {/* Phase: Before (show old form) */}
              <AnimatePresence mode="wait">
                {(phase === 'enter' || phase === 'glow') && prevStage && (
                  <motion.div
                    key="old-pet"
                    className="relative"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={
                      phase === 'glow'
                        ? { scale: [1, 1.1, 1], opacity: 1, filter: ['brightness(1)', 'brightness(3)', 'brightness(5)'] }
                        : { scale: 1, opacity: 1 }
                    }
                    exit={{ scale: 2, opacity: 0, filter: 'brightness(10)' }}
                    transition={{ duration: phase === 'glow' ? 1.4 : 0.6 }}
                  >
                    <PetSprite stage={prevStage} hp={100} maxHp={100} happiness={5} streak={7} size="normal" />
                    {phase === 'glow' && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'radial-gradient(circle, hsl(var(--flame) / 0.4), transparent 60%)' }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                )}

                {/* Phase: Evolve (white flash + silhouette) */}
                {phase === 'evolve' && (
                  <motion.div
                    key="evolve-flash"
                    className="relative flex items-center justify-center"
                    style={{ width: 280, height: 280 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="absolute rounded-full"
                      style={{
                        width: 200,
                        height: 200,
                        background: 'radial-gradient(circle, hsl(var(--primary-foreground)), hsl(var(--flame) / 0.5))',
                      }}
                      animate={{ scale: [0.5, 1.5, 0.8], opacity: [1, 0.8, 0] }}
                      transition={{ duration: 1.3 }}
                    />
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.3, 1], opacity: [0, 0.5, 1] }}
                      transition={{ duration: 1, delay: 0.5 }}
                    >
                      <PetSprite stage={pet.stage} hp={pet.maxHp} maxHp={pet.maxHp} happiness={5} streak={7} size="normal" />
                    </motion.div>
                  </motion.div>
                )}

                {/* Phase: Reveal (new form with comparison) */}
                {(phase === 'reveal' || phase === 'done') && (
                  <motion.div
                    key="new-pet"
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 150, damping: 12 }}
                    className="flex flex-col items-center gap-6"
                  >
                    {/* Before → After comparison */}
                    <motion.div
                      className="flex items-center gap-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {/* Before */}
                      <div className="flex flex-col items-center gap-1 opacity-50">
                        <div className="w-20 h-20">
                          <PetSprite stage={prevStage!} hp={100} maxHp={100} happiness={5} streak={7} size="small" />
                        </div>
                        <span className="text-xs text-muted-foreground">{prevStageInfo?.name}</span>
                      </div>

                      {/* Arrow */}
                      <motion.div
                        className="text-2xl text-gradient-primary font-bold"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        →
                      </motion.div>

                      {/* After (highlighted) */}
                      <div className="flex flex-col items-center gap-1">
                        <motion.div
                          className="w-24 h-24 relative"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <PetSprite stage={pet.stage} hp={pet.maxHp} maxHp={pet.maxHp} happiness={5} streak={7} size="small" />
                          <motion.div
                            className="absolute -inset-2 rounded-full pointer-events-none"
                            style={{ background: 'radial-gradient(circle, hsl(var(--flame) / 0.2), transparent 70%)' }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </motion.div>
                        <span className="text-sm font-bold text-foreground">{stageInfo?.name}</span>
                      </div>
                    </motion.div>

                    {/* Title */}
                    <motion.div
                      initial={{ y: 20, opacity: 0, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                      className="text-center"
                    >
                      <h2 className="text-4xl font-bold text-gradient-primary mb-1">🐉 진화 성공!</h2>
                      <p className="text-lg text-foreground">
                        {prevStageInfo?.name} → <span className="font-bold">{stageInfo?.name}</span>
                      </p>
                    </motion.div>

                    {/* Stats card */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, type: 'spring' }}
                      className="glass-card px-6 py-3 text-center space-y-1"
                    >
                      <p className="text-sm text-muted-foreground">
                        Lv.{result.newLevel} 달성! {result.levelsGained > 1 && `(${result.levelsGained}레벨 ↑)`}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        HP {pet.maxHp}으로 완전 회복! 💪
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* "What's happening" text during glow/evolve */}
              {(phase === 'enter' || phase === 'glow') && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: [0, 1, 0.6], y: 0 }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="text-lg font-bold text-gradient-primary text-center"
                >
                  어...? 뭔가 일어나고 있어! ✨
                </motion.p>
              )}
              {phase === 'evolve' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xl font-bold text-gradient-primary text-center"
                >
                  진화 중... 🔥
                </motion.p>
              )}
            </>
          )}

          {/* === SIMPLE LEVEL UP === */}
          {!isEvolution && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, delay: 0.3 }}
              >
                <PetSprite stage={pet.stage} hp={pet.maxHp} maxHp={pet.maxHp} happiness={5} streak={7} />
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <h2 className="text-3xl font-bold text-gradient-primary mb-1">레벨 업!</h2>
                <p className="text-xl font-bold text-foreground">Lv.{result.newLevel} 달성! 🎉</p>
              </motion.div>

              {result.levelsGained > 1 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                  className="glass-card px-6 py-3 text-center"
                >
                  <p className="text-sm text-muted-foreground">{result.levelsGained}레벨 상승!</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Close hint */}
          {(phase === 'reveal' || phase === 'done' || !isEvolution) && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.3] }}
              transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
              className="text-xs text-muted-foreground mt-4"
            >
              탭하여 닫기
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default LevelUpOverlay;
