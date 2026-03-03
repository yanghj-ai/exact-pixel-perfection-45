import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PokemonStage } from '@/lib/pet';

// Individual frame imports
import charmanderF1 from '@/assets/charmander-frame1.png';
import charmanderF2 from '@/assets/charmander-frame2.png';
import charmanderF3 from '@/assets/charmander-frame3.png';
import charmanderF4 from '@/assets/charmander-frame4.png';
import charmeleonF1 from '@/assets/charmeleon-frame1.png';
import charmeleonF2 from '@/assets/charmeleon-frame2.png';
import charmeleonF3 from '@/assets/charmeleon-frame3.png';
import charmeleonF4 from '@/assets/charmeleon-frame4.png';
import charizardF1 from '@/assets/charizard-frame1.png';
import charizardF2 from '@/assets/charizard-frame2.png';
import charizardF3 from '@/assets/charizard-frame3.png';
import charizardF4 from '@/assets/charizard-frame4.png';

const FRAMES: Record<PokemonStage, string[]> = {
  charmander: [charmanderF1, charmanderF2, charmanderF3, charmanderF4],
  charmeleon: [charmeleonF1, charmeleonF2, charmeleonF3, charmeleonF4],
  charizard: [charizardF1, charizardF2, charizardF3, charizardF4],
};

const FRAME_COUNT = 4;

type PetMood = 'ecstatic' | 'happy' | 'normal' | 'tired' | 'hungry' | 'critical' | 'lonely';

// Behaviors the pet can perform
type PetBehavior = 'idle' | 'walk' | 'jump' | 'look' | 'sleep' | 'shake' | 'spin';

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

interface MoodProfile {
  frameSpeed: number;
  filter: string;
  glowOpacity: number;
  particleType: string;
  statusEmoji: string;
  behaviors: { action: PetBehavior; weight: number }[];
  walkSpeed: number; // px per behavior cycle
  jumpHeight: number;
  actionInterval: [number, number]; // min/max ms between actions
}

const MOOD_PROFILES: Record<PetMood, MoodProfile> = {
  ecstatic: {
    frameSpeed: 200,
    filter: 'drop-shadow(0 6px 20px hsl(18 100% 60% / 0.5)) brightness(1.15) saturate(1.2)',
    glowOpacity: 0.3,
    particleType: 'hearts',
    statusEmoji: '🤩',
    behaviors: [
      { action: 'walk', weight: 3 },
      { action: 'jump', weight: 4 },
      { action: 'spin', weight: 2 },
      { action: 'idle', weight: 1 },
    ],
    walkSpeed: 60,
    jumpHeight: 20,
    actionInterval: [800, 1800],
  },
  happy: {
    frameSpeed: 260,
    filter: 'drop-shadow(0 4px 16px hsl(18 100% 60% / 0.4)) brightness(1.1)',
    glowOpacity: 0.2,
    particleType: 'sparkle',
    statusEmoji: '😆',
    behaviors: [
      { action: 'walk', weight: 4 },
      { action: 'jump', weight: 2 },
      { action: 'look', weight: 2 },
      { action: 'idle', weight: 2 },
    ],
    walkSpeed: 45,
    jumpHeight: 14,
    actionInterval: [1200, 2500],
  },
  normal: {
    frameSpeed: 330,
    filter: 'drop-shadow(0 4px 12px hsl(18 100% 60% / 0.3))',
    glowOpacity: 0.15,
    particleType: 'flame',
    statusEmoji: '',
    behaviors: [
      { action: 'walk', weight: 3 },
      { action: 'idle', weight: 4 },
      { action: 'look', weight: 3 },
    ],
    walkSpeed: 30,
    jumpHeight: 8,
    actionInterval: [1800, 3500],
  },
  tired: {
    frameSpeed: 500,
    filter: 'drop-shadow(0 2px 8px hsl(18 100% 60% / 0.15)) saturate(0.7) brightness(0.85)',
    glowOpacity: 0.06,
    particleType: 'sweat',
    statusEmoji: '😓',
    behaviors: [
      { action: 'idle', weight: 5 },
      { action: 'walk', weight: 2 },
      { action: 'shake', weight: 1 },
    ],
    walkSpeed: 15,
    jumpHeight: 3,
    actionInterval: [2500, 4500],
  },
  hungry: {
    frameSpeed: 600,
    filter: 'drop-shadow(0 2px 6px hsl(0 0% 50% / 0.2)) saturate(0.5) brightness(0.75)',
    glowOpacity: 0.03,
    particleType: 'hunger',
    statusEmoji: '🥺',
    behaviors: [
      { action: 'idle', weight: 4 },
      { action: 'shake', weight: 3 },
      { action: 'walk', weight: 2 },
      { action: 'look', weight: 1 },
    ],
    walkSpeed: 10,
    jumpHeight: 2,
    actionInterval: [3000, 5000],
  },
  critical: {
    frameSpeed: 900,
    filter: 'grayscale(0.7) brightness(0.5) drop-shadow(0 2px 4px hsl(0 0% 30% / 0.3))',
    glowOpacity: 0,
    particleType: 'zzz',
    statusEmoji: '😵',
    behaviors: [
      { action: 'sleep', weight: 6 },
      { action: 'idle', weight: 3 },
      { action: 'shake', weight: 1 },
    ],
    walkSpeed: 3,
    jumpHeight: 0,
    actionInterval: [4000, 6000],
  },
  lonely: {
    frameSpeed: 700,
    filter: 'drop-shadow(0 2px 6px hsl(210 30% 40% / 0.3)) saturate(0.4) brightness(0.7) hue-rotate(20deg)',
    glowOpacity: 0.02,
    particleType: 'dust',
    statusEmoji: '😢',
    behaviors: [
      { action: 'idle', weight: 3 },
      { action: 'walk', weight: 2 },
      { action: 'look', weight: 4 },
      { action: 'shake', weight: 1 },
    ],
    walkSpeed: 12,
    jumpHeight: 2,
    actionInterval: [3000, 5000],
  },
};

