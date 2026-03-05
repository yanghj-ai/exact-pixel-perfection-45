import { motion } from 'framer-motion';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { getConditionState, getConditionLevel, getConditionEmoji, getConditionLabel, getConditionStatMultiplier, getConditionCritBonus } from '@/lib/pokemon-condition';

interface ConditionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConditionDetailSheet({ open, onOpenChange }: ConditionDetailSheetProps) {
  const state = getConditionState();
  const level = getConditionLevel(state.condition);
  const emoji = getConditionEmoji(level);
  const label = getConditionLabel(level);
  const statMult = getConditionStatMultiplier(state.condition);
  const critBonus = getConditionCritBonus(state.condition);
  const maxDailyRecovery = 50;
  const remainingRecovery = Math.max(0, maxDailyRecovery - state.todayRecovery);

  const conditionColor = state.condition >= 80
    ? 'hsl(var(--heal-green))'
    : state.condition >= 60
      ? 'hsl(var(--secondary))'
      : state.condition >= 40
        ? 'hsl(var(--amber))'
        : 'hsl(var(--destructive))';

  const rows = [
    { label: '현재 컨디션', value: `${state.condition}/100`, sub: `${emoji} ${label}` },
    { label: '배틀 스탯 배율', value: `x${statMult.toFixed(2)}`, sub: statMult >= 1 ? '✅ 보너스' : '⚠️ 패널티' },
    { label: '크리티컬 보정', value: `${critBonus >= 0 ? '+' : ''}${(critBonus * 100).toFixed(0)}%`, sub: critBonus > 0 ? '🎯 추가' : critBonus < 0 ? '📉 감소' : '—' },
    { label: '오늘 회복량', value: `${state.todayRecovery}/${maxDailyRecovery}`, sub: remainingRecovery > 0 ? `잔여 ${remainingRecovery}` : '오늘 한도 도달' },
    { label: '일일 자연 감소', value: '-10/일', sub: '미접속 시 최대 5일분 감소' },
    { label: '회복 방법', value: '러닝', sub: '100걸음당 +1 회복' },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base flex items-center gap-2">
            {emoji} 컨디션 상세
          </DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground">
            컨디션이 높을수록 배틀에서 유리해요
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Big condition bar */}
          <div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: conditionColor }}
                initial={false}
                animate={{ width: `${state.condition}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-center mt-1 text-lg font-bold text-foreground">{state.condition}<span className="text-xs text-muted-foreground font-normal">/100</span></p>
          </div>

          {/* Info rows */}
          <div className="space-y-2">
            {rows.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{row.label}</p>
                  <p className="text-[10px] text-muted-foreground">{row.sub}</p>
                </div>
                <span className="text-sm font-bold text-foreground">{row.value}</span>
              </motion.div>
            ))}
          </div>

          {/* Tip */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[11px] text-muted-foreground">
              💡 <strong className="text-foreground">팁:</strong> 매일 꾸준히 러닝하면 컨디션이 최고 상태를 유지해요. 
              컨디션이 높을수록 배틀에서 스탯 보너스와 크리티컬 확률이 올라갑니다!
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
