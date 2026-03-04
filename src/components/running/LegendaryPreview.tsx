import { motion } from 'framer-motion';
import { Sparkles, Lock, Check } from 'lucide-react';
import { getPokemonById } from '@/lib/pokemon-registry';
import { checkLegendaryEncounterConditions, LEGENDARY_DEFS } from '@/lib/legendary';
import { isChallengeCompleted, CHALLENGE_DEFS } from '@/lib/challenge';
import { getOwnedSpeciesIds } from '@/lib/collection';

export default function LegendaryPreview() {
  const available = checkLegendaryEncounterConditions();
  const ownedIds = getOwnedSpeciesIds();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4 glass-card p-4 border border-secondary/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-secondary" />
        <span className="text-xs font-bold text-foreground">전설 포켓몬</span>
      </div>
      <div className="space-y-2">
        {LEGENDARY_DEFS.map(def => {
          const sp = getPokemonById(def.speciesId);
          const caught = ownedIds.has(def.speciesId);
          const isAvailable = available.some(a => a.speciesId === def.speciesId);

          // Check which required challenges are done
          const challengeStatus = def.speciesId === 151
            ? [] // Mew: all challenges
            : def.requiredChallenges.map(id => ({
                id,
                name: CHALLENGE_DEFS.find(d => d.id === id)?.name ?? id,
                done: isChallengeCompleted(id),
              }));

          return (
            <div key={def.speciesId} className={`flex items-center gap-3 p-2 rounded-xl border ${
              caught ? 'bg-secondary/10 border-secondary/30' :
              isAvailable ? 'bg-secondary/5 border-secondary/20' :
              'bg-muted/30 border-border/20'
            }`}>
              {sp ? (
                <img src={sp.spriteUrl} alt={sp.name} className={`w-8 h-8 object-contain ${!caught && !isAvailable ? 'brightness-0 opacity-30' : ''}`} style={{ imageRendering: 'pixelated' }} />
              ) : (
                <span className="text-xl">{def.emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">{def.name}</span>
                  {caught && <Check size={10} className="text-secondary" />}
                </div>
                {caught ? (
                  <p className="text-[10px] text-secondary">✅ 포획 완료!</p>
                ) : isAvailable ? (
                  <p className="text-[10px] text-secondary">🌟 조우 가능! 런닝을 시작하세요!</p>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    <Lock size={8} className="text-muted-foreground" />
                    {def.speciesId === 151 ? (
                      <span className="text-[9px] text-muted-foreground">전 챌린지 100% 달성 필요</span>
                    ) : def.speciesId === 150 ? (
                      <span className="text-[9px] text-muted-foreground">뮤 보유 + T4 + 유전자 촉매</span>
                    ) : (
                      challengeStatus.map(cs => (
                        <span key={cs.id} className={`text-[9px] px-1 py-0.5 rounded ${cs.done ? 'bg-secondary/20 text-secondary' : 'bg-muted text-muted-foreground'}`}>
                          {cs.done ? '✅' : '🔒'} {cs.name}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
