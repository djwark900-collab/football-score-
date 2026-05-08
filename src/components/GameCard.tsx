import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Game, Team, League } from '../types';
import { Shield as ShieldIcon, Bell as BellIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface GameCardProps {
  key?: string | number;
  game: Game;
  teams: Team[];
  leagues: League[];
  onClick: () => void;
  onTeamClick?: (teamId: string) => void;
  isLive?: boolean;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
}

export function GameCard({ game, teams, leagues, onClick, onTeamClick, isLive, isFollowing, onToggleFollow }: GameCardProps) {
  const homeTeam = teams.find(t => t.id === game.homeTeamId);
  const awayTeam = teams.find(t => t.id === game.awayTeamId);
  const league = leagues.find(l => l.id === game.leagueId);
  const [pulse, setPulse] = useState<'home' | 'away' | null>(null);

  const homeRedCards = (game.events || []).filter(e => e.type === 'red' && e.teamId === game.homeTeamId).length;
  const awayRedCards = (game.events || []).filter(e => e.type === 'red' && e.teamId === game.awayTeamId).length;

  useEffect(() => {
    // Basic detection for score change (upward only usually)
    const timer = setTimeout(() => setPulse(null), 2000);
    return () => clearTimeout(timer);
  }, [game.homeScore, game.awayScore]);

  // Use a ref-like approach or compare props to trigger pulse
  // For simplicity, we just watch the score values themselves
  const [prevScores, setPrevScores] = useState({ h: game.homeScore, a: game.awayScore });
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (game.status !== 'scheduled') {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(game.date).getTime() - new Date().getTime();
      if (difference <= 0) return "LIVE NOW";
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h ${minutes}m`;
      }
      return `${hours}h ${minutes}m ${seconds}s`;
    };

    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, [game.date, game.status]);

  useEffect(() => {
    if (game.homeScore > prevScores.h) {
      setPulse('home');
      setPrevScores({ ...prevScores, h: game.homeScore });
    }
    if (game.awayScore > prevScores.a) {
      setPulse('away');
      setPrevScores({ ...prevScores, a: game.awayScore });
    }
    // Update local state if scores decrease (reset)
    if (game.homeScore < prevScores.h || game.awayScore < prevScores.a) {
       setPrevScores({ h: game.homeScore, a: game.awayScore });
    }
  }, [game.homeScore, game.awayScore]);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-6 cursor-pointer relative overflow-hidden transition-all flex flex-col justify-center",
        isLive 
          ? "bg-blue-600 text-white rounded-[32px] shadow-2xl shadow-blue-200 dark:shadow-blue-900/40" 
          : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-black/20",
        !isLive && game.status === 'scheduled' && "h-[180px]"
      )}
    >
      <AnimatePresence>
        {pulse && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute inset-x-0 top-0 flex justify-center pt-2 pointer-events-none"
          >
            <div className="bg-yellow-400 text-black font-black px-4 py-1 rounded-full text-[10px] uppercase tracking-widest shadow-xl">
              GOAL!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLive && (
        <div className="absolute top-4 right-6 flex items-center gap-2">
          {isFollowing && <BellIcon size={12} className="text-white fill-white mr-1" />}
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Live</span>
        </div>
      )}

      {!isLive && isFollowing && (
        <div className="absolute top-4 right-6">
          <BellIcon size={12} className="text-blue-600 fill-blue-600" />
        </div>
      )}

      <div className={cn(
        "absolute top-4 left-6 flex items-center gap-2 px-2 py-0.5 rounded-full",
        isLive ? "bg-white/10 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
      )}>
        {league?.logo && <img src={league.logo} alt="" className="w-3 h-3 rounded-full object-cover" />}
        <span className="text-[8px] font-black uppercase tracking-widest">
          {league?.name} {game.round ? `• ${game.round}` : ''}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <div 
          className="flex-1 flex flex-col items-center text-center gap-3 cursor-pointer group/team"
          onClick={(e) => {
            if (onTeamClick && homeTeam) {
              e.stopPropagation();
              onTeamClick(homeTeam.id);
            }
          }}
        >
          <TeamLogo logo={homeTeam?.logo} name={homeTeam?.name} dark={isLive} />
          <span className={cn(
            "font-bold text-sm transition-colors flex items-center gap-1.5", 
            isLive ? "text-white group-hover/team:text-blue-200" : "text-gray-900 dark:text-white group-hover/team:text-blue-600 dark:group-hover/team:text-blue-400"
          )}>
            {homeTeam?.name || 'Loading...'}
            {homeRedCards > 0 && (
              <span className="w-2.5 h-3.5 bg-red-500 rounded-[2px] shadow-sm animate-in zoom-in duration-300" title={`${homeRedCards} Red Card(s)`} />
            )}
          </span>
        </div>

        <div className="px-6 flex flex-col items-center">
          <div className="flex items-center gap-4">
            <motion.span 
              animate={pulse === 'home' ? { scale: [1, 1.5, 1], color: ['#fff', '#facc15', '#fff'] } : {}}
              className={cn(
                "text-3xl font-black tabular-nums transition-all duration-500", 
                isLive ? "text-white" : "text-gray-900 dark:text-gray-100"
              )}
            >
              {game.homeScore}
            </motion.span>
            <span className={cn(
              "text-lg font-bold transition-all", 
              isLive ? "text-white opacity-40" : "text-gray-300 opacity-40"
            )}>
              :
            </span>
            <motion.span 
              animate={pulse === 'away' ? { scale: [1, 1.5, 1], color: ['#fff', '#facc15', '#fff'] } : {}}
              className={cn(
                "text-3xl font-black tabular-nums transition-all duration-500", 
                isLive ? "text-white" : "text-gray-900 dark:text-gray-100"
              )}
            >
              {game.awayScore}
            </motion.span>
          </div>
            <div className="flex flex-col items-center mt-3">
            <div className={cn(
              "px-2 py-0.5 rounded-full font-black uppercase tracking-widest text-[9px] shadow-sm transition-all flex flex-col items-center",
              isLive 
                ? "bg-white text-blue-600 animate-pulse" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
            )}>
              {game.status === 'live' ? (
                <span>{game.currentTime || 'Playing'}</span>
              ) : game.status === 'finished' ? (
                <span>Final</span>
              ) : (
                <>
                  {new Date(game.date).toDateString() !== new Date().toDateString() && (
                    <span className="text-[7px] leading-none mb-0.5 opacity-50 tracking-normal">
                      {new Date(game.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <span>{new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: localStorage.getItem('pref_time_format') === '12h' })}</span>
                </>
              )}
            </div>
            
            {!isLive && game.status === 'scheduled' && timeLeft && (
               <div className="mt-1 flex items-center">
                 <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md border border-blue-100/50 dark:border-blue-800/50 uppercase tracking-tighter">
                   {timeLeft}
                 </span>
               </div>
            )}
          </div>
        </div>

        <div 
          className="flex-1 flex flex-col items-center text-center gap-3 cursor-pointer group/team"
          onClick={(e) => {
            if (onTeamClick && awayTeam) {
              e.stopPropagation();
              onTeamClick(awayTeam.id);
            }
          }}
        >
          <TeamLogo logo={awayTeam?.logo} name={awayTeam?.name} dark={isLive} />
          <span className={cn(
            "font-bold text-sm transition-colors flex items-center gap-1.5", 
            isLive ? "text-white group-hover/team:text-blue-200" : "text-gray-900 dark:text-white group-hover/team:text-blue-600 dark:group-hover/team:text-blue-400"
          )}>
            {awayRedCards > 0 && (
              <span className="w-2.5 h-3.5 bg-red-500 rounded-[2px] shadow-sm animate-in zoom-in duration-300" title={`${awayRedCards} Red Card(s)`} />
            )}
            {awayTeam?.name || 'Loading...'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function TeamLogo({ logo, name, dark }: { logo?: string; name?: string; dark?: boolean }) {
  return (
    <div className={cn(
      "w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden transition-all",
      dark ? "bg-white/10" : "bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
    )}>
      {logo ? (
        <img src={logo} alt={name} className="w-10 h-10 object-contain" />
      ) : (
        <ShieldIcon size={32} className={dark ? "text-white/40" : "text-gray-200"} />
      )}
    </div>
  );
}
