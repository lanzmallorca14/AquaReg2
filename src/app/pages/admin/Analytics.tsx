import { useMemo, type ReactNode } from 'react';
import { useAquaData } from '../../components/context/AquaRegCONTEXT';
import { 
  BarChart3, Calendar, Clock, Ship, 
  TrendingUp, Layers, 
  MapPin, Printer, Activity, Anchor, Waves,
  PieChart as PieChartIcon, FileText, CheckCircle2, AlertCircle,
  FileCheck2, Compass, XCircle, Award, BarChart2
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

// SVG Pie/Donut Chart Component
function DetailedPieChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((acc, [_, count]) => acc + count, 0);

  if (total === 0) return <div className="text-center text-slate-300 text-xs py-10">No data available</div>;

  const colors = ['#2563eb', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];
  let cumulativeAngle = 0;

  const slices = entries.map(([label, count], index) => {
    const percentage = count / total;
    const angle = percentage * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;

    const x1 = 50 + 40 * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y1 = 50 + 40 * Math.sin((Math.PI * (startAngle - 90)) / 180);
    const x2 = 50 + 40 * Math.cos((Math.PI * (startAngle + angle - 90)) / 180);
    const y2 = 50 + 40 * Math.sin((Math.PI * (startAngle + angle - 90)) / 180);
    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = total === count 
      ? `M 50 10 A 40 40 0 1 1 49.99 10 Z`
      : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      label,
      count,
      percentage: (percentage * 100).toFixed(1),
      color: colors[index % colors.length],
      pathData,
    };
  });

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
      <div className="relative w-52 h-52 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform drop-shadow-xl">
          {slices.map((slice, i) => (
            <path key={i} d={slice.pathData} fill={slice.color} className="transition-all duration-300 hover:opacity-80 stroke-white stroke-[0.5]" />
          ))}
          <circle cx="50" cy="50" r="26" fill="#ffffff" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Share</span>
          <span className="text-base font-black text-slate-900 italic">{total}</span>
        </div>
      </div>

      <div className="w-full space-y-2.5 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none">
            <div className="flex items-center gap-2.5 truncate pr-2">
              <span className="w-3 h-3 rounded-md shrink-0 shadow-sm" style={{ backgroundColor: slice.color }} />
              <span className="font-bold text-slate-700 truncate">{slice.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-black text-slate-400">{slice.count} units</span>
              <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">{slice.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AquaRegAnalytics() {
  const context = useAquaData();
  const vessels = context?.Vessels || context?.Vessels || [];
  const loading = context?.loading || false;

  // --- COMPREHENSIVE ANALYTICS ENGINE ---
  const report = useMemo(() => {
    const stats = {
      daily: {} as Record<string, number>,
      monthly: {} as Record<string, number>,
      yearly: {} as Record<string, number>,
      typeDist: {} as Record<string, number>,
      barangayDist: {} as Record<string, number>,
      motorizedCount: 0,
      nonMotorizedCount: 0,
      gearCount: 0,
      payaoCount: 0,
      pangulongCount: 0,
    };

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const approvedVessels = vessels.filter((v: any) => {
      if (!v) return false;
      const status = String(v.status || '').toLowerCase();
      return status === 'passed' || status === 'registered' || status === 'ready';
    });

    approvedVessels.forEach((v: any) => {
      let date = v.createdAt || v.created_at ? new Date(v.createdAt || v.created_at) : new Date();
      if (isNaN(date.getTime())) {
        date = new Date();
      }
      
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex] || "Unknown";
      const dKey = `${monthName.substring(0, 3)} ${date.getDate()}`;
      const mKey = monthName;
      const yKey = date.getFullYear().toString();

      stats.daily[dKey] = (stats.daily[dKey] || 0) + 1;
      stats.monthly[mKey] = (stats.monthly[mKey] || 0) + 1;
      stats.yearly[yKey] = (stats.yearly[yKey] || 0) + 1;

      const category = getAssetCategory(v);
      const tKey = category.toUpperCase();
      stats.typeDist[tKey] = (stats.typeDist[tKey] || 0) + 1;

      const rawBarangay = v.barangay || 'Not Specified';
      const bKey = String(rawBarangay).toUpperCase();
      stats.barangayDist[bKey] = (stats.barangayDist[bKey] || 0) + 1;

      if (category === 'motorized') stats.motorizedCount++;
      else if (category === 'non-motorized') stats.nonMotorizedCount++;
      else if (category === 'fishing-gear') stats.gearCount++;
      else if (category === 'payao-balsa') stats.payaoCount++;
      else if (category === 'pangulong') stats.pangulongCount++;
    });

    return stats;
  }, [vessels]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Compiling Marine Registry Calculations...</p>
      </div>
    );
  }

  // Application Verification Counts
  const approvedVessels = vessels.filter((v: any) => {
    if (!v) return false;
    const status = String(v.status || '').toLowerCase();
    return status === 'passed' || status === 'registered' || status === 'ready';
  });

  const totalCount = vessels.length;
  const approvedCount = approvedVessels.length;
  const pendingCount = vessels.filter((v: any) => String(v?.status || '').toLowerCase() === 'pending').length;
  const rejectedCount = vessels.filter((v: any) => {
    const s = String(v?.status || '').toLowerCase();
    return s === 'rejected' || s === 'denied' || s === 'failed';
  }).length;

  const completionPercentage = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : "0.0";
  const pendingPercentage = totalCount > 0 ? ((pendingCount / totalCount) * 100).toFixed(1) : "0.0";
  const rejectedPercentage = totalCount > 0 ? ((rejectedCount / totalCount) * 100).toFixed(1) : "0.0";

  // Top Barangays & Dominant Fleet
  const sortedBarangays = Object.entries(report.barangayDist).sort((a, b) => b[1] - a[1]);
  const topBarangay = sortedBarangays[0] ? sortedBarangays[0][0] : 'N/A';
  const topBarangayCount = sortedBarangays[0] ? sortedBarangays[0][1] : 0;
  
  const totalCraft = report.motorizedCount + report.nonMotorizedCount;
  const motorizedShare = totalCraft > 0 ? ((report.motorizedCount / totalCraft) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 lg:p-10 space-y-10 animate-in fade-in duration-700 font-sans print:bg-white print:p-0">
      
      {/* --- ADMINISTRATIVE ACTIONS (Hidden on Print) --- */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest h-11 px-6 shadow-lg">
            <Printer size={16} className="mr-2" /> Print Executive Report
          </Button>
        </div>
        <div className="flex items-center gap-2 text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
           <Activity size={14} className="animate-pulse text-emerald-500" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Live Database Sync</span>
        </div>
      </div>

      {/* --- DASHBOARD HEADER --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <BarChart3 size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Comprehensive Intelligence</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
            Registry <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Statistical Performance & Fleet Composition Report</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto">
            <div className="px-6 py-4 bg-slate-900 rounded-[1.8rem] text-white shadow-xl">
              <p className="text-[9px] font-black uppercase opacity-50 tracking-widest">Total Database</p>
              <p className="text-3xl font-black italic">{totalCount}</p>
            </div>
            <div className="px-6 py-4 bg-blue-600 rounded-[1.8rem] text-white shadow-xl">
              <p className="text-[9px] font-black uppercase opacity-50 tracking-widest">Certified Assets</p>
              <p className="text-3xl font-black italic">{approvedCount}</p>
            </div>
            <div className="px-6 py-4 bg-emerald-600 rounded-[1.8rem] text-white shadow-xl col-span-2 md:col-span-1">
              <p className="text-[9px] font-black uppercase opacity-50 tracking-widest">Compliance Rate</p>
              <p className="text-3xl font-black italic">{completionPercentage}%</p>
            </div>
        </div>
      </header>

      {/* --- ROW 1: REGISTRATION VELOCITY & TRAFFIC --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TimeCard title="Recent Registrations" data={report.daily} icon={<Clock className="text-blue-500" />} color="bg-blue-500" />
        <TimeCard title="Monthly Registration Volume" data={report.monthly} icon={<Calendar className="text-emerald-500" />} color="bg-emerald-500" />
        <TimeCard title="Annual Growth Patterns" data={report.yearly} icon={<TrendingUp className="text-indigo-500" />} color="bg-indigo-500" />
      </div>

      {/* --- ROW 2: ADVANCED VISUAL GRAPHICAL ANALYTICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Category Breakdown Bar Chart */}
        <Card className="lg:col-span-6 rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="p-8 border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="text-slate-900" size={20} />
              <CardTitle className="text-xs font-black uppercase tracking-widest">Asset Category Distribution Graph</CardTitle>
            </div>
            <Badge className="bg-slate-900 text-white text-[9px] font-black uppercase px-3 py-1">Units Breakdown</Badge>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {Object.entries(report.typeDist).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
              const computedWidth = approvedCount > 0 ? ((count / approvedCount) * 100).toFixed(1) : "0";
              return (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      {label.includes('GEAR') || label.includes('PAYAO') ? <Waves size={14} className="text-blue-500"/> : <Ship size={14} className="text-slate-500"/>}
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">{label.replace('-', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 italic">{count}</span>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{computedWidth}%</span>
                    </div>
                  </div>
                  
                  <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 flex shadow-inner">
                    <div 
                      className="h-full bg-slate-900 rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${computedWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Barangay Visual Share Donut Graph */}
        <Card className="lg:col-span-6 rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
          <CardHeader className="p-8 border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <PieChartIcon className="text-blue-600" size={20} />
              <CardTitle className="text-xs font-black uppercase tracking-widest">Geographic Concentration Share</CardTitle>
            </div>
            <Badge className="bg-blue-600 text-white text-[9px] font-black uppercase px-3 py-1">Top Barangays</Badge>
          </CardHeader>
          <CardContent className="p-8">
            <DetailedPieChart data={report.barangayDist} />
          </CardContent>
        </Card>
      </div>

      {/* --- ROW 3: DETAILED GEOGRAPHIC LEADERBOARD & METRICS --- */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden bg-white">
        <CardHeader className="p-8 border-b bg-slate-50/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="text-blue-600" size={20} />
            <CardTitle className="text-xs font-black uppercase tracking-widest">Barangay Geographic Registry Density</CardTitle>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{sortedBarangays.length} Barangays Total</span>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {sortedBarangays.map(([brgy, count], idx) => {
               const percentage = approvedCount > 0 ? ((count / approvedCount) * 100).toFixed(1) : "0.0";
               return (
                 <div key={brgy} className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50/50 transition-all space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center">#{idx + 1}</span>
                        <span className="text-xs font-black text-slate-800 uppercase truncate max-w-[130px]">{brgy}</span>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 font-black text-[10px] px-2.5 py-0.5 rounded-md">{count} Units</Badge>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                      <span>Market Share</span>
                      <span className="text-slate-900 font-black">{percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                 </div>
               );
             })}
          </div>
        </CardContent>
      </Card>

      {/* --- ROW 4: AUDIT STATUS & VERIFICATION METRICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="rounded-[2rem] border-slate-100 shadow-xl p-6 bg-white flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Verification Status</p>
              <h3 className="text-3xl font-black italic text-emerald-600">{approvedCount} Certified</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl"><CheckCircle2 className="text-emerald-500" size={20} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-bold text-slate-400">
            <span>Verified Rate</span>
            <span className="text-slate-900 font-black">{completionPercentage}%</span>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 shadow-xl p-6 bg-white flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Inspection Queue</p>
              <h3 className="text-3xl font-black italic text-amber-500">{pendingCount} Pending</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl"><Clock className="text-amber-500" size={20} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-bold text-slate-400">
            <span>Pending Rate</span>
            <span className="text-slate-900 font-black">{pendingPercentage}%</span>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 shadow-xl p-6 bg-white flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Flagged Applications</p>
              <h3 className="text-3xl font-black italic text-rose-500">{rejectedCount} Rejected</h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl"><XCircle className="text-rose-500" size={20} /></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between text-[10px] font-bold text-slate-400">
            <span>Rejection Rate</span>
            <span className="text-slate-900 font-black">{rejectedPercentage}%</span>
          </div>
        </Card>
      </div>

      {/* --- ROW 5: SPECIFIC ASSET METRIC CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <InsightCard title="Motorized Vessels" value={report.motorizedCount} icon={<Anchor className="text-blue-500" />} trend={`${motorizedShare}% of Craft`} />
          <InsightCard title="Non-Motorized" value={report.nonMotorizedCount} icon={<Ship className="text-slate-400" />} trend="Traditional Units" />
          <InsightCard title="Fishing Gear" value={report.gearCount} icon={<Waves className="text-indigo-500" />} trend="Registered Tackle" />
          <InsightCard title="Payao / Balsa" value={report.payaoCount} icon={<Compass className="text-emerald-500" />} trend="Stationary Structures" />
          <InsightCard title="Pangulong Units" value={report.pangulongCount} icon={<Award className="text-purple-500" />} trend="Commercial Assets" />
      </div>

      {/* --- ROW 6: DETAILED EXECUTIVE PRINT EXPLANATION & OFFICIAL REPORT --- */}
      <Card className="rounded-[2.5rem] border-slate-200 shadow-2xl bg-slate-900 text-white overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black print:mt-4">
        <CardHeader className="p-8 border-b border-slate-800 print:border-slate-300">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-blue-400 print:text-blue-600" />
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-white print:text-black">
                Municipal Fisheries Administrative & Statistical Report
              </CardTitle>
              <p className="text-[10px] text-slate-400 print:text-slate-600 uppercase tracking-wider font-bold">Official Document for Regulatory Audit & Public Record</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8 text-slate-300 print:text-slate-800 text-sm leading-relaxed">
          
          {/* Executive Overview */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 print:text-blue-600 flex items-center gap-2">
              <FileCheck2 size={16} /> 1. Executive Summary & Registration Completion
            </h4>
            <p className="text-xs">
              As of the current reporting period, the municipal database records a total volume of <strong className="text-white print:text-black">{totalCount} registered entries</strong> across all aquatic asset categories. Among these, <strong className="text-white print:text-black">{approvedCount} assets ({completionPercentage}%)</strong> have successfully completed evaluation, physical inspection, and safety verification, earning official certification. A total of <strong className="text-white print:text-black">{pendingCount} applications ({pendingPercentage}%)</strong> remain under technical review, while <strong className="text-white print:text-black">{rejectedCount} applications ({rejectedPercentage}%)</strong> were denied or flagged for non-compliance.
            </p>
          </div>

          {/* Fleet Composition Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800 print:border-slate-300">
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 print:text-blue-600 flex items-center gap-2">
                <BarChart2 size={16} /> 2. Fleet & Asset Breakdown
              </h4>
              <p className="text-xs">
                The registered watercraft fleet consists of <strong className="text-white print:text-black">{report.motorizedCount} motorized vessels</strong> (representing {motorizedShare}% of total crafts) and <strong className="text-white print:text-black">{report.nonMotorizedCount} non-motorized vessels</strong>. Additionally, the registry includes <strong className="text-white print:text-black">{report.gearCount} registered fishing gears</strong>, <strong className="text-white print:text-black">{report.payaoCount} Payao/Balsa stationary structures</strong>, and <strong className="text-white print:text-black">{report.pangulongCount} specialized Pangulong commercial vessels</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 print:text-blue-600 flex items-center gap-2">
                <MapPin size={16} /> 3. Geographic Concentration
              </h4>
              <p className="text-xs">
                Geographic analysis indicates that <strong className="text-white print:text-black">{topBarangay}</strong> exhibits the highest density of registered assets with <strong className="text-white print:text-black">{topBarangayCount} certified units</strong>. Patrols, licensing renewal drives, and enforcement monitoring should prioritize top-performing coastal zones to maintain regulatory compliance.
              </p>
            </div>
          </div>

          {/* Administrative Recommendations */}
          <div className="pt-4 border-t border-slate-800 print:border-slate-300 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 print:text-blue-600 flex items-center gap-2">
              <AlertCircle size={16} /> 4. Actionable Recommendations
            </h4>
            <ul className="list-disc pl-5 text-xs space-y-1 text-slate-300 print:text-slate-700">
              <li>Accelerate inspection workflows for the remaining <strong>{pendingCount} pending applications</strong> to reach targeted 100% database compliance.</li>
              <li>Conduct mobile registration caravans in lower-density Barangays to onboard traditional non-motorized fisherfolk into the official registry.</li>
              <li>Verify that all <strong>{report.payaoCount} Payao/Balsa installations</strong> adhere to municipal water zoning guidelines to prevent navigational hazards.</li>
            </ul>
          </div>

          {/* Official Signature Footer for Printed Documents */}
          <div className="hidden print:block pt-16 mt-16 border-t border-slate-400">
            <div className="grid grid-cols-2 gap-12">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500">Report Certified By:</p>
                <div className="mt-12 border-t border-slate-900 pt-2">
                  <p className="text-xs font-black uppercase">Municipal Agriculture Officer / Fisheries Head</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Bureau of Fisheries and Aquatic Resources</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase text-slate-500">Date of Issuance & Official Stamp:</p>
                <div className="mt-12 border-t border-slate-900 pt-2 flex justify-between items-center">
                  <p className="text-xs font-bold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <span className="text-[9px] font-black text-slate-400 border border-slate-300 px-3 py-1 uppercase">Official Seal</span>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}

// --- REUSABLE SUB-COMPONENTS ---

function TimeCard({ title, data, icon, color }: any) {
  const entries = Object.entries(data).slice(-5).reverse();

  return (
    <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden hover:scale-[1.01] transition-all duration-500 bg-white">
      <CardHeader className="p-7 bg-slate-50/50 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</CardTitle>
        <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
      </CardHeader>
      <CardContent className="p-7 space-y-5">
        {entries.length > 0 ? entries.map(([label, count]: any) => (
          <div key={label} className="flex justify-between items-center group">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-slate-900 transition-colors">{label}</span>
            <div className="flex items-center gap-4">
               <div className={`h-1.5 w-16 rounded-full opacity-20 ${color} hidden md:block`} />
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
  icon: ReactNode;
  trend: string;
}

function InsightCard({ title, value, icon, trend }: InsightCardProps) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-xl p-6 bg-white flex flex-col justify-between hover:-translate-y-1 transition-transform">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
          <h3 className="text-3xl font-black italic text-slate-900">{value}</h3>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-2xl">{icon}</div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-50">
        <p className="text-[9px] font-bold text-slate-400 uppercase italic flex items-center gap-1">
          <TrendingUp size={10} className="text-emerald-500" /> {trend}
        </p>
      </div>
    </Card>
  );
}