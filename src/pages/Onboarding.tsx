import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { saveProfile, CATEGORIES } from '@/lib/storage';
import { ChevronRight, Clock } from 'lucide-react';

const stepVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [offWorkTime, setOffWorkTime] = useState('18:00');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const next = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      saveProfile({
        name,
        offWorkTime,
        categories: selectedCategories,
        onboardingComplete: true,
      });
      navigate('/home');
    }
  };

  const canProceed =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && offWorkTime) ||
    (step === 2 && selectedCategories.length > 0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12">
      {/* Progress */}
      <div className="flex w-full max-w-sm gap-2">
        {[0, 1, 2].map((i) => (
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
              <div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary text-4xl"
                >
                  🌙
                </motion.div>
                <h1 className="text-2xl font-bold text-foreground">
                  반가워요!
                </h1>
                <p className="mt-2 text-muted-foreground">
                  루틴잇과 함께할 이름을 알려주세요
                </p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-center text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>
          )}

          {step === 1 && (
            <div className="w-full space-y-8 text-center">
              <div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary"
                >
                  <Clock className="h-10 w-10 text-primary-foreground" />
                </motion.div>
                <h1 className="text-2xl font-bold text-foreground">
                  퇴근 시간은 언제인가요?
                </h1>
                <p className="mt-2 text-muted-foreground">
                  루틴 시작 시간을 맞춰드릴게요
                </p>
              </div>
              <input
                type="time"
                value={offWorkTime}
                onChange={(e) => setOffWorkTime(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-center text-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
              />
            </div>
          )}

          {step === 2 && (
            <div className="w-full space-y-8 text-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  어떤 활동에 관심 있나요?
                </h1>
                <p className="mt-2 text-muted-foreground">
                  관심 있는 활동을 모두 골라주세요
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => {
                  const selected = selectedCategories.includes(cat.id);
                  return (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/10 glow-shadow'
                          : 'border-border bg-card hover:border-primary/30'
                      }`}
                    >
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="font-medium text-foreground">
                        {cat.label}
                      </span>
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
        {step === 2 ? '시작하기' : '다음'}
        <ChevronRight size={20} />
      </motion.button>
    </div>
  );
}
