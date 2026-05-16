import React, { useMemo } from 'react';
import { Game, Team } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Trophy as TrophyIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';

interface KnockoutBracketProps {
  games: Game[];
  teams: Team[];
  onGameClick: (gameId: string) => void;
}

type BracketRound = {
  name: string;
  games: Game[];
};

export function KnockoutBracket({ games, teams, onGameClick }: KnockoutBracketProps) {
  const bracketRounds = useMemo(() => {
    // Standardize round names for sorting
    const roundMapping: Record<string, { label: string; order: number }> = {
      'Final': { label: 'Final', order: 4 },
      'Semi-final': { label: 'Semi-final', order: 3 },
      'Semi-finals': { label: 'Semi-final', order: 3 },
      'semi finals': { label: 'Semi-final', order: 3 },
      'Quarter-final': { label: 'Quarter-final', order: 2 },
      'Round of 16': { label: 'Round of 16', order: 1 },
      'Knockout': { label: 'Knockout Stage', order: 0 },
    };

    const grouped = games.reduce((acc, game) => {
      const roundInfo = roundMapping[game.round || ''] || { label: game.round || 'Other', order: -1 };
      if (roundInfo.order === -1 && !game.round?.toLowerCase().includes('knockout')) return acc;
      
      const label = roundInfo.label;
      if (!acc[label]) acc[label] = { name: label, games: [], order: roundInfo.order };
      acc[label].games.push(game);
      return acc;
    }, {} as Record<string, BracketRound & { order: number }>);

    return Object.values(grouped).sort((a, b) => b.order - a.order);
  }, [games]);

  if (bracketRounds.length === 0) {
    return (
      <div className="p-20 text-center bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-3d-lg w-full">
        <TrophyIcon className="mx-auto w-12 h-12 text-gray-200 mb-6" />
        <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-sm mb-2">Tournament Bracket</h3>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest opacity-60">No knockout games recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-12 pb-20">
      {/* Final Highlight */}
      {bracketRounds.find(r => r.name === 'Final') && (
        <div className="flex flex-col items-center gap-6 mb-16">
          <div className="flex items-center gap-4">
             <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-500" />
             <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_30px_rgba(234,179,8,0.4)]">
                <TrophyIcon size={24} />
             </div>
             <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] italic">The Grand Final</h2>
        </div>
      )}

      <div className="flex flex-col gap-16">
        {bracketRounds.map((round, roundIdx) => (
          <section key={round.name} className="space-y-6">
            <div className="flex items-center gap-4 px-4 sm:px-0">
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] bg-emerald-500/10 px-3 py-1 rounded-full">Round {bracketRounds.length - roundIdx}</span>
               <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{round.name}</h3>
               <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {round.games.map((game) => {
                const homeTeam = teams.find(t => t.id === game.homeTeamId);
                const awayTeam = teams.find(t => t.id === game.awayTeamId);
                const isFinished = game.status === 'finished';
                const isLive = game.status === 'live';

                return (
                  <motion.button
                    whileHover={{ scale: 1.02, translateY: -4 }}
                    whileTap={{ scale: 0.98 }}
                    key={game.id}
                    onClick={() => onGameClick(game.id)}
                    className="group relative bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-white/5 p-6 shadow-3d-md hover:shadow-3d-xl transition-all text-left overflow-hidden"
                  >
                    {/* Active Match Decorator */}
                    {isLive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-pulse" />
                    )}

                    <div className="flex justify-between items-start mb-6">
                       <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{new Date(game.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                       {isLive ? (
                         <div className="flex items-center gap-2 bg-rose-500/10 px-2 py-0.5 rounded-lg">
                           <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping" />
                           <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Live • {game.currentTime}'</span>
                         </div>
                       ) : (
                         <span className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">{game.status}</span>
                       )}
                    </div>

                    <div className="space-y-4">
                      {/* Team A */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center border border-white/50 dark:border-white/5 shadow-inner">
                            {homeTeam?.logo ? <img src={homeTeam.logo} className="w-7 h-7 object-contain" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                          </div>
                          <span className={cn(
                            "font-black text-sm uppercase tracking-tight truncate max-w-[120px]",
                            isFinished && game.homeScore < game.awayScore ? "text-gray-400" : "text-gray-900 dark:text-white"
                          )}>{homeTeam?.name}</span>
                        </div>
                        <span className={cn(
                          "text-xl font-black italic tabular-nums",
                          isFinished && game.homeScore > game.awayScore ? "text-emerald-500" : (isFinished ? "text-gray-400" : "text-gray-900 dark:text-white")
                        )}>{game.homeScore}</span>
                      </div>

                      {/* Team B */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center border border-white/50 dark:border-white/5 shadow-inner">
                            {awayTeam?.logo ? <img src={awayTeam.logo} className="w-7 h-7 object-contain" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                          </div>
                          <span className={cn(
                            "font-black text-sm uppercase tracking-tight truncate max-w-[120px]",
                            isFinished && game.awayScore < game.homeScore ? "text-gray-400" : "text-gray-900 dark:text-white"
                          )}>{awayTeam?.name}</span>
                        </div>
                        <span className={cn(
                          "text-xl font-black italic tabular-nums",
                          isFinished && game.awayScore > game.homeScore ? "text-emerald-500" : (isFinished ? "text-gray-400" : "text-gray-900 dark:text-white")
                        )}>{game.awayScore}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                        <div className="flex -space-x-2">
                           {[1,2,3].map(i => (
                             <div key={i} className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800" />
                           ))}
                           <span className="text-[8px] font-black text-gray-400 ml-4 flex items-center uppercase tracking-widest">Stats Available</span>
                        </div>
                        <ChevronRightIcon size={16} className="text-gray-200 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
