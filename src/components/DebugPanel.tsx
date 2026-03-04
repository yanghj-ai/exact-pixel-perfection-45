import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Zap, Coins, RotateCcw, Database, ChevronDown, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { getPet, savePet, grantRewards, getRequiredExp } from '@/lib/pet';
import { getCollection, addCoins, getCollectionStats, catchPokemon, grantExpToParty } from '@/lib/collection';
import { getRunningStats } from '@/lib/running';
import { debugAddDistance } from '@/lib/running';
import { getBattleRecords, getWeeklyBattleStats } from '@/lib/battle';
import { healAllAtCenter, getInjuredCount, resetHealthData } from '@/lib/pokemon-health';
import { getBondState, resetBondState } from '@/lib/pokemon-bond';
import { getConditionState, setCondition, resetConditionState } from '@/lib/pokemon-condition';
import { getRunningStreak, resetStreakData } from '@/lib/running-streak';
import { getTodaySteps } from '@/lib/pedometer';

interface DebugAction {
  label: string;
  emoji: string;
  color: string;
  onClick: () => void;
}

interface DebugInfo {
  label: string;
  value: string | number;
}

interface DebugPanelProps {
  pageInfo?: DebugInfo[];
  pageActions?: DebugAction[];
  onRefresh?: () => void;
}

