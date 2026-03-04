// FIX #6: 파티 관리 탭
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, ArrowUp, ArrowDown, Package, Trash2, Edit3, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { type OwnedPokemon, setAsLeader, removeFromParty, reorderParty, setNickname, getParty, releasePokemon } from '@/lib/collection';
import { getPokemonById } from '@/lib/pokemon-registry';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PartyManageTabProps {
  pokemon: OwnedPokemon;
  partyIndex: number;
  onRefresh: () => void;
  onClose: () => void;
}

export default function PartyManageTab({ pokemon, partyIndex, onRefresh, onClose }: PartyManageTabProps) {
  const species = getPokemonById(pokemon.speciesId);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState(pokemon.nickname || '');
  const party = getParty();
  const isLeader = partyIndex === 0;
  const isInParty = pokemon.isInParty;

  if (!species) return null;

  const handleSetLeader = () => {
    if (setAsLeader(pokemon.uid)) {
      toast('리더로 지정했어요!', { icon: '👑' });
      onRefresh();
    }
  };

  const handleMoveUp = () => {
    if (partyIndex > 0 && reorderParty(partyIndex, partyIndex - 1)) {
      toast('순서를 변경했어요!');
      onRefresh();
    }
  };

  const handleMoveDown = () => {
    if (partyIndex < party.length - 1 && reorderParty(partyIndex, partyIndex + 1)) {
      toast('순서를 변경했어요!');
      onRefresh();
    }
  };

  const handleRemoveFromParty = () => {
    if (!removeFromParty(pokemon.uid)) {
      toast('파티에는 최소 1마리가 필요합니다!');
      return;
    }
    toast('파티에서 제외했어요');
    onRefresh();
    onClose();
  };

  const handleRelease = () => {
    const success = releasePokemon(pokemon.uid);
    if (!success) {
      toast('파티에 최소 1마리는 남아야 합니다!');
      return;
    }
    toast(`${pokemon.nickname || species.name}을(를) 방생했어요... 안녕! 👋`, { duration: 4000 });
    onRefresh();
    onClose();
  };

  const handleSaveNickname = () => {
    setNickname(pokemon.uid, nicknameValue.trim());
    toast(nicknameValue.trim() ? `닉네임을 "${nicknameValue.trim()}"(으)로 변경!` : '닉네임을 초기화했어요');
    setEditingNickname(false);
    onRefresh();
  };

  return (
    <div className="space-y-3 p-4">
      {/* Nickname */}
      <div className="glass-card p-3 rounded-xl">
        <p className="text-xs text-muted-foreground mb-2">✏️ 닉네임</p>
        {editingNickname ? (
          <div className="flex items-center gap-2">
            <Input
              value={nicknameValue}
              onChange={e => setNicknameValue(e.target.value)}
              placeholder={species.name}
              className="h-8 text-sm bg-muted/50"
              maxLength={10}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveNickname()}
            />
            <button onClick={handleSaveNickname} className="p-1.5 rounded-lg bg-primary/20 text-primary"><Check size={14} /></button>
            <button onClick={() => setEditingNickname(false)} className="p-1.5 rounded-lg bg-muted text-muted-foreground"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => { setEditingNickname(true); setNicknameValue(pokemon.nickname || ''); }}
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
            <Edit3 size={14} />
            <span>{pokemon.nickname || species.name}</span>
          </button>
        )}
      </div>

      {/* Party management actions */}
      {isInParty && (
        <div className="space-y-2">
          {!isLeader && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSetLeader}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/80 hover:border-primary/30">
              <Crown size={18} className="text-amber-400" />
              <span className="text-sm font-medium text-foreground">리더로 지정</span>
            </motion.button>
          )}

          {partyIndex > 0 && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleMoveUp}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/80 hover:border-primary/30">
              <ArrowUp size={18} className="text-foreground" />
              <span className="text-sm font-medium text-foreground">위로 이동</span>
            </motion.button>
          )}

          {partyIndex < party.length - 1 && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleMoveDown}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/80 hover:border-primary/30">
              <ArrowDown size={18} className="text-foreground" />
              <span className="text-sm font-medium text-foreground">아래로 이동</span>
            </motion.button>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={handleRemoveFromParty}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/80 hover:border-secondary/30">
            <Package size={18} className="text-secondary" />
            <span className="text-sm font-medium text-foreground">보관함으로 이동</span>
          </motion.button>
        </div>
      )}

      {/* Release (방생) — 2단계 확인 */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <motion.button whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 mt-4">
            <Trash2 size={18} className="text-destructive" />
            <span className="text-sm font-medium text-destructive">방생하기</span>
          </motion.button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 방생하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {pokemon.nickname || species.name}을(를) 방생하면 되돌릴 수 없습니다.
              도감 기록은 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleRelease} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              방생하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
