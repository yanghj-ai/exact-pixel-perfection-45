import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonById, RARITY_CONFIG } from '@/lib/pokemon-registry';
import type { PokemonEgg } from '@/lib/collection';

interface EggHatchOverlayProps {
  hatchedEggs: PokemonEgg[];
  onComplete: () => void;
}

export default function EggHatchOverlay({ hatchedEggs, onComplete }: EggHatchOverlayProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'crack' | 'reveal'>('crack');

  const currentEgg = hatchedEggs[currentIdx];
  const species = currentEgg ? getPokemonById(currentEgg.speciesId) : null;
  const rarityConf = currentEgg ? RARITY_CONFIG[currentEgg.rarity] : null;

  useEffect(() => {
    if (!currentEgg) {
      onComplete();
      return;
    }
    setPhase('crack');
    const t1 = setTimeout(() => setPhase('reveal'), 1800);
    return () => clearTimeout(t1);
  }, [currentIdx]);

  const handleNext = () => {
    if (currentIdx < hatchedEggs.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      onComplete();
    }
  };

  if (!currentEgg || !species || !rarityConf) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={phase === 'reveal' ? handleNext : undefined}
    >
      <div className="text-center px-8 max-w-sm">
        {/* Egg count */}
        {hatchedEggs.length > 1 && (
          <p className="text-xs text-muted-foreground mb-4">
            {currentIdx + 1} / {hatchedEggs.length}
          </p>
        )}

        <AnimatePresence mode="wait">
          {phase === 'crack' && (
            <motion.div
              key="crack"
              initial={{ scale: 1 }}
              animate={{
                scale: [1, 1.05, 1, 1.08, 1, 1.1, 1.15],
                rotate: [0, -3, 3, -5, 5, -8, 0],
              }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              className="relative"
            >
              {/* Egg */}
              <div className="w-28 h-36 mx-auto relative">
                <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-card to-muted border-2 border-border shadow-xl" />
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-16 h-[2px] bg-border/50 rotate-[-15deg]" />
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-12 h-[2px] bg-border/50 rotate-[10deg]" />
                {/* Rarity glow */}
                <motion.div
                  className="absolute -inset-4 rounded-full"
                  style={{ background: `radial-gradient(circle, ${rarityConf.color}40 0%, transparent 70%)` }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              </div>
              {/* Crack particles */}
              <motion.div
                className="absolute top-1/2 left-1/2"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.4, repeat: 3, delay: 0.6 }}
              >
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{
                      x: Math.cos((i * Math.PI * 2) / 6) * 40,
                      y: Math.sin((i * Math.PI * 2) / 6) * 40,
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 0.4, delay: 1.2 + i * 0.05 }}
                  />
                ))}
              </motion.div>

              <motion.p
                className="mt-6 text-sm text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                알이 부화하고 있다...!
              </motion.p>
            </motion.div>
          )}

          {phase === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            >
              {/* Light burst */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 1 }}
                style={{ background: `radial-gradient(circle, ${rarityConf.color}60 0%, transparent 60%)` }}
              />

              {/* Pokémon sprite */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-4"
              >
                <div className="w-28 h-28 mx-auto rounded-2xl bg-card/80 border-2 border-border shadow-2xl flex items-center justify-center">
                  <img
                    src={species.spriteUrl}
                    alt={species.name}
                    className="w-24 h-24 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              </motion.div>

              {/* Name & info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-bold text-primary-foreground">
                  {species.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  알에서 태어났다!
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${rarityConf.bgColor} text-foreground`}>
                    {rarityConf.emoji} {rarityConf.label}
                  </span>
                </div>
              </motion.div>

              {/* Sparkles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-lg"
                  style={{
                    top: `${30 + Math.random() * 40}%`,
                    left: `${10 + Math.random() * 80}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                  transition={{ duration: 1.5, delay: 0.5 + i * 0.15, repeat: Infinity, repeatDelay: 2 }}
                >
                  ✨
                </motion.div>
              ))}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-[10px] text-muted-foreground mt-6"
              >
                탭하여 계속
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
