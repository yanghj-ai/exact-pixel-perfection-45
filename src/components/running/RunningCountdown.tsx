import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vibrateCountdown, vibrateGo } from '@/lib/running-mode';

interface RunningCountdownProps {
  onComplete: () => void;
}

export default function RunningCountdown({ onComplete }: RunningCountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      vibrateCountdown();
      const timer = setTimeout(() => setCount(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      vibrateGo();
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center"
        >
          {count > 0 ? (
            <span className="text-[120px] font-black text-white tabular-nums leading-none">
              {count}
            </span>
          ) : (
            <span className="text-[80px] font-black text-primary leading-none tracking-wider">
              GO!
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
