import { motion } from 'framer-motion';
import { type TurnBasedBattleState } from '@/lib/battle';

interface BattleSwitchingProps {
  battleState: TurnBasedBattleState;
  switchMessage: string;
}

export default function BattleSwitching({ battleState, switchMessage }: BattleSwitchingProps) {
  const nextPlayer = battleState.playerTeam[battleState.playerIdx];
  const nextOpponent = battleState.opponentTeam[battleState.opponentIdx];

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }} className="mb-4">
          {nextPlayer && nextOpponent && (
            <div className="flex items-center justify-center gap-6">
              <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-center">
                <img src={nextPlayer.spriteUrl} alt={nextPlayer.name} className="w-20 h-20 object-contain mx-auto" style={{ imageRendering: 'pixelated' }} />
                <p className="text-[10px] text-muted-foreground mt-1">{nextPlayer.nickname || nextPlayer.name}</p>
              </motion.div>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-2xl">⚔️</motion.span>
              <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-center">
                <img src={nextOpponent.spriteUrl} alt={nextOpponent.name} className="w-20 h-20 object-contain mx-auto" style={{ imageRendering: 'pixelated' }} />
                <p className="text-[10px] text-muted-foreground mt-1">{nextOpponent.nickname || nextOpponent.name}</p>
              </motion.div>
            </div>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card px-5 py-3 inline-block">
          <p className="text-sm font-medium text-foreground">{switchMessage}</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
