import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { League, Team, Game, Transfer, Player } from '../types';
import { 
  Trophy as TrophyIcon, 
  ChevronLeft as ChevronLeftIcon,
  Plus as PlusIcon,
  Shield as ShieldIcon,
  Target as TargetIcon,
  ChevronDown as ChevronDownIcon,
  Download as DownloadIcon,
  Users as UsersIcon,
  LayoutGrid as LayoutGridIcon,
  ArrowRight as ArrowRightIcon,
  X as XIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GameCard } from './GameCard';
import { Standings } from './Standings';
import { KnockoutBracket } from './KnockoutBracket';
import { HonorsSection } from './HonorsSection';

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

type SubTab = 'info' | 'matches' | 'standings' | 'knockout' | 'top_players' | 'transfers' | 'honors';

export function LeagueDetails({ 
  league, 
  teams = [], 
  games = [], 
  leagues = [], 
  players = [], 
  transfers = [], 
  onBack, 
  onGameClick, 
  onTeamClick, 
  onPlayerClick, 
  followedGames = [], 
  onToggleFollowMatch 
}: LeagueDetailsProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('matches');
  const [isWideMode, setIsWideMode] = useState(false);

  const leagueTeams = useMemo(() => 
    teams.filter(t => t.leagueId === league.id || t.leagueId2 === league.id), 
    [teams, league.id]
  );
  
  const leagueGames = useMemo(() => 
    games.filter(g => g.leagueId === league.id || g.leagueId2 === league.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [games, league.id]
  );

  return (
    <div className={cn(
      "flex flex-col min-h-screen bg-gray-50/50 dark:bg-gray-950 transition-all duration-700",
      isWideMode && "fixed inset-0 z-[200] bg-white dark:bg-[#030303] overflow-y-auto p-6 md:p-12 animate-in fade-in zoom-in-95"
    )}>
      {isWideMode && (
        <div className="flex justify-between items-center mb-12 max-w-7xl mx-auto w-full">
           <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/20">
                {league.logo ? <img src={league.logo} className="w-10 h-10 object-contain" /> : <TrophyIcon size={32} />}
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight dark:text-white">{league.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Premium Competition View</p>
                </div>
              </div>
           </div>
           <button 
            onClick={() => setIsWideMode(false)}
            className="p-5 bg-gray-100 dark:bg-gray-800 rounded-3xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95 group"
           >
              <XIcon size={28} className="group-hover:rotate-90 transition-transform duration-300" />
           </button>
        </div>
      )}
      {/* Immersive League Header */}
      {!isWideMode && (
        <div className="relative h-[40vh] min-h-[360px] bg-[#0A0A0A] overflow-hidden">
        {/* Dynamic Background Blur */}
        <div className="absolute inset-0 z-0">
          {league.logo && (
            <img 
              src={league.logo} 
              className="w-full h-full object-cover opacity-10 blur-3xl scale-150 grayscale"
              alt=""
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-gray-950" />
        </div>

        {/* Top Controls */}
        <div className="relative z-30 flex justify-between items-center px-6 py-6">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            <ChevronLeftIcon size={24} className="text-white" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">
              Competition Center
            </span>
            <div className="w-6 h-0.5 bg-blue-500 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsWideMode(true)}
              className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 text-white/60 hover:text-white transition-all"
              title="Expand View"
            >
              <LayoutGridIcon size={18} />
            </button>
            <button className="w-10 h-10 flex items-center justify-center bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 text-white/60 hover:text-white transition-all">
              <DownloadIcon size={18} />
            </button>
          </div>
        </div>

        {/* League Identity */}
        <div className="relative z-20 flex flex-col items-center justify-center h-full px-6 pb-12 -mt-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-[32px] shadow-2xl flex items-center justify-center p-5 border-4 border-white/10"
          >
            {league.logo ? (
              <img src={league.logo} alt="" className="w-full h-full object-contain" />
            ) : (
              <TrophyIcon size={40} className="text-blue-500" />
            )}
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-6 tracking-tighter text-center">{league.name}</h1>
          <button className="flex items-center gap-1.5 mt-2 text-white/40 font-bold hover:text-white transition-colors bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Season 2025/26</span>
            <ChevronDownIcon size={12} />
          </button>
        </div>
      </div>
    )}

    {/* Modern Tabs Navigation */}
      {!isWideMode && (
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-100 dark:border-white/5 flex justify-start px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 py-4">
            {(['info', 'matches', 'standings', 'knockout', 'top_players', 'transfers', 'honors'] as SubTab[]).map((tab) => {
              if (tab === 'knockout' && league.type !== 'cup') return null;
              if (tab === 'standings' && league.type === 'cup') return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={cn(
                    "px-6 py-2 text-[12px] font-black uppercase tracking-widest rounded-full transition-all whitespace-nowrap shrink-0",
                    activeSubTab === tab 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                      : "text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                  )}
                >
                  {tab === 'info' ? 'Details' : 
                   tab === 'matches' ? 'Matches' :
                   tab === 'standings' ? 'Standings' : 
                   tab === 'knockout' ? 'Knockout' :
                   tab === 'top_players' ? 'Top Players' :
                   tab === 'transfers' ? 'Transfers' : 'Honors'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className={cn("p-4 sm:p-8 w-full space-y-8 mx-auto", isWideMode ? "max-w-7xl" : "max-w-5xl")}>
        {isWideMode && (
          <div className="flex gap-2 pb-8 overflow-x-auto scrollbar-none border-b dark:border-white/5">
             {(['info', 'matches', 'standings', 'knockout', 'top_players', 'transfers', 'honors'] as SubTab[]).map((tab) => {
                if (tab === 'knockout' && league.type !== 'cup') return null;
                if (tab === 'standings' && league.type === 'cup') return null;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveSubTab(tab)}
                    className={cn(
                      "px-8 py-3 text-[14px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap shrink-0",
                      activeSubTab === tab 
                        ? "bg-blue-600 text-white shadow-2xl shadow-blue-600/40 scale-105" 
                        : "text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-900/50"
                    )}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                );
             })}
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeSubTab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-lg border border-gray-100 dark:border-white/5 p-10">
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">About {league.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                  The {league.name} is a premier {league.type} competition featuring top-tier football clubs. Known for its intense rivalries and high level of competition, it attracts millions of fans worldwide.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-10">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teams</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{leagueTeams.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Type</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white uppercase">{league.type}</p>
                  </div>
                  {league.country && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Country</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{league.country}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'matches' && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {Object.entries(
                leagueGames.reduce((acc, g) => {
                  const round = g.round || 'Round 1';
                  if (!acc[round]) acc[round] = [];
                  acc[round].push(g);
                  return acc;
                }, {} as Record<string, Game[]>)
              ).map(([round, games]) => (
                <div key={round} className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                    <span className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">{round}</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(games as Game[]).map(game => (
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
              ))}
            </motion.div>
          )}

          {activeSubTab === 'standings' && (
            <motion.div
              key="standings"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
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

          {activeSubTab === 'knockout' && (
            <motion.div
              key="knockout"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <KnockoutBracket 
                games={leagueGames}
                teams={teams}
                onGameClick={onGameClick}
              />
            </motion.div>
          )}

          {activeSubTab === 'top_players' && (
            <motion.div
              key="top_players"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-lg border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Top Goalscorers</h3>
                  <TargetIcon size={24} className="text-blue-500" />
                </div>
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {(() => {
                    const goalMap: Record<string, number> = {};
                    leagueGames.forEach(game => {
                      game.events?.forEach(event => {
                        if (event.type === 'goal') goalMap[event.playerId] = (goalMap[event.playerId] || 0) + 1;
                      });
                    });
                    const scorers = Object.entries(goalMap)
                      .map(([playerId, goals]) => ({ playerId, goals }))
                      .sort((a, b) => b.goals - a.goals)
                      .slice(0, 10);

                    if (scorers.length === 0) return <div className="p-20 text-center text-gray-400 font-bold opacity-30 text-sm tracking-widest uppercase">No goals recorded yet.</div>;

                    return scorers.map((s, i) => {
                      const player = players.find(p => p.id === s.playerId);
                      const team = teams.find(t => t.id === player?.teamId);
                      return (
                        <div key={s.playerId} className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => onPlayerClick?.(s.playerId)}>
                          <div className="flex items-center gap-6">
                            <span className={cn("w-8 h-8 flex items-center justify-center rounded-xl font-black text-xs", i === 0 ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-gray-300 dark:text-gray-700")}>{i + 1}</span>
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-white/10 overflow-hidden group-hover:scale-110 transition-transform">
                              {player?.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><UsersIcon size={20} className="text-gray-300" /></div>}
                            </div>
                            <div>
                               <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors">{player?.name || 'Unknown'}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 {team?.logo && <img src={team.logo} className="w-4 h-4 object-contain" alt="" />}
                                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{team?.name}</span>
                               </div>
                            </div>
                          </div>
                          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums italic">{s.goals}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'transfers' && (
            <motion.div
              key="transfers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-3d-lg border border-gray-100 dark:border-white/5 overflow-hidden divide-y">
                {(() => {
                  const leagueTransfers = transfers.filter(t => teams.find(team => team.id === t.toTeamId)?.leagueId === league.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  if (leagueTransfers.length === 0) return <div className="p-20 text-center text-gray-400 font-bold opacity-30 tracking-widest uppercase text-sm">No transfers recorded.</div>;
                  return leagueTransfers.map(t => {
                    const player = players.find(p => p.id === t.playerId);
                    const toTeam = teams.find(team => team.id === t.toTeamId);
                    return (
                      <div key={t.id} className="p-8 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => player && onPlayerClick?.(player.id)}>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{new Date(t.date).toLocaleDateString()}</span>
                          <div className="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {t.fee || 'Signed'}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-white/10 overflow-hidden group-hover:scale-110 transition-transform">
                             {player?.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <UsersIcon size={24} className="text-gray-300" />}
                           </div>
                           <div className="flex-1">
                             <p className="font-black text-gray-900 dark:text-white text-lg tracking-tight group-hover:text-blue-500 transition-colors uppercase">{player?.name}</p>
                             <div className="flex items-center gap-2 mt-1">
                                <ArrowRightIcon size={12} className="text-gray-300" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Joined {toTeam?.name}</span>
                             </div>
                           </div>
                           {toTeam?.logo && <img src={toTeam.logo} className="w-10 h-10 object-contain drop-shadow-sm" />}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'honors' && (
            <motion.div
              key="honors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <HonorsSection 
                title={`${league.name} Champions History`}
                accentColor="amber"
                honors={league.history?.map(record => {
                  const winner = teams.find(t => t.id === record.winnerId);
                  return {
                    season: record.season,
                    title: winner?.name || 'Unknown Champion',
                    description: 'League Winner',
                    type: 'winner'
                  };
                }) || []}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
