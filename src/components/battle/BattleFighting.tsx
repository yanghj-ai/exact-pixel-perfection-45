import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type BattleMove } from '@/lib/battle-moves';
import { type BattlePokemon, type BattleTurnLog, type TurnBasedBattleState, getEffectiveness } from '@/lib/battle';
import { getMovesForLevel } from '@/lib/battle-moves';
import { type NpcTrainer } from '@/lib/npc-trainers';

interface BattleFightingProps {
  battleState: TurnBasedBattleState;
  selectedNpc: NpcTrainer;
  isAnimating: boolean;
  currentTurnLogs: BattleTurnLog[];
  allTurnLogs: BattleTurnLog[];
  animatingTurnIdx: number;
  animSubPhase: 'attack' | 'result';
  onMoveSelect: (move: BattleMove) => void;
  onSwitch: (idx: number) => void;
}

const TYPE_COLORS: Record<string, string> = {
  fire: 'bg-orange-500/20 border-orange-500/40',
  water: 'bg-blue-500/20 border-blue-500/40',
  grass: 'bg-green-500/20 border-green-500/40',
  electric: 'bg-yellow-500/20 border-yellow-500/40',
  ice: 'bg-cyan-500/20 border-cyan-500/40',
  fighting: 'bg-red-700/20 border-red-700/40',
  poison: 'bg-purple-500/20 border-purple-500/40',
  ground: 'bg-amber-700/20 border-amber-700/40',
  flying: 'bg-indigo-300/20 border-indigo-300/40',
  psychic: 'bg-pink-500/20 border-pink-500/40',
  bug: 'bg-lime-600/20 border-lime-600/40',
  rock: 'bg-amber-800/20 border-amber-800/40',
  ghost: 'bg-purple-800/20 border-purple-800/40',
  dragon: 'bg-violet-700/20 border-violet-700/40',
  fairy: 'bg-pink-300/20 border-pink-300/40',
  normal: 'bg-gray-400/20 border-gray-400/40',
};

