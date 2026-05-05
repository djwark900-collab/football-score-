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
  History as HistoryIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GameCard } from './GameCard';
import { Standings } from './Standings';

interface LeagueDetailsProps {
  league: League;
  teams: Team[];
  games: Game[];
  onBack: () => void;
  onGameClick: (gameId: string) => void;
  onTeamClick: (teamId: string) => void;
  isAdmin: boolean;
  onAddGame: () => void;
}

type Tab = 'matches' | 'table' | 'history';

export function LeagueDetails({ league, teams, games, onBack, onGameClick, onTeamClick, isAdmin, onAddGame }: LeagueDetailsProps) {
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
    leagueGames.forEach(g => {
      const round = g.round || 'Other';
      if (!grouped[round]) grouped[round] = [];
      grouped[round].push(g);
    });
    return grouped;
  }, [leagueGames]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-[4] rotate-12 pointer-events-none">
          <TrophyIcon size={120} />
        </div>
        
        <button 
          onClick={onBack}
          className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors self-start sm:self-center relative z-10"
        >
          <ChevronLeftIcon size={24} />
        </button>
        
        <div className="flex items-center gap-4 flex-1 relative z-10">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center p-3 shadow-inner">
             {league.logo ? (
               <img src={league.logo} alt={league.name} className="w-full h-full object-contain" />
             ) : (
               <TrophyIcon className="text-blue-600 w-8 h-8" />
             )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{league.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {league.country || 'International'}
              </p>
              {league.description && (
                <p className="text-gray-300 font-medium text-[10px] truncate max-w-[200px] border-l border-gray-100 pl-3">{league.description}</p>
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
      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-full sm:w-fit overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveTab('matches')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
            activeTab === 'matches' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <CalendarIcon size={18} />
          Matches
        </button>
        <button 
          onClick={() => setActiveTab('table')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
            activeTab === 'table' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <TrendingUpIcon size={18} />
          Standings
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
            activeTab === 'history' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:text-gray-600"
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
                    <div className="h-px bg-gray-100 flex-1" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">{round}</span>
                    <div className="h-px bg-gray-100 flex-1" />
                  </div>
                  <div className="grid gap-4">
                    {roundGames.map(game => (
                      <GameCard 
                        key={game.id}
                        game={game} 
                        teams={teams}
                        onClick={() => onGameClick(game.id)}
                        onTeamClick={onTeamClick}
                        isLive={game.status === 'live'}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-white rounded-[40px] border border-gray-100 text-gray-400">
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

        {activeTab === 'history' && (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-yellow-50 rounded-2xl">
                 <HistoryIcon size={24} className="text-yellow-600" />
               </div>
               <h3 className="text-xl font-black">League History</h3>
            </div>
            
            {league.history && league.history.length > 0 ? (
              <div className="space-y-4">
                {league.history.map((h, i) => {
                  const winner = teams.find(t => t.id === h.winnerId);
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl group hover:bg-gray-100 transition-colors">
                      <span className="font-black text-gray-300">{h.season}</span>
                      <div className="flex items-center gap-3">
                         <span className="font-bold text-sm">{winner?.name}</span>
                         <div className="w-8 h-8 rounded-lg bg-white p-1 shadow-sm">
                            {winner?.logo ? <img src={winner.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={16} className="text-gray-200" />}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-6">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <TrophyIcon size={24} className="text-gray-200" />
                 </div>
                 <p className="text-gray-400 font-bold mb-2">No history records available.</p>
                 <p className="text-gray-300 text-xs">Historical data will appear here once seasons conclude.</p>
              </div>
            )}
            
            {league.description && (
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">About the Competition</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{league.description}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
