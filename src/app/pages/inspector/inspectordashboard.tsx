import { useMemo, isValidElement, cloneElement, type ReactNode, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock3, ShieldCheck, 
  Ship, Activity, MapPin, LayoutDashboard
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
// Standardized context path import matching your architecture exports
import { useAquaAuth, useAquaData } from '../../components/context/AquaRegCONTEXT';

export default function InspectorOverview() {
  const navigate = useNavigate();
  const { currentUser } = useAquaAuth();
  const { Vessels = [] } = useAquaData();
  const myInspectorId = String(
  currentUser?.idNumber || currentUser?.id || ""
).toUpperCase();


  // --- DATA PROCESSING LOGIC ---
  const stats = useMemo(() => {
  const myInspectorId = String(
    currentUser?.idNumber || currentUser?.id || ""
  ).toUpperCase();

  // ONLY vessels assigned to this inspector
  const myTasks = Vessels.filter(v => {
    const assignedInspector = String(
      v.assigned_inspector || ""
    ).toUpperCase();

    return (
      assignedInspector !== "" &&
      assignedInspector === myInspectorId
    );
  });

  const verified = myTasks.filter(
    v => String(v.status).toUpperCase() === "PASSED"
  ).length;

  const pending = myTasks.filter(v =>
    ["SCHEDULED", "PENDING", "TO FOLLOW"].includes(
      String(v.status).toUpperCase()
    )
  ).length;

  const rate =
    myTasks.length > 0
      ? Math.round((verified / myTasks.length) * 100)
      : 0;

  // rest of your existing code...

    // Highest Barangay Registration density logic
    const barangayCounts: Record<string, number> = {};
    Vessels.forEach(v => {
      const brgy = v.barangay || "UNKNOWN";
      barangayCounts[brgy] = (barangayCounts[brgy] || 0) + 1;
    });
    
    const brgyData = Object.entries(barangayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 densest areas

    // Recent Inspections sorting matching database timestamp architecture
    const recent = [...myTasks]
      .sort((a, b) => {
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 4);

    return { total: myTasks.length, verified, pending, rate, brgyData, recent };
  }, [Vessels, myInspectorId]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-900 pb-20">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 pt-12 pb-12 px-6 lg:px-12">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-2">
              <LayoutDashboard size={14} /> 
              <span>Inspector Overview Dashboard</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">
              Welcome back, <span className="text-blue-600 italic uppercase">{currentUser?.name?.split(' ')[0] || 'Inspector'}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium italic">FIS Registry Personnel • Romblon Municipality</p>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 lg:px-12 mt-12 space-y-6">
        
        {/* METRIC TILES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard label="Total Assignments" value={stats.total} icon={<Ship />} color="blue" />
          <OverviewCard label="Verified Passed" value={stats.verified} icon={<ShieldCheck />} color="emerald" />
          <OverviewCard label="Awaiting Action" value={stats.pending} icon={<Clock3 />} color="orange" />
          <OverviewCard label="Monthly Score" value={`${stats.rate}%`} icon={<Activity />} color="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* BARANGAY DISTRIBUTION CHART */}
          <Card className="rounded-[2.5rem] border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <MapPin size={14} className="text-blue-600" /> Barangay Registration Density
              </h3>
              <Badge className="bg-slate-100 text-slate-500 border-none uppercase font-black text-[9px]">Top Registered Areas</Badge>
            </div>
            
            <div className="space-y-5">
              {stats.brgyData.map(([name, count], i) => (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-black uppercase text-slate-700 italic">{name}</span>
                    <span className="text-xs font-bold text-blue-600">{count} Vessels</span>
                  </div>
                  <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      style={{ width: `${stats.brgyData[0][1] ? (count / stats.brgyData[0][1]) * 100 : 0}%` }} 
                      className={`h-full transition-all duration-1000 ${i === 0 ? 'bg-blue-600' : 'bg-slate-400'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* RECENT INSPECTIONS LIST */}
          <Card className="rounded-[2.5rem] border-slate-200 bg-white p-8 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Clock3 size={14} className="text-blue-600" /> Recent Inspections
              </h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              {stats.recent.map((v) => (
                <div 
                  key={v.id} 
                  className="py-4 flex items-center justify-between group cursor-pointer" 
                  onClick={() => navigate(`/inspector/inspection/${v.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Ship size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase italic text-slate-900 leading-none">
                        {v.vessel_name || 'Unnamed Vessel'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                        Owner: {v.owner_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-[8px] font-black uppercase border-none ${v.status === 'Passed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {v.status}
                    </Badge>
                    <p className="text-[9px] font-mono font-bold text-slate-300 mt-1 uppercase">{v.id.slice(0, 8)}</p>
                  </div>
                </div>
              ))}
              
              {stats.recent.length === 0 && (
                <div className="py-12 text-center flex flex-col items-center">
                  <Activity className="text-slate-200 mb-2" size={32} />
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">No Recent Activity Recorded</p>
                </div>
              )}
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}

// --- HELPER COMPONENT ---
interface OverviewCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: 'blue' | 'emerald' | 'orange' | 'violet';
}

function OverviewCard({ label, value, icon, color }: OverviewCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    orange: 'text-orange-600 bg-orange-50 border-orange-100',
    violet: 'text-violet-600 bg-violet-50 border-violet-100',
  };

  return (
    <Card className="p-6 rounded-[2rem] border-slate-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border transition-transform group-hover:scale-110 ${colorClasses[color]}`}>
        {isValidElement(icon) ? cloneElement(icon as ReactElement<{ size?: number }>, { size: 18 }) : icon}
      </div>
      <div>
        <p className="text-3xl font-black tracking-tight text-slate-900 leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-2">{label}</p>
      </div>
    </Card>
  );
}