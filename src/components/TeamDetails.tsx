import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Team, Game, Player, League } from '../types';
import { 
  Shield as ShieldIcon, 
  ChevronLeft as ChevronLeftIcon, 
  Star as StarIcon,
  Share2 as Share2Icon
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
  onLeagueClick?: (leagueId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  followedGames: string[];
  onToggleFollowMatch: (gameId: string) => void;
  isAdmin?: boolean;
  onEditTeam?: (teamId: string) => void;
}

type SubTab = 'Details' | 'Matches' | 'Standings' | 'Player Stats';

export function TeamDetails({ 
  team, 
  teams = [], 
  games = [], 
  players = [], 
  leagues = [], 
  onBack, 
  onTeamClick,
  onGameClick, 
  onLeagueClick,
  onPlayerClick,
  isFavorite,
  onToggleFavorite,
  followedGames = [],
  onToggleFollowMatch,
}: TeamDetailsProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('Details');

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
  const teamLeagues = useMemo(() => 
    leagues.filter(l => l.id === team.leagueId || l.id === team.leagueId2),
    [leagues, team.leagueId, team.leagueId2]
  );
  
  const leagueTeams = useMemo(() => 
    teams.filter(t => t.leagueId === team.leagueId || t.leagueId2 === team.leagueId || (team.leagueId2 && (t.leagueId === team.leagueId2 || t.leagueId2 === team.leagueId2))),
    [teams, team.leagueId, team.leagueId2]
  );

  const leagueGames = useMemo(() => 
    games.filter(g => g.leagueId === team.leagueId || g.leagueId2 === team.leagueId || (team.leagueId2 && (g.leagueId === team.leagueId2 || g.leagueId2 === team.leagueId2))),
    [games, team.leagueId, team.leagueId2]
  );

  const liveGame = games.find(g => g.status === 'live' && (g.homeTeamId === team.id || g.awayTeamId === team.id));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Immersive Team Header */}
      <div className="relative h-[45vh] min-h-[400px] bg-[#0A0A0A] overflow-hidden">
        {/* Dynamic Background Blur */}
        <div className="absolute inset-0 z-0">
          {team.logo && (
            <img 
              src={team.logo} 
              className="w-full h-full object-cover opacity-10 blur-3xl scale-150 grayscale"
              alt=""
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#0A0A0A]" />
        </div>

        {/* Top Controls */}
        <div className="relative z-30 flex justify-between items-center px-6 py-6">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronLeftIcon size={20} className="text-white" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">
              Team Overview
            </span>
            <div className="w-6 h-0.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onToggleFavorite}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95",
                isFavorite 
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                  : "bg-white/5 backdrop-blur-xl border-white/10 text-white/60 hover:text-white"
              )}
            >
              <StarIcon size={18} className={isFavorite ? "fill-white" : ""} />
            </button>
            <button className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 text-white/60 hover:text-white active:scale-95">
              <Share2Icon size={18} />
            </button>
          </div>
        </div>

        {/* Team Identity */}
        <div className="relative z-20 flex flex-col items-center justify-center h-full px-6 pb-16 -mt-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-[40px] shadow-2xl flex items-center justify-center p-6 border-4 border-white/10"
          >
            {team.logo ? (
              <img src={team.logo} alt="" className="w-full h-full object-contain" />
            ) : (
              <ShieldIcon size={64} className="text-gray-200" />
            )}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-black text-white mt-6 tracking-tighter text-center"
          >
            {team.name}
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center items-center gap-3 mt-4"
          >
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
              Est. {team.foundedIn || '1898'}
            </span>
            {teamLeagues.map((l, i) => (
              <span 
                key={l.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onLeagueClick?.(l.id);
                }}
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.4em] px-4 py-1.5 rounded-xl border cursor-pointer transition-all hover:scale-105 active:scale-95",
                  i === 0 
                    ? "text-blue-400 bg-blue-500/10 border-blue-500/10" 
                    : "text-purple-400 bg-purple-500/10 border-purple-500/10"
                )}
              >
                {l.name}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-2xl border-b border-gray-100 dark:border-white/5 flex justify-center px-4 overflow-x-auto scrollbar-none">
        <div className="flex w-full max-w-2xl">
          {(['Details', 'Matches', 'Standings', 'Player Stats'] as SubTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "flex-1 py-5 px-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative shrink-0",
                activeSubTab === tab 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {tab}
              {activeSubTab === tab && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-500 rounded-t-full shadow-[0_-4px_12px_rgba(59,130,246,0.4)]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-8">
        <AnimatePresence mode="wait">
          {activeSubTab === 'Details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {liveGame && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest leading-none">Live Match</span>
                  </div>
                  <GameCard 
                    game={liveGame} 
                    teams={teams} 
                    leagues={leagues} 
                    onClick={() => onGameClick(liveGame.id)} 
                    isLive 
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form History */}
                <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-lg border border-gray-100 dark:border-white/5 p-8">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 tracking-tight">Recent Form</h3>
                  <div className="flex items-center justify-between">
                    {['W', 'D', 'W', 'L', 'W'].map((res, i) => (
                      <div key={i} className="flex flex-col items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-lg",
                          res === 'W' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                          res === 'D' ? "bg-orange-500 text-white shadow-orange-500/20" :
                          "bg-rose-500 text-white shadow-rose-500/20"
                        )}>
                          {res}
                        </div>
                        <span className="text-[9px] font-black text-gray-400">02/0{5-i}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Stats Summary */}
                <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-lg border border-gray-100 dark:border-white/5 p-8 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Goals Scored</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">64</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Clean Sheets</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white leading-none">12</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voting Section */}
              <div className="bg-[#0A0A0A] rounded-[40px] shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none" />
                <div className="relative z-10 text-center space-y-8">
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Who will win next?</h3>
                    <p className="text-white/40 text-xs font-bold mt-1 uppercase tracking-widest">Global Fan Consensus</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 items-end h-24 px-4">
                    <div className="bg-blue-600/20 h-[66%] rounded-2xl border border-blue-500/20 relative group">
                      <div className="absolute bottom-full left-0 right-0 mb-2 text-blue-500 font-black text-lg">66%</div>
                    </div>
                    <div className="bg-white/5 h-[18%] rounded-2xl border border-white/10 relative">
                      <div className="absolute bottom-full left-0 right-0 mb-2 text-white/40 font-black text-lg">18%</div>
                    </div>
                    <div className="bg-white/5 h-[16%] rounded-2xl border border-white/10 relative">
                      <div className="absolute bottom-full left-0 right-0 mb-2 text-white/40 font-black text-lg">16%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 pt-4">
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex flex-col items-center">
                      <span className="text-[10px] font-black text-white/40 uppercase mb-1">Home</span>
                      <span className="text-lg font-black italic">8/13</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex flex-col items-center">
                      <span className="text-[10px] font-black text-white/40 uppercase mb-1">Draw</span>
                      <span className="text-lg font-black italic">11/4</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex flex-col items-center">
                      <span className="text-[10px] font-black text-white/40 uppercase mb-1">Away</span>
                      <span className="text-lg font-black italic">9/2</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'Matches' && (
            <motion.div 
              key="matches"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {teamLeagues.map(l => {
                const gamesInLeague = teamGames.filter(g => g.leagueId === l.id || g.leagueId2 === l.id);
                if (gamesInLeague.length === 0) return null;

                return (
                  <div key={l.id} className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                       <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 p-1.5 shadow-sm">
                          {l.logo ? <img src={l.logo} className="w-full h-full object-contain" /> : <ShieldIcon className="text-gray-300" size={14} />}
                       </div>
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">{l.name} Fixtures</h3>
                       <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
                    </div>
                    <div className="space-y-4">
                      {gamesInLeague.map(game => (
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
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeSubTab === 'Standings' && (
            <motion.div 
              key="standings"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <Standings leagues={teamLeagues} teams={leagueTeams} games={leagueGames} onTeamClick={(id) => id !== team.id && onTeamClick(id)} />
            </motion.div>
          )}

          {activeSubTab === 'Player Stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {teamPlayers.slice(0, 12).map(player => (
                <button 
                  key={player.id} 
                  onClick={() => onPlayerClick?.(player.id)} 
                  className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 flex items-center gap-4 hover:shadow-3d-md transition-all group text-left w-full shadow-3d-sm"
                >
                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/10 p-1 group-hover:scale-105 transition-transform overflow-hidden">
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-blue-600 dark:text-blue-400">{player.number}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm truncate">{player.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{player.position}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
