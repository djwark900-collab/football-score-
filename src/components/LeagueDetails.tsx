import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { League, Team, Game } from '../types';
import { 
  Trophy as TrophyIcon, 
  Calendar as CalendarIcon, 
  TrendingUp as TrendingUpIcon, 
  ChevronLeft as ChevronLeftIcon,
  Plus as PlusIcon,
  Shield as ShieldIcon,
  BookOpen as BookOpenIcon,
  History as HistoryIcon,
  Target as TargetIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GameCard } from './GameCard';
import { Standings } from './Standings';
import { Player } from '../types';

interface LeagueDetailsProps {
  league: League;
  teams: Team[];
  games: Game[];
  leagues: League[];
  players: Player[];
  onBack: () => void;
  onGameClick: (gameId: string) => void;
  onTeamClick: (teamId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  isAdmin: boolean;
  onAddGame: () => void;
  followedGames: string[];
  onToggleFollowMatch: (gameId: string) => void;
}

type Tab = 'matches' | 'table' | 'stats' | 'history';

export function LeagueDetails({ league, teams, games, leagues, players, onBack, onGameClick, onTeamClick, onPlayerClick, isAdmin, onAddGame, followedGames, onToggleFollowMatch }: LeagueDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('matches');

  const leagueTeams = useMemo(() => 
    teams.filter(t => t.leagueId === league.id), 
    [teams, league.id]
  );
  
  const leagueGames = useMemo(() => 
    games.filter(g => g.leagueId === league.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [games, league.id]
  );

  const gamesByRound = useMemo(() => {
    const grouped: Record<string, Game[]> = {};
    const roundsOrder = ['Group Stage', 'Knockout Stage', 'Knockout', 'Playoff', 'Quarter-final', 'Semi-final', 'Semi-finals', 'semi finals', 'Final'];
    
    leagueGames.forEach(g => {
      const round = g.round || 'Other';
      if (!grouped[round]) grouped[round] = [];
      grouped[round].push(g);
    });
    
    // Sort keys based on predefined order if it's a cup
    if (league.type === 'cup') {
      const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const idxA = roundsOrder.indexOf(a);
        const idxB = roundsOrder.indexOf(b);
        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      const sorted: Record<string, Game[]> = {};
      sortedKeys.forEach(k => sorted[k] = grouped[k]);
      return sorted;
    }
    
    return grouped;
  }, [leagueGames, league.type]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-[40px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.1] scale-[4] rotate-12 pointer-events-none text-gray-900 dark:text-white">
          <TrophyIcon size={120} />
        </div>
        
        <button 
          onClick={onBack}
          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors self-start sm:self-center relative z-10"
        >
          <ChevronLeftIcon size={24} />
        </button>
        
        <div className="flex items-center gap-4 flex-1 relative z-10">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center p-3 shadow-inner",
            league.type === 'cup' ? "bg-purple-50 dark:bg-purple-900/20" : "bg-blue-50 dark:bg-blue-900/20"
          )}>
             {league.logo ? (
               <img src={league.logo} alt={league.name} className="w-full h-full object-contain" />
             ) : (
               <TrophyIcon className={cn("w-8 h-8", league.type === 'cup' ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400")} />
             )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{league.name}</h2>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {league.country || 'International'}
              </p>
              {league.description && (
                <p className="text-gray-300 font-medium text-[10px] truncate max-w-[200px] border-l border-gray-100 dark:border-gray-800 pl-3">{league.description}</p>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <button 
            onClick={onAddGame}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all relative z-10"
          >
            <PlusIcon size={20} />
            Add Game
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm w-full sm:w-fit overflow-x-auto scrollbar-none transition-all">
        <button 
          onClick={() => setActiveTab('matches')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
            activeTab === 'matches' ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/40" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <CalendarIcon size={18} />
          Matches
        </button>
        <button 
          onClick={() => setActiveTab('table')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
            activeTab === 'table' ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/40" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <TrendingUpIcon size={18} />
          Standings
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
            activeTab === 'stats' ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/40" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <TargetIcon size={18} />
          Stats
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
            activeTab === 'history' ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/40" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <BookOpenIcon size={18} />
          History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'matches' && (
          <motion.div
            key="matches-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {Object.keys(gamesByRound).length > 0 ? (
              (Object.entries(gamesByRound) as [string, Game[]][]).map(([round, roundGames]) => (
                <div key={round} className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 dark:text-gray-600">{round}</span>
                    <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1" />
                  </div>
                  <div className="grid gap-4">
                    {roundGames.map(game => (
                      <GameCard 
                        key={game.id}
                        game={game} 
                        teams={teams}
                        leagues={leagues}
                        onClick={() => onGameClick(game.id)}
                        onTeamClick={onTeamClick}
                        isLive={game.status === 'live'}
                        isFollowing={followedGames.includes(game.id)}
                        onToggleFollow={() => onToggleFollowMatch(game.id)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 text-gray-400 transition-all">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold">No matches scheduled yet for this league.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'table' && (
          <motion.div
            key="table-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Standings 
              leagues={[league]}
              teams={leagueTeams}
              games={leagueGames}
              onTeamClick={onTeamClick}
            />
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div
            key="stats-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-xl dark:shadow-black/20 overflow-hidden transition-all duration-300">
               <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                  <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 dark:shadow-blue-900/40">
                          <TargetIcon className="text-white" size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black dark:text-white">Top Scorers</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Goal Rankings</p>
                      </div>
                  </div>
               </div>
               
               <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {(() => {
                    const goalMap: Record<string, number> = {};
                    leagueGames.forEach(game => {
                      game.events?.forEach(event => {
                        if (event.type === 'goal') {
                          goalMap[event.playerId] = (goalMap[event.playerId] || 0) + 1;
                        }
                      });
                    });

                    const scorers = Object.entries(goalMap)
                      .map(([playerId, goals]) => ({ playerId, goals }))
                      .sort((a, b) => b.goals - a.goals)
                      .slice(0, 10);

                    if (scorers.length === 0) {
                      return (
                        <div className="p-12 text-center text-gray-400">
                          <p>No goals recorded yet this league.</p>
                        </div>
                      );
                    }

                    return scorers.map((s, i) => {
                      const player = players.find(p => p.id === s.playerId);
                      const team = teams.find(t => t.id === player?.teamId);
                      return (
                        <div 
                          key={s.playerId} 
                          className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                          onClick={() => onPlayerClick?.(s.playerId)}
                        >
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "w-8 h-8 flex items-center justify-center rounded-xl font-black text-sm transition-all",
                              i === 0 ? "bg-yellow-400 text-yellow-950 scale-110 shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20" :
                              i === 1 ? "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300" :
                              i === 2 ? "bg-orange-300 dark:bg-orange-900 text-orange-900 dark:text-orange-200" :
                              "text-gray-300 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-gray-200"
                            )}>
                              {i + 1}
                            </span>
                            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
                              {player?.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <ShieldIcon className="p-2 text-gray-200 dark:text-gray-700" />}
                            </div>
                            <div>
                               <p className="font-black text-gray-900 dark:text-white transition-colors">{player?.name || 'Unknown'}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <div className="w-3 h-3">
                                   {team?.logo && <img src={team.logo} className="w-full h-full object-contain" />}
                                 </div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase">{team?.name || 'No Team'}</span>
                               </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-xl font-black text-blue-600 dark:text-blue-400">{s.goals}</span>
                             <span className="text-[10px] font-black uppercase text-gray-300 dark:text-gray-600">Goals</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm transition-all"
          >
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
                 <HistoryIcon size={24} className="text-yellow-600 dark:text-yellow-400" />
               </div>
               <h3 className="text-xl font-black dark:text-white">League History</h3>
            </div>
            
            {league.history && league.history.length > 0 ? (
              <div className="space-y-4">
                {league.history.map((h, i) => {
                  const winner = teams.find(t => t.id === h.winnerId);
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-3xl group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <span className="font-black text-gray-300 dark:text-gray-600">{h.season}</span>
                      <div className="flex items-center gap-3">
                         <span className="font-bold text-sm dark:text-white">{winner?.name}</span>
                         <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 p-1 shadow-sm">
                            {winner?.logo ? <img src={winner.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={16} className="text-gray-200 dark:text-gray-700" />}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-6">
                 <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                   <TrophyIcon size={24} className="text-gray-200 dark:text-gray-700" />
                 </div>
                 <p className="text-gray-400 font-bold mb-2">No history records available.</p>
                 <p className="text-gray-300 dark:text-gray-600 text-xs">Historical data will appear here once seasons conclude.</p>
              </div>
            )}
            
            {league.description && (
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">About the Competition</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{league.description}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
