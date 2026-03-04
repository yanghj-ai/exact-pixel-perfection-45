import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllPokemon, getPokemonById, getEvolutionChain, RARITY_CONFIG, TYPE_CONFIG, type PokemonSpecies, type PokemonType } from '@/lib/pokemon-registry';
import { getOwnedSpeciesIds, getSeenSpeciesIds, getCollection, getFriendshipLevel, getPokedex, type PokedexEntry } from '@/lib/collection';
import { getAllLearnableMoves } from '@/lib/battle-moves';
import { getAllLegendaryDefs, LEGENDARY_DEFS } from '@/lib/legendary';
import { isChallengeCompleted, CHALLENGE_DEFS } from '@/lib/challenge';
import { getGradeInfo, type PokemonGrade } from '@/lib/pokemon-grade';
import { getPokemonGrade, getGradeForPokemon } from '@/lib/spawn-data';
import { Search, ChevronRight, ArrowLeft, X, Swords, Sparkles, MapPin } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import DebugPanel from '@/components/DebugPanel';
import { useNavigate } from 'react-router-dom';

type FilterMode = 'all' | 'owned' | 'seen' | 'missing';

const TYPE_FILTERS: { type: PokemonType; label: string; emoji: string; bg: string }[] = [
  { type: 'fire', label: '불꽃', emoji: '🔥', bg: 'bg-orange-500/20' },
  { type: 'water', label: '물', emoji: '💧', bg: 'bg-blue-500/20' },
  { type: 'grass', label: '풀', emoji: '🌿', bg: 'bg-green-500/20' },
  { type: 'electric', label: '전기', emoji: '⚡', bg: 'bg-yellow-400/20' },
  { type: 'ice', label: '얼음', emoji: '❄️', bg: 'bg-cyan-300/20' },
  { type: 'psychic', label: '에스퍼', emoji: '🔮', bg: 'bg-pink-500/20' },
  { type: 'fighting', label: '격투', emoji: '🥊', bg: 'bg-red-700/20' },
  { type: 'poison', label: '독', emoji: '☠️', bg: 'bg-purple-500/20' },
  { type: 'ground', label: '땅', emoji: '🏔️', bg: 'bg-amber-700/20' },
  { type: 'flying', label: '비행', emoji: '🕊️', bg: 'bg-indigo-300/20' },
  { type: 'bug', label: '벌레', emoji: '🐛', bg: 'bg-lime-500/20' },
  { type: 'rock', label: '바위', emoji: '🪨', bg: 'bg-stone-500/20' },
  { type: 'ghost', label: '고스트', emoji: '👻', bg: 'bg-purple-800/20' },
  { type: 'dragon', label: '드래곤', emoji: '🐉', bg: 'bg-indigo-700/20' },
  { type: 'fairy', label: '페어리', emoji: '✨', bg: 'bg-pink-300/20' },
  { type: 'normal', label: '노말', emoji: '⚪', bg: 'bg-gray-400/20' },
];

