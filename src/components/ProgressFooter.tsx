import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface ProgressFooterProps {
  currentLetterIdx: number | null;
  setCurrentLetterIdx: (value: number | null) => void;
  setViewMode: (mode: 'letter' | 'word') => void;
  isUppercase: boolean;
  setIsUppercase: (value: boolean) => void;
  playUISound: (type: 'click' | 'select' | 'reward') => void;
}

export default function ProgressFooter({ currentLetterIdx, setCurrentLetterIdx, setViewMode, isUppercase, setIsUppercase, playUISound }: ProgressFooterProps) {
  if (currentLetterIdx === null) return null;

  return (
    <div className="h-20 sm:h-24 px-4 sm:px-12 py-3 sm:py-4 flex items-center justify-between pointer-events-none fixed bottom-0 inset-x-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-40 border-t-2 border-slate-100 dark:border-slate-800 transition-colors">
      <button className="h-12 w-12 sm:h-16 sm:w-16 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center border-b-4 border-slate-200 dark:border-slate-700 pointer-events-auto shadow-sm active:translate-y-1 active:border-b-0 transition-all font-black" onClick={() => { playUISound('click'); setCurrentLetterIdx(null); setViewMode('letter'); }}>
        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 dark:text-slate-500" />
      </button>

      <div className="flex gap-2 sm:gap-4 pointer-events-auto">
        {['ABC', 'abc'].map((text) => (
          <button key={text} onClick={() => { playUISound('click'); setIsUppercase(text === 'ABC'); }} className={`h-12 px-4 sm:h-16 sm:px-6 rounded-xl sm:rounded-2xl flex items-center justify-center font-black uppercase tracking-widest text-xs sm:text-lg border-b-4 transition-all ${(text === 'ABC' && isUppercase) || (text === 'abc' && !isUppercase) ? 'bg-blue-600 border-blue-800 text-white shadow-lg scale-105' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600'}`}>{text}</button>
        ))}
      </div>

      <div className="h-12 w-12 sm:h-16 sm:w-16 invisible" />
    </div>
  );
}
