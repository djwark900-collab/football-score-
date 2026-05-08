import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Team, Game, Player, League } from '../types';
import { 
  Shield as ShieldIcon, 
  ChevronLeft as ChevronLeftIcon, 
  Target as TargetIcon,
  Info as InfoIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Trophy as TrophyIcon,
  Heart as HeartIcon,
  TrendingUp as TrendingUpIcon,
  Plus as PlusIcon,
  Zap as ZapIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GameCard } from './GameCard';
import { Standings } from './Standings';

interface TeamDetailsProps {
  team: Team;
  teams: Team[];
  games: Game[];
  players: Player[];
  leagues: League[];
  onBack: () => void;
  onTeamClick: (teamId: string) => void;
  onGameClick: (gameId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  followedGames: string[];
  onToggleFollowMatch: (gameId: string) => void;
  isAdmin?: boolean;
  onAddPlayer?: (teamId: string) => void;
}

type Tab = 'fixtures' | 'squad' | 'standings' | 'details';

export function TeamDetails({ 
  team, 
  teams, 
  games, 
  players, 
  leagues, 
  onBack, 
  onTeamClick,
  onGameClick, 
  onPlayerClick,
  isFavorite,
  onToggleFavorite,
  followedGames,
  onToggleFollowMatch,
  isAdmin,
  onAddPlayer
}: TeamDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('fixtures');

  const teamGames = useMemo(() => 
    games.filter(g => g.homeTeamId === team.id || g.awayTeamId === team.id)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [games, team.id]
  );

  const teamPlayers = useMemo(() => 
    players.filter(p => p.teamId === team.id),
    [players, team.id]
  );

  const league = leagues.find(l => l.id === team.leagueId);
  const leagueTeams = teams.filter(teamItem => teamItem.leagueId === team.leagueId);
  const leagueGames = games.filter(g => g.leagueId === team.leagueId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-[40px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.1] scale-[4] rotate-12 pointer-events-none text-gray-900 dark:text-white">
          <ShieldIcon size={120} />
        </div>

        <button 
          onClick={onBack}
          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors self-start sm:self-center relative z-10"
        >
          <ChevronLeftIcon size={24} />
        </button>
        
        <div className="flex items-center gap-6 flex-1 relative z-10">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center p-4 shadow-inner border border-gray-100 dark:border-gray-700">
             {team.logo ? (
               <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
             ) : (
               <ShieldIcon className="text-gray-200 dark:text-gray-700 w-10 h-10" />
             )}
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{team.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                <TrophyIcon size={10} className="text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{league?.name}</span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {(() => {
                  const finishedGames = games.filter(g => (g.homeTeamId === team.id || g.awayTeamId === team.id) && g.status === 'finished')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);
                  
                  return finishedGames.reverse().map((g, i) => {
                    const isHome = g.homeTeamId === team.id;
                    const result = isHome 
                      ? (g.homeScore > g.awayScore ? 'W' : g.homeScore < g.awayScore ? 'L' : 'D')
                      : (g.awayScore > g.homeScore ? 'W' : g.awayScore < g.homeScore ? 'L' : 'D');
                    
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shadow-sm",
                          result === 'W' ? "bg-green-500 shadow-green-100" : 
                          result === 'D' ? "bg-yellow-500 shadow-yellow-100" : 
                          "bg-red-500 shadow-red-100"
                        )}
                        title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
                      >
                        {result}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={onToggleFavorite}
          className={cn(
            "p-4 rounded-2xl transition-all shadow-sm border relative z-10 sm:ml-auto",
            isFavorite 
              ? "bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800 text-pink-600 dark:text-pink-400" 
              : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-pink-600 dark:hover:text-pink-400"
          )}
        >
          <HeartIcon size={24} className={cn(isFavorite && "fill-current")} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm w-full sm:w-fit overflow-x-auto scrollbar-none transition-all duration-300">
        <TabButton 
          active={activeTab === 'fixtures'} 
          onClick={() => setActiveTab('fixtures')} 
          icon={<CalendarIcon size={18} />} 
          label="Matches" 
        />
        <TabButton 
          active={activeTab === 'squad'} 
          onClick={() => setActiveTab('squad')} 
          icon={<UsersIcon size={18} />} 
          label="Squad" 
        />
        <TabButton 
          active={activeTab === 'standings'} 
          onClick={() => setActiveTab('standings')} 
          icon={<TrendingUpIcon size={18} />} 
          label="Table" 
        />
        <TabButton 
          active={activeTab === 'details'} 
          onClick={() => setActiveTab('details')} 
          icon={<InfoIcon size={18} />} 
          label="Details" 
        />
        {isAdmin && activeTab === 'squad' && (
          <button 
            onClick={() => onAddPlayer?.(team.id)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-orange-600 text-white shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all ml-4"
          >
            <PlusIcon size={18} />
            <span>Add Player</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'fixtures' && (
          <motion.div
            key="fixtures"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Recent Form List */}
            {(() => {
              const recentResults = teamGames.filter(g => g.status === 'finished').slice(0, 5);
              if (recentResults.length === 0) return null;
              
              return (
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                     <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Recent Form</h3>
                     <TrendingUpIcon size={14} className="text-gray-300" />
                   </div>
                   <div className="grid gap-3">
                     {recentResults.map(g => {
                       const isHome = g.homeTeamId === team.id;
                       const result = isHome 
                         ? (g.homeScore > g.awayScore ? 'W' : g.homeScore < g.awayScore ? 'L' : 'D')
                         : (g.awayScore > g.homeScore ? 'W' : g.awayScore < g.homeScore ? 'L' : 'D');
                       
                       return (
                         <div 
                           key={g.id}
                           onClick={() => onGameClick(g.id)}
                           className="bg-white p-4 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                         >
                            <div className="flex items-center gap-3">
                               <div className={cn(
                                 "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white",
                                 result === 'W' ? "bg-green-500" : result === 'L' ? "bg-red-500" : "bg-yellow-500"
                               )}>
                                 {result}
                               </div>
                               <div>
                                 <p className="text-[10px] font-black uppercase text-gray-400 tracking-tight">
                                   {new Date(g.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                 </p>
                                 <p className="text-xs font-bold text-gray-900">
                                   vs {teams.find(teamItem => teamItem.id === (isHome ? g.awayTeamId : g.homeTeamId))?.name}
                                 </p>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-right">
                                  <p className="text-xs font-black text-gray-900">{g.homeScore} - {g.awayScore}</p>
                                  <p className="text-[10px] font-bold text-gray-400">{isHome ? 'Home' : 'Away'}</p>
                               </div>
                               <ChevronLeftIcon size={14} className="text-gray-300 rotate-180 group-hover:text-blue-600 transition-colors" />
                            </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
              );
            })()}

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">All Matches</h3>
                <CalendarIcon size={14} className="text-gray-300" />
              </div>
              <div className="grid gap-4">
                {teamGames.length > 0 ? (
                  teamGames.map(game => (
                    <GameCard 
                      key={game.id}
                      game={game} 
                      teams={teams}
                      leagues={leagues}
                      onClick={() => onGameClick(game.id)}
                      isLive={game.status === 'live'}
                      isFollowing={followedGames.includes(game.id)}
                      onToggleFollow={() => onToggleFollowMatch(game.id)}
                    />
                  ))
                ) : (
                  <EmptyState icon={<CalendarIcon />} message="No matches scheduled." />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'squad' && (
          <motion.div
            key="squad"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {teamPlayers.length > 0 ? (
              teamPlayers.map(player => (
                <button 
                  key={player.id} 
                  onClick={() => onPlayerClick?.(player.id)}
                  className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md dark:hover:shadow-black/20 transition-all group text-left w-full"
                >
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center font-black text-blue-600 dark:text-blue-400 group-hover:text-white text-lg transition-colors overflow-hidden">
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      player.number
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">{player.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{player.position}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState icon={<TargetIcon />} message="No players found in squad." />
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'standings' && (
          <motion.div
            key="standings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Standings 
              leagues={leagues}
              teams={leagueTeams}
              games={leagueGames}
              onTeamClick={(id) => {
                if (id !== team.id) {
                  onTeamClick(id);
                }
              }}
            />
          </motion.div>
        )}

        {activeTab === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-2xl">
                    <InfoIcon className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <h3 className="text-xl font-black dark:text-white">Competitor Details</h3>
                </div>
                
                <div className="space-y-4">
                  <DetailRow label="Full Name" value={team.name} />
                  <DetailRow label="Founded In" value={team.foundedIn || 'N/A'} />
                  {league && (
                    <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-left">Main Competition</span>
                      <div className="flex items-center gap-2">
                        {league.logo && <img src={league.logo} alt="" className="w-5 h-5 object-contain" />}
                        <span className="font-bold text-sm text-gray-900 dark:text-white transition-colors">{league.name}</span>
                      </div>
                    </div>
                  )}
                  <DetailRow label="Country" value={league?.country || 'N/A'} />
                  <DetailRow label="Squad Size" value={`${teamPlayers.length} players`} />
                </div>
              </div>

              {/* Coach Section */}
              <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                    <UsersIcon className="text-purple-600 dark:text-purple-400" size={24} />
                  </div>
                  <h3 className="text-xl font-black dark:text-white">Management</h3>
                </div>
                <div className="flex items-center gap-4 p-2">
                   <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden flex items-center justify-center transition-colors">
                     {team.coachImageUrl ? (
                       <img src={team.coachImageUrl} alt={team.coachName} className="w-full h-full object-cover" />
                     ) : (
                       <UsersIcon className="text-gray-200 dark:text-gray-700 transition-colors" size={32} />
                     )}
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Head Coach</p>
                     <p className="text-lg font-black text-gray-900 dark:text-white transition-colors">{team.coachName || 'Unknown Coach'}</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Next Game Hook */}
              {(() => {
                const nextGame = games.find(g => (g.homeTeamId === team.id || g.awayTeamId === team.id) && g.status === 'scheduled');
                if (!nextGame) return null;

                return (
                  <div className="bg-blue-600 dark:bg-blue-700 p-8 rounded-[40px] shadow-2xl shadow-blue-200 dark:shadow-blue-900/40 text-white space-y-6 relative overflow-hidden transition-all duration-300">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                      <CalendarIcon size={120} />
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl">
                        <ZapIcon className="text-white" size={20} />
                      </div>
                      <h3 className="text-xl font-black">Next Match</h3>
                    </div>
                    <div 
                      onClick={() => onGameClick(nextGame.id)}
                      className="bg-white/10 dark:bg-white/5 backdrop-blur-sm p-6 rounded-[32px] border border-white/20 hover:bg-white/20 transition-all cursor-pointer relative z-10"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                          {new Date(nextGame.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-black bg-white/20 dark:bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                          {new Date(nextGame.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                         <div className="flex-1 text-center">
                            <p className="font-black text-sm uppercase truncate">{teams.find(teamItem => teamItem.id === nextGame.homeTeamId)?.name}</p>
                         </div>
                         <div className="px-3 py-1 bg-white dark:bg-white/90 text-blue-600 dark:text-blue-800 rounded-lg font-black text-xs">VS</div>
                         <div className="flex-1 text-center">
                            <p className="font-black text-sm uppercase truncate">{teams.find(teamItem => teamItem.id === nextGame.awayTeamId)?.name}</p>
                         </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <TrendingUpIcon size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-black dark:text-white">Performance</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Recent Form</p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const finishedGames = games.filter(g => (g.homeTeamId === team.id || g.awayTeamId === team.id) && g.status === 'finished')
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 5);
                        
                        return finishedGames.reverse().map((g, i) => {
                          const isHome = g.homeTeamId === team.id;
                          const result = isHome 
                            ? (g.homeScore > g.awayScore ? 'W' : g.homeScore < g.awayScore ? 'L' : 'D')
                            : (g.awayScore > g.homeScore ? 'W' : g.awayScore < g.homeScore ? 'L' : 'D');
                          
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md transition-all",
                                result === 'W' ? "bg-green-500 shadow-green-100 dark:shadow-green-900/20" : 
                                result === 'D' ? "bg-yellow-500 shadow-yellow-100 dark:shadow-yellow-900/20" : 
                                "bg-red-500 shadow-red-100 dark:shadow-red-900/20"
                              )}
                            >
                              {result}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <StatBox label="Wins" value={teamGames.filter(g => {
                       if (g.status !== 'finished') return false;
                       const isHome = g.homeTeamId === team.id;
                       return isHome ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
                     }).length} />
                     <StatBox label="Goals" value={teamGames.reduce((acc, g) => {
                       return acc + (g.homeTeamId === team.id ? g.homeScore : g.awayScore);
                     }, 0)} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/40" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors">
      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</span>
      <span className="font-bold text-sm text-gray-900 dark:text-white transition-colors">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl text-center transition-colors">
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black text-gray-900 dark:text-white transition-colors">{value}</p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 text-gray-400 transition-all duration-300">
      <div className="w-12 h-12 mx-auto mb-4 opacity-20">{icon}</div>
      <p className="font-bold">{message}</p>
    </div>
  );
}
