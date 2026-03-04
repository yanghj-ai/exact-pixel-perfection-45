import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getParty, markAsSeen, addCoins, grantExpToParty, type OwnedPokemon } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import {
  buildBattleTeam, buildNpcBattleTeam, saveBattleRecord,
  type BattlePokemon, type BattleMove, type TurnBasedBattleState, type BattleTurnLog,
  initTurnBattle, calculateBattleRewards,
  doAttack, chooseNpcMove, canPokemonAct, getSpeedOrder,
  advanceNpcPokemon, checkPlayerDefeated,
} from '@/lib/battle';
import { getNpcById, type NpcTrainer } from '@/lib/npc-trainers';
import { grantRewards } from '@/lib/pet';
import { applyBattleDamage, canBattle, getInjuredCount } from '@/lib/pokemon-health';
import { findMoveKey, getSkillLevelLabel, getSkillState } from '@/lib/skill-system';

import BattleSelect from '@/components/battle/BattleSelect';
import BattleIntro from '@/components/battle/BattleIntro';
import BattleFighting, { type SpriteAnim } from '@/components/battle/BattleFighting';
import BattleResult from '@/components/battle/BattleResult';

type BattlePhase = 'select' | 'intro' | 'fighting' | 'result';

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export default function BattlePage() {
  const [searchParams] = useSearchParams();
  const preselectedNpc = searchParams.get('npc');
  const isAiNpc = searchParams.get('aiNpc') === 'true';

  const getInitialNpc = (): NpcTrainer | null => {
    if (isAiNpc) {
      const stored = sessionStorage.getItem('routinmon-ai-npc');
      if (stored) { sessionStorage.removeItem('routinmon-ai-npc'); return JSON.parse(stored); }
    }
    if (preselectedNpc) return getNpcById(preselectedNpc) || null;
    return null;
  };

  const [phase, setPhase] = useState<BattlePhase>(() => (isAiNpc || preselectedNpc) ? 'intro' : 'select');
  const [selectedNpc, setSelectedNpc] = useState<NpcTrainer | null>(getInitialNpc);

  // Mutable battle state via ref + force-render
  const bsRef = useRef<TurnBasedBattleState | null>(null);
  const [, setTick] = useState(0);
  const tick = useCallback(() => setTick(n => n + 1), []);

  const [originalPlayerTeam, setOriginalPlayerTeam] = useState<BattlePokemon[]>([]);
  const [originalOpponentTeam, setOriginalOpponentTeam] = useState<BattlePokemon[]>([]);
  const [rewards, setRewards] = useState<ReturnType<typeof calculateBattleRewards> | null>(null);
  const [allTurnLogs, setAllTurnLogs] = useState<BattleTurnLog[]>([]);

  // UI / animation states
  const [message, setMessage] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [waitingForSwitch, setWaitingForSwitch] = useState(false);
  const [playerAnim, setPlayerAnim] = useState<SpriteAnim>('idle');
  const [opponentAnim, setOpponentAnim] = useState<SpriteAnim>('idle');
  const [critFlash, setCritFlash] = useState(false);

  // Promise resolvers
  const msgResolve = useRef<(() => void) | null>(null);
  const switchResolve = useRef<((idx: number) => void) | null>(null);
  const alive = useRef(true);

  const party = getParty();
  const injuredCount = getInjuredCount();

  useEffect(() => {
    alive.current = true;
    if ((preselectedNpc || isAiNpc) && selectedNpc) startBattle(selectedNpc);
    return () => { alive.current = false; };
  }, []);

  // ─── Message system ─────────────────────────────
  const showMessage = useCallback((text: string): Promise<void> =>
    new Promise(resolve => { setMessage(text); msgResolve.current = resolve; }), []);

  const handleMessageComplete = useCallback(() => {
    setMessage(null);
    msgResolve.current?.();
    msgResolve.current = null;
  }, []);

  // ─── Switch system ──────────────────────────────
  const waitForSwitch = useCallback((): Promise<number> =>
    new Promise(resolve => { setWaitingForSwitch(true); switchResolve.current = resolve; }), []);

  const handleSwitchChoice = useCallback((idx: number) => {
    setWaitingForSwitch(false);
    switchResolve.current?.(idx);
    switchResolve.current = null;
  }, []);

  // ─── Start battle ───────────────────────────────
  const startBattle = useCallback((npc: NpcTrainer) => {
    if (party.length === 0) { toast('파티에 포켓몬이 없습니다!'); return; }
    const battleable = party.filter(p => canBattle(p.uid));
    if (battleable.length === 0) {
      toast.error('모든 포켓몬이 부상 상태입니다!', { description: '포켓몬 센터에서 회복하세요.' });
      return;
    }
    setSelectedNpc(npc);
    setPhase('intro');

    const pTeam = buildBattleTeam(battleable);
    const oTeam = buildNpcBattleTeam(npc.teamSpeciesIds, npc.level, npc.friendship);
    setOriginalPlayerTeam(pTeam);
    setOriginalOpponentTeam(oTeam);
    markAsSeen(npc.teamSpeciesIds);

    setTimeout(async () => {
      if (!alive.current) return;
      const state = initTurnBattle(pTeam, oTeam);
      bsRef.current = state;
      setAllTurnLogs([]);
      setRewards(null);
      setPhase('fighting');
      tick();

      setPlayerAnim('entering');
      setOpponentAnim('entering');
      await delay(600);
      if (!alive.current) return;
      setPlayerAnim('idle');
      setOpponentAnim('idle');
      setWaitingForInput(true);
    }, 2500);
  }, [party, tick]);

  // ─── Animate a single attack ────────────────────
  const animateAttack = async (
    state: TurnBasedBattleState,
    side: 'player' | 'npc',
    move: BattleMove
  ): Promise<BattleTurnLog | null> => {
    if (!alive.current) return null;

    const attacker = side === 'player' ? state.playerTeam[state.playerIdx] : state.opponentTeam[state.opponentIdx];
    const defender = side === 'player' ? state.opponentTeam[state.opponentIdx] : state.playerTeam[state.playerIdx];
    const prefix = side === 'npc' ? '상대 ' : '';
    const aName = attacker.nickname || attacker.name;

    // Can act check
    const act = canPokemonAct(attacker);
    if (!act.canAct) { await showMessage(act.reason); return null; }

    // Move announce
    await showMessage(`${prefix}${aName}의 ${move.emoji} ${move.name}!`);

    // Lunge animation
    if (side === 'player') setPlayerAnim('attacking'); else setOpponentAnim('attacking');
    await delay(400);
    if (!alive.current) return null;
    if (side === 'player') setPlayerAnim('idle'); else setOpponentAnim('idle');

    // Capture skill level BEFORE attack for level-up detection
    let skillLevelBefore = 0;
    let playerMoveKey = '';
    if (side === 'player') {
      playerMoveKey = findMoveKey(move);
      skillLevelBefore = getSkillState(attacker.uid, playerMoveKey).skillLevel;
    }

    // Execute attack (mutates HP, also tracks skill usage via onSkillUsed)
    const log = doAttack(attacker, defender, state.turnCount, side === 'player', move);
    state.turns.push(log);
    setAllTurnLogs(prev => [...prev, log]);

    // Check if skill leveled up after attack
    if (side === 'player') {
      const skillAfter = getSkillState(attacker.uid, playerMoveKey);
      if (skillAfter.skillLevel > skillLevelBefore) {
        const lvLabel = getSkillLevelLabel(skillAfter.skillLevel);
        toast.success(`${move.emoji} ${move.name} 스킬 레벨 UP!`, {
          description: `${lvLabel.emoji} ${lvLabel.label} 달성! 위력/명중 보너스 증가`,
          duration: 3000,
        });
      }
    }

    if (log.missed) {
      await showMessage('공격이 빗나갔다!');
      tick();
      return log;
    }

    // Hit animation + HP update
    if (side === 'player') setOpponentAnim('hit'); else setPlayerAnim('hit');
    tick(); // triggers HP bar transition

    if (log.critical) { setCritFlash(true); await delay(100); setCritFlash(false); }
    await delay(600);
    if (!alive.current) return null;
    if (side === 'player') setOpponentAnim(log.defenderFainted ? 'idle' : 'idle');
    else setPlayerAnim(log.defenderFainted ? 'idle' : 'idle');
    // Reset hit anim
    if (side === 'player') setOpponentAnim('idle'); else setPlayerAnim('idle');

    // Effectiveness messages
    if (log.effectiveness === 0) await showMessage(`${defender.nickname || defender.name}에게는 효과가 없다!`);
    else if (log.effectiveness >= 2) await showMessage('효과는 굉장했다!');
    else if (log.effectiveness > 0 && log.effectiveness <= 0.5) await showMessage('별로 효과가 없는 것 같다...');

    if (log.critical) await showMessage('급소에 맞았다!');

    if (log.statusApplied === 'burn') await showMessage(`${defender.nickname || defender.name}은(는) 화상을 입었다!`);
    if (log.statusApplied === 'freeze') await showMessage(`${defender.nickname || defender.name}은(는) 얼어붙었다!`);
    if (log.statusApplied === 'paralyze') await showMessage(`${defender.nickname || defender.name}은(는) 마비되었다!`);
    if (log.statusApplied === 'lower_def') await showMessage(`${defender.nickname || defender.name}의 방어가 떨어졌다!`);
    if (log.healAmount > 0) await showMessage(`${aName}은(는) ${log.healAmount} HP를 회복했다!`);

    return log;
  };

  // ─── Faint sequence ─────────────────────────────
  const handleFaintSequence = async (
    state: TurnBasedBattleState,
    faintedSide: 'player' | 'npc'
  ): Promise<boolean> => {
    if (!alive.current) return true;
    const fainted = faintedSide === 'npc' ? state.opponentTeam[state.opponentIdx] : state.playerTeam[state.playerIdx];
    const fName = fainted.nickname || fainted.name;
    const prefix = faintedSide === 'npc' ? '상대 ' : '';

    // Faint animation
    if (faintedSide === 'npc') setOpponentAnim('fainting'); else setPlayerAnim('fainting');
    await delay(600);
    if (faintedSide === 'npc') setOpponentAnim('fainted'); else setPlayerAnim('fainted');

    await showMessage(`${prefix}${fName}이(가) 쓰러졌다!`);

    if (faintedSide === 'npc') {
      const result = advanceNpcPokemon(state);
      tick();
      if (result.gameOver) return true;

      await showMessage(`상대가 ${result.nextName}을(를) 보냈다!`);
      setOpponentAnim('entering');
      tick();
      await delay(800);
      if (alive.current) setOpponentAnim('idle');
    } else {
      if (checkPlayerDefeated(state)) { tick(); return true; }

      const aliveIdxs = state.playerTeam.map((p, i) => p.currentHp > 0 ? i : -1).filter(i => i >= 0);
      let chosenIdx: number;

      if (aliveIdxs.length === 1) {
        chosenIdx = aliveIdxs[0];
      } else {
        chosenIdx = await waitForSwitch();
      }

      state.playerIdx = chosenIdx;
      const next = state.playerTeam[chosenIdx];
      await showMessage(`가랏! ${next.nickname || next.name}!`);
      setPlayerAnim('entering');
      tick();
      await delay(800);
      if (alive.current) setPlayerAnim('idle');
    }
    return false;
  };

  // ─── Handle move selection ──────────────────────
  const handleMoveSelect = useCallback(async (move: BattleMove) => {
    const state = bsRef.current;
    if (!state || !selectedNpc || !alive.current) return;
    setWaitingForInput(false);
    setMessage(null);

    const player = state.playerTeam[state.playerIdx];
    const opponent = state.opponentTeam[state.opponentIdx];
    if (!player || !opponent) return;

    const npcMove = chooseNpcMove(opponent, player, selectedNpc.difficulty);
    const firstSide = getSpeedOrder(player, opponent);
    state.turnCount++;

    const firstMove = firstSide === 'player' ? move : npcMove;
    const secondMove = firstSide === 'player' ? npcMove : move;

    // ── First attack ──
    const log1 = await animateAttack(state, firstSide, firstMove);
    if (log1?.defenderFainted) {
      const fSide = firstSide === 'player' ? 'npc' : 'player';
      const over = await handleFaintSequence(state, fSide);
      if (over) { finishBattle(); return; }
      if (alive.current) setWaitingForInput(true);
      return;
    }

    await delay(300);

    // ── Second attack ──
    const secondSide: 'player' | 'npc' = firstSide === 'player' ? 'npc' : 'player';
    const log2 = await animateAttack(state, secondSide, secondMove);
    if (log2?.defenderFainted) {
      const fSide = secondSide === 'player' ? 'npc' : 'player';
      const over = await handleFaintSequence(state, fSide);
      if (over) { finishBattle(); return; }
    }

    if (alive.current && state.phase !== 'finished') {
      setMessage(null);
      setWaitingForInput(true);
    }
  }, [selectedNpc]);

  // ─── Voluntary switch ──────────────────────────
  const handleVoluntarySwitch = useCallback(async (idx: number) => {
    const state = bsRef.current;
    if (!state || !selectedNpc || !alive.current) return;
    if (idx === state.playerIdx) return;
    setWaitingForInput(false);
    setMessage(null);

    const old = state.playerTeam[state.playerIdx];
    await showMessage(`${old.nickname || old.name}, 돌아와!`);
    setPlayerAnim('fainting');
    await delay(500);

    state.playerIdx = idx;
    state.turnCount++;
    const next = state.playerTeam[idx];

    await showMessage(`가랏! ${next.nickname || next.name}!`);
    setPlayerAnim('entering');
    tick();
    await delay(800);
    if (!alive.current) return;
    setPlayerAnim('idle');

    // NPC free attack
    const opp = state.opponentTeam[state.opponentIdx];
    if (opp) {
      const npcMove = chooseNpcMove(opp, next, selectedNpc.difficulty);
      const log = await animateAttack(state, 'npc', npcMove);
      if (log?.defenderFainted) {
        const over = await handleFaintSequence(state, 'player');
        if (over) { finishBattle(); return; }
        if (alive.current) setWaitingForInput(true);
        return;
      }
    }
    if (alive.current) setWaitingForInput(true);
  }, [selectedNpc, tick]);

  // ─── Finish battle ─────────────────────────────
  const finishBattle = useCallback(() => {
    const state = bsRef.current;
    if (!state || !selectedNpc) return;

    const battleRewards = calculateBattleRewards(state, originalPlayerTeam, originalOpponentTeam);
    setRewards(battleRewards);
    const won = state.winner === 'player';

    if (won) {
      addCoins(battleRewards.coins);
      grantRewards(
        battleRewards.bonusItems.filter(i => i.name === '먹이').reduce((s, i) => s + i.count, 0),
        battleRewards.exp
      );
      const expResults = grantExpToParty(battleRewards.exp);
      for (const e of expResults.filter(r => r.evolved)) {
        const sp = getPokemonById(e.evolvedTo!);
        toast.success(`${e.name}이(가) ${sp?.name}(으)로 진화했습니다!`, { icon: '✨', duration: 4000 });
      }
      for (const r of expResults.filter(r => r.levelAfter > r.levelBefore)) {
        toast(`${r.name} Lv.${r.levelBefore} → Lv.${r.levelAfter}`, { icon: '⬆️', duration: 3000 });
      }
    } else {
      if (battleRewards.coinsLost > 0) addCoins(-battleRewards.coinsLost);
    }

    const hpRatios = state.playerTeam.map(p => ({ uid: p.uid, hpRatio: p.currentHp / p.maxHp }));
    applyBattleDamage(hpRatios);
    saveBattleRecord({
      id: `battle_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      opponentName: selectedNpc.name,
      result: won ? 'win' : 'lose',
      coinsEarned: won ? battleRewards.coins : -battleRewards.coinsLost,
      expEarned: battleRewards.exp,
    });
    setPhase('result');
  }, [selectedNpc, originalPlayerTeam, originalOpponentTeam]);

  // ─── Render ─────────────────────────────────────
  const battleState = bsRef.current;

  if (phase === 'select')
    return <BattleSelect party={party} injuredCount={injuredCount} onStartBattle={startBattle} />;

  if (phase === 'intro' && selectedNpc)
    return <BattleIntro npc={selectedNpc} />;

  if (phase === 'fighting' && battleState && selectedNpc)
    return (
      <BattleFighting
        battleState={battleState}
        selectedNpc={selectedNpc}
        message={message}
        onMessageComplete={handleMessageComplete}
        waitingForInput={waitingForInput}
        waitingForSwitch={waitingForSwitch}
        playerAnim={playerAnim}
        opponentAnim={opponentAnim}
        critFlash={critFlash}
        onMoveSelect={handleMoveSelect}
        onSwitch={waitingForSwitch ? handleSwitchChoice : handleVoluntarySwitch}
      />
    );

  if (phase === 'result' && battleState && selectedNpc && rewards)
    return (
      <BattleResult
        battleState={battleState}
        selectedNpc={selectedNpc}
        rewards={rewards}
        allTurnLogs={allTurnLogs}
        party={party}
        isAiNpc={isAiNpc}
        onRematch={() => {
          setPhase('select');
          bsRef.current = null;
          setRewards(null);
          setAllTurnLogs([]);
          setWaitingForInput(false);
          setWaitingForSwitch(false);
          setMessage(null);
          setPlayerAnim('idle');
          setOpponentAnim('idle');
        }}
      />
    );

  return null;
}
