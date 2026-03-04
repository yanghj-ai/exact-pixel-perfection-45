import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { formatDuration, formatPace, type RunningSession, type Challenge } from '@/lib/running';
import { getPokemonById, RARITY_CONFIG } from '@/lib/pokemon-registry';
import { getPet } from '@/lib/pet';
import type { PokemonEgg, PartyExpResult } from '@/lib/collection';
import type { CatchQuest, QuestProgress } from '@/lib/catch-quest';
import PetSprite from '@/components/PetSprite';
import RunningMap from '@/components/RunningMap';
import BottomNav from '@/components/BottomNav';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import EggHatchOverlay from '@/components/EggHatchOverlay';
import { AnimatePresence } from 'framer-motion';
import type { LevelUpResult } from '@/lib/pet';
import { useNavigate } from 'react-router-dom';

interface RunningCompletedProps {
  session: RunningSession;
  foodReward: number;
  expReward: number;
  partyExpResults: PartyExpResult[];
  activeQuests: { quest: CatchQuest; progress: QuestProgress }[];
  completedChallenges: Challenge[];
  levelUpResult: LevelUpResult | null;
  hatchedEggs: PokemonEgg[];
  leaderSpecies: { spriteUrl: string; name: string } | null;
  onCloseLevelUp: () => void;
  onEggComplete: () => void;
}

export default function RunningCompleted({
  session, foodReward, expReward, partyExpResults, activeQuests,
  completedChallenges, levelUpResult, hatchedEggs, leaderSpecies,
  onCloseLevelUp, onEggComplete,
}: RunningCompletedProps) {
  const navigate = useNavigate();
  const pet = getPet();

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <span className="text-4xl">🎉</span>
          <h1 className="text-2xl font-bold text-foreground mt-2">런닝 완료!</h1>
        </motion.div>

        {session.route.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
            <RunningMap route={session.route} className="h-48" />
          </motion.div>
        )}

        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center mb-6">
          {leaderSpecies ? (
            <motion.img
              src={leaderSpecies.spriteUrl}
              alt={leaderSpecies.name}
              className="w-24 h-24 object-contain"
              style={{ imageRendering: 'pixelated' }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : (
            <PetSprite stage={pet.stage} hp={pet.hp} maxHp={pet.maxHp} happiness={pet.happiness} streak={0} />
          )}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card px-4 py-2 mt-2">
            <p className="text-sm text-foreground">정말 대단해! 🔥</p>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <div className="glass-card p-5 space-y-4 mb-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{session.distanceKm.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">km</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatDuration(session.durationSeconds)}</p>
              <p className="text-xs text-muted-foreground">시간</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">{session.paceMinPerKm > 0 ? formatPace(session.paceMinPerKm) : '-'}</p>
              <p className="text-xs text-muted-foreground">페이스</p>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-destructive" />
              <span className="text-sm font-semibold">{session.caloriesBurned} kcal</span>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="glass-card p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-3">🎁 획득 보상</p>
          <div className="flex gap-4 justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
              <span className="text-lg">🍎</span>
              <span className="font-bold text-primary">+{foodReward}</span>
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2">
              <span className="text-lg">⚡</span>
              <span className="font-bold text-secondary">+{expReward} EXP</span>
            </motion.div>
          </div>
        </div>

        {/* Party EXP */}
        {partyExpResults.length > 0 && partyExpResults.some(r => r.expGained > 0) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="glass-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-2">⚡ 파티 경험치</p>
            <div className="space-y-1.5">
              {partyExpResults.map(r => {
                const species = getPokemonById(r.speciesId);
                return (
                  <div key={r.uid} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {species && <img src={species.spriteUrl} alt={species.name} className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />}
                      <span className="text-xs font-medium text-foreground">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-secondary font-bold">+{r.expGained} EXP</span>
                      {r.levelAfter > r.levelBefore && <span className="text-primary font-bold">Lv.{r.levelBefore}→{r.levelAfter}</span>}
                      {r.evolved && r.evolvedTo && <span className="text-accent font-bold">✨ 진화!</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Caught Pokémon */}
        {activeQuests.filter(q => q.quest.completed).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }} className="glass-card p-4 mb-4 border border-secondary/30">
            <p className="text-xs text-muted-foreground mb-2">🔴 포획한 포켓몬</p>
            <div className="flex gap-2 flex-wrap">
              {activeQuests.filter(q => q.quest.completed).map(({ quest }) => {
                const sp = getPokemonById(quest.speciesId);
                return sp ? (
                  <div key={quest.id} className="flex items-center gap-1.5 bg-secondary/10 rounded-lg px-2 py-1">
                    <img src={sp.spriteUrl} alt={sp.name} className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
                    <span className="text-[10px] font-medium text-foreground">{sp.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </motion.div>
        )}

        {/* Challenges */}
        {completedChallenges.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="glass-card p-4 mb-4 border border-secondary/30">
            <p className="text-xs text-muted-foreground mb-2">🏆 챌린지 달성!</p>
            {completedChallenges.map(c => (
              <div key={c.id} className="flex items-center gap-2 py-1">
                <span className="text-lg">{c.emoji}</span>
                <span className="text-sm font-semibold text-foreground">{c.title}</span>
              </div>
            ))}
          </motion.div>
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/home')}
          className="w-full gradient-primary text-primary-foreground rounded-2xl py-4 font-bold text-lg mt-4"
        >
          홈으로 돌아가기
        </motion.button>
      </div>
      <BottomNav />
      <LevelUpOverlay result={levelUpResult} pet={getPet()} onClose={onCloseLevelUp} />
      <AnimatePresence>
        {hatchedEggs.length > 0 && (
          <EggHatchOverlay hatchedEggs={hatchedEggs} onComplete={onEggComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
