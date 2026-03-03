import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProfile } from '@/lib/storage';
import { Flame, Sparkles, Clock } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const greetingByTime = () => {
  const h = new Date().getHours();
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
};

const todayRoutines = [
  { id: 1, emoji: '🚶', title: '가벼운 산책', duration: '20분', category: '산책' },
  { id: 2, emoji: '📚', title: '독서 시간', duration: '30분', category: '독서' },
  { id: 3, emoji: '🤸', title: '스트레칭', duration: '15분', category: '스트레칭' },
];

export default function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getProfile());

  useEffect(() => {
    if (!profile.onboardingComplete) {
      navigate('/', { replace: true });
    }
  }, [profile, navigate]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

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

        {/* Condition Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card mb-6 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">오늘 컨디션 어때요?</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            컨디션에 맞는 루틴을 추천해드릴게요
          </p>
          <div className="flex justify-center gap-4">
            {[
              { emoji: '⚡', label: '충전됨' },
              { emoji: '😊', label: '보통' },
              { emoji: '😴', label: '피곤' },
            ].map((item) => (
              <button
                key={item.label}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-muted/50 px-5 py-3 transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Today's Routines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">오늘의 루틴</h2>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock size={14} />
              <span>총 1시간 5분</span>
            </div>
          </div>
          <div className="space-y-3">
            {todayRoutines.map((routine, i) => (
              <motion.div
                key={routine.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="glass-card flex items-center gap-4 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  {routine.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{routine.title}</p>
                  <p className="text-xs text-muted-foreground">{routine.category}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {routine.duration}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
