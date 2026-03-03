import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCollection, getParty, addToParty, removeFromParty,
  getFriendshipLevel, interactWithPokemon, feedPokemon,
  setNickname, type OwnedPokemon,
} from '@/lib/collection';
import { getPet } from '@/lib/pet';
import { getPokemonById, RARITY_CONFIG } from '@/lib/pokemon-registry';
import { ArrowLeft, Heart, Apple, Edit3, ArrowRightLeft, X, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import BottomNav from '@/components/BottomNav';
import DebugPanel from '@/components/DebugPanel';

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
                  onClick={() => member && setSelected(member)}
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
                    onClick={() => handleFeed(selected.uid)}
                    className="flex flex-col items-center gap-1 h-auto py-3 text-xs"
                  >
                    <Apple size={16} className="text-heal" />
                    먹이 ({pet.foodCount})
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
              </div>
            </>
          )}
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

      <DebugPanel onRefresh={refresh} />
      <BottomNav />
    </div>
  );
}
