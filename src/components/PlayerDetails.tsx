import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Team, Game, League } from '../types';
import { 
  ChevronLeft as ChevronLeftIcon,
  Shield as ShieldIcon,
  TrendingUp as TrendingUpIcon,
  User as UserIcon,
  Pencil as PencilIcon,
  Footprints as FootprintsIcon,
  Bell as BellIcon,
  Star as StarIcon,
  Share2 as Share2Icon,
  Trophy as TrophyIcon,
  Target as TargetIcon,
  Zap as ZapIcon,
  LayoutGrid as LayoutGridIcon,
  Clock as ClockIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';

interface PlayerDetailsProps {
  player: Player;
  team?: Team;
  games?: Game[];
  leagues?: League[];
  players?: Player[];
  teams?: Team[];
  onBack: () => void;
  isAdmin?: boolean;
  onEdit?: (playerId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  onTeamClick?: (teamId: string) => void;
  onGameClick?: (gameId: string) => void;
}

type Tab = 'PROFILE' | 'STATS';

export function PlayerDetails({ 
  player, 
  team, 
  games = [], 
  leagues = [], 
  players = [], 
  teams = [],
  onBack, 
  isAdmin, 
  onEdit, 
  onPlayerClick, 
  onTeamClick,
  onGameClick
}: PlayerDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('PROFILE');

  const playerStats = useMemo(() => {
    const relevantGames = games.filter(g => g.status === 'finished');
    let appearances = 0;
    let goals = 0;
    let assists = 0;
    let penalties = 0;

    relevantGames.forEach(game => {
      const isHome = game.homeTeamId === player.teamId;
      const isAway = game.awayTeamId === player.teamId;
      
      if (isHome || isAway) {
        if (game.lineups) {
          const inLineup = (isHome && game.lineups.home.includes(player.id)) || 
                           (isAway && game.lineups.away.includes(player.id));
          if (inLineup) appearances++;
        } else {
          appearances++;
        }

        game.events?.forEach(event => {
          if (event.playerId === player.id) {
            if (event.type === 'goal') goals++;
            if (event.type === 'penalty') {
              goals++;
              penalties++;
            }
          }
          if (event.assistantId === player.id) {
            assists++;
          }
        });
      }
    });

    return { appearances, goals, assists, penalties };
  }, [games, player.id, player.teamId]);

  const liveGame = useMemo(() => {
    return games.find(g => g.status === 'live' && (g.homeTeamId === player.teamId || g.awayTeamId === player.teamId));
  }, [games, player.teamId]);

  const league = useMemo(() => {
    return leagues.find(l => l.id === (liveGame?.leagueId || team?.leagueId));
  }, [leagues, liveGame, team]);

  const age = useMemo(() => {
    if (!player.birthDate) return '26';
    const birth = new Date(player.birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  }, [player.birthDate]);

  const radarData = useMemo(() => {
    if (!player.statsRadar) {
      return [
        { subject: 'Attacking', A: 40, fullMark: 100 },
        { subject: 'Creativity', A: 47, fullMark: 100 },
        { subject: 'Defending', A: 78, fullMark: 100 },
        { subject: 'Tactical', A: 64, fullMark: 100 },
        { subject: 'Technical', A: 48, fullMark: 100 },
      ];
    }
    return [
      { subject: 'Attacking', A: player.statsRadar?.attacking ?? 0, fullMark: 100 },
      { subject: 'Creativity', A: player.statsRadar?.creativity ?? 0, fullMark: 100 },
      { subject: 'Defending', A: player.statsRadar?.defending ?? 0, fullMark: 100 },
      { subject: 'Tactical', A: player.statsRadar?.tactical ?? 0, fullMark: 100 },
      { subject: 'Technical', A: player.statsRadar?.technical ?? 0, fullMark: 100 },
    ];
  }, [player.statsRadar]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 font-sans">
      {/* Black Header */}
      <div className="bg-[#000000] text-white pt-6 pb-2 relative transition-all">
        <div className="flex items-center justify-between px-6 py-4 absolute top-0 left-0 right-0 z-20">
          <button onClick={onBack} className="p-2 text-white hover:opacity-70 transition-opacity">
            <ChevronLeftIcon size={28} />
          </button>
          <div className="flex gap-2">
            <button className="p-2 text-white hover:opacity-70 transition-opacity">
              <StarIcon size={24} />
            </button>
            <button className="p-2 text-white hover:opacity-70 transition-opacity relative">
              <BellIcon size={24} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-black" />
            </button>
            <button className="p-2 text-white hover:opacity-70 transition-opacity">
              <Share2Icon size={24} />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center pt-10 pb-6">
          <div className="relative group cursor-pointer" onClick={() => isAdmin && onEdit?.(player.id)}>
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-[#9D3350] to-[#E94E77] flex items-center justify-center shadow-2xl relative z-10">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-black">
                {player.imageUrl ? (
                  <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <UserIcon size={48} className="text-gray-600" />
                  </div>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <PencilIcon className="text-white" size={24} />
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
             <h1 className="text-[22px] font-black tracking-tight">{player.name}</h1>
             <p className="text-[14px] font-medium text-white/50 mt-1 uppercase tracking-widest">{player.position}</p>
          </div>
        </div>

        {/* PROFILE / STATS Tabs */}
        <div className="flex px-2 mt-4 border-t border-white/5">
          {(['PROFILE', 'STATS'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-4 text-[13px] font-black tracking-[0.2em] relative transition-colors",
                activeTab === tab ? "text-white" : "text-white/30"
              )}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="playerTabIndicator" 
                  className="absolute bottom-[-1px] left-0 right-0 h-1 bg-[#3B82F6]" 
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#F8F9FA] dark:bg-gray-950 p-4 space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'PROFILE' && (
            <motion.div
              key="profile-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Info Row Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all overflow-hidden">
                <div className="p-6">
                   <div className="flex items-center gap-6 mb-8 relative">
                      {/* Nationality */}
                      <div className="flex flex-col items-center flex-1 text-center">
                         <div className="w-14 h-14 flex items-center justify-center text-3xl mb-2">
                           {player.nationality === 'Senegal' ? '🇸🇳' : 
                            player.nationality === 'Poland' ? '🇵🇱' : '🏳️'}
                         </div>
                         <p className="text-[17px] font-bold text-gray-900 dark:text-white leading-tight">{player.nationality || 'Poland'}</p>
                         <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-tight">Nationality</p>
                      </div>

                      <div className="w-px h-16 bg-gray-100 dark:bg-gray-800/50" />

                      {/* Club */}
                      <div className="flex flex-col items-center flex-1 text-center">
                         <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center p-2.5 mb-2 border border-gray-50 dark:border-gray-800">
                           {team?.logo ? (
                             <img src={team.logo} alt="" className="w-full h-full object-contain" />
                           ) : (
                             <ShieldIcon size={24} className="text-rose-900/30" />
                           )}
                         </div>
                         <p className="text-[17px] font-bold text-gray-900 dark:text-white leading-tight truncate w-full px-2" onClick={() => team && onTeamClick?.(team.id)}>
                           {team?.name || 'Free Agent'}
                         </p>
                         <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-tighter">Contract until 30/06/26</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-4 border-t border-gray-50 dark:border-gray-800/50 pt-6">
                      <div className="flex flex-col items-center text-center">
                         <p className="text-[18px] font-black text-gray-900 dark:text-white">{age} years</p>
                         <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-tight">{player.birthDate || '23/09/1989'}</p>
                      </div>
                      <div className="flex flex-col items-center text-center">
                         <p className="text-[18px] font-black text-gray-900 dark:text-white">{player.height || '1.78'}</p>
                         <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-tight">Height</p>
                      </div>
                      <div className="flex flex-col items-center text-center">
                         <p className="text-[18px] font-black text-gray-900 dark:text-white">{player.number || '55'}</p>
                         <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-tight">Jersey Number</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* LIVE Match Section */}
              {liveGame && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transform transition-all hover:shadow-md cursor-pointer" onClick={() => onGameClick?.(liveGame.id)}>
                   <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800/50">
                      <p className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">
                        LIVE - {league?.name || 'League'}
                      </p>
                   </div>
                   <div className="p-8">
                      <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-4 flex-1">
                            <span className="text-[15px] font-bold text-gray-900 dark:text-white flex-1 text-right truncate">
                               {teams.find(t => t.id === liveGame.homeTeamId)?.name || 'Home'}
                            </span>
                            <div className="w-10 h-10 flex-shrink-0">
                               <img src={teams.find(t => t.id === liveGame.homeTeamId)?.logo || ''} className="w-full h-full object-contain" />
                            </div>
                         </div>

                         <div className="flex flex-col items-center gap-1 min-w-[80px]">
                            <span className="text-[11px] font-black text-red-500 uppercase tracking-widest animate-pulse">Halftime</span>
                            <div className="flex items-center gap-2">
                               <span className="text-3xl font-black tabular-nums">{liveGame.homeScore} - {liveGame.awayScore}</span>
                               <span className="w-2.5 h-3.5 bg-red-500 rounded-sm" />
                            </div>
                         </div>

                         <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 flex-shrink-0">
                               <img src={teams.find(t => t.id === liveGame.awayTeamId)?.logo || ''} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-[15px] font-bold text-gray-900 dark:text-white flex-1 truncate">
                               {teams.find(t => t.id === liveGame.awayTeamId)?.name || 'Away'}
                            </span>
                         </div>
                      </div>

                      {/* Mock Probability (To Score at Any Time) */}
                      <div className="mt-10 space-y-6">
                         <h5 className="text-center text-[16px] font-black text-gray-900 dark:text-white uppercase tracking-wider">To Score at Any Time</h5>
                         <div className="flex justify-between px-4">
                            <div className="flex flex-col items-center gap-2">
                               <span className="text-3xl font-black text-gray-300 dark:text-gray-700">88%</span>
                               <span className="text-[13px] font-bold text-gray-400">Yes</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                               <span className="text-3xl font-black text-gray-300 dark:text-gray-700">12%</span>
                               <span className="text-[13px] font-bold text-gray-400">No</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* Stats Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800/50">
                   <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Stats</h4>
                </div>
                <div className="p-8">
                   <div className="flex items-center justify-center gap-2 mb-8">
                      <div className="w-3 h-3 rounded-full bg-blue-100" />
                      <p className="text-[15px] font-bold text-gray-900 dark:text-white">{league?.name || 'League'}</p>
                   </div>

                   <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-green-500">
                            <LayoutGridIcon size={24} />
                         </div>
                         <div className="text-center">
                            <p className="text-xl font-black tabular-nums">{playerStats.appearances}/32</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">Appearances</p>
                         </div>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-900 dark:text-white">
                            <TargetIcon size={24} />
                         </div>
                         <div className="text-center">
                            <p className="text-xl font-black tabular-nums">
                              {playerStats.goals}
                              {playerStats.penalties > 0 && <span className="text-sm">({playerStats.penalties}Pk)</span>}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">Goals</p>
                         </div>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-blue-500">
                            <ZapIcon size={24} />
                         </div>
                         <div className="text-center">
                            <p className="text-xl font-black tabular-nums">{playerStats.assists}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">Assists</p>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'STATS' && (
            <motion.div
              key="stats-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Stats Card (Radar) */}
              <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative transition-all">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={(props) => {
                          const { x, y, payload } = props;
                          const percentage = radarData.find(d => d.subject === payload.value)?.A;
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text
                                x={0}
                                y={0}
                                dy={-10}
                                textAnchor="middle"
                                className="fill-gray-900 dark:fill-white text-[12px] font-black"
                              >
                                {payload.value}
                              </text>
                              <text
                                x={0}
                                y={0}
                                dy={8}
                                textAnchor="middle"
                                className="fill-gray-500 dark:fill-gray-400 text-[10px] font-bold"
                              >
                                ({percentage}%)
                              </text>
                            </g>
                          );
                        }}
                      />
                      <Radar
                        name={player.name}
                        dataKey="A"
                        stroke="#22C55E"
                        strokeWidth={2}
                        fill="#22C55E"
                        fillOpacity={0.2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Stats Placeholder */}
              <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all">
                <h3 className="text-lg font-black dark:text-white mb-6">Detailed Season Stats</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Detailed performance statistics are being aggregated for the current season.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoItem({ label, value, subValue, icon }: { label: string; value: string; subValue?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center space-y-2">
      {icon ? (
        <div className="h-6 flex items-center justify-center">
          {icon}
        </div>
      ) : (
        <span className="text-lg font-black text-gray-900 dark:text-white leading-none">{value}</span>
      )}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</span>
        {subValue && !icon && <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{subValue}</span>}
        {icon && <span className="text-lg font-black text-gray-900 dark:text-white leading-none">{value}</span>}
      </div>
    </div>
  );
}

