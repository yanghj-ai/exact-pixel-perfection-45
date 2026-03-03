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
const FRAME_SPEEDS: Record<PokemonStage, number> = {
  charmander: 350, // ms per frame
  charmeleon: 300,
  charizard: 280,
};

const DISPLAY_SIZES: Record<PokemonStage, number> = {
  charmander: 180,
  charmeleon: 200,
  charizard: 220,
};

interface PetSpriteProps {
  stage: PokemonStage;
  hp: number;
  maxHp: number;
  className?: string;
  size?: 'normal' | 'small';
}

export default function PetSprite({ stage, hp, maxHp, className = '', size = 'normal' }: PetSpriteProps) {
  const [frame, setFrame] = useState(0);
  const isWeak = hp <= 0;
  const displaySize = size === 'small' ? 60 : DISPLAY_SIZES[stage];
  const speed = isWeak ? 800 : FRAME_SPEEDS[stage];

  // Sprite frame animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % FRAME_COUNT);
    }, speed);
    return () => clearInterval(interval);
  }, [speed]);

  // Pre-calculate frame position (each frame is 25% of the sheet width)
  const frameOffset = useMemo(() => `${-(frame * 100 / FRAME_COUNT)}%`, [frame]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Ambient glow */}
      {!isWeak && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: displaySize + 30,
            height: displaySize + 30,
            background: `radial-gradient(circle, hsl(var(--flame) / 0.15), transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Ground shadow */}
      <motion.div
        className="absolute rounded-[50%] bg-foreground/10"
        style={{
          width: displaySize * 0.4,
          height: 8,
          bottom: size === 'small' ? -2 : 0,
        }}
        animate={{
          scaleX: [1, 0.85, 1],
          opacity: [0.25, 0.12, 0.25],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Sprite container with bounce */}
      <motion.div
        style={{ width: displaySize, height: displaySize }}
        animate={
          isWeak
            ? { y: [0, 2, 0], opacity: [0.45, 0.55, 0.45] }
            : { y: [0, -6, 0] }
        }
        transition={{
          duration: isWeak ? 2.5 : 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Spritesheet clipping */}
        <div
          className="w-full h-full overflow-hidden"
          style={{
            filter: isWeak ? 'grayscale(0.6) brightness(0.6)' : 'drop-shadow(0 4px 12px hsl(var(--flame) / 0.3))',
          }}
        >
          <div
            style={{
              width: `${FRAME_COUNT * 100}%`,
              height: '100%',
              transform: `translateX(${frameOffset})`,
              transition: 'none', // instant frame swap for pixel game feel
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

      {/* Flame particles when alive */}
      {!isWeak && size === 'normal' && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
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
      )}
    </div>
  );
}
