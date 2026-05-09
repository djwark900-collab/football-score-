import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { League, Team, Game, Transfer } from '../types';
import { 
  Trophy as TrophyIcon, 
  Calendar as CalendarIcon, 
  TrendingUp as TrendingUpIcon, 
  ChevronLeft as ChevronLeftIcon,
  Plus as PlusIcon,
  Shield as ShieldIcon,
  BookOpen as BookOpenIcon,
  History as HistoryIcon,
  Target as TargetIcon,
  Pin as PinIcon,
  ChevronDown as ChevronDownIcon,
  Download as DownloadIcon,
  Users as UsersIcon,
  LayoutGrid as LayoutGridIcon,
  Search as SearchIcon,
  ArrowLeftRight as TransferIcon,
  ArrowRight as ArrowRightIcon
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
  transfers: Transfer[];
  onBack: () => void;
  onGameClick: (gameId: string) => void;
  onTeamClick: (teamId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  isAdmin: boolean;
  onAddGame: () => void;
  followedGames: string[];
  onToggleFollowMatch: (gameId: string) => void;
}

type Tab = 'table' | 'matches' | 'knockout' | 'top_players' | 'top_teams' | 'transfers' | 'best_lineup' | 'honors';

export function LeagueDetails({ league, teams, games, leagues, players, transfers, onBack, onGameClick, onTeamClick, onPlayerClick, isAdmin, onAddGame, followedGames, onToggleFollowMatch }: LeagueDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('table');

  const leagueTeams = useMemo(() => 
    teams.filter(t => t.leagueId === league.id || t.leagueId2 === league.id), 
    [teams, league.id]
  );
  
  const leagueGames = useMemo(() => 
    games.filter(g => g.leagueId === league.id || g.leagueId2 === league.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [games, league.id]
  );

  const gamesByDate = useMemo(() => {
    const grouped: Record<string, Game[]> = {};
    leagueGames.forEach(g => {
      const d = new Date(g.date);
      const dateKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(g);
    });
    return grouped;
  }, [leagueGames]);

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
    <div className="flex flex-col min-h-screen bg-gray-50/50 dark:bg-gray-950">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors">
        <button 
          onClick={onBack}
          className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          <ChevronLeftIcon size={24} />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center">
              {league.logo && <img src={league.logo} alt="" className="w-full h-full object-contain" />}
            </div>
            <h1 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{league.name}</h1>
          </div>
          <button className="flex items-center gap-1 mt-0.5 text-gray-400 font-bold hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <span className="text-[10px] uppercase tracking-widest">2025-2026</span>
            <ChevronDownIcon size={12} />
          </button>
        </div>
        
        <button 
          className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white transition-all"
          title="Pin League"
        >
          <PinIcon size={20} />
        </button>
      </div>

      <div className="flex justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-none transition-colors">
        {(['table', 'matches', 'knockout', 'top_teams', 'top_players', 'transfers', 'best_lineup', 'honors'] as Tab[]).map((tab) => {
          if (tab === 'knockout' && league.type !== 'cup') return null;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-black tracking-tight transition-all relative shrink-0",
                activeTab === tab 
                  ? "text-blue-900 dark:text-blue-400" 
                  : "text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
              )}
            >
              {tab === 'table' ? 'Tables' : 
               tab === 'matches' ? 'Fixtures' : 
               tab === 'knockout' ? 'Knockout' :
               tab === 'top_players' ? 'Players' : 
               tab === 'top_teams' ? 'Teams' : 
               tab === 'transfers' ? 'Transfers' :
               tab === 'best_lineup' ? 'Lineup' : 'Honors'}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTabLeague" 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" 
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-6">
        {/* Secondary Filter Dropdown */}
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="flex items-center justify-between px-6 py-3 bg-gray-100/50 dark:bg-gray-800/50 rounded-[20px] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group cursor-pointer">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">All</span>
                <ChevronDownIcon size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
            <button className="p-3 text-gray-400 hover:text-gray-600 transition-colors">
              <SearchIcon size={20} />
            </button>
          </div>
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
              {Object.keys(gamesByDate).length > 0 ? (
                (Object.entries(gamesByDate) as [string, Game[]][]).map(([date, dateGames]) => (
                  <div key={date} className="space-y-4">
                    <div className="flex flex-col items-center">
                       <span className="text-sm font-black text-gray-500 dark:text-gray-400 tabular-nums">{date}</span>
                    </div>
                    <div className="space-y-1">
                      {dateGames.map(game => {
                        const homeTeam = teams.find(t => t.id === game.homeTeamId);
                        const awayTeam = teams.find(t => t.id === game.awayTeamId);
                        
                        return (
                          <motion.div 
                            key={game.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onGameClick(game.id)}
                            className="bg-white dark:bg-gray-900 rounded-[20px] px-5 py-3 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer hover:border-blue-500/20 transition-all group relative overflow-hidden"
                          >
                            {/* League Logo Background (Optional/Subtle) */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                              {league.logo && <img src={league.logo} alt="" className="w-12 h-12 rounded-full grayscale" />}
                            </div>

                            <div className="flex-1 flex items-center justify-end gap-3 text-right overflow-hidden relative z-10">
                              <span className="text-[12px] font-bold text-gray-900 dark:text-white truncate uppercase tracking-tighter">{homeTeam?.name}</span>
                              <div className="w-7 h-7 flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-100 dark:border-gray-700 transition-transform group-hover:scale-110">
                                {homeTeam?.logo ? <img src={homeTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={14} className="text-gray-200" />}
                              </div>
                            </div>

                            <div className="px-4 min-w-[70px] flex flex-col items-center justify-center relative z-10">
                               {game.status === 'live' || game.status === 'finished' ? (
                                 <div className="flex items-center gap-2">
                                   <span className={cn(
                                     "text-sm font-black tabular-nums transition-colors",
                                     game.status === 'live' 
                                       ? (game.homeScore >= game.awayScore ? "text-green-500" : "text-red-500") 
                                       : "text-gray-900 dark:text-white"
                                   )}>{game.homeScore}</span>
                                   <span className="text-gray-200 font-bold">:</span>
                                   <span className={cn(
                                     "text-sm font-black tabular-nums transition-colors",
                                     game.status === 'live' 
                                       ? (game.awayScore >= game.homeScore ? "text-green-500" : "text-red-500") 
                                       : "text-gray-900 dark:text-white"
                                   )}>{game.awayScore}</span>
                                 </div>
                               ) : (
                                 <span className="text-[11px] font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                                   {new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                 </span>
                               )}
                            </div>

                            <div className="flex-1 flex items-center justify-start gap-3 overflow-hidden relative z-10">
                              <div className="w-7 h-7 flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-100 dark:border-gray-700 transition-transform group-hover:scale-110">
                                {awayTeam?.logo ? <img src={awayTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={14} className="text-gray-200" />}
                              </div>
                              <span className="text-[12px] font-bold text-gray-900 dark:text-white truncate uppercase tracking-tighter">{awayTeam?.name}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 text-gray-400 transition-all">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-bold opacity-30">No matches scheduled yet.</p>
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
                showDownload
              />
            </motion.div>
          )}

          {activeTab === 'knockout' && (
            <motion.div
              key="knockout-tab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-8"
            >
              {(() => {
                const semiFinals = leagueGames.filter(g => g.round?.toLowerCase().includes('semi'));
                const final = leagueGames.find(g => g.round?.toLowerCase() === 'final');
                
                return (
                  <div className="w-full max-w-sm space-y-12 relative">
                    {/* Semi-Finals Path Line (Top) */}
                    <div className="absolute top-[80px] left-1/2 w-px h-[40px] bg-gray-200 -translate-x-1/2" />
                    
                    {/* Semi Final 1 */}
                    {semiFinals[0] && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Semi Finals</span>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm w-[150px] flex flex-col items-center gap-2">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center p-1 border border-gray-50 bg-gray-50 dark:bg-gray-800">
                                {teams.find(t => t.id === semiFinals[0].homeTeamId)?.logo && <img src={teams.find(t => t.id === semiFinals[0].homeTeamId)?.logo} className="w-full h-full object-contain" />}
                              </div>
                              {semiFinals[0].status === 'finished' && semiFinals[0].homeScore > semiFinals[0].awayScore && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                                  <PlusIcon size={6} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center p-1 border border-gray-50 bg-gray-50 dark:bg-gray-800">
                                {teams.find(t => t.id === semiFinals[0].awayTeamId)?.logo && <img src={teams.find(t => t.id === semiFinals[0].awayTeamId)?.logo} className="w-full h-full object-contain" />}
                              </div>
                              {semiFinals[0].status === 'finished' && semiFinals[0].awayScore > semiFinals[0].homeScore && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                                  <PlusIcon size={6} className="text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                             <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase">
                               <span>{teams.find(t => t.id === semiFinals[0].homeTeamId)?.name.split(' ')[0]}</span>
                               <span>{teams.find(t => t.id === semiFinals[0].awayTeamId)?.name.split(' ')[0]}</span>
                             </div>
                             <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums tracking-tighter mt-1">
                               {semiFinals[0].status === 'scheduled' 
                                 ? new Date(semiFinals[0].date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                 : `${semiFinals[0].homeScore} - ${semiFinals[0].awayScore}`}
                             </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Final Card */}
                    <div className="relative">
                       <div className="absolute top-[-30px] left-1/2 w-px h-[30px] bg-gray-200 -translate-x-1/2" />
                       <div className="absolute bottom-[-30px] left-1/2 w-px h-[30px] bg-gray-200 -translate-x-1/2" />
                       
                       <div className="flex flex-col items-center gap-4">
                          <span className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] mb-2 px-6 py-2 border-b-2 border-blue-600/10">Final</span>
                          
                          <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 p-8 shadow-md w-full relative overflow-hidden group hover:shadow-xl transition-all cursor-pointer" onClick={() => final && onGameClick(final.id)}>
                             {/* Trophy Watermark */}
                             <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] rotate-12 transition-transform group-hover:scale-110">
                                <TrophyIcon size={120} />
                             </div>

                             <div className="flex items-center justify-between gap-4 relative z-10">
                                <div className="flex flex-col items-center gap-3 flex-1">
                                   <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-3 border border-gray-100 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-110">
                                      {final ? (
                                        teams.find(t => t.id === final.homeTeamId)?.logo && <img src={teams.find(t => t.id === final.homeTeamId)?.logo} className="w-full h-full object-contain" />
                                      ) : (
                                        <div className="text-[10px] font-black text-gray-300 uppercase">TBD</div>
                                      )}
                                   </div>
                                   <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight text-center">
                                      {final ? teams.find(t => t.id === final.homeTeamId)?.name.split(' ')[0] : 'TBD'}
                                   </span>
                                </div>

                                <div className="flex flex-col items-center gap-1">
                                   <TrophyIcon className="w-10 h-10 text-yellow-500 mb-2 drop-shadow-sm" />
                                   {final?.status === 'scheduled' ? (
                                      <>
                                        <span className="text-[11px] font-bold text-gray-400 capitalize">{new Date(final.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                        <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 tabular-nums">
                                          {new Date(final.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </span>
                                      </>
                                   ) : final?.status === 'finished' ? (
                                      <div className="flex items-center gap-3">
                                         <span className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{final.homeScore}</span>
                                         <span className="text-gray-200 font-bold">-</span>
                                         <span className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{final.awayScore}</span>
                                      </div>
                                   ) : (
                                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">TBD</span>
                                   )}
                                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-4 opacity-70">Puskás Aréna</span>
                                </div>

                                <div className="flex flex-col items-center gap-3 flex-1">
                                   <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-3 border border-gray-100 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-110">
                                      {final ? (
                                        teams.find(t => t.id === final.awayTeamId)?.logo && <img src={teams.find(t => t.id === final.awayTeamId)?.logo} className="w-full h-full object-contain" />
                                      ) : (
                                        <div className="text-[10px] font-black text-gray-300 uppercase">TBD</div>
                                      )}
                                   </div>
                                   <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight text-center">
                                      {final ? teams.find(t => t.id === final.awayTeamId)?.name.split(' ')[0] : 'TBD'}
                                   </span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Semi Final 2 */}
                    {semiFinals[1] && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Semi Finals</span>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm w-[150px] flex flex-col items-center gap-2">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center p-1 border border-gray-50 bg-gray-50 dark:bg-gray-800">
                                {teams.find(t => t.id === semiFinals[1].homeTeamId)?.logo && <img src={teams.find(t => t.id === semiFinals[1].homeTeamId)?.logo} className="w-full h-full object-contain" />}
                              </div>
                              {semiFinals[1].status === 'finished' && semiFinals[1].homeScore > semiFinals[1].awayScore && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                                  <PlusIcon size={6} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center p-1 border border-gray-50 bg-gray-50 dark:bg-gray-800">
                                {teams.find(t => t.id === semiFinals[1].awayTeamId)?.logo && <img src={teams.find(t => t.id === semiFinals[1].awayTeamId)?.logo} className="w-full h-full object-contain" />}
                              </div>
                              {semiFinals[1].status === 'finished' && semiFinals[1].awayScore > semiFinals[1].homeScore && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                                  <PlusIcon size={6} className="text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                             <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase">
                               <span>{teams.find(t => t.id === semiFinals[1].homeTeamId)?.name.split(' ')[0]}</span>
                               <span>{teams.find(t => t.id === semiFinals[1].awayTeamId)?.name.split(' ')[0]}</span>
                             </div>
                             <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums tracking-tighter mt-1">
                               {semiFinals[1].status === 'scheduled' 
                                 ? new Date(semiFinals[1].date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                 : `${semiFinals[1].homeScore} - ${semiFinals[1].awayScore}`}
                             </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bottom vertical line for continuity */}
                    <div className="absolute bottom-[-20px] left-1/2 w-px h-[20px] bg-gray-200 -translate-x-1/2" />
                  </div>
                );
              })()}
            </motion.div>
          )}


          {activeTab === 'top_players' && (
            <motion.div
              key="stats-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
                <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-lg font-black dark:text-white">Top Goalscorers</h3>
                  <TargetIcon size={20} className="text-blue-500" />
                </div>
                
                <div className="divide-y divide-gray-50/50 dark:divide-gray-800/50">
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
                      .slice(0, 15);

                    if (scorers.length === 0) {
                      return (
                        <div className="p-12 text-center text-gray-400">
                          <p className="text-sm font-bold opacity-30">No goals recorded yet this season.</p>
                        </div>
                      );
                    }

                    return scorers.map((s, i) => {
                      const player = players.find(p => p.id === s.playerId);
                      const team = teams.find(t => t.id === player?.teamId);
                      return (
                        <div 
                          key={s.playerId} 
                          className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                          onClick={() => onPlayerClick?.(s.playerId)}
                        >
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "w-6 h-6 flex items-center justify-center rounded-full font-black text-[10px] transition-all",
                              i === 0 ? "bg-red-400 text-white" : "text-gray-300 dark:text-gray-600"
                            )}>
                              {i + 1}
                            </span>
                            <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
                              {player?.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-100"><UsersIcon size={16} className="text-gray-300" /></div>}
                            </div>
                            <div>
                               <p className="font-bold text-gray-900 dark:text-white transition-colors group-hover:text-blue-600">{player?.name || 'Unknown'}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <div className="w-3 h-3">
                                   {team?.logo && <img src={team.logo} className="w-full h-full object-contain" />}
                                 </div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{team?.name || 'No Team'}</span>
                               </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                             <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">{s.goals}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'top_teams' && (
            <motion.div
              key="teams-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 p-12 text-center transition-all"
            >
              <ShieldIcon className="w-12 h-12 mx-auto mb-4 text-gray-200" />
              <p className="text-sm font-bold text-gray-400">Team rankings are currently being processed.</p>
            </motion.div>
          )}

          {activeTab === 'transfers' && (
            <motion.div
              key="transfers-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
                {(() => {
                  const leagueTransfers = transfers.filter(t => {
                    const toTeam = teams.find(team => team.id === t.toTeamId);
                    return toTeam?.leagueId === league.id;
                  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (leagueTransfers.length === 0) {
                    return (
                      <div className="p-12 text-center text-gray-400">
                        <TransferIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="text-sm font-bold opacity-30">No recent transfers in this league.</p>
                      </div>
                    );
                  }

                  return leagueTransfers.map(t => {
                    const player = players.find(p => p.id === t.playerId);
                    const fromTeam = teams.find(team => team.id === t.fromTeamId);
                    const toTeam = teams.find(team => team.id === t.toTeamId);
                    return (
                      <div key={t.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer overflow-hidden relative" onClick={() => player && onPlayerClick?.(player.id)}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-gray-400 tabular-nums uppercase border-b border-gray-100 pb-1">{new Date(t.date).toLocaleDateString('en-GB')}</span>
                          <span className="text-[11px] font-black text-red-500 uppercase tracking-tight">Signed {t.fee || 'Free'}</span>
                        </div>

                        <div className="flex flex-col items-center mb-6">
                           <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-900 shadow-sm mb-2">
                             {player?.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <UsersIcon size={24} className="text-gray-300" />}
                           </div>
                           <p className="font-black text-gray-900 dark:text-white text-sm tracking-tight">{player?.name || 'Unknown Player'}</p>
                        </div>

                        <div className="flex items-center justify-center gap-8 relative">
                           <div className="flex items-center gap-2 flex-1 justify-end">
                              <div className="w-5 h-5 flex-shrink-0">
                                {fromTeam?.logo ? <img src={fromTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={12} className="text-gray-200" />}
                              </div>
                              <span className="text-[10px] font-black text-gray-500 uppercase truncate max-w-[80px]">{fromTeam?.name || 'Former'}</span>
                           </div>

                           <div className="shrink-0 flex items-center justify-center">
                              <ArrowRightIcon size={16} className="text-gray-300" />
                           </div>

                           <div className="flex items-center gap-2 flex-1 justify-start">
                              <div className="w-5 h-5 flex-shrink-0">
                                {toTeam?.logo ? <img src={toTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={12} className="text-gray-200" />}
                              </div>
                              <span className="text-[10px] font-black text-gray-500 uppercase truncate max-w-[80px]">{toTeam?.name || 'New'}</span>
                           </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}

          {activeTab === 'best_lineup' && (
            <motion.div
              key="lineup-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 p-12 text-center transition-all"
            >
              <LayoutGridIcon className="w-12 h-12 mx-auto mb-4 text-gray-200" />
              <p className="text-sm font-bold text-gray-400">Tactical lineup of the week is coming soon.</p>
            </motion.div>
          )}

          {activeTab === 'honors' && (
            <motion.div
              key="honors-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 px-2">
                <TrophyIcon size={20} className="text-gray-400" />
                <h2 className="text-lg font-black dark:text-white">Past Champions <span className="text-green-600 font-bold ml-1">(Official)</span></h2>
              </div>
              
              <div className="grid grid-cols-3 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm divide-x divide-y divide-gray-50 dark:divide-gray-800">
                {league.history && league.history.length > 0 ? (
                  [...league.history].reverse().map((record, i) => {
                    const winner = teams.find(t => t.id === record.winnerId);
                    return (
                      <div key={i} className="flex flex-col items-center justify-center p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer" onClick={() => winner && onTeamClick(winner.id)}>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight mb-4">{record.season}</span>
                        <div className="w-12 h-12 mb-3 transform transition-transform group-hover:scale-110">
                          {winner?.logo ? (
                            <img src={winner.logo} className="w-full h-full object-contain" alt={winner.name} />
                          ) : (
                            <ShieldIcon size={32} className="text-gray-200" />
                          )}
                        </div>
                        <span className="text-xs font-black text-gray-900 dark:text-white leading-tight">{winner?.name || 'Unknown'}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-3 py-20 text-center text-gray-400">
                    <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold opacity-30">No history records available yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
