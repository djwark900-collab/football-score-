import { useMemo, useState } from 'react';
import { League, Team, Game } from '../types';
import { Shield as ShieldIcon, TrendingUp as TrendingUpIcon, ChevronDown as ChevronDownIcon, Download as DownloadIcon, X as XIcon, Clock as ClockIcon, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface StandingsProps {
  leagues: League[];
  teams: Team[];
  games: Game[];
  onTeamClick?: (teamId: string) => void;
  onGameClick?: (gameId: string) => void;
  showDownload?: boolean;
}

export function Standings({ leagues = [], teams = [], games = [], onTeamClick, onGameClick, showDownload }: StandingsProps) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(leagues?.[0]?.id || null);
  const [showGamesModal, setShowGamesModal] = useState<{ teamId: string; type: 'W' | 'D' | 'L' | 'ALL' } | null>(null);

  const filteredModalGames = useMemo(() => {
    if (!showGamesModal) return [];
    return games.filter(g => {
      const isTeam = g.homeTeamId === showGamesModal.teamId || g.awayTeamId === showGamesModal.teamId;
      if (!isTeam) return false;
      if (g.status !== 'finished') return showGamesModal.type === 'ALL';
      
      const isHome = g.homeTeamId === showGamesModal.teamId;
      const score = isHome ? g.homeScore : g.awayScore;
      const oppScore = isHome ? g.awayScore : g.homeScore;
      
      if (showGamesModal.type === 'W') return score > oppScore;
      if (showGamesModal.type === 'L') return score < oppScore;
      if (showGamesModal.type === 'D') return score === oppScore;
      return true;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [games, showGamesModal]);

  const standings = useMemo(() => {
    const table: Record<string, {
      name: string;
      logo?: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      gf: number;
      ga: number;
      points: number;
      form: ('W' | 'D' | 'L')[];
    }> = {};

    if (!selectedLeagueId || !teams || !games) return [];

    const leagueTeams = teams.filter(t => t.leagueId === selectedLeagueId || t.leagueId2 === selectedLeagueId);
    
    leagueTeams.forEach(t => {
      table[t.id] = { name: t.name, logo: t.logo, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [] };
    });

    const filteredGames = games.filter(g => 
      (g.leagueId === selectedLeagueId || g.leagueId2 === selectedLeagueId) && 
      (g.status === 'finished' || g.status === 'live')
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    filteredGames.forEach(g => {
      const home = table[g.homeTeamId];
      const away = table[g.awayTeamId];

      if (home) {
        home.played++;
        home.gf += g.homeScore;
        home.ga += g.awayScore;
        if (g.homeScore > g.awayScore) { home.won++; home.points += 3; home.form.push('W'); }
        else if (g.homeScore < g.awayScore) { home.lost++; home.form.push('L'); }
        else { home.drawn++; home.points += 1; home.form.push('D'); }
      }

      if (away) {
        away.played++;
        away.gf += g.awayScore;
        away.ga += g.homeScore;
        if (g.awayScore > g.homeScore) { away.won++; away.points += 3; away.form.push('W'); }
        else if (g.awayScore < g.homeScore) { away.lost++; away.form.push('L'); }
        else { away.drawn++; away.points += 1; away.form.push('D'); }
      }
    });

    return Object.entries(table)
      .sort((a, b) => b[1].points - a[1].points || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga))
      .map(([id, data]) => ({ id, ...data }));
  }, [teams, games, selectedLeagueId]);

  const currentLeague = leagues.find(l => l.id === selectedLeagueId);

  return (
    <div className="flex flex-col gap-8">
      {/* Immersive League Header */}
      <div className="bg-[#0A0A0A] rounded-[40px] p-8 shadow-2xl relative overflow-hidden text-white border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-900/20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white rounded-[28px] overflow-hidden p-4 shadow-3d border-4 border-white/10 shrink-0">
              {currentLeague?.logo ? (
                <img src={currentLeague.logo} alt="" className="w-full h-full object-contain" />
              ) : (
                <ShieldIcon className="text-gray-200" size={40} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Standings</span>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter">{currentLeague?.name || 'Select League'}</h1>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Season 2023/24</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {showDownload && (
              <button className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-white/60 hover:text-white">
                <DownloadIcon size={20} />
              </button>
            )}
            <div className="relative group min-w-[200px]">
              <select 
                value={selectedLeagueId || ''} 
                onChange={(e) => setSelectedLeagueId(e.target.value)}
                className="w-full h-12 pl-4 pr-10 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer transition-all outline-none focus:ring-2 focus:ring-blue-600"
              >
                {leagues.map(l => (
                  <option key={l.id} value={l.id} className="bg-gray-900">{l.name}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Standings Table Card */}
      <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-16">Pos</th>
                <th className="py-5 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Team</th>
                <th className="py-5 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">P</th>
                <th className="py-5 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">W</th>
                <th className="py-5 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">D</th>
                <th className="py-5 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">L</th>
                <th className="py-5 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">F:A</th>
                <th className="py-5 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">GD</th>
                <th className="py-5 px-6 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest text-center bg-blue-50/50 dark:bg-blue-600/10">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {standings.map((team, index) => {
                const liveGame = games.find(g => g.status === 'live' && (g.homeTeamId === team.id || g.awayTeamId === team.id));
                const gd = team.gf - team.ga;
                
                return (
                  <tr 
                    key={team.id} 
                    className="group hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-5 px-6 text-center">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black mx-auto",
                        index < 4 ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : 
                        index === standings.length - 1 ? "bg-rose-500/10 text-rose-500" :
                        "text-gray-400"
                      )}>
                        {index + 1}
                      </div>
                    </td>
                    <td 
                      className="py-5 px-4 cursor-pointer"
                      onClick={() => onTeamClick?.(team.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-2xl flex-shrink-0 flex items-center justify-center border border-gray-100 dark:border-gray-700 p-1.5 shadow-sm group-hover:scale-110 transition-transform">
                          {team.logo ? (
                            <img src={team.logo} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <ShieldIcon className="text-gray-200" size={18} />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                            {team.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {index < 4 ? (
                               <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">UCL Qualification</span>
                            ) : index < 6 ? (
                               <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Europa League</span>
                            ) : index >= standings.length - 3 ? (
                               <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Relegation Zone</span>
                            ) : null}
                          </div>
                        </div>
                        {liveGame && (
                          <div className="ml-4">
                             <div className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                               <div className="w-1 h-1 rounded-full bg-white" />
                               {liveGame.homeScore} - {liveGame.awayScore}
                             </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-4 text-center text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setShowGamesModal({ teamId: team.id, type: 'ALL' })}>{team.played}</td>
                    <td className="py-5 px-4 text-center text-sm font-bold text-gray-500 dark:text-gray-400 tabular-nums cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600" onClick={() => setShowGamesModal({ teamId: team.id, type: 'W' })}>{team.won}</td>
                    <td className="py-5 px-4 text-center text-sm font-bold text-gray-400 tabular-nums cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-600" onClick={() => setShowGamesModal({ teamId: team.id, type: 'D' })}>{team.drawn}</td>
                    <td className="py-5 px-4 text-center text-sm font-bold text-gray-400 tabular-nums cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600" onClick={() => setShowGamesModal({ teamId: team.id, type: 'L' })}>{team.lost}</td>
                    <td className="py-5 px-4 text-center text-sm font-bold text-gray-500 dark:text-gray-400 tabular-nums">{team.gf}:{team.ga}</td>
                    <td className={cn(
                      "py-5 px-4 text-center text-sm font-black tabular-nums",
                      gd > 0 ? "text-emerald-500" : gd < 0 ? "text-rose-500" : "text-gray-400"
                    )}>
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                    <td className="py-5 px-6 text-center bg-blue-50/20 dark:bg-blue-600/5">
                      <span className="text-base font-black text-gray-900 dark:text-white tabular-nums">{team.points}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showGamesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowGamesModal(null)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-xl border border-white/20 overflow-hidden flex flex-col max-h-[80vh]"
             >
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                   <div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        {teams.find(t => t.id === showGamesModal.teamId)?.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                         <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest",
                            showGamesModal.type === 'W' ? "bg-green-500 text-white" :
                            showGamesModal.type === 'L' ? "bg-rose-500 text-white" :
                            showGamesModal.type === 'D' ? "bg-yellow-500 text-white" :
                            "bg-blue-600 text-white"
                         )}>
                            {showGamesModal.type === 'ALL' ? 'Total Matches' : `Related ${showGamesModal.type === 'W' ? 'Wins' : showGamesModal.type === 'L' ? 'Losses' : 'Draws'}`}
                         </span>
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">• {filteredModalGames.length} Games</span>
                      </div>
                   </div>
                   <button 
                    onClick={() => setShowGamesModal(null)}
                    className="p-3 bg-white dark:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                   >
                      <XIcon size={20} />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-none">
                   {filteredModalGames.length > 0 ? (
                      filteredModalGames.map(game => (
                        <div 
                          key={game.id}
                          onClick={() => {
                            onGameClick?.(game.id);
                            setShowGamesModal(null);
                          }}
                          className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                               <CalendarIcon size={12} className="text-gray-400" />
                               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(game.date).toLocaleDateString()}</span>
                            </div>
                            <span className={cn(
                               "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg tracking-tighter",
                               game.status === 'live' ? "bg-rose-600 text-white animate-pulse" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                            )}>{game.status}</span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 flex items-center gap-3">
                               <img src={teams.find(t => t.id === game.homeTeamId)?.logo} className="w-8 h-8 object-contain" />
                               <span className="text-sm font-bold truncate">{teams.find(t => t.id === game.homeTeamId)?.name}</span>
                            </div>
                            <div className="px-4 py-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 font-black text-base tabular-nums group-hover:border-blue-500 transition-colors">
                               {game.homeScore} - {game.awayScore}
                            </div>
                            <div className="flex-1 flex items-center justify-end gap-3">
                               <span className="text-sm font-bold truncate">{teams.find(t => t.id === game.awayTeamId)?.name}</span>
                               <img src={teams.find(t => t.id === game.awayTeamId)?.logo} className="w-8 h-8 object-contain" />
                            </div>
                          </div>
                        </div>
                      ))
                   ) : (
                      <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-[32px] border-2 border-dashed border-gray-100 dark:border-gray-800">
                         <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                         <p className="font-bold text-gray-400">No matching fixtures found for this criteria.</p>
                      </div>
                   )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
