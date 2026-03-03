import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRoutine, getTotalDuration, type EnergyLevel, type RoutineItem } from '@/lib/routines';
import { getPet } from '@/lib/pet';
import { Sparkles, Clock, Shuffle, Play } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const ENERGY_OPTIONS: { key: EnergyLevel; emoji: string; label: string }[] = [
  { key: 'high', emoji: '⚡', label: '충전됨' },
  { key: 'normal', emoji: '😊', label: '보통' },
  { key: 'tired', emoji: '😴', label: '피곤' },
];

export default function Routine() {
  const navigate = useNavigate();
  const pet = getPet();
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [availableTime, setAvailableTime] = useState(90);
  const [routines, setRoutines] = useState<RoutineItem[] | null>(null);

  const handleGenerate = () => {
    if (!energy) return;
    setRoutines(generateRoutine(energy));
  };

  const handleShuffle = () => {
    if (!energy) return;
    const keys: EnergyLevel[] = ['high', 'normal', 'tired'];
    const idx = keys.indexOf(energy);
    const next = keys[(idx + 1) % keys.length];
    setEnergy(next);
    setRoutines(generateRoutine(next));
  };

  const timeLabel = availableTime >= 60
    ? `${Math.floor(availableTime / 60)}시간${availableTime % 60 > 0 ? ` ${availableTime % 60}분` : ''}`
    : `${availableTime}분`;

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-10 space-y-5">
        {/* Mini pet status */}
        <div className="glass-card p-3 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{pet.name}가 응원하고 있어!</p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-destructive"
                style={{ width: `${(pet.hp / pet.maxHp) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Condition input */}
        {!routines && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 space-y-5"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">오늘 컨디션은?</h2>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2.5">에너지 레벨</p>
              <div className="flex justify-center gap-3">
                {ENERGY_OPTIONS.map((item) => (
                  <motion.button
                    key={item.key}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setEnergy(item.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-5 py-3 transition-all ${
                      energy === item.key
                        ? 'border-primary bg-primary/10 glow-shadow'
                        : 'border-border bg-muted/50 hover:border-primary/30'
                    }`}
                  >
                    <span className="text-3xl">{item.emoji}</span>
                    <span className={`text-xs ${energy === item.key ? 'text-primary' : 'text-muted-foreground'}`}>
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs text-muted-foreground">가용 시간</p>
                <p className="text-sm font-semibold text-primary">{timeLabel}</p>
              </div>
              <input
                type="range"
                min={30}
                max={180}
                step={15}
                value={availableTime}
                onChange={(e) => setAvailableTime(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full appearance-none bg-muted cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>30분</span>
                <span>3시간</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              disabled={!energy}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold gradient-primary text-primary-foreground disabled:opacity-30 transition-all"
            >
              <Sparkles size={18} />
              🔥 오늘의 루틴 생성!
            </motion.button>
          </motion.div>
        )}

        {/* Generated routines */}
        <AnimatePresence>
          {routines && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">오늘의 루틴</h2>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock size={14} />
                  <span>총 {getTotalDuration(routines)}</span>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {routines.map((routine, i) => (
                  <motion.div
                    key={routine.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card flex items-center gap-4 p-4"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                      {routine.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{routine.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{routine.category}</span>
                        <span className="text-[10px] text-primary font-medium">
                          {routine.reward.food > 0 && `🍎×${routine.reward.food}`}
                          {routine.reward.food > 0 && ' + '}
                          ⚡{routine.reward.exp} EXP
                          {routine.isExercise && ' 🔥'}
                        </span>
                      </div>
                      {routine.reward.bonusLabel && (
                        <p className="text-[10px] text-secondary mt-0.5">✨ {routine.reward.bonusLabel}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {routine.duration}분
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShuffle}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
                >
                  <Shuffle size={16} />
                  다시 섞기 🔀
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/timer', { state: { routines } })}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold gradient-primary text-primary-foreground"
                >
                  <Play size={16} />
                  이 루틴으로 시작!
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
