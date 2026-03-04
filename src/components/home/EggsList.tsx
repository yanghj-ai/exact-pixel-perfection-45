import { motion } from 'framer-motion';
import { Egg } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RARITY_CONFIG } from '@/lib/pokemon-registry';
import type { PokemonEgg } from '@/lib/collection';

interface EggsListProps {
  eggs: PokemonEgg[];
}

export default function EggsList({ eggs }: EggsListProps) {
  const navigate = useNavigate();

  if (eggs.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Egg size={14} className="text-amber" />
          <span className="text-xs font-bold text-foreground">알 부화 중</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber/10 text-amber font-medium">{eggs.length}/9</span>
      </div>

      <div className="space-y-2.5">
        {eggs.map(egg => {
          const progress = (egg.distanceWalked / egg.distanceRequired) * 100;
          const rarityConf = RARITY_CONFIG[egg.rarity];
          const remaining = Math.max(0, egg.distanceRequired - egg.distanceWalked);
          const isAlmostDone = progress > 80;
          return (
            <div key={egg.id} className={`flex items-center gap-3 rounded-xl p-2.5 border transition-colors ${isAlmostDone ? 'bg-amber/5 border-amber/20' : 'bg-muted/30 border-border/30'}`}>
              <div className={`relative flex-shrink-0 w-10 h-12 rounded-b-full rounded-t-[40%] ${rarityConf.bgColor} border border-border/50 flex items-center justify-center ${isAlmostDone ? 'animate-pulse' : ''}`}>
                <span className="text-base">🥚</span>
                {isAlmostDone && (
                  <motion.div
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${rarityConf.bgColor} ${rarityConf.color}`}>
                    {rarityConf.emoji} {rarityConf.label}
                  </span>
                  <span className="text-[10px] font-bold text-foreground">{Math.min(100, Math.round(progress))}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-1">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: isAlmostDone
                        ? 'linear-gradient(90deg, hsl(var(--heal-green)), hsl(var(--amber)))'
                        : 'hsl(var(--heal-green))',
                    }}
                    initial={false}
                    animate={{ width: `${Math.min(100, progress)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">🏃 {egg.distanceWalked.toFixed(1)} / {egg.distanceRequired} km</span>
                  <span className="text-[9px] text-muted-foreground">남은 거리: {remaining.toFixed(1)}km</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/20 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">런닝으로 알을 부화시켜 보세요!</span>
        <button onClick={() => navigate('/run')} className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors">
          런닝 시작 →
        </button>
      </div>
    </motion.div>
  );
}
