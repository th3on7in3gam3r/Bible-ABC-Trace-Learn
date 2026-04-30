/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from 'react';
import {X, UserPlus, Settings, Save, Trash2, Edit2, Music, Volume2, Trophy} from 'lucide-react';
import {AlphabetItem, UserProfile, AppSettings, DEFAULT_ALPHABET} from '../types';

const BADGES = [
  { id: 'explorer', name: 'Explorer', icon: 'sparkle', color: 'bg-green-400', description: 'Started the journey!' },
  { id: 'star-gazer', name: 'Star Gazer', icon: 'star', color: 'bg-cyan-400', description: 'Earned 100 points' },
  { id: 'scholar', name: 'Scholar', icon: 'zap', color: 'bg-blue-400', description: 'Traced 10 letters' },
  { id: 'faithful', name: 'Faithful', icon: 'heart', color: 'bg-red-400', description: 'Earned 500 points' },
  { id: 'alpha-pro', name: 'Alpha Pro', icon: 'flame', color: 'bg-purple-500', description: 'Earned 1000 points' },
  { id: 'master', name: 'Master', icon: 'crown', color: 'bg-yellow-400', description: 'Completed everything!' },
];

interface ParentDashboardProps {
  profiles: UserProfile[];
  onAddProfile: (name: string, avatar?: string, difficulty?: 'easy' | 'medium' | 'hard') => void;
  onUpdateProfileDifficulty: (id: string, difficulty: 'easy' | 'medium' | 'hard') => void;
  onDeleteProfile: (id: string) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onClose: () => void;
  alphabet: AlphabetItem[];
  onUpdateVerse: (letter: string, verse: string) => void;
  onUpdateIllustration: (letter: string, illustration: string) => void;
  availableIcons: Record<string, any>;
}

