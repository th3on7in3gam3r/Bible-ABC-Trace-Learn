/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useRef, useEffect, useState, useCallback} from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {RotateCcw, Check, Undo2, Redo2} from 'lucide-react';

interface SentenceTracerProps {
  sentence: string;
  onComplete: () => void;
  difficulty?: 'easy' | 'medium' | 'hard';
  soundVolume?: number;
  darkMode?: boolean;
}

export default function SentenceTracer({
  sentence, 
  onComplete, 
  difficulty = 'medium', 
  soundVolume = 0.5,
  darkMode = false
}: SentenceTracerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [targetPointsState, setTargetPointsState] = useState<{x: number, y: number, hit: boolean}[]>([]);
  const [particles, setParticles] = useState<{id: number, x: number, y: number}[]>([]);
  const [strokes, setStrokes] = useState<{x: number, y: number}[][]>([]);
  const [redoStack, setRedoStack] = useState<{x: number, y: number}[][]>([]);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const currentStrokeRef = useRef<{x: number, y: number}[]>([]);
  const particleIdRef = useRef(0);

  const DIFF_CONFIG = {
    easy: { lineWidth: 24, radius: 32, threshold: 50, dotPulse: 4.0 },
    medium: { lineWidth: 15, radius: 25, threshold: 60, dotPulse: 3.0 },
    hard: { lineWidth: 10, radius: 18, threshold: 75, dotPulse: 2.0 },
  };

  const config = DIFF_CONFIG[difficulty];

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
  
  const calculateTargetPoints = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a temporary canvas to measure and extract points
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Calculate dynamic font size to fit the sentence
    let fontSize = canvas.height * 0.6;
    ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    let textWidth = ctx.measureText(sentence).width;
    
    // Scale down if it exceeds 85% of canvas width
    const maxWidth = canvas.width * 0.85;
    if (textWidth > maxWidth) {
      fontSize = (maxWidth / textWidth) * fontSize;
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sentence, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
    const points: {x: number, y: number, hit: boolean}[] = [];
    const step = 20; // Granularity for sentences

    for (let y = 0; y < tempCanvas.height; y += step) {
      for (let x = 0; x < tempCanvas.width; x += step) {
        const alpha = imageData[(y * tempCanvas.width + x) * 4 + 3];
        if (alpha > 50) {
          points.push({ x, y, hit: false });
        }
      }
    }
    setTargetPointsState(points);
    setCoverage(0);
  }, [sentence]);

  const drawTemplate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    // Calculate dynamic font size to fit the sentence
    let fontSize = height * 0.6;
    ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    let textWidth = ctx.measureText(sentence).width;
    
    // Scale down if it exceeds 85% of canvas width
    const maxWidth = width * 0.85;
    if (textWidth > maxWidth) {
      fontSize = (maxWidth / textWidth) * fontSize;
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = darkMode ? '#334155' : '#f1f5f9'; // slate-700 or slate-100
    ctx.strokeText(sentence, width / 2, height / 2);
    
    ctx.fillStyle = darkMode ? '#1e293b' : '#f8fafc'; // slate-800 or slate-50
    ctx.globalAlpha = 0.5;
    ctx.fillText(sentence, width / 2, height / 2);
    ctx.globalAlpha = 1.0;
  }, [sentence, darkMode]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        drawTemplate();
        calculateTargetPoints();
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [drawTemplate, calculateTargetPoints]);

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
        if (isDrawing) addParticle(x, y); // Only add particles when actually drawing
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
      ctx.strokeStyle = darkMode ? '#60a5fa' : '#3b82f6';
      ctx.shadowBlur = 10;
      ctx.shadowColor = darkMode ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.5)';

      stroke.forEach(pos => {
        ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
    });

    // Bulk update hit points
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
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
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
    setIsFinished(false);
  };

  const isReady = coverage >= config.threshold; // Adjust threshold by difficulty

  useEffect(() => {
    if (isReady && hasStarted) {
      // Small delay so it doesn't sound exactly when the last point is hit
      const t = setTimeout(() => playSoundEffect('success'), 100);
      return () => clearTimeout(t);
    }
  }, [isReady, hasStarted, playSoundEffect]);

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-2xl">
      <div className="relative w-full aspect-[2/1] bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border-4 sm:border-8 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-hidden cursor-crosshair transition-colors">
        {/* Animated Guiding Dots Overlay */}
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
                  delay: pt.hit ? 0 : (pt.x * 0.002),
                  ease: "easeInOut"
                },
                opacity: {
                  repeat: Infinity,
                  duration: 3,
                  delay: (pt.x * 0.002),
                },
                backgroundColor: {
                  repeat: Infinity,
                  duration: 4,
                  delay: (pt.x * 0.002),
                },
                duration: 0.3
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

          {/* Sparkle Particle Trail */}
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
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
                width: config.lineWidth * 3.5,
                height: config.lineWidth * 3.5,
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
          Trace the Word
          {coverage > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-white ${isReady ? 'bg-green-500' : 'bg-blue-400'}`}>
              {Math.round(coverage)}%
            </span>
          )}
        </div>
        
        <canvas
          ref={canvasRef}
          className="relative z-10 w-full h-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
        
        {!hasStarted && (
          <div className="absolute inset-x-0 bottom-6 sm:bottom-12 flex justify-center pointer-events-none z-10">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="bg-slate-800 dark:bg-slate-700 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg"
            >
              Start Here
            </motion.div>
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
        </div>
        
        <motion.button
          whileHover={isReady ? { scale: 1.02, y: -2 } : {}}
          whileTap={isReady ? { scale: 0.98, y: 0 } : {}}
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
            {isReady ? 'Finish Word' : 'Trace the word!'}
          </span>
          <Check className={`w-6 h-6 sm:w-8 sm:h-8 stroke-[4] ${isReady ? 'animate-bounce' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
}