export default function BattleFighting({
  battleState, selectedNpc, isAnimating, currentTurnLogs, allTurnLogs,
  animatingTurnIdx, animSubPhase, onMoveSelect, onSwitch,
}: BattleFightingProps) {
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);

  const player = battleState.playerTeam[battleState.playerIdx];
  const opponent = battleState.opponentTeam[battleState.opponentIdx];

  const currentLog = isAnimating && animatingTurnIdx < currentTurnLogs.length ? currentTurnLogs[animatingTurnIdx] :
                     isAnimating && animatingTurnIdx > 0 ? currentTurnLogs[animatingTurnIdx - 1] : null;
  const isPlayerAttacking = currentLog ? !currentLog.attackerUid.startsWith('npc_') : false;

  const playerMoves = player
    ? (player.moves.length > 0 ? player.moves : getMovesForLevel(player.types, player.level))
    : [];

  const getEffLabel = (move: BattleMove) => {
    if (!opponent) return null;
    const eff = getEffectiveness(move.type, opponent.types);
    if (eff > 1) return { label: '효과적!', color: 'text-heal' };
    if (eff < 1) return { label: '비효과', color: 'text-muted-foreground' };
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="mx-auto max-w-md w-full px-5 pt-6 flex-1 flex flex-col">
        {/* Opponent info */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-foreground">{opponent?.nickname || opponent?.name || '???'}</p>
              <p className="text-[10px] text-muted-foreground">Lv.{opponent?.level || 0}</p>
              {opponent?.types.map(t => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{t}</span>
              ))}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
              <motion.div
                className="h-full rounded-full"
                style={{ background: ((opponent?.currentHp || 0) / (opponent?.maxHp || 1)) > 0.5 ? 'hsl(var(--heal-green))' : ((opponent?.currentHp || 0) / (opponent?.maxHp || 1)) > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))' }}
                initial={false}
                animate={{ width: `${Math.max(0, ((opponent?.currentHp || 0) / (opponent?.maxHp || 1)) * 100)}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-muted-foreground">{Math.max(0, opponent?.currentHp || 0)}/{opponent?.maxHp || 0}</p>
              <div className="flex gap-1">
                {battleState.opponentTeam.map((p, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${p.currentHp > 0 ? 'bg-destructive' : 'bg-muted'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Battle field */}
        <div className="relative flex-1 min-h-[180px] flex items-center justify-between px-4">
          <div />
          {opponent && (
            <motion.div
              key={`opp-${opponent.uid}`}
              animate={
                currentLog && animSubPhase === 'attack' && currentLog.attackerUid === opponent.uid
                  ? { x: [0, -15, 0], transition: { duration: 0.3 } }
                  : currentLog && animSubPhase === 'result' && currentLog.defenderUid === opponent.uid && !currentLog.missed
                  ? { x: [0, 6, -6, 3, 0], opacity: [1, 0.4, 1, 0.6, 1] }
                  : currentLog && currentLog.defenderFainted && currentLog.defenderUid === opponent.uid && animSubPhase === 'result'
                  ? { y: 40, opacity: 0, transition: { duration: 0.6 } }
                  : {}
              }
              transition={{ duration: 0.35 }}
            >
              <img src={opponent.spriteUrl} alt={opponent.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} />
            </motion.div>
          )}
          {player && (
            <motion.div
              key={`plr-${player.uid}`}
              className="absolute bottom-4 left-4"
              animate={
                currentLog && animSubPhase === 'attack' && currentLog.attackerUid === player.uid
                  ? { x: [0, 15, 0], transition: { duration: 0.3 } }
                  : currentLog && animSubPhase === 'result' && currentLog.defenderUid === player.uid && !currentLog.missed
                  ? { x: [0, -6, 6, -3, 0], opacity: [1, 0.4, 1, 0.6, 1] }
                  : currentLog && currentLog.defenderFainted && currentLog.defenderUid === player.uid && animSubPhase === 'result'
                  ? { y: 40, opacity: 0, transition: { duration: 0.6 } }
                  : {}
              }
              transition={{ duration: 0.35 }}
            >
              <img src={player.spriteUrl} alt={player.name} className="w-20 h-20 object-contain" style={{ imageRendering: 'pixelated' }} />
            </motion.div>
          )}

          {/* Move effect emoji */}
          <AnimatePresence>
            {currentLog && animSubPhase === 'attack' && !currentLog.missed && currentLog.damage > 0 && (
              <motion.div
                key={`eff-${allTurnLogs.length}-${animatingTurnIdx}`}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1.3 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', damping: 10, delay: 0.4 }}
                className={`absolute ${currentLog.defenderUid.startsWith('npc_') ? 'top-1/3 right-1/4' : 'bottom-1/3 left-1/4'}`}
              >
                <span className="text-3xl drop-shadow-lg">{currentLog.move.emoji}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Damage number popup */}
          <AnimatePresence>
            {currentLog && animSubPhase === 'result' && !currentLog.missed && currentLog.damage > 0 && (
              <motion.div
                key={`dmg-${allTurnLogs.length}-${animatingTurnIdx}`}
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, y: -25, scale: 1 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.5 }}
                className={`absolute ${currentLog.defenderUid.startsWith('npc_') ? 'top-1/4 right-1/4' : 'bottom-1/4 left-1/4'}`}
              >
                <span className={`text-lg font-black ${currentLog.critical ? 'text-primary text-xl' : 'text-destructive'}`}>
                  {currentLog.critical && '💥 '}-{currentLog.damage}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player HP */}
        <div className="flex items-center gap-3 mt-2 mb-2">
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <p className="text-[10px] text-muted-foreground">Lv.{player?.level || 0}</p>
              <p className="text-xs font-bold text-foreground">{player?.nickname || player?.name || '???'}</p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
              <motion.div
                className="h-full rounded-full"
                style={{ background: ((player?.currentHp || 0) / (player?.maxHp || 1)) > 0.5 ? 'hsl(var(--heal-green))' : ((player?.currentHp || 0) / (player?.maxHp || 1)) > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))' }}
                initial={false}
                animate={{ width: `${Math.max(0, ((player?.currentHp || 0) / (player?.maxHp || 1)) * 100)}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <div className="flex gap-1">
                {battleState.playerTeam.map((p, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${p.currentHp > 0 ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground">{Math.max(0, player?.currentHp || 0)}/{player?.maxHp || 0}</p>
            </div>
          </div>
        </div>

        {/* Turn log message */}
        <div className="glass-card p-3 min-h-[60px] flex items-center mb-3">
          <AnimatePresence mode="wait">
            {currentLog && isAnimating ? (
              <motion.div key={`log-${allTurnLogs.length}-${animatingTurnIdx}-${animSubPhase}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="w-full">
                {animSubPhase === 'attack' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${isPlayerAttacking ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                      {isPlayerAttacking ? '아군' : '상대'}
                    </span>
                    <span className="text-xs text-foreground">
                      <span className="font-bold">
                        {currentLog.attackerUid.startsWith('npc_')
                          ? (battleState.opponentTeam.find(p => p.uid === currentLog.attackerUid)?.nickname || battleState.opponentTeam.find(p => p.uid === currentLog.attackerUid)?.name)
                          : (player?.nickname || player?.name)
                        }
                      </span>의 {currentLog.move.emoji} <span className="font-semibold">{currentLog.move.name}</span>!
                    </span>
                  </div>
                )}
                {animSubPhase === 'result' && (
                  <div className="space-y-0.5">
                    {currentLog.missed ? (
                      <p className="text-xs text-muted-foreground">하지만 빗나갔다!</p>
                    ) : (
                      <>
                        {currentLog.effectiveness > 1 && <p className="text-[10px] text-heal font-semibold">효과는 굉장했다!</p>}
                        {currentLog.effectiveness < 1 && <p className="text-[10px] text-muted-foreground">효과가 별로인 듯하다...</p>}
                        {currentLog.critical && <p className="text-[10px] text-primary font-bold">급소에 맞았다!</p>}
                        {currentLog.statusApplied === 'burn' && <p className="text-[10px] text-accent">🔥 화상을 입었다!</p>}
                        {currentLog.statusApplied === 'freeze' && <p className="text-[10px] text-accent">❄️ 얼어붙었다!</p>}
                        {currentLog.statusApplied === 'paralyze' && <p className="text-[10px] text-accent">⚡ 마비되었다!</p>}
                        {currentLog.statusApplied === 'lower_def' && <p className="text-[10px] text-accent">⬇️ 방어가 떨어졌다!</p>}
                        {currentLog.healAmount > 0 && <p className="text-[10px] text-heal">💚 {currentLog.healAmount} HP 회복!</p>}
                        {currentLog.defenderFainted && (
                          <p className="text-xs text-destructive font-bold">
                            {currentLog.defenderUid.startsWith('npc_') ? '상대' : '아군'} 포켓몬이 쓰러졌다!
                          </p>
                        )}
                        {!currentLog.effectiveness || (currentLog.effectiveness === 1 && !currentLog.critical && !currentLog.statusApplied && !currentLog.healAmount && !currentLog.defenderFainted) ? (
                          <p className="text-[10px] text-muted-foreground">{currentLog.damage} 데미지</p>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground w-full text-center">
                ⚔️ 기술을 선택하세요!
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Action Selection UI */}
        {!isAnimating && battleState.phase !== 'finished' && player && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {battleState.playerTeam.filter(p => p.currentHp > 0).length > 1 && (
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setShowSwitchPanel(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${!showSwitchPanel ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted/50 text-muted-foreground'}`}
                >
                  ⚔️ 기술
                </button>
                <button
                  onClick={() => setShowSwitchPanel(true)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${showSwitchPanel ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-muted/50 text-muted-foreground'}`}
                >
                  🔄 교체
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {!showSwitchPanel ? (
                <motion.div key="moves" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-2 mb-4">
                  {playerMoves.map((move, i) => {
                    const effInfo = getEffLabel(move);
                    const typeColor = TYPE_COLORS[move.type] || TYPE_COLORS.normal;
                    return (
                      <motion.button
                        key={move.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { onMoveSelect(move); setShowSwitchPanel(false); }}
                        className={`p-3 rounded-xl border text-left transition-all active:scale-95 ${typeColor}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{move.emoji}</span>
                          <span className="text-xs font-bold text-foreground">{move.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px]">
                          <span className="text-muted-foreground">위력 {move.power}</span>
                          <span className="text-muted-foreground">명중 {move.accuracy}</span>
                        </div>
                        {effInfo && (
                          <p className={`text-[9px] font-bold mt-1 ${effInfo.color}`}>{effInfo.label}</p>
                        )}
                        {move.effect && (
                          <p className="text-[8px] text-accent mt-0.5">
                            {move.effect === 'burn' && '🔥 화상'}
                            {move.effect === 'freeze' && '❄️ 빙결'}
                            {move.effect === 'paralyze' && '⚡ 마비'}
                            {move.effect === 'heal' && '💚 흡수'}
                            {move.effect === 'boost_atk' && '⬆️ 공격↑'}
                            {move.effect === 'lower_def' && '⬇️ 방어↓'}
                            {' '}{move.effectChance}%
                          </p>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="switch" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-2 mb-4">
                  <p className="text-[10px] text-muted-foreground">⚠️ 교체 시 상대가 먼저 공격합니다</p>
                  {battleState.playerTeam.map((p, idx) => {
                    const isActive = idx === battleState.playerIdx;
                    const isFainted = p.currentHp <= 0;
                    const hpRatio = p.currentHp / p.maxHp;
                    return (
                      <motion.button
                        key={p.uid}
                        whileTap={!isActive && !isFainted ? { scale: 0.97 } : {}}
                        onClick={() => { if (!isActive && !isFainted) { onSwitch(idx); setShowSwitchPanel(false); } }}
                        disabled={isActive || isFainted}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                          isActive ? 'border-primary/40 bg-primary/10 opacity-60' :
                          isFainted ? 'opacity-30 border-muted' :
                          'border-border/50 bg-card/80 hover:border-secondary/40'
                        }`}
                      >
                        <img src={p.spriteUrl} alt={p.name} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{p.nickname || p.name}</span>
                            <span className="text-[10px] text-muted-foreground">Lv.{p.level}</span>
                            {isActive && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">배틀 중</span>}
                            {isFainted && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-semibold">기절</span>}
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.max(0, hpRatio * 100)}%`,
                                background: hpRatio > 0.5 ? 'hsl(var(--heal-green))' : hpRatio > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))',
                              }}
                            />
                          </div>
                          <div className="flex gap-1 mt-1">
                            {p.types.map(t => (
                              <span key={t} className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground capitalize">{t}</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground whitespace-nowrap">{p.currentHp}/{p.maxHp}</p>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Animating indicator */}
        {isAnimating && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-muted-foreground">배틀 진행 중...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
