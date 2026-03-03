import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PokemonStage } from '@/lib/pet';
import charmanderSheet from '@/assets/charmander-spritesheet.png';
import charmeleonSheet from '@/assets/charmeleon-spritesheet.png';
import charizardSheet from '@/assets/charizard-spritesheet.png';

const SHEETS: Record<PokemonStage, string> = {
  charmander: charmanderSheet,
  charmeleon: charmeleonSheet,
  charizard: charizardSheet,
};

const FRAME_COUNT = 4;

type PetMood = 'ecstatic' | 'happy' | 'normal' | 'tired' | 'hungry' | 'critical' | 'lonely';

function getMood(hp: number, maxHp: number, happiness: number, streak: number): PetMood {
  const hpRatio = hp / maxHp;
  if (hpRatio <= 0) return 'critical';
  if (hpRatio <= 0.2) return 'hungry';
  if (streak <= 0 && happiness <= 1.5) return 'lonely';
  if (hpRatio <= 0.45 || happiness <= 1) return 'tired';
  if (hpRatio >= 0.8 && happiness >= 4 && streak >= 7) return 'ecstatic';
  if (hpRatio >= 0.7 && happiness >= 3 && streak >= 3) return 'happy';
  return 'normal';
}

// Mood-driven animation configs
const MOOD_CONFIG: Record<PetMood, {
  frameSpeed: number;
  bounce: { y: number[]; duration: number };
  filter: string;
  glowOpacity: number;
  particleType: 'flame' | 'sweat' | 'zzz' | 'hunger' | 'sparkle' | 'none' | 'hearts' | 'dust';
  statusEmoji: string;
  shadowScale: number;
}> = {
  ecstatic: {
    frameSpeed: 200,
    bounce: { y: [0, -14, 0], duration: 0.9 },
    filter: 'drop-shadow(0 6px 20px hsl(18 100% 60% / 0.5)) brightness(1.15) saturate(1.2)',
    glowOpacity: 0.3,
    particleType: 'hearts',
    statusEmoji: '🤩',
    shadowScale: 1.1,
  },
  happy: {
    frameSpeed: 250,
    bounce: { y: [0, -10, 0], duration: 1.2 },
    filter: 'drop-shadow(0 4px 16px hsl(18 100% 60% / 0.4)) brightness(1.1)',
    glowOpacity: 0.2,
    particleType: 'sparkle',
    statusEmoji: '😆',
    shadowScale: 1,
  },
  normal: {
    frameSpeed: 330,
    bounce: { y: [0, -6, 0], duration: 1.8 },
    filter: 'drop-shadow(0 4px 12px hsl(18 100% 60% / 0.3))',
    glowOpacity: 0.15,
    particleType: 'flame',
    statusEmoji: '',
    shadowScale: 1,
  },
  tired: {
    frameSpeed: 500,
    bounce: { y: [0, -3, 0], duration: 2.5 },
    filter: 'drop-shadow(0 2px 8px hsl(18 100% 60% / 0.15)) saturate(0.7) brightness(0.85)',
    glowOpacity: 0.06,
    particleType: 'sweat',
    statusEmoji: '😓',
    shadowScale: 0.9,
  },
  hungry: {
    frameSpeed: 600,
    bounce: { y: [0, -2, 0, -1, 0], duration: 3 },
    filter: 'drop-shadow(0 2px 6px hsl(0 0% 50% / 0.2)) saturate(0.5) brightness(0.75)',
    glowOpacity: 0.03,
    particleType: 'hunger',
    statusEmoji: '🥺',
    shadowScale: 0.85,
  },
  critical: {
    frameSpeed: 900,
    bounce: { y: [0, 2, 0], duration: 3.5 },
    filter: 'grayscale(0.7) brightness(0.5) drop-shadow(0 2px 4px hsl(0 0% 30% / 0.3))',
    glowOpacity: 0,
    particleType: 'zzz',
    statusEmoji: '😵',
    shadowScale: 0.7,
  },
  lonely: {
    frameSpeed: 700,
    bounce: { y: [0, -2, 0], duration: 3 },
    filter: 'drop-shadow(0 2px 6px hsl(210 30% 40% / 0.3)) saturate(0.4) brightness(0.7) hue-rotate(20deg)',
    glowOpacity: 0.02,
    particleType: 'dust',
    statusEmoji: '😢',
    shadowScale: 0.8,
  },
};

const DISPLAY_SIZES: Record<PokemonStage, number> = {
  charmander: 240,
  charmeleon: 260,
  charizard: 280,
};

interface PetSpriteProps {
  stage: PokemonStage;
  hp: number;
  maxHp: number;
  happiness?: number;
  streak?: number;
  className?: string;
  size?: 'normal' | 'small';
}

