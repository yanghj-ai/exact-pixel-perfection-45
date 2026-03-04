import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPokemonById } from '@/lib/pokemon-registry';
import type { OwnedPokemon } from '@/lib/collection';

interface PartyPreviewProps {
  party: OwnedPokemon[];
}

export default function PartyPreview({ party }: PartyPreviewProps) {
  const navigate = useNavigate();

  if (party.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 mb-4">
      <button onClick={() => navigate('/party')} className="flex items-center justify-between mb-3 w-full">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-primary" />
          <span className="text-xs font-bold text-foreground">내 파티</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{party.length}/6 →</span>
      </button>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => {
          const member = party[i];
          const species = member ? getPokemonById(member.speciesId) : null;
          return (
            <div
              key={i}
              className={`flex-1 aspect-square rounded-xl flex items-center justify-center ${
                species ? 'bg-muted/60 border border-border/50' : 'bg-muted/30 border border-dashed border-border/30'
              }`}
            >
              {species ? (
                <img src={species.spriteUrl} alt={species.name} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <span className="text-muted-foreground/30 text-lg">+</span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
