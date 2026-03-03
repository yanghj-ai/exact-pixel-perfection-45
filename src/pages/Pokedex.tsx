import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllPokemon, getPokemonById, RARITY_CONFIG, TYPE_CONFIG, type PokemonSpecies, type Rarity } from '@/lib/pokemon-registry';
import { getOwnedSpeciesIds, getCollection, getFriendshipLevel } from '@/lib/collection';
import { Search, Filter } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

type FilterMode = 'all' | 'owned' | 'missing';

export default function Pokedex() {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonSpecies | null>(null);

  const ownedIds = getOwnedSpeciesIds();
  const collection = getCollection();
  const allPokemon = getAllPokemon();

  const filteredPokemon = useMemo(() => {
    let list = allPokemon;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.includes(q) || p.id.toString().includes(q));
    }

    if (filterMode === 'owned') list = list.filter(p => ownedIds.has(p.id));
    if (filterMode === 'missing') list = list.filter(p => !ownedIds.has(p.id));

    if (selectedType) list = list.filter(p => p.types.includes(selectedType as any));

    return list;
  }, [search, filterMode, selectedType, allPokemon, ownedIds]);

  const ownedOfSpecies = (speciesId: number) => collection.owned.filter(p => p.speciesId === speciesId);

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">포켓몬 도감</h1>
            <p className="text-xs text-muted-foreground">{ownedIds.size} / 151 발견</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full gradient-primary px-3 py-1">
            <span className="text-xs font-bold text-primary-foreground">{Math.round((ownedIds.size / 151) * 100)}%</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="포켓몬 이름 또는 번호 검색..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'owned', 'missing'] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterMode === mode ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {mode === 'all' ? '전체' : mode === 'owned' ? '보유' : '미발견'}
            </button>
          ))}
        </div>

        {/* Pokemon Grid */}
        <div className="grid grid-cols-4 gap-2">
          {filteredPokemon.map(pokemon => {
            const owned = ownedIds.has(pokemon.id);
            const rarityConf = RARITY_CONFIG[pokemon.rarity];
            return (
              <motion.button
                key={pokemon.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => setSelectedPokemon(pokemon)}
                className={`glass-card p-2 flex flex-col items-center gap-1 transition-all ${
                  owned ? 'hover:border-primary/30' : 'opacity-40 grayscale'
                }`}
              >
                <div className="relative w-full aspect-square flex items-center justify-center">
                  {owned ? (
                    <img
                      src={pokemon.spriteUrl}
                      alt={pokemon.name}
                      className="w-12 h-12 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-2xl">❓</span>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground">#{String(pokemon.id).padStart(3, '0')}</p>
                <p className="text-[10px] font-medium text-foreground truncate w-full text-center">
                  {owned ? pokemon.name : '???'}
                </p>
              </motion.button>
            );
          })}
        </div>

        {filteredPokemon.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">검색 결과가 없습니다</p>
          </div>
        )}
      </div>

      {/* Pokemon Detail Modal */}
      <AnimatePresence>
        {selectedPokemon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedPokemon(null)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-10 border-t border-border"
            >
              {(() => {
                const owned = ownedIds.has(selectedPokemon.id);
                const instances = ownedOfSpecies(selectedPokemon.id);
                const rarityConf = RARITY_CONFIG[selectedPokemon.rarity];

                return (
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      {owned ? (
                        <motion.img
                          src={selectedPokemon.spriteUrl}
                          alt={selectedPokemon.name}
                          className="w-24 h-24 object-contain"
                          style={{ imageRendering: 'pixelated' }}
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center">
                          <span className="text-5xl">❓</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">#{String(selectedPokemon.id).padStart(3, '0')}</span>
                      <h2 className="text-lg font-bold text-foreground">
                        {owned ? selectedPokemon.name : '???'}
                      </h2>
                    </div>

                    {owned && (
                      <>
                        <div className="flex gap-1.5 justify-center mb-3">
                          {selectedPokemon.types.map(t => {
                            const typeConf = TYPE_CONFIG[t];
                            return (
                              <span key={t} className={`${typeConf.color} text-white text-[10px] px-2 py-0.5 rounded-full`}>
                                {typeConf.emoji} {typeConf.label}
                              </span>
                            );
                          })}
                          <span className={`${rarityConf.bgColor} ${rarityConf.color} text-[10px] px-2 py-0.5 rounded-full`}>
                            {rarityConf.emoji} {rarityConf.label}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground mb-4">{selectedPokemon.description}</p>

                        {instances.length > 0 && (
                          <div className="glass-card p-3 text-left space-y-2">
                            <p className="text-[10px] text-muted-foreground font-medium">보유 중 ({instances.length}마리)</p>
                            {instances.map(inst => {
                              const fl = getFriendshipLevel(inst.friendship);
                              return (
                                <div key={inst.uid} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{fl.emoji}</span>
                                    <span className="text-xs text-foreground">{inst.nickname || selectedPokemon.name}</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">{fl.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {!owned && (
                      <p className="text-xs text-muted-foreground">아직 발견하지 못한 포켓몬입니다.<br/>런닝을 통해 만나보세요!</p>
                    )}

                    <button
                      onClick={() => setSelectedPokemon(null)}
                      className="mt-5 w-full rounded-xl bg-muted py-2.5 text-sm font-medium text-foreground"
                    >
                      닫기
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
