import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, Zap, Shield, Heart, Trophy, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { getParty, markAsSeen } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import {
  buildBattleTeam, buildNpcBattleTeam, simulateBattle,
  saveBattleRecord, type BattleResult, type BattleTurnLog, type BattlePokemon,
} from '@/lib/battle';
import { NPC_TRAINERS, getNpcById, type NpcTrainer } from '@/lib/npc-trainers';
import { addCoins } from '@/lib/collection';
import { grantRewards } from '@/lib/pet';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { clearPendingEncounter } from '@/lib/npc-encounter';

type BattlePhase = 'select' | 'intro' | 'fighting' | 'result';

export default function BattlePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedNpc = searchParams.get('npc');
  const isAiNpc = searchParams.get('aiNpc') === 'true';

  // Load AI NPC from sessionStorage if applicable
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
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [playerTeamDisplay, setPlayerTeamDisplay] = useState<BattlePokemon[]>([]);
  const [opponentTeamDisplay, setOpponentTeamDisplay] = useState<BattlePokemon[]>([]);
  const turnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const party = getParty();

  // Auto-start if NPC preselected
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
    setSelectedNpc(npc);
    setPhase('intro');

    const pTeam = buildBattleTeam(party);
    const oTeam = buildNpcBattleTeam(npc.teamSpeciesIds, npc.level, npc.friendship);
    setPlayerTeamDisplay(pTeam);
    setOpponentTeamDisplay(oTeam);

    // Mark opponent Pokemon as "seen" in Pokédex
    markAsSeen(npc.teamSpeciesIds);

    setTimeout(() => {
      const result = simulateBattle(pTeam, oTeam);
      setBattleResult(result);
      setCurrentTurnIdx(0);
      setPhase('fighting');
    }, 2500);
  }, [party]);

  // Auto-advance turns
  useEffect(() => {
    if (phase !== 'fighting' || !battleResult) return;
    if (currentTurnIdx >= battleResult.turns.length) {
      // Battle over
      setTimeout(() => {
        setPhase('result');
        // Grant rewards
        addCoins(battleResult.rewards.coins);
        grantRewards(0, battleResult.rewards.exp);
        saveBattleRecord({
          id: `battle_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          opponentName: selectedNpc?.name || '???',
          result: battleResult.winner === 'player' ? 'win' : 'lose',
          coinsEarned: battleResult.rewards.coins,
          expEarned: battleResult.rewards.exp,
        });
      }, 1000);
      return;
    }

    turnTimerRef.current = setTimeout(() => {
      setCurrentTurnIdx(i => i + 1);
    }, 1800);

    return () => { if (turnTimerRef.current) clearTimeout(turnTimerRef.current); };
  }, [phase, currentTurnIdx, battleResult, selectedNpc]);

  const currentTurn: BattleTurnLog | null =
    battleResult && currentTurnIdx > 0 ? battleResult.turns[currentTurnIdx - 1] : null;

  // Find active pokemon for each side
  const getActivePokemon = (turns: BattleTurnLog[], idx: number, team: BattlePokemon[], isPlayer: boolean) => {
    if (idx === 0 || !turns.length) return team[0];
    // Find the last turn where this side's pokemon was involved
    for (let i = Math.min(idx - 1, turns.length - 1); i >= 0; i--) {
      const t = turns[i];
      const found = team.find(p => p.uid === t.attackerUid || p.uid === t.defenderUid);
      if (found) {
        // Check if it fainted
        if (t.defenderUid === found.uid && t.defenderFainted) {
          // Move to next
          const faintedIdx = team.findIndex(p => p.uid === found.uid);
          if (faintedIdx < team.length - 1) return team[faintedIdx + 1];
        }
        return found;
      }
    }
    return team[0];
  };

  // ─── Select Phase ───────────────────────────
  if (phase === 'select') {
    const difficultyColors: Record<string, string> = {
      easy: 'text-heal',
      medium: 'text-secondary',
      hard: 'text-primary',
      elite: 'text-accent',
    };
    const difficultyLabels: Record<string, string> = {
      easy: '쉬움',
      medium: '보통',
      hard: '어려움',
      elite: '엘리트',
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

          {party.length === 0 && (
            <div className="glass-card p-6 text-center mb-4">
              <p className="text-foreground font-semibold">파티에 포켓몬이 없습니다!</p>
              <p className="text-muted-foreground text-sm mt-1">파티 관리에서 포켓몬을 추가하세요</p>
              <Button onClick={() => navigate('/party')} className="mt-3" size="sm">파티 관리</Button>
            </div>
          )}

          <div className="space-y-3">
            {NPC_TRAINERS.map(npc => (
              <motion.button
                key={npc.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => startBattle(npc)}
                disabled={party.length === 0}
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-8"
        >
          <motion.p
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-sm text-muted-foreground mb-4"
          >
            {selectedNpc.title}
          </motion.p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="text-5xl mb-3"
          >
            {selectedNpc.emoji}
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xl font-bold text-foreground mb-3"
          >
            {selectedNpc.name}이(가) 승부를 걸어왔다!
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="glass-card px-4 py-2 inline-block"
          >
            <p className="text-sm text-foreground">"{selectedNpc.dialogue.before}"</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-6"
          >
            <Swords size={24} className="text-primary mx-auto animate-pulse" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Fighting Phase ─────────────────────────
  if (phase === 'fighting' && battleResult && selectedNpc) {
    const pActive = playerTeamDisplay[0]; // simplified
    const oActive = opponentTeamDisplay[0];

    // Track HP from turns
    const getHp = (uid: string, maxHp: number) => {
      for (let i = Math.min(currentTurnIdx - 1, battleResult.turns.length - 1); i >= 0; i--) {
        if (battleResult.turns[i].defenderUid === uid) return battleResult.turns[i].defenderHpAfter;
        if (battleResult.turns[i].attackerUid === uid) {
          // Check if this pokemon was also a defender earlier
          for (let j = i; j >= 0; j--) {
            if (battleResult.turns[j].defenderUid === uid) return battleResult.turns[j].defenderHpAfter;
          }
        }
      }
      return maxHp;
    };

    const pHp = pActive ? getHp(pActive.uid, pActive.maxHp) : 0;
    const oHp = oActive ? getHp(oActive.uid, oActive.maxHp) : 0;

    return (
      <div className="min-h-screen flex flex-col">
        <div className="mx-auto max-w-md w-full px-5 pt-6 flex-1 flex flex-col">
          {/* Opponent */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">{oActive?.nickname || oActive?.name || '???'}</p>
              <p className="text-[10px] text-muted-foreground">Lv.{oActive?.level || 0}</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: (oHp / (oActive?.maxHp || 1)) > 0.5 ? 'hsl(var(--heal-green))' : (oHp / (oActive?.maxHp || 1)) > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))' }}
                  initial={false}
                  animate={{ width: `${Math.max(0, (oHp / (oActive?.maxHp || 1)) * 100)}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </div>

          {/* Battle field */}
          <div className="relative flex-1 min-h-[200px] flex items-center justify-between px-4">
            {/* Opponent sprite (right) */}
            <div />
            {oActive && (
              <motion.div
                animate={currentTurn?.defenderUid === oActive.uid ? { x: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={oActive.spriteUrl}
                  alt={oActive.name}
                  className="w-24 h-24 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </motion.div>
            )}

            {/* Player sprite (left, bottom) */}
            {pActive && (
              <motion.div
                className="absolute bottom-4 left-4"
                animate={currentTurn?.attackerUid === pActive.uid ? { x: [0, 10, 0] } : currentTurn?.defenderUid === pActive.uid ? { x: [0, -5, 5, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={pActive.spriteUrl}
                  alt={pActive.name}
                  className="w-20 h-20 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </motion.div>
            )}

            {/* Damage flash */}
            <AnimatePresence>
              {currentTurn && (
                <motion.div
                  key={currentTurnIdx}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <span className="text-3xl">{currentTurn.move.emoji}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player HP */}
          <div className="flex items-center gap-3 mt-2 mb-2">
            <div className="flex-1 text-right">
              <p className="text-xs font-bold text-foreground">{pActive?.nickname || pActive?.name || '???'}</p>
              <p className="text-[10px] text-muted-foreground">Lv.{pActive?.level || 0}</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: (pHp / (pActive?.maxHp || 1)) > 0.5 ? 'hsl(var(--heal-green))' : (pHp / (pActive?.maxHp || 1)) > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))' }}
                  initial={false}
                  animate={{ width: `${Math.max(0, (pHp / (pActive?.maxHp || 1)) * 100)}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </div>

          {/* Turn log */}
          <div className="glass-card p-3 min-h-[60px] flex items-center">
            <AnimatePresence mode="wait">
              {currentTurn ? (
                <motion.div
                  key={currentTurnIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full"
                >
                  <p className="text-xs text-foreground">{currentTurn.message}</p>
                  {currentTurn.effectiveness > 1 && <p className="text-[10px] text-secondary mt-0.5">효과는 굉장했다!</p>}
                  {currentTurn.critical && <p className="text-[10px] text-primary mt-0.5">급소에 맞았다!</p>}
                </motion.div>
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground w-full text-center"
                >
                  배틀 시작!
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // ─── Result Phase ───────────────────────────
  if (phase === 'result' && battleResult && selectedNpc) {
    const won = battleResult.winner === 'player';
    return (
      <div className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-5 pt-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-5xl block mb-3"
            >
              {won ? '🏆' : '😢'}
            </motion.span>
            <h1 className="text-2xl font-bold text-foreground">{won ? '승리!' : '패배...'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              vs {selectedNpc.name} ({selectedNpc.title})
            </p>
          </motion.div>

          {/* NPC Dialogue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-4 mb-4 text-center"
          >
            <span className="text-2xl">{selectedNpc.emoji}</span>
            <p className="text-sm text-foreground mt-2">
              "{won ? selectedNpc.dialogue.win : selectedNpc.dialogue.lose}"
            </p>
          </motion.div>

          {/* Battle summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-4 mb-4"
          >
            <p className="text-xs text-muted-foreground mb-3">배틀 요약</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{battleResult.totalTurns}</p>
                <p className="text-[10px] text-muted-foreground">총 턴 수</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {battleResult.turns.filter(t => t.critical).length}
                </p>
                <p className="text-[10px] text-muted-foreground">크리티컬</p>
              </div>
            </div>
          </motion.div>

          {/* Rewards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="glass-card p-4 mb-6"
          >
            <p className="text-xs text-muted-foreground mb-3">🎁 보상</p>
            <div className="flex gap-4 justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: 'spring' }}
                className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2"
              >
                <Coins size={16} className="text-secondary" />
                <span className="font-bold text-secondary">+{battleResult.rewards.coins}</span>
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2, type: 'spring' }}
                className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2"
              >
                <Zap size={16} className="text-accent" />
                <span className="font-bold text-accent">+{battleResult.rewards.exp} EXP</span>
              </motion.div>
            </div>
          </motion.div>

          <div className="flex gap-3">
            {isAiNpc ? (
              <Button onClick={() => { clearPendingEncounter(); navigate('/run'); }} className="flex-1 gradient-primary text-primary-foreground border-0">
                🏃 런닝 계속하기
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate('/ranking')} className="flex-1">
                  <Trophy size={16} className="mr-1.5" /> 랭킹
                </Button>
                <Button onClick={() => { setPhase('select'); setBattleResult(null); }} className="flex-1 gradient-primary text-primary-foreground border-0">
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
