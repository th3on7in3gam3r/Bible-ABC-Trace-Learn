import { motion } from 'motion/react';
import { Settings, Sun, Moon, Music2, Volume2, User } from 'lucide-react';
import AvatarCircle from './AvatarCircle';
import { AppSettings, UserProfile } from '../types';

interface AppHeaderProps {
  activeProfile: UserProfile | undefined;
  settings: AppSettings;
  musicPlaying: boolean;
  toggleMusic: () => void;
  toggleSound: () => void;
  playUISound: (type: 'click' | 'select' | 'reward') => void;
  onToggleDarkMode: () => void;
  onOpenParentGate: () => void;
}

export default function AppHeader({
  activeProfile,
  settings,
  musicPlaying,
  toggleMusic,
  toggleSound,
  playUISound,
  onToggleDarkMode,
  onOpenParentGate,
}: AppHeaderProps) {
  return (
    <header className="h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between bg-parchment-50 dark:bg-slate-900 border-b-4 border-parchment-200 dark:border-slate-800 z-40 fixed top-0 inset-x-0 transition-colors shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative shrink-0">
          <div className="relative z-10">
            {activeProfile ? (
              <AvatarCircle avatar={activeProfile.avatar} size="sm" />
            ) : (
              <div className="w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-gold-400 to-gold-500 rounded-full flex items-center justify-center text-white shadow-lg ring-4 ring-parchment-100 dark:ring-slate-800">
                <User className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
            )}
          </div>
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute inset-0 bg-gold-400 rounded-full blur-md -z-0" />
        </motion.div>

        <div className="overflow-hidden">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gold-500 dark:text-slate-500 truncate">
            {activeProfile ? `${activeProfile.name}'s Journey` : 'Kids Bible App'}
          </p>
          <p className="text-sm sm:text-lg font-bold truncate text-slate-800 dark:text-white">Bible ABC Trace</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { toggleMusic(); playUISound('click'); }}
          className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${
            musicPlaying
              ? 'bg-gold-400/20 border-gold-400 text-gold-600 dark:text-gold-400'
              : 'bg-white dark:bg-slate-800 border-parchment-200 dark:border-slate-700 text-slate-400 hover:border-gold-400'
          }`}>
          <Music2 className={`w-4 h-4 ${musicPlaying ? 'animate-pulse' : ''}`} />
          {musicPlaying ? 'Music On' : 'Music'}
        </motion.button>

        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { toggleSound(); playUISound('click'); }}
          className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${
            settings.soundEnabled
              ? 'bg-praise-500/10 border-praise-400 text-praise-600 dark:text-praise-400'
              : 'bg-white dark:bg-slate-800 border-parchment-200 dark:border-slate-700 text-slate-400 hover:border-praise-400'
          }`}>
          <Volume2 className="w-4 h-4" />
          {settings.soundEnabled ? 'Sound On' : 'Sound Off'}
        </motion.button>

        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}
            onClick={() => { onToggleDarkMode(); playUISound('click'); }}
            className="p-2.5 sm:p-3 bg-white dark:bg-slate-800 border-2 rounded-xl sm:rounded-2xl shadow-sm transition-all border-parchment-200 dark:border-slate-700 hover:border-gold-400">
            {settings.darkMode ? <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-gold-400" /> : <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />}
          </motion.button>

          <motion.button whileHover={{ scale: 1.1, rotate: -5 }} whileTap={{ scale: 0.9 }}
            onClick={() => { playUISound('click'); onOpenParentGate(); }}
            className="p-2.5 sm:p-3 bg-white dark:bg-slate-800 border-2 border-parchment-200 dark:border-slate-700 rounded-xl sm:rounded-2xl shadow-sm hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-slate-500" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
