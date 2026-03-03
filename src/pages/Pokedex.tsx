import BottomNav from '@/components/BottomNav';
import { motion } from 'framer-motion';
import { getPet } from '@/lib/pet';
import charmanderImg from '@/assets/pet-charmander.png';
import charmeleonImg from '@/assets/pet-charmeleon.png';
import charizardImg from '@/assets/pet-charizard.png';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.4, ease: 'easeOut' as const },
  }),
};

const EVOLUTIONS = [
  { image: charmanderImg, name: '파이리', range: 'Lv.1~15', desc: '불꽃의 시작. 작지만 뜨거운 마음을 가진 포켓몬.', stage: 'charmander' as const },
  { image: charmeleonImg, name: '리자드', range: 'Lv.16~35', desc: '성장한 불꽃. 이제 두려울 것이 없다.', condition: 'Lv.16 + 먹이 누적 50개', stage: 'charmeleon' as const },
  { image: charizardImg, name: '리자몽', range: 'Lv.36+', desc: '하늘을 나는 전설의 불꽃. 당신과 함께 성장했다.', condition: 'Lv.36 + 먹이 누적 200개', stage: 'charizard' as const },
];

const STAGE_ORDER = ['charmander', 'charmeleon', 'charizard'] as const;

export default function Pokedex() {
  const pet = getPet();
  const currentStageIdx = STAGE_ORDER.indexOf(pet.stage);

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-10 space-y-5">
        <h1 className="text-2xl font-bold text-foreground">도감</h1>

        <motion.div
          className="glass-card p-5 space-y-5"
          variants={fadeUp} initial="hidden" animate="visible" custom={0}
        >
          <h2 className="text-base font-semibold text-foreground">진화 도감</h2>
          <div className="space-y-5">
            {EVOLUTIONS.map((evo, i) => {
              const unlocked = i <= currentStageIdx;
              const isCurrent = evo.stage === pet.stage;
              return (
                <motion.div
                  key={evo.stage}
                  className={`flex items-center gap-4 ${!unlocked ? 'opacity-40' : ''}`}
                  variants={fadeUp}
                  custom={i + 1}
                >
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden ${
                    isCurrent ? 'ring-2 ring-primary glow-shadow' : unlocked ? 'bg-card' : 'bg-muted'
                  }`}>
                    {unlocked ? (
                      <motion.img
                        src={evo.image}
                        alt={evo.name}
                        className="w-14 h-14 object-contain"
                        animate={isCurrent ? { y: [0, -3, 0] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    ) : (
                      <span className="text-2xl">🔒</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{evo.name}</p>
                      <span className="text-xs text-muted-foreground">{evo.range}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">현재</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {unlocked ? evo.desc : evo.condition}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