export default function Pokedex() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedType, setSelectedType] = useState<PokemonType | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<PokemonGrade | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonSpecies | null>(null);

  const ownedIds = getOwnedSpeciesIds();
  const seenIds = getSeenSpeciesIds();
  const collection = getCollection();
  const pokedex = getPokedex();
  const allPokemon = getAllPokemon();
  const seenOnlyCount = Array.from(seenIds).filter(id => !ownedIds.has(id)).length;

  const filteredPokemon = useMemo(() => {
    let list = allPokemon;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.includes(q) || p.id.toString().includes(q));
    }
    if (filterMode === 'owned') list = list.filter(p => ownedIds.has(p.id));
    if (filterMode === 'seen') list = list.filter(p => seenIds.has(p.id) && !ownedIds.has(p.id));
    if (filterMode === 'missing') list = list.filter(p => !seenIds.has(p.id));
    if (selectedType) list = list.filter(p => p.types.includes(selectedType));
    if (selectedGrade) list = list.filter(p => getGradeForPokemon(p.id) === selectedGrade);
    return list;
  }, [search, filterMode, selectedType, selectedGrade, allPokemon, ownedIds, seenIds]);

  const ownedOfSpecies = (speciesId: number) => collection.owned.filter(p => p.speciesId === speciesId);
  const completionPct = Math.round((ownedIds.size / 151) * 100);
  const seenPct = Math.round((seenIds.size / 151) * 100);

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto max-w-md px-0">
        {/* ── Pokédex Shell Header ── */}
        <div className="bg-primary px-5 pt-6 pb-4 relative overflow-hidden">
          {/* Decorative circle (like the Pokédex lens) */}
          <div className="absolute -top-3 -left-3 w-14 h-14 rounded-full bg-primary-foreground/20 border-4 border-primary-foreground/30" />
          <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-accent animate-pulse" />
          
          {/* Small indicator lights */}
          <div className="absolute top-3 left-16 flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <div className="w-2.5 h-2.5 rounded-full bg-heal-green" />
          </div>

          <div className="flex items-end justify-between mt-6">
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">포켓몬 도감</h1>
              <p className="text-xs text-primary-foreground/70 mt-0.5">
                🔴 포획 {ownedIds.size} &nbsp;|&nbsp; 👁 발견 {seenIds.size} &nbsp;|&nbsp; 전체 151
              </p>
            </div>
            {/* Completion ring */}
            <div className="relative w-14 h-14">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary-foreground) / 0.2)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="3" strokeDasharray={`${completionPct}, 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-foreground">{completionPct}%</span>
            </div>
          </div>
        </div>

        {/* ── Search & Filters ── */}
        <div className="px-5 -mt-3 relative z-10">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름 또는 번호로 검색..."
              className="w-full rounded-2xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-lg"
            />
          </div>
        </div>

        <div className="px-5 mt-3">
          {/* Ownership filter */}
          <div className="flex gap-1.5 mb-3">
            {([
              { mode: 'all' as FilterMode, label: `전체 (${allPokemon.length})` },
              { mode: 'owned' as FilterMode, label: `포획 (${ownedIds.size})` },
              { mode: 'seen' as FilterMode, label: `발견 (${seenOnlyCount})` },
              { mode: 'missing' as FilterMode, label: `미발견 (${151 - seenIds.size})` },
            ]).map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                  filterMode === mode
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Grade filter */}
          <div className="flex gap-1.5 mb-3">
            {(['normal', 'rare', 'unique', 'legendary'] as PokemonGrade[]).map(g => {
              const info = getGradeInfo(g);
              const count = allPokemon.filter(p => getGradeForPokemon(p.id) === g).length;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(selectedGrade === g ? null : g)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                    selectedGrade === g
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {info.emoji} {info.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Type filter scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
            {selectedType && (
              <button
                onClick={() => setSelectedType(null)}
                className="flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] bg-destructive/20 text-destructive border border-destructive/30"
              >
                <X size={10} /> 초기화
              </button>
            )}
            {TYPE_FILTERS.map(tf => (
              <button
                key={tf.type}
                onClick={() => setSelectedType(selectedType === tf.type ? null : tf.type)}
                className={`flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
                  selectedType === tf.type
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : `${tf.bg} text-foreground border border-border/30`
                }`}
              >
                <span>{tf.emoji}</span>
                <span>{tf.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Pokémon Grid (Pokédex style) ── */}
        <div className="px-5 mt-2">
          <div className="grid grid-cols-3 gap-2">
            {filteredPokemon.map(pokemon => {
              const owned = ownedIds.has(pokemon.id);
              const seen = seenIds.has(pokemon.id);
              const rarityConf = RARITY_CONFIG[pokemon.rarity];
              const gradeInfo = getGradeInfo(getGradeForPokemon(pokemon.id));
              return (
                <motion.button
                  key={pokemon.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPokemon(pokemon)}
                  className={`relative rounded-2xl p-2.5 flex flex-col items-center gap-1 transition-all border-2 ${
                    owned
                      ? 'bg-card border-yellow-500/60 hover:border-yellow-400 hover:shadow-md shadow-yellow-500/10'
                      : seen
                      ? 'bg-card/50 border-border/30 hover:border-primary/20'
                      : 'bg-muted/30 border-border/20 opacity-40'
                  }`}
                >
                  {/* Number badge */}
                  <span className="absolute top-1.5 left-2 text-[9px] text-muted-foreground font-mono">
                    #{String(pokemon.id).padStart(3, '0')}
                  </span>

                  {/* Grade indicator */}
                  <span className="absolute top-1.5 right-2 text-[9px]" title={gradeInfo.label}>
                    {gradeInfo.emoji}
                  </span>

                  {/* Sprite */}
                  <div className="w-14 h-14 flex items-center justify-center mt-2">
                    {owned ? (
                      <img
                        src={pokemon.spriteUrl}
                        alt={pokemon.name}
                        className="w-14 h-14 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                        loading="lazy"
                      />
                    ) : seen ? (
                      <img
                        src={pokemon.spriteUrl}
                        alt={pokemon.name}
                        className="w-14 h-14 object-contain brightness-0 opacity-40"
                        style={{ imageRendering: 'pixelated' }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                        <span className="text-lg text-muted-foreground/40">?</span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <p className="text-[10px] font-medium text-foreground truncate w-full text-center">
                    {owned || seen ? pokemon.name : '???'}
                  </p>

                  {/* Type chips - show for both owned and seen */}
                  {(owned || seen) && (
                    <div className="flex gap-0.5">
                      {pokemon.types.map(t => (
                        <span key={t} className={`${TYPE_CONFIG[t].color} w-3.5 h-3.5 rounded-full flex items-center justify-center ${!owned ? 'opacity-50' : ''}`}>
                          <span className="text-[7px]">{TYPE_CONFIG[t].emoji}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Seen-only badge */}
                  {seen && !owned && (
                    <span className="text-[7px] text-accent/70 font-medium">👁 발견</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {filteredPokemon.length === 0 && (
            <div className="text-center py-16">
              <span className="text-4xl mb-3 block">🔍</span>
              <p className="text-muted-foreground text-sm">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal (Bottom Sheet) ── */}
      <AnimatePresence>
        {selectedPokemon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedPokemon(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              {(() => {
                const owned = ownedIds.has(selectedPokemon.id);
                const seen = seenIds.has(selectedPokemon.id);
                const instances = ownedOfSpecies(selectedPokemon.id);
                const rarityConf = RARITY_CONFIG[selectedPokemon.rarity];
                const evoChain = getEvolutionChain(selectedPokemon.id);
                const pdxEntry = pokedex[selectedPokemon.id];

                return (
                  <>
                    {/* Header with type-colored background */}
                    <div className={`relative px-6 pt-6 pb-12 ${(owned || seen) ? TYPE_CONFIG[selectedPokemon.types[0]].color : 'bg-muted'}`}>
                      <button onClick={() => setSelectedPokemon(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
                        <X size={16} className="text-white" />
                      </button>
                      <div className="flex items-center gap-2">
                        <p className="text-white/70 text-xs font-mono">#{String(selectedPokemon.id).padStart(3, '0')}</p>
                        {seen && !owned && (
                          <span className="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full">👁 발견만</span>
                        )}
                        {owned && (
                          <span className="bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full">🔴 포획</span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-white mt-0.5">
                        {owned || seen ? selectedPokemon.name : '???'}
                      </h2>
                      {(owned || seen) && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {selectedPokemon.types.map(t => (
                            <span key={t} className="bg-white/20 text-white text-[10px] px-2.5 py-0.5 rounded-full font-medium backdrop-blur-sm">
                              {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
                            </span>
                          ))}
                          {owned && (
                            <span className="bg-white/20 text-white text-[10px] px-2.5 py-0.5 rounded-full font-medium">
                              {rarityConf.emoji} {rarityConf.label}
                            </span>
                          )}
                          {(() => {
                            const gi = getGradeInfo(getGradeForPokemon(selectedPokemon.id));
                            return (
                              <span className="bg-white/20 text-white text-[10px] px-2.5 py-0.5 rounded-full font-medium">
                                {gi.emoji} {gi.label}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Sprite floating over header */}
                    <div className="flex justify-center -mt-10 relative z-10 mb-4">
                      {owned ? (
                        <motion.div
                          className="w-24 h-24 rounded-2xl bg-card border-2 border-yellow-500/60 shadow-xl shadow-yellow-500/10 flex items-center justify-center"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                        >
                          <img
                            src={selectedPokemon.spriteUrl}
                            alt={selectedPokemon.name}
                            className="w-20 h-20 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </motion.div>
                      ) : seen ? (
                        <div className="w-24 h-24 rounded-2xl bg-card border-2 border-border shadow-xl flex items-center justify-center">
                          <img
                            src={selectedPokemon.spriteUrl}
                            alt={selectedPokemon.name}
                            className="w-20 h-20 object-contain brightness-0 opacity-50"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-muted border-2 border-border shadow-xl flex items-center justify-center">
                          <span className="text-4xl text-muted-foreground/40">?</span>
                        </div>
                      )}
                    </div>

                    <div className="px-6 pb-8 space-y-4">
                       {/* Description - for owned and seen */}
                       {(owned || seen) && (
                         <p className="text-xs text-muted-foreground text-center leading-relaxed">
                           {selectedPokemon.description}
                         </p>
                       )}

                       {/* Encounter Condition / Grade Info */}
                       {(owned || seen) && (() => {
                         const gradeEntry = getPokemonGrade(selectedPokemon.id);
                         if (!gradeEntry) return null;
                         const gi = getGradeInfo(gradeEntry.grade);
                         const cond = gradeEntry.wildCondition;
                         return (
                           <div className="glass-card p-3">
                             <div className="flex items-center gap-1.5 mb-2">
                               <MapPin size={12} className="text-primary" />
                               <p className="text-[10px] text-muted-foreground font-semibold">조우 조건</p>
                               <span className="ml-auto text-[10px] font-bold" style={{ color: gi.color }}>
                                 {gi.emoji} {gi.label} 등급
                               </span>
                             </div>
                             {cond ? (
                               <div className="space-y-1">
                                 {cond.minDistanceKm != null && (
                                   <div className="flex items-center gap-2 text-[11px] text-foreground">
                                     <span>🏃</span>
                                     <span>최소 거리: <strong>{cond.minDistanceKm}km</strong></span>
                                   </div>
                                 )}
                                 {cond.maxPaceMinPerKm != null && (
                                   <div className="flex items-center gap-2 text-[11px] text-foreground">
                                     <span>⏱️</span>
                                     <span>최대 페이스: <strong>{cond.maxPaceMinPerKm}분/km</strong></span>
                                   </div>
                                 )}
                                 {cond.minStreakDays != null && (
                                   <div className="flex items-center gap-2 text-[11px] text-foreground">
                                     <span>🔥</span>
                                     <span>연속 러닝: <strong>{cond.minStreakDays}일</strong></span>
                                   </div>
                                 )}
                                 {cond.minTotalKm != null && (
                                   <div className="flex items-center gap-2 text-[11px] text-foreground">
                                     <span>📏</span>
                                     <span>누적 거리: <strong>{cond.minTotalKm}km</strong></span>
                                   </div>
                                 )}
                                 {cond.timeWindow && (
                                   <div className="flex items-center gap-2 text-[11px] text-foreground">
                                     <span>🌙</span>
                                     <span>시간대: <strong>{cond.timeWindow[0]}시~{cond.timeWindow[1]}시</strong></span>
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <p className="text-[11px] text-muted-foreground">
                                 {gradeEntry.evolveMethod
                                   ? `🔄 ${gradeEntry.evolveMethod}`
                                   : '야생에서 만날 수 없음'}
                               </p>
                             )}
                           </div>
                         );
                       })()}

                       {/* Discovery info from pokedex */}
                       {pdxEntry && (pdxEntry.firstDiscoveredAt || pdxEntry.firstOwnedAt) && (
                         <div className="glass-card p-3">
                           <p className="text-[10px] text-muted-foreground font-semibold mb-2">📋 도감 정보</p>
                           <div className="space-y-1">
                             {pdxEntry.firstDiscoveredAt && (
                               <div className="flex justify-between text-[11px]">
                                 <span className="text-muted-foreground">최초 발견</span>
                                 <span className="text-foreground font-medium">{pdxEntry.firstDiscoveredAt}</span>
                               </div>
                             )}
                             {pdxEntry.firstDiscoveredLocation && (
                               <div className="flex justify-between text-[11px]">
                                 <span className="text-muted-foreground">발견 경로</span>
                                 <span className="text-foreground font-medium">{pdxEntry.firstDiscoveredLocation}</span>
                               </div>
                             )}
                             {pdxEntry.firstOwnedAt && (
                               <div className="flex justify-between text-[11px]">
                                 <span className="text-muted-foreground">최초 포획</span>
                                 <span className="text-foreground font-medium">{pdxEntry.firstOwnedAt}</span>
                               </div>
                             )}
                             <div className="flex justify-between text-[11px]">
                               <span className="text-muted-foreground">상태</span>
                               <span className={`font-bold ${owned ? 'text-yellow-500' : 'text-accent'}`}>
                                 {owned ? '🔴 포획 완료' : '👁 발견만'}
                               </span>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* Seen but not owned badge */}
                       {seen && !owned && (
                          <div className="text-center">
                             <span className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs px-3 py-1.5 rounded-full font-medium">
                               👁 배틀에서 조우 — 포획하면 더 많은 정보 확인 가능
                             </span>
                           </div>
                        )}

                       {/* Unknown — show hint for legendary/event */}
                       {!seen && !owned && (() => {
                         const legendaryDefs = getAllLegendaryDefs();
                         const legendaryDef = legendaryDefs.find(d => d.speciesId === selectedPokemon.id);

                         if (legendaryDef) {
                           const challengeStatus = legendaryDef.speciesId === 151
                             ? []
                             : legendaryDef.requiredChallenges.map(id => ({
                                 id,
                                 name: CHALLENGE_DEFS.find(d => d.id === id)?.name ?? id,
                                 done: isChallengeCompleted(id),
                               }));

                           return (
                             <div className="text-center py-4 space-y-2">
                               <span className="text-3xl mb-2 block">🌟</span>
                               <p className="text-sm font-semibold text-foreground">전설의 포켓몬</p>
                               <div className="glass-card p-3 text-left space-y-2">
                                 <div className="flex items-center gap-1.5 mb-1">
                                   <Sparkles size={12} className="text-secondary" />
                                   <span className="text-[10px] font-bold text-secondary">해금 조건</span>
                                 </div>
                                 <p className="text-xs text-muted-foreground">{legendaryDef.encounterCondition}</p>
                                 {challengeStatus.length > 0 && (
                                   <div className="flex flex-wrap gap-1 mt-1">
                                     {challengeStatus.map(cs => (
                                       <span key={cs.id} className={`text-[9px] px-1.5 py-0.5 rounded-full ${cs.done ? 'bg-secondary/20 text-secondary' : 'bg-muted text-muted-foreground'}`}>
                                         {cs.done ? '✅' : '🔒'} {cs.name}
                                       </span>
                                     ))}
                                   </div>
                                 )}
                                 <div className="mt-2 pt-2 border-t border-border/30">
                                   <p className="text-[10px] text-muted-foreground font-semibold">포획 미션</p>
                                   <p className="text-xs text-foreground">{legendaryDef.mission.label}: {legendaryDef.mission.description}</p>
                                 </div>
                               </div>
                               <p className="text-xs text-muted-foreground/70 italic mt-2">💬 "{legendaryDef.encounterHint}"</p>
                             </div>
                           );
                         }

                         return (
                           <div className="text-center py-4">
                             <span className="text-3xl mb-2 block">🔒</span>
                             <p className="text-sm text-muted-foreground">아직 발견하지 못한 포켓몬</p>
                             <p className="text-xs text-muted-foreground/70 mt-1">배틀이나 런닝에서 만나보세요!</p>
                           </div>
                         );
                       })()}

                       {/* Learnable Moves */}
                       {(owned || seen) && (() => {
                         const moves = getAllLearnableMoves(selectedPokemon.types);
                         return moves.length > 0 ? (
                           <div className="glass-card p-3">
                             <div className="flex items-center gap-1.5 mb-2">
                               <Swords size={12} className="text-primary" />
                               <p className="text-[10px] text-muted-foreground font-semibold">습득 가능 기술</p>
                             </div>
                             <div className="space-y-1.5">
                               {moves.map(move => (
                                 <div key={move.name} className="flex items-center justify-between py-1 px-2 rounded-lg bg-muted/30">
                                   <div className="flex items-center gap-2">
                                     <span className="text-sm">{move.emoji}</span>
                                     <div>
                                       <span className="text-[11px] font-medium text-foreground">{move.name}</span>
                                       <span className="text-[9px] text-muted-foreground ml-1.5">{TYPE_CONFIG[move.type]?.emoji} {TYPE_CONFIG[move.type]?.label}</span>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                                     <span>위력 {move.power}</span>
                                     <span>명중 {move.accuracy}</span>
                                     <span className="text-primary font-semibold">Lv.{move.learnLevel}</span>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         ) : null;
                       })()}


                      {/* Evolution Chain */}
                      {(owned || seen) && evoChain.length > 1 && (
                        <div className="glass-card p-3">
                          <p className="text-[10px] text-muted-foreground font-semibold mb-2">진화 체인</p>
                          <div className="flex items-center justify-center gap-1">
                            {evoChain.map((evo, i) => {
                              const evoOwned = ownedIds.has(evo.id);
                              const evoSeen = seenIds.has(evo.id);
                              return (
                                <div key={evo.id} className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSelectedPokemon(evo)}
                                    className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${
                                      evo.id === selectedPokemon.id ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-muted/50'
                                    }`}
                                  >
                                    {evoOwned ? (
                                      <img src={evo.spriteUrl} alt={evo.name} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                                    ) : evoSeen ? (
                                      <img src={evo.spriteUrl} alt={evo.name} className="w-10 h-10 object-contain brightness-0 opacity-40" style={{ imageRendering: 'pixelated' }} />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                        <span className="text-sm text-muted-foreground/40">?</span>
                                      </div>
                                    )}
                                    <span className="text-[8px] text-muted-foreground mt-0.5">{evoOwned || evoSeen ? evo.name : '???'}</span>
                                    {evo.evolveLevel && (
                                      <span className="text-[7px] text-primary/70">Lv.{evo.evolveLevel}</span>
                                    )}
                                  </button>
                                  {i < evoChain.length - 1 && (
                                    <ChevronRight size={12} className="text-muted-foreground/40 flex-shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Owned instances */}
                      {owned && instances.length > 0 && (
                        <div className="glass-card p-3">
                          <p className="text-[10px] text-muted-foreground font-semibold mb-2">보유 중 ({instances.length}마리)</p>
                          <div className="space-y-1.5">
                            {instances.map(inst => {
                              const fl = getFriendshipLevel(inst.friendship);
                              return (
                                <div key={inst.uid} className="flex items-center justify-between py-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{fl.emoji}</span>
                                    <div>
                                      <span className="text-xs text-foreground font-medium">{inst.nickname || selectedPokemon.name}</span>
                                      <span className="text-[10px] text-muted-foreground ml-1.5">Lv.{inst.level}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-muted-foreground">{fl.label}</span>
                                    <div className="h-1 w-12 rounded-full bg-muted overflow-hidden mt-0.5">
                                      <div className="h-full rounded-full bg-primary" style={{ width: `${(inst.friendship / 255) * 100}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-md px-5 pb-4">
        <DebugPanel />
      </div>
      <BottomNav />
    </div>
  );
}
