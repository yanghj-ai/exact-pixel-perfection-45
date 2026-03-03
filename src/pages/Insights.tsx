import BottomNav from '@/components/BottomNav';
import { getProfile } from '@/lib/storage';
import { getWeeklyData, getTopActivities, getMoodData } from '@/lib/insights-data';
import { motion } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const MEDAL = ['🥇', '🥈', '🥉'];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' as const },
  }),
};

export default function Insights() {
  const profile = getProfile();
  const weeklyData = getWeeklyData();
  const topActivities = getTopActivities(weeklyData);
  const moodData = getMoodData(weeklyData);

  const barConfig = {
    completionRate: { label: '완료율', color: 'hsl(var(--teal))' },
  };

  const moodConfig = {
    mood: { label: '기분 점수', color: 'hsl(var(--mint))' },
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-12 space-y-5">
        <h1 className="text-2xl font-bold text-foreground">인사이트</h1>

        {/* 스트릭 강조 */}
        <motion.div
          className="glass-card p-6 flex items-center gap-4"
          variants={fadeUp} initial="hidden" animate="visible" custom={0}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
            <Flame className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">연속 스트릭</p>
            <p className="text-3xl font-bold text-foreground">
              {profile.streak}<span className="text-lg font-medium text-muted-foreground ml-1">일</span>
            </p>
          </div>
        </motion.div>

        {/* 주간 완료율 BarChart */}
        <motion.div
          className="glass-card p-5"
          variants={fadeUp} initial="hidden" animate="visible" custom={1}
        >
          <h2 className="text-base font-semibold text-foreground mb-4">주간 완료율</h2>
          <ChartContainer config={barConfig} className="h-[200px] w-full">
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} domain={[0, 100]} unit="%" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </motion.div>

        {/* TOP 3 활동 */}
        <motion.div
          className="glass-card p-5"
          variants={fadeUp} initial="hidden" animate="visible" custom={2}
        >
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" /> TOP 활동
          </h2>
          <div className="space-y-3">
            {topActivities.map((act, i) => (
              <div key={act.id} className="flex items-center gap-3">
                <span className="text-xl">{MEDAL[i]}</span>
                <span className="text-lg">{act.emoji}</span>
                <span className="text-sm font-medium text-foreground flex-1">{act.label}</span>
                <span className="text-sm font-semibold text-primary">{act.count}회</span>
              </div>
            ))}
            {topActivities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">아직 데이터가 없어요</p>
            )}
          </div>
        </motion.div>

        {/* 기분 변화 LineChart */}
        <motion.div
          className="glass-card p-5"
          variants={fadeUp} initial="hidden" animate="visible" custom={3}
        >
          <h2 className="text-base font-semibold text-foreground mb-4">기분 변화</h2>
          <ChartContainer config={moodConfig} className="h-[180px] w-full">
            <AreaChart data={moodData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--mint))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--mint))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="mood" stroke="var(--color-mood)" strokeWidth={2} fill="url(#moodGradient)" />
            </AreaChart>
          </ChartContainer>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
