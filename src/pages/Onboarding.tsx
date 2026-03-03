import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { saveProfile } from '@/lib/storage';
import { savePet } from '@/lib/pet';
import { chooseStarter, hasStarter } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import { ChevronRight, Clock } from 'lucide-react';

const stepVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

const STARTERS = [
  { id: 4, name: '파이리', type: '불꽃', emoji: '🔥', desc: '뜨거운 열정의 불꽃 포켓몬' },
  { id: 7, name: '꼬부기', type: '물', emoji: '💧', desc: '든든한 등껍질의 물 포켓몬' },
  { id: 1, name: '이상해씨', type: '풀', emoji: '🌿', desc: '등의 씨앗에서 힘을 얻는 풀 포켓몬' },
];

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [offWorkTime, setOffWorkTime] = useState('18:00');
  const [selectedStarter, setSelectedStarter] = useState<number | null>(null);
  const [showPetIntro, setShowPetIntro] = useState(false);

  const totalSteps = 4; // 0: welcome, 1: name, 2: time, 3: starter selection

  const next = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      // Save profile
      saveProfile({
        name,
        offWorkTime,
        onboardingComplete: true,
      });

      // Choose starter Pokemon
      const starter = STARTERS.find(s => s.id === selectedStarter)!;
      savePet({ name: starter.name });
      if (!hasStarter()) {
        chooseStarter(selectedStarter!);
      }
      setShowPetIntro(true);
    }
  };

  const canProceed =
    step === 0 ||
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && offWorkTime) ||
    (step === 3 && selectedStarter !== null);

  const selectedStarterData = STARTERS.find(s => s.id === selectedStarter);

  if (showPetIntro) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-6 flex h-40 w-40 items-center justify-center rounded-full gradient-primary glow-shadow"
          >
            <img
              src={`${SPRITE_BASE}/${selectedStarter}.gif`}
              alt={selectedStarterData?.name}
              className="w-24 h-24 object-contain image-rendering-pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-3xl font-bold text-foreground mb-2"
          >
            {selectedStarterData?.name}
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-muted-foreground mb-2"
          >
            Lv.5 · {selectedStarterData?.type} 타입
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="mx-auto mt-6 glass-card max-w-xs p-4"
          >
            <p className="text-foreground">
              {name} 트레이너, 반가워! 함께 모험을 떠나자! {selectedStarterData?.emoji}
            </p>
          </motion.div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/home')}
            className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold gradient-primary text-primary-foreground mx-auto"
          >
            포켓몬 센터로! 🏥
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12">
      {/* Progress */}
      <div className="flex w-full max-w-sm gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= step ? 'gradient-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="flex w-full max-w-sm flex-1 flex-col items-center justify-center"
        >
          {step === 0 && (
            <div className="w-full space-y-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full gradient-primary glow-shadow"
              >
                <span className="text-5xl">🏥</span>
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  포켓몬 센터에 오신 걸 환영합니다!
                </h1>
                <p className="mt-3 text-muted-foreground">
                  런닝으로 포켓몬을 만나고,
                  <br />함께 성장하는 모험을 시작하세요
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="w-full space-y-8 text-center">
              <div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="mx-auto mb-6 text-6xl">
                  👋
                </motion.div>
                <h1 className="text-2xl font-bold text-foreground">트레이너님의 이름은?</h1>
                <p className="mt-2 text-muted-foreground">포켓몬들이 불러줄 이름을 알려주세요</p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-center text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="w-full space-y-8 text-center">
              <div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary">
                  <Clock className="h-10 w-10 text-primary-foreground" />
                </motion.div>
                <h1 className="text-2xl font-bold text-foreground">퇴근 시간은 언제인가요?</h1>
                <p className="mt-2 text-muted-foreground">런닝 알림 시간을 맞춰드릴게요</p>
              </div>
              <input
                type="time"
                value={offWorkTime}
                onChange={(e) => setOffWorkTime(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-center text-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
              />
            </div>
          )}

          {step === 3 && (
            <div className="w-full space-y-8 text-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground">첫 번째 파트너를 선택하세요!</h1>
                <p className="mt-2 text-muted-foreground">함께 모험을 떠날 포켓몬을 골라주세요</p>
              </div>
              <div className="space-y-3">
                {STARTERS.map((starter) => {
                  const selected = selectedStarter === starter.id;
                  return (
                    <motion.button
                      key={starter.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedStarter(starter.id)}
                      className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/10 glow-shadow'
                          : 'border-border bg-card hover:border-primary/30'
                      }`}
                    >
                      <img
                        src={`${SPRITE_BASE}/${starter.id}.gif`}
                        alt={starter.name}
                        className="w-16 h-16 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{starter.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {starter.emoji} {starter.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{starter.desc}</p>
                      </div>
                      {selected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="pokeball-badge flex-shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* CTA */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={next}
        disabled={!canProceed}
        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold transition-all gradient-primary text-primary-foreground disabled:opacity-30"
      >
        {step === totalSteps - 1 ? '이 포켓몬으로 시작! ⚡' : '다음'}
        {step < totalSteps - 1 && <ChevronRight size={20} />}
      </motion.button>
    </div>
  );
}
