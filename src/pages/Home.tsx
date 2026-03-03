import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile } from '@/lib/storage';
import { generateRoutine, getTotalDuration, type EnergyLevel, type RoutineItem } from '@/lib/routines';
import { Flame, Sparkles, Clock, Shuffle, Play } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const greetingByTime = () => {
  const h = new Date().getHours();
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
};

const ENERGY_OPTIONS: { key: EnergyLevel; emoji: string; label: string }[] = [
  { key: 'high', emoji: '⚡', label: '충전됨' },
  { key: 'normal', emoji: '😊', label: '보통' },
  { key: 'tired', emoji: '😴', label: '피곤' },
];

const MOOD_TAGS = ['기쁨', '평온', '스트레스', '피곤', '의욕적'];

export default function Home() {
  const navigate = useNavigate();
  const [profile] = useState(getProfile());
  const [energy, setEnergy] = useState<EnergyLevel | null>(null);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [availableTime, setAvailableTime] = useState(90); // minutes
  const [routines, setRoutines] = useState<RoutineItem[] | null>(null);
  const [conditionDone, setConditionDone] = useState(false);

  useEffect(() => {
    if (!profile.onboardingComplete) {
      navigate('/', { replace: true });
    }
  }, [profile, navigate]);

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleGenerateRoutine = () => {
    if (!energy) return;
    setRoutines(generateRoutine(energy));
    setConditionDone(true);
  };

  const handleShuffle = () => {
    if (!energy) return;
    // cycle energy to get different routine
    const keys: EnergyLevel[] = ['high', 'normal', 'tired'];
    const currentIdx = keys.indexOf(energy);
    const nextEnergy = keys[(currentIdx + 1) % keys.length];
    setRoutines(generateRoutine(nextEnergy));
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const timeLabel = availableTime >= 60
    ? `${Math.floor(availableTime / 60)}시간${availableTime % 60 > 0 ? ` ${availableTime % 60}분` : ''}`
    : `${availableTime}분`;

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-sm text-muted-foreground">{dateStr}</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {greetingByTime()}, <span className="text-gradient-primary">{profile.name}</span>님
          </h1>
        </motion.div>

        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card mb-6 flex items-center gap-4 p-5"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <Flame className="h-7 w-7 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">현재 스트릭</p>
            <p className="text-2xl font-bold text-foreground">
              {profile.streak}일 <span className="text-lg">연속</span>
            </p>
          </div>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`h-6 w-2 rounded-full ${
                  i < profile.streak % 7 ? 'gradient-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </motion.div>

        {/* Condition Input */}
        <AnimatePresence mode="wait">
          {!conditionDone ? (
            <motion.div
              key="condition"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.2 }}
              className="glass-card mb-6 p-5 space-y-5"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">오늘 컨디션 어때요?</h2>
              </div>

              {/* Energy Level */}
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

              {/* Mood Tags */}
              <div>
                <p className="text-xs text-muted-foreground mb-2.5">오늘 기분</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {MOOD_TAGS.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => toggleMood(mood)}
                      className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
                        selectedMoods.includes(mood)
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Time Slider */}
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

              {/* Generate Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerateRoutine}
                disabled={!energy}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold gradient-primary text-primary-foreground disabled:opacity-30 transition-all"
              >
                <Sparkles size={18} />
                오늘의 루틴 생성하기
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Generated Routines */}
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
                      <p className="text-xs text-muted-foreground">{routine.category}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {routine.duration}분
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShuffle}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
                >
                  <Shuffle size={16} />
                  다시 섞기
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
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
