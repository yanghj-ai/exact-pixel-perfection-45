import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCollection, getParty, addToParty, removeFromParty,
  getFriendshipLevel, interactWithPokemon, feedPokemon,
  setNickname, setAsLeader, reorderParty, type OwnedPokemon,
} from '@/lib/collection';
import { getPet } from '@/lib/pet';
import { getPokemonById, RARITY_CONFIG, TYPE_CONFIG } from '@/lib/pokemon-registry';
import { getPokemonHabitats } from '@/lib/pokemon-habitat';
import { ArrowLeft, Heart, Apple, Edit3, ArrowRightLeft, X, Check, Sparkles, Crown, ArrowUp, ArrowDown, Package, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { getInventory, SHOP_ITEMS, useRareCandy, useEvolutionStone } from '@/lib/shop';
import { healSingle, getEffectiveHpRatio } from '@/lib/pokemon-health';
import BottomNav from '@/components/BottomNav';
import DebugPanel from '@/components/DebugPanel';
import ItemEffectOverlay, { type ItemEffectData } from '@/components/ItemEffectOverlay';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated';

export default function Party() {
  const navigate = useNavigate();
  const pet = getPet();
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate(v => v + 1), []);

  const party = getParty();
  const collection = getCollection();
  const boxPokemon = collection.owned.filter(p => !p.isInParty);

  // Detail modal
  const [selected, setSelected] = useState<OwnedPokemon | null>(null);
  // Swap modal
  const [showSwap, setShowSwap] = useState(false);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  // Nickname edit
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  // Interaction cooldown
  const [interactCooldown, setInteractCooldown] = useState<Set<string>>(new Set());
  // Item menu for leader
  const [showItemMenu, setShowItemMenu] = useState(false);
  // Item effect overlay
  const [itemEffect, setItemEffect] = useState<ItemEffectData | null>(null);

  const handleInteract = useCallback((uid: string) => {
    if (interactCooldown.has(uid)) {
      toast('잠시 후에 다시 교감해주세요!');
      return;
    }
    try {
      const { message } = interactWithPokemon(uid);
      toast(message, { icon: '💕' });
      setInteractCooldown(prev => new Set(prev).add(uid));
      setTimeout(() => {
        setInteractCooldown(prev => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      }, 3000);
      refresh();
      // refresh selected
      const updated = getCollection().owned.find(p => p.uid === uid);
      if (updated) setSelected(updated);
    } catch { /* ignore */ }
  }, [interactCooldown, refresh]);

  const handleFeed = useCallback((uid: string) => {
    const result = feedPokemon(uid, pet.foodCount);
    if (!result) {
      toast('먹이가 없어요!', { description: '런닝으로 먹이를 획득하세요 🍎' });
      return;
    }
    toast('🍎 먹이를 줬어요!', { description: '친밀도가 올랐습니다!' });
    refresh();
    const updated = getCollection().owned.find(p => p.uid === uid);
    if (updated) setSelected(updated);
  }, [pet.foodCount, refresh]);

  const handleSwap = useCallback((boxUid: string) => {
    if (swapTarget) {
      removeFromParty(swapTarget);
      addToParty(boxUid);
      toast('파티 멤버를 교체했어요!', { icon: '🔄' });
    } else {
      if (party.length < 6) {
        addToParty(boxUid);
        toast('파티에 추가했어요!', { icon: '✨' });
      }
    }
    setShowSwap(false);
    setSwapTarget(null);
    refresh();
  }, [swapTarget, party.length, refresh]);

  const handleRemoveFromParty = useCallback((uid: string) => {
    if (!removeFromParty(uid)) {
      toast('파티에는 최소 1마리가 필요합니다!');
      return;
    }
    toast('파티에서 제외했어요');
    setSelected(null);
    refresh();
  }, [refresh]);

  const handleSaveNickname = useCallback(() => {
    if (selected) {
      setNickname(selected.uid, nicknameValue.trim());
      toast(nicknameValue.trim() ? `닉네임을 "${nicknameValue.trim()}"(으)로 변경했어요!` : '닉네임을 초기화했어요');
      setEditingNickname(false);
      const updated = getCollection().owned.find(p => p.uid === selected.uid);
      if (updated) setSelected(updated);
      refresh();
    }
  }, [selected, nicknameValue, refresh]);

  const selectedSpecies = selected ? getPokemonById(selected.speciesId) : null;
  const selectedFriendship = selected ? getFriendshipLevel(selected.friendship) : null;

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card/80 border border-border/50">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">파티 관리</h1>
            <p className="text-xs text-muted-foreground">포켓몬을 관리하고 교감하세요</p>
          </div>
        </div>

        {/* Party Slots */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-foreground">내 파티</span>
            <span className="text-xs text-muted-foreground">{party.length}/6</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => {
              const member = party[i];
              const species = member ? getPokemonById(member.speciesId) : null;
              const friendship = member ? getFriendshipLevel(member.friendship) : null;
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (member) {
                      setSelected(member);
                    }
                  }}
                  className={`relative glass-card p-3 flex flex-col items-center gap-1 min-h-[120px] justify-center transition-colors ${
                    member ? 'hover:border-primary/40' : ''
                  }`}
                >
                  {species && member ? (
                    <>
                      {i === 0 && (
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">리더</span>
                      )}
                      <motion.img
                        src={species.spriteUrl}
                        alt={species.name}
                        className="w-14 h-14 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <span className="text-[11px] font-semibold text-foreground truncate max-w-full">
                        {member.nickname || species.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px]">{friendship?.emoji}</span>
                        <span className="text-[9px] text-muted-foreground">Lv.{member.level}</span>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (boxPokemon.length > 0) {
                          setSwapTarget(null);
                          setShowSwap(true);
                        } else {
                          toast('보관함에 포켓몬이 없습니다');
                        }
                      }}
                      className="flex flex-col items-center gap-1 text-muted-foreground/40"
                    >
                      <span className="text-2xl">+</span>
                      <span className="text-[10px]">추가</span>
                    </button>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Box Pokémon */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-foreground">보관함</span>
            <span className="text-xs text-muted-foreground">{boxPokemon.length}마리</span>
          </div>
          {boxPokemon.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground text-sm">보관함이 비어있어요</p>
              <p className="text-muted-foreground/60 text-xs mt-1">런닝으로 새 포켓몬을 만나보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {boxPokemon.map(p => {
                const sp = getPokemonById(p.speciesId);
                if (!sp) return null;
                const fr = getFriendshipLevel(p.friendship);
                return (
                  <motion.button
                    key={p.uid}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSelected(p)}
                    className="glass-card p-2 flex flex-col items-center gap-0.5 hover:border-primary/30 transition-colors"
                  >
                    <img
                      src={sp.spriteUrl}
                      alt={sp.name}
                      className="w-10 h-10 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span className="text-[10px] font-medium text-foreground truncate max-w-full">
                      {p.nickname || sp.name}
                    </span>
                    <span className="text-[8px] text-muted-foreground">{fr.emoji}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setEditingNickname(false); } }}>
        <DialogContent className="max-w-[360px] bg-card border-border/60 p-0 overflow-hidden">
          {selectedSpecies && selected && selectedFriendship && (
            <>
              {/* Header with sprite */}
              <div className="relative pt-6 pb-4 px-5 text-center gradient-primary/10">
                <div className="absolute top-0 left-0 right-0 h-20 gradient-primary opacity-10 rounded-t-lg" />
                <motion.img
                  src={selectedSpecies.spriteUrl}
                  alt={selectedSpecies.name}
                  className="w-24 h-24 object-contain mx-auto relative z-10"
                  style={{ imageRendering: 'pixelated' }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Nickname / Name */}
                <div className="relative z-10 mt-2">
                  {editingNickname ? (
                    <div className="flex items-center gap-2 justify-center">
                      <Input
                        value={nicknameValue}
                        onChange={e => setNicknameValue(e.target.value)}
                        placeholder={selectedSpecies.name}
                        className="h-8 text-sm text-center w-32 bg-muted/50"
                        maxLength={10}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSaveNickname()}
                      />
                      <button onClick={handleSaveNickname} className="p-1.5 rounded-lg bg-primary/20 text-primary">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingNickname(false)} className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingNickname(true); setNicknameValue(selected.nickname || ''); }}
                      className="inline-flex items-center gap-1.5 group"
                    >
                      <span className="text-base font-bold text-foreground">
                        {selected.nickname || selectedSpecies.name}
                      </span>
                      <Edit3 size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  {selected.nickname && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{selectedSpecies.name}</p>
                  )}
                </div>

                <DialogHeader className="sr-only">
                  <DialogTitle>{selected.nickname || selectedSpecies.name}</DialogTitle>
                  <DialogDescription>포켓몬 상세 정보</DialogDescription>
                </DialogHeader>
              </div>

              {/* Info */}
              <div className="px-5 pb-5 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="glass-card p-2 rounded-xl">
                    <p className="text-[10px] text-muted-foreground">레벨</p>
                    <p className="text-sm font-bold text-foreground">{selected.level}</p>
                  </div>
                  <div className="glass-card p-2 rounded-xl">
                    <p className="text-[10px] text-muted-foreground">획득</p>
                    <p className="text-sm font-bold text-foreground">
                      {selected.acquiredMethod === 'starter' ? '스타터' :
                       selected.acquiredMethod === 'egg' ? '알 부화' :
                       selected.acquiredMethod === 'encounter' ? '포획' : '이벤트'}
                    </p>
                  </div>
                  <div className="glass-card p-2 rounded-xl">
                    <p className="text-[10px] text-muted-foreground">등급</p>
                    <p className={`text-sm font-bold ${RARITY_CONFIG[selectedSpecies.rarity].color}`}>
                      {RARITY_CONFIG[selectedSpecies.rarity].label}
                    </p>
                  </div>
                </div>

                {/* Friendship */}
                <div className="glass-card p-3 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Heart size={13} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">친밀도</span>
                    </div>
                    <span className="text-xs text-foreground">
                      {selectedFriendship.emoji} {selectedFriendship.label}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full gradient-primary"
                      initial={false}
                      animate={{ width: `${(selected.friendship / 255) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1 text-right">{selected.friendship} / 255</p>
                </div>

                {/* Pokemon Info */}
                <div className="glass-card p-3 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-foreground">📋 포켓몬 정보</span>
                  </div>
                  <div className="flex gap-1.5">
                    {selectedSpecies.types.map(t => (
                      <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full text-white ${TYPE_CONFIG[t].color}`}>
                        {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
                      </span>
                    ))}
                  </div>
                  {selectedSpecies.description && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{selectedSpecies.description}</p>
                  )}
                </div>

                {/* Habitat Info */}
                {(() => {
                  const habitats = getPokemonHabitats(selected.speciesId, selectedSpecies.types);
                  if (habitats.length === 0) return null;
                  return (
                    <div className="glass-card p-3 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-semibold text-foreground">🗺️ 출몰 · 서식지</span>
                      </div>
                      <div className="space-y-1.5">
                        {habitats.map(h => (
                          <div key={h.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
                            <span className="text-base">{h.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground">{h.name}</p>
                              <p className="text-[9px] text-muted-foreground">{h.description}</p>
                            </div>
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{h.terrain}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] text-muted-foreground/60 mt-2">💡 해당 지역에서 런닝하면 만날 확률이 높아집니다</p>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInteract(selected.uid)}
                    disabled={interactCooldown.has(selected.uid)}
                    className="flex flex-col items-center gap-1 h-auto py-3 text-xs"
                  >
                    <Sparkles size={16} className="text-primary" />
                    교감
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowItemMenu(true)}
                    className="flex flex-col items-center gap-1 h-auto py-3 text-xs"
                  >
                    <Package size={16} className="text-heal" />
                    아이템
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selected.isInParty) {
                        handleRemoveFromParty(selected.uid);
                      } else {
                        if (party.length >= 6) {
                          setSwapTarget(party[party.length - 1].uid);
                          setShowSwap(true);
                          setSelected(null);
                        } else {
                          addToParty(selected.uid);
                          toast('파티에 추가했어요!', { icon: '✨' });
                          setSelected(null);
                          refresh();
                        }
                      }
                    }}
                    className="flex flex-col items-center gap-1 h-auto py-3 text-xs"
                  >
                    <ArrowRightLeft size={16} className="text-accent" />
                    {selected.isInParty ? '제외' : '파티에'}
                  </Button>
                </div>

                {/* Party Order Management */}
                {selected.isInParty && (() => {
                  const partyIndex = party.findIndex(p => p.uid === selected.uid);
                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-medium">파티 순서 관리</p>
                      <div className="flex gap-2">
                        {partyIndex > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (partyIndex === 1) {
                                setAsLeader(selected.uid);
                                toast('🌟 리더로 지정했어요!');
                              } else {
                                reorderParty(partyIndex, partyIndex - 1);
                                toast('순서를 변경했어요!');
                              }
                              refresh();
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs"
                          >
                            <ArrowUp size={14} />
                            앞으로
                          </Button>
                        )}
                        {partyIndex > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setAsLeader(selected.uid);
                              toast('🌟 리더로 지정했어요!');
                              refresh();
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs"
                          >
                            <Crown size={14} />
                            리더 지정
                          </Button>
                        )}
                        {partyIndex < party.length - 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              reorderParty(partyIndex, partyIndex + 1);
                              toast('순서를 변경했어요!');
                              refresh();
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs"
                          >
                            <ArrowDown size={14} />
                            뒤로
                          </Button>
                        )}
                      </div>
                      {partyIndex === 0 && (
                        <p className="text-[9px] text-primary text-center">⭐ 현재 리더 포켓몬입니다</p>
                      )}
                    </div>
                  );
                })()}

                {/* Item Use Section */}
                {(() => {
                  const inv = getInventory();
                  const usableItems = Object.entries(inv.items)
                    .filter(([, count]) => count > 0)
                    .map(([itemId, count]) => ({ item: SHOP_ITEMS.find(i => i.id === itemId)!, count }))
                    .filter(({ item }) => item && (item.category === 'evolution' || item.category === 'boost'));

                  if (usableItems.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Package size={10} /> 아이템 사용
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {usableItems.map(({ item, count }) => (
                          <Button
                            key={item.id}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const beforeLevel = selected.level;
                              const beforeSpeciesId = selected.speciesId;
                              let result: any;
                              if (item.effect === 'level_up' || item.effect === 'level_up_5') {
                                result = useRareCandy(selected.uid, item.effect === 'level_up_5' ? 5 : 1);
                              } else if (item.effect.startsWith('evolve_')) {
                                result = useEvolutionStone(selected.uid, item.id);
                              } else if (item.effect === 'heal_50' || item.effect === 'heal_100') {
                                const healAmount = item.effect === 'heal_100' ? 1 : 0.5;
                                const hpBefore = getEffectiveHpRatio(selected.uid);
                                if (hpBefore >= 1) {
                                  toast('이미 건강한 상태입니다!');
                                  return;
                                }
                                healSingle(selected.uid, healAmount);
                                const inv2 = getInventory();
                                inv2.items[item.id] = (inv2.items[item.id] || 1) - 1;
                                if (inv2.items[item.id] <= 0) delete inv2.items[item.id];
                                localStorage.setItem('routinmon-inventory', JSON.stringify(inv2));
                                toast.success(`${item.name}을(를) 사용했습니다! HP 회복!`);
                                refresh();
                                return;
                              } else {
                                return;
                              }

                              if (result.success) {
                                const updated = getCollection().owned.find(p => p.uid === selected.uid);
                                if (updated) {
                                  if ('evolvedSpeciesId' in result && result.evolvedSpeciesId) {
                                    setItemEffect({
                                      type: 'evolution',
                                      pokemonUid: selected.uid,
                                      speciesId: result.evolvedSpeciesId,
                                      prevSpeciesId: beforeSpeciesId,
                                      newSpeciesId: result.evolvedSpeciesId,
                                    });
                                  } else {
                                    setItemEffect({
                                      type: 'level_up',
                                      pokemonUid: selected.uid,
                                      speciesId: updated.speciesId,
                                      levelBefore: beforeLevel,
                                      levelAfter: updated.level,
                                      levelsGained: updated.level - beforeLevel,
                                    });
                                  }
                                  setSelected(updated);
                                }
                                refresh();
                              } else {
                                toast.error(result.message);
                              }
                            }}
                            className="flex items-center gap-1.5 h-auto py-2 px-2 text-[10px] justify-start"
                          >
                            <span>{item.emoji}</span>
                            <div className="text-left flex-1 min-w-0">
                              <p className="font-semibold truncate">{item.name}</p>
                              <p className="text-muted-foreground">×{count}</p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Menu Modal (Leader only) */}
      <Dialog open={showItemMenu} onOpenChange={setShowItemMenu}>
        <DialogContent className="max-w-[360px] bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base">아이템 사용</DialogTitle>
            <DialogDescription className="text-xs">
              {selected ? `${selected.nickname || getPokemonById(selected.speciesId)?.name}에게 사용할 아이템을 선택하세요` : '아이템 선택'}
            </DialogDescription>
          </DialogHeader>
          {selected && (() => {
            const inv = getInventory();
            // Food items
            const foodAvailable = pet.foodCount > 0;
            // Inventory items (boost + evolution)
            const usableItems = Object.entries(inv.items)
              .filter(([, count]) => count > 0)
              .map(([itemId, count]) => ({ item: SHOP_ITEMS.find(i => i.id === itemId)!, count }))
              .filter(({ item }) => item);

            return (
              <div className="space-y-3 py-2">
                {/* Food */}
                <Button
                  variant="outline"
                  onClick={() => {
                    handleFeed(selected.uid);
                    if (pet.foodCount > 1) return; // keep open if more food
                    setShowItemMenu(false);
                  }}
                  disabled={!foodAvailable}
                  className="w-full flex items-center gap-3 h-auto py-3 px-4 justify-start"
                >
                  <span className="text-xl">🍎</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold">먹이</p>
                    <p className="text-xs text-muted-foreground">친밀도를 올려줍니다</p>
                  </div>
                  <span className="text-xs text-muted-foreground">×{pet.foodCount}</span>
                </Button>

                {/* Inventory items */}
                {usableItems.map(({ item, count }) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    onClick={() => {
                      const beforeLevel = selected.level;
                      const beforeSpeciesId = selected.speciesId;
                      let result: any;
                      if (item.effect === 'level_up' || item.effect === 'level_up_5') {
                        result = useRareCandy(selected.uid, item.effect === 'level_up_5' ? 5 : 1);
                      } else if (item.effect.startsWith('evolve_')) {
                        result = useEvolutionStone(selected.uid, item.id);
                      } else if (item.effect === 'heal_50' || item.effect === 'heal_100') {
                        const healAmount = item.effect === 'heal_100' ? 1 : 0.5;
                        const hpBefore = getEffectiveHpRatio(selected.uid);
                        if (hpBefore >= 1) {
                          toast('이미 건강한 상태입니다!');
                          return;
                        }
                        healSingle(selected.uid, healAmount);
                        const inv = getInventory();
                        inv.items[item.id] = (inv.items[item.id] || 1) - 1;
                        if (inv.items[item.id] <= 0) delete inv.items[item.id];
                        localStorage.setItem('routinmon-inventory', JSON.stringify(inv));
                        setShowItemMenu(false);
                        toast.success(`${item.name}을(를) 사용했습니다! HP 회복!`);
                        refresh();
                        return;
                      } else {
                        return;
                      }
                      if (result.success) {
                        setShowItemMenu(false);
                        const updated = getCollection().owned.find(p => p.uid === selected.uid);
                        if (updated) {
                          if ('evolvedSpeciesId' in result && result.evolvedSpeciesId) {
                            setItemEffect({
                              type: 'evolution',
                              pokemonUid: selected.uid,
                              speciesId: result.evolvedSpeciesId,
                              prevSpeciesId: beforeSpeciesId,
                              newSpeciesId: result.evolvedSpeciesId,
                            });
                          } else {
                            setItemEffect({
                              type: 'level_up',
                              pokemonUid: selected.uid,
                              speciesId: updated.speciesId,
                              levelBefore: beforeLevel,
                              levelAfter: updated.level,
                              levelsGained: updated.level - beforeLevel,
                            });
                          }
                          setSelected(updated);
                        }
                        refresh();
                      } else {
                        toast.error(result.message);
                      }
                    }}
                    className="w-full flex items-center gap-3 h-auto py-3 px-4 justify-start"
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">×{count}</span>
                  </Button>
                ))}

                {usableItems.length === 0 && !foodAvailable && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">사용 가능한 아이템이 없습니다</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">상점에서 아이템을 구매하세요</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Swap Modal */}
      <Dialog open={showSwap} onOpenChange={setShowSwap}>
        <DialogContent className="max-w-[360px] bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base">보관함에서 선택</DialogTitle>
            <DialogDescription className="text-xs">파티에 넣을 포켓몬을 선택하세요</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto py-2">
            {boxPokemon.map(p => {
              const sp = getPokemonById(p.speciesId);
              if (!sp) return null;
              return (
                <motion.button
                  key={p.uid}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleSwap(p.uid)}
                  className="glass-card p-2 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors"
                >
                  <img src={sp.spriteUrl} alt={sp.name} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} />
                  <span className="text-[10px] font-medium text-foreground truncate max-w-full">{p.nickname || sp.name}</span>
                </motion.button>
              );
            })}
          </div>
          {boxPokemon.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">보관함이 비어있어요</p>
          )}
        </DialogContent>
      </Dialog>

      <ItemEffectOverlay effect={itemEffect} onClose={() => setItemEffect(null)} />
      <DebugPanel onRefresh={refresh} />
      <BottomNav />
    </div>
  );
}
