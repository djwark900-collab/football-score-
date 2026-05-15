import { motion } from 'motion/react';

export function FootballLoading() {
  return (
    <div className="fixed inset-0 z-[300] bg-white dark:bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-blue-500/10 dark:from-blue-600/5 to-transparent" />
      
      <div className="relative scale-150 sm:scale-[2]">
        {/* Ground Glow */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24 h-6 bg-blue-500 rounded-full blur-2xl"
        />

        {/* 3D Sphere Shadow */}
        <motion.div 
          animate={{ 
            scale: [1, 0.6, 1],
            opacity: [0.3, 0.1, 0.3]
          }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-black rounded-full blur-md"
        />
        
        {/* 3D Rotating Football Container */}
        <motion.div
          animate={{ 
            y: [0, -40, 0],
            rotateZ: [0, 10, 0, -10, 0]
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          {/* Outer Sphere with 3D Lighting */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full bg-white dark:bg-gray-100 shadow-[inset_-4px_-4px_12px_rgba(0,0,0,0.2),inset_4px_4px_12px_rgba(255,255,255,0.8)] dark:shadow-[inset_-4px_-4px_12px_rgba(0,0,0,0.8),inset_4px_4px_12px_rgba(255,255,255,0.1)] relative overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            {/* Hexagon Pattern Grid (3D perspective feel) */}
            <div className="absolute inset-x-0 top-0 h-full w-[200%] flex animate-[scroll_3s_linear_infinite]">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-8 h-full relative">
                   <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 rounded-sm rotate-45 shadow-inner" />
                   <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 rounded-sm rotate-45 shadow-inner" />
                </div>
              ))}
            </div>
            
            {/* Top Shine */}
            <div className="absolute top-1 left-2 w-8 h-4 bg-white/40 blur-md rounded-full rotate-[-20deg]" />
          </motion.div>

          {/* Orbiting Ring */}
          <motion.div 
            animate={{ rotateY: 360, rotateX: 70 }}
            style={{ transformStyle: 'preserve-3d' }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-8px] border-[0.5px] border-blue-500/20 rounded-full"
          />
        </motion.div>
      </div>
      
      <div className="mt-24 sm:mt-32 flex flex-col items-center gap-4 relative z-10">
        <div className="flex items-center gap-3">
           <div className="w-8 h-px bg-gradient-to-r from-transparent to-blue-500" />
           <h3 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white uppercase italic flex items-center gap-1">
             LIVE<span className="text-blue-600 dark:text-blue-400">SCORE</span>
             <span className="bg-blue-600 text-white text-[10px] not-italic px-1.5 py-0.5 rounded ml-1">PRO</span>
           </h3>
           <div className="w-8 h-px bg-gradient-to-l from-transparent to-blue-500" />
        </div>
        
        <div className="flex flex-col items-center">
          <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.6em] animate-pulse">
            Calibrating Match Engine
          </p>
          <div className="mt-4 w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
             <motion.div 
               animate={{ left: ["-100%", "100%"] }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-blue-600 to-transparent"
             />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
