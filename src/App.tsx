/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useState, useEffect, useMemo, useRef, useCallback} from 'react';
import {motion, AnimatePresence} from 'motion/react';
import {
  Heart, 
  Settings, 
  ChevronLeft, 
  Music, 
  Volume2, 
  VolumeX, 
  Trophy,
  User,
  Gift,
  Cross,
  Sun,
  Moon,
  Cloud,
  Timer,
  Bell,
  Sparkle,
  Zap,
  Flame,
  CloudRain,
  Cat,
  Dog,
  Fish,
  Rabbit,
  Star,
  CheckCircle,
  Rainbow,
  BookOpen,
  Globe,
  Crown,
  HeartPulse,
  Leaf,
  Smile,
  Hand,
  Scroll,
  Ship,
  Sparkles,
  Mountain,
  Lightbulb,
  History,
  Tent,
  ArrowUp,
  Grape,
  Mic,
  Play,
  Bird,
  Baby,
  Music2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {DEFAULT_ALPHABET, UserProfile, AppSettings, AlphabetItem, DifficultyLevel} from './types';
import LetterTracer from './components/LetterTracer';
import SentenceTracer from './components/SentenceTracer';
import CelebrationOverlay from './components/CelebrationOverlay';
import ParentDashboard from './components/ParentDashboard';
import ParentGate from './components/ParentGate';
import AddProfileModal from './components/AddProfileModal';
import ColoringPage from './components/ColoringPage';
import AppHeader from './components/AppHeader';
import ProgressFooter from './components/ProgressFooter';
import AvatarCircle from './components/AvatarCircle';

const ICONS: Record<string, any> = {
  user: User,
  gift: Gift,
  cross: Cross,
  sun: Sun,
  cloud: Cloud,
  star: Star,
  'check-circle': CheckCircle,
  rainbow: Rainbow,
  'book-open': BookOpen,
  globe: Globe,
  crown: Crown,
  'heart-pulse': HeartPulse,
  leaf: Leaf,
  smile: Smile,
  hand: Hand,
  scroll: Scroll,
  ship: Ship,
  sparkles: Sparkles,
  mountains: Mountain,
  lightbulb: Lightbulb,
  history: History,
  tent: Tent,
  'arrow-up': ArrowUp,
  grape: Grape,
  music: Music,
  heart: Heart,
  bird: Bird,
  baby: Baby,
  timer: Timer,
  bell: Bell,
  sparkle: Sparkles,
  zap: Zap,
  flame: Flame,
  rain: CloudRain,
  cat: Cat,
  dog: Dog,
  fish: Fish,
  rabbit: Rabbit,
};

const BADGES = [
  { id: 'explorer', name: 'Explorer', icon: 'sparkle', color: 'bg-green-400', description: 'Started the journey!' },
  { id: 'star-gazer', name: 'Star Gazer', icon: 'star', color: 'bg-cyan-400', description: 'Earned 100 points' },
  { id: 'scholar', name: 'Scholar', icon: 'zap', color: 'bg-blue-400', description: 'Traced 10 letters' },
  { id: 'faithful', name: 'Faithful', icon: 'heart', color: 'bg-red-400', description: 'Earned 500 points' },
  { id: 'alpha-pro', name: 'Alpha Pro', icon: 'flame', color: 'bg-purple-500', description: 'Earned 1000 points' },
  { id: 'master', name: 'Master', icon: 'crown', color: 'bg-yellow-400', description: 'Completed everything!' },
];

// Emoji avatars used by the new AddProfileModal (format: "emojiId|bgColor")
const EMOJI_AVATARS: Record<string, string> = {
  sheep: '🐑', lion: '🦁', dove: '🕊️', fish: '🐟',
  star: '⭐', rainbow: '🌈', sun: '☀️', heart: '❤️',
  angel: '😇', crown: '👑', butterfly: '🦋', turtle: '🐢',
};

export default function App() {
  // --- State ---
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('bible_abc_profiles');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    return localStorage.getItem('bible_abc_active_profile');
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('bible_abc_settings');
    return saved ? JSON.parse(saved) : {
      customVerses: {},
      isParentVerified: false,
      screenTimeLimit: 0,
      musicVolume: 0.5,
      soundVolume: 0.8,
      soundEnabled: true,
      voiceEnabled: true,
      darkMode: false,
    };
  });

  const [currentLetterIdx, setCurrentLetterIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'letter' | 'word'>('letter');
  const [isUppercase, setIsUppercase] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showParentGate, setShowParentGate] = useState(false);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showColoringPage, setShowColoringPage] = useState(false);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [gatePurpose, setGatePurpose] = useState<'settings' | 'addProfile'>('settings');
  const [screenTimeRemaining, setScreenTimeRemaining] = useState<number | null>(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  const screenTimeStartRef = useRef<number>(Date.now());
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);

  // --- Derived ---
  const activeProfile = useMemo(() => profiles.find(p => p.id === activeProfileId), [profiles, activeProfileId]);
  const alphabet = useMemo(() => {
    return DEFAULT_ALPHABET.map(item => ({
      ...item,
      ...settings.customVerses[item.letter],
    }));
  }, [settings.customVerses]);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('bible_abc_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (activeProfileId) localStorage.setItem('bible_abc_active_profile', activeProfileId);
    else localStorage.removeItem('bible_abc_active_profile');
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem('bible_abc_settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Background music
  useEffect(() => {
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio('/assets/bg_music.mp3');
      bgMusicRef.current.loop = true;
    }
    bgMusicRef.current.volume = settings.musicVolume;
  }, [settings.musicVolume]);

  const toggleMusic = useCallback(() => {
    const audio = bgMusicRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
    } else {
      audio.play().catch(() => {});
      setMusicPlaying(true);
    }
  }, [musicPlaying]);

  const toggleSound = useCallback(() => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  // Screen Time Monitor
  useEffect(() => {
    if (settings.screenTimeLimit === 0) {
      setScreenTimeRemaining(null);
      setShowTimeWarning(false);
      return;
    }

    const limitMs = settings.screenTimeLimit * 60 * 1000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - screenTimeStartRef.current;
      const remaining = Math.max(0, limitMs - elapsed);
      setScreenTimeRemaining(Math.ceil(remaining / 1000));

      if (remaining <= 5 * 60 * 1000 && remaining > 0) {
        setShowTimeWarning(true);
      } else if (remaining === 0) {
        // Enforce limit - maybe switch to a locked screen
        setActiveProfileId(null);
        setGatePurpose('settings');
        setShowParentGate(true);
        alert("Time is up for today! Let's take a break.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.screenTimeLimit]);

  const playUISound = useCallback((type: 'click' | 'select' | 'reward') => {
    if (!settings.soundEnabled || settings.soundVolume <= 0) return;
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
      
      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.linearRampToValueAtTime(settings.soundVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'select') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.05);
        gain.gain.linearRampToValueAtTime(settings.soundVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'reward') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        gain.gain.linearRampToValueAtTime(settings.soundVolume * 0.5, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch(e) {
      console.error("Audio playback failed", e);
    }
  }, [settings.soundEnabled, settings.soundVolume]);



  const completionPercentage = useMemo(() => {
    if (!activeProfile) return 0;
    const completedCount = Object.values(activeProfile.progress).filter(v => v === true).length;
    return Math.round((completedCount / alphabet.length) * 100);
  }, [activeProfile, alphabet]);

  // --- Handlers ---
  const addProfile = (name: string, avatar: string = 'bird', difficulty: DifficultyLevel = 'easy') => {
    const newProfile: UserProfile = {
      id: crypto.randomUUID(),
      name,
      avatar,
      difficulty,
      points: 0,
      badges: [],
      progress: {},
      voiceRecordings: {},
    };
    setProfiles([...profiles, newProfile]);
    if (!activeProfileId) setActiveProfileId(newProfile.id);
  };

  const deleteProfile = (id: string) => {
    setProfiles(profiles.filter(p => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(null);
  };

  const updateProfileDifficulty = (id: string, difficulty: DifficultyLevel) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, difficulty } : p));
  };

  const updateVerse = (letter: string, verse: string) => {
    setSettings(prev => ({
      ...prev,
      customVerses: {
        ...prev.customVerses,
        [letter]: { 
          ...prev.customVerses[letter],
          verse 
        },
      },
    }));
  };
  
  const updateIllustration = (letter: string, illustration: string) => {
    setSettings(prev => ({
      ...prev,
      customVerses: {
        ...prev.customVerses,
        [letter]: { 
          ...prev.customVerses[letter],
          illustration 
        },
      },
    }));
  };

  const completeLetter = () => {
    if (!activeProfile || currentLetterIdx === null) return;
    
    const letter = alphabet[currentLetterIdx].letter;
    const word = alphabet[currentLetterIdx].word;
    const isNewlyCompleted = !activeProfile.progress[letter];

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setProfiles(prev => prev.map(p => {
      if (p.id === activeProfile.id) {
        const newPoints = isNewlyCompleted ? p.points + 10 : p.points;
        const newProgress = { ...p.progress, [letter]: true };
        const newBadges = [...p.badges];

        // Award Badges
        if (isNewlyCompleted) {
          if (!newBadges.includes('explorer')) {
            newBadges.push('explorer');
            playUISound('reward');
          }
          const completedCount = Object.keys(newProgress).length;
          if (completedCount >= 10 && !newBadges.includes('scholar')) {
            newBadges.push('scholar');
            playUISound('reward');
          }
          if (completedCount === alphabet.length && !newBadges.includes('master')) {
            newBadges.push('master');
            playUISound('reward');
          }
          if (newPoints >= 100 && !newBadges.includes('star-gazer')) {
            newBadges.push('star-gazer');
            playUISound('reward');
          }
          if (newPoints >= 500 && !newBadges.includes('faithful')) {
            newBadges.push('faithful');
            playUISound('reward');
          }
          if (newPoints >= 1000 && !newBadges.includes('alpha-pro')) {
            newBadges.push('alpha-pro');
            playUISound('reward');
          }
        }

        return {
          ...p,
          points: newPoints,
          progress: newProgress,
          badges: newBadges,
        };
      }
      return p;
    }));

    if (isNewlyCompleted) {
      setRewardToast(`Wonderful! ${letter} is for ${word}. Coloring unlocked!`);
      setTimeout(() => setRewardToast(null), 3500);
    }

    setTimeout(() => {
      setViewMode('word');
      if (isNewlyCompleted) {
        setShowColoringPage(true);
      }
    }, 1250);
  };

  const completeWord = () => {
    if (!activeProfile || currentLetterIdx === null) return;
    
    const letter = alphabet[currentLetterIdx].letter;
    
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#22c55e', '#eab308']
    });

    setProfiles(prev => prev.map(p => {
      if (p.id === activeProfile.id) {
        const newPoints = p.points + 20;
        const newBadges = [...p.badges];
        
        if (newPoints >= 100 && !newBadges.includes('star-gazer')) {
          newBadges.push('star-gazer');
          playUISound('reward');
        }
        if (newPoints >= 500 && !newBadges.includes('faithful')) {
          newBadges.push('faithful');
          playUISound('reward');
        }
        if (newPoints >= 1000 && !newBadges.includes('alpha-pro')) {
          newBadges.push('alpha-pro');
          playUISound('reward');
        }

        return {
          ...p,
          points: newPoints,
          badges: newBadges,
        };
      }
      return p;
    }));

    setTimeout(() => {
      setCurrentLetterIdx(null);
      setViewMode('letter');

      // Check if all letters are completed
      if (activeProfile) {
        const completedCount = Object.keys(activeProfile.progress).length;
        if (completedCount === alphabet.length) {
          setTimeout(() => setShowCelebration(true), 500);
        }
      }
    }, 2000);
  };

  const handleRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (activeProfile && currentLetterIdx !== null) {
            const letter = alphabet[currentLetterIdx].letter;
            setProfiles(prev => prev.map(p => {
              if (p.id === activeProfile.id) {
                return {
                  ...p,
                  voiceRecordings: { ...p.voiceRecordings, [letter]: base64data }
                };
              }
              return p;
            }));
          }
        };
        
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
    } catch (err) {
      console.error('Recording failed:', err);
      alert('Microphone access is needed to record your voice.');
    }
  };

  // --- Views ---

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 select-none overflow-x-hidden flex flex-col pb-20 sm:pb-0 transition-colors duration-300">
      {/* --- Screen Time Warning --- */}
      <AnimatePresence>
        {showTimeWarning && screenTimeRemaining !== null && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div className="bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-200 dark:border-amber-700 p-4 rounded-3xl shadow-2xl flex items-center gap-4">
              <div className="bg-amber-400 p-2 rounded-2xl text-white">
                <Timer className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">Time for a break soon!</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                  {Math.floor(screenTimeRemaining / 60)}:{(screenTimeRemaining % 60).toString().padStart(2, '0')} remaining
                </p>
              </div>
              <button 
                onClick={() => setShowTimeWarning(false)}
                className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 rotate-90" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppHeader
        activeProfile={activeProfile}
        settings={settings}
        musicPlaying={musicPlaying}
        toggleMusic={toggleMusic}
        toggleSound={toggleSound}
        playUISound={playUISound}
        onToggleDarkMode={() => setSettings({ ...settings, darkMode: !settings.darkMode })}
        onOpenParentGate={() => {
          playUISound('click');
          setGatePurpose('settings');
          setShowParentGate(true);
        }}
      />

      <AnimatePresence>
        {rewardToast && (
          <motion.div
            key="reward-toast"
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.95 }}
            className="fixed top-28 left-1/2 z-50 -translate-x-1/2 rounded-3xl border-2 border-blue-200 bg-blue-50 dark:bg-slate-800 dark:border-blue-900 px-6 py-4 shadow-2xl shadow-blue-100/80 dark:shadow-black/20 text-slate-900 dark:text-slate-100"
          >
            <p className="font-black text-sm sm:text-base text-center">{rewardToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-20 flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {!activeProfileId ? (
            /* --- Profile Selection --- */
            <motion.div 
              key="profiles"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 gap-8 md:gap-12"
            >
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Who is learning?</h2>
                <div className="h-1.5 w-24 bg-blue-500 mx-auto rounded-full" />
              </div>
              <motion.div 
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
                initial="hidden"
                animate="show"
                className="flex flex-wrap justify-center gap-4 sm:gap-8"
              >
                {profiles.map(p => (
                  <motion.button
                    key={p.id}
                    variants={{
                      hidden: { opacity: 0, scale: 0.8 },
                      show: { opacity: 1, scale: 1 }
                    }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playUISound('select');
                      setActiveProfileId(p.id);
                    }}
                    className="flex flex-col items-center gap-4 sm:gap-6 p-6 sm:p-10 bg-slate-50 dark:bg-slate-800 rounded-[32px] sm:rounded-[40px] border-4 border-slate-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-xl w-36 sm:w-56"
                  >
                    <AvatarCircle avatar={p.avatar} size="lg" />
                    <span className="text-lg sm:text-2xl font-bold truncate w-full text-center dark:text-white">{p.name}</span>
                  </motion.button>
                ))}
                <motion.button
                  variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    show: { opacity: 1, scale: 1 }
                  }}
                  whileHover={{ scale: 1.05, borderStyle: 'solid', borderColor: '#3b82f6' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playUISound('select');
                    setShowAddProfile(true);
                  }}
                  className="flex flex-col items-center justify-center gap-4 p-6 sm:p-10 bg-white dark:bg-slate-800 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] sm:rounded-[40px] text-slate-300 dark:text-slate-600 hover:text-blue-400 dark:hover:text-blue-400 transition-all hover:shadow-lg w-36 sm:w-56"
                >
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-4 border-dashed flex items-center justify-center">
                    <UserPlusIcon />
                  </div>
                  <span className="text-sm sm:text-xl font-black uppercase tracking-widest text-center">New Profile</span>
                </motion.button>
              </motion.div>
            </motion.div>
          ) : currentLetterIdx === null ? (
            /* --- Alphabet Grid --- */
            <motion.div 
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 p-4 sm:p-12 space-y-8 sm:space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 sm:px-0">
                <div className="text-center md:text-left flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">Hi, {activeProfile.name}! 👋</h2>
                    <div className="flex-1 max-w-xs mx-auto sm:mx-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mastery</span>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{completionPercentage}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-2 border-slate-50 dark:border-slate-800">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${completionPercentage}%` }}
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                          transition={{ type: "spring", bounce: 0, duration: 1.5 }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] sm:text-sm mt-1">Pick a letter to start your journey</p>
                </div>
                <div className="flex gap-3 sm:gap-4 justify-center">


                  <div className="bg-slate-50 dark:bg-slate-800 px-4 sm:px-6 py-2 sm:py-4 rounded-2xl sm:rounded-3xl border-2 border-slate-100 dark:border-slate-700 flex items-center gap-2 sm:gap-4">
                     <span className="text-xl sm:text-2xl">⭐</span>
                     <span className="text-xl sm:text-2xl font-black dark:text-white">{activeProfile.points}</span>
                  </div>
                  <button 
                    onClick={() => setActiveProfileId(null)}
                    className="bg-slate-100 dark:bg-slate-800 px-4 sm:px-6 py-2 sm:py-4 rounded-2xl sm:rounded-3xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm sm:text-base whitespace-nowrap shadow-sm"
                  >
                    Switch User
                  </button>
                </div>
              </div>

              <motion.div 
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-8"
              >
                {alphabet.map((item, idx) => {
                  const IconComp = ICONS[item.illustration] || Star;
                  const isDone = activeProfile.progress[item.letter];
                  return (
                    <motion.button
                      key={item.letter}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        show: { opacity: 1, y: 0 }
                      }}
                      whileHover={{ 
                        scale: 1.1, 
                        rotate: [0, -2, 2, 0],
                        transition: { duration: 0.3 }
                      }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        playUISound('click');
                        setCurrentLetterIdx(idx);
                      }}
                      className={`relative aspect-square flex flex-col items-center justify-center p-3 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[40px] border-2 sm:border-4 transition-all shadow-sm ${isDone ? 'border-green-400 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl'}`}
                    >
                      <span className={`text-2xl sm:text-4xl md:text-5xl font-black mb-1 sm:mb-2 ${isDone ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>{item.letter}</span>
                      <motion.div
                        animate={{ 
                          y: [0, -4, 0],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2 + Math.random(),
                          ease: "easeInOut"
                        }}
                      >
                        <IconComp className={`w-5 h-5 sm:w-8 h-8 ${isDone ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`} />
                      </motion.div>
                      
                      {isDone && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 sm:-top-3 sm:-right-3 bg-green-500 text-white rounded-full p-1 sm:p-2 shadow-lg ring-2 sm:ring-4 ring-white dark:ring-slate-800"
                        >
                          <CheckCircle className="w-3 h-3 sm:w-5 h-5" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          ) : (
            /* --- Letter Detail View (Split Screen) --- */
            <motion.div 
              key="trace-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col lg:flex-row p-4 sm:p-8 lg:p-12 pb-32 sm:pb-40 lg:pb-32 gap-8 lg:gap-12 items-center lg:items-center justify-start lg:justify-center max-w-7xl mx-auto w-full overflow-y-auto"
            >
              {/* Illustration & Verse (Top on Mobile, Right on Desktop) */}
              <div className="w-full lg:w-1/2 flex flex-col items-center justify-center gap-6 lg:gap-12 order-2 lg:order-2">
                <div className="w-full max-w-md lg:max-w-none aspect-[4/3] border-4 lg:border-8 border-slate-800 dark:border-slate-700 rounded-[32px] lg:rounded-[60px] p-6 lg:p-12 flex flex-col items-center justify-center relative bg-white dark:bg-slate-900 group hover:scale-[1.02] transition-all shadow-xl lg:shadow-2xl">
                  {/* Big Visual Header */}
                  <div className="absolute -top-4 lg:-top-6 bg-slate-800 dark:bg-slate-700 text-white px-4 lg:px-8 py-2 lg:py-3 rounded-full font-black text-sm lg:text-2xl uppercase tracking-widest shadow-xl whitespace-nowrap">
                    {alphabet[currentLetterIdx].letter} is for {alphabet[currentLetterIdx].word}
                  </div>
                  
                  <div className="flex flex-col items-center gap-4 lg:gap-8">
                    {(() => {
                      const IconComp = ICONS[alphabet[currentLetterIdx].illustration] || Star;
                      return <IconComp className="w-32 h-32 lg:w-48 lg:h-48 text-slate-800 dark:text-white" strokeWidth={1} />;
                    })()}
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="text-center space-y-4 lg:space-y-6"
                >
                  <motion.div 
                    animate={{ 
                      y: [0, -5, 0],
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="space-y-1 lg:space-y-2"
                  >
                    <p className="text-xl lg:text-3xl font-medium text-slate-600 dark:text-slate-300 italic leading-snug px-4">"{alphabet[currentLetterIdx].verse}"</p>
                    <p className="text-blue-500 font-black text-[10px] lg:text-xs uppercase tracking-[0.3em]">{alphabet[currentLetterIdx].reference}</p>
                  </motion.div>

                  <div className="flex items-center justify-center gap-3 lg:gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        playUISound('click');
                        handleRecord();
                      }}
                      className="flex items-center gap-2 lg:gap-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 px-4 lg:px-8 py-3 lg:py-4 rounded-2xl lg:rounded-3xl border-2 border-red-100 dark:border-red-900/20 font-black uppercase tracking-wider text-xs lg:text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-all shadow-sm"
                    >
                      <Mic className="w-5 h-5 lg:w-6 lg:h-6" />
                      {activeProfile.voiceRecordings[alphabet[currentLetterIdx].letter] ? "Mommy's Voice" : "Record It"}
                    </motion.button>
                    {activeProfile.voiceRecordings[alphabet[currentLetterIdx].letter] && (
                       <motion.button 
                         whileHover={{ scale: 1.1, rotate: 10 }}
                         whileTap={{ scale: 0.9 }}
                         onClick={() => {
                           const audio = new Audio(activeProfile.voiceRecordings[alphabet[currentLetterIdx].letter]);
                           audio.play();
                         }}
                         className="p-3 lg:p-4 bg-purple-100 text-purple-600 rounded-2xl lg:rounded-3xl hover:bg-purple-200 transition-all shadow-sm"
                       >
                         <Play className="w-6 h-6 lg:w-8 lg:h-8 fill-current" />
                       </motion.button>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Tracing Area (Bottom on Mobile, Left on Desktop) */}
              <div className="w-full lg:w-1/2 flex flex-col items-center justify-center order-1 lg:order-1 gap-4">
                {viewMode === 'letter' ? (
                  <LetterTracer 
                    letter={alphabet[currentLetterIdx].letter}
                    word={alphabet[currentLetterIdx].word}
                    verse={alphabet[currentLetterIdx].verse}
                    isUppercase={isUppercase}
                    onComplete={completeLetter}
                    voiceRecording={activeProfile.voiceRecordings[alphabet[currentLetterIdx].letter]}
                    onRecord={handleRecord}
                    difficulty={activeProfile.difficulty}
                    soundVolume={settings.soundVolume}
                    soundEnabled={settings.soundEnabled}
                    voiceEnabled={settings.voiceEnabled}
                    darkMode={settings.darkMode}
                  />
                ) : (
                  <SentenceTracer 
                    sentence={alphabet[currentLetterIdx].word}
                    onComplete={completeWord}
                    difficulty={activeProfile.difficulty}
                    soundVolume={settings.soundVolume}
                    soundEnabled={settings.soundEnabled}
                    voiceEnabled={settings.voiceEnabled}
                    darkMode={settings.darkMode}
                  />
                )}

                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-colors">
                  <button
                    onClick={() => {
                      playUISound('select');
                      setViewMode('letter');
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'letter' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
                  >
                    Letter
                  </button>
                  <button
                    onClick={() => {
                      playUISound('select');
                      setViewMode('word');
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'word' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
                  >
                    Word
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ProgressFooter
        currentLetterIdx={currentLetterIdx}
        setCurrentLetterIdx={setCurrentLetterIdx}
        setViewMode={setViewMode}
        isUppercase={isUppercase}
        setIsUppercase={setIsUppercase}
        playUISound={playUISound}
      />

      {showDashboard && (
        <ParentDashboard 
          profiles={profiles}
          onAddProfile={addProfile}
          onUpdateProfileDifficulty={updateProfileDifficulty}
          onDeleteProfile={deleteProfile}
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setShowDashboard(false)}
          alphabet={alphabet}
          onUpdateVerse={updateVerse}
          onUpdateIllustration={updateIllustration}
          availableIcons={ICONS}
        />
      )}

      <ParentGate 
        isOpen={showParentGate}
        onSuccess={() => {
          setShowParentGate(false);
          setShowDashboard(true);
        }}
        onCancel={() => setShowParentGate(false)}
      />

      <AddProfileModal 
        isOpen={showAddProfile}
        onAdd={(name, avatar, difficulty) => {
          addProfile(name, avatar, difficulty);
          setShowAddProfile(false);
        }}
        onCancel={() => setShowAddProfile(false)}
      />

      {activeProfile && currentLetterIdx !== null && (
        <ColoringPage
          letter={alphabet[currentLetterIdx].letter}
          word={alphabet[currentLetterIdx].word}
          isOpen={showColoringPage}
          onClose={() => setShowColoringPage(false)}
          darkMode={settings.darkMode}
        />
      )}

      {activeProfile && (
        <CelebrationOverlay 
          isOpen={showCelebration}
          userName={activeProfile.name}
          badgeCount={activeProfile.badges.length}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}

function UserPlusIcon() {
  return (
    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}

