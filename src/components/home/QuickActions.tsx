import { motion } from 'framer-motion';
import { Apple, Play, BookOpen, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  onFeed: () => void;
}

export default function QuickActions({ onFeed }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    { icon: Apple, label: '먹이', color: 'bg-primary/10', textColor: 'text-primary', onClick: onFeed },
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
