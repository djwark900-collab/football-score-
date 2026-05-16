import { User } from 'firebase/auth';
import { Search as SearchIcon, Plus as PlusIcon, User as UserIcon, Trophy as TrophyIcon, Lock as LockIcon, X as XIcon, Users as UsersIcon, Target as TargetIcon, Bell as BellIcon, Star as StarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useRef, useEffect } from 'react';
import { League, Team, Player } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  setView: (view: any) => void;
  isAdmin: boolean;
  onAdminClick: () => void;
  leagues: League[];
  teams: Team[];
  players: Player[];
  onLeagueClick: (id: string) => void;
  onTeamClick: (id: string) => void;
  onPlayerClick: (id: string) => void;
  t: (key: string) => string;
}

export function Header({ 
  user, 
  onLogin, 
  setView, 
  isAdmin, 
  onAdminClick,
  leagues,
  teams,
  players,
  onLeagueClick,
  onTeamClick,
  onPlayerClick,
  t
}: HeaderProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 h-16 flex items-center px-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto w-full flex justify-between items-center relative">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('matches')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-3d-sm ring-2 ring-blue-500/20 group-hover:shadow-3d-md transition-all">
            <TrophyIcon className="text-white w-6 h-6 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-blue-900 dark:text-white leading-none">LiveScore<span className="text-blue-500">Pro</span></h1>
            <div className="flex items-center gap-2 mt-1 ml-0.5">
              <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Premium Sports</p>
              <span className="text-[7px] font-black bg-blue-500/10 text-blue-500 px-1 rounded uppercase tracking-tighter">v1.1.5</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('search')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <SearchIcon size={22} />
          </button>
          
          <button 
            onClick={onAdminClick}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-xs uppercase tracking-widest btn-3d border",
              isAdmin 
                ? "bg-green-500 text-white border-green-400 shadow-3d-md" 
                : "bg-white dark:bg-gray-800 text-gray-500 border-gray-100 dark:border-gray-700 shadow-3d-sm hover:shadow-3d-md"
            )}
          >
            {isAdmin ? <PlusIcon size={16} /> : <LockIcon size={16} />}
            <span className="hidden sm:inline">{isAdmin ? t('admin_panel') : t('admin')}</span>
          </button>

          <button 
            onClick={() => user ? setShowProfile(true) : onLogin()}
            className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden border-t border-l border-white/50 dark:border-white/10 shadow-3d-sm hover:shadow-3d-md transition-all btn-3d"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="text-gray-400" size={20} />
            )}
          </button>
        </div>

        <AnimatePresence>
          {showProfile && user && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProfile(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-xl border border-white/20 overflow-hidden"
              >
                <div className="p-8 text-center space-y-6">
                   <div className="relative inline-block">
                     <div className="w-24 h-24 rounded-[32px] bg-blue-600 p-1 shadow-3d-lg mx-auto overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} className="w-full h-full object-cover rounded-[28px]" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black italic">
                            {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </div>
                        )}
                     </div>
                     <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center">
                        <StarIcon size={12} className="text-white fill-white" />
                     </div>
                   </div>

                   <div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{user.displayName || 'Sports Enthusiast'}</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{user.email}</p>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-black text-blue-600 uppercase">Premium</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fan Since</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white">2024</p>
                      </div>
                   </div>

                   <div className="space-y-3 pt-4">
                     <button 
                      onClick={() => { setView('settings'); setShowProfile(false); }}
                      className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-3d-sm"
                     >
                       Edit Profile
                     </button>
                     <button 
                      onClick={() => setShowProfile(false)}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-3d-md hover:bg-blue-700 transition-all"
                     >
                       Close
                     </button>
                   </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
