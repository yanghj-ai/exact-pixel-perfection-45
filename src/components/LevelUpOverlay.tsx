import { motion, AnimatePresence } from 'framer-motion';
import type { LevelUpResult } from '@/lib/pet';
import { getStageInfo } from '@/lib/pet';
import PetSprite from './PetSprite';
import type { PetState } from '@/lib/pet';

interface LevelUpOverlayProps {
  result: LevelUpResult | null;
  pet: PetState;
  onClose: () => void;
}

export default function LevelUpOverlay({ result, pet, onClose }: LevelUpOverlayProps) {
  if (!result) return null;

  const isEvolution = result.evolved && result.newStage;
  const stageInfo = isEvolution ? getStageInfo(result.newStage!) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center gap-4 p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fireworks */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl pointer-events-none"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                x: Math.cos((i * Math.PI * 2) / 8) * 120,
                y: Math.sin((i * Math.PI * 2) / 8) * 120,
              }}
              transition={{ duration: 1.5, delay: 0.3 + i * 0.1, repeat: Infinity, repeatDelay: 2 }}
            >
              {i % 3 === 0 ? '✨' : i % 3 === 1 ? '🔥' : '⭐'}
            </motion.div>
          ))}

          {/* Pet */}
          <motion.div
            animate={isEvolution ? { scale: [1, 1.3, 1], rotate: [0, 360] } : { scale: [1, 1.15, 1] }}
            transition={{ duration: isEvolution ? 1.5 : 1, delay: 0.5 }}
          >
            <PetSprite stage={pet.stage} hp={pet.maxHp} maxHp={pet.maxHp} happiness={5} streak={7} />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            {isEvolution ? (
              <>
                <h2 className="text-3xl font-bold text-gradient-primary mb-1">진화!</h2>
                <p className="text-xl font-bold text-foreground">{stageInfo?.name}(으)로 진화했어! 🐉</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gradient-primary mb-1">레벨 업!</h2>
                <p className="text-xl font-bold text-foreground">Lv.{result.newLevel} 달성! 🎉</p>
              </>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: 'spring' }}
            className="glass-card px-6 py-3 text-center"
          >
            <p className="text-sm text-muted-foreground">
              {result.levelsGained > 1 && `${result.levelsGained}레벨 상승! `}
              {isEvolution && `HP ${pet.maxHp}으로 회복!`}
            </p>
          </motion.div>

          {/* Close hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0.3] }}
            transition={{ delay: 2, duration: 2, repeat: Infinity }}
            className="text-xs text-muted-foreground mt-4"
          >
            탭하여 닫기
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
