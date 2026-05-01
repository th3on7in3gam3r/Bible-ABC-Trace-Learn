/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Check, Undo2, Redo2 } from 'lucide-react';
import { useTracingCanvas } from '../hooks/useTracingCanvas';
import type { DifficultyLevel } from '../types';

interface SentenceTracerProps {
  sentence: string;
  onComplete: () => void;
  difficulty?: DifficultyLevel;
  soundVolume?: number;
  soundEnabled?: boolean;
  voiceEnabled?: boolean;
  darkMode?: boolean;
}

export default function SentenceTracer({
  sentence,
  onComplete,
  difficulty = 'medium',
  soundVolume = 0.5,
  soundEnabled = true,
  voiceEnabled = true,
  darkMode = false,
}: SentenceTracerProps) {
  const [isFinished, setIsFinished] = useState(false);

  const renderTemplate = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    let fontSize = height * 0.6;
    ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    let textWidth = ctx.measureText(sentence).width;

    const maxWidth = width * 0.85;
    if (textWidth > maxWidth) {
      fontSize = (maxWidth / textWidth) * fontSize;
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
      textWidth = ctx.measureText(sentence).width;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = darkMode ? '#334155' : '#e2e8f0';
    ctx.strokeText(sentence, width / 2, height / 2);

    ctx.fillStyle = darkMode ? '#1e293b' : '#f8fafc';
    ctx.globalAlpha = 0.55;
    ctx.fillText(sentence, width / 2, height / 2);
    ctx.globalAlpha = 1;
  }, [sentence, darkMode]);

  const generateTargetPoints = useCallback((width: number, height: number) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return [];

    let fontSize = height * 0.6;
    ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    let textWidth = ctx.measureText(sentence).width;
    const maxWidth = width * 0.85;
    if (textWidth > maxWidth) {
      fontSize = (maxWidth / textWidth) * fontSize;
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sentence, width / 2, height / 2);

    const imageData = ctx.getImageData(0, 0, width, height).data;
    const points: { x: number; y: number; hit: boolean }[] = [];
    const step = 24;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const alpha = imageData[(y * width + x) * 4 + 3];
        if (alpha > 60) {
          points.push({ x, y, hit: false });
        }
      }
    }
    return points;
  }, [sentence]);

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
  });

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      reset();
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef, reset]);

  const handleReset = useCallback(() => {
    setIsFinished(false);
    reset();
  }, [reset]);

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-2xl">
      <div className="relative w-full aspect-[2/1] bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border-4 sm:border-8 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden cursor-crosshair transition-colors">
        <div className="absolute inset-0 pointer-events-none z-0">
          {targetPointsState.map((pt, i) => (
            <motion.div
              key={`${pt.x}-${pt.y}-${i}`}
              initial={false}
              animate={{
                scale: pt.hit ? [1, 1.2, 1] : [1, 1.3, 1],
                opacity: pt.hit ? 0.6 : [0.15, 0.35, 0.15],
                backgroundColor: pt.hit ? '#3b82f6' : ['#64748b', '#94a3b8', '#64748b'],
                boxShadow: pt.hit ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none',
              }}
              transition={{
                scale: {
                  repeat: Infinity,
                  duration: pt.hit ? 0.4 : 3,
                  delay: pt.hit ? 0 : (pt.x * 0.0015),
                  ease: 'easeInOut',
                },
                opacity: {
                  repeat: Infinity,
                  duration: 3,
                  delay: pt.x * 0.0015,
                },
                backgroundColor: {
                  repeat: Infinity,
                  duration: 4,
                  delay: pt.x * 0.0015,
                },
                duration: 0.3,
              }}
              style={{
                position: 'absolute',
                left: `${pt.x}px`,
                top: `${pt.y}px`,
                width: pt.hit ? '8px' : '4px',
                height: pt.hit ? '8px' : '4px',
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
                animate={{ scale: 1.2, opacity: 0, rotate: 45, y: -10 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: 'absolute',
                  left: `${p.x}px`,
                  top: `${p.y}px`,
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#93c5fd',
                  borderRadius: '1px',
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
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
                width: '60px',
                height: '60px',
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
          Trace the Sentence
          {coverage > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-white ${isReady ? 'bg-green-500' : 'bg-blue-400'}`}>
              {Math.round(coverage)}%
            </span>
          )}
          {voiceEnabled && (
            <button
              type="button"
              onClick={() => {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance(sentence);
                  utterance.rate = 0.85;
                  utterance.pitch = 1.05;
                  utterance.volume = soundVolume;
                  window.speechSynthesis.speak(utterance);
                }
              }}
              className="ml-2 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Listen
            </button>
          )}
        </div>

        <canvas
          ref={canvasRef}
          className="relative z-10 w-full h-full touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
          onPointerCancel={endDrawing}
        />

        {!isDrawing && !isFinished && (
          <div className="absolute inset-x-0 bottom-6 sm:bottom-12 flex justify-center pointer-events-none z-10">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="bg-slate-800 dark:bg-slate-700 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg">
              Start Here
            </motion.div>
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
      </div>

      <div className="flex gap-3 sm:gap-4 w-full h-16 sm:h-20">
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleReset} className="w-16 sm:w-20 bg-slate-100 dark:bg-slate-800 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0" title="Reset">
            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-slate-500" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={undo} className="w-16 sm:w-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shrink-0" title="Undo">
            <Undo2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-slate-400" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={redo} className="w-16 sm:w-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shrink-0" title="Redo">
            <Redo2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-slate-400" />
          </motion.button>
        </div>

        <motion.button whileHover={isReady ? { scale: 1.02, y: -2 } : {}} whileTap={isReady ? { scale: 0.98, y: 0 } : {}} onClick={() => {
          if (isReady && !isFinished) {
            setIsFinished(true);
            playSoundEffect('magic');
            onComplete();
          }
        }} className={`flex-1 h-16 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 shadow-lg transition-all ${isReady ? 'bg-green-500 text-white border-green-700 shadow-green-200 dark:shadow-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'}`}>
          <span className="font-black text-sm sm:text-xl uppercase tracking-widest mr-2 sm:mr-4">{isReady ? 'Finish' : 'Keep Tracing!'}</span>
          <Check className={`w-6 h-6 sm:w-8 sm:h-8 stroke-[4] ${isReady ? 'animate-bounce' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
}
