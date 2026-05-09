import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Team } from '../types';
import { 
  ChevronLeft as ChevronLeftIcon,
  Shield as ShieldIcon,
  TrendingUp as TrendingUpIcon,
  User as UserIcon,
  Pencil as PencilIcon,
  Footprints as FootprintsIcon
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
  onBack: () => void;
  isAdmin?: boolean;
  onEdit?: (playerId: string) => void;
}

type Tab = 'overview' | 'stats' | 'career' | 'honors';

export function PlayerDetails({ player, team, onBack, isAdmin, onEdit }: PlayerDetailsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const shortName = useMemo(() => {
    const parts = player.name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}.${parts[parts.length - 1]}`;
    }
    return player.name;
  }, [player.name]);

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
      { subject: 'Attacking', A: player.statsRadar.attacking, fullMark: 100 },
      { subject: 'Creativity', A: player.statsRadar.creativity, fullMark: 100 },
      { subject: 'Defending', A: player.statsRadar.defending, fullMark: 100 },
      { subject: 'Tactical', A: player.statsRadar.tactical, fullMark: 100 },
      { subject: 'Technical', A: player.statsRadar.technical, fullMark: 100 },
    ];
  }, [player.statsRadar]);

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

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] dark:bg-gray-950 font-sans">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors">
        <button 
          onClick={onBack}
          className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          <ChevronLeftIcon size={24} />
        </button>
        
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{shortName}</h1>
        
        <button 
          onClick={() => isAdmin && onEdit?.(player.id)}
          className={cn(
            "p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white transition-all",
            !isAdmin && "opacity-20 cursor-not-allowed"
          )}
        >
          <PencilIcon size={24} />
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-none transition-colors">
        {(['overview', 'stats', 'career', 'honors'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-black uppercase tracking-tighter transition-all relative",
              activeTab === tab 
                ? "text-blue-900 dark:text-blue-400" 
                : "text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab" 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Profile Overview Card */}
              <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-24 h-24 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={32} className="text-gray-300" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{player.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                       <div className="w-5 h-5 flex items-center justify-center">
                         {team?.logo ? <img src={team.logo} alt="" className="w-full h-full object-contain" /> : <ShieldIcon size={14} className="text-blue-600" />}
                       </div>
                       <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{team?.name || 'Free Agent'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                  <InfoItem label="Age" value={age} subValue={player.birthDate || '15/02/2000'} />
                  <InfoItem label="Height" value={player.height || '189cm'} />
                  <InfoItem label="Weight" value={player.weight || '78kg'} />
                  <InfoItem 
                    label="Nationality" 
                    value={player.nationality || 'Poland'} 
                    icon={player.nationality === 'Poland' ? <span className="text-xl">🇵🇱</span> : <span className="text-xl">🏳️</span>} 
                  />
                  <InfoItem label="Position" value={player.position} />
                  <InfoItem 
                    label="Foot" 
                    value={player.foot || 'Right'} 
                    icon={<FootprintsIcon size={24} className="text-green-500" />} 
                  />
                </div>
              </div>

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

              {/* Recent Ratings List */}
              <div className="bg-gray-50 dark:bg-gray-800/50 py-4 rounded-2xl flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-700">
                <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Recent ratings</span>
              </div>
              
              {player.recentRatings && player.recentRatings.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {player.recentRatings.map((rating, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm",
                        rating >= 8 ? "bg-green-100 text-green-700" : 
                        rating >= 7 ? "bg-blue-100 text-blue-700" : 
                        "bg-gray-100 text-gray-700"
                      )}
                    >
                      {rating.toFixed(1)}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all"
            >
              <h3 className="text-lg font-black dark:text-white mb-6">Detailed Season Stats</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Detailed performance statistics are being aggregated for the current season.</p>
            </motion.div>
          )}

          {activeTab === 'career' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all space-y-6"
            >
              <div className="flex items-center gap-3">
                <TrendingUpIcon className="text-blue-600" size={24} />
                <h3 className="text-xl font-black dark:text-white">Career Path</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed font-medium">
                {player.career || "Career information details are being processed."}
              </p>
            </motion.div>
          )}

          {activeTab === 'honors' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all space-y-6"
            >
              <h3 className="text-lg font-black dark:text-white">Achievements & Honors</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No recorded honors for this season yet.</p>
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

