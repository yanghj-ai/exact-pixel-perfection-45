import { getProfile } from '@/lib/storage';
import { getLevelInfo, getBadges } from '@/lib/gamification';
import BottomNav from '@/components/BottomNav';
import { motion } from 'framer-motion';
import { User, Settings, ChevronRight, Bell, Moon, HelpCircle } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: 'easeOut' as const },
  }),
};

export default function Profile() {
  const profile = getProfile();
  const totalXP = profile.streak * 15; // simple XP formula
  const totalRoutines = Math.max(profile.streak, 0);
  const level = getLevelInfo(totalXP);
  const badges = getBadges(profile.streak, totalRoutines);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const settingsItems = [
    { icon: Bell, label: '알림 설정' },
    { icon: Moon, label: '다크 모드' },
    { icon: HelpCircle, label: '도움말 & 피드백' },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-12 space-y-5">

        {/* 프로필 + 레벨 */}
        <motion.div
          className="glass-card flex flex-col items-center p-8 text-center"
          variants={fadeUp} initial="hidden" animate="visible" custom={0}
        >
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full gradient-primary">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{profile.name || '루티너'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lv.{level.level} {level.title} {level.emoji}
          </p>

          {/* XP 바 */}
          <div className="mt-4 w-full">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>XP {level.currentXP}</span>
              {level.requiredXP > 0 && <span>{level.requiredXP} 필요</span>}
            </div>
            <div className="w-full rounded-full bg-muted h-2.5 overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${level.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' as const }}
              />
            </div>
          </div>
        </motion.div>

        {/* 통계 */}
        <motion.div
          className="glass-card p-5"
          variants={fadeUp} initial="hidden" animate="visible" custom={1}
        >
          <h2 className="font-semibold text-foreground mb-3">통계</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{totalRoutines}</p>
              <p className="text-xs text-muted-foreground">완료 루틴</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{profile.streak}</p>
              <p className="text-xs text-muted-foreground">연속 스트릭</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">{unlockedCount}/{badges.length}</p>
              <p className="text-xs text-muted-foreground">획득 배지</p>
            </div>
          </div>
        </motion.div>

        {/* 배지 컬렉션 */}
        <motion.div
          className="glass-card p-5"
          variants={fadeUp} initial="hidden" animate="visible" custom={2}
        >
          <h2 className="font-semibold text-foreground mb-4">배지 컬렉션</h2>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all ${
                  badge.unlocked
                    ? 'bg-muted/60'
                    : 'bg-muted/20 opacity-40 grayscale'
                }`}
              >
                <span className="text-2xl">{badge.emoji}</span>
                <span className="text-[11px] font-medium text-foreground leading-tight text-center">
                  {badge.name}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight text-center">
                  {badge.description}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 설정 */}
        <motion.div
          className="glass-card overflow-hidden"
          variants={fadeUp} initial="hidden" animate="visible" custom={3}
        >
          <h2 className="font-semibold text-foreground px-5 pt-5 pb-3">설정</h2>
          {settingsItems.map((item, i) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 px-5 py-3.5 text-sm text-foreground hover:bg-muted/40 transition-colors ${
                i < settingsItems.length - 1 ? 'border-b border-border/30' : ''
              }`}
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
