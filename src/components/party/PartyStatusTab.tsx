// FIX #6: 파티 상태 탭
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { type OwnedPokemon, getFriendshipLevel } from '@/lib/collection';
import { getPokemonById, RARITY_CONFIG, TYPE_CONFIG } from '@/lib/pokemon-registry';
import { getEffectiveHpRatio } from '@/lib/pokemon-health';
import { getConditionState, getConditionLevel, getConditionEmoji } from '@/lib/pokemon-condition';
import { getUnlockedMoves, getSkillState, getSkillLevelLabel, findMoveKey } from '@/lib/skill-system';

interface PartyStatusTabProps {
  pokemon: OwnedPokemon;
}

export default function PartyStatusTab({ pokemon }: PartyStatusTabProps) {
  const species = getPokemonById(pokemon.speciesId);
  if (!species) return null;

  const friendship = getFriendshipLevel(pokemon.friendship);
  const hpRatio = getEffectiveHpRatio(pokemon.uid);
  const condition = getConditionState();
  const condLevel = getConditionLevel(condition.condition);
  const unlockedMoves = getUnlockedMoves(pokemon.speciesId, pokemon.level);

  return (
    <div className="space-y-4 p-4">
      {/* Sprite + basic info */}
      <div className="flex items-center gap-4">
        <motion.img
          src={species.spriteUrl}
          alt={species.name}
          className="w-20 h-20 object-contain"
          style={{ imageRendering: 'pixelated' }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="flex-1">
          <p className="text-base font-bold text-foreground">{pokemon.nickname || species.name}</p>
          <div className="flex gap-1.5 mt-1">
            {species.types.map(t => (
              <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full text-white ${TYPE_CONFIG[t].color}`}>
                {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>Lv.{pokemon.level}</span>
            <span className={RARITY_CONFIG[species.rarity].color}>{RARITY_CONFIG[species.rarity].label}</span>
          </div>
        </div>
      </div>

      {/* HP Bar */}
      <div className="glass-card p-3 rounded-xl">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-foreground">❤️ HP</span>
          <span className="text-[10px] text-muted-foreground">{Math.round(hpRatio * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: hpRatio > 0.5 ? 'hsl(var(--heal-green))' : hpRatio > 0.2 ? 'hsl(var(--amber))' : 'hsl(var(--destructive))' }}
            initial={false}
            animate={{ width: `${hpRatio * 100}%` }}
          />
        </div>
      </div>

      {/* EXP Bar */}
      <div className="glass-card p-3 rounded-xl">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-foreground">⚡ EXP</span>
          <span className="text-[10px] text-muted-foreground">Lv.{pokemon.level}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-accent" style={{ width: '30%' }} />
        </div>
      </div>

      {/* Condition */}
      <div className="glass-card p-3 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">{getConditionEmoji(condLevel)} 컨디션</span>
          <span className="text-xs text-foreground">{Math.round(condition.condition)}/100</span>
        </div>
      </div>

      {/* v9: 친밀도 바 제거 — 컨디션 단일 통합 */}

      {/* Skills */}
      <div className="glass-card p-3 rounded-xl">
        <p className="text-xs font-semibold text-foreground mb-2">⚔️ 기술 ({unlockedMoves.length}개 해금)</p>
        <div className="space-y-2">
          {unlockedMoves.map(move => {
            const moveKey = findMoveKey(move);
            const skill = getSkillState(pokemon.uid, moveKey);
            const levelInfo = getSkillLevelLabel(skill.skillLevel);
            return (
              <div key={move.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <span className="text-sm">{move.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-foreground">{move.name}</span>
                    {skill.skillLevel > 1 && (
                      <span className={`text-[9px] font-bold ${levelInfo.color}`}>{levelInfo.emoji}{levelInfo.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span>위력 {move.power}</span>
                    <span>명중 {move.accuracy}</span>
                    <span>사용 {skill.usageCount}회</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
