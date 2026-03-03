import BottomNav from '@/components/BottomNav';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.4, ease: 'easeOut' as const },
  }),
};

export default function Pokedex() {
  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-10 space-y-5">
        <h1 className="text-2xl font-bold text-foreground">도감</h1>
        <p className="text-sm text-muted-foreground">STEP 4에서 업적 & 진화 도감이 추가됩니다</p>

        {/* Placeholder evolution timeline */}
        <motion.div
          className="glass-card p-5 space-y-4"
          variants={fadeUp} initial="hidden" animate="visible" custom={0}
        >
          <h2 className="text-base font-semibold text-foreground">진화 도감</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <p className="font-medium text-foreground">파이리 <span className="text-xs text-muted-foreground">Lv.1~15</span></p>
                <p className="text-xs text-muted-foreground">불꽃의 시작. 작지만 뜨거운 마음을 가진 포켓몬.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 opacity-40">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <span className="text-2xl">🔒</span>
              </div>
              <div>
                <p className="font-medium text-foreground">리자드 <span className="text-xs text-muted-foreground">Lv.16~35</span></p>
                <p className="text-xs text-muted-foreground">Lv.16 + 먹이 누적 50개 필요</p>
              </div>
            </div>
            <div className="flex items-center gap-4 opacity-40">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <span className="text-2xl">🔒</span>
              </div>
              <div>
                <p className="font-medium text-foreground">리자몽 <span className="text-xs text-muted-foreground">Lv.36+</span></p>
                <p className="text-xs text-muted-foreground">Lv.36 + 먹이 누적 200개 필요</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
