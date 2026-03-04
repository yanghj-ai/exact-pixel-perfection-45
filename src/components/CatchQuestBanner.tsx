// ═══════════════════════════════════════════════════════════
// 런닝 중 포획 퀘스트 진행률 배너
// ═══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonById } from '@/lib/pokemon-registry';
import type { CatchQuest, QuestProgress } from '@/lib/catch-quest';

interface CatchQuestBannerProps {
  quests: { quest: CatchQuest; progress: QuestProgress }[];
  onCaught?: (questId: string) => void;
}

export default function CatchQuestBanner({ quests }: CatchQuestBannerProps) {
  if (quests.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {quests.map(({ quest, progress }) => {
          const species = getPokemonById(quest.speciesId);
          const caught = progress.allMet;

          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`glass-card p-3 border relative overflow-hidden ${
                caught ? 'border-secondary/50' : 'border-accent/30'
              }`}
            >
              {caught && (
                <div className="absolute inset-0 gradient-heal opacity-10" />
              )}
              <div className="flex items-center gap-3 relative">
                <motion.div
                  animate={caught ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : { y: [0, -3, 0] }}
                  transition={{ duration: caught ? 0.6 : 2, repeat: caught ? 0 : Infinity }}
                  className="flex-shrink-0"
                >
                  {species ? (
                    <img
                      src={species.spriteUrl}
                      alt={species.name}
                      className="w-12 h-12 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <span className="text-2xl">❓</span>
                  )}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-foreground">
                      {caught ? `✨ ${quest.speciesName} 포획!` : `야생의 ${quest.speciesName} 발견!`}
                    </span>
                  </div>

                  {!caught && (
                    <div className="space-y-1">
                      {progress.perRequirement.map((req, i) => (
                        <div key={i}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[9px] text-muted-foreground">{req.label}</span>
                            <span className={`text-[9px] font-bold ${req.met ? 'text-secondary' : 'text-muted-foreground'}`}>
                              {req.met ? '✅' : `${req.progress}%`}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${req.met ? 'gradient-heal' : 'gradient-warm'}`}
                              initial={false}
                              animate={{ width: `${req.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {caught && (
                    <p className="text-[10px] text-secondary">🎉 포획 조건 달성! 컬렉션에 추가되었습니다!</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
