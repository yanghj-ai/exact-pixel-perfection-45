import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Zap, Shield, Heart, Trophy, Coins, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getParty, markAsSeen, addCoins } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import {
  buildBattleTeam, buildNpcBattleTeam, simulateBattle,
  saveBattleRecord, type BattleResult, type BattleTurnLog, type BattlePokemon, type BattleMove,
  initTurnBattle, executeTurn, calculateBattleRewards, type TurnBasedBattleState,
} from '@/lib/battle';
import { getEffectiveness } from '@/lib/battle';
import { NPC_TRAINERS, getNpcById, type NpcTrainer } from '@/lib/npc-trainers';
import { grantRewards } from '@/lib/pet';
import { applyBattleDamage, getEffectiveHpRatio, canBattle, getInjuredCount } from '@/lib/pokemon-health';
import { getMovesForLevel } from '@/lib/battle-moves';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { clearPendingEncounter } from '@/lib/npc-encounter';

type BattlePhase = 'select' | 'intro' | 'fighting' | 'result';

export default function BattlePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedNpc = searchParams.get('npc');
  const isAiNpc = searchParams.get('aiNpc') === 'true';

  const getInitialNpc = (): NpcTrainer | null => {
    if (isAiNpc) {
      const stored = sessionStorage.getItem('routinmon-ai-npc');
      if (stored) {
        sessionStorage.removeItem('routinmon-ai-npc');
        return JSON.parse(stored);
      }
    }
    if (preselectedNpc) return getNpcById(preselectedNpc) || null;
    return null;
  };

  const [phase, setPhase] = useState<BattlePhase>(() => (isAiNpc || preselectedNpc) ? 'intro' : 'select');
  const [selectedNpc, setSelectedNpc] = useState<NpcTrainer | null>(getInitialNpc);

  // Turn-based state
  const [battleState, setBattleState] = useState<TurnBasedBattleState | null>(null);
  const [currentTurnLogs, setCurrentTurnLogs] = useState<BattleTurnLog[]>([]);
  const [animatingTurnIdx, setAnimatingTurnIdx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [allTurnLogs, setAllTurnLogs] = useState<BattleTurnLog[]>([]);

  // For rewards
  const [originalPlayerTeam, setOriginalPlayerTeam] = useState<BattlePokemon[]>([]);
  const [originalOpponentTeam, setOriginalOpponentTeam] = useState<BattlePokemon[]>([]);
  const [rewards, setRewards] = useState<{ coins: number; exp: number; bonusItems: { name: string; emoji: string; count: number }[]; coinsLost: number } | null>(null);

  const party = getParty();
  const injuredCount = getInjuredCount();

  useEffect(() => {
    if ((preselectedNpc || isAiNpc) && selectedNpc) {
      startBattle(selectedNpc);
    }
  }, []);

  const startBattle = useCallback((npc: NpcTrainer) => {
    if (party.length === 0) {
      toast('파티에 포켓몬이 없습니다!');
      return;
    }

    const battleableParty = party.filter(p => canBattle(p.uid));
    if (battleableParty.length === 0) {
      toast.error('모든 포켓몬이 부상 상태입니다!', { description: '포켓몬 센터에서 회복하세요.' });
      return;
    }

    setSelectedNpc(npc);
    setPhase('intro');

    const pTeam = buildBattleTeam(battleableParty);
    const oTeam = buildNpcBattleTeam(npc.teamSpeciesIds, npc.level, npc.friendship);
    setOriginalPlayerTeam(pTeam);
    setOriginalOpponentTeam(oTeam);

    markAsSeen(npc.teamSpeciesIds);

    setTimeout(() => {
      const state = initTurnBattle(pTeam, oTeam);
      setBattleState(state);
      setCurrentTurnLogs([]);
      setAllTurnLogs([]);
      setAnimatingTurnIdx(0);
      setIsAnimating(false);
      setPhase('fighting');
    }, 2500);
  }, [party]);

  // Animate turn logs one by one
  useEffect(() => {
    if (!isAnimating || currentTurnLogs.length === 0) return;
    if (animatingTurnIdx >= currentTurnLogs.length) {
      // Done animating this turn's logs
      setTimeout(() => {
        setIsAnimating(false);
        // Check if battle ended
        if (battleState?.phase === 'finished') {
          finishBattle();
        }
      }, 1200);
      return;
    }

    const timer = setTimeout(() => {
      setAnimatingTurnIdx(i => i + 1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAnimating, animatingTurnIdx, currentTurnLogs]);

  const handleMoveSelect = (move: BattleMove) => {
    if (!battleState || isAnimating || battleState.phase === 'finished') return;

    const turnLogs = executeTurn(battleState, move);
    setBattleState({ ...battleState });
    setCurrentTurnLogs(turnLogs);
    setAllTurnLogs(prev => [...prev, ...turnLogs]);
    setAnimatingTurnIdx(0);
    setIsAnimating(true);
  };

  const finishBattle = () => {
    if (!battleState || !selectedNpc) return;

    const battleRewards = calculateBattleRewards(battleState, originalPlayerTeam, originalOpponentTeam);
    setRewards(battleRewards);

    const won = battleState.winner === 'player';

    if (won) {
      addCoins(battleRewards.coins);
      grantRewards(
        battleRewards.bonusItems.filter(i => i.name === '먹이').reduce((s, i) => s + i.count, 0),
        battleRewards.exp
      );
    } else {
      if (battleRewards.coinsLost > 0) {
        addCoins(-battleRewards.coinsLost);
      }
    }

    const playerHpRatios = battleState.playerTeam.map(p => ({ uid: p.uid, hpRatio: p.currentHp / p.maxHp }));
    applyBattleDamage(playerHpRatios);
    saveBattleRecord({
      id: `battle_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      opponentName: selectedNpc.name,
      result: won ? 'win' : 'lose',
      coinsEarned: won ? battleRewards.coins : -battleRewards.coinsLost,
      expEarned: battleRewards.exp,
    });

    setPhase('result');
  };

  // ─── Select Phase ───────────────────────────
  if (phase === 'select') {
    const difficultyColors: Record<string, string> = {
      easy: 'text-heal', medium: 'text-secondary', hard: 'text-primary', elite: 'text-accent',
    };
    const difficultyLabels: Record<string, string> = {
      easy: '쉬움', medium: '보통', hard: '어려움', elite: '엘리트',
    };

    return (
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-5 pt-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card/80 border border-border/50">
              <ArrowLeft size={18} className="text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">포켓몬 배틀</h1>
              <p className="text-xs text-muted-foreground">상대 트레이너를 선택하세요</p>
            </div>
          </div>

          {injuredCount > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 mb-4 border-amber/30 bg-amber/5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber" />
                <span className="text-xs text-foreground font-medium">
                  부상 포켓몬 {injuredCount}마리 — 포켓몬 센터에서 회복하세요
                </span>
              </div>
              <Button size="sm" variant="outline" className="mt-2 w-full text-xs" onClick={() => navigate('/home')}>
                🏥 포켓몬 센터로 이동
              </Button>
            </motion.div>
          )}

          {party.length === 0 && (
            <div className="glass-card p-6 text-center mb-4">
              <p className="text-foreground font-semibold">파티에 포켓몬이 없습니다!</p>
              <p className="text-muted-foreground text-sm mt-1">파티 관리에서 포켓몬을 추가하세요</p>
              <Button onClick={() => navigate('/party')} className="mt-3" size="sm">파티 관리</Button>
            </div>
          )}

          {party.length > 0 && (
            <div className="glass-card p-3 mb-4">
              <p className="text-[10px] text-muted-foreground mb-2 font-medium">내 파티 상태</p>
              <div className="flex gap-2">
                {party.map(p => {
                  const species = getPokemonById(p.speciesId);
                  const hpRatio = getEffectiveHpRatio(p.uid);
                  const able = hpRatio > 0;
                  return (
                    <div key={p.uid} className={`flex-1 text-center ${!able ? 'opacity-40' : ''}`}>
                      {species && <img src={species.spriteUrl} alt={species.name} className="w-8 h-8 mx-auto object-contain" style={{ imageRendering: 'pixelated' }} />}
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${hpRatio * 100}%`,
                            background: hpRatio > 0.5 ? 'hsl(var(--heal-green))' : hpRatio > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))',
                          }}
                        />
                      </div>
                      {!able && <p className="text-[8px] text-destructive mt-0.5">기절</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {NPC_TRAINERS.map(npc => (
              <motion.button
                key={npc.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => startBattle(npc)}
                disabled={party.length === 0 || party.filter(p => canBattle(p.uid)).length === 0}
                className="w-full glass-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors disabled:opacity-40 text-left"
              >
                <span className="text-3xl">{npc.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{npc.name}</span>
                    <span className={`text-[10px] font-semibold ${difficultyColors[npc.difficulty]}`}>
                      {difficultyLabels[npc.difficulty]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{npc.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {npc.teamSpeciesIds.slice(0, 4).map(id => {
                      const sp = getPokemonById(id);
                      return sp ? (
                        <img key={id} src={sp.spriteUrl} alt={sp.name} className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
                      ) : null;
                    })}
                    {npc.teamSpeciesIds.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{npc.teamSpeciesIds.length - 4}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Lv.{npc.level}</p>
                  <Swords size={16} className="text-primary mx-auto mt-1" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── Intro Phase ────────────────────────────
  if (phase === 'intro' && selectedNpc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-8">
          <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-sm text-muted-foreground mb-4">
            {selectedNpc.title}
          </motion.p>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="text-5xl mb-3">
            {selectedNpc.emoji}
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xl font-bold text-foreground mb-3">
            {selectedNpc.name}이(가) 승부를 걸어왔다!
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="glass-card px-4 py-2 inline-block">
            <p className="text-sm text-foreground">"{selectedNpc.dialogue.before}"</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-6">
            <Swords size={24} className="text-primary mx-auto animate-pulse" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Fighting Phase ─────────────────────────
  if (phase === 'fighting' && battleState && selectedNpc) {
    const player = battleState.playerTeam[battleState.playerIdx];
    const opponent = battleState.opponentTeam[battleState.opponentIdx];

    const currentLog = isAnimating && animatingTurnIdx > 0 ? currentTurnLogs[animatingTurnIdx - 1] : null;

    // Get available moves for current player pokemon
    const playerMoves = player
      ? (player.moves.length > 0 ? player.moves : getMovesForLevel(player.types, player.level))
      : [];

    // Type effectiveness color helper
    const getEffLabel = (move: BattleMove) => {
      if (!opponent) return null;
      const eff = getEffectiveness(move.type, opponent.types);
      if (eff > 1) return { label: '효과적!', color: 'text-heal' };
      if (eff < 1) return { label: '비효과', color: 'text-muted-foreground' };
      return null;
    };

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
              <p className="text-[9px] text-muted-foreground mt-0.5">{Math.max(0, opponent?.currentHp || 0)}/{opponent?.maxHp || 0}</p>
            </div>
          </div>

          {/* Battle field */}
          <div className="relative flex-1 min-h-[180px] flex items-center justify-between px-4">
            <div />
            {opponent && (
              <motion.div
                animate={currentLog?.defenderUid === opponent.uid && !currentLog.missed ? { x: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                <img src={opponent.spriteUrl} alt={opponent.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} />
              </motion.div>
            )}
            {player && (
              <motion.div
                className="absolute bottom-4 left-4"
                animate={currentLog?.attackerUid === player.uid ? { x: [0, 10, 0] } : currentLog?.defenderUid === player.uid && !currentLog?.missed ? { x: [0, -5, 5, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                <img src={player.spriteUrl} alt={player.name} className="w-20 h-20 object-contain" style={{ imageRendering: 'pixelated' }} />
              </motion.div>
            )}

            {/* Move effect emoji */}
            <AnimatePresence>
              {currentLog && !currentLog.missed && (
                <motion.div
                  key={`eff-${allTurnLogs.length}-${animatingTurnIdx}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="text-3xl">{currentLog.move.emoji}</span>
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
              <p className="text-[9px] text-muted-foreground mt-0.5">{Math.max(0, player?.currentHp || 0)}/{player?.maxHp || 0}</p>
            </div>
          </div>

          {/* Turn log message */}
          <div className="glass-card p-3 min-h-[60px] flex items-center mb-3">
            <AnimatePresence mode="wait">
              {currentLog ? (
                <motion.div key={`log-${allTurnLogs.length}-${animatingTurnIdx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
                  <p className="text-xs text-foreground">{currentLog.message}</p>
                  {currentLog.effectiveness > 1 && <p className="text-[10px] text-heal mt-0.5 font-semibold">효과는 굉장했다! (x{currentLog.effectiveness})</p>}
                  {currentLog.effectiveness < 1 && <p className="text-[10px] text-muted-foreground mt-0.5">효과가 별로인 듯하다... (x{currentLog.effectiveness})</p>}
                  {currentLog.critical && <p className="text-[10px] text-primary mt-0.5">급소에 맞았다!</p>}
                </motion.div>
              ) : (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground w-full text-center">
                  기술을 선택하세요!
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Move Selection UI */}
          {!isAnimating && battleState.phase !== 'finished' && player && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-2 mb-4"
            >
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
                    onClick={() => handleMoveSelect(move)}
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

  // ─── Result Phase ───────────────────────────
  if (phase === 'result' && battleState && selectedNpc && rewards) {
    const won = battleState.winner === 'player';
    const playerHpRatios = battleState.playerTeam.map(p => ({ uid: p.uid, hpRatio: p.currentHp / p.maxHp }));

    return (
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-5 pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-5xl block mb-3">
              {won ? '🏆' : '😢'}
            </motion.span>
            <h1 className="text-2xl font-bold text-foreground">{won ? '승리!' : '패배...'}</h1>
            <p className="text-sm text-muted-foreground mt-1">vs {selectedNpc.name} ({selectedNpc.title})</p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-4 mb-4 text-center">
            <span className="text-2xl">{selectedNpc.emoji}</span>
            <p className="text-sm text-foreground mt-2">
              "{won ? selectedNpc.dialogue.win : selectedNpc.dialogue.lose}"
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3">배틀 요약</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{battleState.turnCount}</p>
                <p className="text-[10px] text-muted-foreground">총 턴 수</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {allTurnLogs.filter(t => t.critical).length}
                </p>
                <p className="text-[10px] text-muted-foreground">크리티컬</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {allTurnLogs.filter(t => t.missed).length}
                </p>
                <p className="text-[10px] text-muted-foreground">빗나감</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3">{won ? '🎁 보상' : '💸 패널티'}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {won ? (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2">
                    <Coins size={16} className="text-secondary" />
                    <span className="font-bold text-secondary">+{rewards.coins}</span>
                  </motion.div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2">
                    <Zap size={16} className="text-accent" />
                    <span className="font-bold text-accent">+{rewards.exp} EXP</span>
                  </motion.div>
                  {rewards.bonusItems.map((item, i) => (
                    <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4 + i * 0.2, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
                      <Sparkles size={14} className="text-primary" />
                      <span className="font-bold text-primary">{item.emoji} {item.name} x{item.count}</span>
                    </motion.div>
                  ))}
                </>
              ) : (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: 'spring' }} className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2">
                  <Coins size={16} className="text-destructive" />
                  <span className="font-bold text-destructive">-{rewards.coinsLost} 코인</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {playerHpRatios.some(p => p.hpRatio < 1) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="glass-card p-3 mb-4 border-amber/30 bg-amber/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-amber" />
                <span className="text-xs font-medium text-foreground">부상 포켓몬</span>
              </div>
              <div className="flex gap-2">
                {playerHpRatios.filter(p => p.hpRatio < 1).map(p => {
                  const member = party.find(m => m.uid === p.uid);
                  const species = member ? getPokemonById(member.speciesId) : null;
                  return species ? (
                    <div key={p.uid} className="flex items-center gap-1 text-[10px]">
                      <img src={species.spriteUrl} alt={species.name} className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                      <span className={p.hpRatio <= 0 ? 'text-destructive' : 'text-amber'}>
                        {p.hpRatio <= 0 ? '기절' : `${Math.round(p.hpRatio * 100)}%`}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">시간이 지나면 자연 회복되거나, 포켓몬 센터에서 즉시 회복하세요</p>
            </motion.div>
          )}

          <div className="flex gap-3">
            {isAiNpc ? (
              <Button onClick={() => { clearPendingEncounter(); navigate('/run'); }} className="flex-1 gradient-primary text-primary-foreground border-0">
                🏃 런닝 계속하기
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate('/home')} className="flex-1">
                  🏥 포켓몬 센터
                </Button>
                <Button onClick={() => { setPhase('select'); setBattleState(null); setRewards(null); setAllTurnLogs([]); }} className="flex-1 gradient-primary text-primary-foreground border-0">
                  다시 배틀
                </Button>
              </>
            )}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return null;
}