const DISPLAY_SIZES: Record<PokemonStage, number> = {
  charmander: 240,
  charmeleon: 260,
  charizard: 280,
};

// Weighted random pick
function pickWeighted<T>(items: { action: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.action;
  }
  return items[0].action;
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

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
  const profile = MOOD_PROFILES[mood];
  const displaySize = size === 'small' ? 60 : DISPLAY_SIZES[stage];
  const currentFrameSrc = FRAMES[stage][frame];

  // Wandering state
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const [currentBehavior, setCurrentBehavior] = useState<PetBehavior>('idle');
  const [behaviorKey, setBehaviorKey] = useState(0);
  const wanderBounds = size === 'small' ? 15 : 50; // px from center

  // Sprite frame animation
  useEffect(() => {
    const speed = currentBehavior === 'walk' || currentBehavior === 'spin'
      ? profile.frameSpeed * 0.7
      : currentBehavior === 'sleep'
      ? profile.frameSpeed * 2
      : profile.frameSpeed;
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % FRAME_COUNT);
    }, speed);
    return () => clearInterval(interval);
  }, [profile.frameSpeed, currentBehavior]);

  // Behavior AI loop
  useEffect(() => {
    if (size === 'small') return; // no AI for small sprites

    const doAction = () => {
      const action = pickWeighted(profile.behaviors);
      setCurrentBehavior(action);
      setBehaviorKey((k) => k + 1);

      if (action === 'walk') {
        const targetX = randRange(-wanderBounds, wanderBounds);
        setFacingLeft(targetX < posX);
        setPosX(targetX);
        setPosY(randRange(-5, 5));
      } else if (action === 'jump') {
        // Jump stays in place
      } else if (action === 'look') {
        setFacingLeft((f) => !f);
      }

      const [min, max] = profile.actionInterval;
      const nextDelay = randRange(min, max);
      timeoutRef.current = window.setTimeout(doAction, nextDelay);
    };

    const timeoutRef: { current: number | null } = { current: null };
    const initialDelay = randRange(500, 1500);
    timeoutRef.current = window.setTimeout(doAction, initialDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [mood, size]);

  

  // Behavior-specific motion values
  const getBehaviorAnimation = () => {
    switch (currentBehavior) {
      case 'jump':
        return { y: [0, -profile.jumpHeight, 0], scale: [1, 1.05, 1] };
      case 'sleep':
        return { y: [0, 2, 0], rotate: [0, -3, 0], scale: [1, 0.97, 1] };
      case 'shake':
        return { x: [0, -3, 3, -2, 2, 0], y: [0, -1, 0] };
      case 'spin':
        return { rotateY: [0, 180, 360], scale: [1, 1.1, 1] };
      case 'look':
        return { y: [0, -2, 0], rotate: [0, facingLeft ? -5 : 5, 0] };
      case 'walk':
        return { y: [0, -4, 0, -4, 0] };
      default: // idle
        return { y: [0, -3, 0], scale: [1, 1.01, 1] };
    }
  };

  const getBehaviorDuration = () => {
    switch (currentBehavior) {
      case 'jump': return 0.5;
      case 'spin': return 0.8;
      case 'shake': return 0.4;
      case 'sleep': return 3;
      case 'look': return 1;
      case 'walk': return 1.2;
      default: return 2;
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size === 'small' ? 70 : displaySize + wanderBounds * 2 + 20, height: size === 'small' ? 70 : displaySize + 40 }}
    >
      {/* Ambient glow - follows pet */}
      {profile.glowOpacity > 0 && size === 'normal' && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: displaySize + 30,
            height: displaySize + 30,
            background: `radial-gradient(circle, hsl(var(--flame) / ${profile.glowOpacity}), transparent 70%)`,
          }}
          animate={{
            x: posX,
            y: posY,
            scale: [1, 1.08, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ x: { duration: 1.5, ease: 'easeInOut' }, y: { duration: 1.5, ease: 'easeInOut' }, scale: { duration: 2, repeat: Infinity }, opacity: { duration: 2, repeat: Infinity } }}
        />
      )}

      {/* Ground shadow - follows pet */}
      <motion.div
        className="absolute rounded-[50%] bg-foreground/10"
        style={{
          width: displaySize * 0.35,
          height: 6,
          bottom: size === 'small' ? 2 : 10,
        }}
        animate={{
          x: posX,
          scaleX: currentBehavior === 'jump' ? [1, 0.6, 1] : [1, 0.85, 1],
          opacity: currentBehavior === 'jump' ? [0.2, 0.08, 0.2] : [0.2, 0.1, 0.2],
        }}
        transition={{
          x: { duration: 1.5, ease: 'easeInOut' },
          scaleX: { duration: currentBehavior === 'jump' ? 0.5 : 1.5, repeat: Infinity },
          opacity: { duration: 1.5, repeat: Infinity },
        }}
      />

      {/* Status emoji - follows pet */}
      {profile.statusEmoji && size === 'normal' && (
        <motion.div
          className="absolute z-20 text-2xl pointer-events-none"
          style={{ top: 0 }}
          animate={{
            x: posX + displaySize * 0.35,
            y: [posY - 10, posY - 18, posY - 10],
            rotate: mood === 'ecstatic' ? [0, 15, -15, 0] : [0, -5, 5, 0],
            scale: mood === 'ecstatic' ? [1, 1.3, 1] : [1, 0.95, 1],
          }}
          transition={{
            x: { duration: 1.5, ease: 'easeInOut' },
            y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 1.5, repeat: Infinity },
            scale: { duration: 1.5, repeat: Infinity },
          }}
        >
          {profile.statusEmoji}
        </motion.div>
      )}

      {/* Main pet container — moves around */}
      <motion.div
        style={{ width: displaySize, height: displaySize, position: 'absolute' }}
        animate={{ x: posX, y: posY }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      >
        {/* Behavior sub-animation */}
        <motion.div
          key={behaviorKey}
          className="w-full h-full"
          animate={getBehaviorAnimation()}
          transition={{
            duration: getBehaviorDuration(),
            repeat: currentBehavior === 'idle' || currentBehavior === 'sleep' || currentBehavior === 'walk' ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {/* Individual frame */}
          <div
            className="w-full h-full overflow-hidden rounded-2xl"
            style={{
              filter: profile.filter,
              transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)',
              transition: 'transform 0.2s ease',
            }}
          >
            <img
              src={currentFrameSrc}
              alt={stage}
              className="w-full h-full object-contain"
              style={{ imageRendering: 'auto' }}
              draggable={false}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Mood particles - follow pet */}
      {size === 'normal' && (
        <motion.div
          className="absolute pointer-events-none"
          style={{ width: displaySize, height: displaySize }}
          animate={{ x: posX, y: posY }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          <MoodParticles mood={mood} displaySize={displaySize} behavior={currentBehavior} />
        </motion.div>
      )}
    </div>
  );
}

