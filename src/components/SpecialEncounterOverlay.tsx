// ═══════════════════════════════════════════════════════════
// 특수 조우 / 전설 포켓몬 포획 성공 연출 오버레이
// ═══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonById } from '@/lib/pokemon-registry';

interface SpecialEncounterOverlayProps {
  show: boolean;
  speciesId: number | null;
  type: 'legendary' | 'event' | 'catch';
  onClose: () => void;
}

export default function SpecialEncounterOverlay({ show, speciesId, type, onClose }: SpecialEncounterOverlayProps) {
  if (!show || !speciesId) return null;

  const species = getPokemonById(speciesId);
  if (!species) return null;

  const titles = {
    legendary: '🌟 전설의 포켓몬 포획!',
    event: '✨ 특별한 조우!',
    catch: '🎉 포획 성공!',
  };

  const subtitles = {
    legendary: `전설의 ${species.name}이(가) 동료가 되었습니다!`,
    event: `특별한 ${species.name}이(가) 나타났습니다!`,
    catch: `야생의 ${species.name}을(를) 포획했습니다!`,
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            onClick={e => e.stopPropagation()}
            className="flex flex-col items-center gap-4 p-8"
          >
            {/* Sparkle ring */}
            <motion.div
              className="relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute inset-0 w-40 h-40 rounded-full border-2 border-secondary/30" />
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-secondary"
                  style={{
                    top: `${50 + 48 * Math.sin((i / 8) * Math.PI * 2)}%`,
                    left: `${50 + 48 * Math.cos((i / 8) * Math.PI * 2)}%`,
                  }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.5, 1.2, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>

            {/* Pokémon sprite */}
            <motion.img
              src={species.spriteUrl}
              alt={species.name}
              className="w-32 h-32 object-contain -mt-36"
              style={{ imageRendering: 'pixelated' }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Title */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="text-xl font-bold text-primary-foreground">{titles[type]}</p>
              <p className="text-sm text-primary-foreground/70 mt-1">{subtitles[type]}</p>
            </motion.div>

            {/* Close button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-4 gradient-primary text-primary-foreground rounded-2xl px-8 py-3 font-bold text-sm"
            >
              확인
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
