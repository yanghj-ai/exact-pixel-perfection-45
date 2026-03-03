import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, ShoppingBag, Gem, Apple, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCoins } from '@/lib/collection';
import { SHOP_ITEMS, purchaseItem, getInventory, type ShopItem } from '@/lib/shop';
import BottomNav from '@/components/BottomNav';
import DebugPanel from '@/components/DebugPanel';

type Category = 'all' | 'evolution' | 'boost' | 'food' | 'heal';

const CATEGORY_CONFIG: Record<Category, { label: string; emoji: string }> = {
  all: { label: '전체', emoji: '🛒' },
  evolution: { label: '진화의 돌', emoji: '💎' },
  boost: { label: '레벨업', emoji: '🍬' },
  food: { label: '먹이', emoji: '🍎' },
  heal: { label: '회복', emoji: '💊' },
};

export default function Shop() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>('all');
  const [coins, setCoins] = useState(getCoins());
  const [inventory, setInventory] = useState(getInventory());
  const [purchaseAnim, setPurchaseAnim] = useState<string | null>(null);

  const filteredItems = category === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === category);

  const handlePurchase = (item: ShopItem) => {
    const result = purchaseItem(item.id);
    if (result.success) {
      setPurchaseAnim(item.id);
      setTimeout(() => setPurchaseAnim(null), 600);
      setCoins(getCoins());
      setInventory(getInventory());
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card/80 border border-border/50">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShoppingBag size={20} className="text-secondary" />
              포켓몬 샵
            </h1>
            <p className="text-xs text-muted-foreground">코인으로 아이템을 구매하세요</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1.5 border border-secondary/30">
            <Coins size={14} className="text-secondary" />
            <span className="text-sm font-bold text-secondary">{coins}</span>
          </div>
        </div>

        {/* Inventory Banner */}
        {Object.keys(inventory.items).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-3 mb-4 border border-accent/20"
          >
            <p className="text-[10px] text-accent font-semibold mb-1.5 flex items-center gap-1">
              <Sparkles size={10} /> 보유 아이템
            </p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(inventory.items).map(([itemId, count]) => {
                const item = SHOP_ITEMS.find(i => i.id === itemId);
                if (!item || count <= 0) return null;
                return (
                  <span key={itemId} className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-[10px]">
                    <span>{item.emoji}</span>
                    <span className="text-foreground font-medium">{item.name}</span>
                    <span className="text-primary font-bold">×{count}</span>
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none">
          {(Object.keys(CATEGORY_CONFIG) as Category[]).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                category === cat
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{CATEGORY_CONFIG[cat].emoji}</span>
              <span>{CATEGORY_CONFIG[cat].label}</span>
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="space-y-2.5">
          {filteredItems.map((item, i) => {
            const canAfford = coins >= item.price;
            const ownedCount = inventory.items[item.id] || 0;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card p-4 flex items-center gap-3 transition-all ${
                  purchaseAnim === item.id ? 'ring-2 ring-secondary/50' : ''
                }`}
              >
                {/* Emoji */}
                <motion.div
                  className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl flex-shrink-0"
                  animate={purchaseAnim === item.id ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
                >
                  {item.emoji}
                </motion.div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">{item.name}</span>
                    {ownedCount > 0 && (
                      <span className="text-[9px] bg-accent/20 text-accent rounded-full px-1.5 py-0.5 font-bold">
                        ×{ownedCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                </div>

                {/* Buy button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handlePurchase(item)}
                  disabled={!canAfford}
                  className={`flex-shrink-0 flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    canAfford
                      ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <Coins size={12} />
                  <span>{item.price}</span>
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Coin earning tips */}
        <div className="mt-6 glass-card p-4 border border-border/30">
          <p className="text-xs font-semibold text-foreground mb-2">💡 코인 획득 방법</p>
          <div className="space-y-1.5 text-[10px] text-muted-foreground">
            <p>⚔️ 배틀에서 승리하면 코인을 획득합니다</p>
            <p>🏃 런닝 목표를 달성하면 보너스 코인!</p>
            <p>📅 매일 출석하면 추가 보상을 받을 수 있어요</p>
          </div>
        </div>
        <DebugPanel onRefresh={() => { setCoins(getCoins()); setInventory(getInventory()); }} />
      </div>

      <BottomNav />
    </div>
  );
}
