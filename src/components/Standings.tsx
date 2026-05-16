import { useMemo, useState } from 'react';
import { League, Team, Game, Player } from '../types';
import { Shield as ShieldIcon, TrendingUp as TrendingUpIcon, ChevronDown as ChevronDownIcon, Download as DownloadIcon, X as XIcon, Clock as ClockIcon, Calendar as CalendarIcon, Trophy as TrophyIcon, Radio as RadioIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface StandingsProps {
  leagues: League[];
  teams: Team[];
  games: Game[];
  players?: Player[];
  onTeamClick?: (teamId: string) => void;
  onGameClick?: (gameId: string) => void;
  showDownload?: boolean;
}

export function Standings({ leagues = [], teams = [], games = [], players = [], onTeamClick, onGameClick, showDownload }: StandingsProps) {
  const availableLeagues = useMemo(() => leagues.filter(l => l.type !== 'cup'), [leagues]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(availableLeagues?.[0]?.id || null);
  const [showGamesModal, setShowGamesModal] = useState<{ teamId: string; type: 'W' | 'D' | 'L' | 'ALL' } | null>(null);
  const [isWideMode, setIsWideMode] = useState(false);

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
      .sort((a, b) => b[1].points - a[1].points || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga) || b[1].gf - a[1].gf)
      .map(([id, data]) => ({ id, ...data }));
  }, [teams, games, selectedLeagueId]);

  const currentLeague = availableLeagues.find(l => l.id === selectedLeagueId);

  const topScorers = useMemo(() => {
    if (!selectedLeagueId || !games || !players) return [];
    const scorers: Record<string, { name: string; goals: number; teamId: string }> = {};
    
    games.filter(g => g.leagueId === selectedLeagueId || g.leagueId2 === selectedLeagueId).forEach(g => {
      g.events?.filter(e => e.type === 'goal').forEach(e => {
        const playerName = players.find(p => p.id === e.playerId)?.name || 'Unknown Player';
        if (!scorers[playerName]) {
          scorers[playerName] = { name: playerName, goals: 0, teamId: e.teamId };
        }
        scorers[playerName].goals++;
      });
    });

    return Object.values(scorers).sort((a, b) => b.goals - a.goals).slice(0, 5);
  }, [games, selectedLeagueId, players]);

  const stats = useMemo(() => {
    if (!selectedLeagueId || !standings.length) return { cleanSheets: [], goalAvg: [] };
    
    // Calculate Clean Sheets from games
    const cleanSheetMap: Record<string, number> = {};
    standings.forEach(t => cleanSheetMap[t.id] = 0);

    games.filter(g => (g.leagueId === selectedLeagueId || g.leagueId2 === selectedLeagueId) && (g.status === 'finished' || g.status === 'live')).forEach(g => {
      // Home Clean Sheet: Away scored 0
      if (g.awayScore === 0) cleanSheetMap[g.homeTeamId] = (cleanSheetMap[g.homeTeamId] || 0) + 1;
      // Away Clean Sheet: Home scored 0
      if (g.homeScore === 0) cleanSheetMap[g.awayTeamId] = (cleanSheetMap[g.awayTeamId] || 0) + 1;
    });

    const cleanSheets = Object.entries(cleanSheetMap)
      .map(([id, count]) => ({ team: teams.find(t => t.id === id), count }))
      .filter(x => x.team)
      .sort((a, b) => b.count - a.count || (a.team?.name.localeCompare(b.team?.name || '') || 0))
      .slice(0, 5);

    const goalAvg = standings.slice()
      .sort((a, b) => b.gf - a.gf)
      .slice(0, 5);

    return { cleanSheets, goalAvg };
  }, [games, selectedLeagueId, standings, teams]);

  return (
    <div className={cn(
      "flex flex-col gap-8 transition-all duration-700 ease-in-out", 
      isWideMode ? "fixed inset-0 z-[200] bg-white dark:bg-[#030303] overflow-y-auto overflow-x-hidden p-6 md:p-16 animate-in fade-in zoom-in-95 duration-500" : "relative"
    )}>
      {isWideMode && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 max-w-7xl mx-auto w-full">
           <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/20 rotate-3">
                <ShieldIcon size={32} />
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight dark:text-white">Tournament Central</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Live Table Updates Active</p>
                </div>
              </div>
           </div>
           
           {/* Add Scorer Summary in Header if Small */}
           <div className="hidden xl:flex items-center gap-6">
              {topScorers.length > 0 && (
                <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-3xl border border-white/10">
                   <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-xl">
                      <TrophyIcon size={16} />
                   </div>
                   <div className="flex items-center gap-3">
                      {topScorers.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="flex flex-col">
                           <span className="text-white text-[10px] font-black">{s.name}</span>
                           <span className="text-white/40 text-[8px] font-bold uppercase tracking-widest">{s.goals} Goals</span>
                        </div>
                      ))}
                   </div>
                </div>
              )}
           </div>

           <div className="flex items-center gap-3">
             <div className="hidden lg:flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <TrendingUpIcon size={14} className="text-blue-500" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Expanded Mode Active</span>
             </div>
             <button 
              onClick={() => setIsWideMode(false)}
              className="p-5 bg-gray-100 dark:bg-gray-800 rounded-3xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95 group border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
             >
                <XIcon size={28} className="group-hover:rotate-90 transition-transform duration-300" />
             </button>
           </div>
        </div>
      )}

      {/* Immersive League Header */}
      <div className={cn(
        "bg-[#0A0A0A] rounded-[40px] p-8 shadow-2xl relative overflow-hidden text-white border border-white/5 transition-all",
        isWideMode && "max-w-7xl mx-auto w-full mb-8"
      )}>
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

          <div className="flex flex-wrap items-center gap-4">
            {showDownload && (
              <button className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-white/60 hover:text-white">
                <DownloadIcon size={20} />
              </button>
            )}

            <button 
              onClick={() => setIsWideMode(!isWideMode)}
              className={cn(
                "w-12 h-12 flex items-center justify-center rounded-2xl border transition-all text-white/60 hover:text-white",
                isWideMode ? "bg-blue-600 border-blue-500" : "bg-white/5 border-white/10"
              )}
            >
              <TrendingUpIcon className={isWideMode ? 'rotate-90' : ''} size={20} />
            </button>

            <div className="relative group min-w-[200px]">
              <select 
                value={selectedLeagueId || ''} 
                onChange={(e) => setSelectedLeagueId(e.target.value)}
                className="w-full h-12 pl-4 pr-10 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest appearance-none cursor-pointer transition-all outline-none focus:ring-2 focus:ring-blue-600"
              >
                {availableLeagues.map(l => (
                  <option key={l.id} value={l.id} className="bg-gray-900">{l.name}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-lg border border-gray-100 dark:border-gray-800 overflow-hidden transition-all",
        isWideMode && "max-w-7xl mx-auto w-full mb-12 shadow-2xl ring-1 ring-black/5"
      )}>
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="py-5 px-2 sm:px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-8 sm:w-16">#</th>
                <th className="py-5 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Team</th>
                <th className="py-5 px-1.5 sm:px-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">M</th>
                <th className="py-5 px-1.5 sm:px-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">W</th>
                <th className="py-5 px-1.5 sm:px-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">D</th>
                <th className="py-5 px-1.5 sm:px-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">L</th>
                <th className="py-5 px-1.5 sm:px-4 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">G</th>
                <th className="py-5 px-2 sm:px-6 text-[9px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest text-center bg-blue-50/50 dark:bg-blue-600/10">PTS</th>
                <th className="py-5 px-4 sm:px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center hidden sm:table-cell">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {standings.map((team, index) => {
                const liveGame = games.find(g => g.status === 'live' && (g.homeTeamId === team.id || g.awayTeamId === team.id));
                const gd = team.gf - team.ga;
                
                return (
                  <tr 
                    key={team.id} 
                    className={cn(
                      "group hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors",
                      index < 4 && "bg-blue-50/5 dark:bg-blue-600/[0.02]"
                    )}
                  >
                    <td className="py-5 px-2 sm:px-6 text-center">
                      <div className={cn(
                        "w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-[9px] sm:text-xs font-black mx-auto transition-transform group-hover:scale-110",
                        index < 4 ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : 
                        index === standings.length - 1 ? "bg-rose-500/10 text-rose-500" :
                        "text-gray-400"
                      )}>
                        {index + 1}
                      </div>
                    </td>
                    <td 
                      className="py-5 px-2 cursor-pointer max-w-[100px] sm:max-w-none"
                      onClick={() => onTeamClick?.(team.id)}
                    >
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="w-6 h-6 sm:w-10 sm:h-10 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center border border-gray-100 dark:border-gray-700 p-0.5 sm:p-1.5 shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1">
                          {team.logo ? (
                            <img src={team.logo} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <ShieldIcon className="text-gray-200" size={12} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-sm font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                              {team.name}
                            </span>
                            {liveGame && (
                              <div className="flex items-center gap-1.5 ml-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                                <span className={cn(
                                  "text-white text-[7px] font-black px-1.5 py-0 rounded flex items-center gap-1 shrink-0 tracking-tighter shadow-sm",
                                  liveGame.homeScore === liveGame.awayScore ? "bg-yellow-500" :
                                  ((liveGame.homeTeamId === team.id && liveGame.homeScore > liveGame.awayScore) || (liveGame.awayTeamId === team.id && liveGame.awayScore > liveGame.homeScore)) ? "bg-green-600" : "bg-rose-600"
                                )}>
                                  {teams.find(t => t.id === liveGame.homeTeamId)?.name.substring(0, 3).toUpperCase()} {liveGame.homeScore}-{liveGame.awayScore} {teams.find(t => t.id === liveGame.awayTeamId)?.name.substring(0, 3).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {liveGame && (
                          <div className="ml-1 hidden sm:flex items-center gap-2 shrink-0">
                             <div className="bg-red-600 text-white text-[7px] sm:text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(220,38,38,0.3)] border border-red-500 italic overflow-hidden relative">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shrink-0" />
                                LIVE
                             </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-1.5 sm:px-4 text-center text-[10px] sm:text-sm font-black text-gray-900 dark:text-gray-100 tabular-nums cursor-pointer hover:bg-gray-100" onClick={() => setShowGamesModal({ teamId: team.id, type: 'ALL' })}>{team.played}</td>
                    <td className="py-5 px-1.5 sm:px-4 text-center text-[10px] sm:text-sm font-bold text-green-600 dark:text-green-400 bg-green-50/5 dark:bg-green-600/5 tabular-nums cursor-pointer" onClick={() => setShowGamesModal({ teamId: team.id, type: 'W' })}>{team.won}</td>
                    <td className="py-5 px-1.5 sm:px-4 text-center text-[10px] sm:text-sm font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50/5 dark:bg-yellow-600/5 tabular-nums cursor-pointer" onClick={() => setShowGamesModal({ teamId: team.id, type: 'D' })}>{team.drawn}</td>
                    <td className="py-5 px-1.5 sm:px-4 text-center text-[10px] sm:text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50/5 dark:bg-rose-600/5 tabular-nums cursor-pointer" onClick={() => setShowGamesModal({ teamId: team.id, type: 'L' })}>{team.lost}</td>
                    <td className="py-5 px-1.5 sm:px-4 text-center text-[10px] sm:text-sm font-bold text-gray-500 dark:text-gray-400 tabular-nums">{team.gf}:{team.ga}</td>
                    <td className="py-5 px-2 sm:px-6 text-center bg-blue-50/20 dark:bg-blue-600/5 group-hover:bg-blue-100/50 transition-colors">
                      <span className="text-xs sm:text-lg font-black text-gray-900 dark:text-white tabular-nums drop-shadow-sm">{team.points}</span>
                    </td>
                    <td className="py-5 px-4 sm:px-6 hidden sm:table-cell">
                      <div className="flex items-center gap-1 justify-center">
                        {team.form.slice(-5).map((r, i) => (
                           <div 
                            key={i}
                            className={cn(
                              "w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-sm",
                              r === 'W' ? "bg-green-500 text-white" :
                              r === 'L' ? "bg-rose-500 text-white" :
                              "bg-gray-200 dark:bg-gray-700 text-gray-500"
                            )}
                           >
                              {r}
                           </div>
                         ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isWideMode && (
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
           <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-3d-lg group hover:shadow-2xl transition-all">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <TrophyIcon size={14} className="text-yellow-500" />
                 Top Scorers
              </h3>
              <div className="space-y-4">
                 {topScorers.map((s, i) => (
                   <div key={i} className="flex items-center justify-between group/item">
                      <div className="flex items-center gap-3">
                         <span className="text-lg font-black text-blue-600/20 group-hover/item:text-blue-600 transition-colors">0{i+1}</span>
                         <span className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</span>
                      </div>
                      <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{s.goals}</span>
                   </div>
                 ))}
                 {topScorers.length === 0 && <p className="text-gray-400 text-xs italic">No scorer data detected.</p>}
              </div>
           </div>

           <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-3d-lg group hover:shadow-2xl transition-all">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <ShieldIcon size={14} className="text-emerald-500" />
                   Clean Sheets
                </h3>
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">LIVE STATS</span>
              </div>
              <div className="space-y-4">
                 {stats.cleanSheets.map((s, i) => (
                   <div key={i} className="flex items-center justify-between group/item">
                      <div className="flex items-center gap-3">
                         {s.team?.logo && <img src={s.team.logo} className="w-6 h-6 object-contain group-hover/item:scale-110 transition-transform" />}
                         <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{s.team?.name}</span>
                      </div>
                      <span className="text-sm font-black text-emerald-500 tabular-nums">{s.count} <span className="text-[10px] text-gray-400">CS</span></span>
                   </div>
                 ))}
                 {stats.cleanSheets.length === 0 && <p className="text-gray-400 text-xs italic">Awaiting match results...</p>}
              </div>
           </div>

           <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-3d-lg group hover:shadow-2xl transition-all">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <TrendingUpIcon size={14} className="text-indigo-500" />
                 Goals Scored
              </h3>
              <div className="space-y-4">
                 {stats.goalAvg.map((t, i) => (
                   <div key={i} className="flex items-center justify-between group/item">
                      <div className="flex items-center gap-3">
                         <img src={t.logo} className="w-6 h-6 object-contain group-hover/item:scale-110 transition-transform" />
                         <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{t.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-indigo-500 tabular-nums">{t.gf}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase">Total Goals</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

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
                               "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg tracking-tighter flex items-center gap-1.5",
                               game.status === 'live' ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-500/20" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                            )}>
                               {game.status === 'live' && <RadioIcon size={10} className="text-white" />}
                               {game.status}
                            </span>
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
