import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Game, Team, League } from '../types';
import { Shield as ShieldIcon, Zap as ZapIcon } from 'lucide-react';
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
  const [prevScores, setPrevScores] = useState({ h: game.homeScore, a: game.awayScore });
  const [timeLeft, setTimeLeft] = useState<{ d: string; h: string; m: string; s: string } | string | null>(null);

  useEffect(() => {
    if (game.status !== 'scheduled') {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(game.date).getTime() - new Date().getTime();
      
      if (difference <= 0) return "LIVE";

      const d = Math.floor(difference / (1000 * 60 * 60 * 24));
      const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const m = Math.floor((difference / 1000 / 60) % 60);
      const s = Math.floor((difference / 1000) % 60);

      return {
        d: d < 10 ? "0" + d : d.toString(),
        h: h < 10 ? "0" + h : h.toString(),
        m: m < 10 ? "0" + m : m.toString(),
        s: s < 10 ? "0" + s : s.toString()
      };
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
    const timer = setTimeout(() => setPulse(null), 2000);
    return () => clearTimeout(timer);
  }, [game.homeScore, game.awayScore]);

  return (
    <motion.div
      whileHover={{ y: -4, scale: isLive ? 1.02 : 1.005 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "cursor-pointer relative overflow-hidden transition-all duration-500",
        isLive 
          ? "bg-gradient-to-br from-[#1a0b2e] via-[#2d0f4d] to-[#1a0b2e] text-white rounded-[40px] shadow-3d-xl p-8 min-w-[300px]" 
          : "bg-white dark:bg-gray-900 rounded-[32px] shadow-3d-sm hover:shadow-3d-md border border-gray-100 dark:border-gray-800 p-4 transition-all duration-300",
      )}
    >
      {/* Background patterns for Live hero cards */}
      {isLive && (
        <>
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full blur-[60px] -ml-16 -mb-16" />
          </div>
          {league?.logo && (
             <img 
               src={league.logo} 
               alt="" 
               className="absolute right-0 bottom-0 w-48 h-48 object-contain opacity-5 pointer-events-none translate-x-12 translate-y-12 grayscale" 
             />
          )}
        </>
      )}

      <AnimatePresence>
        {pulse && isLive && (
          <motion.div 
            key="pulse-goal"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute inset-x-0 top-0 flex justify-center pt-4 pointer-events-none z-20"
          >
            <div className="bg-yellow-400 text-black font-black px-4 py-1 rounded-full text-[10px] uppercase tracking-widest shadow-3d-md border border-white/20">
              GOAL!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLive ? (
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="flex flex-col items-center gap-1 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
              {league?.name || 'Live Match'}
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
              {game.round || 'League Match'}
            </span>
          </div>

          <div className="flex items-center justify-between w-full gap-4">
            <div 
              className="flex flex-col items-center gap-3 flex-1 min-w-0 group/team cursor-pointer"
              onClick={(e) => {
                if (onTeamClick && homeTeam) {
                  e.stopPropagation();
                  onTeamClick(homeTeam.id);
                }
              }}
            >
              <TeamLogo logo={homeTeam?.logo} name={homeTeam?.name} dark />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] font-black uppercase tracking-widest text-center truncate w-full group-hover/team:text-blue-300 transition-colors">{homeTeam?.name}</span>
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Home</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 px-2">
              <div className="flex items-center gap-4">
                <motion.span 
                  animate={pulse === 'home' ? { scale: [1, 1.4, 1], color: ['#fff', '#facc15', '#fff'] } : {}}
                  className="text-4xl font-black tabular-nums"
                >
                  {game.homeScore}
                </motion.span>
                <span className="text-2xl font-black text-white/20">:</span>
                <motion.span 
                  animate={pulse === 'away' ? { scale: [1, 1.4, 1], color: ['#fff', '#facc15', '#fff'] } : {}}
                  className="text-4xl font-black tabular-nums"
                >
                  {game.awayScore}
                </motion.span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                <span className="text-[10px] font-black text-blue-400 tabular-nums animate-pulse">{game.currentTime || '0'}'</span>
              </div>
            </div>

            <div 
              className="flex flex-col items-center gap-3 flex-1 min-w-0 group/team cursor-pointer"
              onClick={(e) => {
                if (onTeamClick && awayTeam) {
                  e.stopPropagation();
                  onTeamClick(awayTeam.id);
                }
              }}
            >
              <TeamLogo logo={awayTeam?.logo} name={awayTeam?.name} dark />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] font-black uppercase tracking-widest text-center truncate w-full group-hover/team:text-blue-300 transition-colors">{awayTeam?.name}</span>
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Away</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full gap-5">
          {/* League Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center p-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                {league?.logo ? (
                  <img src={league.logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  <ShieldIcon size={12} className="text-gray-300" />
                )}
              </div>
              <span className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {league?.name} {game.round && <span className="text-gray-300 dark:text-gray-700 mx-1">•</span>} {game.round}
              </span>
            </div>
            {game.status === 'scheduled' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900/30">
                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 tracking-widest uppercase">Upcoming</span>
              </div>
            )}
          </div>

          {/* Match Row */}
          <div className="flex items-center justify-between gap-4 pb-1">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
              <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800/40 rounded-[22px] flex items-center justify-center p-3 border border-gray-100 dark:border-gray-800 group-hover:scale-105 transition-transform">
                {homeTeam?.logo ? (
                  <img src={homeTeam.logo} alt="" className="w-full h-full object-contain drop-shadow-sm" />
                ) : (
                  <ShieldIcon size={28} className="text-gray-200" />
                )}
              </div>
              <span className={cn(
                "text-[13px] font-black text-center truncate w-full",
                game.status === 'finished' && game.homeScore > game.awayScore ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
              )}>
                {homeTeam?.name}
              </span>
            </div>

            {/* Central Score/Time */}
            <div className="flex flex-col items-center justify-center px-2 shrink-0">
              {game.status === 'scheduled' ? (
                <div className="flex flex-col items-center">
                  <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col items-center">
                      <span className="text-[12px] font-black text-gray-900 dark:text-white tabular-nums tracking-tighter leading-none">
                        {new Date(game.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Baghdad' })}
                      </span>
                      <span className="text-[6px] font-black text-blue-500 uppercase tracking-widest mt-1">Time Baghdad</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1.5 opacity-50 italic">VS</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-2xl font-black tabular-nums tracking-tighter",
                      game.status === 'finished' && game.homeScore > game.awayScore ? "text-gray-900 dark:text-white" : "text-gray-400"
                    )}>
                      {game.homeScore}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <span className={cn(
                      "text-2xl font-black tabular-nums tracking-tighter",
                      game.status === 'finished' && game.awayScore > game.homeScore ? "text-gray-900 dark:text-white" : "text-gray-400"
                    )}>
                      {game.awayScore}
                    </span>
                  </div>
                  {game.status === 'finished' && (
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">FT</span>
                  )}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
              <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800/40 rounded-[22px] flex items-center justify-center p-3 border border-gray-100 dark:border-gray-800 group-hover:scale-105 transition-transform">
                {awayTeam?.logo ? (
                  <img src={awayTeam.logo} alt="" className="w-full h-full object-contain drop-shadow-sm" />
                ) : (
                  <ShieldIcon size={28} className="text-gray-200" />
                )}
              </div>
              <span className={cn(
                "text-[13px] font-black text-center truncate w-full",
                game.status === 'finished' && game.awayScore > game.homeScore ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
              )}>
                {awayTeam?.name}
              </span>
            </div>
          </div>

          {/* New Countdown Bottom Row */}
          {game.status === 'scheduled' && typeof timeLeft === 'object' && timeLeft && (
            <div className="pt-2 mt-1 border-t border-gray-50 dark:border-gray-800/50 flex justify-center">
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 py-1"
              >
                <div className="flex items-center gap-1 bg-blue-500/10 dark:bg-blue-400/10 px-2 py-0.5 rounded-md">
                   <ZapIcon size={8} className="text-blue-500 fill-current" />
                   <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Countdown</span>
                </div>
                <div className="flex gap-1.5">
                  {parseInt(timeLeft.d) > 0 && (
                    <>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black tabular-nums text-indigo-600 dark:text-indigo-400 leading-none">{timeLeft.d}</span>
                        <span className="text-[5px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">Days</span>
                      </div>
                      <span className="text-[8px] font-black text-gray-200 dark:text-gray-800 leading-none self-center">:</span>
                    </>
                  )}
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black tabular-nums text-gray-900 dark:text-white leading-none">{timeLeft.h}</span>
                    <span className="text-[5px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">Hrs</span>
                  </div>
                  <span className="text-[8px] font-black text-gray-200 dark:text-gray-800 leading-none self-center">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black tabular-nums text-gray-900 dark:text-white leading-none">{timeLeft.m}</span>
                    <span className="text-[5px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">Min</span>
                  </div>
                  <span className="text-[8px] font-black text-gray-200 dark:text-gray-800 leading-none self-center">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black tabular-nums text-blue-600 dark:text-blue-400 leading-none">{timeLeft.s}</span>
                    <span className="text-[5px] font-black text-blue-500/50 uppercase tracking-tighter mt-0.5">Sec</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>

      )}
    </motion.div>
  );
}

function TeamLogo({ logo, name, dark }: { logo?: string; name?: string; dark?: boolean }) {
  return (
    <div className={cn(
      "w-16 h-16 rounded-[24px] flex items-center justify-center overflow-hidden transition-all shadow-3d-sm",
      dark 
        ? "bg-white/10 ring-1 ring-white/20" 
        : "bg-white dark:bg-gray-800 border-t border-l border-white/50 dark:border-white/10 shadow-inner"
    )}>
      {logo ? (
        <img src={logo} alt={name} className="w-10 h-10 object-contain drop-shadow-md" />
      ) : (
        <ShieldIcon size={32} className={dark ? "text-white/40" : "text-gray-200"} />
      )}
    </div>
  );
}
