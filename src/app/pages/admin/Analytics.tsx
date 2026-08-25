import React, { useMemo } from 'react';
import { useAquaData } from '../../components/context/AquaRegCONTEXT';
import { 
  BarChart3, Calendar, Clock, Ship, 
  TrendingUp, Layers, ShieldCheck,
  MapPin, Printer, Activity, Anchor, Waves
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

// Asset category mapping consistent with the records page
type SubType = 'motorized' | 'non-motorized' | 'pangulong' | 'fishing-gear' | 'payao-balsa' | 'others';

const getAssetCategory = (record: any): SubType => {
  if (!record) return 'fishing-gear';

  const vType = (record.type || '').toUpperCase();
  const assetCat = (record.assetCategory || '').toUpperCase();

  if (vType.includes('PANGULONG') || assetCat.includes('PANGULONG'))
    return 'pangulong';

  if (vType.includes('PAYAO') || vType.includes('BALSA') || assetCat.includes('PAYAO'))
    return 'payao-balsa';

  if (record.isMotorized || record.is_motorized)
    return 'motorized';

  if (vType.includes('NON-MOTORIZED') || assetCat.includes('NON-MOTORIZED'))
    return 'non-motorized';

  return 'fishing-gear';
};

export default function AquaRegAnalytics() {
  // Pull vessels along with the cloud backend loading state with robust context safety
  const context = useAquaData();
  const vessels = context?.Vessels || context?.Vessels || [];
  const loading = context?.loading || false;

  // --- ANALYTICS ENGINE MATCHING APPROVED RECORDS FROM RECORDS PAGE ---
  const report = useMemo(() => {
    const stats = {
      daily: {} as Record<string, number>,
      monthly: {} as Record<string, number>,
      yearly: {} as Record<string, number>,
      typeDist: {} as Record<string, number>,
      barangayDist: {} as Record<string, number>,
      motorizedCount: 0,
      nonMotorizedCount: 0,
    };

    // Static months translation reference map to safeguard locale parsing bugs
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Filter to only count approved/registered records matching the records page criteria
    const approvedVessels = vessels.filter((v: any) => {
      if (!v) return false;
      const status = String(v.status || '').toLowerCase();
      return status === 'passed' || status === 'registered' || status === 'ready';
    });

    approvedVessels.forEach((v: any) => {
      // 1. Fixed Temporal Key Tracking using deterministic UTC/ISO references + Invalid Date Guard
      let date = v.createdAt || v.created_at ? new Date(v.createdAt || v.created_at) : new Date();
      if (isNaN(date.getTime())) {
        date = new Date(); // Fallback to current date if parsing fails to prevent runtime crash
      }
      
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex] || "Unknown";
      const dKey = `${monthName.substring(0, 3)} ${date.getDate()}`;
      const mKey = monthName;
      const yKey = date.getFullYear().toString();

      stats.daily[dKey] = (stats.daily[dKey] || 0) + 1;
      stats.monthly[mKey] = (stats.monthly[mKey] || 0) + 1;
      stats.yearly[yKey] = (stats.yearly[yKey] || 0) + 1;

      // 2. Asset Category Selection Check using exact records page helper
      const category = getAssetCategory(v);
      const tKey = category.toUpperCase();
      stats.typeDist[tKey] = (stats.typeDist[tKey] || 0) + 1;

      // 3. Geographic Heatmap Parameters with String Guard
      const rawBarangay = v.barangay || 'Not Specified';
      const bKey = String(rawBarangay).toUpperCase();
      stats.barangayDist[bKey] = (stats.barangayDist[bKey] || 0) + 1;

      // 4. Engine Configuration Property Check
      if (category === 'motorized') {
        stats.motorizedCount++;
      } else if (category === 'non-motorized') {
        stats.nonMotorizedCount++;
      }
    });

    return stats;
  }, [vessels]);

  const handlePrint = () => {
    window.print();
  };

  // Safe fallback to prevent rendering inaccurate calculations before database download ends
  if (loading) {
    return (
      <div className="p-6 lg:p-10 min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Compiling Registry Calculations...</p>
      </div>
    );
  }

  // Calculate statistics based on approved official records
  const approvedVessels = vessels.filter((v: any) => {
    if (!v) return false;
    const status = String(v.status || '').toLowerCase();
    return status === 'passed' || status === 'registered' || status === 'ready';
  });

  const totalCount = vessels.length;
  const approvedCount = approvedVessels.length;
  const pendingCount = vessels.filter((v: any) => String(v?.status || '').toLowerCase() === 'pending').length;
  const completionPercentage = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 lg:p-10 space-y-10 animate-in fade-in duration-700 font-sans print:bg-white print:p-0">
      
      {/* --- ADMINISTRATIVE ACTIONS (Hidden on Print) --- */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest h-11 px-6">
            <Printer size={16} className="mr-2" /> Print Summary
          </Button>

        </div>
        <div className="flex items-center gap-2 text-slate-400">
           <Activity size={14} className="animate-pulse text-emerald-500" />
           <span className="text-[10px] font-black uppercase tracking-widest">Supabase Cloud Connected</span>
        </div>
      </div>

      {/* --- DASHBOARD HEADER --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <BarChart3 size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Administrative Insights</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
            Registry <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Comprehensive Certified Marine Assets Report</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="px-8 py-5 bg-slate-900 rounded-[2rem] text-white shadow-2xl">
              <p className="text-[9px] font-black uppercase opacity-50 tracking-widest">Total Database</p>
              <p className="text-3xl font-black italic">{totalCount}</p>
            </div>
            <div className="px-8 py-5 bg-blue-600 rounded-[2rem] text-white shadow-2xl">
              <p className="text-[9px] font-black uppercase opacity-50 tracking-widest">Official Registry</p>
              <p className="text-3xl font-black italic">{approvedCount}</p>
            </div>
        </div>
      </header>

      {/* --- ROW 1: GROWTH TRENDS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TimeCard title="Daily Traffic" data={report.daily} icon={<Clock className="text-blue-500" />} color="bg-blue-500" />
        <TimeCard title="Monthly Volume" data={report.monthly} icon={<Calendar className="text-emerald-500" />} color="bg-emerald-500" />
        <TimeCard title="Annual Growth" data={report.yearly} icon={<TrendingUp className="text-indigo-500" />} color="bg-indigo-500" />
      </div>

      {/* --- ROW 2: CATEGORICAL BREAKDOWN --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Category Distribution */}
        <Card className="lg:col-span-5 rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="p-8 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Layers className="text-slate-900" size={20} />
              <CardTitle className="text-xs font-black uppercase tracking-widest">Asset Category Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {Object.entries(report.typeDist).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
              const computedWidth = approvedCount > 0 ? (count / approvedCount) * 100 : 0;
              return (
                <div key={label} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      {label.includes('GEAR') || label.includes('PAYAO') ? <Waves size={14} className="text-blue-500"/> : <Ship size={14} className="text-slate-400"/>}
                      <span className="text-[10px] font-black uppercase text-slate-500">{label.replace('-', ' ')}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 italic">
                      {count} <span className="text-[10px] text-slate-400 not-italic">UNITS</span>
                    </span>
                  </div>
                  
                  {/* --- PROGRESS BAR FIXED WITHOUT INLINE STYLES --- */}
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1">
                    <div 
                      className={`h-full bg-slate-900 rounded-full transition-all duration-1000 shadow-sm [width:${computedWidth}%]`}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Barangay Heatmap */}
        <Card className="lg:col-span-7 rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="p-8 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <MapPin className="text-blue-600" size={20} />
              <CardTitle className="text-xs font-black uppercase tracking-widest">Geographic Concentrations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
               {Object.entries(report.barangayDist).sort((a, b) => b[1] - a[1]).map(([brgy, count]) => (
                 <div key={brgy} className="flex justify-between items-center py-2 border-b border-slate-50 group hover:bg-slate-50 transition-colors px-2 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-blue-600">{brgy}</span>
                    <Badge className="bg-slate-100 text-slate-900 font-black text-[10px] px-3 py-1 rounded-full">{count}</Badge>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- ROW 3: ENGINE & PERFORMANCE --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <InsightCard title="Motorized Units" value={report.motorizedCount} icon={<Anchor className="text-blue-500" />} trend="Active Certified Vessels" />
          <InsightCard title="Non-Motorized" value={report.nonMotorizedCount} icon={<Anchor className="text-slate-400" />} trend="Traditional Marine Assets" />
          <InsightCard title="Registry Ratio" value={`${completionPercentage}%`} icon={<ShieldCheck className="text-emerald-500" />} trend="Approved vs Total" />
          <InsightCard title="Pending Review" value={pendingCount} icon={<Clock className="text-amber-500" />} trend="Requires Verification" />
      </div>

    </div>
  );
}

// --- REUSABLE SUB-COMPONENTS ---

function TimeCard({ title, data, icon, color }: any) {
  const entries = Object.entries(data).slice(-5).reverse();

  return (
    <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden hover:scale-[1.02] transition-all duration-500 bg-white">
      <CardHeader className="p-7 bg-slate-50/50 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</CardTitle>
        <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
      </CardHeader>
      <CardContent className="p-7 space-y-5">
        {entries.length > 0 ? entries.map(([label, count]: any) => (
          <div key={label} className="flex justify-between items-center group">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-slate-900 transition-colors">{label}</span>
            <div className="flex items-center gap-4">
               <div className={`h-1 w-16 rounded-full opacity-10 ${color} hidden md:block`} />
               <span className="text-2xl font-black italic text-slate-900 tracking-tighter">{count}</span>
            </div>
          </div>
        )) : (
          <div className="py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No Active Records</div>
        )}
      </CardContent>
    </Card>
  );
}

interface InsightCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
}

function InsightCard({ title, value, icon, trend }: InsightCardProps) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-xl p-8 bg-white flex flex-col justify-between hover:-translate-y-1 transition-transform">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
          <h3 className="text-4xl font-black italic text-slate-900">{value}</h3>
        </div>
        <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-50">
        <p className="text-[9px] font-bold text-slate-400 uppercase italic flex items-center gap-1">
          <TrendingUp size={10} className="text-emerald-500" /> {trend}
        </p>
      </div>
    </Card>
  );
}