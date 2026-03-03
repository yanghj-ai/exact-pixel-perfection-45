import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile } from '@/lib/storage';
import { getPet, savePet, applyHpDecay, feedPet, interactPet, getRandomDialogue, getStageInfo, getRequiredExp, grantRewards } from '@/lib/pet';
import type { PetState, LevelUpResult } from '@/lib/pet';
import { checkAndGrantAttendance } from '@/lib/attendance';
import { getRunningStats, type RunningStats } from '@/lib/running';
import { getCollection, getCollectionStats, getParty, interactWithPokemon, addCoins } from '@/lib/collection';
import { getPokemonById, RARITY_CONFIG } from '@/lib/pokemon-registry';
import { Apple, Play, Target, TrendingUp, Bug, Zap, Egg, BookOpen, Users, Heart, Stethoscope, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getInjuredCount, getAllInjuries, healAllAtCenter } from '@/lib/pokemon-health';
import BottomNav from '@/components/BottomNav';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import AttendanceBonus from '@/components/AttendanceBonus';
import PetSprite from '@/components/PetSprite';
import type { PokemonStage } from '@/lib/pet';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated';

export default function Home() {
  const navigate = useNavigate();
  const [profile] = useState(getProfile());
  const [pet, setPet] = useState<PetState>(getPet());
  const [dialogue, setDialogue] = useState('');
  const [runStats, setRunStats] = useState<RunningStats>(getRunningStats());
  const [showDebug, setShowDebug] = useState(false);

  const collectionStats = getCollectionStats();
  const party = getParty();
  const collection = getCollection();

  // Overlays
  const [levelUpResult, setLevelUpResult] = useState<LevelUpResult | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<{ consecutiveDays: number; bonusFood: number; bonusExp: number } | null>(null);

  useEffect(() => {
    if (!profile.onboardingComplete) {
      navigate('/', { replace: true });
      return;
    }
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

  const stageInfo = getStageInfo(pet.stage);
  const requiredExp = getRequiredExp(pet.level);
  const expProgress = (pet.exp / requiredExp) * 100;

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

  const handleDebugExp = useCallback((amount: number) => {
    const { pet: updatedPet, levelUp } = grantRewards(0, amount);
    setPet(updatedPet);
    if (levelUp) setLevelUpResult(levelUp);
    toast(`⚡ EXP +${amount}`);
  }, []);

  const handleDebugSetLevel = useCallback((targetLevel: number) => {
    let totalExp = 0;
    for (let i = 1; i < targetLevel; i++) totalExp += getRequiredExp(i);
    const currentPet = getPet();
    let currentTotal = 0;
    for (let i = 1; i < currentPet.level; i++) currentTotal += getRequiredExp(i);
    currentTotal += currentPet.exp;
    const needed = Math.max(1, totalExp - currentTotal);
    const { pet: updatedPet, levelUp } = grantRewards(5, needed);
    setPet(updatedPet);
    if (levelUp) setLevelUpResult(levelUp);
  }, []);

  // Lead pokemon (first in party)
  const leadPokemon = party[0];
  const leadSpecies = leadPokemon ? getPokemonById(leadPokemon.speciesId) : null;

  const dailyGoal = runStats.goals.find(g => g.type === 'daily');
  const weeklyGoal = runStats.goals.find(g => g.type === 'weekly');

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Pokémon Center Header */}
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

        {/* 🐾 Tamagotchi-style Partner Pokémon */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-4 relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full gradient-primary opacity-[0.07] blur-2xl" />
          </div>

          {/* Name & Level header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {leadPokemon?.nickname || leadSpecies?.name || pet.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">Lv.{pet.level}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Heart size={10} className="text-primary" />
              <span>{leadPokemon ? leadPokemon.friendship : 0}/255</span>
            </div>
          </div>

          {/* Pet Sprite Arena */}
          <div className="relative h-48 flex items-center justify-center">
            <PetSprite
              stage={pet.stage as PokemonStage}
              hp={pet.hp}
              maxHp={pet.maxHp}
              happiness={pet.happiness}
              streak={runStats.currentStreak}
              size="normal"
              onTap={() => {
                if (leadPokemon) {
                  const result = interactWithPokemon(leadPokemon.uid);
                  toast(result.message);
                } else {
                  setDialogue(getRandomDialogue('interact'));
                }
              }}
              onLongPress={handleFeed}
            />
          </div>

          {/* HP & EXP bars */}
          <div className="px-5 pb-2 space-y-1.5">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground font-medium">HP</span>
                <span className="text-[10px] text-muted-foreground">{pet.hp}/{pet.maxHp}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: pet.hp / pet.maxHp > 0.5 ? 'hsl(var(--heal-green))' : pet.hp / pet.maxHp > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))' }}
                  initial={false}
                  animate={{ width: `${(pet.hp / pet.maxHp) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground font-medium">EXP</span>
                <span className="text-[10px] text-muted-foreground">{pet.exp}/{requiredExp}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${Math.min(100, expProgress)}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
          </div>

          {/* Dialogue bubble */}
          <motion.div key={dialogue} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mb-4 p-2.5 rounded-xl bg-muted/50 border border-border/30">
            <p className="text-xs text-foreground text-center">{dialogue}</p>
          </motion.div>

          {/* Interaction hint */}
          <div className="text-center pb-3">
            <span className="text-[9px] text-muted-foreground/50">탭하여 교감 · 꾹 눌러 먹이주기</span>
          </div>
        </motion.div>

        {/* Party Preview */}
        {party.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-4">
            <button onClick={() => navigate('/party')} className="flex items-center justify-between mb-3 w-full">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground">내 파티</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{party.length}/6 →</span>
            </button>
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => {
                const member = party[i];
                const species = member ? getPokemonById(member.speciesId) : null;
                return (
                  <div
                    key={i}
                    className={`flex-1 aspect-square rounded-xl flex items-center justify-center ${
                      species ? 'bg-muted/60 border border-border/50' : 'bg-muted/30 border border-dashed border-border/30'
                    }`}
                  >
                    {species ? (
                      <img src={species.spriteUrl} alt={species.name} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <span className="text-muted-foreground/30 text-lg">+</span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <motion.button whileTap={{ scale: 0.93 }} onClick={handleFeed} className="glass-card flex flex-col items-center gap-1.5 py-3 hover:bg-card/90 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Apple size={18} className="text-primary" />
            </div>
            <span className="text-[10px] font-medium text-foreground">먹이</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate('/run')} className="glass-card flex flex-col items-center gap-1.5 py-3 hover:bg-card/90 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-heal/10">
              <Play size={18} className="text-heal" />
            </div>
            <span className="text-[10px] font-medium text-foreground">런닝</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate('/pokedex')} className="glass-card flex flex-col items-center gap-1.5 py-3 hover:bg-card/90 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <BookOpen size={18} className="text-accent" />
            </div>
            <span className="text-[10px] font-medium text-foreground">도감</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate('/history')} className="glass-card flex flex-col items-center gap-1.5 py-3 hover:bg-card/90 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber/10">
              <TrendingUp size={18} className="text-amber" />
            </div>
            <span className="text-[10px] font-medium text-foreground">기록</span>
          </motion.button>
        </div>

        {/* Eggs */}
        {collection.eggs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Egg size={14} className="text-amber" />
              <span className="text-xs font-bold text-foreground">알 부화 중</span>
              <span className="text-[10px] text-muted-foreground">{collection.eggs.length}/9</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {collection.eggs.slice(0, 3).map(egg => {
                const progress = (egg.distanceWalked / egg.distanceRequired) * 100;
                const rarityConf = RARITY_CONFIG[egg.rarity];
                return (
                  <div key={egg.id} className="text-center">
                    <div className={`mx-auto w-10 h-12 rounded-b-full rounded-t-[40%] ${rarityConf.bgColor} border border-border/50 flex items-center justify-center mb-1 ${progress > 80 ? 'animate-egg-wobble' : ''}`}>
                      <span className="text-lg">🥚</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden mb-0.5">
                      <div className="h-full rounded-full gradient-heal" style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground">{egg.distanceWalked.toFixed(1)}/{egg.distanceRequired}km</p>
                  </div>
                );
              })}
            </div>
            {collection.eggs.length > 3 && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">+{collection.eggs.length - 3}개 더</p>
            )}
          </motion.div>
        )}

        {/* Running Goals */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-heal" />
            <span className="text-xs font-bold text-foreground">런닝 목표</span>
          </div>
          {dailyGoal && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">🏃 일일</span>
                <span className="text-xs font-semibold text-foreground">{dailyGoal.currentKm.toFixed(1)} / {dailyGoal.targetKm} km</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full gradient-heal" initial={false} animate={{ width: `${Math.min(100, (dailyGoal.currentKm / dailyGoal.targetKm) * 100)}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
          )}
          {weeklyGoal && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">📅 주간</span>
                <span className="text-xs font-semibold text-foreground">{weeklyGoal.currentKm.toFixed(1)} / {weeklyGoal.targetKm} km</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${Math.min(100, (weeklyGoal.currentKm / weeklyGoal.targetKm) * 100)}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
          )}
        </motion.div>

        {/* Collection Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="pokeball-badge" />
              <div>
                <p className="text-xs text-muted-foreground">포켓몬 도감</p>
                <p className="text-sm font-bold text-foreground">{collectionStats.uniqueSpecies} / 151</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-center">
              <div>
                <p className="text-xs font-bold text-foreground">🔥 {runStats.currentStreak}</p>
                <p className="text-[9px] text-muted-foreground">연속</p>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">📏 {runStats.totalDistanceKm.toFixed(1)}</p>
                <p className="text-[9px] text-muted-foreground">km</p>
              </div>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full gradient-primary" style={{ width: `${collectionStats.completionRate}%` }} />
          </div>
        </motion.div>

        {/* 🏥 Pokemon Center - Healing */}
        {getInjuredCount() > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4 mb-4 border-amber/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Stethoscope size={14} className="text-heal" />
                <span className="text-xs font-bold text-foreground">🏥 포켓몬 센터</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber/10 text-amber font-medium">
                <AlertTriangle size={10} className="inline mr-0.5" />
                부상 {getInjuredCount()}마리
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
              onClick={() => {
                const cost = getInjuredCount() * 10;
                if (collectionStats.coins < cost) {
                  toast.error('코인이 부족합니다!', { description: `필요: ${cost} 코인` });
                  return;
                }
                addCoins(-cost);
                const result = healAllAtCenter();
                toast.success(`🏥 ${result.healed}마리 포켓몬 회복 완료!`, { description: `${cost} 코인 사용` });
              }}
              className="w-full rounded-xl bg-heal/10 border border-heal/30 py-2 text-xs font-medium text-heal hover:bg-heal/20 transition-colors"
            >
              💊 전체 회복 ({getInjuredCount() * 10} 코인)
            </button>
            <p className="text-[9px] text-muted-foreground text-center mt-1.5">또는 시간이 지나면 자연 회복됩니다</p>
          </motion.div>
        )}

        {/* Debug toggle */}
        <button onClick={() => setShowDebug(v => !v)} className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mx-auto">
          <Bug size={12} /> 디버그 모드
        </button>
        <AnimatePresence>
          {showDebug && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 glass-card p-4 space-y-3 border border-destructive/30">
                <p className="text-xs font-bold text-destructive flex items-center gap-1"><Bug size={12} /> 디버그</p>
                <p className="text-[10px] text-muted-foreground">Lv.{pet.level} | {pet.stage} | EXP {pet.exp}/{requiredExp} | 도감 {collectionStats.uniqueSpecies}/151</p>
                <div className="flex gap-2 flex-wrap">
                  {[50, 200, 500, 1000].map(amount => (
                    <button key={amount} onClick={() => handleDebugExp(amount)} className="flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary">
                      <Zap size={10} /> +{amount}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleDebugSetLevel(16)} className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs text-destructive">Lv.16 리자드</button>
                  <button onClick={() => handleDebugSetLevel(36)} className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs text-destructive">Lv.36 리자몽</button>
                </div>
                <button onClick={() => { localStorage.removeItem('routinmon-pet'); localStorage.removeItem('routinmon-attendance'); localStorage.removeItem('routinmon-running'); localStorage.removeItem('routinmon-collection'); setPet(getPet()); setRunStats(getRunningStats()); toast('🔄 초기화 완료'); }} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">🔄 전체 초기화</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
      <LevelUpOverlay result={levelUpResult} pet={getPet()} onClose={() => setLevelUpResult(null)} />
      {attendanceData && (
        <AttendanceBonus show={showAttendance} consecutiveDays={attendanceData.consecutiveDays} bonusFood={attendanceData.bonusFood} bonusExp={attendanceData.bonusExp} onClose={handleAttendanceClose} />
      )}
    </div>
  );
}
