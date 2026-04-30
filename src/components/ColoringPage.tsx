/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, Palette } from 'lucide-react';

interface ColoringPageProps {
  letter: string;
  word: string;
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

// Palette of warm, kid-friendly colors
const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#ffffff', // white (eraser-ish)
  '#1e293b', // dark (outline color)
];

// Simple SVG-based illustrations per letter (paths drawn on a 200x200 grid)
// Each entry: array of {d, fill} — outline shapes the child colors in
const ILLUSTRATIONS: Record<string, { shapes: { d: string; defaultFill: string; label: string }[]; bg: string }> = {
  A: {
    bg: '#fef9c3',
    shapes: [
      { label: 'body', defaultFill: '#fde68a', d: 'M100 20 L160 160 L40 160 Z' },
      { label: 'crossbar', defaultFill: '#fbbf24', d: 'M65 110 L135 110 L135 125 L65 125 Z' },
      { label: 'ground', defaultFill: '#86efac', d: 'M20 165 L180 165 L180 180 L20 180 Z' },
    ],
  },
  B: {
    bg: '#eff6ff',
    shapes: [
      { label: 'stem', defaultFill: '#93c5fd', d: 'M50 30 L80 30 L80 170 L50 170 Z' },
      { label: 'top bump', defaultFill: '#60a5fa', d: 'M80 30 Q150 30 150 80 Q150 100 80 100 Z' },
      { label: 'bottom bump', defaultFill: '#3b82f6', d: 'M80 100 Q160 100 160 135 Q160 170 80 170 Z' },
    ],
  },
  C: {
    bg: '#f0fdf4',
    shapes: [
      { label: 'arc', defaultFill: '#86efac', d: 'M150 50 Q60 50 60 100 Q60 150 150 150 L150 135 Q80 135 80 100 Q80 65 150 65 Z' },
    ],
  },
  D: {
    bg: '#fdf4ff',
    shapes: [
      { label: 'stem', defaultFill: '#d8b4fe', d: 'M50 30 L80 30 L80 170 L50 170 Z' },
      { label: 'curve', defaultFill: '#a855f7', d: 'M80 30 Q170 30 170 100 Q170 170 80 170 Z' },
    ],
  },
  default: {
    bg: '#fef3c7',
    shapes: [
      { label: 'star', defaultFill: '#fbbf24', d: 'M100 30 L112 70 L155 70 L122 93 L134 133 L100 110 L66 133 L78 93 L45 70 L88 70 Z' },
      { label: 'ground', defaultFill: '#86efac', d: 'M20 165 L180 165 L180 180 L20 180 Z' },
    ],
  },
};

export default function ColoringPage({ letter, word, isOpen, onClose, darkMode = false }: ColoringPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(18);
  const [hasColored, setHasColored] = useState(false);

  const illus = ILLUSTRATIONS[letter.toUpperCase()] ?? ILLUSTRATIONS.default;

  // Draw the outline illustration onto the canvas
  const drawOutline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const scale = W / 200;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = illus.bg;
    ctx.fillRect(0, 0, W, H);

    // Draw each shape with its default fill
    illus.shapes.forEach(shape => {
      const path = new Path2D(scalePath(shape.d, scale));
      ctx.fillStyle = shape.defaultFill;
      ctx.fill(path);
      ctx.strokeStyle = darkMode ? '#334155' : '#1e293b';
      ctx.lineWidth = 2.5 * scale;
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    });

    // Big letter watermark in center
    ctx.globalAlpha = 0.06;
    ctx.font = `bold ${H * 0.7}px "Fredoka", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(letter.toUpperCase(), W / 2, H / 2);
    ctx.globalAlpha = 1;

    // Word label at bottom
    ctx.font = `bold ${14 * scale}px "Fredoka", sans-serif`;
    ctx.fillStyle = darkMode ? '#94a3b8' : '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(word, W / 2, H - 6 * scale);
  }, [illus, letter, word, darkMode]);

  useEffect(() => {
    if (isOpen) {
      drawOutline();
      setHasColored(false);
    }
  }, [isOpen, drawOutline]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const paint = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);

    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fillStyle = selectedColor;
    ctx.fill();
    setHasColored(true);
  };

  const startPaint = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    paint(e);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            transition={{ type: 'spring', bounce: 0.35 }}
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  🎨 Color It In!
                </p>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  {letter.toUpperCase()} is for {word}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={drawOutline}
                  className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  title="Reset colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="px-4">
              <canvas
                ref={canvasRef}
                width={320}
                height={280}
                className="w-full rounded-3xl border-4 border-slate-100 dark:border-slate-800 cursor-crosshair touch-none"
                onMouseDown={startPaint}
                onMouseMove={paint}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onTouchStart={startPaint}
                onTouchMove={paint}
                onTouchEnd={() => setIsDrawing(false)}
              />
            </div>

            {/* Color Palette */}
            <div className="px-4 py-4 space-y-3">
              <div className="flex flex-wrap gap-2 justify-center">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full border-4 transition-all ${
                      selectedColor === c
                        ? 'border-slate-600 dark:border-slate-300 scale-125 shadow-lg'
                        : 'border-slate-200 dark:border-slate-700 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>

              {/* Brush size */}
              <div className="flex items-center gap-3 px-2">
                <Palette className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min={6}
                  max={36}
                  value={brushSize}
                  onChange={e => setBrushSize(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <div
                  className="rounded-full shrink-0 border-2 border-slate-200 dark:border-slate-700"
                  style={{ width: brushSize, height: brushSize, backgroundColor: selectedColor, minWidth: 6, minHeight: 6 }}
                />
              </div>

              {hasColored && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="w-full py-3 bg-green-500 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-600 transition-all"
                >
                  Done! 🌟
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Scale an SVG path string by a uniform factor */
function scalePath(d: string, scale: number): string {
  return d.replace(/(-?\d+\.?\d*)/g, (match) => String(parseFloat(match) * scale));
}
