import { useMemo } from 'react';
import { League, Team, Game } from '../types';
import { Shield as ShieldIcon, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StandingsProps {
  leagues: League[];
  teams: Team[];
  games: Game[];
  onTeamClick?: (teamId: string) => void;
}

export function Standings({ leagues, teams, games, onTeamClick }: StandingsProps) {
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

    teams.forEach(t => {
      table[t.id] = { name: t.name, logo: t.logo, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [] };
    });

    const finishedAndLiveGames = [...games]
      .filter(g => g.status === 'finished' || g.status === 'live')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    finishedAndLiveGames.forEach(g => {
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
  }, [teams, games]);

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-900 rounded-2xl shadow-lg shadow-gray-200">
                <TrendingUpIcon className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black">League Standings</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Season 2023/2024</p>
            </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
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
          <tbody className="divide-y divide-gray-50">
            {standings.map((team, index) => {
              const liveGame = games.find(g => g.status === 'live' && (g.homeTeamId === team.id || g.awayTeamId === team.id));
              
              return (
                <tr 
                  key={team.id} 
                  className={cn(
                    "group transition-colors",
                    index === 4 ? "bg-yellow-50 hover:bg-yellow-100/80" : "hover:bg-gray-50/80"
                  )}
                >
                  <td className="px-6 sm:px-8 py-5 text-center sm:text-left">
                    <div className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full font-black tabular-nums transition-all",
                      index < 4 ? "bg-green-500 text-white shadow-lg shadow-green-100" :
                      index === 4 ? "bg-yellow-400 text-yellow-950 scale-110 shadow-lg shadow-yellow-100" :
                      index === 11 ? "bg-red-500 text-white shadow-lg shadow-red-100" : 
                      "text-gray-300 group-hover:text-gray-900"
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
                      index === 4 ? "bg-yellow-200 border-yellow-300" : "bg-gray-50 border-gray-100"
                    )}>
                      {team.logo ? <img src={team.logo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" /> : <ShieldIcon size={16} className="text-gray-200" />}
                    </div>
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-xs sm:text-sm font-black",
                        index === 4 ? "text-yellow-900" : "text-gray-900"
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
                  <td className={cn("px-2 sm:px-4 py-5 text-center text-xs sm:text-sm font-medium tabular-nums", index === 4 ? "text-yellow-700" : "text-gray-600")}>{team.played}</td>
                  <td className={cn("px-2 sm:px-4 py-5 text-center text-xs sm:text-sm font-bold tabular-nums", index === 4 ? "text-green-700" : "text-green-600")}>{team.won}</td>
                  <td className={cn("px-2 sm:px-4 py-5 text-center text-xs sm:text-sm font-medium tabular-nums", index === 4 ? "text-yellow-900" : "text-gray-900")}>{team.drawn}</td>
                  <td className={cn("px-2 sm:px-4 py-5 text-center text-xs sm:text-sm font-bold tabular-nums", index === 4 ? "text-red-700" : "text-red-600")}>{team.lost}</td>
                  <td className={cn("hidden lg:table-cell px-4 py-5 text-center text-xs sm:text-sm font-medium tabular-nums", index === 4 ? "text-yellow-600" : "text-gray-400")}>
                    {team.gf - team.ga > 0 ? `+${team.gf - team.ga}` : team.gf - team.ga}
                  </td>
                  <td className="px-4 sm:px-6 py-5 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-lg font-black tabular-nums text-xs sm:text-sm",
                      index === 4 ? "bg-yellow-400 text-yellow-950" : "bg-blue-50 text-blue-600"
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
                          res === 'D' ? "bg-gray-400 shadow-sm shadow-gray-100" : 
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
  );
}
