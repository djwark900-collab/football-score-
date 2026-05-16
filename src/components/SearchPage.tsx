import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search as SearchIcon, 
  X as XIcon, 
  History as HistoryIcon, 
  Trophy as TrophyIcon, 
  Users as UsersIcon, 
  Target as TargetIcon,
  ChevronRight as ChevronRightIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { League, Team, Player } from '../types';
import { cn } from '../lib/utils';

interface SearchPageProps {
  leagues: League[];
  teams: Team[];
  players: Player[];
  onLeagueClick: (id: string) => void;
  onTeamClick: (id: string) => void;
  onPlayerClick: (id: string) => void;
  onBack: () => void;
  t: (key: string) => string;
}

type RecentSearch = {
  id: string;
  type: 'league' | 'team' | 'player' | 'query';
  name: string;
  logo?: string;
  timestamp: number;
};

export function SearchPage({
  leagues,
  teams,
  players,
  onLeagueClick,
  onTeamClick,
  onPlayerClick,
  onBack,
  t
}: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'leagues' | 'teams' | 'players'>('all');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  const saveRecentSearch = (item: RecentSearch) => {
    const updated = [item, ...recentSearches.filter(s => s.id !== item.id)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  const removeRecentSearch = (id: string) => {
    const updated = recentSearches.filter(s => s.id !== id);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
  };

  const filteredTeams = useMemo(() => {
    const results = teams.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
    return query.length < 2 && activeCategory !== 'teams' ? [] : (activeCategory === 'all' ? results.slice(0, 5) : results);
  }, [query, teams, activeCategory]);

  const filteredLeagues = useMemo(() => {
    const results = leagues.filter(l => l.name.toLowerCase().includes(query.toLowerCase()));
    return query.length < 2 && activeCategory !== 'leagues' ? [] : (activeCategory === 'all' ? results.slice(0, 5) : results);
  }, [query, leagues, activeCategory]);

  const filteredPlayers = useMemo(() => {
    const results = players.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    return query.length < 2 && activeCategory !== 'players' ? [] : (activeCategory === 'all' ? results.slice(0, 10) : results);
  }, [query, players, activeCategory]);

  const hasResults = filteredTeams.length > 0 || filteredLeagues.length > 0 || filteredPlayers.length > 0;

  const categories = [
    { id: 'all', label: 'All', icon: TargetIcon },
    { id: 'leagues', label: 'Leagues', icon: TrophyIcon },
    { id: 'teams', label: 'Teams', icon: UsersIcon },
    { id: 'players', label: 'Players', icon: TargetIcon },
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[80vh] flex flex-col gap-6"
    >
      {/* Search Header */}
      <div className="sticky top-16 z-40 pt-4 pb-6 bg-mesh-fade backdrop-blur-md space-y-4">
        <div className="relative group">
          <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={24} />
          <input 
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full h-16 pl-16 pr-20 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-[32px] font-black text-lg focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-3d-sm dark:text-white"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
            >
              <XIcon size={20} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-2 -mx-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all border shadow-3d-sm",
                activeCategory === cat.id 
                  ? "bg-emerald-500 text-white border-emerald-400" 
                  : "bg-white dark:bg-gray-900 text-gray-400 border-gray-100 dark:border-gray-800 hover:border-emerald-500/30"
              )}
            >
              <cat.icon size={12} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-10 pb-20">
        {!query && (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.2em] flex items-center gap-2">
                    <HistoryIcon size={14} />
                    {t('recent_searches') || 'Recent Searches'}
                  </h3>
                  <button 
                    onClick={clearAllRecent}
                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-none -mx-2">
                  {recentSearches.map((search) => (
                    <motion.div
                      layout
                      key={search.id}
                      className="group relative flex-shrink-0"
                    >
                      <button
                        onClick={() => {
                          if (search.type === 'league') onLeagueClick(search.id);
                          if (search.type === 'team') onTeamClick(search.id);
                          if (search.type === 'player') onPlayerClick(search.id);
                          if (search.type === 'query') setQuery(search.name);
                        }}
                        className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-[28px] border border-gray-100 dark:border-gray-800 hover:border-emerald-500/30 hover:shadow-3d-lg transition-all btn-3d min-w-[100px]"
                      >
                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner border border-white/50 dark:border-white/5">
                          {search.logo ? (
                            <img src={search.logo} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            search.type === 'league' ? <TrophyIcon size={20} className="text-gray-400" /> :
                            search.type === 'team' ? <UsersIcon size={20} className="text-gray-400" /> :
                            <TargetIcon size={20} className="text-gray-400" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate max-w-[80px]">
                          {search.name}
                        </span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(search.id);
                        }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 shadow-3d-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon size={12} className="text-gray-400" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Popular / Trending (Mocked for now or can use best players/teams) */}
            <section className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.2em] flex items-center gap-2 px-2">
                <TargetIcon size={14} />
                Browse Categories
              </h3>
              <div className="grid grid-cols-2 gap-4 px-2">
                 {categories.filter(c => c.id !== 'all').map(cat => (
                   <button
                     key={cat.id}
                     onClick={() => setActiveCategory(cat.id)}
                     className="p-6 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 hover:border-emerald-500/30 hover:shadow-3d-lg transition-all group text-center flex flex-col items-center gap-3"
                   >
                     <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                        <cat.icon size={24} />
                     </div>
                     <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{cat.label}</span>
                   </button>
                 ))}
                 <button
                    onClick={() => { /* Could open a discovery tool or similar */ }}
                    className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] border border-emerald-400 hover:shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all group text-center flex flex-col items-center justify-center gap-3 shadow-3d-md"
                 >
                    <StarIcon size={24} className="text-white animate-pulse" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">Discovery</span>
                 </button>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.2em] flex items-center gap-2 px-2">
                <TrendingUpIcon size={14} />
                Trending Teams
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {teams.slice(0, 6).map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      saveRecentSearch({ id: team.id, type: 'team', name: team.name, logo: team.logo, timestamp: Date.now() });
                      onTeamClick(team.id);
                    }}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-emerald-500/30 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                      {team.logo ? <img src={team.logo} alt="" className="w-full h-full object-contain p-1" /> : <UsersIcon size={18} className="text-gray-300" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-black text-gray-900 dark:text-white truncate">{team.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Team</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {(query || activeCategory !== 'all') && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {hasResults ? (
              <>
                {/* Leagues Section */}
                {(activeCategory === 'all' || activeCategory === 'leagues') && filteredLeagues.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between px-4">
                       <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Leagues</h3>
                       {activeCategory === 'all' && filteredLeagues.length >= 5 && (
                         <button onClick={() => setActiveCategory('leagues')} className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">See All</button>
                       )}
                    </div>
                    <div className="space-y-1">
                      {filteredLeagues.map(league => (
                        <button
                          key={league.id}
                          onClick={() => {
                            saveRecentSearch({ id: league.id, type: 'league', name: league.name, logo: league.logo, timestamp: Date.now() });
                            onLeagueClick(league.id);
                          }}
                          className="w-full flex items-center gap-4 p-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 rounded-3xl transition-all group text-left"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-3d-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            {league.logo ? <img src={league.logo} alt="" className="w-full h-full object-contain p-2" /> : <TrophyIcon className="text-emerald-600" size={20} />}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-gray-900 dark:text-white text-sm">{league.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{league.country || 'International'}</p>
                          </div>
                          <ChevronRightIcon size={18} className="text-gray-200 group-hover:text-emerald-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Teams Section */}
                {(activeCategory === 'all' || activeCategory === 'teams') && filteredTeams.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between px-4">
                       <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Teams</h3>
                       {activeCategory === 'all' && filteredTeams.length >= 5 && (
                         <button onClick={() => setActiveCategory('teams')} className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">See All</button>
                       )}
                    </div>
                    <div className="space-y-1">
                      {filteredTeams.map(team => (
                        <button
                          key={team.id}
                          onClick={() => {
                            saveRecentSearch({ id: team.id, type: 'team', name: team.name, logo: team.logo, timestamp: Date.now() });
                            onTeamClick(team.id);
                          }}
                          className="w-full flex items-center gap-4 p-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 rounded-3xl transition-all group text-left"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-3d-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                            {team.logo ? <img src={team.logo} alt="" className="w-full h-full object-contain p-2" /> : <UsersIcon className="text-emerald-600" size={20} />}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-gray-900 dark:text-white text-sm">{team.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team • {team.city || 'Club'}</p>
                          </div>
                          <ChevronRightIcon size={18} className="text-gray-200 group-hover:text-emerald-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Players Section */}
                {(activeCategory === 'all' || activeCategory === 'players') && filteredPlayers.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between px-4">
                       <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Players</h3>
                       {activeCategory === 'all' && filteredPlayers.length >= 10 && (
                         <button onClick={() => setActiveCategory('players')} className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">See All</button>
                       )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredPlayers.map(player => {
                        const team = teams.find(t => t.id === player.teamId);
                        return (
                          <button
                            key={player.id}
                            onClick={() => {
                              saveRecentSearch({ id: player.id, type: 'player', name: player.name, logo: player.imageUrl, timestamp: Date.now() });
                              onPlayerClick(player.id);
                            }}
                            className="flex items-center gap-4 p-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 rounded-3xl transition-all group text-left"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-3d-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                              {player.imageUrl ? <img src={player.imageUrl} alt="" className="w-full h-full object-cover" /> : <TargetIcon className="text-emerald-600" size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-gray-900 dark:text-white text-sm truncate">{player.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-emerald-500">{player.position}</span>
                                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                <span className="text-[10px] font-bold text-gray-400 truncate">{team?.name}</span>
                              </div>
                            </div>
                            <ChevronRightIcon size={18} className="text-gray-200 group-hover:text-emerald-500 transition-colors shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="py-20 text-center flex flex-col items-center gap-6">
                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-[40px] flex items-center justify-center border-t-2 border-white/50 shadow-3d-sm">
                   <SearchIcon size={40} className="text-gray-200" />
                </div>
                <div>
                   <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">No Results Found</p>
                   <p className="text-sm font-medium text-gray-400 mt-1">We couldn't find any {activeCategory !== 'all' ? activeCategory : ''} matching "{query}"</p>
                </div>
                <button 
                  onClick={() => { setQuery(''); setActiveCategory('all'); }}
                  className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-3d-md hover:bg-emerald-600 transition-all"
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
