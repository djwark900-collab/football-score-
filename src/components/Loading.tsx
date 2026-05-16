import { motion } from 'motion/react';

export function FootballLoading() {
  return (
    <div className="fixed inset-0 z-[300] bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
      {/* 365Score Style Matrix Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#34d399_0%,_transparent_70%)] opacity-10" />
        <div className="absolute top-0 left-0 w-full h-full [background-image:linear-gradient(rgba(52,211,153,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      {/* Floating Elements (Approximate Live Scores aesthetic) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: [0, 0.5, 0], x: 1200 }}
            transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear", delay: i * 3 }}
            className="absolute h-px w-64 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
            style={{ top: `${20 + i * 15}%` }}
          />
        ))}
      </div>

      <div className="relative scale-150 sm:scale-[2.2]">
        {/* 3D Ball - Emerald Edition */}
        <div className="relative perspective-[1000px]">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.15, 0.3]
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black rounded-full blur-md"
          />

          <motion.div
            animate={{ 
              y: [0, -28, 0],
              rotateY: 360
            }}
            transition={{
              y: { duration: 0.6, repeat: Infinity, ease: "easeOut" },
              rotateY: { duration: 4, repeat: Infinity, ease: "linear" }
            }}
            style={{ transformStyle: 'preserve-3d' }}
            className="w-14 h-14 relative"
          >
            <div className="w-full h-full rounded-full bg-white shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.4),inset_4px_4px_8px_rgba(255,255,255,1)] relative overflow-hidden border border-emerald-500/20">
              <div className="absolute inset-x-0 h-full w-[200%] flex animate-[ball_3s_linear_infinite]">
                 {[...Array(10)].map((_, i) => (
                   <div key={i} className="flex-shrink-0 w-7 h-full relative">
                      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#1a1a1a] rounded-[3px] rotate-45" />
                      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#1a1a1a] rounded-[3px] rotate-45" />
                   </div>
                 ))}
              </div>
              <div className="absolute top-1 left-2 w-5 h-3 bg-white/50 blur-[4px] rounded-full rotate-[-20deg]" />
            </div>
            
            <div className="absolute inset-[-10px] border-[1px] border-emerald-500/30 rounded-full rotate-X-[75deg] animate-[spin_4s_linear_infinite]" />
          </motion.div>
        </div>
      </div>
      
      <div className="mt-40 sm:mt-52 flex flex-col items-center gap-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="flex items-center gap-1.5">
             <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <span className="text-white font-black text-xl italic tracking-tighter">365</span>
             </div>
             <h3 className="text-3xl font-black tracking-tighter text-white uppercase italic">
               SCORE<span className="text-emerald-500">PRO</span>
             </h3>
          </div>
          
          <div className="mt-6 flex items-center gap-3">
             <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1 h-1 rounded-full bg-emerald-500"
                  />
                ))}
             </div>
             <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.4em]">Live Connection</span>
          </div>
        </motion.div>
        
        <div className="w-56 h-1 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
           <motion.div 
             animate={{ left: ["-100%", "100%"] }}
             transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
             className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
           />
        </div>
        
        <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.8em]">Optimizing Baghdad Stream</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ball {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .perspective-1000 { perspective: 1000px; }
        .rotate-X-75 { transform: rotateX(75deg); }
      `}} />
    </div>
  );
}
