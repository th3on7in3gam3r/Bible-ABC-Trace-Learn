/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useRef, useEffect, useState, useCallback} from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {RotateCcw, Check, Volume2, Undo2, Redo2} from 'lucide-react';

interface LetterTracerProps {
  letter: string;
  isUppercase: boolean;
  onComplete: () => void;
  voiceRecording?: string;
  onRecord: () => void;
  difficulty?: 'easy' | 'medium' | 'hard';
  soundVolume?: number;
  darkMode?: boolean;
}

export default function LetterTracer({
  letter,
  isUppercase,
  onComplete,
  voiceRecording,
  onRecord,
  difficulty = 'medium',
  soundVolume = 0.5,
  darkMode = false,
}: LetterTracerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [hasPlayedPhonetic, setHasPlayedPhonetic] = useState(false);
  const [targetPointsState, setTargetPointsState] = useState<{x: number, y: number, hit: boolean}[]>([]);
  const [particles, setParticles] = useState<{id: number, x: number, y: number}[]>([]);
  const [strokes, setStrokes] = useState<{x: number, y: number}[][]>([]);
  const [redoStack, setRedoStack] = useState<{x: number, y: number}[][]>([]);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const currentStrokeRef = useRef<{x: number, y: number}[]>([]);
  const particleIdRef = useRef(0);

  const DIFF_CONFIG = {
    easy: { lineWidth: 36, radius: 45, threshold: 60, dotPulse: 3.5 },
    medium: { lineWidth: 24, radius: 30, threshold: 75, dotPulse: 2.5 },
    hard: { lineWidth: 16, radius: 20, threshold: 85, dotPulse: 1.5 },
  };

  const config = DIFF_CONFIG[difficulty];
  
  const displayLetter = isUppercase ? letter.toUpperCase() : letter.toLowerCase();

  const playSoundEffect = useCallback((type: 'start' | 'success' | 'magic') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      
      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.linearRampToValueAtTime(soundVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.05);
        gain.gain.linearRampToValueAtTime(soundVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'magic') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        gain.gain.linearRampToValueAtTime(soundVolume * 0.5, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch(e) {
      console.error("Audio playback failed", e);
    }
  }, [soundVolume]);

  const playPhoneticSound = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();

    const phonetics: Record<string, string> = {
      'A': 'A says ah', 'B': 'B says buh', 'C': 'C says cuh', 'D': 'D says duh',
      'E': 'E says eh', 'F': 'F says fuh', 'G': 'G says guh', 'H': 'H says huh',
      'I': 'I says ih', 'J': 'J says juh', 'K': 'K says kuh', 'L': 'L says luh',
      'M': 'M says muh', 'N': 'N says nuh', 'O': 'O says oh', 'P': 'P says puh',
      'Q': 'Q says quuh', 'R': 'R says ruh', 'S': 'S says sss', 'T': 'T says tuh',
      'U': 'U says uh', 'V': 'V says vuh', 'W': 'W says wuh', 'X': 'X says ks',
      'Y': 'Y says yuh', 'Z': 'Z says zuh'
    };

    const text = phonetics[letter.toUpperCase()] || `${letter} says its own sound`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8; // Slightly slower for clarity
    utterance.pitch = 1.2; // Slightly higher/friendlier pitch
    window.speechSynthesis.speak(utterance);
  }, [letter]);

  const calculateTargetPoints = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `bold ${canvas.height * 0.8}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayLetter, canvas.width / 2, canvas.height / 2 + canvas.height * 0.05);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const points: {x: number, y: number, hit: boolean}[] = [];
    const step = 25; // Slightly larger step for better performance and clear dots

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alpha = imageData[(y * canvas.width + x) * 4 + 3];
        if (alpha > 50) {
          points.push({ x, y, hit: false });
        }
      }
    }
    setTargetPointsState(points);
    setCoverage(0);
  }, [displayLetter]);

  const drawTemplate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    // Draw background dashed letter
    ctx.font = `bold ${height * 0.8}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Shadow/Outline guide
    ctx.strokeStyle = darkMode ? '#334155' : '#e5e7eb'; // Slate 700 or Gray 200
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 10]);
    ctx.strokeText(displayLetter, width / 2, height / 2 + height * 0.05);
    
    // Fill subtle
    ctx.fillStyle = darkMode ? '#1e293b' : '#f9fafb';
    ctx.fillText(displayLetter, width / 2, height / 2 + height * 0.05);
    
    ctx.setLineDash([]);
  }, [displayLetter, darkMode]);

  useEffect(() => {
    drawTemplate();
    calculateTargetPoints();
    setHasPlayedPhonetic(false); // Reset when letter changes
  }, [drawTemplate, calculateTargetPoints]);

  const isReady = coverage >= config.threshold;

  useEffect(() => {
    if (isReady && !hasPlayedPhonetic) {
      playSoundEffect('success');
      playPhoneticSound();
      setHasPlayedPhonetic(true);
    }
  }, [isReady, hasPlayedPhonetic, playPhoneticSound, playSoundEffect]);

  const addParticle = (x: number, y: number) => {
    const id = particleIdRef.current++;
    setParticles(prev => [...prev.slice(-15), { id, x, y }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  const updateCoverage = (x: number, y: number) => {
    const radius = config.radius;
    let hitSomething = false;

    setTargetPointsState(prev => {
      const next = prev.map(pt => {
        if (!pt.hit) {
          const dx = pt.x - x;
          const dy = pt.y - y;
          if (dx * dx + dy * dy < radius * radius) {
            hitSomething = true;
            return { ...pt, hit: true };
          }
        }
        return pt;
      });

      if (hitSomething) {
        const hitCount = next.filter(pt => pt.hit).length;
        setCoverage((hitCount / next.length) * 100);
        if (isDrawing) addParticle(x, y); // Only add particle trail when actual drawing
      }
      return next;
    });
  };

  const redrawFromStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset hit states and coverage
    setTargetPointsState(prev => prev.map(pt => ({ ...pt, hit: false })));
    setCoverage(0);
    drawTemplate();

    // Redraw all strokes
    strokes.forEach(stroke => {
      if (stroke.length === 0) return;
      
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = config.lineWidth;
      ctx.strokeStyle = darkMode ? '#60a5fa' : '#3b82f6'; // Brighter blue for dark mode
      ctx.shadowBlur = 10;
      ctx.shadowColor = darkMode ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.5)';

      stroke.forEach(pos => {
        ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
    });

    // Bulk update hit points for coverage calculation
    setTargetPointsState(prev => {
      const next = prev.map(pt => {
        let hit = false;
        strokes.forEach(stroke => {
          stroke.forEach(pos => {
            const dx = pt.x - pos.x;
            const dy = pt.y - pos.y;
            if (dx * dx + dy * dy < config.radius * config.radius) {
              hit = true;
            }
          });
        });
        return { ...pt, hit };
      });
      const hitCount = next.filter(pt => pt.hit).length;
      setCoverage((hitCount / next.length) * 100);
      return next;
    });
  }, [strokes, drawTemplate, config.lineWidth, config.radius, darkMode]);

  useEffect(() => {
    redrawFromStrokes();
  }, [redrawFromStrokes]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setCursorPos(pos);
    currentStrokeRef.current = [pos];
    if (!hasStarted) {
      playSoundEffect('start');
    }
    setHasStarted(true);
    updateCoverage(pos.x, pos.y);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = config.lineWidth;
      ctx.strokeStyle = darkMode ? '#60a5fa' : '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.shadowColor = darkMode ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.5)';
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    setCursorPos(pos);
    currentStrokeRef.current.push(pos);
    updateCoverage(pos.x, pos.y);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const endDrawing = () => {
    if (isDrawing && currentStrokeRef.current.length > 0) {
      const completedStroke = [...currentStrokeRef.current];
      setStrokes(prev => [...prev, completedStroke]);
      setRedoStack([]);
      currentStrokeRef.current = [];
    }
    setIsDrawing(false);
    setCursorPos(null);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return {x: 0, y: 0};
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, last]);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setStrokes(prev => [...prev, last]);
  };

  const reset = () => {
    setStrokes([]);
    setRedoStack([]);
    currentStrokeRef.current = [];
    drawTemplate();
    setHasStarted(false);
    setTargetPointsState(prev => prev.map(pt => ({ ...pt, hit: false })));
    setCoverage(0);
    setHasPlayedPhonetic(false);
    setIsFinished(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-xl">
      <div className="relative w-full aspect-square bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border-4 sm:border-8 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-hidden cursor-crosshair transition-colors">
        {/* Animated Guiding Dots Overlay */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {targetPointsState.map((pt, i) => (
            <motion.div
              key={`${pt.x}-${pt.y}-${i}`}
              initial={false}
              animate={{
                scale: pt.hit ? [1, 1.2, 1.1] : [1, 1.3, 1],
                opacity: pt.hit ? 0.7 : [0.2, 0.4, 0.2],
                backgroundColor: pt.hit ? '#3b82f6' : ['#64748b', '#94a3b8', '#64748b'], // Shimmer effect
                boxShadow: pt.hit ? '0 0 12px rgba(59, 130, 246, 0.6)' : 'none',
              }}
              transition={{
                scale: {
                  repeat: Infinity,
                  duration: pt.hit ? 0.4 : 3,
                  delay: pt.hit ? 0 : (pt.x + pt.y) * 0.003,
                  ease: "easeInOut"
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
                duration: 0.3
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

          {/* Sparkle Particle Trail */}
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

          {/* Active Drawing Glow Aura */}
          {isDrawing && cursorPos && (
            <motion.div
              animate={{ 
                scale: [1, 1.4, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                left: `${(cursorPos.x / 500) * 100}%`,
                top: `${(cursorPos.y / 500) * 100}%`,
                width: config.lineWidth * 2.5,
                height: config.lineWidth * 2.5,
                background: darkMode 
                  ? 'radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(96, 165, 250, 0) 70%)'
                  : 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0) 70%)',
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
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          onTouchEndCapture={endDrawing}
        />
        
        {!hasStarted && (
          <div className="absolute inset-x-0 bottom-8 sm:bottom-12 flex justify-center pointer-events-none z-10">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="bg-slate-800 dark:bg-slate-700 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg"
            >
              Start Here
            </motion.div>
          </div>
        )}

          {/* Progress Ring Background */}
        {hasStarted && (
          <div className="absolute bottom-4 right-4 w-12 h-12 pointer-events-none">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="125.6"
                strokeDashoffset={125.6 - (125.6 * coverage) / 100}
                className={`${isReady ? 'text-green-500' : 'text-blue-500'} transition-all duration-300`}
              />
            </svg>
          </div>
        )}

        {/* Completion Overlay */}
        {isFinished && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[32px] sm:rounded-[40px]"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-4xl sm:text-6xl font-black text-green-500 drop-shadow-lg text-center tracking-widest uppercase"
            >
              Complete!
              <br />
              <span className="text-2xl sm:text-4xl">🌟</span>
            </motion.div>
          </motion.div>
        )}
      </div>

      <div className="flex gap-3 sm:gap-4 w-full h-16 sm:h-20">
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={reset}
            className="w-16 sm:w-20 bg-slate-100 dark:bg-slate-800 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-slate-500" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={undo}
            disabled={strokes.length === 0}
            className={`w-16 sm:w-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 transition-all shrink-0 ${
              strokes.length === 0 
                ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-900 opacity-40 cursor-not-allowed' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title="Undo"
          >
            <Undo2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-slate-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={redo}
            disabled={redoStack.length === 0}
            className={`w-16 sm:w-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 transition-all shrink-0 ${
              redoStack.length === 0 
                ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-900 opacity-40 cursor-not-allowed' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title="Redo"
          >
            <Redo2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-slate-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={playPhoneticSound}
            className="w-16 sm:w-20 bg-blue-50 dark:bg-blue-900/40 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800 transition-all shrink-0"
            title="Play Sound"
          >
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 dark:text-blue-500" />
          </motion.button>
        </div>
        
        <motion.button
          whileHover={isReady ? { scale: 1.02, y: -2 } : {}}
          whileTap={isReady ? { scale: 0.98, y: 0 } : {}}
          animate={isReady ? { 
            scale: [1, 1.02, 1],
            boxShadow: [
              "0 10px 15px -3px rgba(34, 197, 94, 0.3)",
              "0 20px 25px -5px rgba(34, 197, 94, 0.4)",
              "0 10px 15px -3px rgba(34, 197, 94, 0.3)"
            ]
          } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          onClick={() => {
            if (isReady && !isFinished) {
              setIsFinished(true);
              playSoundEffect('magic');
              onComplete();
            }
          }}
          className={`flex-1 h-16 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-b-4 sm:border-b-8 shadow-lg group transition-all ${
            isReady 
              ? 'bg-green-500 text-white border-green-700 shadow-green-200 dark:shadow-none' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          <span className="font-black text-sm sm:text-xl uppercase tracking-widest mr-2 sm:mr-4">
            {isReady ? 'Finish' : 'Keep Tracing!'}
          </span>
          <Check className={`w-6 h-6 sm:w-8 sm:h-8 stroke-[4] ${isReady ? 'animate-bounce' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
}
