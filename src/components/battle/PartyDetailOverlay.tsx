import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { getPokemonById, RARITY_CONFIG, TYPE_CONFIG } from '@/lib/pokemon-registry';
import { getPokemonHabitats } from '@/lib/pokemon-habitat';
import { getFriendshipLevel, type OwnedPokemon } from '@/lib/collection';
import { getEffectiveHpRatio } from '@/lib/pokemon-health';

interface PartyDetailOverlayProps {
  pokemon: OwnedPokemon;
  onClose: () => void;
}

export default function PartyDetailOverlay({ pokemon, onClose }: PartyDetailOverlayProps) {
  const detailSpecies = getPokemonById(pokemon.speciesId);
  const detailFriendship = getFriendshipLevel(pokemon.friendship);
  const detailHabitats = detailSpecies ? getPokemonHabitats(pokemon.speciesId, detailSpecies.types) : [];
  const detailHpRatio = getEffectiveHpRatio(pokemon.uid);
  if (!detailSpecies) return null;

  return (
    <motion.div
      key="party-detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[340px] bg-card rounded-2xl border border-border/60 overflow-hidden max-h-[80vh] overflow-y-auto"
      >
        <div className="relative pt-5 pb-3 px-5 text-center">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground">
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
            {pokemon.nickname || detailSpecies.name}
          </p>
          {pokemon.nickname && (
            <p className="text-[10px] text-muted-foreground">{detailSpecies.name}</p>
          )}
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="glass-card p-1.5 rounded-lg">
              <p className="text-[9px] text-muted-foreground">레벨</p>
              <p className="text-xs font-bold text-foreground">{pokemon.level}</p>
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

          <div className="flex gap-1.5">
            {detailSpecies.types.map(t => (
              <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full text-white ${TYPE_CONFIG[t].color}`}>
                {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
              </span>
            ))}
          </div>

          <div className="glass-card p-2.5 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-foreground">❤️ 친밀도</span>
              <span className="text-[10px] text-foreground">{detailFriendship.emoji} {detailFriendship.label}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full gradient-primary" style={{ width: `${(pokemon.friendship / 255) * 100}%` }} />
            </div>
            <p className="text-[8px] text-muted-foreground mt-0.5 text-right">{pokemon.friendship}/255</p>
          </div>

          {detailSpecies.description && (
            <p className="text-[10px] text-muted-foreground leading-relaxed glass-card p-2.5 rounded-lg">
              📖 {detailSpecies.description}
            </p>
          )}

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
}
