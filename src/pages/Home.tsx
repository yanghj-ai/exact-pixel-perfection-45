import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '@/lib/storage';
import { getPet, grantRewards } from '@/lib/pet';
import type { PetState, LevelUpResult } from '@/lib/pet';
import { checkAndGrantAttendance } from '@/lib/attendance';
import { getRunningStats, type RunningStats } from '@/lib/running';
import { getCollection, getCollectionStats, getParty, syncStarterWithPet } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getBondState, getMoodDialogue, type PokemonMood } from '@/lib/pokemon-bond';
import { getConditionState, getConditionLevel, getConditionEmoji, getConditionLabel } from '@/lib/pokemon-condition';
import { getRunningStreak } from '@/lib/running-streak';
import { getTodaySteps } from '@/lib/pedometer';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import AttendanceBonus from '@/components/AttendanceBonus';
import DebugPanel from '@/components/DebugPanel';

// Sub-components
import PetCard from '@/components/home/PetCard';
import PartyPreview from '@/components/home/PartyPreview';
import QuickActions from '@/components/home/QuickActions';
import RunningGoals from '@/components/home/RunningGoals';
import CollectionStatsCard from '@/components/home/CollectionStatsCard';
import HealingCenter from '@/components/home/HealingCenter';

export default function Home() {
  const navigate = useNavigate();
  const [profile] = useState(getProfile());
  const [pet, setPet] = useState<PetState>(getPet());
  const [dialogue, setDialogue] = useState('');
  const [runStats] = useState<RunningStats>(getRunningStats());
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(v => v + 1);

  const collectionStats = getCollectionStats();
  const party = getParty();
  const bond = getBondState();
  const condition = getConditionState();
  const condLevel = getConditionLevel(condition.condition);
  const streak = getRunningStreak();
  const todaySteps = getTodaySteps();

  // Overlays
  const [levelUpResult, setLevelUpResult] = useState<LevelUpResult | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ consecutiveDays: number; bonusFood: number; bonusExp: number } | null>(null);

  useEffect(() => {
    if (!profile.onboardingComplete) {
      navigate('/', { replace: true });
      return;
    }
    syncStarterWithPet(pet.level, pet.stage, pet.name);
    // Set initial dialogue based on mood
    setDialogue(getMoodDialogue(bond.mood));

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

  const handleAttendanceClose = useCallback(() => setShowAttendance(false), []);

  const leadPokemon = party[0];
  const leadSpecies = leadPokemon ? getPokemonById(leadPokemon.speciesId) : undefined;

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
            {streak.currentStreak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1">
                <span className="text-xs">🔥</span>
                <span className="text-xs font-bold text-destructive">{streak.currentStreak}일</span>
              </div>
            )}
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
          mood={bond.mood}
          condition={condition.condition}
          conditionLevel={condLevel}
          friendship={bond.friendship}
          onDialogueChange={setDialogue}
        />

        <PartyPreview party={party} />
        <QuickActions condition={condition.condition} conditionLevel={condLevel} />

        {/* 오늘 걸음수 + 스트릭 위젯 */}
        <RunningGoals todaySteps={todaySteps} streak={streak} />

        <CollectionStatsCard uniqueSpecies={collectionStats.uniqueSpecies} completionRate={collectionStats.completionRate} runStats={runStats} />
        <HealingCenter party={party} onRefresh={refresh} />

        <DebugPanel
          onRefresh={() => { setPet(getPet()); }}
        />
      </div>

      <BottomNav />
      <LevelUpOverlay result={levelUpResult} pet={getPet()} onClose={() => setLevelUpResult(null)} />
      {attendanceData && (
        <AttendanceBonus show={showAttendance} consecutiveDays={attendanceData.consecutiveDays} bonusFood={attendanceData.bonusFood} bonusExp={attendanceData.bonusExp} onClose={handleAttendanceClose} />
      )}
    </div>
  );
}
