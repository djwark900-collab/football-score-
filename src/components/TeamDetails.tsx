import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Team, Game, Player, League } from '../types';
import { 
  Shield as ShieldIcon, 
  ChevronLeft as ChevronLeftIcon, 
  Target as TargetIcon,
  Info as InfoIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Trophy as TrophyIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GameCard } from './GameCard';

interface TeamDetailsProps {
  team: Team;
  teams: Team[];
  games: Game[];
  players: Player[];
  leagues: League[];
  onBack: () => void;
  onGameClick: (gameId: string) => void;
}

type Tab = 'fixtures' | 'squad' | 'details';

export function TeamDetails({ team, teams, games, players, leagues, onBack, onGameClick }: TeamDetailsProps) {
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

  const teamLeague = leagues.find(l => l.id === team.leagueId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-[4] rotate-12 pointer-events-none">
          <ShieldIcon size={120} />
        </div>

        <button 
          onClick={onBack}
          className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors self-start sm:self-center relative z-10"
        >
          <ChevronLeftIcon size={24} />
        </button>
        
        <div className="flex items-center gap-6 flex-1 relative z-10">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center p-4 shadow-inner border border-gray-100">
             {team.logo ? (
               <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
             ) : (
               <ShieldIcon className="text-gray-200 w-10 h-10" />
             )}
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">{team.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full">
                <TrophyIcon size={10} className="text-blue-600" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{teamLeague?.name}</span>
              </div>
              <span className="text-xs text-gray-300 font-bold">•</span>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{teamLeague?.country}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-full sm:w-fit overflow-x-auto scrollbar-none">
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
          active={activeTab === 'details'} 
          onClick={() => setActiveTab('details')} 
          icon={<InfoIcon size={18} />} 
          label="Details" 
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'fixtures' && (
          <motion.div
            key="fixtures"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-4"
          >
            {teamGames.length > 0 ? (
              teamGames.map(game => (
                <GameCard 
                  key={game.id}
                  game={game} 
                  teams={teams}
                  onClick={() => onGameClick(game.id)}
                  isLive={game.status === 'live'}
                />
              ))
            ) : (
              <EmptyState icon={<CalendarIcon />} message="No matches scheduled." />
            )}
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
                <div key={player.id} className="bg-white p-6 rounded-[32px] border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center font-black text-blue-600 text-lg">
                    {player.number}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{player.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{player.position}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState icon={<TargetIcon />} message="No players found in squad." />
              </div>
            )}
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
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <InfoIcon className="text-blue-600" size={24} />
                </div>
                <h3 className="text-xl font-black">Competitor Details</h3>
              </div>
              
              <div className="space-y-4">
                <DetailRow label="Full Name" value={team.name} />
                <DetailRow label="Main Competition" value={teamLeague?.name || 'N/A'} />
                <DetailRow label="Country" value={teamLeague?.country || 'N/A'} />
                <DetailRow label="Squad Size" value={`${teamPlayers.length} players`} />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <TrophyIcon className="text-blue-600" size={24} />
                </div>
                <h3 className="text-xl font-black">Performance</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                 <StatBox label="WL" value={teamGames.filter(g => g.status === 'finished').length} />
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
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</span>
      <span className="font-bold text-sm text-gray-900">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 p-4 rounded-3xl text-center">
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="p-12 text-center bg-white rounded-[40px] border border-gray-100 text-gray-400">
      <div className="w-12 h-12 mx-auto mb-4 opacity-20">{icon}</div>
      <p className="font-bold">{message}</p>
    </div>
  );
}
