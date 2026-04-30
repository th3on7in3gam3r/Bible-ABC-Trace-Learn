/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Bird, Cloud, Crown, Ship, Heart, Star, Sun, Baby, Cat, Dog, Fish, Rabbit } from 'lucide-react';

interface AddProfileModalProps {
  isOpen: boolean;
  onAdd: (name: string, avatar: string, difficulty: 'easy' | 'medium' | 'hard') => void;
  onCancel: () => void;
}

const AVATARS = [
  { id: 'bird', icon: Bird, label: 'Dove' },
  { id: 'cloud', icon: Cloud, label: 'Heavenly' },
  { id: 'crown', icon: Crown, label: 'Crown' },
  { id: 'ship', icon: Ship, label: 'Ark' },
  { id: 'heart', icon: Heart, label: 'Love' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'sun', icon: Sun, label: 'Creation' },
  { id: 'baby', icon: Baby, label: 'Baby' },
  { id: 'cat', icon: Cat, label: 'Cat' },
  { id: 'dog', icon: Dog, label: 'Dog' },
  { id: 'fish', icon: Fish, label: 'Fish' },
  { id: 'rabbit', icon: Rabbit, label: 'Rabbit' },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Beginner', desc: 'Thick lines, easy to trace' },
  { id: 'medium', label: 'Learner', desc: 'Normal lines, focus guided' },
  { id: 'hard', label: 'Master', desc: 'Thin lines, precise tracing' },
];

export default function AddProfileModal({ isOpen, onAdd, onCancel }: AddProfileModalProps) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('bird');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), selectedAvatar, difficulty);
      setName('');
      setSelectedAvatar('bird');
      setDifficulty('easy');
    }
  };

  const SelectedIcon = AVATARS.find(a => a.id === selectedAvatar)?.icon || Bird;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg p-8 sm:p-10 text-center shadow-2xl border-4 border-slate-100 dark:border-slate-800 my-8 transition-colors"
          >
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ring-8 ring-blue-50 dark:ring-blue-900/50">
              <SelectedIcon className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">New Buddy</h2>
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-8">Personalize your journey</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <p className="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">What is your name?</p>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-center text-xl font-bold p-4 rounded-2xl border-4 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:border-blue-400 dark:text-white outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-700"
                  placeholder="Type buddy name..."
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <p className="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Pick an Avatar</p>
                <div className="grid grid-cols-4 gap-3">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                        selectedAvatar === avatar.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <avatar.icon className="w-6 h-6" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">{avatar.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">How hard to trace?</p>
                <div className="grid grid-cols-3 gap-3">
                  {DIFFICULTIES.map((diff) => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setDifficulty(diff.id as any)}
                      className={`p-3 rounded-2xl border-2 transition-all text-left ${
                        difficulty === diff.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 shadow-sm' 
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <p className={`text-[10px] font-black uppercase tracking-widest ${difficulty === diff.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {diff.label}
                      </p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-medium leading-tight">{diff.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Let's Go!
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
