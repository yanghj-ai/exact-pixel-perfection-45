import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Swords, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPokemonById } from '@/lib/pokemon-registry';
import { getEffectiveHpRatio, canBattle } from '@/lib/pokemon-health';
import { NPC_TRAINERS, type NpcTrainer } from '@/lib/npc-trainers';
import { type OwnedPokemon } from '@/lib/collection';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import PartyDetailOverlay from './PartyDetailOverlay';
import { useState } from 'react';

interface BattleSelectProps {
  party: OwnedPokemon[];
  injuredCount: number;
  onStartBattle: (npc: NpcTrainer) => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'text-heal', medium: 'text-secondary', hard: 'text-primary', elite: 'text-accent',
};
const difficultyLabels: Record<string, string> = {
  easy: '쉬움', medium: '보통', hard: '어려움', elite: '엘리트',
};

export default function BattleSelect({ party, injuredCount, onStartBattle }: BattleSelectProps) {
  const navigate = useNavigate();
  const [partyDetailPokemon, setPartyDetailPokemon] = useState<OwnedPokemon | null>(null);

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

        <AnimatePresence>
          {partyDetailPokemon && (
            <PartyDetailOverlay pokemon={partyDetailPokemon} onClose={() => setPartyDetailPokemon(null)} />
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {NPC_TRAINERS.map(npc => (
            <motion.button
              key={npc.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onStartBattle(npc)}
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
