import React from 'react';
import { motion } from 'motion/react';

export function FootballLoading() {
  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] flex flex-col items-center justify-center overflow-hidden">
      {/* 3D Space Background */}
      <div className="absolute inset-0 perspective-[1000px]">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-blue-900/10 to-transparent" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:60px_60px] [transform:rotateX(60deg)_translateY(-200px)] opacity-50" />
      </div>

      <div className="relative flex flex-col items-center scale-110">
        {/* 3D Ball Container */}
        <div className="relative w-40 h-40 [transform-style:preserve-3d]">
          {/* Shadow */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/60 rounded-[100%] blur-xl"
          />

          {/* Floating Ball */}
          <motion.div
            animate={{ 
              y: [0, -30, 0],
              rotateY: [0, 360],
              rotateX: [0, 15, 0, -15, 0]
            }}
            transition={{
              y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
              rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
              rotateX: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-40 h-40 relative [transform-style:preserve-3d]"
          >
            {/* Main Sphere */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white via-gray-200 to-gray-400 shadow-[inset_-20px_-20px_60px_rgba(0,0,0,0.5),inset_10px_10px_40px_rgba(255,255,255,0.8)] border border-white/20">
               {/* Hexagon Pattern Emulation */}
               <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_center,_#000_1px,transparent_1px)] [background-size:24px_24px]" />
               
               {/* Glossy Reflection */}
               <div className="absolute top-4 left-8 w-12 h-6 bg-white/40 blur-md rounded-[100%] -rotate-45" />

               {/* Center Logo */}
               <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-gray-900 font-black italic text-4xl tracking-tighter opacity-10">YARIGA</span>
               </div>
            </div>
          </motion.div>
        </div>

        {/* Floating UI Elements */}
        <div className="mt-24 text-center">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="space-y-2"
           >
             <h1 className="text-4xl font-black text-white italic tracking-tighter drop-shadow-2xl uppercase">
               YARIGA <span className="text-blue-500">SPORTS</span>
             </h1>
             <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.5em]">Kurdish Football Hub Active</p>
           </motion.div>

           <div className="mt-12 flex flex-col items-center gap-4">
              <div className="flex gap-2">
                 {[...Array(4)].map((_, i) => (
                   <motion.div
                     key={i}
                     animate={{ 
                       height: [8, 24, 8],
                       backgroundColor: i % 2 === 0 ? "#2563eb" : "#fff"
                     }}
                     transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                     className="w-1.5 h-6 rounded-full"
                   />
                 ))}
              </div>
             <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">Synching with Yariga core v1.1.7</p>
           </div>
        </div>
      </div>
    </div>
  );
}
