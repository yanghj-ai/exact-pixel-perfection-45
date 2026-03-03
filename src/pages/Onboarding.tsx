import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { saveProfile } from '@/lib/storage';
import { savePet } from '@/lib/pet';
import { chooseStarter, hasStarter, markAsSeen } from '@/lib/collection';
import { ChevronRight, Clock } from 'lucide-react';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated';

const STARTERS = [
  { id: 4, name: '파이리', type: '불꽃', emoji: '🔥', desc: '꼬리의 불꽃으로 기분을 알 수 있는 도마뱀 포켓몬', color: 'from-orange-500/20 to-red-500/20', border: 'border-orange-400' },
  { id: 7, name: '꼬부기', type: '물', emoji: '💧', desc: '등껍질로 몸을 보호하는 거북 포켓몬', color: 'from-blue-400/20 to-cyan-500/20', border: 'border-blue-400' },
  { id: 1, name: '이상해씨', type: '풀', emoji: '🌿', desc: '등에 심어진 씨앗이 자라며 영양분을 공급하는 포켓몬', color: 'from-green-400/20 to-emerald-500/20', border: 'border-green-400' },
];

type Phase = 'oak-intro' | 'oak-talk-1' | 'oak-talk-2' | 'ask-name' | 'ask-time' | 'oak-lab' | 'choose-starter' | 'pokeball-anim' | 'starter-reveal' | 'farewell';

