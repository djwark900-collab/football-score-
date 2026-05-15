import { motion } from 'motion/react';

export function FootballLoading() {
  return (
    <div className="fixed inset-0 z-[300] bg-white/60 dark:bg-[#050505]/60 backdrop-blur-xl flex flex-col items-center justify-center">
      <div className="relative">
        {/* Shadow */}
        <motion.div 
          animate={{ 
            scale: [1, 0.5, 1],
            opacity: [0.2, 0.1, 0.2]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-2 bg-black rounded-full blur-sm"
        />
        
        {/* Football */}
        <motion.div
          animate={{ 
            y: [0, -60, 0],
            rotate: [0, 360]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-16 h-16 bg-white dark:bg-gray-200 rounded-full border-4 border-gray-900 dark:border-white shadow-xl relative overflow-hidden"
        >
          {/* Hexagon Pattern Placeholder */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="border border-gray-900/10 rotate-45" />
            <div className="border border-gray-900/10 -rotate-45" />
            <div className="border border-gray-900/10 -rotate-45" />
            <div className="border border-gray-900/10 rotate-45" />
          </div>
          {/* Soccer Ball Pentagons */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 dark:bg-black rounded-sm rotate-12" />
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 dark:bg-black rounded-sm -rotate-12" />
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-900 dark:bg-black rounded-sm rotate-45" />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-900 dark:bg-black rounded-sm -rotate-45" />
        </motion.div>
      </div>
      
      <div className="mt-12 flex flex-col items-center gap-2">
        <h3 className="text-xl font-black tracking-tighter text-gray-900 dark:text-white uppercase italic">LiveScore<span className="text-blue-500">Pro</span></h3>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] animate-pulse">Syncing Stadium Data</p>
      </div>
    </div>
  );
}
