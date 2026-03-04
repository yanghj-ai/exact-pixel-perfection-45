import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Coins, Zap, Sparkles, AlertTriangle } from 'lucide-react';
import { getPokemonById } from '@/lib/pokemon-registry';
import { type OwnedPokemon } from '@/lib/collection';
import { type TurnBasedBattleState, type BattleTurnLog } from '@/lib/battle';
import { type NpcTrainer } from '@/lib/npc-trainers';
import { clearPendingEncounter } from '@/lib/npc-encounter';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';

interface BattleResultProps {
  battleState: TurnBasedBattleState;
  selectedNpc: NpcTrainer;
  rewards: { coins: number; exp: number; bonusItems: { name: string; emoji: string; count: number }[]; coinsLost: number };
  allTurnLogs: BattleTurnLog[];
  party: OwnedPokemon[];
  isAiNpc: boolean;
  onRematch: () => void;
}

export default function BattleResult({ battleState, selectedNpc, rewards, allTurnLogs, party, isAiNpc, onRematch }: BattleResultProps) {
  const navigate = useNavigate();
  const won = battleState.winner === 'player';
  const playerHpRatios = battleState.playerTeam.map(p => ({ uid: p.uid, hpRatio: p.currentHp / p.maxHp }));

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-5xl block mb-3">
            {won ? '🏆' : '😢'}
          </motion.span>
          <h1 className="text-2xl font-bold text-foreground">{won ? '승리!' : '패배...'}</h1>
          <p className="text-sm text-muted-foreground mt-1">vs {selectedNpc.name} ({selectedNpc.title})</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-4 mb-4 text-center">
          <span className="text-2xl">{selectedNpc.emoji}</span>
          <p className="text-sm text-foreground mt-2">
            "{won ? selectedNpc.dialogue.win : selectedNpc.dialogue.lose}"
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-3">배틀 요약</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{battleState.turnCount}</p>
              <p className="text-[10px] text-muted-foreground">총 턴 수</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{allTurnLogs.filter(t => t.critical).length}</p>
              <p className="text-[10px] text-muted-foreground">크리티컬</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{allTurnLogs.filter(t => t.missed).length}</p>
              <p className="text-[10px] text-muted-foreground">빗나감</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass-card p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-3">{won ? '🎁 보상' : '💸 패널티'}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {won ? (
              <>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2">
                  <Coins size={16} className="text-secondary" />
                  <span className="font-bold text-secondary">+{rewards.coins}</span>
                </motion.div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2">
                  <Zap size={16} className="text-accent" />
                  <span className="font-bold text-accent">+{rewards.exp} EXP</span>
                </motion.div>
                {rewards.bonusItems.map((item, i) => (
                  <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4 + i * 0.2, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
                    <Sparkles size={14} className="text-primary" />
                    <span className="font-bold text-primary">{item.emoji} {item.name} x{item.count}</span>
                  </motion.div>
                ))}
              </>
            ) : (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2">
                <Coins size={16} className="text-destructive" />
                <span className="font-bold text-destructive">-{rewards.coinsLost} 코인</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {playerHpRatios.some(p => p.hpRatio < 1) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="glass-card p-3 mb-4 border-amber/30 bg-amber/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber" />
              <span className="text-xs font-medium text-foreground">부상 포켓몬</span>
            </div>
            <div className="flex gap-2">
              {playerHpRatios.filter(p => p.hpRatio < 1).map(p => {
                const member = party.find(m => m.uid === p.uid);
                const species = member ? getPokemonById(member.speciesId) : null;
                return species ? (
                  <div key={p.uid} className="flex items-center gap-1 text-[10px]">
                    <img src={species.spriteUrl} alt={species.name} className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                    <span className={p.hpRatio <= 0 ? 'text-destructive' : 'text-amber'}>
                      {p.hpRatio <= 0 ? '기절' : `${Math.round(p.hpRatio * 100)}%`}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">시간이 지나면 자연 회복되거나, 포켓몬 센터에서 즉시 회복하세요</p>
          </motion.div>
        )}

        <div className="flex gap-3">
          {isAiNpc ? (
            <Button onClick={() => { clearPendingEncounter(); navigate('/run'); }} className="flex-1 gradient-primary text-primary-foreground border-0">
              🏃 런닝 계속하기
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate('/home')} className="flex-1">
                🏥 포켓몬 센터
              </Button>
              <Button onClick={onRematch} className="flex-1 gradient-primary text-primary-foreground border-0">
                다시 배틀
              </Button>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
