import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Trophy as TrophyIcon, Star as StarIcon, Medal as MedalIcon, Crown as CrownIcon, Zap as ZapIcon, RefreshCw as RefreshCwIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface LeaderboardUser {
  id: string;
  displayName: string;
  photoURL: string;
  xp: number;
  level: number;
}

export function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaderboardUser[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
  }, []);

  if (loading) {
     return (
        <div className="py-20 flex flex-col items-center gap-4">
           <RefreshCwIcon className="w-12 h-12 text-blue-600 animate-spin" />
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gathering Champions...</p>
        </div>
     );
  }

  const topThree = users.slice(0, 3);
  const remaining = users.slice(3);

  return (
    <div className="space-y-12 pb-20">
       <div className="text-center space-y-2 px-8">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Global Ranking</span>
          <h2 className="text-4xl font-black italic tracking-tighter text-gray-900 dark:text-white uppercase">Leaderboard</h2>
          <p className="text-xs font-medium text-gray-400 max-w-xs mx-auto">Compete with fans worldwide. Earn XP by making accurate match predictions.</p>
       </div>

       {/* Top 3 Podium */}
       <div className="grid grid-cols-3 items-end gap-2 px-4 pt-12 max-w-2xl mx-auto">
          <div className="order-2 h-full flex flex-col items-center">
             <PodiumItem user={topThree[0]} rank={1} color="gold" />
          </div>
          <div className="order-1 h-full flex flex-col items-center">
             <PodiumItem user={topThree[1]} rank={2} color="silver" />
          </div>
          <div className="order-3 h-full flex flex-col items-center">
             <PodiumItem user={topThree[2]} rank={3} color="bronze" />
          </div>
       </div>

       {/* List View */}
       <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] overflow-hidden shadow-3d-xl border border-gray-100 dark:border-white/5">
             <div className="px-8 py-6 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Hall of Fame</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{users.length} Ranked</span>
             </div>
             
             <div className="divide-y divide-gray-50 dark:divide-white/5">
                {remaining.length > 0 ? remaining.map((user, idx) => (
                   <motion.div 
                    key={user.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="px-8 py-5 flex items-center gap-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
                   >
                      <span className="w-8 text-sm font-black text-gray-300 dark:text-gray-700 tabular-nums italic group-hover:text-blue-600 transition-colors">#{idx + 4}</span>
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 p-0.5 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                         {user.photoURL ? (
                           <img src={user.photoURL} className="w-full h-full object-cover rounded-2xl" alt="" onError={(e) => e.currentTarget.style.display='none'} />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-blue-600 font-black italic">
                              {user.displayName?.charAt(0) || '?'}
                           </div>
                         )}
                      </div>
                      <div className="flex-1">
                         <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{user.displayName || 'Anonymous'}</h4>
                         <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">PRO FAN</span>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-black text-blue-600 tabular-nums">{user.xp?.toLocaleString() || 0} XP</div>
                         <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">LVL {Math.floor((user.xp || 0) / 100) + 1}</div>
                      </div>
                   </motion.div>
                )) : (
                  <div className="py-20 text-center space-y-4">
                     <TrophyIcon className="w-12 h-12 mx-auto text-gray-100 dark:text-gray-800" />
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-8">Be the first to join the hall of fame by making predictions!</p>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}

function PodiumItem({ user, rank, color }: { user?: LeaderboardUser; rank: number; color: 'gold' | 'silver' | 'bronze' }) {
   if (!user) return (
      <div className={cn(
         "w-full flex flex-col items-center p-4 rounded-t-[48px] border-t border-x opacity-20",
         color === 'gold' ? "h-64 mt-0 bg-gray-100" : color === 'silver' ? "h-52 mt-12 bg-gray-100" : "h-40 mt-24 bg-gray-100"
      )}>
         <div className="w-16 h-16 rounded-full bg-gray-200 mt-4" />
      </div>
   );

   const getStyles = () => {
      switch (color) {
         case 'gold': return { 
            card: "bg-gradient-to-b from-yellow-100 to-white dark:from-yellow-900/40 dark:to-gray-950 border-yellow-400 dark:border-yellow-900/50 h-64 shadow-yellow-200/50",
            icon: "text-yellow-600 shadow-yellow-100 dark:shadow-yellow-900/20",
            avatar: "border-yellow-500 shadow-yellow-300/50",
            badge: "bg-yellow-500",
            y: -20
         };
         case 'silver': return { 
            card: "bg-gradient-to-b from-slate-200 to-white dark:from-slate-800/40 dark:to-gray-950 border-slate-400 dark:border-slate-700/50 h-52 mt-12 shadow-slate-200/50",
            icon: "text-slate-500 shadow-slate-100 dark:shadow-slate-900/20",
            avatar: "border-slate-400 shadow-slate-300/50",
            badge: "bg-slate-400",
            y: 0
         };
         case 'bronze': return { 
            card: "bg-gradient-to-b from-orange-200 to-white dark:from-orange-900/40 dark:to-gray-950 border-orange-400 dark:border-orange-900/50 h-40 mt-24 shadow-orange-200/50",
            icon: "text-orange-600 shadow-orange-100 dark:shadow-orange-900/20",
            avatar: "border-orange-500 shadow-orange-300/50",
            badge: "bg-orange-600",
            y: 0
         };
      }
   };

   const s = getStyles();

   return (
      <motion.div 
         initial={{ opacity: 0, y: 50 }}
         animate={{ opacity: 1, y: 0 }}
         className={cn(
            "w-full relative flex flex-col items-center p-4 rounded-t-[48px] border-t border-x shadow-2xl transition-all",
            s.card
         )}
      >
         <div className="relative -mt-16 mb-4">
            <div className={cn("w-20 h-20 rounded-[30px] p-1 border-4 bg-white dark:bg-gray-900 z-10 relative overflow-hidden", s.avatar)}>
               {user.photoURL ? (
                  <img src={user.photoURL} className="w-full h-full object-cover rounded-[24px]" alt="" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black italic bg-gray-50 dark:bg-gray-800 text-gray-400">
                     {user.displayName?.charAt(0) || '?'}
                  </div>
               )}
            </div>
            <div className={cn("absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black z-20 border-3 border-white dark:border-gray-900 shadow-lg", s.badge)}>
               #{rank}
            </div>
         </div>

         <div className="text-center w-full mb-4">
            <h4 className="text-sm font-black text-gray-900 dark:text-white truncate px-2">{user.displayName || 'Anonymous'}</h4>
            <div className="mt-2 text-xs font-black text-blue-600 flex items-center justify-center gap-1">
               <ZapIcon size={12} />
               {user.xp?.toLocaleString() || 0}
            </div>
         </div>
         
         <div className={cn("mt-auto w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-3d-sm", s.icon)}>
            {rank === 1 ? <CrownIcon size={20} /> : <MedalIcon size={20} />}
         </div>
      </motion.div>
   );
}