export default function DebugPanel({ pageInfo, pageActions, onRefresh }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  const pet = getPet();
  const stats = getCollectionStats();
  const runStats = getRunningStats();
  const battleStats = getWeeklyBattleStats();
  const injuredCount = getInjuredCount();
  const requiredExp = getRequiredExp(pet.level);
  const bond = getBondState();
  const condition = getConditionState();
  const streak = getRunningStreak();

  const notify = (msg: string) => { toast(msg); onRefresh?.(); };

  const safeAction = (fn: () => void, label: string) => {
    try { fn(); } catch (e) {
      console.error(`[Debug] ${label} 오류:`, e);
      toast.error(`오류: ${label} - ${(e as Error).message}`);
    }
  };

  const commonActions: DebugAction[] = [
    { label: '+50 EXP', emoji: '⚡', color: 'primary', onClick: () => safeAction(() => { grantRewards(0, 50); notify('⚡ EXP +50'); }, 'EXP+50') },
    { label: '+200 EXP', emoji: '⚡', color: 'primary', onClick: () => safeAction(() => { grantRewards(0, 200); notify('⚡ EXP +200'); }, 'EXP+200') },
    { label: '+500 EXP', emoji: '⚡', color: 'primary', onClick: () => safeAction(() => { grantRewards(0, 500); notify('⚡ EXP +500'); }, 'EXP+500') },
    { label: '+100 코인', emoji: '💰', color: 'secondary', onClick: () => safeAction(() => { addCoins(100); notify('💰 코인 +100'); }, '코인+100') },
    { label: '+500 코인', emoji: '💰', color: 'secondary', onClick: () => safeAction(() => { addCoins(500); notify('💰 코인 +500'); }, '코인+500') },
    { label: '부상 전체 회복', emoji: '🏥', color: 'heal', onClick: () => safeAction(() => { healAllAtCenter(); notify('🏥 부상 회복 완료'); }, '부상회복') },
    { label: '컨디션 100', emoji: '💚', color: 'heal', onClick: () => safeAction(() => { setCondition(100); notify('💚 컨디션 MAX'); }, '컨디션MAX') },
    { label: '컨디션 10', emoji: '😰', color: 'destructive', onClick: () => safeAction(() => { setCondition(10); notify('😰 컨디션 10'); }, '컨디션10') },
    { label: 'Lv.16 (진화1)', emoji: '🔥', color: 'destructive', onClick: () => safeAction(() => {
      let totalExp = 0;
      for (let i = 1; i < 16; i++) totalExp += getRequiredExp(i);
      const currentPet = getPet();
      let currentTotal = 0;
      for (let i = 1; i < currentPet.level; i++) currentTotal += getRequiredExp(i);
      currentTotal += currentPet.exp;
      const needed = Math.max(1, totalExp - currentTotal);
      grantRewards(0, needed);
      notify('🔥 Lv.16 달성!');
    }, 'Lv16') },
    { label: 'Lv.36 (진화2)', emoji: '🐉', color: 'destructive', onClick: () => safeAction(() => {
      let totalExp = 0;
      for (let i = 1; i < 36; i++) totalExp += getRequiredExp(i);
      const currentPet = getPet();
      let currentTotal = 0;
      for (let i = 1; i < currentPet.level; i++) currentTotal += getRequiredExp(i);
      currentTotal += currentPet.exp;
      const needed = Math.max(1, totalExp - currentTotal);
      grantRewards(0, needed);
      notify('🐉 Lv.36 달성!');
    }, 'Lv36') },
    { label: '랜덤 포켓몬 포획', emoji: '⚡', color: 'accent', onClick: () => safeAction(() => {
      const id = Math.floor(Math.random() * 151) + 1;
      catchPokemon(id);
      notify(`⚡ #${id} 포획!`);
    }, '랜덤포획') },
    { label: '+1km 런닝', emoji: '🏃', color: 'heal', onClick: () => safeAction(() => { debugAddDistance(1); notify('🏃 1km 런닝 추가!'); }, '1km런닝') },
    { label: '+5km 런닝', emoji: '🏃', color: 'heal', onClick: () => safeAction(() => { debugAddDistance(5); notify('🏃 5km 런닝 추가!'); }, '5km런닝') },
    { label: '파티 EXP +3000', emoji: '⚡', color: 'accent', onClick: () => safeAction(() => { const results = grantExpToParty(3000); const evolved = results.filter(r => r.evolved); notify(`⚡ 파티 EXP +3000!${evolved.length > 0 ? ` 🎉 ${evolved.map(e => e.name).join(', ')} 진화!` : ''}`); }, '파티EXP') },
  ];

  const commonInfo: DebugInfo[] = [
    { label: '레벨', value: `Lv.${pet.level} (${pet.stage})` },
    { label: 'EXP', value: `${pet.exp}/${requiredExp}` },
    { label: '컨디션', value: `${condition.condition}/100` },
    { label: '친밀도', value: `${bond.friendship}/255` },
    { label: '기분', value: bond.mood },
    { label: '코인', value: stats.coins },
    { label: '도감', value: `${stats.uniqueSpecies}/151` },
    { label: '파티', value: `${stats.partySize}/6` },
    { label: '스트릭', value: `${streak.currentStreak}일` },
    { label: '오늘걸음', value: getTodaySteps() },
    { label: '배틀', value: `${battleStats.wins}승 ${battleStats.losses}패` },
    { label: '부상', value: `${injuredCount}마리` },
  ];

  const allInfo = [...commonInfo, ...(pageInfo || [])];
  const allActions = [...(pageActions || []), ...commonActions];

  const getColorClass = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary/10 border-primary/30 text-primary';
      case 'secondary': return 'bg-secondary/10 border-secondary/30 text-secondary';
      case 'destructive': return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'heal': return 'bg-heal/10 border-heal/30 text-heal';
      case 'accent': return 'bg-accent/10 border-accent/30 text-accent';
      default: return 'bg-muted border-border text-muted-foreground';
    }
  };

  return (
    <div className="mt-6 mb-2">
      <button onClick={() => setOpen(v => !v)} className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
        <Bug size={12} />
        <span>디버그 모드</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 glass-card p-4 space-y-4 border border-destructive/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-destructive flex items-center gap-1"><Bug size={12} /> 디버그 패널</p>
                <button
                  onClick={() => {
                    if (confirm('모든 데이터를 초기화할까요?')) {
                      const keys = Object.keys(localStorage).filter(k => k.startsWith('routinmon'));
                      keys.forEach(k => localStorage.removeItem(k));
                      resetHealthData();
                      resetBondState();
                      resetConditionState();
                      resetStreakData();
                      window.location.href = '/';
                    }
                  }}
                  className="flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80"
                >
                  <RotateCcw size={10} /> 전체 초기화
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {allInfo.map((info, i) => (
                  <div key={i} className="rounded-lg bg-muted/30 p-1.5 text-center">
                    <p className="text-[8px] text-muted-foreground">{info.label}</p>
                    <p className="text-[10px] font-bold text-foreground">{info.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground mb-2 font-medium">⚡ 퀵 액션</p>
                <div className="flex gap-1.5 flex-wrap">
                  {allActions.map((action, i) => (
                    <button key={i} onClick={action.onClick} className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors hover:opacity-80 ${getColorClass(action.color)}`}>
                      {action.emoji} {action.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground mb-1 font-medium">
                  <Database size={10} className="inline mr-1" />
                  LocalStorage ({Object.keys(localStorage).filter(k => k.startsWith('routinmon')).length} keys)
                </p>
                <div className="max-h-24 overflow-y-auto rounded bg-muted/20 p-1.5 text-[8px] font-mono text-muted-foreground space-y-0.5">
                  {Object.keys(localStorage).filter(k => k.startsWith('routinmon')).sort().map(key => {
                    const val = localStorage.getItem(key) || '';
                    return (
                      <div key={key} className="truncate">
                        <span className="text-primary">{key}</span>: {val.length > 60 ? val.slice(0, 60) + '...' : val}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
