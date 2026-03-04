import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getParty, markAsSeen, addCoins, grantExpToParty, type OwnedPokemon } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import {
  buildBattleTeam, buildNpcBattleTeam,
  saveBattleRecord, type BattleTurnLog, type BattlePokemon, type BattleMove,
  initTurnBattle, executeTurn, executeSwitchTurn, calculateBattleRewards, type TurnBasedBattleState,
} from '@/lib/battle';
import { getNpcById, type NpcTrainer } from '@/lib/npc-trainers';
import { grantRewards } from '@/lib/pet';
import { applyBattleDamage, canBattle, getInjuredCount } from '@/lib/pokemon-health';

import BattleSelect from '@/components/battle/BattleSelect';
import BattleIntro from '@/components/battle/BattleIntro';
import BattleSwitching from '@/components/battle/BattleSwitching';
import BattleFighting from '@/components/battle/BattleFighting';
import BattleResult from '@/components/battle/BattleResult';

type BattlePhase = 'select' | 'intro' | 'fighting' | 'switching' | 'result';

export default function BattlePage() {
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
  const [battleState, setBattleState] = useState<TurnBasedBattleState | null>(null);
  const [currentTurnLogs, setCurrentTurnLogs] = useState<BattleTurnLog[]>([]);
  const [animatingTurnIdx, setAnimatingTurnIdx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [allTurnLogs, setAllTurnLogs] = useState<BattleTurnLog[]>([]);
  const [switchMessage, setSwitchMessage] = useState<string>('');
  const [originalPlayerTeam, setOriginalPlayerTeam] = useState<BattlePokemon[]>([]);
  const [originalOpponentTeam, setOriginalOpponentTeam] = useState<BattlePokemon[]>([]);
  const [rewards, setRewards] = useState<{ coins: number; exp: number; bonusItems: { name: string; emoji: string; count: number }[]; coinsLost: number } | null>(null);
  const [animSubPhase, setAnimSubPhase] = useState<'attack' | 'result'>('attack');
  const [hpSnapshot, setHpSnapshot] = useState<Record<string, number>>({});

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

  // Animation loop
  useEffect(() => {
    if (!isAnimating || currentTurnLogs.length === 0) return;

    if (animatingTurnIdx >= currentTurnLogs.length) {
      const hasFaint = currentTurnLogs.some(l => l.defenderFainted);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setHpSnapshot({});

        if (battleState?.phase === 'finished') {
          if (hasFaint) {
            const faintLog = currentTurnLogs.find(l => l.defenderFainted)!;
            const faintedIsPlayer = !faintLog.defenderUid.startsWith('npc_');
            const faintedPokemon = faintedIsPlayer
              ? battleState.playerTeam.find(p => p.uid === faintLog.defenderUid)
              : battleState.opponentTeam.find(p => p.uid === faintLog.defenderUid);
            const faintedName = faintedPokemon?.nickname || faintedPokemon?.name || '???';
            setSwitchMessage(`${faintedIsPlayer ? '' : '상대의 '}${faintedName}이(가) 쓰러졌다!`);
            setPhase('switching');
            setTimeout(() => { setSwitchMessage(''); finishBattle(); setPhase('result'); }, 2000);
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

            setSwitchMessage(isPlayerFainted ? `${faintedName}이(가) 쓰러졌다!` : `상대의 ${faintedName}이(가) 쓰러졌다!`);
            setPhase('switching');
            setTimeout(() => {
              setSwitchMessage(isPlayerFainted ? `가라, ${nextName}!` : `상대는 ${nextName}을(를) 내보냈다!`);
              setTimeout(() => { setPhase('fighting'); setSwitchMessage(''); }, 1800);
            }, 1800);
          }
        }
      }, 800);
      return () => clearTimeout(timer);
    }

    const log = currentTurnLogs[animatingTurnIdx];
    if (!log) return;

    if (animSubPhase === 'attack') {
      const timer = setTimeout(() => {
        setAnimSubPhase('result');
        setHpSnapshot(prev => {
          const next = { ...prev };
          delete next[log.defenderUid];
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (animSubPhase === 'result') {
      const delay = log.defenderFainted ? 1800 : 1200;
      const timer = setTimeout(() => {
        setAnimatingTurnIdx(i => i + 1);
        setAnimSubPhase('attack');
        if (animatingTurnIdx + 1 < currentTurnLogs.length) {
          const nextLog = currentTurnLogs[animatingTurnIdx + 1];
          const defenderTeam = nextLog.defenderUid.startsWith('npc_') ? battleState?.opponentTeam : battleState?.playerTeam;
          const defender = defenderTeam?.find(p => p.uid === nextLog.defenderUid);
          if (defender) {
            setHpSnapshot(prev => ({ ...prev, [nextLog.defenderUid]: defender.currentHp + nextLog.damage }));
          }
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, animatingTurnIdx, currentTurnLogs, animSubPhase]);

  const handleMoveSelect = (move: BattleMove) => {
    if (!battleState || isAnimating || battleState.phase === 'finished') return;

    const snap: Record<string, number> = {};
    const player = battleState.playerTeam[battleState.playerIdx];
    const opp = battleState.opponentTeam[battleState.opponentIdx];
    if (player) snap[player.uid] = player.currentHp;
    if (opp) snap[opp.uid] = opp.currentHp;

    const turnLogs = executeTurn(battleState, move);
    if (turnLogs.length > 0) {
      const firstDefender = turnLogs[0].defenderUid;
      if (snap[firstDefender] !== undefined) {
        setHpSnapshot({ [firstDefender]: snap[firstDefender] });
      }
    }

    setBattleState({ ...battleState });
    setCurrentTurnLogs(turnLogs);
    setAllTurnLogs(prev => [...prev, ...turnLogs]);
    setAnimatingTurnIdx(0);
    setAnimSubPhase('attack');
    setIsAnimating(true);
  };

  const handleSwitch = (teamIdx: number) => {
    if (!battleState || isAnimating || battleState.phase === 'finished') return;
    if (teamIdx === battleState.playerIdx) return;

    const snap: Record<string, number> = {};
    const newPlayer = battleState.playerTeam[teamIdx];
    if (newPlayer) snap[newPlayer.uid] = newPlayer.currentHp;

    const turnLogs = executeSwitchTurn(battleState, teamIdx);
    if (turnLogs.length > 1) {
      setHpSnapshot({ [turnLogs[1].defenderUid]: snap[turnLogs[1].defenderUid] || newPlayer?.currentHp || 0 });
    }

    setBattleState({ ...battleState });
    setCurrentTurnLogs(turnLogs);
    setAllTurnLogs(prev => [...prev, ...turnLogs]);
    setAnimatingTurnIdx(0);
    setAnimSubPhase('attack');
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
      const expResults = grantExpToParty(battleRewards.exp);
      if (expResults.some(r => r.evolved)) {
        for (const e of expResults.filter(r => r.evolved)) {
          const newSpecies = getPokemonById(e.evolvedTo!);
          toast.success(`${e.name}이(가) ${newSpecies?.name}(으)로 진화했습니다!`, { icon: '✨', duration: 4000 });
        }
      }
      const leveledUp = expResults.filter(r => r.levelAfter > r.levelBefore);
      for (const r of leveledUp) {
        toast(`${r.name} Lv.${r.levelBefore} → Lv.${r.levelAfter}`, { icon: '⬆️', duration: 3000 });
      }
    } else {
      if (battleRewards.coinsLost > 0) addCoins(-battleRewards.coinsLost);
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

  // ─── Render by phase ───────────────────────────
  if (phase === 'select') {
    return <BattleSelect party={party} injuredCount={injuredCount} onStartBattle={startBattle} />;
  }

  if (phase === 'intro' && selectedNpc) {
    return <BattleIntro npc={selectedNpc} />;
  }

  if (phase === 'switching' && battleState) {
    return <BattleSwitching battleState={battleState} switchMessage={switchMessage} />;
  }

  if (phase === 'fighting' && battleState && selectedNpc) {
    return (
      <BattleFighting
        battleState={battleState}
        selectedNpc={selectedNpc}
        isAnimating={isAnimating}
        currentTurnLogs={currentTurnLogs}
        allTurnLogs={allTurnLogs}
        animatingTurnIdx={animatingTurnIdx}
        animSubPhase={animSubPhase}
        onMoveSelect={handleMoveSelect}
        onSwitch={handleSwitch}
      />
    );
  }

  if (phase === 'result' && battleState && selectedNpc && rewards) {
    return (
      <BattleResult
        battleState={battleState}
        selectedNpc={selectedNpc}
        rewards={rewards}
        allTurnLogs={allTurnLogs}
        party={party}
        isAiNpc={isAiNpc}
        onRematch={() => { setPhase('select'); setBattleState(null); setRewards(null); setAllTurnLogs([]); }}
      />
    );
  }

  return null;
}
