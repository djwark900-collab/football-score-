import React from 'react';
import { motion } from 'motion/react';
import { Trophy as TrophyIcon, Medal as MedalIcon, Award as AwardIcon, Star as StarIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface HonorRecord {
  season: string;
  title: string;
  description?: string;
  type?: 'winner' | 'runner-up' | 'individual';
}

interface HonorsSectionProps {
  honors: HonorRecord[];
  title?: string;
  accentColor?: string;
}

export function HonorsSection({ honors, title = "Honors & Achievements", accentColor = "emerald" }: HonorsSectionProps) {
  if (!honors || honors.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50/50 dark:bg-gray-900/50 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10">
        <TrophyIcon className="mx-auto w-10 h-10 text-gray-200 dark:text-gray-800 mb-4 opacity-50" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">No honors recorded yet</p>
      </div>
    );
  }

  const getAccentClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'from-blue-600 to-indigo-600 text-blue-600 bg-blue-500/10 border-blue-500/20';
      case 'red': return 'from-red-600 to-rose-600 text-red-600 bg-red-500/10 border-red-500/20';
      case 'amber': return 'from-amber-400 to-yellow-600 text-amber-600 bg-amber-500/10 border-amber-500/20';
      default: return 'from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const accentClasses = getAccentClasses(accentColor);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
          <TrophyIcon size={14} className={accentClasses.split(' ')[2]} />
          {title}
        </h3>
        <div className="flex-1 h-px bg-gray-100 dark:bg-white/5 ml-4" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {honors.map((honor, idx) => (
          <motion.div
            key={`${honor.season}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group relative bg-white dark:bg-gray-900 rounded-[32px] p-6 border border-gray-100 dark:border-white/5 shadow-3d-sm hover:shadow-3d-md hover:border-emerald-500/30 transition-all overflow-hidden"
          >
            {/* Background Glow */}
            <div className={cn(
              "absolute -top-12 -right-12 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br",
              accentClasses.split(' ').slice(0, 2).join(' ')
            )} />

            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform",
                accentClasses.split(' ').slice(2).join(' ')
              )}>
                {honor.type === 'runner-up' ? <MedalIcon size={24} /> : 
                 honor.type === 'individual' ? <StarIcon size={24} /> : 
                 <TrophyIcon size={24} />}
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg">
                {honor.season}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm group-hover:text-emerald-500 transition-colors">
                {honor.title}
              </h4>
              {honor.description && (
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                  {honor.description}
                </p>
              )}
            </div>

            {/* Success indicator bottom right */}
            <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
               <AwardIcon size={14} className="text-emerald-500" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
