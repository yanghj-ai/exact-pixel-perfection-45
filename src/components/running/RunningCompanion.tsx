// ═══════════════════════════════════════════════════════════
// FIX #8: 러닝 동반 포켓몬 연출 컴포넌트
// 화면 하단 40%, 7가지 애니메이션 상태, 마일스톤 리액션
// AMOLED 모드 대비 최적화
// ═══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from 'framer-motion';
import { type CompanionAnimState, isAtMilestone, RUNNING_MILESTONES } from '@/lib/constants';
import { type PokemonSpecies } from '@/lib/pokemon-registry';

interface RunningCompanionProps {
  species: PokemonSpecies | null;
  currentPace: number | null;
  totalDistance: number;
  condition: number;
  isEncountering: boolean;
  dialogue: string | null;
  fallbackName: string;
  amoled?: boolean;
}

function getAnimState(
  pace: number | null,
  totalDistance: number,
  condition: number,
  isEncountering: boolean,
): CompanionAnimState {
  if (condition <= 20) return 'tired';
  if (isEncountering) return 'encounter';
  if (isAtMilestone(totalDistance)) return 'cheer';
  if (!pace || pace === 0) return 'idle';
  if (pace > 8) return 'walk';
  if (pace > 5) return 'run';
  return 'sprint';
}

function getSpriteAnimation(state: CompanionAnimState) {
  const easeInOut = [0.42, 0, 0.58, 1] as const;
  switch (state) {
    case 'idle':
      return { y: [0, -4, 0], transition: { duration: 1.5, repeat: Infinity, ease: easeInOut } };
    case 'walk':
      return { x: [-2, 2, -2], y: [0, -3, 0], transition: { duration: 0.8, repeat: Infinity, ease: easeInOut } };
    case 'run':
      return { x: [-3, 3, -3], y: [0, -6, 0], transition: { duration: 0.5, repeat: Infinity, ease: easeInOut } };
    case 'sprint':
      return { x: [-4, 4, -4], y: [0, -8, 0], transition: { duration: 0.35, repeat: Infinity, ease: easeInOut } };
    case 'cheer':
      return { y: [0, -16, 0], rotate: [0, 10, -10, 0], transition: { duration: 0.6, repeat: 3 } };
    case 'encounter':
      return { y: [0, -10, 0], scale: [1, 1.1, 1], transition: { duration: 0.4, repeat: 2 } };
    case 'tired':
      return { x: [-1, 1, -1], y: [0, -1, 0], transition: { duration: 1.2, repeat: Infinity, ease: easeInOut } };
  }
}

function getStateEmoji(state: CompanionAnimState): string {
  return {
    idle: '😊',
    walk: '🚶',
    run: '🏃',
    sprint: '💨',
    cheer: '🎉',
    encounter: '❗',
    tired: '😰',
  }[state];
}

function getBackgroundEffect(state: CompanionAnimState, amoled: boolean) {
  const lineClass = amoled ? 'bg-white/20' : 'bg-foreground/10';
  const lineClassLight = amoled ? 'bg-white/10' : 'bg-foreground/5';
  switch (state) {
    case 'sprint':
      return (
        <>
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute h-[2px] ${lineClass} rounded-full`}
              style={{ left: `${15 + i * 18}%`, top: `${40 + i * 8}%`, width: `${20 + i * 5}px` }}
              animate={{ x: [-20, -60], opacity: [0.5, 0] }}
              transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </>
      );
    case 'run':
      return (
        <>
          {[...Array(2)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute h-[1px] ${lineClassLight} rounded-full`}
              style={{ left: `${20 + i * 25}%`, top: `${50 + i * 10}%`, width: '15px' }}
              animate={{ x: [-10, -40], opacity: [0.3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </>
      );
    case 'tired':
      return (
        <motion.span
          className="absolute top-[20%] right-[30%] text-lg"
          animate={{ y: [-2, -8], opacity: [1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          💧
        </motion.span>
      );
    default:
      return null;
  }
}

function getMilestoneReaction(distance: number): { text: string; emoji: string } | null {
  for (const m of RUNNING_MILESTONES) {
    if (distance >= m && distance < m + 0.05) {
      const reactions: Record<number, { text: string; emoji: string }> = {
        1:  { text: '1km! 좋은 출발이야!', emoji: '👍' },
        3:  { text: '3km 돌파! 대단해!', emoji: '🎊' },
        5:  { text: '5km! 우리 최고의 팀이야!', emoji: '⭐' },
        10: { text: '10km 달성! 전설이야!', emoji: '🏆' },
      };
      return reactions[m] || null;
    }
  }
  return null;
}

export default function RunningCompanion({
  species,
  currentPace,
  totalDistance,
  condition,
  isEncountering,
  dialogue,
  fallbackName,
  amoled = false,
}: RunningCompanionProps) {
  const animState = getAnimState(currentPace, totalDistance, condition, isEncountering);
  const spriteAnim = getSpriteAnimation(animState);
  const milestoneReaction = getMilestoneReaction(totalDistance);
  const displayDialogue = milestoneReaction?.text || dialogue;

  if (!species) return null;

  // AMOLED-aware style tokens
  const bubbleBg = amoled ? 'bg-white/10 border-white/20' : 'bg-card/80 border-border/50';
  const bubbleText = amoled ? 'text-white' : 'text-foreground';
  const stateText = amoled ? 'text-white/40' : 'text-muted-foreground';
  const spriteFilter = amoled ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none';

  return (
    <div className="relative w-full flex flex-col items-center justify-end" style={{ minHeight: '35vh' }}>
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {getBackgroundEffect(animState, amoled)}
      </div>

      {/* Encounter "!" effect */}
      <AnimatePresence>
        {animState === 'encounter' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-[10%] z-10"
          >
            <span className={`text-5xl font-black drop-shadow-lg ${amoled ? 'text-red-400' : 'text-primary'}`}>❗</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cheer sparkles */}
      <AnimatePresence>
        {animState === 'cheer' && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                  x: [0, (i % 2 ? 1 : -1) * (20 + i * 10)],
                  y: [0, -(20 + i * 8)],
                }}
                transition={{ duration: 1, delay: i * 0.1 }}
                className="absolute text-lg"
                style={{ bottom: '40%' }}
              >
                ✨
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Pokemon sprite — 128x128, glow on AMOLED */}
      <motion.img
        src={species.spriteUrl}
        alt={species.name}
        className="w-32 h-32 object-contain z-10"
        style={{ imageRendering: 'pixelated', filter: spriteFilter }}
        animate={spriteAnim}
      />

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {displayDialogue && (
          <motion.div
            key={displayDialogue}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5 }}
            className={`mt-2 px-4 py-2 rounded-2xl backdrop-blur border max-w-[250px] z-10 ${bubbleBg}`}
          >
            <p className={`text-xs text-center ${bubbleText}`}>
              {milestoneReaction?.emoji && <span className="mr-1">{milestoneReaction.emoji}</span>}
              {displayDialogue}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* State indicator */}
      <div className="flex items-center gap-1 mt-1 opacity-50">
        <span className="text-xs">{getStateEmoji(animState)}</span>
        <span className={`text-[10px] capitalize ${stateText}`}>{animState}</span>
      </div>
    </div>
  );
}
