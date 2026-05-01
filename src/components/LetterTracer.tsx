/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Check, Volume2, Undo2, Redo2, Star } from 'lucide-react';
import { useTracingCanvas } from '../hooks/useTracingCanvas';
import type { DifficultyLevel } from '../types';

interface LetterTracerProps {
  letter: string;
  word: string;
  verse: string;
  isUppercase: boolean;
  onComplete: () => void;
  voiceRecording?: string;
  onRecord: () => void;
  difficulty?: DifficultyLevel;
  soundVolume?: number;
  soundEnabled?: boolean;
  voiceEnabled?: boolean;
  darkMode?: boolean;
}

export default function LetterTracer({
  letter,
  word,
  verse,
  isUppercase,
  onComplete,
  voiceRecording,
  onRecord,
  difficulty = 'medium',
  soundVolume = 0.5,
  soundEnabled = true,
  voiceEnabled = true,
  darkMode = false,
}: LetterTracerProps) {
  const [isFinished, setIsFinished] = useState(false);
  const [hasPlayedPhonetic, setHasPlayedPhonetic] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [stars, setStars] = useState(0);
  const [hasTriggeredCelebration, setHasTriggeredCelebration] = useState(false);

  const displayLetter = isUppercase ? letter.toUpperCase() : letter.toLowerCase();

  const renderTemplate = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, currentCoverage: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.font = `bold ${height * 0.8}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const guideAlpha = Math.max(0, 1 - currentCoverage / 100);
    ctx.globalAlpha = guideAlpha * (darkMode ? 0.12 : 0.18);
    ctx.fillStyle = darkMode ? '#fbbf24' : '#fde68a';
    ctx.fillText(displayLetter, width / 2, height / 2 + height * 0.05);

    ctx.globalAlpha = guideAlpha * (darkMode ? 0.25 : 0.35);
    ctx.strokeStyle = darkMode ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 9]);
    ctx.strokeText(displayLetter, width / 2, height / 2 + height * 0.05);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }, [displayLetter, darkMode]);

  const generateTargetPoints = useCallback((width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    ctx.font = `bold ${canvas.height * 0.8}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayLetter, canvas.width / 2, canvas.height / 2 + canvas.height * 0.05);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const points: { x: number; y: number; hit: boolean }[] = [];
    const step = 25;

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alpha = imageData[(y * canvas.width + x) * 4 + 3];
        if (alpha > 50) {
          points.push({ x, y, hit: false });
        }
      }
    }
    return points;
  }, [displayLetter]);

  const handleReadyChange = useCallback((ready: boolean) => {
    if (ready && !hasPlayedPhonetic && voiceEnabled) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const text = `${letter.toUpperCase()}... ${word}... ${verse}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.75;
        utterance.pitch = 1.2;
        utterance.volume = soundVolume;
        window.speechSynthesis.speak(utterance);
      }
      setHasPlayedPhonetic(true);
    }
  }, [hasPlayedPhonetic, letter, word, verse, soundVolume, voiceEnabled]);

  const {
    canvasRef,
    coverage,
    isReady,
    targetPointsState,
    particles,
    cursorPos,
    isDrawing,
    startDrawing,
    draw,
    endDrawing,
    reset,
    undo,
    redo,
    playSoundEffect,
  } = useTracingCanvas({
    difficulty,
    darkMode,
    soundVolume,
    soundEnabled,
    renderTemplate,
    generateTargetPoints,
    onReadyChange: handleReadyChange,
  });

  useEffect(() => {
    setShowBanner(false);
    setStars(0);
    setHasTriggeredCelebration(false);
    setHasPlayedPhonetic(false);
  }, [displayLetter, word, verse]);

  useEffect(() => {
    if (coverage >= 80 && !hasTriggeredCelebration && isDrawing) {
      setHasTriggeredCelebration(true);
      const earnedStars = coverage >= 95 ? 3 : coverage >= 90 ? 2 : 1;
      setStars(earnedStars);
      setShowBanner(true);
      playSoundEffect('magic');
      setTimeout(() => setShowBanner(false), 3500);
    }
  }, [coverage, hasTriggeredCelebration, isDrawing, playSoundEffect]);

  const handleReset = useCallback(() => {
    reset();
    setShowBanner(false);
    setStars(0);
    setHasTriggeredCelebration(false);
    setIsFinished(false);
    setHasPlayedPhonetic(false);
  }, [reset]);

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-xl">
      <div className="flex items-center gap-3">
        {[1, 2, 3].map(n => (
          <motion.div
            key={n}
            initial={false}
            animate={stars >= n ? { scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: (n - 1) * 0.15 }}
          >
            <Star className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-300 ${stars >= n ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-200 dark:text-slate-700'}`} />
          </motion.div>
        ))}
      </div>

      <div className="relative w-full aspect-square bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border-4 sm:border-8 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-hidden cursor-crosshair transition-colors">
        <div className="absolute inset-0 pointer-events-none z-0">
          {targetPointsState.map((pt, i) => (
            <motion.div
              key={`${pt.x}-${pt.y}-${i}`}
              initial={false}
              animate={{
                scale: pt.hit ? [1, 1.2, 1.1] : [1, 1.3, 1],
                opacity: pt.hit ? 0.7 : [0.2, 0.4, 0.2],
                backgroundColor: pt.hit ? '#3b82f6' : ['#64748b', '#94a3b8', '#64748b'],
                boxShadow: pt.hit ? '0 0 12px rgba(59, 130, 246, 0.6)' : 'none',
              }}
              transition={{
                scale: {
                  repeat: Infinity,
                  duration: pt.hit ? 0.4 : 3,
                  delay: pt.hit ? 0 : (pt.x + pt.y) * 0.003,
                  ease: 'easeInOut',
                },
                opacity: {
                  repeat: Infinity,
                  duration: 3,
                  delay: (pt.x + pt.y) * 0.003,
                },
                backgroundColor: {
                  repeat: Infinity,
                  duration: 4,
                  delay: (pt.x + pt.y) * 0.003,
                },
                duration: 0.3,
              }}
              style={{
                position: 'absolute',
                left: `${(pt.x / 500) * 100}%`,
                top: `${(pt.y / 500) * 100}%`,
                width: pt.hit ? '10px' : '6px',
                height: pt.hit ? '10px' : '6px',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ scale: 0.5, opacity: 1, rotate: 0 }}
                animate={{ scale: 1.5, opacity: 0, rotate: 180, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                style={{
                  position: 'absolute',
                  left: `${(p.x / 500) * 100}%`,
                  top: `${(p.y / 500) * 100}%`,
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#60a5fa',
                  borderRadius: '2px',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </AnimatePresence>

          {isDrawing && cursorPos && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                left: `${(cursorPos.x / 500) * 100}%`,
                top: `${(cursorPos.y / 500) * 100}%`,
                width:  `${24 * 2.5}px`,
                height: `${24 * 2.5}px`,
                background: darkMode ? 'radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(96, 165, 250, 0) 70%)' : 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0) 70%)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            />
          )}
        </div>

        <div className="absolute top-2 sm:top-4 bg-white dark:bg-slate-900 px-3 sm:px-4 text-slate-300 dark:text-slate-600 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] z-10 flex items-center gap-2 transition-colors">
          Trace the Letter
          {coverage > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-white ${isReady ? 'bg-green-500' : 'bg-blue-400'}`}>
              {Math.round(coverage)}%
            </span>
          )}
        </div>

        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className="w-full h-full touch-none z-0"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
          onPointerCancel={endDrawing}
        />

        {coverage === 0 && !isDrawing && (
          <div className="absolute inset-x-0 bottom-8 sm:bottom-12 flex justify-center pointer-events-none z-10">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="bg-slate-800 dark:bg-slate-700 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg">
              Start Here ✏️
            </motion.div>
          </div>
        )}

        {coverage > 0 && (
          <div className="absolute bottom-4 right-4 w-12 h-12 pointer-events-none">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * coverage) / 100} className={`${isReady ? 'text-green-500' : 'text-blue-500'} transition-all duration-300`} />
            </svg>
          </div>
        )}

        {isFinished && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[32px] sm:rounded-[40px]">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl sm:text-6xl font-black text-green-500 drop-shadow-lg text-center tracking-widest uppercase">
              Complete!
              <br />
              <span className="text-2xl sm:text-4xl">🌟</span>
            </motion.div>
          </motion.div>
        )}

        <AnimatePresence>
          {showBanner && (
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.9 }} transition={{ type: 'spring', bounce: 0.4 }} className="absolute inset-x-4 bottom-16 sm:bottom-20 z-50 pointer-events-none">
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-3xl px-6 py-4 shadow-2xl text-center">
                <p className="text-lg sm:text-2xl font-black tracking-tight leading-tight">Wonderful! 🎉</p>
                <p className="text-sm sm:text-base font-bold opacity-90 mt-0.5">{letter.toUpperCase()} is for <span className="font-black">{word}</span>!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-3 sm:gap-4 w-full h-16 sm:h-20">
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleReset} className="w-16 sm:w-20 bg-slate-100 dark:bg-slate-800 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0" title="Reset">
            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-slate-500" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={undo} disabled={targetPointsState.length === 0} className={`w-16 sm:w-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 transition-all shrink-0 ${targetPointsState.length === 0 ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-900 opacity-40 cursor-not-allowed' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`} title="Undo">
            <Undo2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-slate-400" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={redo} disabled={false} className="w-16 sm:w-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 transition-all shrink-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700" title="Redo">
            <Redo2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-slate-400" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const text = `${letter.toUpperCase()}... ${word}... ${verse}`; const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 0.75; utterance.pitch = 1.2; utterance.volume = soundVolume; window.speechSynthesis.speak(utterance);} }} className="w-16 sm:w-20 bg-blue-50 dark:bg-blue-900/40 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800 transition-all shrink-0" title="Read aloud">
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 dark:text-blue-500" />
          </motion.button>
        </div>

        <motion.button whileHover={isReady ? { scale: 1.02, y: -2 } : {}} whileTap={isReady ? { scale: 0.98, y: 0 } : {}} onClick={() => { if (isReady && !isFinished) { setIsFinished(true); playSoundEffect('magic'); onComplete(); } }} className={`flex-1 h-16 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 shadow-lg transition-all ${isReady ? 'bg-green-500 text-white border-green-700 shadow-green-200 dark:shadow-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'}`}>
          <span className="font-black text-sm sm:text-xl uppercase tracking-widest mr-2 sm:mr-4">{isReady ? 'Finish' : 'Keep Tracing!'}</span>
          <Check className={`w-6 h-6 sm:w-8 sm:h-8 stroke-[4] ${isReady ? 'animate-bounce' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
}
