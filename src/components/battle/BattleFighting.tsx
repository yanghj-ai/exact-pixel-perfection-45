import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type BattleMove } from '@/lib/battle-moves';
import { type TurnBasedBattleState, getEffectiveness } from '@/lib/battle';
import { type NpcTrainer } from '@/lib/npc-trainers';
import { getSkillState, getSkillLevelLabel, getEffectiveMove, findMoveKey } from '@/lib/skill-system';
import BattleMessageBox from './BattleMessageBox';

export type SpriteAnim = 'idle' | 'attacking' | 'hit' | 'fainting' | 'entering' | 'fainted';

interface BattleFightingProps {
  battleState: TurnBasedBattleState;
  selectedNpc: NpcTrainer;
  message: string | null;
  onMessageComplete: () => void;
  waitingForInput: boolean;
  waitingForSwitch: boolean;
  playerAnim: SpriteAnim;
  opponentAnim: SpriteAnim;
  critFlash: boolean;
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

function getSpriteAnimate(anim: SpriteAnim, side: 'player' | 'opponent') {
  switch (anim) {
    case 'attacking':
      return side === 'player'
        ? { x: [0, 15, 0], transition: { duration: 0.3 } }
        : { x: [0, -15, 0], transition: { duration: 0.3 } };
    case 'hit':
      return { x: [0, -6, 6, -3, 0], opacity: [1, 0.3, 1, 0.3, 1], transition: { duration: 0.35 } };
    case 'fainting':
      return { y: 30, opacity: 0, transition: { duration: 0.5 } };
    case 'entering':
      return { y: [30, 0], opacity: [0, 1], transition: { duration: 0.6, ease: 'easeOut' as const } };
    case 'fainted':
      return { y: 30, opacity: 0, transition: { duration: 0 } };
    default:
      return { x: 0, y: 0, opacity: 1, transition: { duration: 0.2 } };
  }
}

function HpBar({ current, max }: { current: number; max: number }) {
  const ratio = Math.max(0, current / max);
  const color = ratio > 0.5 ? 'hsl(var(--heal-green))' : ratio > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))';
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={false}
        animate={{ width: `${ratio * 100}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function BattleFighting({
  battleState, selectedNpc, message, onMessageComplete,
  waitingForInput, waitingForSwitch,
  playerAnim, opponentAnim, critFlash,
  onMoveSelect, onSwitch,
}: BattleFightingProps) {
  const [showSwitchPanel, setShowSwitchPanel] = useState(false);

  const player = battleState.playerTeam[battleState.playerIdx];
  const opponent = battleState.opponentTeam[battleState.opponentIdx];

  const playerMoves = player?.moves || [];

  const getEffLabel = (move: BattleMove) => {
    if (!opponent) return null;
    const eff = getEffectiveness(move.type, opponent.types);
    if (eff >= 2) return { label: '효과적!', color: 'text-heal' };
    if (eff === 0) return { label: '무효!', color: 'text-muted-foreground' };
    if (eff < 1) return { label: '비효과', color: 'text-muted-foreground' };
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Critical flash overlay */}
      <AnimatePresence>
        {critFlash && (
          <motion.div
            key="crit-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-md w-full px-5 pt-6 flex-1 flex flex-col">
        {/* ── Opponent info ── */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-foreground">{opponent?.nickname || opponent?.name || '???'}</p>
              <p className="text-[10px] text-muted-foreground">Lv.{opponent?.level || 0}</p>
              {opponent?.types.map(t => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{t}</span>
              ))}
            </div>
            {opponent && <HpBar current={opponent.currentHp} max={opponent.maxHp} />}
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

        {/* ── Battle field ── */}
        <div className="relative flex-1 min-h-[180px] flex items-center justify-between px-4">
          <div />
          {opponent && (
            <motion.div
              key={`opp-${opponent.uid}`}
              animate={getSpriteAnimate(opponentAnim, 'opponent')}
            >
              <img src={opponent.spriteUrl} alt={opponent.name} className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} />
            </motion.div>
          )}
          {player && (
            <motion.div
              key={`plr-${player.uid}`}
              className="absolute bottom-4 left-4"
              animate={getSpriteAnimate(playerAnim, 'player')}
            >
              <img src={player.spriteUrl} alt={player.name} className="w-20 h-20 object-contain" style={{ imageRendering: 'pixelated' }} />
            </motion.div>
          )}
        </div>

        {/* ── Player HP ── */}
        <div className="flex items-center gap-3 mt-2 mb-2">
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <p className="text-[10px] text-muted-foreground">Lv.{player?.level || 0}</p>
              <p className="text-xs font-bold text-foreground">{player?.nickname || player?.name || '???'}</p>
            </div>
            {player && <HpBar current={player.currentHp} max={player.maxHp} />}
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

        {/* ── Message Box ── */}
        <div className="mb-3">
          {message ? (
            <BattleMessageBox message={message} onComplete={onMessageComplete} />
          ) : waitingForInput ? (
            <div className="bg-black/80 text-white rounded-xl px-4 py-3 min-h-[56px] flex items-center">
              <p className="text-sm text-white/70">⚔️ 기술을 선택하세요!</p>
            </div>
          ) : waitingForSwitch ? (
            <div className="bg-black/80 text-white rounded-xl px-4 py-3 min-h-[56px] flex items-center">
              <p className="text-sm text-white/70">🔄 다음 포켓몬을 선택하세요!</p>
            </div>
          ) : (
            <div className="bg-black/80 rounded-xl px-4 py-3 min-h-[56px] flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-white/50">배틀 진행 중...</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Forced switch after faint ── */}
        {waitingForSwitch && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mb-4">
            {battleState.playerTeam.map((p, idx) => {
              const isFainted = p.currentHp <= 0;
              if (isFainted) return null;
              const hpRatio = p.currentHp / p.maxHp;
              return (
                <motion.button
                  key={p.uid}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSwitch(idx)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/80 hover:border-secondary/40 transition-colors text-left"
                >
                  <img src={p.spriteUrl} alt={p.name} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{p.nickname || p.name}</span>
                      <span className="text-[10px] text-muted-foreground">Lv.{p.level}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{
                        width: `${hpRatio * 100}%`,
                        background: hpRatio > 0.5 ? 'hsl(var(--heal-green))' : hpRatio > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))',
                      }} />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground whitespace-nowrap">{p.currentHp}/{p.maxHp}</p>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* ── Move selection (normal turn) ── */}
        {waitingForInput && !waitingForSwitch && player && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {battleState.playerTeam.filter(p => p.currentHp > 0).length > 1 && (
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setShowSwitchPanel(false)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${!showSwitchPanel ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted/50 text-muted-foreground'}`}
                >⚔️ 기술</button>
                <button
                  onClick={() => setShowSwitchPanel(true)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${showSwitchPanel ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-muted/50 text-muted-foreground'}`}
                >🔄 교체</button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {!showSwitchPanel ? (
                <motion.div key="moves" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-2 mb-4">
                  {playerMoves.map((move, i) => {
                    const effInfo = getEffLabel(move);
                    const typeColor = TYPE_COLORS[move.type] || TYPE_COLORS.normal;
                    const moveKey = findMoveKey(move);
                    const skillState = getSkillState(player.uid, moveKey);
                    const skillLabel = getSkillLevelLabel(skillState.skillLevel);
                    const effective = getEffectiveMove(move, player.uid);
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
                          {skillState.skillLevel > 1 && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full bg-black/20 font-bold ${skillLabel.color}`}>
                              {skillLabel.emoji}{skillLabel.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9px]">
                          <span className="text-muted-foreground">
                            위력 {effective.power}
                            {effective.power > move.power && <span className="text-accent ml-0.5">(+{effective.power - move.power})</span>}
                          </span>
                          <span className="text-muted-foreground">
                            명중 {effective.accuracy}
                            {effective.accuracy > move.accuracy && <span className="text-accent ml-0.5">(+{effective.accuracy - move.accuracy})</span>}
                          </span>
                        </div>
                        {effInfo && <p className={`text-[9px] font-bold mt-1 ${effInfo.color}`}>{effInfo.label}</p>}
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
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${Math.max(0, hpRatio * 100)}%`,
                              background: hpRatio > 0.5 ? 'hsl(var(--heal-green))' : hpRatio > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))',
                            }} />
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
      </div>
    </div>
  );
}
