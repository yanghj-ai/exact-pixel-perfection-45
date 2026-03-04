import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BattleMessageBoxProps {
  message: string | null;
  onComplete: () => void;
}

export default function BattleMessageBox({ message, onComplete }: BattleMessageBoxProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) {
      setDisplayText('');
      setIsComplete(false);
      return;
    }

    setDisplayText('');
    setIsComplete(false);

    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayText(message.slice(0, i));
      if (i >= message.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsComplete(true);
        completeTimerRef.current = setTimeout(() => {
          onComplete();
        }, 800);
      }
    }, 30);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [message]);

  const handleTap = useCallback(() => {
    if (!message) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);

    if (!isComplete) {
      setDisplayText(message);
      setIsComplete(true);
      completeTimerRef.current = setTimeout(() => onComplete(), 150);
    } else {
      onComplete();
    }
  }, [message, isComplete, onComplete]);

  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleTap}
          className="bg-black/80 text-white rounded-xl px-4 py-3 min-h-[56px] flex items-center cursor-pointer select-none"
        >
          <p className="text-sm leading-relaxed flex-1">
            {displayText}
            {!isComplete && <span className="animate-pulse ml-0.5">▌</span>}
          </p>
          {isComplete && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="text-xs text-white/60 ml-2"
            >
              ▼
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
