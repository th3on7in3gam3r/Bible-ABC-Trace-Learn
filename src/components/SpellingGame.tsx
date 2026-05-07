/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, RotateCcw, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpellingGameProps {
  word: string;           // e.g. "Bless"
  letter: string;         // e.g. "B"
  verse: string;
  illustration: React.ReactNode;
  onComplete: () => void; // called when word is spelled correctly
  soundVolume?: number;
  soundEnabled?: boolean;
  voiceEnabled?: boolean;
  darkMode?: boolean;
}

type TileState = 'empty' | 'correct' | 'wrong';

interface PlacedTile {
  letter: string;
  state: TileState;
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build the letter bank: all letters of the word + 2-4 random distractors */
function buildLetterBank(word: string): string[] {
  const upper = word.toUpperCase();
  const pool = upper.split('');

  // Add distractors — letters NOT already in the word
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const distractors = alphabet.split('').filter(c => !upper.includes(c));
  const count = Math.min(4, Math.max(2, 6 - pool.length));
  const picked = shuffle(distractors).slice(0, count);

  return shuffle([...pool, ...picked]);
}

export default function SpellingGame({
  word,
  letter,
  verse,
  illustration,
  onComplete,
  soundVolume = 0.5,
  soundEnabled = true,
  voiceEnabled = true,
  darkMode = false,
}: SpellingGameProps) {
  const target = word.toUpperCase();

  const [tiles, setTiles] = useState<PlacedTile[]>(() =>
    target.split('').map(() => ({ letter: '', state: 'empty' as TileState }))
  );
  const [letterBank, setLetterBank] = useState<string[]>(() => buildLetterBank(word));
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [wrongHint, setWrongHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [nextTile, setNextTile] = useState(0);
  const hasSpokenRef = useRef(false);

  // Speak the word on mount
  useEffect(() => {
    if (!voiceEnabled || hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    const t = setTimeout(() => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(`Spell the word: ${word}`);
        utt.rate = 0.8;
        utt.pitch = 1.15;
        utt.volume = soundVolume;
        window.speechSynthesis.speak(utt);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [word, voiceEnabled, soundVolume]);

  const playTone = useCallback((type: 'correct' | 'wrong' | 'complete') => {
    if (!soundEnabled || soundVolume <= 0) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);

      if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(660, now + 0.08);
        gain.gain.linearRampToValueAtTime(soundVolume * 0.6, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.15);
        gain.gain.linearRampToValueAtTime(soundVolume * 0.4, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now); osc.stop(now + 0.18);
      } else {
        // complete — ascending arpeggio
        [440, 550, 660, 880].forEach((freq, i) => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.type = 'triangle';
          o2.frequency.setValueAtTime(freq, now + i * 0.1);
          g2.gain.setValueAtTime(0, now + i * 0.1);
          g2.gain.linearRampToValueAtTime(soundVolume * 0.5, now + i * 0.1 + 0.02);
          g2.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.18);
          o2.start(now + i * 0.1);
          o2.stop(now + i * 0.1 + 0.2);
        });
      }
    } catch (_) {}
  }, [soundEnabled, soundVolume]);

