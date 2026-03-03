import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonById } from '@/lib/pokemon-registry';

export interface ItemEffectData {
  type: 'level_up' | 'evolution';
  pokemonUid: string;
  // Level up
  levelBefore?: number;
  levelAfter?: number;
  levelsGained?: number;
  speciesId: number;
  // Evolution
  prevSpeciesId?: number;
  newSpeciesId?: number;
}

interface ItemEffectOverlayProps {
  effect: ItemEffectData | null;
  onClose: () => void;
}

export default function ItemEffectOverlay({ effect, onClose }: ItemEffectOverlayProps) {
  const [phase, setPhase] = useState<'enter' | 'glow' | 'evolve' | 'reveal'>('enter');

  const isEvolution = effect?.type === 'evolution';
  const prevSpecies = effect?.prevSpeciesId ? getPokemonById(effect.prevSpeciesId) : null;
  const newSpecies = effect?.newSpeciesId ? getPokemonById(effect.newSpeciesId) : null;
  const currentSpecies = effect ? getPokemonById(effect.speciesId) : null;

  useEffect(() => {
    if (!effect) return;
    setPhase('enter');

    if (!isEvolution) {
      // Simple level up: quick reveal
      const t = setTimeout(() => setPhase('reveal'), 400);
      return () => clearTimeout(t);
    }

    // Evolution sequence
    const timers = [
      setTimeout(() => setPhase('glow'), 600),
      setTimeout(() => setPhase('evolve'), 2000),
      setTimeout(() => setPhase('reveal'), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [effect, isEvolution]);

  if (!effect) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
        onClick={phase === 'reveal' ? onClose : undefined}
      >
        {/* Background */}
        <motion.div
          className="absolute inset-0"
          initial={{ background: 'rgba(0,0,0,0.7)' }}
          animate={
            phase === 'glow' || phase === 'evolve'
              ? { background: 'rgba(0,0,0,0.92)' }
              : { background: 'rgba(0,0,0,0.8)' }
          }
          style={{ backdropFilter: 'blur(16px)' }}
        />

        {/* Radial light burst for evolution */}
        {isEvolution && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              width: 400,
              height: 400,
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, hsl(var(--primary) / 0.2) 30%, transparent 70%)',
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
            transition={{ duration: phase === 'evolve' ? 1.2 : 1.3, ease: 'easeInOut' }}
          />
        )}

        {/* Rotating light rays for evolution */}
        {isEvolution && (phase === 'glow' || phase === 'evolve') && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`ray-${i}`}
                className="absolute pointer-events-none"
                style={{
                  width: 3,
                  height: 180,
                  background: `linear-gradient(to top, hsl(var(--primary) / 0.5), transparent)`,
                  transformOrigin: 'bottom center',
                  rotate: `${i * 30}deg`,
                }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: [0, 0.7, 0], scaleY: [0, 1, 0] }}
                transition={{ duration: 2, delay: i * 0.06, ease: 'easeOut' }}
              />
            ))}
          </>
        )}

        {/* Sparkle particles */}
        {[...Array(isEvolution ? 18 : 8)].map((_, i) => (
          <motion.div
            key={`spark-${i}`}
            className="absolute pointer-events-none"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              borderRadius: '50%',
              background: i % 3 === 0
                ? 'hsl(var(--primary))'
                : i % 3 === 1
                ? 'hsl(var(--secondary))'
                : 'hsl(var(--foreground))',
            }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: (Math.random() - 0.5) * 280,
              y: (Math.random() - 0.5) * 350,
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 1.2 + Math.random(),
              delay: (isEvolution ? 1.2 : 0.2) + i * 0.1,
              repeat: Infinity,
              repeatDelay: 1.5 + Math.random() * 2,
            }}
          />
        ))}

        {/* Main content */}
        <div className="relative flex flex-col items-center gap-4 p-8 z-10">

          {/* === EVOLUTION SEQUENCE === */}
          {isEvolution && prevSpecies && newSpecies && (
            <>
              <AnimatePresence mode="wait">
                {/* Before: old form */}
                {(phase === 'enter' || phase === 'glow') && (
                  <motion.div
                    key="old-form"
                    className="relative"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={
                      phase === 'glow'
                        ? { scale: [1, 1.1, 1], opacity: 1, filter: ['brightness(1)', 'brightness(3)', 'brightness(5)'] }
                        : { scale: 1, opacity: 1 }
                    }
                    exit={{ scale: 2, opacity: 0, filter: 'brightness(10)' }}
                    transition={{ duration: phase === 'glow' ? 1.4 : 0.5 }}
                  >
                    <img
                      src={prevSpecies.spriteUrl}
                      alt={prevSpecies.name}
                      className="w-28 h-28 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    {phase === 'glow' && (
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 60%)' }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                )}

                {/* Evolve: flash + new form appearing */}
                {phase === 'evolve' && (
                  <motion.div
                    key="evolve-flash"
                    className="relative flex items-center justify-center"
                    style={{ width: 200, height: 200 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="absolute rounded-full"
                      style={{
                        width: 180,
                        height: 180,
                        background: 'radial-gradient(circle, hsl(var(--primary-foreground)), hsl(var(--primary) / 0.5))',
                      }}
                      animate={{ scale: [0.5, 1.5, 0.8], opacity: [1, 0.8, 0] }}
                      transition={{ duration: 1.2 }}
                    />
                    <motion.img
                      src={newSpecies.spriteUrl}
                      alt={newSpecies.name}
                      className="w-28 h-28 object-contain relative z-10"
                      style={{ imageRendering: 'pixelated' }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.3, 1], opacity: [0, 0.5, 1] }}
                      transition={{ duration: 1, delay: 0.4 }}
                    />
                  </motion.div>
                )}

                {/* Reveal: final result */}
                {phase === 'reveal' && (
                  <motion.div
                    key="reveal-evo"
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 150, damping: 12 }}
                    className="flex flex-col items-center gap-5"
                  >
                    {/* Before → After */}
                    <motion.div
                      className="flex items-center gap-5"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex flex-col items-center gap-1 opacity-50">
                        <img src={prevSpecies.spriteUrl} alt={prevSpecies.name}
                          className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
                        <span className="text-[10px] text-muted-foreground">{prevSpecies.name}</span>
                      </div>
                      <motion.div
                        className="text-2xl font-bold text-primary"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >→</motion.div>
                      <div className="flex flex-col items-center gap-1">
                        <motion.img
                          src={newSpecies.spriteUrl}
                          alt={newSpecies.name}
                          className="w-24 h-24 object-contain"
                          style={{ imageRendering: 'pixelated' }}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-sm font-bold text-foreground">{newSpecies.name}</span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                      className="text-center"
                    >
                      <h2 className="text-3xl font-bold text-primary mb-1">✨ 진화 성공!</h2>
                      <p className="text-base text-foreground">
                        {prevSpecies.name} → <span className="font-bold">{newSpecies.name}</span>
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status text during glow/evolve */}
              {(phase === 'enter' || phase === 'glow') && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: [0, 1, 0.6], y: 0 }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="text-lg font-bold text-primary text-center"
                >
                  어...? 뭔가 일어나고 있어! ✨
                </motion.p>
              )}
              {phase === 'evolve' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xl font-bold text-primary text-center"
                >
                  진화 중... 🔥
                </motion.p>
              )}
            </>
          )}

          {/* === SIMPLE LEVEL UP === */}
          {!isEvolution && currentSpecies && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.img
                src={currentSpecies.spriteUrl}
                alt={currentSpecies.name}
                className="w-28 h-28 object-contain"
                style={{ imageRendering: 'pixelated' }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, delay: 0.3 }}
              />

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h2 className="text-3xl font-bold text-primary mb-1">레벨 업!</h2>
                <p className="text-lg font-bold text-foreground">
                  {currentSpecies.name} Lv.{effect?.levelAfter} 🎉
                </p>
                {(effect?.levelsGained ?? 0) > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {effect?.levelsGained}레벨 상승!
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Close hint */}
          {phase === 'reveal' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.3] }}
              transition={{ delay: 1, duration: 2, repeat: Infinity }}
              className="text-xs text-muted-foreground mt-4"
            >
              탭하여 닫기
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
