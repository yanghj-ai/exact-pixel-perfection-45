import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Zap, Shield, Heart, Trophy, Coins, Sparkles, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { getParty, markAsSeen, addCoins, grantExpToParty, getFriendshipLevel, type OwnedPokemon } from '@/lib/collection';
import { getPokemonById, RARITY_CONFIG, TYPE_CONFIG } from '@/lib/pokemon-registry';
import { getPokemonHabitats } from '@/lib/pokemon-habitat';
import {
  buildBattleTeam, buildNpcBattleTeam, simulateBattle,
  saveBattleRecord, type BattleResult, type BattleTurnLog, type BattlePokemon, type BattleMove,
  initTurnBattle, executeTurn, executeSwitchTurn, calculateBattleRewards, type TurnBasedBattleState,
} from '@/lib/battle';
import { getEffectiveness } from '@/lib/battle';
import { NPC_TRAINERS, getNpcById, type NpcTrainer } from '@/lib/npc-trainers';
import { grantRewards } from '@/lib/pet';
import { applyBattleDamage, getEffectiveHpRatio, canBattle, getInjuredCount } from '@/lib/pokemon-health';
import { getMovesForLevel } from '@/lib/battle-moves';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { clearPendingEncounter } from '@/lib/npc-encounter';

type BattlePhase = 'select' | 'intro' | 'fighting' | 'switching' | 'result';

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
  const [switchMessage, setSwitchMessage] = useState<string>('');
  // For rewards
  const [originalPlayerTeam, setOriginalPlayerTeam] = useState<BattlePokemon[]>([]);
  const [originalOpponentTeam, setOriginalOpponentTeam] = useState<BattlePokemon[]>([]);
  const [rewards, setRewards] = useState<{ coins: number; exp: number; bonusItems: { name: string; emoji: string; count: number }[]; coinsLost: number } | null>(null);

  const party = getParty();
  const injuredCount = getInjuredCount();
  // Party detail popup in select phase
  const [partyDetailPokemon, setPartyDetailPokemon] = useState<OwnedPokemon | null>(null);

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

  // Animation sub-phase: 'move_announce' → 'hit_effect' → 'result_msg' per log
  const [animSubPhase, setAnimSubPhase] = useState<'move_announce' | 'hit_effect' | 'result_msg'>('move_announce');

  // Animate turn logs sequentially with sub-phases for clarity
  useEffect(() => {
    if (!isAnimating || currentTurnLogs.length === 0) return;
    
    if (animatingTurnIdx >= currentTurnLogs.length) {
      // All logs for this turn animated — check for faint/finish
      const lastLog = currentTurnLogs[currentTurnLogs.length - 1];
      const hasFaint = currentTurnLogs.some(l => l.defenderFainted);
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        
        if (battleState?.phase === 'finished') {
          // Show faint message briefly before result
          if (hasFaint) {
            const faintLog = currentTurnLogs.find(l => l.defenderFainted)!;
            const faintedIsPlayer = !faintLog.defenderUid.startsWith('npc_');
            const faintedPokemon = faintedIsPlayer
              ? battleState.playerTeam.find(p => p.uid === faintLog.defenderUid)
              : battleState.opponentTeam.find(p => p.uid === faintLog.defenderUid);
            const faintedName = faintedPokemon?.nickname || faintedPokemon?.name || '???';
            setSwitchMessage(`${faintedIsPlayer ? '' : '상대의 '}${faintedName}이(가) 쓰러졌다!`);
            setPhase('switching');
            setTimeout(() => {
              setSwitchMessage('');
              finishBattle();
              setPhase('result');
            }, 2000);
          } else {
            finishBattle();
          }
        } else if (hasFaint && battleState) {
          const faintLog = currentTurnLogs.find(l => l.defenderFainted)!;
          const isPlayerFainted = !faintLog.defenderUid.startsWith('npc_');
          const nextPokemon = isPlayerFainted 
            ? battleState.playerTeam[battleState.playerIdx] 
            : battleState.opponentTeam[battleState.opponentIdx];
          
          if (nextPokemon) {
            const faintedPokemon = isPlayerFainted
              ? battleState.playerTeam[battleState.playerIdx - 1]
              : battleState.opponentTeam[battleState.opponentIdx - 1];
            const faintedName = faintedPokemon?.nickname || faintedPokemon?.name || '???';
            const nextName = nextPokemon.nickname || nextPokemon.name;
            
            // Phase 1: Show faint message
            setSwitchMessage(
              isPlayerFainted 
                ? `${faintedName}이(가) 쓰러졌다!`
                : `상대의 ${faintedName}이(가) 쓰러졌다!`
            );
            setPhase('switching');
            setTimeout(() => {
              // Phase 2: Show next pokemon announcement
              setSwitchMessage(
                isPlayerFainted 
                  ? `가라, ${nextName}!`
                  : `상대는 ${nextName}을(를) 내보냈다!`
              );
              setTimeout(() => {
                setPhase('fighting');
                setSwitchMessage('');
              }, 2000);
            }, 2000);
          }
        }
      }, 1200);
      return () => clearTimeout(timer);
    }

    // Sub-phase progression for each log entry
    const log = currentTurnLogs[animatingTurnIdx];
    if (!log) return;

    if (animSubPhase === 'move_announce') {
      // Show "X used Y!" for 1.2s, then show hit
      const timer = setTimeout(() => setAnimSubPhase('hit_effect'), 1200);
      return () => clearTimeout(timer);
    }
    if (animSubPhase === 'hit_effect') {
      // Show damage/effect for 1.2s, then show result
      const timer = setTimeout(() => setAnimSubPhase('result_msg'), 1200);
      return () => clearTimeout(timer);
    }
    if (animSubPhase === 'result_msg') {
      // Show result for 1.5s (longer if faint), then move to next log
      const delay = log.defenderFainted ? 2000 : 1500;
      const timer = setTimeout(() => {
        setAnimatingTurnIdx(i => i + 1);
        setAnimSubPhase('move_announce');
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, animatingTurnIdx, currentTurnLogs, animSubPhase]);

  // Switch panel toggle
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);

  const handleMoveSelect = (move: BattleMove) => {
    if (!battleState || isAnimating || battleState.phase === 'finished') return;

    const turnLogs = executeTurn(battleState, move);
    setBattleState({ ...battleState });
    setCurrentTurnLogs(turnLogs);
    setAllTurnLogs(prev => [...prev, ...turnLogs]);
    setAnimatingTurnIdx(0);
    setAnimSubPhase('move_announce');
    setIsAnimating(true);
    setShowSwitchPanel(false);
  };

  const handleSwitch = (teamIdx: number) => {
    if (!battleState || isAnimating || battleState.phase === 'finished') return;
    if (teamIdx === battleState.playerIdx) return;

    const turnLogs = executeSwitchTurn(battleState, teamIdx);
    setBattleState({ ...battleState });
    setCurrentTurnLogs(turnLogs);
    setAllTurnLogs(prev => [...prev, ...turnLogs]);
    setAnimatingTurnIdx(0);
    setAnimSubPhase('move_announce');
    setIsAnimating(true);
    setShowSwitchPanel(false);
  };

  const finishBattle = () => {
    if (!battleState || !selectedNpc) return;

    const battleRewards = calculateBattleRewards(battleState, originalPlayerTeam, originalOpponentTeam);
    setRewards(battleRewards);

    const won = battleState.winner === 'player';

    if (won) {
      addCoins(battleRewards.coins);
      // Grant EXP to pet (food + pet level)
      grantRewards(
        battleRewards.bonusItems.filter(i => i.name === '먹이').reduce((s, i) => s + i.count, 0),
        battleRewards.exp
      );
      // Grant EXP to party pokemon (actual level-ups)
      const expResults = grantExpToParty(battleRewards.exp);
      if (expResults.some(r => r.evolved)) {
        const evolved = expResults.filter(r => r.evolved);
        for (const e of evolved) {
          const newSpecies = getPokemonById(e.evolvedTo!);
          toast.success(`${e.name}이(가) ${newSpecies?.name}(으)로 진화했습니다!`, { icon: '✨', duration: 4000 });
        }
      }
      const leveledUp = expResults.filter(r => r.levelAfter > r.levelBefore);
      if (leveledUp.length > 0) {
        for (const r of leveledUp) {
          toast(`${r.name} Lv.${r.levelBefore} → Lv.${r.levelAfter}`, { icon: '⬆️', duration: 3000 });
        }
      }
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
              <p className="text-[10px] text-muted-foreground mb-2 font-medium">내 파티 상태 <span className="text-muted-foreground/50">(탭하여 상세보기)</span></p>
              <div className="flex gap-2">
                {party.map(p => {
                  const species = getPokemonById(p.speciesId);
                  const hpRatio = getEffectiveHpRatio(p.uid);
                  const able = hpRatio > 0;
                  return (
                    <button
                      key={p.uid}
                      onClick={() => setPartyDetailPokemon(p)}
                      className={`flex-1 text-center rounded-lg p-1 transition-colors hover:bg-muted/50 ${!able ? 'opacity-40' : ''}`}
                    >
                      {species && <img src={species.spriteUrl} alt={species.name} className="w-8 h-8 mx-auto object-contain" style={{ imageRendering: 'pixelated' }} />}
                      <p className="text-[8px] text-muted-foreground truncate">{p.nickname || species?.name}</p>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-0.5">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${hpRatio * 100}%`,
                            background: hpRatio > 0.5 ? 'hsl(var(--heal-green))' : hpRatio > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))',
                          }}
                        />
                      </div>
                      {!able && <p className="text-[8px] text-destructive mt-0.5">기절</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Party Detail Popup */}
          <AnimatePresence>
            {partyDetailPokemon && (() => {
              const detailSpecies = getPokemonById(partyDetailPokemon.speciesId);
              const detailFriendship = getFriendshipLevel(partyDetailPokemon.friendship);
              const detailHabitats = detailSpecies ? getPokemonHabitats(partyDetailPokemon.speciesId, detailSpecies.types) : [];
              const detailHpRatio = getEffectiveHpRatio(partyDetailPokemon.uid);
              if (!detailSpecies) return null;
              return (
                <motion.div
                  key="party-detail"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
                  onClick={() => setPartyDetailPokemon(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-[340px] bg-card rounded-2xl border border-border/60 overflow-hidden max-h-[80vh] overflow-y-auto"
                  >
                    {/* Header */}
                    <div className="relative pt-5 pb-3 px-5 text-center">
                      <button onClick={() => setPartyDetailPokemon(null)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground">
                        <X size={14} />
                      </button>
                      <motion.img
                        src={detailSpecies.spriteUrl}
                        alt={detailSpecies.name}
                        className="w-20 h-20 object-contain mx-auto"
                        style={{ imageRendering: 'pixelated' }}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <p className="text-sm font-bold text-foreground mt-1">
                        {partyDetailPokemon.nickname || detailSpecies.name}
                      </p>
                      {partyDetailPokemon.nickname && (
                        <p className="text-[10px] text-muted-foreground">{detailSpecies.name}</p>
                      )}
                    </div>

                    <div className="px-4 pb-4 space-y-3">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="glass-card p-1.5 rounded-lg">
                          <p className="text-[9px] text-muted-foreground">레벨</p>
                          <p className="text-xs font-bold text-foreground">{partyDetailPokemon.level}</p>
                        </div>
                        <div className="glass-card p-1.5 rounded-lg">
                          <p className="text-[9px] text-muted-foreground">등급</p>
                          <p className={`text-xs font-bold ${RARITY_CONFIG[detailSpecies.rarity].color}`}>
                            {RARITY_CONFIG[detailSpecies.rarity].label}
                          </p>
                        </div>
                        <div className="glass-card p-1.5 rounded-lg">
                          <p className="text-[9px] text-muted-foreground">HP</p>
                          <p className={`text-xs font-bold ${detailHpRatio > 0.5 ? 'text-heal' : detailHpRatio > 0 ? 'text-amber' : 'text-destructive'}`}>
                            {detailHpRatio <= 0 ? '기절' : `${Math.round(detailHpRatio * 100)}%`}
                          </p>
                        </div>
                      </div>

                      {/* Types */}
                      <div className="flex gap-1.5">
                        {detailSpecies.types.map(t => (
                          <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full text-white ${TYPE_CONFIG[t].color}`}>
                            {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
                          </span>
                        ))}
                      </div>

                      {/* Friendship */}
                      <div className="glass-card p-2.5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-foreground">❤️ 친밀도</span>
                          <span className="text-[10px] text-foreground">{detailFriendship.emoji} {detailFriendship.label}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full gradient-primary" style={{ width: `${(partyDetailPokemon.friendship / 255) * 100}%` }} />
                        </div>
                        <p className="text-[8px] text-muted-foreground mt-0.5 text-right">{partyDetailPokemon.friendship}/255</p>
                      </div>

                      {/* Description */}
                      {detailSpecies.description && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed glass-card p-2.5 rounded-lg">
                          📖 {detailSpecies.description}
                        </p>
                      )}

                      {/* Habitat */}
                      {detailHabitats.length > 0 && (
                        <div className="glass-card p-2.5 rounded-lg">
                          <p className="text-[10px] font-semibold text-foreground mb-1.5">🗺️ 출몰 · 서식지</p>
                          <div className="space-y-1">
                            {detailHabitats.map(h => (
                              <div key={h.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30">
                                <span className="text-sm">{h.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-semibold text-foreground">{h.name}</p>
                                  <p className="text-[8px] text-muted-foreground">{h.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

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

  // ─── Switching Phase ────────────────────────
  if (phase === 'switching' && battleState) {
    const nextPlayer = battleState.playerTeam[battleState.playerIdx];
    const nextOpponent = battleState.opponentTeam[battleState.opponentIdx];
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="mb-4"
          >
            {nextPlayer && nextOpponent && (
              <div className="flex items-center justify-center gap-6">
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <img src={nextPlayer.spriteUrl} alt={nextPlayer.name} className="w-20 h-20 object-contain mx-auto" style={{ imageRendering: 'pixelated' }} />
                  <p className="text-[10px] text-muted-foreground mt-1">{nextPlayer.nickname || nextPlayer.name}</p>
                </motion.div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl"
                >
                  ⚔️
                </motion.span>
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <img src={nextOpponent.spriteUrl} alt={nextOpponent.name} className="w-20 h-20 object-contain mx-auto" style={{ imageRendering: 'pixelated' }} />
                  <p className="text-[10px] text-muted-foreground mt-1">{nextOpponent.nickname || nextOpponent.name}</p>
                </motion.div>
              </div>
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card px-5 py-3 inline-block"
          >
            <p className="text-sm font-medium text-foreground">{switchMessage}</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Fighting Phase ─────────────────────────
  if (phase === 'fighting' && battleState && selectedNpc) {
    const player = battleState.playerTeam[battleState.playerIdx];
    const opponent = battleState.opponentTeam[battleState.opponentIdx];

    const currentLog = isAnimating && animatingTurnIdx < currentTurnLogs.length ? currentTurnLogs[animatingTurnIdx] : 
                       isAnimating && animatingTurnIdx > 0 ? currentTurnLogs[animatingTurnIdx - 1] : null;
    const isPlayerAttacking = currentLog ? !currentLog.attackerUid.startsWith('npc_') : false;

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
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[9px] text-muted-foreground">{Math.max(0, opponent?.currentHp || 0)}/{opponent?.maxHp || 0}</p>
                {/* Opponent team indicators */}
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
                animate={
                  currentLog && animSubPhase === 'hit_effect' && currentLog.defenderUid === opponent.uid && !currentLog.missed 
                    ? { x: [0, 8, -8, 4, -4, 0], opacity: [1, 0.5, 1] } 
                    : currentLog && animSubPhase === 'move_announce' && currentLog.attackerUid === opponent.uid
                    ? { y: [0, -5, 0] }
                    : {}
                }
                transition={{ duration: 0.4 }}
              >
                <img src={opponent.spriteUrl} alt={opponent.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} />
              </motion.div>
            )}
            {player && (
              <motion.div
                className="absolute bottom-4 left-4"
                animate={
                  currentLog && animSubPhase === 'move_announce' && currentLog.attackerUid === player.uid
                    ? { y: [0, -5, 0] }
                    : currentLog && animSubPhase === 'hit_effect' && currentLog.defenderUid === player.uid && !currentLog.missed
                    ? { x: [0, -8, 8, -4, 4, 0], opacity: [1, 0.5, 1] }
                    : {}
                }
                transition={{ duration: 0.4 }}
              >
                <img src={player.spriteUrl} alt={player.name} className="w-20 h-20 object-contain" style={{ imageRendering: 'pixelated' }} />
              </motion.div>
            )}

            {/* Move effect emoji — only during hit phase */}
            <AnimatePresence>
              {currentLog && animSubPhase === 'hit_effect' && !currentLog.missed && (
                <motion.div
                  key={`eff-${allTurnLogs.length}-${animatingTurnIdx}-hit`}
                  initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1.2, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', damping: 12 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="text-4xl drop-shadow-lg">{currentLog.move.emoji}</span>
                  {currentLog.effectiveness > 1 && (
                    <motion.span initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: -10 }} className="absolute -top-3 -right-3 text-xs font-bold text-heal bg-card/80 rounded-full px-1.5 py-0.5">
                      효과적!
                    </motion.span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Damage number popup */}
            <AnimatePresence>
              {currentLog && animSubPhase === 'hit_effect' && !currentLog.missed && currentLog.damage > 0 && (
                <motion.div
                  key={`dmg-${allTurnLogs.length}-${animatingTurnIdx}`}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: 1, y: -30, scale: 1 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.6 }}
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
                {/* Player team indicators */}
                <div className="flex gap-1">
                  {battleState.playerTeam.map((p, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${p.currentHp > 0 ? 'bg-primary' : 'bg-muted'}`} />
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground">{Math.max(0, player?.currentHp || 0)}/{player?.maxHp || 0}</p>
              </div>
            </div>
          </div>

          {/* Turn log message — sub-phase aware */}
          <div className="glass-card p-3 min-h-[70px] flex items-center mb-3">
            <AnimatePresence mode="wait">
              {currentLog && isAnimating ? (
                <motion.div key={`log-${allTurnLogs.length}-${animatingTurnIdx}-${animSubPhase}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="w-full">
                  {animSubPhase === 'move_announce' && (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${isPlayerAttacking ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                          {isPlayerAttacking ? '아군' : '상대'}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {currentLog.attackerUid.startsWith('npc_') 
                            ? (battleState.opponentTeam.find(p => p.uid === currentLog.attackerUid)?.nickname || battleState.opponentTeam.find(p => p.uid === currentLog.attackerUid)?.name)
                            : (player?.nickname || player?.name)
                          }
                        </span>
                      </div>
                      <p className="text-xs text-foreground">
                        {currentLog.move.emoji} <span className="font-semibold">{currentLog.move.name}</span>을(를) 사용!
                      </p>
                    </>
                  )}
                  {animSubPhase === 'hit_effect' && (
                    <>
                      {currentLog.missed ? (
                        <p className="text-xs text-muted-foreground">하지만 빗나갔다!</p>
                      ) : (
                        <>
                          <p className="text-xs text-foreground font-semibold">{currentLog.damage} 데미지!</p>
                          {currentLog.effectiveness > 1 && <p className="text-[10px] text-heal mt-0.5 font-semibold">⚡ 효과는 굉장했다! (x{currentLog.effectiveness})</p>}
                          {currentLog.effectiveness < 1 && <p className="text-[10px] text-muted-foreground mt-0.5">효과가 별로인 듯하다... (x{currentLog.effectiveness})</p>}
                          {currentLog.critical && <p className="text-[10px] text-primary mt-0.5 font-bold">💥 급소에 맞았다!</p>}
                        </>
                      )}
                    </>
                  )}
                  {animSubPhase === 'result_msg' && (
                    <>
                      {currentLog.statusApplied && (
                        <p className="text-xs text-accent font-semibold">
                          {currentLog.statusApplied === 'burn' && '🔥 화상을 입었다!'}
                          {currentLog.statusApplied === 'freeze' && '❄️ 얼어붙었다!'}
                          {currentLog.statusApplied === 'paralyze' && '⚡ 마비되었다!'}
                          {currentLog.statusApplied === 'lower_def' && '⬇️ 방어가 떨어졌다!'}
                        </p>
                      )}
                      {currentLog.healAmount > 0 && (
                        <p className="text-xs text-heal font-semibold">💚 {currentLog.healAmount} HP 회복!</p>
                      )}
                      {currentLog.defenderFainted && (
                        <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xs text-destructive font-bold">
                          {currentLog.defenderUid.startsWith('npc_') ? '상대' : '아군'} 포켓몬이 쓰러졌다!
                        </motion.p>
                      )}
                      {!currentLog.statusApplied && !currentLog.healAmount && !currentLog.defenderFainted && !currentLog.missed && (
                        <p className="text-xs text-muted-foreground">
                          남은 HP: {currentLog.defenderHpAfter}
                        </p>
                      )}
                    </>
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
              {/* Toggle between moves and switch */}
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
                          onClick={() => !isActive && !isFainted && handleSwitch(idx)}
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