  const speakWord = useCallback(() => {
    if (!voiceEnabled) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(word);
      utt.rate = 0.75;
      utt.pitch = 1.2;
      utt.volume = soundVolume;
      window.speechSynthesis.speak(utt);
    }
  }, [word, voiceEnabled, soundVolume]);

  const handleLetterTap = useCallback((bankLetter: string, bankIdx: number) => {
    if (isComplete || usedIndices.has(bankIdx) || nextTile >= target.length) return;

    const expected = target[nextTile];

    if (bankLetter === expected) {
      // Correct
      playTone('correct');
      const newTiles = [...tiles];
      newTiles[nextTile] = { letter: bankLetter, state: 'correct' };
      setTiles(newTiles);
      setUsedIndices(prev => new Set([...prev, bankIdx]));
      const newNext = nextTile + 1;
      setNextTile(newNext);

      if (newNext === target.length) {
        // Word complete!
        setTimeout(() => {
          playTone('complete');
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#FBBF24', '#34D399', '#60A5FA', '#F472B6'] });
          if (voiceEnabled && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(`Amazing! You spelled ${word}!`);
            utt.rate = 0.8; utt.pitch = 1.2; utt.volume = soundVolume;
            window.speechSynthesis.speak(utt);
          }
          setIsComplete(true);
        }, 200);
      }
    } else {
      // Wrong — shake + gentle hint
      playTone('wrong');
      setWrongIdx(bankIdx);
      setWrongHint(true);
      setTimeout(() => { setWrongIdx(null); setWrongHint(false); }, 900);
    }
  }, [isComplete, usedIndices, nextTile, target, tiles, playTone, word, voiceEnabled, soundVolume]);

  const handleReset = useCallback(() => {
    setTiles(target.split('').map(() => ({ letter: '', state: 'empty' })));
    setLetterBank(buildLetterBank(word));
    setUsedIndices(new Set());
    setWrongIdx(null);
    setWrongHint(false);
    setIsComplete(false);
    setNextTile(0);
  }, [target, word]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg select-none">

      {/* Illustration + word prompt */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          {illustration}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-base sm:text-lg font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Spell the word
          </p>
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={speakWord}
            className="p-2 bg-sky-500/10 rounded-xl text-sky-500 hover:bg-sky-500/20 transition-all"
            title="Hear the word"
          >
            <Volume2 className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Answer tiles */}
      <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
        {tiles.map((tile, i) => (
          <motion.div
            key={i}
            animate={
              tile.state === 'correct'
                ? { scale: [1, 1.25, 1], y: [0, -8, 0] }
                : { scale: 1, y: 0 }
            }
            transition={{ duration: 0.35, delay: 0 }}
            className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border-4 flex items-center justify-center font-black text-xl sm:text-2xl transition-all ${
              tile.state === 'correct'
                ? 'bg-praise-500 border-praise-600 text-white shadow-lg shadow-praise-200/50 dark:shadow-none'
                : i === nextTile
                ? 'bg-white dark:bg-slate-800 border-gold-400 dark:border-gold-600 text-slate-800 dark:text-white shadow-md'
                : 'bg-parchment-100 dark:bg-slate-800 border-parchment-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
            }`}
          >
            {tile.letter}
          </motion.div>
        ))}
      </div>

      {/* Verse hint */}
      <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic text-center px-4 leading-relaxed">
        "{verse}"
      </p>

      {/* Wrong-tap hint */}
      <AnimatePresence>
        {wrongHint && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-black text-red-400 dark:text-red-400 text-center"
          >
            Not that one — try again! 🤔
          </motion.p>
        )}
      </AnimatePresence>

      {/* Letter bank */}
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
        {letterBank.map((bankLetter, i) => {
          const used = usedIndices.has(i);
          const isWrong = wrongIdx === i;
          return (
            <motion.button
              key={`${bankLetter}-${i}`}
              whileHover={!used ? { scale: 1.1, y: -3 } : {}}
              whileTap={!used ? { scale: 0.9 } : {}}
              animate={isWrong ? { x: [-6, 6, -5, 5, 0] } : { x: 0 }}
              transition={isWrong ? { duration: 0.3 } : { type: 'spring', stiffness: 300 }}
              onClick={() => handleLetterTap(bankLetter, i)}
              disabled={used || isComplete}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl border-4 font-black text-xl sm:text-2xl transition-all ${
                used
                  ? 'bg-parchment-100 dark:bg-slate-900 border-parchment-200 dark:border-slate-800 text-parchment-200 dark:text-slate-700 cursor-not-allowed opacity-40'
                  : isWrong
                  ? 'bg-red-100 dark:bg-red-900/30 border-red-400 text-red-600 dark:text-red-400 shadow-md'
                  : 'bg-white dark:bg-slate-800 border-sky-300 dark:border-sky-700 text-slate-800 dark:text-white shadow-md hover:border-sky-500 hover:shadow-sky-200/50 dark:hover:shadow-none'
              }`}
            >
              {bankLetter}
            </motion.button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-3 w-full">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          className="flex items-center gap-2 px-5 py-3 bg-parchment-100 dark:bg-slate-800 border-2 border-parchment-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-parchment-200 dark:hover:bg-slate-700 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </motion.button>

        <AnimatePresence>
          {isComplete && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onComplete}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-praise-500 border-4 border-praise-600 rounded-2xl font-black text-sm sm:text-base uppercase tracking-widest text-white shadow-lg shadow-praise-200/50 dark:shadow-none hover:bg-praise-600 transition-all"
            >
              Next <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', bounce: 0.45 }}
            className="w-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-3xl px-6 py-4 text-center shadow-xl"
          >
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
              🎉 You spelled <span className="uppercase">{word}</span>!
            </p>
            <p className="text-sm font-bold text-white/80 mt-0.5">+15 bonus points</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
