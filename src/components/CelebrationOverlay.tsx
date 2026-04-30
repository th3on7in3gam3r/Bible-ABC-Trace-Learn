/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Heart, CheckCircle2, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CelebrationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  badgeCount: number;
}

export default function CelebrationOverlay({ isOpen, onClose, userName, badgeCount }: CelebrationOverlayProps) {
  React.useEffect(() => {
    if (isOpen) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-slate-900/90 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-4xl rounded-[40px] sm:rounded-[60px] overflow-hidden relative shadow-2xl"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <div className="grid grid-cols-6 gap-8 p-12">
                {Array.from({ length: 24 }).map((_, i) => (
                  <Star key={i} className="w-12 h-12" />
                ))}
              </div>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8 sm:p-16 flex flex-col items-center text-center space-y-8 sm:space-y-12">
              {/* Trophy Header */}
              <div className="relative">
                <motion.div
                  animate={{ 
                    rotate: [0, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="bg-yellow-400 p-8 sm:p-12 rounded-full shadow-xl ring-8 sm:ring-16 ring-yellow-50"
                >
                  <Trophy className="w-16 h-16 sm:w-24 sm:h-24 text-white" strokeWidth={2.5} />
                </motion.div>
                
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-4 -right-4"
                >
                  <Star className="w-12 h-12 text-yellow-400 fill-yellow-400" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                  className="absolute -bottom-2 -left-6"
                >
                  <Heart className="w-10 h-10 text-red-400 fill-red-400" />
                </motion.div>
              </div>

              {/* Text Content */}
              <div className="space-y-4 sm:space-y-6 max-w-2xl">
                <h2 className="text-4xl sm:text-7xl font-black text-slate-800 tracking-tight leading-none">
                  AMAZING JOB, <br/>
                  <span className="text-blue-600 uppercase">{userName}!</span>
                </h2>
                
                <div className="h-2 w-24 bg-blue-500 mx-auto rounded-full" />

                <p className="text-xl sm:text-2xl text-slate-500 font-medium italic px-4">
                  "I have fought the good fight, I have finished the race, I have kept the faith."
                </p>
                <p className="text-blue-500 font-black text-xs sm:text-base uppercase tracking-[0.3em]">
                  2 Timothy 4:7
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
                {[
                  { label: "Letters Learned", value: "26/26", icon: CheckCircle2, color: "text-green-500" },
                  { label: "Badges Earned", value: `${badgeCount}`, icon: Heart, color: "text-red-500" },
                  { label: "Words Mastered", value: "26/26", icon: Star, color: "text-amber-500" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + (i * 0.1) }}
                    className="bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100"
                  >
                    <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                    <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="bg-blue-600 text-white px-12 py-5 rounded-3xl font-black text-xl uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                Keep Exploring!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
