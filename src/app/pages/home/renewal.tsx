import React, { useState, useMemo } from 'react';
import { 
  RefreshCcw, Search, Calendar, AlertTriangle, 
  ArrowRight, FileCheck, ShieldAlert, History,
  User, MapPin, Anchor, X
} from 'lucide-react';
import { useAquaData} from '../../components/context/AquaRegCONTEXT';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

type Vessel = {
  id: string;
  vessel_name?: string | null;
  status?: string | null;
  owner_name?: string | null;
  created_at?: string | null;
  type?: string | null;
  barangay?: string | null;
};

export default function RenewalPage() {
  const aquaContext = useAquaData();
  
  // Safe destructuring matching context signature
  const vessels: Vessel[] = aquaContext?.Vessels || [];
  const updateVesselStatus = aquaContext?.updateVesselStatus;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForRenewal, setSelectedForRenewal] = useState<Vessel | null>(null);
  
  // Filter for records matching status types
  const renewableRecords = useMemo(() => {
    return vessels.filter(v => {
      const matchStatus = v.status === 'Expired' || v.status === 'Passed';
      
      // Target correct exact fields derived from your Supabase schema configuration
      const targetName = String(v.vessel_name || "");
      const targetId = String(v.id || "");
      
      const matchesSearch = targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            targetId.toLowerCase().includes(searchQuery.toLowerCase());
                            
      return matchStatus && matchesSearch;
    });
  }, [vessels, searchQuery]);

  const handleProcessRenewal = async (id: string) => {
    if (!updateVesselStatus) {
      console.error("Context update function not found");
      return;
    }

    try {
      // Re-route target to standard Pending status workflow structure
      await updateVesselStatus(id, 'Pending');
      setSelectedForRenewal(null);
      alert("Record successfully moved to Audit Queue for 2026 Validation.");
    } catch (err) {
      console.error("Failed executing renewal state modification:", err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">License Renewal</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Compliance & Re-validation Hub</p>
        </div>
        <div className="bg-[#161b26] p-2 rounded-2xl border border-white/5 flex items-center gap-4 px-4">
           <History className="text-blue-500" size={18} />
           <span className="text-white font-black text-xs uppercase italic">Cycle: 2026-2027</span>
        </div>
      </div>

      {/* --- SEARCH BAR --- */}
      <div className="bg-[#161b26] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <Input 
            className="w-full bg-black/40 border-white/10 rounded-2xl py-6 pl-14 text-white font-bold placeholder:text-slate-600 focus:ring-0 focus:border-blue-500/50"
            placeholder="ENTER REGISTRY ID OR VESSEL NAME TO RENEW..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT: SEARCH RESULTS --- */}
        <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {renewableRecords.length > 0 ? (
            renewableRecords.map((v) => (
              <div 
                key={v.id}
                onClick={() => setSelectedForRenewal(v)}
                className={`p-5 rounded-[2rem] border transition-all cursor-pointer group ${
                  selectedForRenewal?.id === v.id 
                  ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40' 
                  : 'bg-[#161b26] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className={`font-black uppercase italic ${selectedForRenewal?.id === v.id ? 'text-white' : 'text-slate-200'}`}>
                      {v.vessel_name || "UNNAMED VESSEL"}
                    </h3>
                    <p className={`text-[9px] font-mono font-bold uppercase ${selectedForRenewal?.id === v.id ? 'text-blue-200' : 'text-slate-500'}`}>
                      {v.id}
                    </p>
                  </div>
                  <Badge className={`uppercase text-[8px] font-black border-none ${
                    v.status === 'Expired' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {v.status}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-[#161b26] rounded-[2.5rem] border border-dashed border-white/10">
              <ShieldAlert className="mx-auto text-slate-700 mb-4" size={48} />
              <p className="text-slate-500 font-black text-[10px] uppercase">No renewable records found</p>
            </div>
          )}
        </div>

        {/* --- RIGHT: RENEWAL ACTION PANEL --- */}
        <div className="lg:col-span-2 min-h-[400px]">
          {selectedForRenewal ? (
            <div className="bg-[#161b26] rounded-[3rem] border border-white/10 p-8 space-y-8 animate-in slide-in-from-right duration-500 sticky top-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center text-white font-black">
                    <RefreshCcw size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Process Renewal</h2>
                    <p className="text-blue-400 font-bold text-xs uppercase tracking-widest italic">Target: {selectedForRenewal.vessel_name || selectedForRenewal.id}</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedForRenewal(null)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RenewalStatCard label="Owner" value={selectedForRenewal.owner_name || "UNSPECIFIED"} icon={<User size={14}/>} />
                <RenewalStatCard label="Registration Date" value={selectedForRenewal.created_at ? new Date(selectedForRenewal.created_at).toLocaleDateString() : "N/A"} icon={<Calendar size={14}/>} />
                <RenewalStatCard label="Type" value={selectedForRenewal.type || "VESSEL"} icon={<Anchor size={14}/>} />
                <RenewalStatCard label="Location" value={selectedForRenewal.barangay || "ROMBLON"} icon={<MapPin size={14}/>} />
              </div>

              <div className={`rounded-3xl p-6 flex gap-4 items-center border ${
                selectedForRenewal.status === 'Expired' 
                ? 'bg-red-500/10 border-red-500/20' 
                : 'bg-amber-500/10 border-amber-500/20'
              }`}>
                <AlertTriangle className={selectedForRenewal.status === 'Expired' ? 'text-red-500' : 'text-amber-500'} size={24} />
                <p className={`text-[11px] font-bold uppercase leading-relaxed ${
                  selectedForRenewal.status === 'Expired' ? 'text-red-200' : 'text-amber-200'
                }`}>
                  {selectedForRenewal.status === 'Expired' 
                    ? "This license is completely invalid. Proceeding will reset the vessel to Pending Status for immediate re-inspection."
                    : "Proceeding will move this record back to the Pending Audit Queue. New documents and physical inspection will be required."}
                </p>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => handleProcessRenewal(selectedForRenewal.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 h-16 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-blue-900/20"
                >
                  Confirm & Send to Audit <ArrowRight className="ml-2" size={18} />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedForRenewal(null)}
                  className="border-white/10 text-slate-400 hover:bg-white/5 h-16 px-8 rounded-2xl font-black uppercase tracking-widest"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem]">
              <div className="text-center space-y-2">
                <FileCheck className="mx-auto text-slate-800" size={64} />
                <p className="text-slate-600 font-black text-xs uppercase tracking-[0.3em]">Select a record to begin renewal</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// --- HELPER COMPONENT ---
function RenewalStatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-1">
        {icon} {label}
      </p>
      <p className="text-sm font-black text-slate-200 uppercase truncate">{value}</p>
    </div>
  );
}