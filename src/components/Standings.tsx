import { useMemo, useState } from 'react';
import { League, Team, Game } from '../types';
import { Shield as ShieldIcon, TrendingUp as TrendingUpIcon, ChevronDown as ChevronDownIcon, Download as DownloadIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StandingsProps {
  leagues: League[];
  teams: Team[];
  games: Game[];
  onTeamClick?: (teamId: string) => void;
  showDownload?: boolean;
}

export function Standings({ leagues, teams, games, onTeamClick, showDownload }: StandingsProps) {
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

      <div className="bg-white dark:bg-gray-900 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300">
        <div className="p-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {currentLeague?.logo && (
               <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-gray-800 p-1 flex items-center justify-center">
                 <img src={currentLeague.logo} alt="" className="w-full h-full object-contain" />
               </div>
             )}
             <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">League Table</h2>
          </div>
          {showDownload && (
            <button className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
              <DownloadIcon size={16} />
            </button>
          )}
        </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/10 dark:bg-gray-800/20 text-[9px] font-black text-gray-400 border-b border-gray-50 dark:border-gray-800">
              <th className="px-3 py-2 w-8 text-center uppercase tracking-tighter">#</th>
              <th className="px-1 py-2 min-w-[120px] uppercase tracking-tighter">Team</th>
              <th className="px-1 py-2 text-center uppercase tracking-tighter">M</th>
              <th className="px-1 py-2 text-center uppercase tracking-tighter text-green-500">W</th>
              <th className="px-1 py-2 text-center uppercase tracking-tighter text-orange-400">D</th>
              <th className="px-1 py-2 text-center uppercase tracking-tighter text-red-500">L</th>
              <th className="px-1 py-2 text-center uppercase tracking-tighter">G</th>
              <th className="px-3 py-2 text-center uppercase tracking-tighter text-blue-600">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50/50 dark:divide-gray-800/50">
            {standings.map((team, index) => {
              const liveGame = games.find(g => g.status === 'live' && (g.homeTeamId === team.id || g.awayTeamId === team.id));
              
              return (
                <tr 
                  key={team.id} 
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-3 py-2.5 text-center">
                    <div className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded-md font-black text-[10px] transition-all",
                      index < 4 ? "bg-red-400/90 text-white" :
                      index < 6 ? "bg-green-500/90 text-white" :
                      "text-gray-400 dark:text-gray-500"
                    )}>
                      {index + 1}
                    </div>
                  </td>
                  <td 
                    className="px-1 py-2.5 flex items-center gap-2 cursor-pointer group/team"
                    onClick={() => onTeamClick?.(team.id)}
                  >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 transition-transform group-hover/team:scale-110">
                      {team.logo ? <img src={team.logo} alt="" className="w-full h-full object-contain" /> : <ShieldIcon size={12} className="text-gray-200" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100 group-hover/team:text-blue-600 transition-colors truncate max-w-[100px]">
                        {team.name}
                      </span>
                      {liveGame && (
                        <span className={cn(
                          "text-[8px] font-black uppercase animate-pulse tracking-tighter",
                          (liveGame.homeTeamId === team.id && liveGame.homeScore >= liveGame.awayScore) || 
                          (liveGame.awayTeamId === team.id && liveGame.awayScore >= liveGame.homeScore)
                            ? "text-green-500" 
                            : "text-red-500"
                        )}>
                          Live {liveGame.homeScore}-{liveGame.awayScore}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-2.5 text-center text-[10px] font-bold text-gray-900 dark:text-gray-100 tabular-nums">{team.played}</td>
                  <td className="px-1 py-2.5 text-center text-[10px] font-bold text-green-500 tabular-nums">{team.won}</td>
                  <td className="px-1 py-2.5 text-center text-[10px] font-bold text-orange-400 tabular-nums">{team.drawn}</td>
                  <td className="px-1 py-2.5 text-center text-[10px] font-bold text-red-500 tabular-nums">{team.lost}</td>
                  <td className="px-1 py-2.5 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 tabular-nums tracking-tighter">
                    {team.gf}:{team.ga}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-black text-blue-600 tabular-nums">
                      {team.points}
                    </span>
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