export default function Onboarding() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('oak-intro');
  const [name, setName] = useState('');
  const [offWorkTime, setOffWorkTime] = useState('18:00');
  const [selectedStarter, setSelectedStarter] = useState<number | null>(null);
  const [dialogText, setDialogText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [canTap, setCanTap] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!dialogText) return;
    setIsTyping(true);
    setCanTap(false);
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(dialogText.slice(0, i));
      if (i >= dialogText.length) {
        clearInterval(interval);
        setIsTyping(false);
        setCanTap(true);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [dialogText]);

  // Skip typewriter on tap
  const handleTap = () => {
    if (isTyping) {
      setDisplayedText(dialogText);
      setIsTyping(false);
      setCanTap(true);
      return;
    }
  };

  // Phase transitions
  useEffect(() => {
    switch (phase) {
      case 'oak-intro':
        setDialogText('');
        setTimeout(() => setPhase('oak-talk-1'), 1500);
        break;
      case 'oak-talk-1':
        setDialogText('안녕! 포켓몬 세계에 온 걸 환영하네! 나는 오박사라고 해.');
        break;
      case 'oak-talk-2':
        setDialogText('이 세계에는 포켓몬이라 불리는 신비한 생물들이 곳곳에 살고 있단다. 런닝을 하면 야생의 포켓몬들을 만날 수 있지!');
        break;
      case 'oak-lab':
        setDialogText('자, 나를 따라 연구소로 오게나. 자네에게 줄 포켓몬이 있거든.');
        break;
      default:
        break;
    }
  }, [phase]);

  const advanceDialog = () => {
    if (!canTap) return;
    switch (phase) {
      case 'oak-talk-1': setPhase('oak-talk-2'); break;
      case 'oak-talk-2': setPhase('ask-name'); break;
      case 'oak-lab': setPhase('choose-starter'); break;
      default: break;
    }
  };

  const submitName = () => {
    if (!name.trim()) return;
    setPhase('ask-time');
  };

  const submitTime = () => {
    setPhase('oak-lab');
  };

  const selectStarter = (id: number) => {
    setSelectedStarter(id);
  };

  const confirmStarter = () => {
    if (!selectedStarter) return;
    setPhase('pokeball-anim');

    // Mark all 3 starters as seen
    markAsSeen(STARTERS.map(s => s.id));

    setTimeout(() => {
      // Save everything
      saveProfile({ name, offWorkTime, onboardingComplete: true });
      const starter = STARTERS.find(s => s.id === selectedStarter)!;
      savePet({ name: starter.name });
      if (!hasStarter()) {
        chooseStarter(selectedStarter);
      }
      setPhase('starter-reveal');
    }, 2000);
  };

  const selectedStarterData = STARTERS.find(s => s.id === selectedStarter);

  // ── Oak Intro (fade in) ──
  if (phase === 'oak-intro') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="text-8xl mb-4"
          >
            👨‍🔬
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-muted-foreground text-sm"
          >
            오박사의 연구소
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ── Oak Dialog Phases ──
  if (phase === 'oak-talk-1' || phase === 'oak-talk-2' || phase === 'oak-lab') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" onClick={() => { handleTap(); if (canTap && !isTyping) advanceDialog(); }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm w-full">
          {/* Oak sprite */}
          <motion.div
            className="text-7xl mb-8"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            👨‍🔬
          </motion.div>

          {/* Lab bg elements */}
          {phase === 'oak-lab' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center gap-4 mb-6"
            >
              {STARTERS.map(s => (
                <motion.div
                  key={s.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="w-12 h-12 rounded-full bg-muted/50 border border-border flex items-center justify-center"
                >
                  <div className="pokeball-badge w-6 h-6" />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Dialog box */}
          <div className="relative glass-card p-5 text-left min-h-[100px]">
            <p className="text-xs text-primary font-bold mb-1.5">오박사</p>
            <p className="text-sm text-foreground leading-relaxed">{displayedText}</p>
            {canTap && !isTyping && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="absolute bottom-3 right-4 text-primary text-xs"
              >
                ▼
              </motion.span>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground mt-4">탭하여 계속</p>
        </motion.div>
      </div>
    );
  }

  // ── Ask Name ──
  if (phase === 'ask-name') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm w-full">
          <div className="text-6xl mb-4">👨‍🔬</div>
          <div className="glass-card p-5 text-left mb-6">
            <p className="text-xs text-primary font-bold mb-1.5">오박사</p>
            <p className="text-sm text-foreground leading-relaxed">
              그런데 자네 이름이 뭐였더라? 깜빡했군. 이름을 알려주겠나?
            </p>
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="트레이너 이름을 입력하세요"
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-center text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submitName()}
          />

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={submitName}
            disabled={!name.trim()}
            className="w-full rounded-2xl py-4 text-lg font-semibold gradient-primary text-primary-foreground disabled:opacity-30 flex items-center justify-center gap-2"
          >
            이 이름으로! <ChevronRight size={20} />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Ask Time ──
  if (phase === 'ask-time') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm w-full">
          <div className="text-6xl mb-4">👨‍🔬</div>
          <div className="glass-card p-5 text-left mb-6">
            <p className="text-xs text-primary font-bold mb-1.5">오박사</p>
            <p className="text-sm text-foreground leading-relaxed">
              {name}! 좋은 이름이군. 그런데 자네는 보통 몇 시에 자유 시간이 생기나? 런닝하기 좋은 시간을 알려주게.
            </p>
          </div>

          <div className="glass-card p-4 mb-4 flex items-center gap-3 justify-center">
            <Clock className="h-6 w-6 text-primary" />
            <input
              type="time"
              value={offWorkTime}
              onChange={(e) => setOffWorkTime(e.target.value)}
              className="rounded-xl border border-border bg-card px-4 py-3 text-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={submitTime}
            className="w-full rounded-2xl py-4 text-lg font-semibold gradient-primary text-primary-foreground flex items-center justify-center gap-2"
          >
            다음 <ChevronRight size={20} />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Choose Starter ──
  if (phase === 'choose-starter') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm w-full">
          <div className="text-center mb-4">
            <div className="text-5xl mb-3">👨‍🔬</div>
            <div className="glass-card p-4 text-left mb-5">
              <p className="text-xs text-primary font-bold mb-1.5">오박사</p>
              <p className="text-sm text-foreground leading-relaxed">
                {name}, 여기에 3마리의 포켓몬이 있단다. 자네의 첫 번째 파트너를 골라보게!
              </p>
            </div>
          </div>

          {/* 3 Pokéballs on desk */}
          <div className="flex justify-center gap-3 mb-6">
            {STARTERS.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.2, type: 'spring' }}
                className="text-center"
              >
                <motion.button
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => selectStarter(s.id)}
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all border-2 ${
                    selectedStarter === s.id
                      ? `bg-gradient-to-b ${s.color} ${s.border} shadow-lg`
                      : 'bg-card border-border hover:border-primary/30'
                  }`}
                >
                  <img
                    src={`${SPRITE_BASE}/${s.id}.gif`}
                    alt={s.name}
                    className="w-14 h-14 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </motion.button>
                <p className={`text-xs mt-2 font-medium ${selectedStarter === s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.name}
                </p>
                <p className="text-[10px] text-muted-foreground">{s.emoji} {s.type}</p>
              </motion.div>
            ))}
          </div>

          {/* Selected starter detail */}
          <AnimatePresence mode="wait">
            {selectedStarterData && (
              <motion.div
                key={selectedStarter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`glass-card p-4 mb-5 border-2 ${selectedStarterData.border}/50`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`${SPRITE_BASE}/${selectedStarter}.gif`}
                    alt={selectedStarterData.name}
                    className="w-16 h-16 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div>
                    <p className="font-bold text-foreground">{selectedStarterData.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedStarterData.emoji} {selectedStarterData.type} 타입 · Lv.5</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedStarterData.desc}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={confirmStarter}
            disabled={!selectedStarter}
            className="w-full rounded-2xl py-4 text-lg font-semibold gradient-primary text-primary-foreground disabled:opacity-30 flex items-center justify-center gap-2"
          >
            이 포켓몬을 선택! ⚡
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Pokéball Animation ──
  if (phase === 'pokeball-anim') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="text-center">
          {/* Pokéball shake and open */}
          <motion.div
            className="mx-auto w-28 h-28 rounded-full bg-gradient-to-b from-destructive via-destructive to-card border-4 border-foreground/20 flex items-center justify-center relative overflow-hidden"
            animate={{
              rotate: [0, -15, 15, -10, 10, 0],
              scale: [1, 1.05, 1, 1.05, 1],
            }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          >
            {/* Center button */}
            <div className="w-8 h-8 rounded-full bg-card border-4 border-foreground/20 z-10" />
            {/* Divider line */}
            <div className="absolute left-0 right-0 h-1 bg-foreground/20 top-1/2 -translate-y-1/2" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground mt-6"
          >
            {name}은(는) 오박사에게서 {selectedStarterData?.name}을(를) 받았다!
          </motion.p>

          {/* Sparkle particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-secondary"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                x: Math.cos((i / 8) * Math.PI * 2) * 80,
                y: Math.sin((i / 8) * Math.PI * 2) * 80,
              }}
              transition={{ delay: 1.2, duration: 0.8 }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
              }}
            />
          ))}
        </motion.div>
      </div>
    );
  }

  // ── Starter Reveal ──
  if (phase === 'starter-reveal') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm w-full">
          {/* Glowing circle with starter */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto mb-6 w-40 h-40 rounded-full gradient-primary glow-shadow flex items-center justify-center relative"
          >
            <motion.img
              src={`${SPRITE_BASE}/${selectedStarter}.gif`}
              alt={selectedStarterData?.name}
              className="w-24 h-24 object-contain"
              style={{ imageRendering: 'pixelated' }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Sparkles around */}
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-lg"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
                style={{
                  top: `${50 + 45 * Math.sin((i / 6) * Math.PI * 2)}%`,
                  left: `${50 + 45 * Math.cos((i / 6) * Math.PI * 2)}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                ✨
              </motion.span>
            ))}
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-foreground mb-1"
          >
            {selectedStarterData?.name}
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground text-sm mb-6"
          >
            {selectedStarterData?.emoji} {selectedStarterData?.type} 타입 · Lv.5
          </motion.p>

          {/* Oak farewell dialog */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="glass-card p-5 text-left mb-6"
          >
            <p className="text-xs text-primary font-bold mb-1.5">오박사</p>
            <p className="text-sm text-foreground leading-relaxed">
              {name}! {selectedStarterData?.name}을(를) 잘 돌봐주게나. 런닝을 하면서 많은 포켓몬을 만나고, 도감을 완성해 보거라! 자네의 모험을 응원하마!
            </p>
          </motion.div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/home')}
            className="w-full rounded-2xl py-4 text-lg font-semibold gradient-primary text-primary-foreground flex items-center justify-center gap-2"
          >
            모험을 시작하자! 🌟
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return null;
}
