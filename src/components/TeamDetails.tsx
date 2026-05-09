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
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  ChevronDown as ChevronDownIcon,
  Globe2 as GlobeIcon,
  Flag as FlagIcon,
  Banknote as BanknoteIcon,
  Pencil as PencilIcon
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
  onEditTeam?: (teamId: string) => void;
}

type Tab = 'overview' | 'matches' | 'tables' | 'top_players';

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
  onEditTeam
}: TeamDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

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
  const league2 = leagues.find(l => l.id === team.leagueId2);
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

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950">
      {/* Header Navigation */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 sticky top-0 z-20">
        <button 
          onClick={onBack}
          className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white"
        >
          <ChevronLeftIcon size={24} />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center">
              {team.logo && <img src={team.logo} alt="" className="w-full h-full object-contain" />}
            </div>
            <h1 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{team.name}</h1>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{league?.country || 'International'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={() => onEditTeam?.(team.id)}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white hover:bg-gray-100 transition-colors"
            >
              <PencilIcon size={20} />
            </button>
          )}
          <button 
            onClick={onToggleFavorite}
            className={cn(
              "p-4 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors",
              isFavorite ? "text-yellow-500" : "text-gray-400"
            )}
          >
            <StarIcon size={24} className={cn(isFavorite && "fill-current")} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-between px-6 py-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 overflow-x-auto scrollbar-none">
        {(['overview', 'matches', 'tables', 'top_players'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-black tracking-tight transition-all relative",
              activeTab === tab 
                ? "text-blue-900 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
            )}
          >
            {tab === 'overview' ? 'Overview' : 
             tab === 'matches' ? 'Matches' : 
             tab === 'tables' ? 'Tables' : 'Top Players'}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTabTeam" 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Main Info Card */}
              <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                     {team.logo ? (
                       <img src={team.logo} alt="" className="w-full h-full object-contain" />
                     ) : (
                       <ShieldIcon className="text-gray-200" size={32} />
                     )}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{team.name}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                       <span className="w-2 h-2 bg-red-500 rounded-sm" />
                       {league?.logo && <img src={league.logo} alt="" className="w-3 h-3 rounded-full object-contain" />}
                       {league?.name}{league2 && ` • ${league2.name}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-10 gap-x-4">
                   <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                         <CalendarIcon className="text-green-600 dark:text-green-400" size={24} />
                      </div>
                      <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{team.foundedIn || 'N/A'}</p>
                      <p className="text-xs font-bold text-gray-400 mt-1">Foundation Year</p>
                   </div>
                   
                   <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                         <BanknoteIcon className="text-green-600 dark:text-green-400" size={24} />
                      </div>
                      <p className="text-lg font-black text-red-500 tabular-nums">{team.marketValue || 'N/A'}</p>
                      <p className="text-xs font-bold text-gray-400 mt-1">Market Value</p>
                   </div>

                   <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                         <GlobeIcon className="text-green-600 dark:text-green-400" size={24} />
                      </div>
                      <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{team.foreignPlayers || 0}</p>
                      <p className="text-xs font-bold text-gray-400 mt-1">Foreign Players</p>
                   </div>

                   <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                         <FlagIcon className="text-green-600 dark:text-green-400" size={24} />
                      </div>
                      <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{team.nationalPlayers || 0}</p>
                      <p className="text-xs font-bold text-gray-400 mt-1">National Players</p>
                   </div>
                </div>
              </div>

              {/* Stadium/Team Image */}
              <div className="rounded-[32px] overflow-hidden shadow-md border border-gray-100 dark:border-gray-800 h-64 relative group">
                <img 
                  src={team.stadiumImageUrl || "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2070&auto=format&fit=crop"} 
                  alt="Stadium" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                   <p className="text-white font-black text-lg tracking-tight">Mendizorrotza Stadium</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'matches' && (
            <motion.div
              key="matches-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
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
                <div className="p-12 text-center text-gray-400 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">No matches found.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'tables' && (
            <motion.div
              key="tables-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Standings 
                leagues={teamLeagues}
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

          {activeTab === 'top_players' && (
            <motion.div
              key="top-players-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {teamPlayers.length > 0 ? (
                teamPlayers.slice(0, 10).map(player => (
                  <button 
                    key={player.id} 
                    onClick={() => onPlayerClick?.(player.id)}
                    className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md transition-all group text-left w-full"
                  >
                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center font-black transition-colors overflow-hidden border border-gray-100 dark:border-gray-700">
                      {player.imageUrl ? (
                        <img src={player.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">{player.number}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors uppercase tracking-tight text-sm">{player.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{player.position}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full p-12 text-center text-gray-400 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800">
                  <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">Squad information not available.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