function MoodParticles({ mood, displaySize, behavior }: { mood: PetMood; displaySize: number; behavior: PetBehavior }) {
  const profile = MOOD_PROFILES[mood];
  const pt = profile.particleType;

  if (pt === 'flame') {
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
            transition={{ duration: 1.2 + i * 0.2, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
          />
        ))}
      </>
    );
  }

  if (pt === 'sparkle') {
    return (
      <>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute text-xs pointer-events-none"
            style={{ bottom: displaySize * 0.2 + (i % 3) * 20, left: `${20 + i * 12}%` }}
            animate={{ y: [0, -30 - i * 5, -50], opacity: [0, 1, 0], scale: [0, 1.2, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
          >
            ✨
          </motion.div>
        ))}
      </>
    );
  }

  if (pt === 'sweat') {
    return (
      <>
        {[0, 1].map((i) => (
          <motion.div
            key={`sweat-${i}`}
            className="absolute text-sm pointer-events-none"
            style={{ top: displaySize * 0.15, right: displaySize * 0.1 + i * 12 }}
            animate={{ y: [0, 15, 30], opacity: [0, 0.8, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 1.2, ease: 'easeIn' }}
          >
            💧
          </motion.div>
        ))}
        {behavior === 'sleep' || behavior === 'idle' ? (
          <motion.div
            className="absolute text-lg pointer-events-none"
            style={{ top: -15, left: displaySize * 0.2 }}
            animate={{ opacity: [0.3, 0.6, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            💤
          </motion.div>
        ) : null}
      </>
    );
  }

  if (pt === 'hunger') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`hunger-${i}`}
            className="absolute text-sm pointer-events-none"
            style={{ top: displaySize * 0.05 + i * 10, left: `${25 + i * 20}%` }}
            animate={{ y: [0, -10, 0], opacity: [0, 0.7, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8 }}
          >
            {i % 2 === 0 ? '🍎' : '💭'}
          </motion.div>
        ))}
        <motion.div
          className="absolute text-xs font-bold pointer-events-none"
          style={{ bottom: displaySize * 0.25, left: '50%', transform: 'translateX(-50%)', color: 'hsl(var(--muted-foreground))' }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          꾸르륵...
        </motion.div>
      </>
    );
  }

  if (pt === 'zzz') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`zzz-${i}`}
            className="absolute font-bold pointer-events-none"
            style={{ top: displaySize * 0.1, right: displaySize * 0.05, fontSize: 12 + i * 4, color: 'hsl(var(--muted-foreground))' }}
            animate={{ y: [0, -20 - i * 10], x: [0, 10 + i * 5], opacity: [0, 0.6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.7 }}
          >
            Z
          </motion.div>
        ))}
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

  if (pt === 'hearts') {
    return (
      <>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={`heart-${i}`}
            className="absolute text-sm pointer-events-none"
            style={{ bottom: displaySize * 0.15 + (i % 3) * 15, left: `${15 + i * 11}%` }}
            animate={{
              y: [0, -35 - i * 6, -60],
              x: [(i - 3) * 5, (i - 3) * 10],
              opacity: [0, 1, 0],
              scale: [0.3, 1.3, 0],
              rotate: [0, i % 2 === 0 ? 20 : -20, 0],
            }}
            transition={{ duration: 1.8 + i * 0.1, repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
          >
            {i % 3 === 0 ? '❤️' : i % 3 === 1 ? '✨' : '🔥'}
          </motion.div>
        ))}
      </>
    );
  }

  if (pt === 'dust') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`dust-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{ width: 6, height: 6, bottom: displaySize * 0.05, left: `${30 + i * 15}%`, background: 'hsl(var(--muted-foreground) / 0.3)' }}
            animate={{ y: [0, -8, 0], opacity: [0, 0.4, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
          />
        ))}
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