export default function ParentDashboard({
  profiles,
  onAddProfile,
  onUpdateProfileDifficulty,
  onDeleteProfile,
  settings,
  onUpdateSettings,
  onClose,
  alphabet,
  onUpdateVerse,
  onUpdateIllustration,
  availableIcons,
}: ParentDashboardProps) {
  const [newProfileName, setNewProfileName] = useState('');
  const [editLetter, setEditLetter] = useState<string | null>(null);
  const [tempVerse, setTempVerse] = useState('');
  const [tempIcon, setTempIcon] = useState('');

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfileName.trim()) {
      onAddProfile(newProfileName.trim());
      setNewProfileName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-2 sm:border-4 border-slate-100 dark:border-slate-800 transition-colors">
        <div className="p-4 sm:p-8 border-b-4 border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 transition-colors">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl sm:rounded-2xl">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">Parent Controls</h2>
              <p className="hidden sm:block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Global Settings & Customization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl sm:rounded-2xl transition-colors bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm">
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800 dark:text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-10 grid md:grid-cols-2 gap-8 sm:gap-12 transition-colors">
          {/* Section: Profiles */}
          <section className="space-y-6 sm:space-y-8">
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-lg sm:text-xl font-black flex items-center gap-3 text-slate-800 dark:text-white">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Buddy Profiles
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">Add or manage who uses the app.</p>
            </div>
            
            <form onSubmit={handleAddProfile} className="flex gap-2 p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 focus-within:border-blue-400 transition-all">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Buddy name..."
                className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-transparent outline-none font-bold text-sm sm:text-base min-w-0 dark:text-white"
              />
              <button 
                type="submit"
                className="bg-slate-800 dark:bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-xl font-black uppercase tracking-wider text-[10px] sm:text-xs hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-md shrink-0"
              >
                Add
              </button>
            </form>

            <div className="space-y-3 sm:space-y-4">
              {profiles.map(profile => (
                <div key={profile.id} className="p-4 sm:p-6 bg-white dark:bg-slate-800/50 rounded-2xl sm:rounded-3xl border-2 border-slate-100 dark:border-slate-700 group hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-110">
                        {(() => {
                          const Avatar = availableIcons[profile.avatar] || availableIcons.user;
                          return <Avatar className="w-5 h-5 sm:w-6 sm:h-6" />;
                        })()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-black text-slate-800 dark:text-white text-sm sm:text-base truncate">{profile.name}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{profile.points} Stars</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDeleteProfile(profile.id)}
                      className="p-2 sm:p-3 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-xl transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Badges Earned</label>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{profile.badges.length} / {BADGES.length}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {BADGES.map(badge => {
                        const isEarned = profile.badges.includes(badge.id);
                        const BadgeIcon = availableIcons[badge.icon] || availableIcons.sparkle;
                        return (
                          <div 
                            key={badge.id} 
                            className={`group relative aspect-square rounded-xl flex items-center justify-center transition-all ${isEarned ? `${badge.color} text-white shadow-sm ring-2 ring-white dark:ring-slate-800 ring-offset-2 ring-offset-transparent` : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 grayscale blur-[0.5px]'}`}
                          >
                            <BadgeIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 shadow-xl scale-90 group-hover:scale-100 origin-bottom">
                              <p className="text-[10px] font-black uppercase tracking-widest leading-none whitespace-nowrap">{badge.name}</p>
                              <p className="text-[8px] opacity-70 mt-1 whitespace-nowrap">{isEarned ? badge.description : 'Keep learning to unlock!'}</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-800" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between gap-4">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Tracing Difficulty</label>
                     <select 
                       value={profile.difficulty || 'medium'}
                       onChange={(e) => onUpdateProfileDifficulty(profile.id, e.target.value as any)}
                       className="text-[10px] sm:text-xs font-bold bg-slate-50 dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-700 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-slate-800 dark:text-white"
                     >
                       <option value="easy">Beginner (Easy)</option>
                       <option value="medium">Learner (Medium)</option>
                       <option value="hard">Master (Hard)</option>
                     </select>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Content Customization */}
          <section className="space-y-6 sm:space-y-8">
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-lg sm:text-xl font-black flex items-center gap-3 text-slate-800 dark:text-white">
                <Edit2 className="w-5 h-5 text-purple-500" />
                Verse Library
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">Customize the verses for each letter.</p>
            </div>
            
            <div className="space-y-3 sm:space-y-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {alphabet.map(item => (
                <div key={item.letter} className="p-4 sm:p-6 border-2 border-slate-100 dark:border-slate-700 rounded-2xl sm:rounded-[32px] bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{item.letter}</span>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest">{item.word}</span>
                  </div>
                  
                  {editLetter === item.letter ? (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Illustration Icon</label>
                        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-32 overflow-y-auto p-2 bg-white dark:bg-slate-700 rounded-xl border-2 border-slate-100 dark:border-slate-600">
                          {Object.keys(availableIcons).map(iconKey => {
                            const Icon = availableIcons[iconKey];
                            return (
                              <button
                                key={iconKey}
                                onClick={() => setTempIcon(iconKey)}
                                className={`p-2 rounded-lg transition-all ${tempIcon === iconKey ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                              >
                                <Icon className="w-4 h-4 sm:w-5 h-5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bible Verse</label>
                        <textarea
                          value={tempVerse}
                          onChange={(e) => setTempVerse(e.target.value)}
                          className="w-full p-3 sm:p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl sm:rounded-2xl text-xs sm:text-sm h-24 sm:h-32 resize-none bg-white dark:bg-slate-700 font-medium dark:text-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <button 
                          onClick={() => setEditLetter(null)}
                          className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            onUpdateVerse(item.letter, tempVerse);
                            onUpdateIllustration(item.letter, tempIcon);
                            setEditLetter(null);
                          }}
                          className="px-4 py-1.5 sm:px-6 sm:py-2 text-[10px] font-black uppercase bg-green-500 text-white rounded-lg sm:rounded-xl shadow-md border-b-4 border-green-700 active:translate-y-0.5"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-3 sm:gap-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 rounded-xl sm:rounded-2xl shrink-0">
                          {(() => {
                            const Icon = availableIcons[item.illustration] || availableIcons.star;
                            return <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-slate-800 dark:text-white" />;
                          })()}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">"{item.verse}"</p>
                      </div>
                      <button 
                        onClick={() => {
                          setEditLetter(item.letter);
                          setTempVerse(item.verse);
                          setTempIcon(item.illustration);
                        }}
                        className="p-2 sm:p-3 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-blue-500 hover:shadow-sm rounded-xl transition-all shrink-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 sm:p-8 border-t-4 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 text-center sm:text-left transition-colors">
          <div className="grid grid-cols-2 md:flex items-center gap-4 sm:gap-8 w-full sm:w-auto">
             <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                 <Music className="w-3 h-3 text-purple-400" />
                 Music
               </label>
               <input 
                 type="range"
                 min="0"
                 max="1"
                 step="0.1"
                 value={settings.musicVolume}
                 onChange={(e) => onUpdateSettings({ ...settings, musicVolume: parseFloat(e.target.value) })}
                 className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
               />
             </div>

             <div className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                 <Volume2 className="w-3 h-3 text-blue-400" />
                 Sound
               </label>
               <input 
                 type="range"
                 min="0"
                 max="1"
                 step="0.1"
                 value={settings.soundVolume}
                 onChange={(e) => onUpdateSettings({ ...settings, soundVolume: parseFloat(e.target.value) })}
                 className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
               />
             </div>

             <div className="space-y-1 col-span-2 md:col-span-1">
               <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Usage Limit</label>
               <select 
                 value={settings.screenTimeLimit}
                 onChange={(e) => onUpdateSettings({ ...settings, screenTimeLimit: parseInt(e.target.value) })}
                 className="w-full bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs font-bold outline-none cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors dark:text-white"
               >
                 <option value={15}>15 Mins</option>
                 <option value={30}>30 Mins</option>
                 <option value={60}>60 Mins</option>
                 <option value={0}>No Limit</option>
               </select>
             </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Bible ABC Trace & Learn v1.0</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5 font-medium">Safe & Ad-free for your child</p>
          </div>
        </div>
      </div>
    </div>
  );
}
