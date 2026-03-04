import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { type NpcTrainer } from '@/lib/npc-trainers';

interface BattleIntroProps {
  npc: NpcTrainer;
}

export default function BattleIntro({ npc }: BattleIntroProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-8">
        <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-sm text-muted-foreground mb-4">
          {npc.title}
        </motion.p>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="text-5xl mb-3">
          {npc.emoji}
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xl font-bold text-foreground mb-3">
          {npc.name}이(가) 승부를 걸어왔다!
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="glass-card px-4 py-2 inline-block">
          <p className="text-sm text-foreground">"{npc.dialogue.before}"</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-6">
          <Swords size={24} className="text-primary mx-auto animate-pulse" />
        </motion.div>
      </motion.div>
    </div>
  );
}
