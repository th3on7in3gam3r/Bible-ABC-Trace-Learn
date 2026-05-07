/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, RotateCcw, Check, X, Lightbulb } from 'lucide-react';
import confetti from 'canvas-confetti';
import { isWordSafe } from '../lib/wordFilter';

// ── Types ────────────────────────────────────────────────────────────────────

interface PlacedLetter {
  id: string;       // unique per placement
  letter: string;
}

interface DragState {
  letter: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  active: boolean;
}

interface WordCanvasProps {
  onClose: () => void;
  soundVolume?: number;
  soundEnabled?: boolean;
  voiceEnabled?: boolean;
  darkMode?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MAX_LETTERS = 12;

// Warm color palette — one per letter row in the tray
const TILE_COLORS = [
  'bg-red-400',    'bg-orange-400', 'bg-amber-400',  'bg-yellow-400',
  'bg-lime-400',   'bg-green-400',  'bg-teal-400',   'bg-cyan-400',
  'bg-sky-400',    'bg-blue-400',   'bg-indigo-400', 'bg-violet-400',
  'bg-purple-400', 'bg-fuchsia-400','bg-pink-400',   'bg-rose-400',
  'bg-red-500',    'bg-orange-500', 'bg-amber-500',  'bg-yellow-500',
  'bg-lime-500',   'bg-green-500',  'bg-teal-500',   'bg-cyan-500',
  'bg-sky-500',    'bg-blue-500',
];

// Bible-themed word suggestions shown as chips
const SUGGESTIONS = [
  'GRACE', 'PEACE', 'JOY', 'HOPE', 'LOVE', 'FAITH',
  'LIGHT', 'TRUTH', 'PRAY', 'SING', 'BLESS', 'AMEN',
  'LAMB', 'DOVE', 'STAR', 'KING', 'HOLY', 'WORD',
];

// ── Component ────────────────────────────────────────────────────────────────

export default function WordCanvas({
  onClose,
  soundVolume = 0.5,
  soundEnabled = true,
  voiceEnabled = true,
  darkMode = false,
}: WordCanvasProps) {
  const [placed, setPlaced] = useState<PlacedLetter[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const idCounterRef = useRef(0);                        // fix: was module-level mutable
  const uid = () => `l-${++idCounterRef.current}`;

  const word = placed.map(p => p.letter).join('');

  // ── Sound ──────────────────────────────────────────────────────────────────
  const playTone = useCallback((type: 'drop' | 'remove' | 'blocked' | 'done') => {
    if (!soundEnabled || soundVolume <= 0) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      if (type === 'drop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(550, now + 0.06);
        gain.gain.linearRampToValueAtTime(soundVolume * 0.5, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now); osc.stop(now + 0.18);
      } else if (type === 'remove') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        gain.gain.linearRampToValueAtTime(soundVolume * 0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.start(now); osc.stop(now + 0.14);
      } else if (type === 'blocked') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.2);
        gain.gain.linearRampToValueAtTime(soundVolume * 0.4, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now); osc.stop(now + 0.22);
      } else {
        // done — ascending arpeggio
        [440, 550, 660, 880].forEach((freq, i) => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.type = 'triangle';
          o2.frequency.setValueAtTime(freq, now + i * 0.1);
          g2.gain.setValueAtTime(0, now + i * 0.1);
          g2.gain.linearRampToValueAtTime(soundVolume * 0.5, now + i * 0.1 + 0.02);
          g2.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.18);
          o2.start(now + i * 0.1); o2.stop(now + i * 0.1 + 0.2);
        });
      }
    } catch (_) {}
  }, [soundEnabled, soundVolume]);

  const speakWord = useCallback((w: string) => {
    if (!voiceEnabled || !w) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(w.toLowerCase());
      utt.rate = 0.8; utt.pitch = 1.15; utt.volume = soundVolume;
      window.speechSynthesis.speak(utt);
    }
  }, [voiceEnabled, soundVolume]);

  // ── Drag logic (pointer events) ───────────────────────────────────────────
  const isOverDropZone = useCallback((clientX: number, clientY: number): boolean => {
    const el = dropZoneRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right &&
           clientY >= rect.top  && clientY <= rect.bottom;
  }, []);

  const handleTilePointerDown = useCallback((e: React.PointerEvent, letter: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const state: DragState = {
      letter,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      active: true,
    };
    dragRef.current = state;
    setDrag({ ...state });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current?.active) return;
    const updated = { ...dragRef.current, currentX: e.clientX, currentY: e.clientY };
    dragRef.current = updated;
    setDrag({ ...updated });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d?.active) return;
    dragRef.current = null;
    setDrag(null);

    if (isOverDropZone(e.clientX, e.clientY)) {
      if (placed.length < MAX_LETTERS) {
        setPlaced(prev => [...prev, { id: uid(), letter: d.letter }]);
        setBlocked(false);
        setCelebrated(false);
        playTone('drop');
      }
    }
  }, [isOverDropZone, placed.length, playTone]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const removeLetter = useCallback((id: string) => {
    setPlaced(prev => prev.filter(p => p.id !== id));
    setBlocked(false);
    setCelebrated(false);
    playTone('remove');
  }, [playTone]);

  const clearAll = useCallback(() => {
    setPlaced([]);
    setBlocked(false);
    setCelebrated(false);
  }, []);

  const handleDone = useCallback(() => {
    if (word.length < 2) return;
    if (!isWordSafe(word)) {
      setBlocked(true);
      playTone('blocked');
      // Auto-clear after 2s so the child can try again
      setTimeout(() => { setPlaced([]); setBlocked(false); }, 2000);
      return;
    }
    playTone('done');
    speakWord(word);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA'],
    });
    setCelebrated(true);
  }, [word, playTone, speakWord]);

  const applySuggestion = useCallback((suggestion: string) => {
    setPlaced(suggestion.split('').slice(0, MAX_LETTERS).map(l => ({ id: uid(), letter: l })));
    setBlocked(false);
    setCelebrated(false);
    playTone('drop');
  }, [playTone]);

  // Prevent page scroll while dragging on touch
  useEffect(() => {
    const prevent = (e: TouchEvent) => { if (dragRef.current?.active) e.preventDefault(); };
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-parchment-50 dark:bg-slate-950 flex flex-col"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b-4 border-parchment-200 dark:border-slate-800 shrink-0">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gold-500">✦ Word Canvas ✦</p>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white leading-tight">
            Drag letters to spell!
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setShowHint(h => !h)}
            className="p-2 bg-gold-400/20 rounded-xl text-gold-600 dark:text-gold-400 hover:bg-gold-400/30 transition-all"
            title="Word ideas"
          >
            <Lightbulb className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* ── Suggestion chips ── */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-parchment-100 dark:bg-slate-900 border-b-2 border-parchment-200 dark:border-slate-800 shrink-0"
          >
            <div className="flex flex-wrap gap-2 px-4 py-3">
              <p className="w-full text-[9px] font-black uppercase tracking-widest text-gold-500 mb-1">
                Bible words to try:
              </p>
              {SUGGESTIONS.map(s => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { applySuggestion(s); setShowHint(false); }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-gold-300 dark:border-gold-700 rounded-xl text-xs font-black text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-all shadow-sm"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drop zone (canvas) ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-4 min-h-0 overflow-y-auto">

        {/* The paper canvas — flex-1 so it fills all available vertical space */}
        <motion.div
          ref={dropZoneRef}
          animate={blocked ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
          transition={blocked ? { duration: 0.35 } : {}}
          className={`w-full max-w-2xl flex-1 min-h-[180px] rounded-[32px] border-4 border-dashed flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden ${
            blocked
              ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
              : celebrated
              ? 'border-praise-400 bg-praise-400/10 dark:bg-praise-400/5'
              : 'border-parchment-200 dark:border-slate-700 bg-white dark:bg-slate-900'
          }`}
        >
          {/* Lined paper effect */}
          {!blocked && !celebrated && (
            <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10">
              {[1,2,3,4].map(i => (
                <div key={i} className="border-b border-gold-300 dark:border-gold-700 mx-6" style={{ marginTop: `${i * 28}px` }} />
              ))}
            </div>
          )}

          {placed.length === 0 ? (
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <p className="text-3xl">✋</p>
              <p className="text-sm font-black text-parchment-200 dark:text-slate-600 uppercase tracking-widest">
                Drop letters here
              </p>
            </div>
          ) : blocked ? (
            <motion.div
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <p className="text-3xl">🌟</p>
              <p className="text-base sm:text-lg font-black text-red-600 dark:text-red-400 text-center px-4">
                Let's choose a kind word!
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center px-4 py-2">
              {placed.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: i * 0.03 }}
                  whileHover={{ scale: 1.15, y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => removeLetter(p.id)}
                  title="Tap to remove"
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${TILE_COLORS[ALPHABET.indexOf(p.letter)] ?? 'bg-gold-400'} text-white font-black text-xl sm:text-3xl flex items-center justify-center shadow-lg border-b-4 border-black/20 active:border-b-0 active:translate-y-1 transition-all`}
                >
                  {p.letter}
                </motion.button>
              ))}
            </div>
          )}

          {/* Celebration overlay */}
          <AnimatePresence>
            {celebrated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[28px] gap-2"
              >
                <p className="text-4xl sm:text-5xl font-black text-praise-600 dark:text-praise-400 tracking-widest">
                  {word}
                </p>
                <p className="text-sm font-black text-gold-500 uppercase tracking-widest">
                  Amazing spelling! 🎉
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action bar */}
        <div className="flex gap-2 sm:gap-3 w-full max-w-2xl">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={clearAll}
            disabled={placed.length === 0}
            className="flex items-center gap-2 px-4 py-3 bg-parchment-100 dark:bg-slate-800 border-2 border-parchment-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-parchment-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => speakWord(word)}
            disabled={placed.length === 0}
            className="flex items-center gap-2 px-4 py-3 bg-sky-500/10 dark:bg-sky-900/30 border-2 border-sky-300 dark:border-sky-700 rounded-2xl font-black text-xs uppercase tracking-widest text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Volume2 className="w-4 h-4" />
            Say It
          </motion.button>

          <motion.button
            whileHover={word.length >= 2 ? { scale: 1.05 } : {}}
            whileTap={word.length >= 2 ? { scale: 0.95 } : {}}
            onClick={handleDone}
            disabled={word.length < 2 || celebrated}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm uppercase tracking-widest border-4 transition-all ${
              word.length >= 2 && !celebrated
                ? 'bg-praise-500 border-praise-600 text-white shadow-lg shadow-praise-200/50 dark:shadow-none hover:bg-praise-600'
                : 'bg-parchment-100 dark:bg-slate-800 border-parchment-200 dark:border-slate-700 text-parchment-200 dark:text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            Done!
          </motion.button>
        </div>

        {/* Letter count */}
        {placed.length > 0 && !celebrated && (
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
            {placed.length} / {MAX_LETTERS} letters
          </p>
        )}
      </div>

      {/* ── Letter tray ── */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-t-4 border-parchment-200 dark:border-slate-800 px-3 py-3 sm:py-4">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mb-2 text-center">
          Hold &amp; drag a letter
        </p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center max-w-2xl mx-auto">
          {ALPHABET.map((letter, i) => (
            <motion.div
              key={letter}
              whileHover={{ scale: 1.15, y: -4 }}
              whileTap={{ scale: 0.9 }}
              onPointerDown={e => handleTilePointerDown(e, letter)}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${TILE_COLORS[i]} text-white font-black text-base sm:text-lg flex items-center justify-center shadow-md border-b-4 border-black/20 cursor-grab active:cursor-grabbing select-none touch-none transition-transform`}
              style={{ userSelect: 'none' }}
            >
              {letter}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Drag ghost ── */}
      <AnimatePresence>
        {drag?.active && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.9 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={{
              position: 'fixed',
              left: drag.currentX - 28,
              top: drag.currentY - 28,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
            className={`w-14 h-14 rounded-2xl ${TILE_COLORS[ALPHABET.indexOf(drag.letter)] ?? 'bg-gold-400'} text-white font-black text-2xl flex items-center justify-center shadow-2xl border-b-4 border-black/20`}
          >
            {drag.letter}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
