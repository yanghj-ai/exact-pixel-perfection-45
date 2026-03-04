// ═══════════════════════════════════════════════════════════
// FIX #4: 보상 미니카드 (러닝 시작 전 idle 화면)
// 횡스크롤 미니카드 — EXP, 코인, 컨디션, 친밀도, 배율
// ═══════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { calculateAutoMultiplier } from '@/lib/auto-multiplier';

interface RewardMiniCardsProps {
  streakDays: number;
  condition: number;
  friendship: number;
}

const CARDS = [
  { key: 'exp', icon: '⚡', label: 'EXP', getValue: () => '100/1000보' },
  { key: 'coin', icon: '💰', label: '코인', getValue: () => '5/1000보' },
  { key: 'condition', icon: '💚', label: '컨디션', getValue: (p: RewardMiniCardsProps) => `${p.condition}/100` },
  { key: 'friendship', icon: '💕', label: '친밀도', getValue: (p: RewardMiniCardsProps) => `${Math.min(255, p.friendship)}/255` },
];

export default function RewardMiniCards(props: RewardMiniCardsProps) {
  const mult = calculateAutoMultiplier(0, props.streakDays);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
      {CARDS.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex-shrink-0 flex items-center gap-2 rounded-2xl border border-border/50 bg-card/80 px-3 py-2"
        >
          <span className="text-base">{card.icon}</span>
          <div>
            <p className="text-[9px] text-muted-foreground">{card.label}</p>
            <p className="text-[11px] font-bold text-foreground">{card.getValue(props)}</p>
          </div>
        </motion.div>
      ))}
      {/* 배율 카드 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-shrink-0 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2"
      >
        <span className="text-base">🔥</span>
        <div>
          <p className="text-[9px] text-muted-foreground">배율</p>
          <p className="text-[11px] font-bold text-primary">
            ×{mult.exp.toFixed(1)}
            {props.streakDays >= 3 && <span className="text-[8px] ml-1">+스트릭</span>}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
