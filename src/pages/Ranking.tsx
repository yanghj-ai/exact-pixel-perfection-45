import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Swords, TrendingUp, Medal } from 'lucide-react';
import { getWeeklyRanking, type RankerEntry } from '@/lib/npc-trainers';
import { getWeeklyBattleStats, getBattleRecords } from '@/lib/battle';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import DebugPanel from '@/components/DebugPanel';

const RANK_BADGES = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const navigate = useNavigate();
  const [ranking] = useState<RankerEntry[]>(getWeeklyRanking());
  const battleStats = getWeeklyBattleStats();
  const recentBattles = getBattleRecords().slice(0, 5);

  const playerRank = ranking.findIndex(r => r.isPlayer) + 1;

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card/80 border border-border/50">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">주간 랭킹</h1>
            <p className="text-xs text-muted-foreground">이번 주 트레이너 순위</p>
          </div>
        </div>

        {/* My stats card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 mb-4 border border-primary/20"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Medal size={16} className="text-primary" />
              <span className="text-sm font-bold text-foreground">내 순위</span>
            </div>
            <span className="text-xl font-bold text-primary">#{playerRank}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{battleStats.wins}</p>
              <p className="text-[10px] text-muted-foreground">승리</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{battleStats.losses}</p>
              <p className="text-[10px] text-muted-foreground">패배</p>
            </div>
            <div>
              <p className="text-lg font-bold text-secondary">{battleStats.totalCoins}</p>
              <p className="text-[10px] text-muted-foreground">획득 코인</p>
            </div>
          </div>
        </motion.div>

        {/* Battle button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Button
            onClick={() => navigate('/battle')}
            className="w-full gradient-primary text-primary-foreground border-0 mb-4 h-12 text-base font-bold"
          >
            <Swords size={18} className="mr-2" />
            배틀하기
          </Button>
        </motion.div>

        {/* Ranking list */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card overflow-hidden mb-4">
          <div className="p-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-secondary" />
              <span className="text-xs font-bold text-foreground">이번 주 순위표</span>
            </div>
          </div>
          <div className="divide-y divide-border/20">
            {ranking.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className={`flex items-center gap-3 px-4 py-3 ${
                  entry.isPlayer ? 'bg-primary/5' : ''
                }`}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {idx < 3 ? (
                    <span className="text-lg">{RANK_BADGES[idx]}</span>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{idx + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <span className="text-xl flex-shrink-0">{entry.emoji}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold ${entry.isPlayer ? 'text-primary' : 'text-foreground'}`}>
                      {entry.name}
                    </span>
                    {entry.isPlayer && (
                      <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">나</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">🏃 {entry.weeklyDistanceKm.toFixed(1)}km</span>
                    <span className="text-[10px] text-muted-foreground">⚔️ {entry.weeklyBattleWins}승</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{entry.score}</p>
                  <p className="text-[9px] text-muted-foreground">점</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent battles */}
        {recentBattles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Swords size={14} className="text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">최근 배틀</span>
            </div>
            <div className="space-y-2">
              {recentBattles.map(b => (
                <div key={b.id} className="flex items-center gap-3 text-sm">
                  <span className={`text-xs font-bold ${b.result === 'win' ? 'text-heal' : 'text-destructive'}`}>
                    {b.result === 'win' ? '승' : '패'}
                  </span>
                  <span className="text-xs text-foreground flex-1">vs {b.opponentName}</span>
                  <span className="text-[10px] text-muted-foreground">{b.date}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        <DebugPanel />
      </div>
      <BottomNav />
    </div>
  );
}
