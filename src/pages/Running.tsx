import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Timer, Flame, Navigation, Map, Footprints, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDuration, formatPace } from '@/lib/running';
import { stepsToKm, estimateCaloriesFromSteps, getTodaySteps } from '@/lib/pedometer';
import { calculateAutoMultiplier, getNextTier } from '@/lib/auto-multiplier';
import { getCompanionDialogue } from '@/lib/companion-dialogue';
import { getMoodEmoji as getCompanionMoodEmoji } from '@/lib/pokemon-companion';
import { getMoodEmoji as getBondMoodEmoji } from '@/lib/pokemon-bond';
import { getGradeInfo } from '@/lib/pokemon-grade';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getPet } from '@/lib/pet';
import { getLegendaryMissionProgress } from '@/lib/legendary-story-flow';
import { useRunningSession } from '@/hooks/useRunningSession';

import PetSprite from '@/components/PetSprite';
import BottomNav from '@/components/BottomNav';
import RunningMap from '@/components/RunningMap';
import RunningCompanion from '@/components/running/RunningCompanion';
import { getConditionState } from '@/lib/pokemon-condition';
import DebugPanel from '@/components/DebugPanel';
import CatchQuestBanner from '@/components/CatchQuestBanner';
import SpecialEncounterOverlay from '@/components/SpecialEncounterOverlay';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import { LegendaryBanner, NpcEncounterBanner } from '@/components/running/RunningBanners';
import LegendaryPreview from '@/components/running/LegendaryPreview';
import RunningCountdown from '@/components/running/RunningCountdown';
import RunningAmoledScreen from '@/components/running/RunningAmoledScreen';
import LegendaryStoryIntro from '@/components/running/LegendaryStoryIntro';
import LegendaryCutscene from '@/components/running/LegendaryCutscene';
import EncounterPokemonCard from '@/components/running/EncounterPokemonCard';
import RewardMiniCards from '@/components/running/RewardMiniCards';

