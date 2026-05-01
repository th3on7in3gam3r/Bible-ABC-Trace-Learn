/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { DifficultyLevel } from '../types';

interface AddProfileModalProps {
  isOpen: boolean;
  onAdd: (name: string, avatar: string, difficulty: DifficultyLevel) => void;
  onCancel: () => void;
}

const AVATARS = [
  { id: 'sheep',   emoji: '🐑', label: 'Sheep'   },
  { id: 'lion',    emoji: '🦁', label: 'Lion'    },
  { id: 'dove',    emoji: '🕊️', label: 'Dove'    },
  { id: 'fish',    emoji: '🐟', label: 'Fish'    },
  { id: 'star',    emoji: '⭐', label: 'Star'    },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow' },
  { id: 'sun',     emoji: '☀️', label: 'Sun'     },
  { id: 'heart',   emoji: '❤️', label: 'Heart'   },
  { id: 'angel',   emoji: '😇', label: 'Angel'   },
  { id: 'crown',   emoji: '👑', label: 'Crown'   },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly' },
  { id: 'turtle',  emoji: '🐢', label: 'Turtle'  },
];

const BG_COLORS = [
  'bg-amber-400',
  'bg-blue-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-orange-400',
];

export default function AddProfileModal({ isOpen, onAdd, onCancel }: AddProfileModalProps) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('sheep');
  const [selectedColor, setSelectedColor] = useState('bg-amber-400');
  const [step, setStep] = useState<'name' | 'avatar'>('name');

  const reset = () => {
    setName('');
    setSelectedAvatar('sheep');
    setSelectedColor('bg-amber-400');
    setStep('name');
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleAdd = () => {
    if (name.trim()) {
      // encode color into avatar string so we can use it later
      onAdd(name.trim(), `${selectedAvatar}|${selectedColor}`, 'easy');
      reset();
    }
  };

  const currentEmoji = AVATARS.find(a => a.id === selectedAvatar)?.emoji ?? '🐑';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Colorful top bar */}
            <div className={`${selectedColor} h-2 w-full`} />

            <div className="p-8 space-y-6">
              {/* Avatar preview */}
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  key={selectedAvatar + selectedColor}
                  initial={{ scale: 0.7, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className={`w-24 h-24 ${selectedColor} rounded-full flex items-center justify-center text-5xl shadow-lg ring-8 ring-white dark:ring-slate-900`}
                >
                  {currentEmoji}
                </motion.div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {step === 'name' ? 'Who is learning today?' : 'Pick your buddy!'}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {step === 'name' ? (
                  <motion.div
                    key="name-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('avatar')}
                      className="w-full text-center text-2xl font-black p-4 rounded-2xl border-4 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-blue-400 dark:text-white outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-700"
                      placeholder="My name is..."
                      maxLength={15}
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Back
                      </button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        disabled={!name.trim()}
                        onClick={() => setStep('avatar')}
                        className="flex-1 py-4 rounded-2xl bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                      >
                        Next →
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="avatar-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Emoji grid */}
                    <div className="grid grid-cols-6 gap-2">
                      {AVATARS.map(av => (
                        <motion.button
                          key={av.id}
                          type="button"
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setSelectedAvatar(av.id)}
                          className={`aspect-square rounded-2xl text-3xl flex items-center justify-center transition-all border-4 ${
                            selectedAvatar === av.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-110 shadow-md'
                              : 'border-transparent bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          title={av.label}
                        >
                          {av.emoji}
                        </motion.button>
                      ))}
                    </div>

                    {/* Color picker */}
                    <div className="flex justify-center gap-3 pt-1">
                      {BG_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          className={`w-8 h-8 rounded-full ${c} transition-all ${
                            selectedColor === c ? 'ring-4 ring-offset-2 ring-slate-400 scale-110' : 'opacity-60 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep('name')}
                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                      >
                        ← Back
                      </button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAdd}
                        className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-black uppercase text-xs tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-200 dark:shadow-none"
                      >
                        Let's Go! 🎉
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
