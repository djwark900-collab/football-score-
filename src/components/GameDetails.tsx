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
  RefreshCw as RefreshCwIcon,
  Star as StarIcon,
  Camera as CameraIcon,
  Mic2 as MicIcon,
  Lock as LockIcon,
  X as XIcon,
  Trophy as TrophyIcon,
  User as UserIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, updateDoc, setDoc, collection, onSnapshot, query, where, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
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

type Tab = 'details' | 'lineups' | 'stats' | 'standings';

export function GameDetails({ 
  game, 
  teams = [], 
  games = [], 
  leagues = [], 
  players = [], 
  venues = [], 
  onBack, 
  onTeamClick, 
  onLeagueClick, 
  onGameClick, 
  onPlayerClick, 
  isAdmin, 
  isFollowing, 
  onToggleFollow 
}: GameDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [lineupView, setLineupView] = useState<'list' | 'field'>('field');
  const homeTeam = teams.find(t => t.id === game.homeTeamId);
  const awayTeam = teams.find(t => t.id === game.awayTeamId);
  const venue = venues.find(v => v.id === game.venueId);
  const [pulse, setPulse] = useState<'home' | 'away' | null>(null);
  const [prevScores, setPrevScores] = useState({ h: game.homeScore, a: game.awayScore });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ d: string; h: string; m: string; s: string } | string | null>(null);
  const [selectedEventPlayer, setSelectedEventPlayer] = useState<string | null>(null);
  const [selectedPlayerOut, setSelectedPlayerOut] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<'home' | 'draw' | 'away' | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null);
  const [fullScreenStadium, setFullScreenStadium] = useState(false);
  const [isSavingPrediction, setIsSavingPrediction] = useState(false);

  useEffect(() => {
    if (!auth.currentUser || !game.id) return;
    
    // Check if user already predicted
    const path = `users/${auth.currentUser.uid}/predictions`;
    const q = query(collection(db, path), where('gameId', '==', game.id));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setPrediction(data.prediction);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, [game.id]);

  useEffect(() => {
    if (!auth.currentUser || !game.id || game.status !== 'finished' || !prediction) return;
    
    const awardResultXP = async () => {
      const result = game.homeScore > game.awayScore ? 'home' : (game.homeScore < game.awayScore ? 'away' : 'draw');
      
      const userId = auth.currentUser!.uid;
      const predictionId = `${game.id}_${userId}`;
      const path = `users/${userId}/predictions`;
      const predRef = doc(db, path, predictionId);
      
      try {
        const isCorrect = result === prediction;
        // Award XP based on correct/incorrect
        const xpAmount = isCorrect ? 50 : 25; 

        // Use a flag to ensure we only award once
        await updateDoc(predRef, { settled: true });
        
        // Award XP
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          xp: increment(xpAmount),
          correctPredictions: increment(isCorrect ? 1 : 0)
        });
      } catch (e) {
        // If it fails with "no such document" or "already settled" logic (though updateDoc fails if not exists)
        // We just ignore if already settled
      }
    };

    awardResultXP();
  }, [game.status, prediction, game.id]);

  const handlePredict = async (opt: 'home' | 'draw' | 'away') => {
    if (!auth.currentUser) {
      alert("Please sign in to make a prediction");
      return;
    }

    setPrediction(opt);
    setIsSavingPrediction(true);
    const userId = auth.currentUser.uid;
    const path = `users/${userId}/predictions`;
    const predictionId = `${game.id}_${userId}`; // One prediction per user per game

    try {
      await setDoc(doc(db, path, predictionId), {
        gameId: game.id,
        userId: userId,
        prediction: opt,
        timestamp: new Date().toISOString()
      });

      // Award XP only for the first prediction on this game
      if (!prediction) {
        const userDocRef = doc(db, 'users', userId);
        const earnedXP = Math.floor(Math.random() * 20) + 10;
        await setDoc(userDocRef, {
          xp: increment(earnedXP),
          displayName: auth.currentUser?.displayName || 'Anonymous',
          photoURL: auth.currentUser?.photoURL || '',
          level: increment(0),
          lastActivity: new Date().toISOString()
        }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setIsSavingPrediction(false);
    }
  };

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

      return {
        d: days < 10 ? "0" + days : days.toString(),
        h: hours < 10 ? "0" + hours : hours.toString(),
        m: minutes < 10 ? "0" + minutes : minutes.toString(),
        s: seconds < 10 ? "0" + seconds : seconds.toString()
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [game.date, game.status]);

  const league = leagues.find(l => l.id === game.leagueId);
  const leagueTeams = teams.filter(t => t.leagueId === game.leagueId || t.leagueId2 === game.leagueId);
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-white dark:bg-gray-950 overflow-y-auto scrollbar-none"
    >
      {/* Immersive Header - Now Compact */}
      <div className="relative bg-gray-900 overflow-hidden pb-8">
        {/* Dynamic Background Blur */}
        <div className="absolute inset-0 z-0">
          {league?.logo && (
            <img 
              src={league.logo} 
              className="w-full h-full object-cover opacity-10 blur-3xl scale-150 grayscale"
              alt=""
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-gray-950" />
        </div>

        {/* Top Controls */}
        <div className="relative z-30 flex justify-between items-center px-6 py-6">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/20 transition-all active:scale-95"
          >
            <ChevronLeftIcon size={20} className="text-white" />
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              {[league, leagues.find(l => l.id === game.leagueId2)].filter(Boolean).map((l, idx) => (
                <div key={l?.id || idx} className="contents">
                  {idx > 0 && <span className="text-white/20 font-black">•</span>}
                  <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] hover:text-white transition-colors cursor-pointer" onClick={() => l && onLeagueClick?.(l.id)}>
                    {l?.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-8 h-0.5 bg-blue-500 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onToggleFollow}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95",
                isFollowing 
                  ? "bg-blue-600 border-blue-500 text-white" 
                  : "bg-white/10 backdrop-blur-xl border-white/10 text-white"
              )}
            >
              <BellIcon size={18} className={isFollowing ? "fill-white" : ""} />
            </button>
            <button className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 text-white active:scale-95">
              <Share2Icon size={18} />
            </button>
          </div>
        </div>

        {/* Scoreboard Content - Compact */}
        <div className="relative z-20 flex flex-col items-center justify-center px-6 pt-4">
          <div className="flex items-center justify-between w-full max-w-lg gap-6">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center p-3 border-2 border-white/10 cursor-pointer"
                onClick={() => homeTeam && onTeamClick(homeTeam.id)}
              >
                {homeTeam?.logo ? (
                  <img src={homeTeam.logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <ShieldIcon size={32} className="text-gray-200" />
                )}
              </motion.div>
              <h2 className="text-sm font-black text-white text-center leading-tight tracking-tight h-10 line-clamp-2">
                {homeTeam?.name}
              </h2>
            </div>

            {/* Score / Time */}
            <div className="flex flex-col items-center gap-3">
              {game.status === 'live' && (
                <div className="bg-rose-600 px-3 py-0.5 rounded-full animate-pulse shadow-lg shadow-rose-900/40">
                  <span className="text-[9px] font-black text-white tabular-nums tracking-widest uppercase">
                    {game.currentTime || '00:00'}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-xl">
                  {game.status === 'scheduled' ? '-' : game.homeScore}
                </span>
                <span className="text-2xl font-black text-white/20">:</span>
                <span className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-xl">
                  {game.status === 'scheduled' ? '-' : game.awayScore}
                </span>
              </div>

              {game.status === 'scheduled' && (
                <div className="flex flex-col items-center">
                  <div className="bg-blue-600/20 backdrop-blur-md px-4 py-1 rounded-xl border border-blue-500/30">
                    <span className="text-sm font-black text-blue-400 tabular-nums">
                      {new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-1.5">Kick Off</span>
                </div>
              )}

              {game.status === 'finished' && (
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] bg-white/5 px-3 py-0.5 rounded-full border border-white/5">
                  Full Time
                </span>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center p-3 border-2 border-white/10 cursor-pointer"
                onClick={() => awayTeam && onTeamClick(awayTeam.id)}
              >
                {awayTeam?.logo ? (
                  <img src={awayTeam.logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <ShieldIcon size={32} className="text-gray-200" />
                )}
              </motion.div>
              <h2 className="text-sm font-black text-white text-center leading-tight tracking-tight h-10 line-clamp-2">
                {awayTeam?.name}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu Overlay */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 flex justify-center px-4 overflow-x-auto scrollbar-none">
        <div className="flex w-full max-w-2xl px-2">
          {(['details', 'lineups', 'stats', 'standings'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-5 px-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative shrink-0",
                activeTab === tab ? "text-blue-600" : "text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"
                />
              )}
            </button>
          ))}
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

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Match Events Card */}
              <div className="bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800/50 flex justify-between items-center">
                  <h4 className="text-[13px] font-bold text-gray-900 dark:text-white">Match Events</h4>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tap for details</span>
                </div>
                
                <div className="flex border-b border-gray-50 dark:border-gray-800/50">
                  <button className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Top</button>
                  <button className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-blue-600 border-b-2 border-blue-600">All</button>
                </div>

                <div className="p-6 relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-800 -translate-x-1/2" />
                  
                  <div className="space-y-8 relative z-10">
                    {sortedEvents.length > 0 ? (
                      sortedEvents.map((event, idx) => {
                        const isHome = event.teamId === game.homeTeamId;
                        const eventPlayer = players.find(p => p.id === event.playerId);
                        const pIn = event.playerInId ? players.find(p => p.id === event.playerInId) : null;
                        const pOut = event.playerOutId ? players.find(p => p.id === event.playerOutId) : null;

                        return (
                          <motion.div 
                            key={event.id || idx} 
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedEvent(event)}
                            className={cn(
                              "flex items-center gap-4 cursor-pointer group",
                              isHome ? "flex-row" : "flex-row-reverse"
                            )}
                          >
                            <div className={cn("flex-1", isHome ? "text-right" : "text-left")}>
                              <div className="flex flex-col group-hover:translate-x-1 transition-transform">
                                {event.type === 'sub' ? (
                                  <>
                                    <div className="flex items-center gap-1 text-[13px] font-bold text-green-600" style={{ justifyContent: isHome ? 'flex-end' : 'flex-start' }}>
                                      {pIn?.name} <TrendingUpIcon size={12} className="rotate-90" />
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-rose-500" style={{ justifyContent: isHome ? 'flex-end' : 'flex-start' }}>
                                      {pOut?.name} <TrendingUpIcon size={12} className="-rotate-90" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2" style={{ justifyContent: isHome ? 'flex-end' : 'flex-start' }}>
                                    <span className="text-[13px] font-bold text-gray-900 dark:text-white group-hover:text-blue-600">{eventPlayer?.name}</span>
                                    <div className={cn(
                                      "w-4 h-4 flex items-center justify-center",
                                      event.type === 'yellow' && "bg-yellow-400 rounded-sm",
                                      event.type === 'red' && "bg-rose-600 rounded-sm",
                                      event.type === 'goal' && "text-blue-500"
                                    )}>
                                      {event.type === 'goal' && <ActivityIcon size={14} />}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="w-10 flex flex-col items-center shrink-0">
                               <div className="bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px] font-black tabular-nums shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 transition-all">
                                {event.minute}'
                               </div>
                            </div>

                            <div className="flex-1" />
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="py-20 text-center text-gray-400 italic">
                        No events recorded yet
                      </div>
                    )}
                  </div>
                  
                  {/* Final Whistle Icon At Bottom */}
                  <div className="mt-8 flex justify-center relative z-20">
                     <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center shadow-md">
                        <ClockIcon size={14} className="text-gray-400" />
                     </div>
                  </div>
                </div>
              </div>              {/* Make Your Prediction Card */}
              {(game.status === 'scheduled' || game.status === 'finished') && (
                <div className={cn(
                  "p-8 rounded-[40px] text-white overflow-hidden relative shadow-3d-xl transition-all duration-500",
                  game.status === 'finished' ? "bg-gradient-to-br from-blue-900 to-gray-950" : "bg-[#1a1a1a]"
                )}>
                   <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                      <TrophyIcon size={120} />
                   </div>
                   
                   <div className="relative z-10 space-y-6">
                      <div>
                         <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">
                           {game.status === 'finished' ? 'Prediction Result' : 'Match Forecast'}
                         </span>
                         <h3 className="text-2xl font-black italic tracking-tighter mt-1">
                           {game.status === 'finished' ? 'Final Outcome' : 'Make your prediction'}
                         </h3>
                         <p className="text-white/40 text-xs font-medium mt-2">
                           {game.status === 'finished' 
                             ? 'The match has concluded. Check your prediction performance below.' 
                             : 'Who will win this encounter? Choose result to earn points.'}
                         </p>
                      </div>

                       <div className="grid grid-cols-3 gap-3">
                         {[
                           { id: 'home', label: 'Home', icon: homeTeam?.logo },
                           { id: 'draw', label: 'Draw', icon: null },
                           { id: 'away', label: 'Away', icon: awayTeam?.logo }
                         ].map((opt) => {
                           const isCorrect = game.status === 'finished' && 
                             ((opt.id === 'home' && game.homeScore > game.awayScore) ||
                              (opt.id === 'away' && game.awayScore > game.homeScore) ||
                              (opt.id === 'draw' && game.homeScore === game.awayScore));
                           
                           return (
                             <button 
                               key={opt.id}
                               disabled={isSavingPrediction || game.status === 'finished'}
                               onClick={() => handlePredict(opt.id as any)}
                               className={cn(
                                 "p-4 rounded-3xl flex flex-col items-center gap-3 transition-all border-2",
                                 prediction === opt.id 
                                   ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40 scale-[1.02]" 
                                   : "bg-white/5 border-transparent hover:bg-white/10",
                                 isSavingPrediction && "opacity-50 cursor-wait",
                                 game.status === 'finished' && isCorrect && "ring-4 ring-green-500/50 border-green-500 bg-green-900/20",
                                 game.status === 'finished' && prediction === opt.id && !isCorrect && "ring-4 ring-rose-500/50 border-rose-500 opacity-50"
                               )}
                             >
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center relative">
                                   {opt.icon ? (
                                     <img src={opt.icon} className="w-6 h-6 object-contain" />
                                   ) : (
                                     <MinusIcon className="text-white/40" />
                                   )}
                                   {game.status === 'finished' && isCorrect && (
                                     <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center shadow-lg">
                                       <ZapIcon size={12} className="text-white" />
                                     </div>
                                   )}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                             </button>
                           );
                         })}
                      </div>

                      {prediction && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between"
                        >
                           <div className="flex items-center gap-3 text-xs font-bold text-white/50 uppercase tracking-widest">
                              {isSavingPrediction ? (
                                 <RefreshCwIcon className="animate-spin text-blue-400" size={14} />
                              ) : (
                                 <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                              )}
                              {isSavingPrediction ? 'Saving...' : 'FINISHED PREDICTION RECORDED'}
                           </div>
                           <div className="flex items-center gap-2">
                             <div className="text-sm font-black text-blue-400">
                                {game.status === 'finished' && 
                                  ((prediction === 'home' && game.homeScore > game.awayScore) ||
                                   (prediction === 'away' && game.awayScore > game.homeScore) ||
                                   (prediction === 'draw' && game.homeScore === game.awayScore))
                                   ? '+50 Bonus XP'
                                   : '+25 XP'}
                             </div>
                             <StarIcon size={14} className="text-yellow-400 fill-yellow-400" />
                           </div>
                        </motion.div>
                      )}
                   </div>
                </div>
              )}

              {/* Event Details Modal */}
              <AnimatePresence>
                {selectedEvent && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedEvent(null)}
                      className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 40 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 40 }}
                      className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[48px] shadow-3d-xl border border-white/10 overflow-hidden"
                    >
                       <div className="bg-blue-600 p-8 text-center text-white space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Match Incident</span>
                          <h3 className="text-3xl font-black italic tracking-tighter uppercase">{selectedEvent.type}</h3>
                          <div className="flex justify-center mt-4">
                             <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
                                <ClockIcon size={16} />
                                <span className="font-black tabular-nums">{selectedEvent.minute}' Minute</span>
                             </div>
                          </div>
                       </div>

                       <div className="p-10 space-y-8">
                          <div className="flex flex-col items-center gap-4">
                             <div className="w-24 h-24 rounded-[32px] bg-gray-50 dark:bg-gray-800 p-1 border border-gray-100 dark:border-gray-700 shadow-3d-lg overflow-hidden">
                                {players.find(p => p.id === (selectedEvent.type === 'sub' ? selectedEvent.playerInId : selectedEvent.playerId))?.imageUrl ? (
                                  <img 
                                    src={players.find(p => p.id === (selectedEvent.type === 'sub' ? selectedEvent.playerInId : selectedEvent.playerId))?.imageUrl} 
                                    className="w-full h-full object-cover rounded-[28px]" 
                                    alt="" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white rounded-[28px]">
                                    <UserIcon size={40} />
                                  </div>
                                )}
                             </div>
                             <div className="text-center">
                                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                  {players.find(p => p.id === (selectedEvent.type === 'sub' ? selectedEvent.playerInId : selectedEvent.playerId))?.name}
                                </p>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">
                                  {teams.find(t => t.id === selectedEvent.teamId)?.name}
                                </p>
                             </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</span>
                                <span className="text-xs font-black uppercase text-gray-900 dark:text-white">{selectedEvent.type}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score After</span>
                                <span className="text-xs font-black uppercase text-gray-900 dark:text-white">{game.homeScore} - {game.awayScore}</span>
                             </div>
                          </div>

                          <button 
                            onClick={() => setSelectedEvent(null)}
                            className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-3d-lg hover:bg-black transition-all"
                          >
                            Dismiss Report
                          </button>
                       </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* To Score at Any Time Poll - UI Soml Refinement */}
              <div className="bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden shadow-3d-sm border border-gray-100 dark:border-gray-800 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">To Score at Any Time</h4>
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Yes Option */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Yes</span>
                        <div className="flex items-center gap-2">
                           <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                              {players[0]?.imageUrl ? <img src={players[0].imageUrl} className="w-full h-full object-cover" /> : <UsersIcon size={16} className="text-gray-400" />}
                           </div>
                           <div className="min-w-0">
                              <p className="text-[13px] font-black text-gray-900 dark:text-white truncate">{players[0]?.name || 'Player Name'}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1 rounded uppercase tracking-tighter">1.60</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Odds</span>
                              </div>
                           </div>
                        </div>
                      </div>
                      <span className="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">88<span className="text-sm opacity-30">%</span></span>
                    </div>
                    <div className="relative h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '88%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute inset-y-0 left-0 bg-blue-600 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="w-px h-16 bg-gray-100 dark:bg-gray-800 shrink-0" />

                  {/* No Option */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-end justify-between flex-row-reverse">
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">No</span>
                        <div className="flex items-center gap-2 flex-row-reverse">
                           <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                              {players[1]?.imageUrl ? <img src={players[1].imageUrl} className="w-full h-full object-cover" /> : <UsersIcon size={16} className="text-gray-400" />}
                           </div>
                           <div className="min-w-0 text-right">
                              <p className="text-[13px] font-black text-gray-900 dark:text-white truncate">{players[1]?.name || 'Player Name'}</p>
                              <div className="flex items-center gap-1 justify-end">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Odds</span>
                                <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-1 rounded uppercase tracking-tighter">5.40</span>
                              </div>
                           </div>
                        </div>
                      </div>
                      <span className="text-3xl font-black text-gray-400 tabular-nums tracking-tighter">12<span className="text-sm opacity-30">%</span></span>
                    </div>
                    <div className="relative h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '12%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute inset-y-0 right-0 bg-gray-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
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
              <div className="flex justify-center mb-6">
                <div className="bg-white dark:bg-gray-900 p-1.5 rounded-full border border-gray-100 dark:border-gray-800 flex gap-1 shadow-sm transition-all duration-300">
                  <button 
                    onClick={() => setLineupView('field')}
                    className={cn(
                      "px-8 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all",
                      lineupView === 'field' ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    )}
                  >
                    Field
                  </button>
                  <button 
                    onClick={() => setLineupView('list')}
                    className={cn(
                      "px-8 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all",
                      lineupView === 'list' ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    )}
                  >
                    List
                  </button>
                </div>
              </div>
              {lineupView === 'field' ? (
                <div className="relative group">
                   <StadiumLineup 
                    game={game} 
                    homeTeam={homeTeam} 
                    awayTeam={awayTeam} 
                    players={players}
                    onPlayerClick={onPlayerClick}
                  />
                  <button 
                    onClick={() => setFullScreenStadium(true)}
                    className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/30"
                  >
                    <PlusIcon size={20} />
                  </button>

                  <AnimatePresence>
                    {fullScreenStadium && (
                      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950 p-6 sm:p-12 overflow-hidden">
                         <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative w-full h-full max-w-4xl flex flex-col gap-6"
                         >
                            <div className="flex justify-between items-center text-white">
                               <div>
                                  <h3 className="text-2xl font-black italic tracking-tighter uppercase">Tactical View</h3>
                                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{homeTeam?.name} vs {awayTeam?.name}</p>
                               </div>
                               <button 
                                onClick={() => setFullScreenStadium(false)}
                                className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 transition-all"
                               >
                                  <XIcon size={24} />
                               </button>
                            </div>
                            <div className="flex-1 min-h-0 bg-white/10 rounded-[48px] p-2 border border-white/10 shadow-2xl relative">
                               <StadiumLineup 
                                  game={game} 
                                  homeTeam={homeTeam} 
                                  awayTeam={awayTeam} 
                                  players={players}
                                  onPlayerClick={onPlayerClick}
                                  fullScreen
                               />
                            </div>
                         </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
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
                leagues={leagues.filter(l => l.id === game.leagueId)}
                teams={leagueTeams}
                games={leagueGames}
                onTeamClick={onTeamClick}
                onGameClick={onGameClick}
              />
            </motion.div>
          )}


          {isAdmin && activeTab === 'details' && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-[#0A0A0A] p-6 rounded-[32px] border border-white/5 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LockIcon className="text-blue-500" size={16} />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Live Admin Controls</h4>
                </div>
                {loading && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                   <p className="text-[10px] font-bold text-white/40 uppercase mb-3">Score & Status</p>
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateGame({ homeScore: Math.max(0, game.homeScore - 1) })} className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10">-</button>
                        <span className="font-bold text-white">{game.homeScore}</span>
                        <button onClick={() => updateGame({ homeScore: game.homeScore + 1 })} className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10">+</button>
                      </div>
                      <span className="text-white/20">VS</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateGame({ awayScore: Math.max(0, game.awayScore - 1) })} className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10">-</button>
                        <span className="font-bold text-white">{game.awayScore}</span>
                        <button onClick={() => updateGame({ awayScore: game.awayScore + 1 })} className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10">+</button>
                      </div>
                   </div>
                   <div className="flex bg-black p-1 rounded-xl border border-white/5">
                      {(['scheduled', 'live', 'finished'] as const).map(s => (
                        <button 
                          key={s} 
                          onClick={() => updateGame({ status: s })} 
                          className={cn("flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all", game.status === s ? "bg-blue-600 text-white" : "text-white/30 hover:text-white/50")}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                   <p className="text-[10px] font-bold text-white/40 uppercase mb-3">Event Engine</p>
                   <div className="grid grid-cols-2 gap-2">
                      <select 
                        className="bg-black text-white border border-white/10 rounded-lg p-2 text-[10px] outline-none col-span-2 mb-1"
                        value={selectedEventPlayer || ''}
                        onChange={(e) => setSelectedEventPlayer(e.target.value)}
                      >
                        <option value="">Select Player</option>
                        {players.filter(p => p.teamId === game.homeTeamId || p.teamId === game.awayTeamId).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          const teamId = players.find(p => p.id === selectedEventPlayer)?.teamId || game.homeTeamId;
                          const newEvent: MatchEvent = { id: Math.random().toString(36).substr(2,9), type: 'goal', minute: parseInt(game.currentTime || '0'), teamId, playerId: selectedEventPlayer || 'unknown' };
                          updateGame({ 
                            [teamId === game.homeTeamId ? 'homeScore' : 'awayScore']: (teamId === game.homeTeamId ? game.homeScore : game.awayScore) + 1,
                            events: [...(game.events || []), newEvent]
                          });
                        }}
                        className="bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg h-9 hover:bg-blue-700 transition-all col-span-2"
                      >
                        Add Goal
                      </button>
                      <button 
                        onClick={() => {
                          const teamId = players.find(p => p.id === selectedEventPlayer)?.teamId || game.homeTeamId;
                          const newEvent: MatchEvent = { id: Math.random().toString(36).substr(2,9), type: 'yellow', minute: parseInt(game.currentTime || '0'), teamId, playerId: selectedEventPlayer || 'unknown' };
                          const side = teamId === game.homeTeamId ? 'home' : 'away';
                          updateGame({ 
                            events: [...(game.events || []), newEvent],
                            stats: {
                              ...(game.stats || {
                                possession: { home: 50, away: 50 },
                                shots: { home: 0, away: 0 },
                                shotsOnGoal: { home: 0, away: 0 },
                                corners: { home: 0, away: 0 },
                                yellowCards: { home: 0, away: 0 },
                                crosses: { home: 0, away: 0 },
                                goalKicks: { home: 0, away: 0 },
                              }),
                              yellowCards: {
                                ...(game.stats?.yellowCards || { home: 0, away: 0 }),
                                [side]: (game.stats?.yellowCards?.[side] || 0) + 1
                              }
                            }
                          });
                        }}
                        className="bg-yellow-500 text-black text-[10px] font-black uppercase rounded-lg h-9 hover:bg-yellow-600 transition-all"
                      >
                        Add Yellow
                      </button>
                      <button 
                        onClick={() => {
                          const teamId = players.find(p => p.id === selectedEventPlayer)?.teamId || game.homeTeamId;
                          const newEvent: MatchEvent = { id: Math.random().toString(36).substr(2,9), type: 'red', minute: parseInt(game.currentTime || '0'), teamId, playerId: selectedEventPlayer || 'unknown' };
                          updateGame({ 
                            events: [...(game.events || []), newEvent]
                          });
                        }}
                        className="bg-red-600 text-white text-[10px] font-black uppercase rounded-lg h-9 hover:bg-red-700 transition-all"
                      >
                        Add Red
                      </button>
                   </div>
                </div>
              </div>
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
  fullScreen?: boolean;
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

function StadiumLineup({ game, homeTeam, awayTeam, players, onPlayerClick, fullScreen }: StadiumLineupProps) {
  if (!game.lineups || (!game.lineups.home.length && !game.lineups.away.length)) {
    return (
      <div className="py-20 text-center text-gray-400">
        <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
        <p className="font-bold">Lineups haven't been announced for this match.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative w-full bg-emerald-600 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white mb-2",
      fullScreen ? "h-full" : "aspect-[2/3]"
    )}>
      {/* Field Markings */}
      <div className="absolute inset-4 border border-white/50 rounded-[32px] pointer-events-none">
        {/* Halfway Line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2" />
        {/* Penalty Areas */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[15%] border-b border-x border-white/50" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[15%] border-t border-x border-white/50" />
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
              <div className={cn(
                "rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-black group-hover:scale-125 group-hover:bg-blue-700 transition-all",
                fullScreen ? "w-12 h-12 text-sm" : "w-8 h-8 text-[10px]"
              )}>
                {p?.number || idx + 1}
              </div>
              <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10 group-hover:bg-black/60 transition-colors">
                <span className={cn("font-black text-white whitespace-nowrap uppercase tracking-tighter", fullScreen ? "text-[10px]" : "text-[7px]")}>
                  {p?.name || 'Loading...'}
                </span>
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
                <span className={cn("font-black text-white whitespace-nowrap uppercase tracking-tighter", fullScreen ? "text-[10px]" : "text-[7px]")}>
                  {p?.name || 'Loading...'}
                </span>
              </div>
              <div className={cn(
                "rounded-full bg-white border-2 border-gray-900 shadow-lg flex items-center justify-center text-gray-900 font-black group-hover:scale-125 group-hover:bg-gray-50 transition-all",
                fullScreen ? "w-12 h-12 text-sm" : "w-8 h-8 text-[10px]"
              )}>
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
