import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, ShoppingBag, Sparkles, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCoins } from '@/lib/collection';
import { SHOP_ITEMS, purchaseItem, getInventory, type ShopItem } from '@/lib/shop';
import { getChallengesByCategory, getChallengeCompletionRate, CATEGORY_LABELS, type ChallengeCategory } from '@/lib/challenge';
import BottomNav from '@/components/BottomNav';
import DebugPanel from '@/components/DebugPanel';

type Tab = 'shop' | 'challenges';

export default function Shop() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('shop');
  const [coins, setCoins] = useState(getCoins());
  const [inventory, setInventory] = useState(getInventory());
  const [purchaseAnim, setPurchaseAnim] = useState<string | null>(null);
  const [challengeCategory, setChallengeCategory] = useState<ChallengeCategory>('distance');

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

  const challengeMap = getChallengesByCategory();
  const completionRate = getChallengeCompletionRate();

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
              {tab === 'shop' ? <ShoppingBag size={20} className="text-secondary" /> : <Trophy size={20} className="text-secondary" />}
              {tab === 'shop' ? '진화의 돌 상점' : '챌린지'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {tab === 'shop' ? '코인으로 진화의 돌을 구매하세요' : `달성률 ${completionRate.pct}% (${completionRate.completed}/${completionRate.total})`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1.5 border border-secondary/30">
            <Coins size={14} className="text-secondary" />
            <span className="text-sm font-bold text-secondary">{coins}</span>
          </div>
        </div>

        {/* Tab Switch */}
        <div className="flex gap-1.5 mb-4">
          <button
            onClick={() => setTab('shop')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all ${
              tab === 'shop' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card border border-border text-muted-foreground'
            }`}
          >
            <ShoppingBag size={14} /> 상점
          </button>
          <button
            onClick={() => setTab('challenges')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all ${
              tab === 'challenges' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card border border-border text-muted-foreground'
            }`}
          >
            <Trophy size={14} /> 챌린지
          </button>
        </div>

        {tab === 'shop' && (
          <>
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

            {/* Evolution Stone Items */}
            <div className="space-y-2.5">
              {SHOP_ITEMS.map((item, i) => {
                const canAfford = coins >= item.price;
                const ownedCount = inventory.items[item.id] || 0;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-card p-4 transition-all ${purchaseAnim === item.id ? 'ring-2 ring-secondary/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl flex-shrink-0"
                        animate={purchaseAnim === item.id ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
                      >
                        {item.emoji}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-foreground">{item.name}</span>
                          {ownedCount > 0 && (
                            <span className="text-[9px] bg-accent/20 text-accent rounded-full px-1.5 py-0.5 font-bold">×{ownedCount}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford}
                        className={`flex-shrink-0 flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                          canAfford ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md' : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        <Coins size={12} />
                        <span>{item.price}</span>
                      </motion.button>
                    </div>
                    {/* Target info */}
                    <div className="mt-2 pt-2 border-t border-border/30 flex gap-4">
                      <div className="flex-1">
                        <p className="text-[9px] text-muted-foreground font-semibold mb-0.5">대상 포켓몬</p>
                        <p className="text-[10px] text-foreground">{item.targets}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] text-muted-foreground font-semibold mb-0.5">진화 결과</p>
                        <p className="text-[10px] text-primary">{item.results}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Coin earning tips */}
            <div className="mt-6 glass-card p-4 border border-border/30">
              <p className="text-xs font-semibold text-foreground mb-2">💡 코인 획득 방법</p>
              <div className="space-y-1.5 text-[10px] text-muted-foreground">
                <p>🏃 100보당 1코인 (기본 수입)</p>
                <p>📏 1km 완주 +10코인 | 5km +50코인 | 10km +150코인</p>
                <p>☀️ 일일 첫 러닝 +20코인</p>
                <p>🔥 스트릭 보너스 +5코인 × 연속일수 (최대 50)</p>
                <p>🏆 챌린지 클리어 시 50~10,000코인</p>
              </div>
            </div>
          </>
        )}

        {tab === 'challenges' && (
          <>
            {/* Challenge completion overview */}
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground">전체 달성률</span>
                <span className="text-xs font-bold text-primary">{completionRate.completed}/{completionRate.total}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate.pct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-none">
              {(['distance', 'cumulative', 'streak', 'exploration', 'special'] as ChallengeCategory[]).map(cat => {
                const info = CATEGORY_LABELS[cat];
                const items = challengeMap.get(cat) || [];
                const done = items.filter(i => i.progress.completed).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setChallengeCategory(cat)}
                    className={`flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                      challengeCategory === cat
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-card border border-border text-muted-foreground'
                    }`}
                  >
                    <span>{info.emoji}</span>
                    <span>{info.label}</span>
                    <span className="opacity-70">({done}/{items.length})</span>
                  </button>
                );
              })}
            </div>

            {/* Challenge list */}
            <div className="space-y-2">
              {(challengeMap.get(challengeCategory) || []).map(({ def, progress }, i) => {
                const pct = Math.min(100, Math.round((progress.current / progress.target) * 100));
                return (
                  <motion.div
                    key={def.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`glass-card p-3 ${progress.completed ? 'border border-primary/30' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                        progress.completed ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        {progress.completed ? '✅' : def.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-foreground">{def.name}</span>
                          <span className="text-[9px] text-muted-foreground">{def.id}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{def.description}</p>
                        {!progress.completed && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {progress.current >= 1 ? Math.round(progress.current * 10) / 10 : progress.current}/{progress.target}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Rewards */}
                    <div className="mt-2 pt-1.5 border-t border-border/20 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-[9px] text-secondary font-bold">
                        <Coins size={10} /> {def.rewardCoins}코인
                      </span>
                      {def.rewardTitle && (
                        <span className="text-[9px] bg-accent/15 text-accent rounded-full px-1.5 py-0.5 font-medium">
                          🏷️ {def.rewardTitle}
                        </span>
                      )}
                      {def.rewardItemId && (
                        <span className="text-[9px] bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-medium">
                          🧬 유전자 촉매
                        </span>
                      )}
                      {progress.completed && progress.completedAt && (
                        <span className="ml-auto text-[8px] text-muted-foreground">
                          {new Date(progress.completedAt).toLocaleDateString('ko-KR')} 달성
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        <DebugPanel onRefresh={() => { setCoins(getCoins()); setInventory(getInventory()); }} />
      </div>

      <BottomNav />
    </div>
  );
}
