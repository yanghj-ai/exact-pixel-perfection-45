import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonById } from '@/lib/pokemon-registry';
import type { LegendaryDefinition } from '@/lib/legendary';

interface LegendaryCutsceneProps {
  definition: LegendaryDefinition;
  onComplete: () => void;
}

const CUTSCENE_THEMES: Record<number, { bg: string; accent: string }> = {
  144: { bg: 'from-blue-900 via-cyan-800 to-blue-900', accent: 'text-cyan-200' },
  145: { bg: 'from-yellow-900 via-amber-800 to-yellow-900', accent: 'text-yellow-200' },
  146: { bg: 'from-red-900 via-orange-800 to-red-900', accent: 'text-orange-200' },
  150: { bg: 'from-purple-900 via-violet-800 to-purple-900', accent: 'text-violet-200' },
  151: { bg: 'from-pink-900 via-rose-800 to-pink-900', accent: 'text-pink-200' },
};

const CUTSCENE_LINES: Record<number, string[]> = {
  144: [
    '화면 전체가 푸른 빛으로 물듭니다...',
    '얼음 속에서 거대한 날개가 펼쳐집니다.',
    '"너의 꾸준함이 얼어붙은 내 마음을 녹였다."',
    '프리져가 합류했습니다! ❄️',
  ],
  145: [
    '하늘에 번개가 연달아 내리칩니다!',
    '전광석화처럼 썬더가 눈앞에 나타납니다.',
    '"네 속도... 인정한다."',
    '썬더가 합류했습니다! ⚡',
  ],
  146: [
    '하늘이 붉게 타오릅니다...',
    '불꽃 속에서 불사조가 강림합니다.',
    '"꺼지지 않는 불꽃을 가진 자여, 함께 하겠다."',
    '파이어가 합류했습니다! 🔥',
  ],
  150: [
    '보라색 에너지가 공간을 일그러뜨립니다...',
    '뮤에서 뮤츠로... 진화가 시작됩니다.',
    '"한계를 넘은 자만이 이 힘을 다스릴 수 있다."',
    '뮤츠가 합류했습니다! 🔮',
  ],
  151: [
    '지금까지 달린 모든 경로가 빛나는 선으로 표시됩니다...',
    '분홍빛 구체가 하늘에서 내려옵니다.',
    '"처음부터 함께였어요. 이제 보이게 된 것뿐."',
    '뮤가 합류했습니다! ✨',
  ],
};

export default function LegendaryCutscene({ definition, onComplete }: LegendaryCutsceneProps) {
  const [step, setStep] = useState(0);
  const theme = CUTSCENE_THEMES[definition.speciesId] || CUTSCENE_THEMES[144];
  const lines = CUTSCENE_LINES[definition.speciesId] || CUTSCENE_LINES[144];
  const species = getPokemonById(definition.speciesId);

  const isLast = step >= lines.length - 1;
  const showPokemon = step >= 2;

  const handleTap = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-gradient-to-b ${theme.bg} flex flex-col items-center justify-center cursor-pointer`}
      onClick={handleTap}
    >
      {/* Flash effect on first step */}
      <AnimatePresence>
        {step === 0 && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-white z-10"
          />
        )}
      </AnimatePresence>

      {/* Pokemon reveal */}
      <AnimatePresence>
        {showPokemon && species && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="mb-8"
          >
            <motion.img
              src={species.spriteUrl}
              alt={definition.name}
              className="w-48 h-48 object-contain"
              style={{ imageRendering: 'pixelated' }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Silhouette before reveal */}
      {!showPokemon && species && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1 }}
          className="mb-8"
        >
          <img
            src={species.spriteUrl}
            alt=""
            className="w-40 h-40 object-contain"
            style={{ imageRendering: 'pixelated', filter: 'brightness(0) drop-shadow(0 0 30px rgba(255,255,255,0.4))' }}
          />
        </motion.div>
      )}

      {/* Text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.6 }}
          className="text-center px-8 max-w-sm"
        >
          <p className={`text-lg font-medium ${theme.accent} leading-relaxed`}>
            {lines[step]}
          </p>
        </motion.div>
      </AnimatePresence>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 text-white/30 text-xs"
      >
        {isLast ? '탭하여 닫기' : '탭하여 계속'}
      </motion.p>
    </div>
  );
}