export default function PetSprite({ stage, hp, maxHp, happiness = 3, streak = 1, className = '', size = 'normal' }: PetSpriteProps) {
  const [frame, setFrame] = useState(0);
  const mood = getMood(hp, maxHp, happiness, streak);
  const config = MOOD_CONFIG[mood];
  const displaySize = size === 'small' ? 60 : DISPLAY_SIZES[stage];

  // Sprite frame animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % FRAME_COUNT);
    }, config.frameSpeed);
    return () => clearInterval(interval);
  }, [config.frameSpeed]);

  const frameOffset = useMemo(() => `${-(frame * 100 / FRAME_COUNT)}%`, [frame]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Ambient glow */}
      {config.glowOpacity > 0 && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: displaySize + 30,
            height: displaySize + 30,
            background: `radial-gradient(circle, hsl(var(--flame) / ${config.glowOpacity}), transparent 70%)`,
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Ground shadow */}
      <motion.div
        className="absolute rounded-[50%] bg-foreground/10"
        style={{
          width: displaySize * 0.4 * config.shadowScale,
          height: 8,
          bottom: size === 'small' ? -2 : 0,
        }}
        animate={{
          scaleX: [1, 0.85, 1],
          opacity: [0.25, 0.12, 0.25],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Status emoji indicator */}
      {config.statusEmoji && size === 'normal' && (
        <motion.div
          className="absolute z-20 text-2xl"
          style={{ top: -10, right: displaySize * 0.15 }}
          animate={{
            y: [0, -5, 0],
            rotate: mood === 'happy' ? [0, 10, -10, 0] : [0, -5, 5, 0],
            scale: mood === 'happy' ? [1, 1.2, 1] : [1, 0.95, 1],
          }}
          transition={{ duration: mood === 'happy' ? 1 : 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {config.statusEmoji}
        </motion.div>
      )}

      {/* Sprite container with mood-driven bounce */}
      <motion.div
        style={{ width: displaySize, height: displaySize }}
        animate={
          mood === 'critical'
            ? { y: config.bounce.y, opacity: [0.45, 0.55, 0.45], rotate: [0, -2, 0, 2, 0] }
            : mood === 'hungry'
            ? { y: config.bounce.y, rotate: [0, -3, 0, 3, 0] }
            : mood === 'lonely'
            ? { y: config.bounce.y, rotate: [0, -1, 1, 0], scale: [1, 0.97, 1] }
            : mood === 'tired'
            ? { y: config.bounce.y, rotate: [0, -1, 0] }
            : mood === 'ecstatic'
            ? { y: config.bounce.y, scale: [1, 1.06, 1], rotate: [0, 3, -3, 0] }
            : mood === 'happy'
            ? { y: config.bounce.y, scale: [1, 1.03, 1] }
            : { y: config.bounce.y }
        }
        transition={{
          duration: config.bounce.duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-full h-full overflow-hidden"
          style={{ filter: config.filter }}
        >
          <div
            style={{
              width: `${FRAME_COUNT * 100}%`,
              height: '100%',
              transform: `translateX(${frameOffset})`,
              transition: 'none',
            }}
          >
            <img
              src={SHEETS[stage]}
              alt={stage}
              className="w-full h-full object-cover"
              style={{ imageRendering: 'auto' }}
              draggable={false}
            />
          </div>
        </div>
      </motion.div>

      {/* Mood-based particles */}
      {size === 'normal' && <MoodParticles mood={mood} displaySize={displaySize} />}
    </div>
  );
}

function MoodParticles({ mood, displaySize }: { mood: PetMood; displaySize: number }) {
  const config = MOOD_CONFIG[mood];

  if (config.particleType === 'none') return null;

  if (config.particleType === 'flame') {
    return (
      <>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={`flame-${i}`}
            className="absolute rounded-full"
            style={{
              width: 4 + (i % 2) * 2,
              height: 4 + (i % 2) * 2,
              bottom: displaySize * 0.1,
              left: `${35 + i * 8}%`,
              background: i % 2 === 0 ? 'hsl(var(--flame))' : 'hsl(var(--amber))',
            }}
            animate={{
              y: [0, -25 - i * 8, -45],
              x: [(i - 2) * 4, (i - 2) * 8, (i - 2) * 12],
              opacity: [0.9, 0.5, 0],
              scale: [1, 0.6, 0],
            }}
            transition={{
              duration: 1.2 + i * 0.2,
              repeat: Infinity,
              delay: i * 0.35,
              ease: 'easeOut',
            }}
          />
        ))}
      </>
    );
  }

  if (config.particleType === 'sparkle') {
    return (
      <>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute text-xs pointer-events-none"
            style={{
              bottom: displaySize * 0.2 + (i % 3) * 20,
              left: `${20 + i * 12}%`,
            }}
            animate={{
              y: [0, -30 - i * 5, -50],
              x: [(i - 3) * 6, (i - 3) * 10],
              opacity: [0, 1, 0],
              scale: [0, 1.2, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.5 + i * 0.15,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeOut',
            }}
          >
            ✨
          </motion.div>
        ))}
        {/* Extra flame particles for happy */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`hflame-${i}`}
            className="absolute rounded-full"
            style={{
              width: 5,
              height: 5,
              bottom: displaySize * 0.08,
              left: `${38 + i * 12}%`,
              background: 'hsl(var(--flame))',
            }}
            animate={{
              y: [0, -30, -50],
              opacity: [0.9, 0.5, 0],
              scale: [1, 0.5, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'easeOut',
            }}
          />
        ))}
      </>
    );
  }

  if (config.particleType === 'sweat') {
    return (
      <>
        {[0, 1].map((i) => (
          <motion.div
            key={`sweat-${i}`}
            className="absolute text-sm pointer-events-none"
            style={{
              top: displaySize * 0.15,
              right: i === 0 ? displaySize * 0.1 : displaySize * 0.05,
            }}
            animate={{
              y: [0, 15, 30],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 1.2,
              ease: 'easeIn',
            }}
          >
            💧
          </motion.div>
        ))}
        {/* Tired cloud */}
        <motion.div
          className="absolute text-lg pointer-events-none"
          style={{ top: -15, left: displaySize * 0.2 }}
          animate={{ opacity: [0.3, 0.6, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          💤
        </motion.div>
      </>
    );
  }

  if (config.particleType === 'hunger') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`hunger-${i}`}
            className="absolute text-sm pointer-events-none"
            style={{
              top: displaySize * 0.05 + i * 10,
              left: `${25 + i * 20}%`,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0, 0.7, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.8,
            }}
          >
            {i % 2 === 0 ? '🍎' : '💭'}
          </motion.div>
        ))}
        {/* Stomach rumble effect */}
        <motion.div
          className="absolute text-xs font-bold pointer-events-none"
          style={{
            bottom: displaySize * 0.25,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'hsl(var(--muted-foreground))',
          }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          꾸르륵...
        </motion.div>
      </>
    );
  }

  if (config.particleType === 'zzz') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`zzz-${i}`}
            className="absolute font-bold pointer-events-none"
            style={{
              top: displaySize * 0.1,
              right: displaySize * 0.05,
              fontSize: 12 + i * 4,
              color: 'hsl(var(--muted-foreground))',
            }}
            animate={{
              y: [0, -20 - i * 10],
              x: [0, 10 + i * 5],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.7,
            }}
          >
            Z
          </motion.div>
        ))}
        {/* Fainted stars */}
        <motion.div
          className="absolute text-sm pointer-events-none"
          style={{ top: -5, left: '50%', transform: 'translateX(-50%)' }}
          animate={{ rotate: [0, 360], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          ⭐💫⭐
        </motion.div>
      </>
    );
  }

  if (config.particleType === 'hearts') {
    return (
      <>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={`heart-${i}`}
            className="absolute text-sm pointer-events-none"
            style={{
              bottom: displaySize * 0.15 + (i % 3) * 15,
              left: `${15 + i * 11}%`,
            }}
            animate={{
              y: [0, -35 - i * 6, -60],
              x: [(i - 3) * 5, (i - 3) * 10],
              opacity: [0, 1, 0],
              scale: [0.3, 1.3, 0],
              rotate: [0, (i % 2 === 0 ? 20 : -20), 0],
            }}
            transition={{
              duration: 1.8 + i * 0.1,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeOut',
            }}
          >
            {i % 3 === 0 ? '❤️' : i % 3 === 1 ? '✨' : '🔥'}
          </motion.div>
        ))}
      </>
    );
  }

  if (config.particleType === 'dust') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`dust-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 6,
              height: 6,
              bottom: displaySize * 0.05,
              left: `${30 + i * 15}%`,
              background: 'hsl(var(--muted-foreground) / 0.3)',
            }}
            animate={{
              y: [0, -8, 0],
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
            }}
          />
        ))}
        <motion.div
          className="absolute text-lg pointer-events-none"
          style={{ top: -10, left: displaySize * 0.15 }}
          animate={{ opacity: [0.2, 0.5, 0.2], y: [0, -5, 0] }}
          transition={{ duration: 3.5, repeat: Infinity }}
        >
          😢
        </motion.div>
        <motion.div
          className="absolute text-xs pointer-events-none"
          style={{ top: displaySize * 0.3, right: displaySize * 0.05, color: 'hsl(var(--muted-foreground))' }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1.5 }}
        >
          ...보고싶어
        </motion.div>
      </>
    );
  }

  return null;
}
