import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Anchor, Info } from 'lucide-react';
import heroBg from './photo/romblom1.jpg'; // Adjust path if your photo folder is elsewhere

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen font-sans text-white flex flex-col relative antialiased bg-cover bg-center bg-no-repeat selection:bg-blue-500 selection:text-white"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      {/* --- 🌑 RICH MULTI-LAYERED ATMOSPHERIC OVERLAY --- */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-900/50 to-blue-950/60 -z-10" />
      <div className="absolute inset-0 backdrop-blur-[2px] -z-10" />

      {/* --- 🧭 GLOBAL NAVIGATION (Glassmorphism) --- */}
      <nav className="w-full pt-6 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-full px-8 py-3.5 flex justify-between items-center border border-white/20 bg-white/10 backdrop-blur-2xl transition-all duration-300 hover:border-white/30">
          
          {/* Logo / Brand Name (Non-clickable, pure static aesthetic header) */}
          <div className="flex items-center gap-3.5 select-none">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/30">
              <Anchor size={22} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-wider text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-blue-200 leading-none drop-shadow-sm">
                AQUAREG
              </span>
              <span className="text-[10px] font-black tracking-[0.25em] text-blue-300 uppercase leading-none mt-1 opacity-90">
                Romblon Maritime
              </span>
            </div>
          </div>
          
          {/* Nav Actions */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/about_us')}
              className="flex items-center gap-2 font-black uppercase text-xs tracking-widest text-blue-100 hover:text-white transition-all px-4 py-2 rounded-full hover:bg-white/10 border border-transparent hover:border-white/15"
            >
              <Info size={15} className="text-blue-300" /> About Us
            </button>
           
          </div>
        </div>
      </nav>

      {/* --- 🎭 MAIN CONTENT CONTAINER --- */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 flex items-center justify-center w-full">
        {children}
      </main>

      {/* --- 🛡️ GLOBAL FOOTER --- */}
      <footer className="w-full pb-8 pt-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
        Department of Agriculture • Province of Romblon © {new Date().getFullYear()}
      </footer>
    </div>
  );
}