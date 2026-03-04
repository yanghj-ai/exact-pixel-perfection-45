import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { getProfile } from '@/lib/storage';
import { getPet, applyHpDecay, feedPet, getRandomDialogue } from '@/lib/pet';
import type { PetState, LevelUpResult } from '@/lib/pet';
import { checkAndGrantAttendance } from '@/lib/attendance';
import { getRunningStats, type RunningStats } from '@/lib/running';
import { getCollection, getCollectionStats, getParty, syncStarterWithPet } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import AttendanceBonus from '@/components/AttendanceBonus';
import DebugPanel from '@/components/DebugPanel';
import EggHatchOverlay from '@/components/EggHatchOverlay';
import type { PokemonEgg } from '@/lib/collection';

// Sub-components
import PetCard from '@/components/home/PetCard';
import PartyPreview from '@/components/home/PartyPreview';
import QuickActions from '@/components/home/QuickActions';
import EggsList from '@/components/home/EggsList';
import RunningGoals from '@/components/home/RunningGoals';
import CollectionStatsCard from '@/components/home/CollectionStatsCard';
import HealingCenter from '@/components/home/HealingCenter';

export default function Home() {
  const navigate = useNavigate();
  const [profile] = useState(getProfile());
  const [pet, setPet] = useState<PetState>(getPet());
  const [dialogue, setDialogue] = useState('');
  const [runStats, setRunStats] = useState<RunningStats>(getRunningStats());
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(v => v + 1);

  const collectionStats = getCollectionStats();
  const party = getParty();
  const collection = getCollection();

  // Overlays
  const [levelUpResult, setLevelUpResult] = useState<LevelUpResult | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ consecutiveDays: number; bonusFood: number; bonusExp: number } | null>(null);
  const [hatchedEggs, setHatchedEggs] = useState<PokemonEgg[]>([]);

  useEffect(() => {
    if (!profile.onboardingComplete) {
      navigate('/', { replace: true });
      return;
    }
    syncStarterWithPet(pet.level, pet.stage, pet.name);
    const updated = applyHpDecay(pet);
    setPet(updated);
    setDialogue(getRandomDialogue(updated.hp <= 0 ? 'hungry' : 'idle'));

    const attendance = checkAndGrantAttendance();
    if (attendance.isNewDay) {
      setPet(getPet());
      setAttendanceData({
        consecutiveDays: attendance.consecutiveDays,
        bonusFood: attendance.bonusFood,
        bonusExp: attendance.bonusExp,
      });
      setTimeout(() => setShowAttendance(true), 800);
      if (attendance.levelUp) setLevelUpResult(attendance.levelUp);
    }
  }, []);

  const handleFeed = useCallback(() => {
    if (pet.foodCount <= 0) {
      toast('먹이가 없어요!', { description: '런닝을 완료하면 먹이를 얻을 수 있어요 🍎' });
      return;
    }
    const updated = feedPet(pet);
    if (updated) {
      setPet(updated);
      setDialogue(getRandomDialogue('fed'));
      toast('🍎 먹이를 줬어요!', { description: `HP +20 회복! (남은 먹이: ${updated.foodCount}개)` });
    }
  }, [pet]);

  const handleAttendanceClose = useCallback(() => setShowAttendance(false), []);

  const leadPokemon = party[0];
  const leadSpecies = leadPokemon ? getPokemonById(leadPokemon.speciesId) : undefined;
  const dailyGoal = runStats.goals.find(g => g.type === 'daily');
  const weeklyGoal = runStats.goals.find(g => g.type === 'weekly');

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="pokeball-badge" />
            <div>
              <p className="text-xs text-muted-foreground">포켓몬 센터</p>
              <p className="text-sm font-bold text-foreground">{profile.name} 트레이너</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <span className="text-xs">🍎</span>
              <span className="text-xs font-bold text-primary">{pet.foodCount}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1">
              <span className="text-xs">💰</span>
              <span className="text-xs font-bold text-accent">{collectionStats.coins}</span>
            </div>
          </div>
        </div>

        <PetCard
          pet={pet}
          leadPokemon={leadPokemon}
          leadSpecies={leadSpecies}
          dialogue={dialogue}
          runStats={runStats}
          onDialogueChange={setDialogue}
          onFeed={handleFeed}
        />

        <PartyPreview party={party} />
        <QuickActions onFeed={handleFeed} />
        <EggsList eggs={collection.eggs} />
        <RunningGoals dailyGoal={dailyGoal} weeklyGoal={weeklyGoal} />
        <CollectionStatsCard uniqueSpecies={collectionStats.uniqueSpecies} completionRate={collectionStats.completionRate} runStats={runStats} />
        <HealingCenter party={party} onRefresh={refresh} />

        <DebugPanel
          onRefresh={() => { setPet(getPet()); setRunStats(getRunningStats()); }}
          onEggHatch={(eggs) => setHatchedEggs(eggs)}
        />
      </div>

      <BottomNav />
      <LevelUpOverlay result={levelUpResult} pet={getPet()} onClose={() => setLevelUpResult(null)} />
      {attendanceData && (
        <AttendanceBonus show={showAttendance} consecutiveDays={attendanceData.consecutiveDays} bonusFood={attendanceData.bonusFood} bonusExp={attendanceData.bonusExp} onClose={handleAttendanceClose} />
      )}
      <AnimatePresence>
        {hatchedEggs.length > 0 && (
          <EggHatchOverlay
            hatchedEggs={hatchedEggs}
            onComplete={() => { setHatchedEggs([]); setPet(getPet()); setRunStats(getRunningStats()); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
