/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock } from 'lucide-react';

interface ParentGateProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ParentGate({ isOpen, onSuccess, onCancel }: ParentGateProps) {
  const [problem, setProblem] = useState({ a: 0, b: 0 });
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProblem({
        a: Math.floor(Math.random() * 8) + 2,
        b: Math.floor(Math.random() * 8) + 2
      });
      setAnswer('');
      setError(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(answer) === problem.a + problem.b) {
      onSuccess();
    } else {
      setError(true);
      setAnswer('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl border-4 border-slate-100"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-blue-500" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-2">Parents Only</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Solve this to continue</p>
            
            <div className="text-4xl font-black text-slate-800 mb-8 bg-slate-50 py-6 rounded-3xl border-2 border-slate-100">
              {problem.a} + {problem.b} = ?
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                autoFocus
                type="number"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className={`w-full text-center text-2xl font-black p-4 rounded-2xl border-4 outline-none transition-all ${error ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50 focus:border-blue-400'}`}
                placeholder="???"
              />
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 p-4 rounded-2xl bg-slate-100 text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 p-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-lg"
                >
                  Confirm
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
