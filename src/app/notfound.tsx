import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Home, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../src/app/components/ui/button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      
      {/* Background Decorative Element */}
      <div className="absolute opacity-[0.03] pointer-events-none select-none">
        <h1 className="text-[20rem] font-black italic uppercase leading-none">
          LOST
        </h1>
      </div>

      <div className="relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* Icon & Status */}
        <div className="flex flex-col items-center gap-4">
          <div className="p-5 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/20 rotate-3">
            <Anchor size={64} strokeWidth={2.5} className="text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none">
              404
            </h1>
            <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-sm">
              Vessel Not Found
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">
            You've drifted out of bounds
          </h2>
          <p className="text-slate-400 font-medium text-sm leading-relaxed">
            The page you are looking for does not exist in the AquaReg Registry. 
            It may have been moved, deleted, or never existed in our waters.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline" 
            className="h-14 px-8 border-2 border-white/20 hover:bg-white/10 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all"
          >
            <ArrowLeft className="mr-2" size={16} /> 
            Go Back
          </Button>

          <Button 
            onClick={() => navigate('/')} 
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-blue-900/40 transition-all active:scale-95"
          >
            <Home className="mr-2" size={16} /> 
            Return to Port
          </Button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
        Municipality of Romblon • AquaReg System
      </div>
    </div>
  );
}