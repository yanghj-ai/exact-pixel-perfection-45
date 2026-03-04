import { motion } from 'framer-motion';
import { Stethoscope, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getInjuredCount, getAllInjuries, healAllAtCenter } from '@/lib/pokemon-health';
import { addCoins, getCollectionStats, type OwnedPokemon } from '@/lib/collection';

interface HealingCenterProps {
  party: OwnedPokemon[];
  onRefresh: () => void;
}

export default function HealingCenter({ party, onRefresh }: HealingCenterProps) {
  const injuredCount = getInjuredCount();

  if (injuredCount === 0) return null;

  const handleHeal = () => {
    const cost = injuredCount * 10;
    const currentStats = getCollectionStats();
    if (currentStats.coins < cost) {
      toast.error('코인이 부족합니다!', { description: `필요: ${cost} 코인` });
      return;
    }
    addCoins(-cost);
    const result = healAllAtCenter();
    toast.success(`🏥 ${result.healed}마리 포켓몬 회복 완료!`, { description: `${cost} 코인 사용` });
    onRefresh();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4 mb-4 border-amber/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Stethoscope size={14} className="text-heal" />
          <span className="text-xs font-bold text-foreground">🏥 포켓몬 센터</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber/10 text-amber font-medium">
          <AlertTriangle size={10} className="inline mr-0.5" />
          부상 {injuredCount}마리
        </span>
      </div>
      <div className="space-y-2 mb-3">
        {getAllInjuries().slice(0, 4).map(injury => {
          const member = party.find(p => p.uid === injury.uid);
          const species = member ? getPokemonById(member.speciesId) : null;
          return species ? (
            <div key={injury.uid} className="flex items-center gap-2">
              <img src={species.spriteUrl} alt={species.name} className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
              <span className="text-xs text-foreground flex-1">{member?.nickname || species.name}</span>
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${injury.hpRatio * 100}%`, background: injury.hpRatio > 0.5 ? 'hsl(var(--heal-green))' : 'hsl(var(--amber))' }} />
              </div>
              <span className="text-[10px] text-muted-foreground w-10 text-right">{injury.minutesLeft}분</span>
            </div>
          ) : null;
        })}
      </div>
      <button
        onClick={handleHeal}
        className="w-full rounded-xl bg-heal/10 border border-heal/30 py-2 text-xs font-medium text-heal hover:bg-heal/20 transition-colors"
      >
        💊 전체 회복 ({injuredCount * 10} 코인)
      </button>
      <p className="text-[9px] text-muted-foreground text-center mt-1.5">또는 시간이 지나면 자연 회복됩니다</p>
    </motion.div>
  );
}
