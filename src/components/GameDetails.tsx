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
  Clock as ClockIcon,
  Bell as BellIcon,
  RefreshCw as RefreshCwIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Standings } from './Standings';
import { GameCard } from './GameCard';

interface GameDetailsProps {
  game: Game;
  teams: Team[];
  games: Game[];
  leagues: League[];
  players: Player[];
  venues: Venue[];
  onBack: () => void;
  onTeamClick: (teamId: string) => void;
  onLeagueClick: (leagueId: string) => void;
  onGameClick: (gameId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  isAdmin: boolean;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
}

type Tab = 'stats' | 'events' | 'lineups' | 'standings' | 'h2h';

export function GameDetails({ game, teams, games, leagues, players, venues, onBack, onTeamClick, onLeagueClick, onGameClick, onPlayerClick, isAdmin, isFollowing, onToggleFollow }: GameDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [lineupView, setLineupView] = useState<'list' | 'field'>('field');
  const homeTeam = teams.find(t => t.id === game.homeTeamId);
  const awayTeam = teams.find(t => t.id === game.awayTeamId);
  const venue = venues.find(v => v.id === game.venueId);
  const [pulse, setPulse] = useState<'home' | 'away' | null>(null);
  const [prevScores, setPrevScores] = useState({ h: game.homeScore, a: game.awayScore });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [selectedEventPlayer, setSelectedEventPlayer] = useState<string | null>(null);
  const [selectedPlayerOut, setSelectedPlayerOut] = useState<string | null>(null);

  useEffect(() => {
    if (game.status !== 'scheduled') {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(game.date).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return "LIVE NOW";
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      return `${hours}h ${minutes}m ${seconds}s`;
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [game.date, game.status]);

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

  // Improved stats fallback logic
  const stats = useMemo(() => {
    const base = {
      possession: { home: 50, away: 50 },
      shots: { home: 0, away: 0 },
      shotsOnGoal: { home: 0, away: 0 },
      corners: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      crosses: { home: 0, away: 0 },
      goalKicks: { home: 0, away: 0 },
    };

    if (!game.stats) return base;

    return {
      possession: game.stats.possession || base.possession,
      shots: game.stats.shots || base.shots,
      shotsOnGoal: game.stats.shotsOnGoal || base.shotsOnGoal,
      corners: game.stats.corners || base.corners,
      yellowCards: game.stats.yellowCards || base.yellowCards,
      crosses: game.stats.crosses || base.crosses,
      goalKicks: game.stats.goalKicks || base.goalKicks,
    };
  }, [game.stats]);

  const homeForm = useMemo(() => {
    if (!homeTeam) return [];
    return games
      .filter(g => (g.homeTeamId === homeTeam.id || g.awayTeamId === homeTeam.id) && g.status === 'finished' && new Date(g.date) < new Date(game.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(g => {
        const isHome = g.homeTeamId === homeTeam.id;
        const score = isHome ? g.homeScore : g.awayScore;
        const opponentScore = isHome ? g.awayScore : g.homeScore;
        if (score > opponentScore) return 'W';
        if (score < opponentScore) return 'L';
        return 'D';
      }).reverse();
  }, [games, homeTeam, game.date]);

  const awayForm = useMemo(() => {
    if (!awayTeam) return [];
    return games
      .filter(g => (g.homeTeamId === awayTeam.id || g.awayTeamId === awayTeam.id) && g.status === 'finished' && new Date(g.date) < new Date(game.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(g => {
        const isHome = g.homeTeamId === awayTeam.id;
        const score = isHome ? g.homeScore : g.awayScore;
        const opponentScore = isHome ? g.awayScore : g.homeScore;
        if (score > opponentScore) return 'W';
        if (score < opponentScore) return 'L';
        return 'D';
      }).reverse();
  }, [games, awayTeam, game.date]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20"
    >
      {/* Detail Header */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-4 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm sticky top-0 z-30 transition-all duration-300">
        <button onClick={onBack} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronLeftIcon size={24} />
        </button>
        <div className="flex flex-col items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => league && onLeagueClick(league.id)}
          >
            {league?.logo && <img src={league.logo} alt="" className="w-4 h-4 rounded-full object-contain" />}
            <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate max-w-[150px] sm:max-w-none transition-colors">{league?.name || 'Game Center'}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{game.round ? `${game.round} • ` : ''}Match Information</span>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={onToggleFollow}
              className={cn(
                "p-3 rounded-full transition-all",
                isFollowing ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/40" : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <BellIcon size={20} className={isFollowing ? "fill-white" : ""} />
            </button>
            <button className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Share2Icon size={20} /></button>
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="bg-white dark:bg-gray-900 rounded-[40px] p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-xl dark:shadow-black/20 overflow-hidden relative transition-all duration-300">
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
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 dark:bg-gray-800 rounded-2xl sm:rounded-3xl flex items-center justify-center p-3 sm:p-4 border border-gray-100 dark:border-gray-800 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                {homeTeam?.logo ? <img src={homeTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={40} className="text-gray-200 dark:text-gray-700 transition-colors" />}
              </div>
              <h3 className="font-black text-center text-sm sm:text-lg leading-tight h-10 sm:h-auto flex items-center justify-center dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{homeTeam?.name}</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Home</span>
           </div>

           <div className="flex flex-col items-center gap-4 px-2 sm:px-8 shrink-0">
              <div className="flex flex-col items-center mt-2">
                  <div className={cn(
                  "px-4 py-1 rounded-full font-black uppercase tracking-widest text-[10px] shadow-sm transition-all border-2 border-white mb-2",
                  game.status === 'live' ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white"
                )}>
                  {game.status === 'live' ? (game.currentTime || '90:00 LIVE') : game.status === 'finished' ? 'FINISHED' : new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: localStorage.getItem('pref_time_format') === '12h' })}
                </div>
                                {game.status === 'scheduled' && (
                   <div className="flex flex-col items-center mt-1">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       {new Date(game.date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                     </p>
                     {timeLeft && (
                       <div className="mt-4 flex flex-col items-center gap-1.5 pt-4 border-t border-gray-50 dark:border-gray-800 w-full">
                         <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">
                           {timeLeft === 'LIVE NOW' ? 'Match Started' : 'Live Countdown'}
                         </span>
                         <div className={cn(
                           "flex items-center gap-3 bg-gray-900 dark:bg-black px-8 py-3 rounded-[24px] shadow-2xl shadow-blue-100 dark:shadow-blue-900/40 border border-gray-800 dark:border-gray-900 ring-4 ring-white dark:ring-gray-800 transition-all",
                           timeLeft === 'LIVE NOW' && "px-4 py-1.5 ring-2"
                         )}>
                           <ClockIcon size={timeLeft === 'LIVE NOW' ? 10 : 14} className="text-blue-400 animate-pulse" />
                           <span className={cn(
                             "font-black text-white tabular-nums tracking-tighter",
                             timeLeft === 'LIVE NOW' ? "text-[10px] tracking-widest" : "text-[18px]"
                           )}>{timeLeft}</span>
                         </div>
                       </div>
                     )}
                   </div>
                )}
              </div>

              <div className="flex items-center gap-4 sm:gap-8 mt-2">
                <motion.span 
                  animate={pulse === 'home' ? { scale: [1, 1.3, 1], y: [0, -20, 0] } : {}}
                  className="text-5xl sm:text-7xl font-black tabular-nums drop-shadow-sm transition-all duration-500 dark:text-white"
                >
                  {game.homeScore}
                </motion.span>
                <span className={cn(
                  "text-2xl sm:text-3xl font-black transition-all opacity-30",
                  game.status === 'live' || localStorage.getItem('pref_theme') === 'dark' ? "text-white" : "text-gray-200"
                )}>
                  :
                </span>
                <motion.span 
                  animate={pulse === 'away' ? { scale: [1, 1.3, 1], y: [0, -20, 0] } : {}}
                  className="text-5xl sm:text-7xl font-black tabular-nums drop-shadow-sm transition-all duration-500 dark:text-white"
                >
                  {game.awayScore}
                </motion.span>
              </div>

              {venue && (
                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-wider mt-4">
                  <MapPinIcon size={12} className="text-blue-500" />
                  <span>{venue.name}</span>
                </div>
              )}
           </div>

           <div 
            className="flex flex-col items-center gap-2 sm:gap-4 flex-1 cursor-pointer group"
            onClick={() => awayTeam && onTeamClick(awayTeam.id)}
           >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 dark:bg-gray-800 rounded-2xl sm:rounded-3xl flex items-center justify-center p-3 sm:p-4 border border-gray-100 dark:border-gray-800 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                {awayTeam?.logo ? <img src={awayTeam.logo} className="w-full h-full object-contain" /> : <ShieldIcon size={40} className="text-gray-200 dark:text-gray-700 transition-colors" />}
              </div>
              <h3 className="font-black text-center text-sm sm:text-lg leading-tight h-10 sm:h-auto flex items-center justify-center dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{awayTeam?.name}</h3>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl flex items-center justify-between gap-4 transition-colors">
                <span className="text-xs font-black uppercase tracking-tighter dark:text-gray-300">Score Control</span>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateGame({ homeScore: Math.max(0, game.homeScore - 1) })}
                      className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <MinusIcon size={14} className="dark:text-white" />
                    </button>
                    <span className="w-4 text-center font-black dark:text-white">{game.homeScore}</span>
                    <button 
                      onClick={() => updateGame({ homeScore: game.homeScore + 1 })}
                      className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <PlusIcon size={14} className="dark:text-white" />
                    </button>
                   </div>
                   <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
                   <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateGame({ awayScore: Math.max(0, game.awayScore - 1) })}
                      className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <MinusIcon size={14} className="dark:text-white" />
                    </button>
                    <span className="w-4 text-center font-black dark:text-white">{game.awayScore}</span>
                    <button 
                      onClick={() => updateGame({ awayScore: game.awayScore + 1 })}
                      className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <PlusIcon size={14} className="dark:text-white" />
                    </button>
                   </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl flex items-center justify-between gap-4 transition-colors">
                <span className="text-xs font-black uppercase tracking-tighter dark:text-gray-300">Status</span>
                <div className="flex gap-1 bg-white dark:bg-gray-900 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                  {(['scheduled', 'live', 'finished'] as const).map(s => (
                    <button 
                      key={s}
                      onClick={() => updateGame({ status: s })}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all",
                        game.status === s ? "bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-blue-900/40" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {game.status === 'live' && (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-3xl flex items-center justify-between gap-4 transition-colors">
                  <span className="text-xs font-black uppercase tracking-tighter dark:text-gray-300">Match Time</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={game.currentTime || ''} 
                      onChange={(e) => updateGame({ currentTime: e.target.value })}
                      placeholder="e.g. 45', HT"
                      className="w-24 h-10 bg-white dark:bg-gray-800 rounded-xl text-center font-bold text-xs border-none shadow-sm dark:text-white transition-all outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Form Display */}
      <div className="flex justify-between items-center px-8 bg-gray-50/50 dark:bg-gray-800/30 py-3 rounded-full border border-gray-100/50 dark:border-gray-800/50">
        <div className="flex items-center gap-1">
          {homeForm.map((f, i) => (
            <div 
              key={i} 
              className={cn(
                "w-4 h-4 rounded-[4px] flex items-center justify-center text-[7px] font-black text-white",
                f === 'W' ? "bg-green-500" : f === 'L' ? "bg-red-500" : "bg-yellow-500"
              )}
            >
              {f}
            </div>
          ))}
          {homeForm.length === 0 && <span className="text-[10px] text-gray-400 font-bold">NO HISTORY</span>}
        </div>
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Recent Form</span>
        <div className="flex items-center gap-1">
          {awayForm.map((f, i) => (
            <div 
              key={i} 
              className={cn(
                "w-4 h-4 rounded-[4px] flex items-center justify-center text-[7px] font-black text-white",
                f === 'W' ? "bg-green-500" : f === 'L' ? "bg-red-500" : "bg-yellow-500"
              )}
            >
              {f}
            </div>
          ))}
          {awayForm.length === 0 && <span className="text-[10px] text-gray-400 font-bold">NO HISTORY</span>}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white dark:bg-gray-900 rounded-[40px] p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300">
        <div className="flex gap-2 sm:gap-4 mb-8 overflow-x-auto scrollbar-none pb-2">
          <button 
            onClick={() => setActiveTab('stats')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'stats' ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg dark:shadow-white/10" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <ActivityIcon size={16} />
            Stats
          </button>
          <button 
            onClick={() => setActiveTab('events')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'events' ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg dark:shadow-white/10" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <ZapIcon size={16} />
            Events
          </button>
          <button 
            onClick={() => setActiveTab('lineups')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'lineups' ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg dark:shadow-white/10" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <UsersIcon size={16} />
            Lineups
          </button>
          <button 
            onClick={() => setActiveTab('standings')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'standings' ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg dark:shadow-white/10" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <TrendingUpIcon size={16} />
            Table
          </button>
          <button 
            onClick={() => setActiveTab('h2h')}
            className={cn(
              "flex-1 min-w-[100px] py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all",
              activeTab === 'h2h' ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg dark:shadow-white/10" : "text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <HistoryIcon size={16} />
            H2H
          </button>
        </div>

        {activeTab === 'lineups' && (
          <div className="flex justify-center mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl flex gap-1 border border-gray-100 dark:border-gray-700 transition-all">
              <button 
                onClick={() => setLineupView('field')}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  lineupView === 'field' ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                Field
              </button>
              <button 
                onClick={() => setLineupView('list')}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  lineupView === 'list' ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                List
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {isAdmin && (
                <div className="space-y-4">
                  {/* Status Control */}
                  <div className="p-6 bg-gray-900 dark:bg-black rounded-[32px] border border-gray-800 dark:border-gray-900 shadow-2xl flex items-center justify-between gap-4 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-xl">
                        <ZapIcon size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Global Status</p>
                        <p className="text-xs font-bold text-white capitalize">{game.status}</p>
                      </div>
                    </div>
                    <div className="flex bg-white/5 dark:bg-white/10 p-1 rounded-2xl border border-white/10 dark:border-white/20">
                      {(['scheduled', 'live', 'finished'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => updateGame({ status: s })}
                          className={cn(
                            "px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                            game.status === s ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[32px] border border-blue-100 dark:border-blue-800 space-y-4 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900 dark:text-blue-200 transition-colors">Live Events Control</h4>
                      <div className="flex gap-2">
                        <select 
                          className="bg-white dark:bg-gray-800 dark:text-white border border-blue-100 dark:border-blue-800 rounded-lg text-[9px] font-bold px-2 py-1 outline-none max-w-[100px] transition-colors"
                          value={selectedEventPlayer || ''}
                          onChange={(e) => setSelectedEventPlayer(e.target.value)}
                        >
                          <option value="">Main Player</option>
                          <optgroup className="dark:bg-gray-900" label={homeTeam?.name || 'Home'}>
                            {players.filter(p => p.teamId === game.homeTeamId).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </optgroup>
                          <optgroup className="dark:bg-gray-900" label={awayTeam?.name || 'Away'}>
                            {players.filter(p => p.teamId === game.awayTeamId).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </optgroup>
                        </select>
                        <select 
                          className="bg-white dark:bg-gray-800 dark:text-white border border-blue-100 dark:border-blue-800 rounded-lg text-[9px] font-bold px-2 py-1 outline-none max-w-[100px] transition-colors"
                          value={selectedPlayerOut || ''}
                          onChange={(e) => setSelectedPlayerOut(e.target.value)}
                        >
                          <option value="">Sub Out (Optional)</option>
                          <optgroup className="dark:bg-gray-900" label={homeTeam?.name || 'Home'}>
                            {players.filter(p => p.teamId === game.homeTeamId).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </optgroup>
                          <optgroup className="dark:bg-gray-900" label={awayTeam?.name || 'Away'}>
                            {players.filter(p => p.teamId === game.awayTeamId).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button 
                        onClick={() => {
                          const minute = parseInt(game.currentTime || '0');
                          const teamId = selectedEventPlayer ? players.find(p => p.id === selectedEventPlayer)?.teamId || game.homeTeamId : game.homeTeamId;
                          const playerId = selectedEventPlayer || players.find(p => p.teamId === teamId)?.id || 'unknown';
                          const newEvent: MatchEvent = { id: Math.random().toString(36).substr(2,9), type: 'goal', minute, teamId, playerId };
                          updateGame({ 
                            [teamId === game.homeTeamId ? 'homeScore' : 'awayScore']: (teamId === game.homeTeamId ? game.homeScore : game.awayScore) + 1,
                            events: [...(game.events || []), newEvent]
                          });
                        }}
                        className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all group"
                      >
                        <ActivityIcon size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-[10px] font-black uppercase text-blue-900 dark:text-blue-200">Goal</span>
                      </button>
                      <button 
                        onClick={() => {
                          const minute = parseInt(game.currentTime || '0');
                          const teamId = selectedEventPlayer ? players.find(p => p.id === selectedEventPlayer)?.teamId || game.homeTeamId : game.homeTeamId;
                          const playerId = selectedEventPlayer || players.find(p => p.teamId === teamId)?.id || 'unknown';
                          const newEvent: MatchEvent = { id: Math.random().toString(36).substr(2,9), type: 'yellow', minute, teamId, playerId };
                          updateGame({ 
                            events: [...(game.events || []), newEvent]
                          });
                        }}
                        className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all"
                      >
                        <div className="w-3 h-4 bg-yellow-400 rounded-sm" />
                        <span className="text-[10px] font-black uppercase text-blue-900 dark:text-blue-200">Yellow</span>
                      </button>
                      <button 
                        onClick={() => {
                          const minute = parseInt(game.currentTime || '0');
                          const teamId = selectedEventPlayer ? players.find(p => p.id === selectedEventPlayer)?.teamId || game.homeTeamId : game.homeTeamId;
                          const playerId = selectedEventPlayer || players.find(p => p.teamId === teamId)?.id || 'unknown';
                          const newEvent: MatchEvent = { id: Math.random().toString(36).substr(2,9), type: 'red', minute, teamId, playerId };
                          updateGame({ 
                            events: [...(game.events || []), newEvent]
                          });
                        }}
                        className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all"
                      >
                        <div className="w-3 h-4 bg-red-600 rounded-sm" />
                        <span className="text-[10px] font-black uppercase text-blue-900 dark:text-blue-200">Red Card</span>
                      </button>
                      <button 
                        onClick={() => {
                          const minute = parseInt(game.currentTime || '0');
                          const teamId = selectedEventPlayer ? players.find(p => p.id === selectedEventPlayer)?.teamId || game.homeTeamId : game.homeTeamId;
                          const playerInId = selectedEventPlayer || players.find(p => p.teamId === teamId)?.id || 'unknown';
                          const playerOutId = selectedPlayerOut || 'unknown';
                          const newEvent: MatchEvent = { 
                            id: Math.random().toString(36).substr(2,9), 
                            type: 'sub', 
                            minute, 
                            teamId, 
                            playerId: playerInId,
                            playerInId,
                            playerOutId
                          };
                          updateGame({ 
                            events: [...(game.events || []), newEvent]
                          });
                        }}
                        className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all"
                      >
                        <RefreshCwIcon size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-[10px] font-black uppercase text-blue-900 dark:text-blue-200">Sub</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-2">
                <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Match Events</h4>
                <ClockIcon size={14} className="text-gray-300" />
              </div>
              
              <div className="relative space-y-4 before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-gray-100 dark:before:bg-gray-800 before:-translate-x-1/2 transition-colors">
                {sortedEvents.length > 0 ? (
                  sortedEvents.map((event, idx) => {
                    const isHome = event.teamId === game.homeTeamId;
                    const eventPlayer = players.find(p => p.id === event.playerId);
                    const assistant = event.assistantId ? players.find(p => p.id === event.assistantId) : null;
                    const pIn = event.playerInId ? players.find(p => p.id === event.playerInId) : null;
                    const pOut = event.playerOutId ? players.find(p => p.id === event.playerOutId) : null;

                    return (
                      <div key={event.id || idx} className={cn(
                        "flex items-center gap-4 relative z-10 select-none cursor-pointer group/event",
                        isHome ? "flex-row" : "flex-row-reverse"
                      )} onClick={() => eventPlayer && onPlayerClick?.(eventPlayer.id)}>
                        <div className={cn("flex-1", isHome ? "text-right" : "text-left")}>
                          <p className="font-bold text-sm text-gray-900 dark:text-white group-hover/event:text-blue-600 dark:group-hover/event:text-blue-400 transition-colors uppercase tracking-tight">{eventPlayer?.name || pIn?.name || 'Unknown'}</p>
                          {event.type === 'goal' && assistant && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium transition-colors">assist by {assistant.name}</p>
                          )}
                          {event.type === 'sub' && pOut && (
                            <p className="text-[10px] text-red-400 dark:text-red-500 font-medium tracking-tight transition-colors">out: {pOut.name}</p>
                          )}
                        </div>
                        
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-50 dark:border-gray-800 flex items-center justify-center shadow-lg transition-colors">
                          <EventIcon type={event.type} />
                        </div>

                        <div className={cn("flex-1 flex items-center gap-2", isHome ? "flex-row" : "flex-row-reverse")}>
                           <span className="font-black tabular-nums text-blue-600 dark:text-blue-400 text-sm transition-colors">{event.minute}'</span>
                           <div className="flex-1" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center text-gray-400 dark:text-gray-600 relative z-10 bg-white dark:bg-gray-900 transition-colors">
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
              {lineupView === 'field' ? (
                <StadiumLineup 
                  game={game} 
                  homeTeam={homeTeam} 
                  awayTeam={awayTeam} 
                  players={players}
                  onPlayerClick={onPlayerClick}
                />
              ) : (
                <div className="space-y-8">
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
                            return <LineupItem key={pid} player={p} onClick={() => onPlayerClick?.(pid)} />;
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
                            return <LineupItem key={pid} player={p} isRight onClick={() => onPlayerClick?.(pid)} />;
                          })
                        ) : (
                          <p className="text-[10px] text-gray-400 italic text-right px-2">Lineup not announced</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
              {game.status === 'scheduled' && !game.stats ? (
                <div className="py-20 text-center text-gray-400">
                  <ActivityIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-bold">Match stats will appear once the game kicks off.</p>
                </div>
              ) : (
                <>
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
                </>
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
              <div className="flex items-center justify-between px-2 mb-2">
                <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Head to Head History</h4>
                <HistoryIcon size={14} className="text-gray-300 dark:text-gray-600" />
              </div>
              {h2hGames.length > 0 ? (
                <div className="grid gap-3">
                  {h2hGames.map(g => {
                    const isHomeOutcome = g.homeTeamId === game.homeTeamId;
                    return (
                      <div 
                        key={g.id} 
                        onClick={() => onGameClick(g.id)}
                        className="bg-white dark:bg-gray-900 p-4 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md dark:hover:shadow-black/20 transition-all cursor-pointer flex items-center justify-between group"
                      >
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-gray-400 w-12">{new Date(g.date).getFullYear()}</span>
                            <div className="flex items-center gap-3">
                               <div className="flex flex-col items-end">
                                 <span className={cn("text-[11px] font-bold", isHomeOutcome ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400")}>
                                   {teams.find(t => t.id === g.homeTeamId)?.name}
                                 </span>
                               </div>
                               <div className="bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-xl border border-gray-100 dark:border-gray-700 font-black text-xs tabular-nums dark:text-white">
                                 {g.homeScore} - {g.awayScore}
                               </div>
                               <div className="flex flex-col items-start">
                                 <span className={cn("text-[11px] font-bold", !isHomeOutcome ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400")}>
                                   {teams.find(t => t.id === g.awayTeamId)?.name}
                                 </span>
                               </div>
                            </div>
                         </div>
                         <ChevronLeftIcon size={14} className="text-gray-300 rotate-180 group-hover:text-blue-600 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400 dark:text-gray-600">
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
    case 'penalty':
      return <div className="flex items-center justify-center p-1 bg-yellow-400 rounded-lg shadow-sm border border-yellow-300">
        <ZapIcon className="text-white" size={14} />
      </div>;
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

function LineupItem({ player, isRight, ...props }: LineupItemProps & { key?: any; onClick?: () => void }) {
  if (!player) return null;
  return (
    <div 
      {...props}
      className={cn(
      "flex items-center gap-3 p-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 cursor-pointer hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group",
      isRight ? "flex-row-reverse" : "flex-row"
    )}>
      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center font-black text-gray-400 text-[10px] shadow-sm transition-colors">
        {player.number}
      </div>
      <div className={cn("flex-1 overflow-hidden", isRight ? "text-right" : "text-left")}>
        <p className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{player.name}</p>
        <p className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-tighter">{player.position}</p>
      </div>
    </div>
  );
}

interface StadiumLineupProps {
  game: Game;
  homeTeam?: Team;
  awayTeam?: Team;
  players: Player[];
  onPlayerClick?: (id: string) => void;
}

const FORMATION_HOME_433 = [
  { x: 50, y: 92 }, // GKP
  { x: 15, y: 78 }, { x: 38, y: 82 }, { x: 62, y: 82 }, { x: 85, y: 78 }, // DEF
  { x: 25, y: 65 }, { x: 50, y: 68 }, { x: 75, y: 65 }, // MID
  { x: 20, y: 55 }, { x: 50, y: 52 }, { x: 80, y: 55 }, // FWD
];

const FORMATION_AWAY_433 = [
  { x: 50, y: 8 }, // GKP
  { x: 15, y: 22 }, { x: 38, y: 18 }, { x: 62, y: 18 }, { x: 85, y: 22 }, // DEF
  { x: 25, y: 35 }, { x: 50, y: 32 }, { x: 75, y: 35 }, // MID
  { x: 20, y: 45 }, { x: 50, y: 48 }, { x: 80, y: 45 }, // FWD
];

function StadiumLineup({ game, homeTeam, awayTeam, players, onPlayerClick }: StadiumLineupProps) {
  if (!game.lineups || (!game.lineups.home.length && !game.lineups.away.length)) {
    return (
      <div className="py-20 text-center text-gray-400">
        <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
        <p className="font-bold">Lineups haven't been announced for this match.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[2/3] bg-emerald-600 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white shadow-emerald-900/20">
      {/* Field Markings */}
      <div className="absolute inset-4 border border-white/50 rounded-[32px] pointer-events-none">
        {/* Halfway Line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white/50 rounded-full -translate-x-1/2 -translate-y-1/2" />
        
        {/* Penalty Areas */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[15%] border-b border-x border-white/50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-[5%] border-b border-x border-white/50" />
        
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[15%] border-t border-x border-white/50" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-[5%] border-t border-x border-white/50" />
      </div>

      {/* Players */}
      {game.lineups.home.slice(0, 11).map((pid, idx) => {
        const p = players.find(player => player.id === pid);
        const pos = FORMATION_HOME_433[idx] || { x: 50, y: 50 };
        return (
          <div 
            key={pid} 
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer group"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onClick={() => onPlayerClick?.(pid)}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black group-hover:scale-125 group-hover:bg-blue-700 transition-all">
                {p?.number || idx + 1}
              </div>
              <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10 group-hover:bg-black/60 transition-colors">
                <span className="text-[7px] font-black text-white whitespace-nowrap uppercase tracking-tighter">{p?.name || 'Loading...'}</span>
              </div>
            </div>
          </div>
        );
      })}

      {game.lineups.away.slice(0, 11).map((pid, idx) => {
        const p = players.find(player => player.id === pid);
        const pos = FORMATION_AWAY_433[idx] || { x: 50, y: 50 };
        return (
          <div 
            key={pid} 
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer group px-2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onClick={() => onPlayerClick?.(pid)}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10 group-hover:bg-black/60 transition-colors mb-1">
                <span className="text-[7px] font-black text-white whitespace-nowrap uppercase tracking-tighter">{p?.name || 'Loading...'}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-900 shadow-lg flex items-center justify-center text-gray-900 text-[10px] font-black group-hover:scale-125 group-hover:bg-gray-50 transition-all">
                {p?.number || idx + 1}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatProgress({ label, homeValue, awayValue, isPercent }: { label: string; homeValue: number; awayValue: number; isPercent?: boolean }) {
  const total = homeValue + awayValue || 1;
  const homePercent = (homeValue / total) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="font-black text-base sm:text-lg dark:text-white">{homeValue}{isPercent && '%'}</span>
        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        <span className="font-black text-base sm:text-lg text-right dark:text-white">{awayValue}{isPercent && '%'}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full flex gap-1 overflow-hidden">
        <div className="h-full bg-blue-900 dark:bg-blue-700 transition-all duration-1000" style={{ width: `${homePercent}%` }} />
        <div className="h-full bg-gray-900 dark:bg-blue-400 transition-all duration-1000 flex-1" />
      </div>
    </div>
  );
}
