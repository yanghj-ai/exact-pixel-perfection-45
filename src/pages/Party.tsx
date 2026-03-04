import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCollection, getParty, addToParty, removeFromParty,
  getFriendshipLevel, interactWithPokemon, feedPokemon,
  setNickname, setAsLeader, reorderParty, type OwnedPokemon,
} from '@/lib/collection';
import { getPet } from '@/lib/pet';
import { getPokemonById, RARITY_CONFIG } from '@/lib/pokemon-registry';
import { ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { getInventory, SHOP_ITEMS, useRareCandy, useEvolutionStone } from '@/lib/shop';
import { healSingle, getEffectiveHpRatio } from '@/lib/pokemon-health';
import BottomNav from '@/components/BottomNav';
import DebugPanel from '@/components/DebugPanel';
import ItemEffectOverlay, { type ItemEffectData } from '@/components/ItemEffectOverlay';
import PartyStatusTab from '@/components/party/PartyStatusTab';
import PartyItemTab from '@/components/party/PartyItemTab';
import PartyManageTab from '@/components/party/PartyManageTab';

export default function Party() {
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate(v => v + 1), []);

  const party = getParty();
  const collection = getCollection();
  const boxPokemon = collection.owned.filter(p => !p.isInParty);

  // Drawer detail
  const [selected, setSelected] = useState<OwnedPokemon | null>(null);
  const [activeTab, setActiveTab] = useState('status');
  // Swap modal
  const [showSwap, setShowSwap] = useState(false);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  // Item effect overlay
  const [itemEffect, setItemEffect] = useState<ItemEffectData | null>(null);

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

  const openDetail = useCallback((pokemon: OwnedPokemon) => {
    setSelected(pokemon);
    setActiveTab('status');
  }, []);

  const handleDetailRefresh = useCallback(() => {
    refresh();
    if (selected) {
      const updated = getCollection().owned.find(p => p.uid === selected.uid);
      if (updated) setSelected(updated);
      else setSelected(null);
    }
  }, [selected, refresh]);

  const selectedSpecies = selected ? getPokemonById(selected.speciesId) : null;
  const selectedPartyIndex = selected ? party.findIndex(p => p.uid === selected.uid) : -1;

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
                    if (member) openDetail(member);
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
                    onClick={() => openDetail(p)}
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

      {/* Detail Drawer with 3 Tabs */}
      <Drawer open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DrawerContent className="max-h-[85vh]">
          {selectedSpecies && selected && (
            <>
              <DrawerHeader className="pb-0">
                <div className="flex items-center gap-3">
                  <motion.img
                    src={selectedSpecies.spriteUrl}
                    alt={selectedSpecies.name}
                    className="w-14 h-14 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="flex-1 min-w-0">
                    <DrawerTitle className="text-base text-foreground">
                      {selected.nickname || selectedSpecies.name}
                    </DrawerTitle>
                    <DrawerDescription className="text-xs text-muted-foreground">
                      Lv.{selected.level} · <span className={RARITY_CONFIG[selectedSpecies.rarity].color}>{RARITY_CONFIG[selectedSpecies.rarity].label}</span>
                      {selectedPartyIndex === 0 && <span className="text-primary ml-1.5">⭐ 리더</span>}
                    </DrawerDescription>
                  </div>
                </div>
              </DrawerHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="w-full grid grid-cols-3 mx-4 mt-3" style={{ width: 'calc(100% - 32px)' }}>
                  <TabsTrigger value="status" className="text-xs">📊 상태</TabsTrigger>
                  <TabsTrigger value="items" className="text-xs">🎒 아이템</TabsTrigger>
                  <TabsTrigger value="manage" className="text-xs">⚙️ 관리</TabsTrigger>
                </TabsList>

                <div className="overflow-y-auto max-h-[55vh]">
                  <TabsContent value="status" className="mt-0">
                    <PartyStatusTab pokemon={selected} />
                  </TabsContent>

                  <TabsContent value="items" className="mt-0">
                    <PartyItemTab
                      pokemon={selected}
                      onItemUsed={(effect) => {
                        setItemEffect(effect);
                        handleDetailRefresh();
                      }}
                      onRefresh={handleDetailRefresh}
                    />
                  </TabsContent>

                  <TabsContent value="manage" className="mt-0">
                    <PartyManageTab
                      pokemon={selected}
                      partyIndex={selectedPartyIndex}
                      onRefresh={handleDetailRefresh}
                      onClose={() => setSelected(null)}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </DrawerContent>
      </Drawer>

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
