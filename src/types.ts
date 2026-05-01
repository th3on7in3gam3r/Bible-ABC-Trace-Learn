/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AlphabetItem {
  letter: string;
  word: string;
  verse: string;
  illustration: string; // URL or icon key
  reference: string;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface TracingPoint {
  x: number;
  y: number;
  hit: boolean;
}

export interface TracingParticle {
  id: number;
  x: number;
  y: number;
}

export interface TracingConfig {
  lineWidth: number;
  radius: number;
  threshold: number;
  dotPulse: number;
}

export const TRACE_CONFIG: Record<DifficultyLevel, TracingConfig> = {
  easy: { lineWidth: 36, radius: 45, threshold: 60, dotPulse: 4 },
  medium: { lineWidth: 24, radius: 30, threshold: 75, dotPulse: 3 },
  hard: { lineWidth: 16, radius: 20, threshold: 85, dotPulse: 2 },
};

export const DEFAULT_ALPHABET: AlphabetItem[] = [
  { letter: 'A', word: 'Adam', verse: 'God created Adam in His image.', reference: 'Genesis 1:27', illustration: 'user' },
  { letter: 'B', word: 'Bless', verse: 'Every good gift is a blessing from God.', reference: 'James 1:17', illustration: 'gift' },
  { letter: 'C', word: 'Cross', verse: 'God showed His love through the Cross.', reference: 'John 3:16', illustration: 'cross' },
  { letter: 'D', word: 'David', verse: 'David was a man after God\'s own heart.', reference: 'Acts 13:22', illustration: 'music' },
  { letter: 'E', word: 'Eden', verse: 'God made a beautiful garden called Eden.', reference: 'Genesis 2:8', illustration: 'leaf' },
  { letter: 'F', word: 'Faith', verse: 'Faith is being sure of what we hope for.', reference: 'Hebrews 11:1', illustration: 'sun' },
  { letter: 'G', word: 'God', verse: 'God is Love.', reference: '1 John 4:8', illustration: 'heart' },
  { letter: 'H', word: 'Heaven', verse: 'God lives in Heaven above.', reference: 'Psalm 115:3', illustration: 'cloud' },
  { letter: 'I', word: 'Isaac', verse: 'Isaac was a child of promise.', reference: 'Genesis 21:3', illustration: 'smile' },
  { letter: 'J', word: 'Jesus', verse: 'Jesus loves the little children.', reference: 'Matthew 19:14', illustration: 'star' },
  { letter: 'K', word: 'King', verse: 'Be kind to one another.', reference: 'Ephesians 4:32', illustration: 'hand' },
  { letter: 'L', word: 'Love', verse: 'Love never fails.', reference: '1 Corinthians 13:8', illustration: 'heart-pulse' },
  { letter: 'M', word: 'Moses', verse: 'God spoke to Moses.', reference: 'Exodus 3:4', illustration: 'scroll' },
  { letter: 'N', word: 'Noah', verse: 'Noah built a big ark.', reference: 'Genesis 6:14', illustration: 'ship' },
  { letter: 'O', word: 'Obey', verse: 'Children, obey your parents.', reference: 'Ephesians 6:1', illustration: 'check-circle' },
  { letter: 'P', word: 'Prayer', verse: 'Pray without ceasing.', reference: '1 Thessalonians 5:17', illustration: 'sparkles' },
  { letter: 'Q', word: 'Queen', verse: 'Queen Esther saved her people.', reference: 'Esther 8:1', illustration: 'crown' },
  { letter: 'R', word: 'Rain', verse: 'The rainbow is a sign of God\'s promise.', reference: 'Genesis 9:13', illustration: 'rainbow' },
  { letter: 'S', word: 'Sheep', verse: 'The Lord is my Shepherd.', reference: 'Psalm 23:1', illustration: 'mountains' },
  { letter: 'T', word: 'Truth', verse: 'God\'s word is the truth.', reference: 'John 17:17', illustration: 'book-open' },
  { letter: 'U', word: 'Unity', verse: 'The universe declares God\'s glory.', reference: 'Psalm 19:1', illustration: 'globe' },
  { letter: 'V', word: 'Vine', verse: 'Jesus is the true Vine.', reference: 'John 15:1', illustration: 'grape' },
  { letter: 'W', word: 'Wise', verse: 'Wisdom comes from the Lord.', reference: 'Proverbs 2:6', illustration: 'lightbulb' },
  { letter: 'X', word: 'eXalt', verse: 'Exalt the Lord our God.', reference: 'Psalm 99:5', illustration: 'arrow-up' },
  { letter: 'Y', word: 'Yes', verse: 'Jesus is the same yesterday and today.', reference: 'Hebrews 13:8', illustration: 'history' },
  { letter: 'Z', word: 'Zion', verse: 'Glorious things are spoken of Zion.', reference: 'Psalm 87:3', illustration: 'tent' },
];

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Icon identifier (e.g., 'angel', 'dove')
  difficulty: DifficultyLevel;
  points: number;
  badges: string[];
  progress: Record<string, boolean>; // letter -> completed
  voiceRecordings: Record<string, string>; // letter -> blobUrl
}

export interface AppSettings {
  customVerses: Record<string, Partial<AlphabetItem>>;
  isParentVerified: boolean;
  screenTimeLimit: number; // in minutes
  musicVolume: number;
  soundVolume: number;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  darkMode: boolean;
}
