import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ship } from 'lucide-react';
import { Button } from '../app/components/ui/button'; // Adjust path based on your folder structure

export default function BackToHome() {
  const navigate = useNavigate();

  return (
    <nav className="w-full pt-8 px-6 sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[2rem] px-8 h-20 flex justify-between items-center">
        
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="group flex items-center gap-3 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-blue-50 hover:text-blue-600 rounded-xl px-5 transition-all"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Button>

        {/* Mini Logo */}
        <div className="flex items-center gap-3 opacity-60">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Ship size={16} />
          </div>
          <span className="font-black italic uppercase tracking-tighter text-sm text-slate-950">
            AquaReg
          </span>
        </div>
      </div>
    </nav>
  );
}