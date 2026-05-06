import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Game, Team, League, Player, Venue, MatchEvent } from '../types';
import { 
  ChevronLeft as ChevronLeftIcon, 
  Share2 as Share2Icon, 
  Shield as ShieldIcon, 
  Minus as MinusIcon, 
  Plus as PlusIcon, 
  History as HistoryIcon, 
  TrendingUp as TrendingUpIcon, 
  Activity as ActivityIcon,
  Users as UsersIcon,
  Zap as ZapIcon,
  MapPin as MapPinIcon,
  Clock as ClockIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Standings } from './Standings';

interface GameDetailsProps {
  game: Game;
  teams: Team[];
  games: Game[];
  leagues: League[];
  players: Player[];
  venues: Venue[];
  onBack: () => void;
  onTeamClick: (teamId: string) => void;
  isAdmin: boolean;
}

type Tab = 'stats' | 'events' | 'lineups' | 'standings' | 'h2h';

export function GameDetails({ game, teams, games, leagues, players, venues, onBack, onTeamClick, isAdmin }: GameDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const homeTeam = teams.find(t => t.id === game.homeTeamId);
  const awayTeam = teams.find(t => t.id === game.awayTeamId);
  const venue = venues.find(v => v.id === game.venueId);
  const [pulse, setPulse] = useState<'home' | 'away' | null>(null);
  const [prevScores, setPrevScores] = useState({ h: game.homeScore, a: game.awayScore });
  const [loading, setLoading] = useState(false);

  const league = leagues.find(l => l.id === game.leagueId);
  const leagueTeams = teams.filter(t => t.leagueId === game.leagueId);
  const leagueGames = games.filter(g => g.leagueId === game.leagueId);

  const sortedEvents = useMemo(() => {
    return [...(game.events || [])].sort((a, b) => b.minute - a.minute);
  }, [game.events]);

  const h2hGames = useMemo(() => {
    return games.filter(g => 
      (g.homeTeamId === game.homeTeamId && g.awayTeamId === game.awayTeamId) ||
      (g.homeTeamId === game.awayTeamId && g.awayTeamId === game.homeTeamId)
    ).filter(g => g.id !== game.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [games, game.homeTeamId, game.awayTeamId, game.id]);

  useEffect(() => {
    if (game.homeScore > prevScores.h) {
      setPulse('home');
      setPrevScores({ ...prevScores, h: game.homeScore });
    }
    if (game.awayScore > prevScores.a) {
      setPulse('away');
      setPrevScores({ ...prevScores, a: game.awayScore });
    }
    const timer = setTimeout(() => setPulse(null), 3000);
    return () => clearTimeout(timer);
  }, [game.homeScore, game.awayScore]);

  const updateGame = async (updates: Partial<Game>) => {
    setLoading(true);
    const path = `games/${game.id}`;
    try {
      await updateDoc(doc(db, 'games', game.id), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  // Default stats for demo if none exist
  const stats = game.stats || {
    possession: { home: 48, away: 52 },
    shots: { home: 12, away: 15 },
    shotsOnGoal: { home: 5, away: 7 },
    corners: { home: 4, away: 6 },
    yellowCards: { home: 2, away: 1 },
    crosses: { home: 18, away: 22 },
    goalKicks: { home: 8, away: 10 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20"
    >
      {/* Detail Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm sticky top-0 z-30">
        <button onClick={onBack} className="p-3 bg-gray-50 rounded-full text-gray-900 hover:bg-gray-100 transition-colors">
          <ChevronLeftIcon size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-gray-900 text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">Game Center</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Match Information</span>
        </div>
        <div className="flex gap-2">
            <button className="p-3 bg-gray-50 rounded-full text-gray-900"><Share2Icon size={20} /></button>
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="bg-white rounded-[40px] p-6 sm:p-8 border border-gray-100 shadow-xl overflow-hidden relative">
        <AnimatePresence>
          {pulse && (
            <motion.div 
              initial={{ y: -100, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 1.5 }}
              className="absolute inset-x-0 top-6 flex justify-center z-20 pointer-events-none"
            >
              <div className="bg-blue-600 text-white font-black px-8 py-3 rounded-full text-xl uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 border-4 border-white">
                GOAL!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center relative z-10 gap-2">
           <div 
            className="flex flex-col items-center gap-2 sm:gap-4 flex-1 cursor-pointer group"
            onClick={() => homeTeam && onTeamClick(homeTeam.id)}
           >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-2xl sm:rounded-3xl flex items-center justify-center p-3 sm:p-4 border border-gray-100 group-hover:border-blue-200 transition-colors">
                {homeTeam?.logo ? <img src={homeTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={40} className="text-gray-200" />}
              </div>
              <h3 className="font-black text-center text-sm sm:text-lg leading-tight h-10 sm:h-auto flex items-center justify-center group-hover:text-blue-600 transition-colors">{homeTeam?.name}</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Home</span>
           </div>

           <div className="flex flex-col items-center gap-2 px-2 sm:px-8 shrink-0">
              <div className="flex items-center gap-2 sm:gap-4">
                <motion.span 
                  animate={pulse === 'home' ? { scale: [1, 1.3, 1], y: [0, -20, 0] } : {}}
                  className="text-4xl sm:text-6xl font-black tabular-nums"
                >
                  {game.homeScore}
                </motion.span>
                <span className="text-xl sm:text-2xl text-gray-200 font-black">:</span>
                <motion.span 
                  animate={pulse === 'away' ? { scale: [1, 1.3, 1], y: [0, -20, 0] } : {}}
                  className="text-4xl sm:text-6xl font-black tabular-nums"
                >
                  {game.awayScore}
                </motion.span>
              </div>
              <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                game.status === 'live' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              )}>
                {game.status === 'live' ? '90:00 LIVE' : game.status === 'finished' ? 'FINISHED' : 'KICKOFF'}
              </div>
           </div>

           <div 
            className="flex flex-col items-center gap-2 sm:gap-4 flex-1 cursor-pointer group"
            onClick={() => awayTeam && onTeamClick(awayTeam.id)}
           >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-2xl sm:rounded-3xl flex items-center justify-center p-3 sm:p-4 border border-gray-100 group-hover:border-blue-200 transition-colors">
                {awayTeam?.logo ? <img src={awayTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={40} className="text-gray-200" />}
              </div>
              <h3 className="font-black text-center text-sm sm:text-lg leading-tight h-10 sm:h-auto flex items-center justify-center group-hover:text-blue-600 transition-colors">{awayTeam?.name}</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Away</span>
           </div>
        </div>

        {/* Admin Controls Area */}
        {isAdmin && (
          <div className="mt-8 pt-8 border-t border-gray-50 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest">
              <span>Admin Live Controls</span>
              {loading && <span className="text-blue-500 animate-pulse text-[8px]">Updating Database...</span>}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-3xl flex items-center justify-between gap-4">
                <span className="text-xs font-black uppercase tracking-tighter">Score Control</span>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateGame({ homeScore: Math.max(0, game.homeScore - 1) })}
                      className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-colors"
                    >
                      <MinusIcon size={14} />
                    </button>
                    <span className="w-4 text-center font-black">{game.homeScore}</span>
                    <button 
                      onClick={() => updateGame({ homeScore: game.homeScore + 1 })}
                      className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-colors"
                    >
                      <PlusIcon size={14} />
                    </button>
                   </div>
                   <div className="w-px h-6 bg-gray-200" />
                   <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateGame({ awayScore: Math.max(0, game.awayScore - 1) })}
                      className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-colors"
                    >
                      <MinusIcon size={14} />
                    </button>
                    <span className="w-4 text-center font-black">{game.awayScore}</span>
                    <button 
                      onClick={() => updateGame({ awayScore: game.awayScore + 1 })}
                      className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-colors"
                    >
                      <PlusIcon size={14} />
                    </button>
                   </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-3xl flex items-center justify-between gap-4">
                <span className="text-xs font-black uppercase tracking-tighter">Status</span>
                <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm">
                  {(['scheduled', 'live', 'finished'] as const).map(s => (
                    <button 
                      key={s}
                      onClick={() => updateGame({ status: s })}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all",
                        game.status === s ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-[40px] p-6 sm:p-8 border border-gray-100 shadow-sm">
        <div className="flex gap-2 sm:gap-4 mb-8 overflow-x-auto scrollbar-none pb-2">
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'stats' ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            <ActivityIcon size={16} />
            Stats
          </button>
          <button 
            onClick={() => setActiveTab('events')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'events' ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            <ZapIcon size={16} />
            Events
          </button>
          <button 
            onClick={() => setActiveTab('lineups')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'lineups' ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            <UsersIcon size={16} />
            Lineups
          </button>
          <button 
            onClick={() => setActiveTab('standings')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'standings' ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            <TrendingUpIcon size={16} />
            Table
          </button>
          <button 
            onClick={() => setActiveTab('h2h')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'h2h' ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-50"
            )}
          >
            <HistoryIcon size={16} />
            H2H
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Match Events</h4>
                <ClockIcon size={14} className="text-gray-300" />
              </div>
              
              <div className="relative space-y-4 before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-gray-100 before:-translate-x-1/2">
                {sortedEvents.length > 0 ? (
                  sortedEvents.map((event, idx) => {
                    const isHome = event.teamId === game.homeTeamId;
                    const eventPlayer = players.find(p => p.id === event.playerId);
                    const assistant = event.assistantId ? players.find(p => p.id === event.assistantId) : null;
                    const pIn = event.playerInId ? players.find(p => p.id === event.playerInId) : null;
                    const pOut = event.playerOutId ? players.find(p => p.id === event.playerOutId) : null;

                    return (
                      <div key={event.id || idx} className={cn(
                        "flex items-center gap-4 relative z-10",
                        isHome ? "flex-row" : "flex-row-reverse"
                      )}>
                        <div className={cn("flex-1", isHome ? "text-right" : "text-left")}>
                          <p className="font-bold text-sm text-gray-900">{eventPlayer?.name || pIn?.name || 'Unknown'}</p>
                          {event.type === 'goal' && assistant && (
                            <p className="text-[10px] text-gray-400 font-medium">assist by {assistant.name}</p>
                          )}
                          {event.type === 'sub' && pOut && (
                            <p className="text-[10px] text-red-400 font-medium tracking-tight">out: {pOut.name}</p>
                          )}
                        </div>
                        
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-50 flex items-center justify-center shadow-lg">
                          <EventIcon type={event.type} />
                        </div>

                        <div className={cn("flex-1 flex items-center gap-2", isHome ? "flex-row" : "flex-row-reverse")}>
                           <span className="font-black tabular-nums text-blue-600 text-sm">{event.minute}'</span>
                           <div className="flex-1" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center text-gray-400 relative z-10 bg-white">
                    <ZapIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">No major events recorded yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'lineups' && (
            <motion.div
              key="lineups"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Stadium Info */}
              <div className="p-6 bg-blue-50 rounded-[32px] flex items-center gap-4 border border-blue-100/50">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  <MapPinIcon className="text-blue-600" size={20} />
                </div>
                <div>
                  <h4 className="font-black text-blue-900 text-sm uppercase tracking-tight">{venue?.name || 'To Be Confirmed'}</h4>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    {venue?.city || 'Location Unknown'} {venue?.capacity ? `• Capacity: ${venue.capacity.toLocaleString()}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Home Lineup */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center p-1 border border-gray-100">
                      {homeTeam?.logo ? <img src={homeTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={12} className="text-gray-300" />}
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest truncate">{homeTeam?.name}</span>
                  </div>
                  <div className="space-y-3">
                    {game.lineups?.home && game.lineups.home.length > 0 ? (
                      game.lineups.home.map(pid => {
                        const p = players.find(player => player.id === pid);
                        return <LineupItem key={pid} player={p} />;
                      })
                    ) : (
                      <p className="text-[10px] text-gray-400 italic px-2">Lineup not announced</p>
                    )}
                  </div>
                </div>

                {/* Away Lineup */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-row-reverse px-2">
                    <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center p-1 border border-gray-100">
                      {awayTeam?.logo ? <img src={awayTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={12} className="text-gray-300" />}
                    </div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest truncate text-right">{awayTeam?.name}</span>
                  </div>
                  <div className="space-y-3">
                    {game.lineups?.away && game.lineups.away.length > 0 ? (
                      game.lineups.away.map(pid => {
                        const p = players.find(player => player.id === pid);
                        return <LineupItem key={pid} player={p} isRight />;
                      })
                    ) : (
                      <p className="text-[10px] text-gray-400 italic text-right px-2">Lineup not announced</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <StatProgress 
                label="Shots on goal" 
                homeValue={stats.shotsOnGoal.home} 
                awayValue={stats.shotsOnGoal.away} 
              />
              <StatProgress 
                label="Shots" 
                homeValue={stats.shots.home} 
                awayValue={stats.shots.away} 
              />
              <StatProgress 
                label="Possession %" 
                homeValue={stats.possession.home} 
                awayValue={stats.possession.away} 
                isPercent
              />
              <StatProgress 
                label="Yellow card" 
                homeValue={stats.yellowCards.home} 
                awayValue={stats.yellowCards.away} 
              />
              <StatProgress 
                label="Corner kicks" 
                homeValue={stats.corners.home} 
                awayValue={stats.corners.away} 
              />
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
                onTeamClick={onTeamClick}
              />
            </motion.div>
          )}

          {activeTab === 'h2h' && (
            <motion.div
              key="h2h"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 px-2">Head to Head History</h4>
              {h2hGames.length > 0 ? (
                h2hGames.map(g => {
                  const h = teams.find(t => t.id === g.homeTeamId);
                  const a = teams.find(t => t.id === g.awayTeamId);
                  return (
                    <div key={g.id} className="p-4 bg-gray-50 rounded-3xl flex items-center justify-between border border-gray-100">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm">
                          {h?.logo ? <img src={h.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={16} className="text-gray-300" />}
                        </div>
                        <span className="text-xs font-bold truncate max-w-[80px]">{h?.name}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 px-4">
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                          <span className="font-black tabular-nums text-sm">{g.homeScore}</span>
                          <span className="text-gray-300 font-bold">-</span>
                          <span className="font-black tabular-nums text-sm">{g.awayScore}</span>
                        </div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">{new Date(g.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-xs font-bold truncate max-w-[80px] text-right">{a?.name}</span>
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm">
                          {a?.logo ? <img src={a.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={16} className="text-gray-300" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-bold">No previous encounters found.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  switch (type) {
    case 'goal':
      return <ActivityIcon className="text-blue-600" size={16} />;
    case 'yellow':
      return <div className="w-3 h-4 bg-yellow-400 rounded-sm" />;
    case 'red':
      return <div className="w-3 h-4 bg-red-600 rounded-sm" />;
    case 'sub':
      return <div className="flex flex-col -gap-1">
        <PlusIcon className="text-green-500" size={10} />
        <MinusIcon className="text-red-500" size={10} />
      </div>;
    default:
      return null;
  }
}

interface LineupItemProps {
  player?: Player;
  isRight?: boolean;
}

function LineupItem({ player, isRight, ...props }: LineupItemProps & { key?: any }) {
  if (!player) return null;
  return (
    <div 
      {...props}
      className={cn(
      "flex items-center gap-3 p-2 bg-gray-50/50 rounded-2xl border border-gray-100/50",
      isRight ? "flex-row-reverse" : "flex-row"
    )}>
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-gray-400 text-[10px] shadow-sm">
        {player.number}
      </div>
      <div className={cn("flex-1 overflow-hidden", isRight ? "text-right" : "text-left")}>
        <p className="text-xs font-bold text-gray-900 truncate">{player.name}</p>
        <p className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">{player.position}</p>
      </div>
    </div>
  );
}

function StatProgress({ label, homeValue, awayValue, isPercent }: { label: string; homeValue: number; awayValue: number; isPercent?: boolean }) {
  const total = homeValue + awayValue || 1;
  const homePercent = (homeValue / total) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="font-black text-base sm:text-lg">{homeValue}{isPercent && '%'}</span>
        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        <span className="font-black text-base sm:text-lg text-right">{awayValue}{isPercent && '%'}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full flex gap-1 overflow-hidden">
        <div className="h-full bg-blue-900 transition-all duration-1000" style={{ width: `${homePercent}%` }} />
        <div className="h-full bg-gray-900 transition-all duration-1000 flex-1" />
      </div>
    </div>
  );
}
