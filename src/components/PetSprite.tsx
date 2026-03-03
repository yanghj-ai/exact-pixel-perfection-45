import { motion } from 'framer-motion';
import type { PokemonStage } from '@/lib/pet';
import charmanderImg from '@/assets/pet-charmander.png';
import charmeleonImg from '@/assets/pet-charmeleon.png';
import charizardImg from '@/assets/pet-charizard.png';

const PET_IMAGES: Record<PokemonStage, string> = {
  charmander: charmanderImg,
  charmeleon: charmeleonImg,
  charizard: charizardImg,
};

const PET_SIZES: Record<PokemonStage, number> = {
  charmander: 160,
  charmeleon: 180,
  charizard: 200,
};

interface PetSpriteProps {
  stage: PokemonStage;
  hp: number;
  maxHp: number;
  className?: string;
}

export default function PetSprite({ stage, hp, maxHp, className = '' }: PetSpriteProps) {
  const isWeak = hp <= 0;
  const size = PET_SIZES[stage];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Glow ring behind pet */}
      <motion.div
        className="absolute rounded-full gradient-primary opacity-20"
        style={{ width: size + 40, height: size + 40 }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Shadow */}
      <motion.div
        className="absolute bottom-0 rounded-full bg-foreground/10"
        style={{ width: size * 0.5, height: 12 }}
        animate={{
          scaleX: [1, 0.9, 1],
          opacity: [0.3, 0.15, 0.3],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pet image with breathing + bounce animation */}
      <motion.div
        style={{ width: size, height: size }}
        animate={
          isWeak
            ? { y: [0, 2, 0], opacity: [0.5, 0.6, 0.5] }
            : {
                y: [0, -8, 0],
                rotate: [0, -1, 0, 1, 0],
              }
        }
        transition={{
          duration: isWeak ? 3 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <motion.img
          src={PET_IMAGES[stage]}
          alt={stage}
          className="w-full h-full object-contain drop-shadow-lg"
          style={{
            imageRendering: 'auto',
            filter: isWeak ? 'grayscale(0.5) brightness(0.7)' : 'none',
          }}
          // Subtle breathing scale
          animate={{
            scaleY: [1, 1.02, 1],
            scaleX: [1, 0.99, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.3,
          }}
        />
      </motion.div>

      {/* Flame particles */}
      {!isWeak && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary"
              style={{
                bottom: size * 0.15,
                left: `${45 + i * 8}%`,
              }}
              animate={{
                y: [0, -30 - i * 10, -50],
                x: [(i - 1) * 5, (i - 1) * 10, (i - 1) * 15],
                opacity: [0.8, 0.4, 0],
                scale: [0.8, 0.5, 0],
              }}
              transition={{
                duration: 1.5 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
