import { User } from 'firebase/auth';
import { Search as SearchIcon, Plus as PlusIcon, User as UserIcon, Trophy as TrophyIcon, Lock as LockIcon, X as XIcon, Users as UsersIcon, Target as TargetIcon, Bell as BellIcon } from 'lucide-react';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredResults = searchQuery.trim() === '' ? [] : [
    ...leagues.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())).map(l => ({ type: 'league' as const, data: l })),
    ...teams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(t => ({ type: 'team' as const, data: t })),
    ...players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => ({ type: 'player' as const, data: p }))
  ].slice(0, 8);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 h-16 flex items-center px-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto w-full flex justify-between items-center relative">
        <div className={cn("flex items-center gap-3 cursor-pointer transition-opacity", isSearchOpen ? "opacity-0 pointer-events-none" : "opacity-100")} onClick={() => setView('matches')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-3d-sm ring-2 ring-blue-500/20 group hover:shadow-3d-md transition-all">
            <TrophyIcon className="text-white w-6 h-6 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-blue-900 dark:text-white leading-none">LiveScore<span className="text-blue-500">Pro</span></h1>
            <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mt-1 ml-0.5">Premium Sports</p>
          </div>
        </div>

        <div className={cn(
          "absolute inset-0 flex items-center gap-4 transition-all duration-300",
          isSearchOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"
        )} ref={searchRef}>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              autoFocus={isSearchOpen}
              type="text"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white dark:bg-gray-900 border-t border-l border-white/50 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-600 font-medium text-sm transition-all shadow-3d-sm dark:text-white dark:placeholder-gray-500"
            />
            
            <AnimatePresence>
              {searchQuery.trim() !== '' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-14 left-0 right-0 card-3d shadow-3d-xl overflow-hidden z-50 p-2"
                >
                  {filteredResults.length > 0 ? (
                    <div className="space-y-1">
                      {filteredResults.map((result, idx) => (
                        <button
                          key={`${result.type}-${result.data.id}`}
                          onClick={() => {
                            if (result.type === 'league') onLeagueClick(result.data.id);
                            if (result.type === 'team') onTeamClick(result.data.id);
                            if (result.type === 'player') onPlayerClick(result.data.id);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all group text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:text-blue-600 transition-all overflow-hidden shadow-3d-sm">
                            {result.type === 'league' && (
                              (result.data as League).logo ? (
                                <img src={(result.data as League).logo} alt="" className="w-full h-full object-contain p-1" />
                              ) : <TrophyIcon size={18} />
                            )}
                            {result.type === 'team' && (
                              (result.data as Team).logo ? (
                                <img src={(result.data as Team).logo} alt="" className="w-full h-full object-contain p-1" />
                              ) : <UsersIcon size={18} />
                            )}
                            {result.type === 'player' && (
                              (result.data as Player).imageUrl ? (
                                <img src={(result.data as Player).imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : <TargetIcon size={18} />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                              {result.data.name}
                            </p>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                              {result.type}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400 font-medium">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            className="p-3 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800 rounded-2xl transition-all"
          >
            <XIcon size={22} />
          </button>
        </div>

        <div className={cn("flex items-center gap-4 transition-opacity", isSearchOpen ? "opacity-0 pointer-events-none" : "opacity-100")}>
          <button 
            onClick={() => setIsSearchOpen(true)}
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
            onClick={user ? undefined : onLogin}
            className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden border-t border-l border-white/50 dark:border-white/10 shadow-3d-sm hover:shadow-3d-md transition-all btn-3d"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="text-gray-400" size={20} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
