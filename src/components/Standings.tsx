import { useMemo, useState } from 'react';
import { League, Team, Game } from '../types';
import { Shield as ShieldIcon, TrendingUp as TrendingUpIcon, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StandingsProps {
  leagues: League[];
  teams: Team[];
  games: Game[];
  onTeamClick?: (teamId: string) => void;
}

export function Standings({ leagues, teams, games, onTeamClick }: StandingsProps) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(leagues[0]?.id || null);

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

    if (!selectedLeagueId) return [];

    const leagueTeams = teams.filter(t => t.leagueId === selectedLeagueId);
    
    leagueTeams.forEach(t => {
      table[t.id] = { name: t.name, logo: t.logo, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [] };
    });

    const filteredGames = games.filter(g => 
      g.leagueId === selectedLeagueId && 
      (g.status === 'finished' || g.status === 'live')
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    filteredGames.forEach(g => {
      const home = table[g.homeTeamId];
      const away = table[g.awayTeamId];

      if (home && away) {
        home.played++;
        away.played++;
        home.gf += g.homeScore;
        home.ga += g.awayScore;
        away.gf += g.awayScore;
        away.ga += g.homeScore;

        if (g.homeScore > g.awayScore) {
          home.won++;
          home.points += 3;
          home.form.push('W');
          away.lost++;
          away.form.push('L');
        } else if (g.awayScore > g.homeScore) {
          away.won++;
          away.points += 3;
          away.form.push('W');
          home.lost++;
          home.form.push('L');
        } else {
          home.drawn++;
          away.drawn++;
          home.points += 1;
          away.points += 1;
          home.form.push('D');
          away.form.push('D');
        }
      }
    });

    return Object.entries(table)
      .sort((a, b) => b[1].points - a[1].points || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga))
      .map(([id, data]) => ({ id, ...data }));
  }, [teams, games, selectedLeagueId]);

  const currentLeague = leagues.find(l => l.id === selectedLeagueId);

  return (
    <div className="space-y-6">
      {/* League Selector */}
      <div className="max-w-xs">
        <div className="relative group">
          <select 
            value={selectedLeagueId || ''} 
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            className="w-full p-4 pl-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm appearance-none font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none cursor-pointer transition-all"
          >
            {leagues.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
            <ShieldIcon className="text-blue-600 dark:text-blue-400" size={16} />
          </div>
          <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 pointer-events-none" size={18} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-xl dark:shadow-black/20 overflow-hidden transition-all duration-300">
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200 dark:shadow-black/20">
                  <TrendingUpIcon className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black dark:text-white">{currentLeague?.name || 'Standings'}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Overall Standings
                </p>
              </div>
          </div>
        </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-6 sm:px-8 py-4 w-12 text-center sm:text-left">Pos</th>
              <th className="px-2 sm:px-4 py-4 min-w-[150px] sm:min-w-[200px]">Team</th>
              <th className="px-2 sm:px-4 py-4 text-center">PL</th>
              <th className="px-2 sm:px-4 py-4 text-center">W</th>
              <th className="px-2 sm:px-4 py-4 text-center">D</th>
              <th className="px-2 sm:px-4 py-4 text-center">L</th>
              <th className="hidden lg:table-cell px-4 py-4 text-center">GD</th>
              <th className="px-4 sm:px-6 py-4 text-center">PTS</th>
              <th className="hidden md:table-cell px-6 py-4 text-center">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {standings.map((team, index) => {
              const liveGame = games.find(g => g.status === 'live' && (g.homeTeamId === team.id || g.awayTeamId === team.id));
              
              return (
                <tr 
                  key={team.id} 
                  className={cn(
                    "group transition-colors",
                    index === 4 ? "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100/80 dark:hover:bg-yellow-900/30" : "hover:bg-gray-50/80 dark:hover:bg-gray-800/50"
                  )}
                >
                  <td className="px-6 sm:px-8 py-5 text-center sm:text-left">
                    <div className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full font-black tabular-nums transition-all",
                      index < 4 ? "bg-green-500 text-white shadow-lg shadow-green-100 dark:shadow-green-900/20" :
                      index === 4 ? "bg-yellow-400 text-yellow-950 scale-110 shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20" :
                      index === 11 ? "bg-red-500 text-white shadow-lg shadow-red-100 dark:shadow-red-900/20" : 
                      "text-gray-300 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                    )}>
                      {index + 1}
                    </div>
                  </td>
                  <td 
                    className={cn(
                      "px-2 sm:px-4 py-5 font-bold flex items-center gap-2 sm:gap-4",
                      onTeamClick && "cursor-pointer hover:text-blue-600 transition-colors"
                    )}
                    onClick={() => onTeamClick?.(team.id)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner border",
                      index === 4 ? "bg-yellow-200 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700" : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                    )}>
                      {team.logo ? <img src={team.logo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" /> : <ShieldIcon size={16} className="text-gray-200" />}
                    </div>
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-xs sm:text-sm font-black transition-colors",
                        index === 4 ? "text-yellow-900 dark:text-yellow-100" : "text-gray-900 dark:text-white"
                      )}>
                        {team.name}
                      </span>
                      {liveGame && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn(
                            "flex h-1.5 w-1.5 rounded-full animate-pulse",
                            ((liveGame.homeTeamId === team.id && liveGame.homeScore > liveGame.awayScore) || (liveGame.awayTeamId === team.id && liveGame.awayScore > liveGame.homeScore)) ? "bg-green-500" :
                            ((liveGame.homeTeamId === team.id && liveGame.homeScore < liveGame.awayScore) || (liveGame.awayTeamId === team.id && liveGame.awayScore < liveGame.homeScore)) ? "bg-red-500" :
                            "bg-orange-500"
                          )} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter",
                            ((liveGame.homeTeamId === team.id && liveGame.homeScore > liveGame.awayScore) || (liveGame.awayTeamId === team.id && liveGame.awayScore > liveGame.homeScore)) ? "text-green-600" :
                            ((liveGame.homeTeamId === team.id && liveGame.homeScore < liveGame.awayScore) || (liveGame.awayTeamId === team.id && liveGame.awayScore < liveGame.homeScore)) ? "text-red-600" :
                            "text-orange-600"
                          )}>
                            Live {liveGame.homeScore}-{liveGame.awayScore}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={cn("px-2 sm:px-4 py-5 text-center text-xs sm:text-sm font-medium tabular-nums", index === 4 ? "text-yellow-700 dark:text-yellow-400" : "text-gray-600 dark:text-gray-400")}>{team.played}</td>
                  <td className={cn("px-2 sm:px-4 py-5 text-center text-xs sm:text-sm font-bold tabular-nums", index === 4 ? "text-green-700 dark:text-green-400" : "text-green-600 dark:text-green-400")}>{team.won}</td>
                  <td className={cn("px-2 sm:px-4 py-5 text-center text-xs sm:text-sm font-medium tabular-nums", index === 4 ? "text-yellow-900 dark:text-yellow-200" : "text-gray-900 dark:text-gray-200")}>{team.drawn}</td>
                  <td className={cn("px-2 sm:px-4 py-5 text-center text-xs sm:text-sm font-bold tabular-nums", index === 4 ? "text-red-700 dark:text-red-400" : "text-red-600 dark:text-red-400")}>{team.lost}</td>
                  <td className={cn("hidden lg:table-cell px-4 py-5 text-center text-xs sm:text-sm font-medium tabular-nums", index === 4 ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400")}>
                    {team.gf - team.ga > 0 ? `+${team.gf - team.ga}` : team.gf - team.ga}
                  </td>
                  <td className="px-4 sm:px-6 py-5 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-lg font-black tabular-nums text-xs sm:text-sm shadow-sm",
                      index === 4 ? "bg-yellow-400 text-yellow-950" : "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                    )}>
                      {team.points}
                    </span>
                  </td>
                <td className="hidden md:table-cell px-6 py-5">
                  <div className="flex items-center justify-center gap-1">
                    {team.form.slice(-5).map((res, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white",
                          res === 'W' ? "bg-green-500 shadow-sm shadow-green-100" : 
                          res === 'D' ? "bg-yellow-500 shadow-sm shadow-yellow-100" : 
                          "bg-red-500 shadow-sm shadow-red-100"
                        )}
                        title={res === 'W' ? 'Win' : res === 'D' ? 'Draw' : 'Loss'}
                      >
                        {res}
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
  </div>
  );
}