export default function RunningPage() {
  const s = useRunningSession();

  // ─── Legendary Story Intro Screen ──────────────────────
  if (s.runState === 'legendaryIntro' && s.legendaryStoryDef) {
    return (
      <LegendaryStoryIntro
        definition={s.legendaryStoryDef}
        onStart={s.handleLegendaryIntroStart}
        onCancel={s.handleLegendaryIntroCancel}
      />
    );
  }

  // ─── Legendary Cutscene Screen ─────────────────────────
  if (s.runState === 'legendaryCutscene' && s.legendaryStoryDef) {
    return (
      <LegendaryCutscene
        definition={s.legendaryStoryDef}
        onComplete={s.handleLegendaryCutsceneComplete}
      />
    );
  }

  // ─── Countdown Screen ──────────────────────────────────
  if (s.runState === 'countdown') {
    return <RunningCountdown onComplete={s.handleCountdownComplete} />;
  }

  // ─── Completed Screen ──────────────────────────────────
  if (s.runState === 'completed' && s.completedData) {
    return (
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-5 pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <span className="text-4xl">🎉</span>
            <h1 className="text-2xl font-bold text-foreground mt-2">런닝 완료!</h1>
          </motion.div>

          {s.gpsPoints.length > 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-4">
              <RunningMap route={s.gpsPoints.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp }))} className="h-48" />
            </motion.div>
          )}

          {/* Companion */}
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center mb-6">
            {s.leaderSpecies ? (
              <motion.img src={s.leaderSpecies.spriteUrl} alt={s.leaderSpecies.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
            ) : (
              <PetSprite stage={s.pet.stage} hp={100} maxHp={100} happiness={5} streak={0} />
            )}
            <div className="glass-card px-4 py-2 mt-2">
              <p className="text-sm text-foreground">같이 달려서 즐거웠어! 😊</p>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="glass-card p-5 space-y-4 mb-4">
            <div className="text-center">
              <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-5xl font-bold text-primary tabular-nums">{s.completedData.steps.toLocaleString()}</motion.p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Footprints size={14} /> 걸음</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-foreground">{s.completedData.distanceKm.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{formatDuration(s.completedData.durationSec)}</p>
                <p className="text-xs text-muted-foreground">시간</p>
              </div>
              <div>
                <p className="text-xl font-bold text-secondary">{s.completedData.pace ? formatPace(s.completedData.pace) : '-'}</p>
                <p className="text-xs text-muted-foreground">페이스</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-1.5">
                <Flame size={16} className="text-destructive" />
                <span className="text-sm font-semibold">{s.completedData.calories} kcal</span>
              </div>
            </div>
          </div>

          {/* Auto-multiplier achievement */}
          {s.completedData.goalAchieved && s.completedData.goalBonus > 1 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="glass-card p-3 mb-4 border border-secondary/30 text-center">
              <span className="text-lg">{calculateAutoMultiplier(s.completedData.distanceKm, s.streak.currentStreak).emoji}</span>
              <p className="text-sm font-bold text-secondary">
                {calculateAutoMultiplier(s.completedData.distanceKm, s.streak.currentStreak).label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">보상 ×{s.completedData.goalBonus.toFixed(1)} 적용</p>
            </motion.div>
          )}

          {/* Sequential reward cards */}
          <div className="space-y-2 mb-4">
            {[
              { icon: '🏃', label: '거리', value: `${s.completedData.distanceKm.toFixed(2)} km`, delay: 0.4, bg: 'bg-muted/50' },
              { icon: '⚡', label: 'EXP', value: `+${s.completedData.rewards.exp}`, delay: 0.55, bg: 'bg-primary/10' },
              { icon: '🪙', label: '코인', value: `+${s.completedData.rewards.coins}`, delay: 0.7, bg: 'bg-secondary/10' },
              { icon: '💚', label: '컨디션', value: `+${s.completedData.conditionRecovery}`, delay: 0.85, bg: 'bg-heal/10' },
              { icon: '💕', label: '친밀도', value: `+${s.completedData.friendshipGain}`, delay: 1.0, bg: 'bg-accent/10' },
            ].map(card => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: card.delay, type: 'spring', stiffness: 200 }}
                className={`flex items-center justify-between rounded-2xl ${card.bg} px-4 py-3`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{card.icon}</span>
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{card.value}</span>
              </motion.div>
            ))}

            {/* Next multiplier hint */}
            {(() => {
              const next = getNextTier(s.completedData.distanceKm);
              return next ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.15 }}
                  className="text-center text-[11px] text-muted-foreground/60 mt-1"
                >
                  💡 {next.km}km 달성 시 ×{next.mult} 배율 적용
                </motion.div>
              ) : null;
            })()}
          </div>

          {/* Milestones */}
          {s.completedData.milestones.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="glass-card p-4 mb-4 border border-primary/30">
              <p className="text-xs text-muted-foreground mb-2">🏆 스트릭 마일스톤!</p>
              {s.completedData.milestones.map(m => (
                <div key={m.days} className="flex items-center gap-2 py-1">
                  <span className="text-lg">{m.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{m.label}</span>
                  <span className="text-xs text-muted-foreground">({m.days}일 연속)</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Party EXP */}
          {s.completedData.partyExpResults.length > 0 && s.completedData.partyExpResults.some(r => r.expGained > 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="glass-card p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-2">⚡ 파티 경험치</p>
              <div className="space-y-1.5">
                {s.completedData.partyExpResults.map(r => {
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
                        {r.evolved && <span className="text-accent font-bold">✨ 진화!</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Spawned Pokemon — Enhanced Cards */}
          {s.autoCollected.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="glass-card p-4 mb-4 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-3">🎊 포획한 포켓몬 ({s.autoCollected.length}마리)</p>
              <div className="space-y-2">
                {s.autoCollected.map((enc, i) => (
                  <EncounterPokemonCard key={`${enc.speciesId}-${i}`} encounter={enc} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Extra spawn results (non-auto-collected) */}
          {s.completedData.spawnResults.length > 0 && s.autoCollected.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="glass-card p-4 mb-4 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-2">🎊 포획한 포켓몬</p>
              <div className="space-y-2">
                {s.completedData.spawnResults.map((spawn, i) => {
                  const species = getPokemonById(spawn.speciesId);
                  const gradeInfo = getGradeInfo(spawn.grade);
                  return (
                    <motion.div
                      key={spawn.speciesId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.15 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {species && <img src={species.spriteUrl} alt={species.name} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />}
                        <div>
                          <span className="text-xs font-medium text-foreground">{spawn.name}</span>
                          {spawn.isNew && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">NEW</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: gradeInfo.color }}>{gradeInfo.emoji} {gradeInfo.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Caught Pokémon */}
          {s.activeQuests.filter(q => q.quest.completed).length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="glass-card p-4 mb-4 border border-secondary/30">
              <p className="text-xs text-muted-foreground mb-2">🔴 포획한 포켓몬</p>
              <div className="flex gap-2 flex-wrap">
                {s.activeQuests.filter(q => q.quest.completed).map(({ quest }) => {
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

          {/* Challenge Achievements */}
          {s.completedData.challengeResults && s.completedData.challengeResults.newlyCompleted.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="glass-card p-4 mb-4 border border-accent/20">
              <p className="text-xs text-muted-foreground mb-2">🏅 챌린지 달성</p>
              <div className="space-y-2">
                {s.completedData.challengeResults.newlyCompleted.map((ch, i) => (
                  <motion.div
                    key={ch.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + i * 0.15 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{ch.emoji}</span>
                      <div>
                        <span className="text-xs font-medium text-foreground">{ch.name}</span>
                        <p className="text-[10px] text-muted-foreground">{ch.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-secondary font-bold">+{ch.rewardCoins} 🪙</span>
                      {ch.rewardTitle && <span className="px-1 py-0.5 rounded bg-accent/15 text-accent font-bold">🏷️ {ch.rewardTitle}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Legendary mission special card */}
          {s.legendaryStoryDef && s.legendaryStoryComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: 'spring' }}
              className="glass-card p-4 mb-4 border-2 border-primary/40 text-center"
            >
              <span className="text-3xl">{s.legendaryStoryDef.emoji}</span>
              <p className="text-sm font-bold text-primary mt-1">{s.legendaryStoryDef.name} 합류!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.legendaryStoryDef.storyOutro}</p>
            </motion.div>
          )}

          {/* Share + Home buttons */}
          <div className="flex gap-3 mt-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const text = `오늘 ${s.completedData!.distanceKm.toFixed(1)}km 달리면서 ${s.autoCollected.length || s.completedData!.spawnResults.length}마리 포켓몬을 만났습니다! #루틴몬`;
                if (navigator.share) {
                  navigator.share({ title: '루틴몬 런닝 기록', text }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(text).then(() => toast('클립보드에 복사됨!')).catch(() => {});
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-border py-3 font-medium text-sm text-foreground"
            >
              <Share2 size={16} /> 공유하기
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => s.navigate('/home')}
              className="flex-[2] gradient-primary text-primary-foreground rounded-2xl py-3 font-bold text-lg"
            >
              홈으로 돌아가기
            </motion.button>
          </div>
        </div>
        <BottomNav />
        <LevelUpOverlay result={s.completedData.levelUpResult} pet={getPet()} onClose={() => s.setCompletedData(prev => prev ? { ...prev, levelUpResult: null } : null)} />
      </div>
    );
  }

  // ─── Active / Idle Screen ──────────────────────────────
  return (
    <div className="min-h-screen pb-24">
      {/* AMOLED Running Mode Overlay */}
      {s.amoledMode && (s.runState === 'running' || s.runState === 'paused') && (
        <RunningAmoledScreen
          elapsed={s.elapsed}
          distanceKm={s.currentDistance}
          pace={s.currentPace}
          encounterCount={s.spawnCount}
          companionSpeciesId={s.leaderSpecies?.id ?? null}
          companionName={s.leaderSpecies?.name || '포켓몬'}
          isPaused={s.runState === 'paused'}
          onPause={s.handlePause}
          onResume={s.handleResume}
          onStop={s.handleStop}
          legendaryMissionName={s.legendaryStoryMission?.pokemonName}
          legendaryMissionTargetKm={s.legendaryStoryMission?.targetKm}
          legendaryMissionProgress={s.legendaryStoryMission ? getLegendaryMissionProgress(s.legendaryStoryMission, s.currentDistance) : undefined}
          streakDays={s.streak.currentStreak}
          estimatedExp={Math.floor(s.steps / 10)}
          estimatedCoins={Math.floor(s.steps / 200)}
          companionDialogue={s.milestoneMsg || s.cheerMessage}
          isEncountering={s.autoCollected.length > 0 && Date.now() - ((s.autoCollected[s.autoCollected.length - 1] as any)?.timestamp ?? 0) < 3000}
        />
      )}
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">🏃 런닝</h1>
          <div className="flex items-center gap-3">
            {s.runState !== 'idle' && (
              <button onClick={s.toggleAmoledMode} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${s.amoledMode ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                🖥️ {s.amoledMode ? 'ON' : 'OFF'}
              </button>
            )}
            {s.runState !== 'idle' && s.gpsAvailable && (
              <button onClick={s.toggleMap} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${s.showMap ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Map size={12} /> 지도
              </button>
            )}
            {s.streak.currentStreak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1">
                <Flame size={14} className="text-destructive" />
                <span className="text-sm font-bold text-destructive">{s.streak.currentStreak}일</span>
              </div>
            )}
          </div>
        </div>

        {/* Live map */}
        {s.showMap && s.runState !== 'idle' && s.gpsPoints.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
            <RunningMap route={s.gpsPoints.map(p => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp }))} isLive className="h-48" />
          </motion.div>
        )}

        {/* Companion + Mood during running */}
        {s.runState !== 'idle' && !s.showMap && (
          <RunningCompanion
            species={s.leaderSpecies}
            currentPace={s.currentPace}
            totalDistance={s.currentDistance}
            condition={s.condition.condition}
            isEncountering={s.autoCollected.length > 0 && s.autoCollected[s.autoCollected.length - 1] !== undefined && Date.now() - (s.autoCollected[s.autoCollected.length - 1] as any)?.timestamp < 3000}
            dialogue={s.milestoneMsg || s.cheerMessage}
            fallbackName={s.pet.name || '포켓몬'}
          />
        )}

        {/* Stats display */}
        <div className="glass-card p-6 mb-4">
          {s.runState === 'idle' ? (
            <div className="text-center py-4">
              {s.leaderSpecies ? (
                <div className="mb-4 flex justify-center">
                  <motion.img src={s.leaderSpecies.spriteUrl} alt={s.leaderSpecies.name} className="w-32 h-32 object-contain" style={{ imageRendering: 'pixelated' }} animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} />
                </div>
              ) : (
                <div className="mb-4"><PetSprite stage={s.pet.stage} hp={100} maxHp={100} happiness={5} streak={0} /></div>
              )}
              <p className="text-lg font-semibold text-foreground mb-1">
                {getBondMoodEmoji(s.bond.mood)} {s.leaderSpecies?.name || '포켓몬'}와 함께 달려볼까?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {getCompanionDialogue({
                  pokemonName: s.leaderSpecies?.name || '포켓몬',
                  friendship: s.bond.friendship,
                  condition: s.condition.condition,
                  timeOfDay: (() => { const h = new Date().getHours(); if (h >= 5 && h < 12) return 'morning' as const; if (h >= 12 && h < 17) return 'afternoon' as const; if (h >= 17 && h < 21) return 'evening' as const; return 'night' as const; })(),
                  streakDays: s.streak.currentStreak,
                  stepsToday: getTodaySteps(),
                })}
              </p>

              <RewardMiniCards
                streakDays={s.streak.currentStreak}
                condition={s.condition.condition}
                friendship={s.bond.friendship}
              />

              <div className="flex items-center justify-center gap-4 text-sm mt-3">
                {getTodaySteps() > 0 && (
                  <span className="text-muted-foreground">오늘 {getTodaySteps().toLocaleString()}보</span>
                )}
                {s.streak.currentStreak > 0 && (
                  <span className="text-primary font-bold">🔥 {s.streak.currentStreak}일 연속</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <motion.p key={Math.floor(s.steps / 10)} initial={{ scale: 1.02 }} animate={{ scale: 1 }} className="text-5xl font-bold text-primary tabular-nums">
                  {s.steps.toLocaleString()}
                </motion.p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Footprints size={14} /> 걸음 {getCompanionMoodEmoji(s.companionMood)}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground tabular-nums">{s.currentDistance.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">km</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5"><Timer size={10} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{formatDuration(s.elapsed)}</p>
                  <p className="text-[10px] text-muted-foreground">시간</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5"><Navigation size={10} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{s.currentPace ? formatPace(s.currentPace) : "-'--\""}</p>
                  <p className="text-[10px] text-muted-foreground">페이스</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5"><Flame size={10} className="text-muted-foreground" /></div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{estimateCaloriesFromSteps(s.steps)}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
              </div>

              {!s.pedometerAvailable && (
                <p className="text-[10px] text-muted-foreground text-center">⚠️ 만보기 미지원 — GPS 모드</p>
              )}
            </div>
          )}
        </div>

        {/* Catch Quest Banners */}
        {s.runState !== 'idle' && <CatchQuestBanner quests={s.activeQuests.filter(q => !q.quest.completed)} />}

        <AnimatePresence>
          {s.legendaryEncounter && s.runState !== 'idle' && (
            <LegendaryBanner encounter={s.legendaryEncounter} progress={s.legendaryMissionProgress} caught={s.legendaryCaught} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {s.npcEncounter && s.runState !== 'idle' && (
            <NpcEncounterBanner npc={s.npcEncounter} onBattle={s.handleBattleNpc} onDecline={() => { s.setNpcEncounter(null); toast('트레이너가 떠나갔다...'); }} />
          )}
        </AnimatePresence>

        {s.isGeneratingNpc && s.runState === 'running' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-3 mb-4 text-center border border-primary/20">
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block text-lg">⚡</motion.span>
            <p className="text-xs text-muted-foreground mt-1">풀숲에서 인기척이...</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {s.runState === 'idle' && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={s.handleStart} className="flex h-20 w-20 items-center justify-center rounded-full gradient-primary glow-shadow">
              <Play size={32} className="text-primary-foreground ml-1" />
            </motion.button>
          )}
          {s.runState === 'running' && (
            <>
              <motion.button whileTap={{ scale: 0.9 }} onClick={s.handlePause} className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 border border-secondary/30">
                <Pause size={24} className="text-secondary" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={s.handleStop} className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 border border-destructive/30">
                <Square size={24} className="text-destructive" />
              </motion.button>
            </>
          )}
          {s.runState === 'paused' && (
            <>
              <motion.button whileTap={{ scale: 0.9 }} onClick={s.handleResume} className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary">
                <Play size={24} className="text-primary-foreground ml-0.5" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={s.handleStop} className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 border border-destructive/30">
                <Square size={24} className="text-destructive" />
              </motion.button>
            </>
          )}
        </div>

        {/* Idle sections */}
        {s.runState === 'idle' && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 glass-card p-4">
              <p className="text-xs text-muted-foreground mb-2">🎯 자동 배율 시스템</p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center justify-between"><span>👟 1km</span><span className="font-bold text-foreground">×1.1</span></div>
                <div className="flex items-center justify-between"><span>⚡ 3km</span><span className="font-bold text-foreground">×1.3</span></div>
                <div className="flex items-center justify-between"><span>🔥 5km</span><span className="font-bold text-foreground">×1.5</span></div>
                <div className="flex items-center justify-between"><span>🏆 10km</span><span className="font-bold text-foreground">×2.0</span></div>
                {s.streak.currentStreak >= 3 && (
                  <div className="flex items-center justify-between border-t border-border/30 pt-1 mt-1">
                    <span>🔥 {s.streak.currentStreak}일 연속 보너스</span>
                    <span className="font-bold text-primary">+{s.streak.currentStreak >= 7 ? '0.3' : '0.15'}</span>
                  </div>
                )}
              </div>
            </motion.div>
            <LegendaryPreview />
          </>
        )}

        <div className="mx-auto max-w-md px-0 mt-6">
          <DebugPanel />
        </div>
      </div>
      <BottomNav />
      <SpecialEncounterOverlay
        show={s.specialOverlay.show}
        speciesId={s.specialOverlay.speciesId}
        type={s.specialOverlay.type}
        onClose={() => s.setSpecialOverlay({ show: false, speciesId: null, type: 'catch' })}
      />
    </div>
  );
}
