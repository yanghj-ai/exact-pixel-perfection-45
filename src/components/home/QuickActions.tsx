import { motion } from 'framer-motion';
import { Activity, Play, BookOpen, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getConditionEmoji, getConditionLabel, type ConditionLevel } from '@/lib/pokemon-condition';
import { toast } from 'sonner';

interface QuickActionsProps {
  condition: number;
  conditionLevel: ConditionLevel;
}

export default function QuickActions({ condition, conditionLevel }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleConditionInfo = () => {
    const info: Record<ConditionLevel, string> = {
      exhausted: '스탯 -20%. 러닝으로 컨디션을 올려주세요!',
      tired: '스탯 -10%. 조금만 더 달려볼까요?',
      normal: '기본 상태. 달리면 컨디션이 올라갑니다!',
      good: '스탯 +5%! 좋은 컨디션이에요!',
      perfect: '스탯 +10%, 크리티컬 +5%! 최고 상태!',
    };
    toast(`${getConditionEmoji(conditionLevel)} 컨디션: ${getConditionLabel(conditionLevel)}`, {
      description: info[conditionLevel],
    });
  };

  const actions = [
    { icon: Activity, label: '컨디션', color: 'bg-primary/10', textColor: 'text-primary', onClick: handleConditionInfo },
    { icon: Play, label: '런닝', color: 'bg-heal/10', textColor: 'text-heal', onClick: () => navigate('/run') },
    { icon: BookOpen, label: '도감', color: 'bg-accent/10', textColor: 'text-accent', onClick: () => navigate('/pokedex') },
    { icon: TrendingUp, label: '기록', color: 'bg-amber/10', textColor: 'text-amber', onClick: () => navigate('/history') },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {actions.map(({ icon: Icon, label, color, textColor, onClick }) => (
        <motion.button key={label} whileTap={{ scale: 0.93 }} onClick={onClick} className="glass-card flex flex-col items-center gap-1.5 py-3 hover:bg-card/90 transition-colors">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
            <Icon size={18} className={textColor} />
          </div>
          <span className="text-[10px] font-medium text-foreground">{label}</span>
        </motion.button>
      ))}
    </div>
  );
}
