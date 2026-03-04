import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import BottomNav from '@/components/BottomNav';
import {
  getChallengesByCategory,
  getChallengeCompletionRate,
  getActiveTitle,
  setActiveTitle,
  getEarnedTitles,
  CATEGORY_LABELS,
  type ChallengeCategory,
} from '@/lib/challenge';

const CATEGORIES: ChallengeCategory[] = ['distance', 'cumulative', 'streak', 'exploration', 'special'];

export default function Challenges() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<ChallengeCategory>('distance');
  const [currentTitle, setCurrentTitle] = useState(getActiveTitle());

  const challengeMap = getChallengesByCategory();
  const completion = getChallengeCompletionRate();
  const earnedTitles = getEarnedTitles();
  const challenges = challengeMap.get(category) || [];

  const handleTitleChange = (title: string | null) => {
    setActiveTitle(title);
    setCurrentTitle(title);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">챌린지</h1>
            <p className="text-[10px] text-muted-foreground">
              {completion.completed}/{completion.total} 완료 ({completion.pct}%)
            </p>
          </div>
          <Trophy className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Overall Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">전체 진행도</span>
            <span className="text-xs font-bold text-primary">{completion.pct}%</span>
          </div>
          <Progress value={completion.pct} className="h-2" />

          {/* Active Title */}
          {earnedTitles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground mb-1.5">🏷️ 활성 칭호</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleTitleChange(null)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    !currentTitle ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  없음
                </button>
                {earnedTitles.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTitleChange(t)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      currentTitle === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const info = CATEGORY_LABELS[cat];
            const items = challengeMap.get(cat) || [];
            const done = items.filter((i) => i.progress.completed).length;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                  category === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {info.emoji} {info.label} {done}/{items.length}
              </button>
            );
          })}
        </div>
      </div>

      {/* Challenge List */}
      <div className="px-4 space-y-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {challenges.map(({ def, progress }, i) => {
              const pct = Math.min(100, Math.round((progress.current / progress.target) * 100));
              return (
                <motion.div
                  key={def.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass-card p-3 border ${
                    progress.completed ? 'border-primary/30 bg-primary/5' : 'border-border/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg mt-0.5">{def.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{def.name}</span>
                        {progress.completed && (
                          <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{def.description}</p>

                      {!progress.completed && (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-muted-foreground">
                              {progress.current} / {progress.target}
                            </span>
                            <span className="text-[9px] text-muted-foreground">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      )}

                      {/* Rewards */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-secondary font-medium">🪙 {def.rewardCoins}</span>
                        {def.rewardTitle && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                            🏷️ {def.rewardTitle}
                          </span>
                        )}
                        {def.rewardItemId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            🧬 특수 아이템
                          </span>
                        )}
                      </div>

                      {progress.completed && progress.completedAt && (
                        <p className="text-[9px] text-muted-foreground mt-1">
                          ✅ {new Date(progress.completedAt).toLocaleDateString('ko-KR')} 달성
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
