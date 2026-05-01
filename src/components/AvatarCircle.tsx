import { User, CheckCircle, Crown, Flame, Globe, Heart, HeartPulse, Lightbulb, Rainbow, Scroll, Ship, Sparkles, Star, Tent, Timer, Zap, Cloud, CloudRain, Dog, Fish, Rabbit, Cat, Leaf, Music, Baby, Bird, ArrowUp, Grape, Bell, Cross, Gift, Sun, Moon, Hand, Smile, BookOpen, History, Mountain } from 'lucide-react';

const ICONS: Record<string, any> = {
  user: User,
  gift: Gift,
  cross: Cross,
  sun: Sun,
  moon: Moon,
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
  zap: Zap,
  flame: Flame,
  rain: CloudRain,
  cat: Cat,
  dog: Dog,
  fish: Fish,
  rabbit: Rabbit,
};

const EMOJI_AVATARS: Record<string, string> = {
  sheep: '🐑', lion: '🦁', dove: '🕊️', fish: '🐟',
  star: '⭐', rainbow: '🌈', sun: '☀️', heart: '❤️',
  angel: '😇', crown: '👑', butterfly: '🦋', turtle: '🐢',
};

interface AvatarCircleProps {
  avatar: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function AvatarCircle({ avatar, size = 'md' }: AvatarCircleProps) {
  const sizeClasses = { sm: 'w-11 h-11 text-2xl', md: 'w-16 h-16 text-3xl', lg: 'w-24 h-24 text-5xl' };
  const cls = sizeClasses[size];

  if (avatar.includes('|')) {
    const [emojiId, bgColor] = avatar.split('|');
    const emoji = EMOJI_AVATARS[emojiId] ?? '🐑';
    return (
      <div className={`${cls} ${bgColor ?? 'bg-amber-400'} rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shadow-md`}>
        {emoji}
      </div>
    );
  }

  const IconComp = ICONS[avatar] || User;
  return (
    <div className={`${cls} bg-blue-500 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-800 shadow-md`}>
      <IconComp className="w-1/2 h-1/2" />
    </div>
  );
}
