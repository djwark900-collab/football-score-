import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Team } from '../types';
import { 
  X as XIcon, 
  Target as TargetIcon,
  ChevronLeft as ChevronLeftIcon,
  Shield as ShieldIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  Save as SaveIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PlayerDetailsProps {
  player: Player;
  team?: Team;
  onBack: () => void;
  isAdmin?: boolean;
  onEdit?: (playerId: string) => void;
}

type Tab = 'overview' | 'career';

export function PlayerDetails({ player, team, onBack, isAdmin, onEdit }: PlayerDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.1] scale-[4] rotate-12 pointer-events-none text-gray-900 dark:text-white">
          <UserIcon size={120} />
        </div>

        <div className="p-8 pb-32 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 relative">
          <button 
            onClick={onBack}
            className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all mb-8"
          >
            <ChevronLeftIcon size={24} />
          </button>
          
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-700 shrink-0 transition-all">
               {player.imageUrl ? (
                 <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
               ) : (
                 <UserIcon className="text-gray-200 dark:text-gray-700 w-16 h-16" />
               )}
            </div>
            
            <div className="text-center sm:text-left text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mb-3">
                <TargetIcon size={12} className="text-white/70" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">#{player.number} • {player.position}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-4">
                <h2 className="text-4xl sm:text-5xl font-black mb-2 tracking-tight">{player.name}</h2>
                {isAdmin && (
                  <button 
                    onClick={() => onEdit?.(player.id)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all shadow-lg"
                    title="Edit Player"
                  >
                    <SaveIcon size={20} />
                  </button>
                )}
              </div>
              {team && (
                <div className="flex items-center justify-center sm:justify-start gap-3">
                   <div className="w-6 h-6 bg-white/90 dark:bg-white/80 rounded-lg flex items-center justify-center p-1">
                      {team.logo ? <img src={team.logo} alt="" className="w-full h-full object-contain" /> : <ShieldIcon className="text-blue-600" size={12} />}
                   </div>
                   <span className="font-bold text-white/90">{team.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overlapping Content */}
        <div className="px-6 -mt-24 relative z-10 pb-6">
          <div className="bg-white dark:bg-gray-800 rounded-[32px] p-2 flex border border-gray-100 dark:border-gray-700 shadow-xl dark:shadow-black/40 w-full sm:w-fit mx-auto sm:mx-0 overflow-x-auto scrollbar-none transition-all duration-300">
            <TabButton 
              active={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')} 
              icon={<InfoIcon size={18} />} 
              label="Overview" 
            />
            <TabButton 
              active={activeTab === 'career'} 
              onClick={() => setActiveTab('career')} 
              icon={<TrendingUpIcon size={18} />} 
              label="Career" 
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <InfoIcon className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <h3 className="text-xl font-black dark:text-white">Player Summary</h3>
                </div>
                <div className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                  {player.overview || `Description for ${player.name} is currently being prepared. Check back soon for detailed analysis and performance traits.`}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-all duration-300">
                 <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <TargetIcon className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <h3 className="text-xl font-black dark:text-white">Details</h3>
                </div>
                <div className="space-y-4">
                  <DetailRow label="Position" value={player.position} />
                  <DetailRow label="Jersey" value={`#${player.number}`} />
                  <DetailRow label="Current Club" value={team?.name || 'N/A'} />
                  <DetailRow label="Status" value="Active" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'career' && (
          <motion.div
            key="career"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm space-y-8 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                <TrendingUpIcon className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-black dark:text-white">Career Path & Achievements</h3>
            </div>
            
            <div className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium whitespace-pre-line">
              {player.career || `${player.name}'s career path at professional level is being updated by the scouting team.`}
            </div>

            {player.transferHistory && (
              <div className="mt-12 pt-12 border-t border-gray-100 dark:border-gray-800 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                    <TrendingUpIcon className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <h3 className="text-xl font-black dark:text-white">Transfer History</h3>
                </div>
                <div className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium whitespace-pre-line bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 transition-colors">
                  {player.transferHistory}
                </div>
              </div>
            )}
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
        "flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/40" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors">
      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</span>
      <span className="font-bold text-sm text-gray-900 dark:text-white transition-colors">{value}</span>
    </div>
  );
}
