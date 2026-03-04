import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonById } from '@/lib/pokemon-registry';
import type { LegendaryDefinition } from '@/lib/legendary';

interface LegendaryStoryIntroProps {
  definition: LegendaryDefinition;
  onStart: () => void;
  onCancel: () => void;
}

const LEGENDARY_THEMES: Record<number, { bg: string; accent: string; particleEmoji: string }> = {
  144: { bg: 'from-blue-900/95 via-cyan-900/90 to-blue-950/95', accent: 'text-cyan-300', particleEmoji: '❄️' },
  145: { bg: 'from-yellow-900/95 via-amber-900/90 to-yellow-950/95', accent: 'text-yellow-300', particleEmoji: '⚡' },
  146: { bg: 'from-red-900/95 via-orange-900/90 to-red-950/95', accent: 'text-orange-300', particleEmoji: '🔥' },
  150: { bg: 'from-purple-900/95 via-violet-900/90 to-purple-950/95', accent: 'text-violet-300', particleEmoji: '🧬' },
  151: { bg: 'from-pink-900/95 via-rose-900/90 to-pink-950/95', accent: 'text-pink-300', particleEmoji: '✨' },
};

const LEGENDARY_TEXTS: Record<number, { lines: string[]; missionText: string }> = {
  144: {
    lines: [
      '새벽의 차가운 공기 속에서 푸른 깃털이 떨어집니다.',
      '얼어붙은 수호자가 당신의 꾸준함을 시험합니다.',
    ],
    missionText: '새벽 시간대(05:00~07:00)에 5km 완주',
  },
  145: {
    lines: [
      '하늘에서 번개가 내리칩니다.',
      '네 속도를 증명해봐.',
    ],
    missionText: '3km를 페이스 4:30/km 이하로 완주',
  },
  146: {
    lines: [
      '꺼지지 않는 불꽃은 포기하지 않는 자에게만 보입니다.',
      '30일의 의지를 증명하세요.',
    ],
    missionText: '10km 완주',
  },
  150: {
    lines: [
      '유전자 촉매를 사용하면 뮤의 한계를 넘어섭니다.',
      '준비되었습니까?',
    ],
    missionText: '10km 완주 (특별 스토리 러닝)',
  },
  151: {
    lines: [
      '처음부터 함께였어요.',
      '이제 보이게 된 것뿐.',
    ],
    missionText: '모든 챌린지 완료',
  },
};

export default function LegendaryStoryIntro({ definition, onStart, onCancel }: LegendaryStoryIntroProps) {
  const [step, setStep] = useState(0);
  const theme = LEGENDARY_THEMES[definition.speciesId] || LEGENDARY_THEMES[144];
  const texts = LEGENDARY_TEXTS[definition.speciesId] || LEGENDARY_TEXTS[144];
  const species = getPokemonById(definition.speciesId);

  const totalSteps = texts.lines.length;
  const isLastStep = step >= totalSteps;

  const handleNext = () => {
    if (isLastStep) return;
    setStep(s => s + 1);
  };

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-b ${theme.bg} flex flex-col`}>
      {/* Particle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-2xl opacity-30"
            initial={{ x: `${10 + Math.random() * 80}%`, y: '-10%' }}
            animate={{ y: '110%' }}
            transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: i * 0.5, ease: 'linear' }}
          >
            {theme.particleEmoji}
          </motion.span>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        {/* Pokemon silhouette/image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="mb-8"
        >
          {species ? (
            <img
              src={species.spriteUrl}
              alt={definition.name}
              className="w-40 h-40 object-contain"
              style={{
                imageRendering: 'pixelated',
                filter: step < totalSteps ? 'brightness(0) drop-shadow(0 0 20px rgba(255,255,255,0.3))' : 'none',
                transition: 'filter 0.5s ease',
              }}
            />
          ) : (
            <span className="text-8xl">{definition.emoji}</span>
          )}
        </motion.div>

        {/* Story text */}
        <AnimatePresence mode="wait">
          {!isLastStep ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
              onClick={handleNext}
            >
              <p className={`text-lg font-medium ${theme.accent} leading-relaxed`}>
                {texts.lines[step]}
              </p>
              <p className="text-white/30 text-xs mt-4">탭하여 계속</p>
            </motion.div>
          ) : (
            <motion.div
              key="mission"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center w-full max-w-sm"
            >
              <h2 className={`text-xl font-bold ${theme.accent} mb-2`}>
                {definition.emoji} {definition.name} 미션
              </h2>
              <p className="text-white/70 text-sm mb-1">{definition.mission.label}</p>
              <div className="bg-white/10 rounded-xl p-4 mb-6">
                <p className="text-white text-base font-medium">{texts.missionText}</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onStart}
                  className="w-full py-4 rounded-2xl bg-white/20 text-white font-bold text-lg active:bg-white/30 transition-colors"
                >
                  도전하기
                </button>
                <button
                  onClick={onCancel}
                  className="text-white/30 text-sm underline"
                >
                  나중에
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
