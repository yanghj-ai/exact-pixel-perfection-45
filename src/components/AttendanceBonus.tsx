import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceBonusProps {
  show: boolean;
  consecutiveDays: number;
  bonusFood: number;
  bonusExp: number;
  onClose: () => void;
}

const AttendanceBonus = React.forwardRef<HTMLDivElement, AttendanceBonusProps>(function AttendanceBonus({ show, consecutiveDays, bonusFood, bonusExp, onClose }, ref) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          className="glass-card p-6 mx-6 max-w-sm w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-5xl mb-3"
          >
            🎁
          </motion.div>

          <h3 className="text-lg font-bold text-foreground mb-1">출석 보너스!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {consecutiveDays}일 연속 접속!
          </p>

          <div className="flex justify-center gap-6 mb-4">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-3xl">🍎</span>
              <span className="text-lg font-bold text-foreground">×{bonusFood}</span>
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-3xl">⚡</span>
              <span className="text-lg font-bold text-foreground">+{bonusExp}</span>
            </motion.div>
          </div>

          {/* 7-day streak indicator */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  day <= (consecutiveDays % 7 || 7)
                    ? 'gradient-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {day === 7 ? '🎉' : day}
              </div>
            ))}
          </div>

          {consecutiveDays % 7 === 0 && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="text-sm font-bold text-primary mb-3"
            >
              🔥 7일 연속 보너스! 보상 2배!
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-full rounded-2xl py-3 text-sm font-semibold gradient-primary text-primary-foreground"
          >
            받기! 🎉
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default AttendanceBonus;
