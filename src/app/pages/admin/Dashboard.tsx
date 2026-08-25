import { useMemo, useState } from 'react';
import { useAquaData } from '../../components/context/AquaRegCONTEXT';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from "../../components/ui/button";
import { 
  Ship, Waves, Fish, LayoutDashboard, TrendingUp,
  Box, AlertCircle, Phone, Calendar,
  Loader2, Map, Clock,
  Bell, BellRing, X, CheckCircle2, DollarSign,
  Filter, Search, ArrowUpRight, ShieldCheck, RefreshCw, Printer
} from 'lucide-react';

export default function AquaRegAdminDashboard() {
  const { Vessels = [], loading } = useAquaData() || { Vessels: [], loading: false };
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('ALL');

  // --- ANALYTICS & EXPIRATION LOGIC ---
  const getExpirationStatus = (expiryDate: any) => {
    if (!expiryDate) return { label: 'No Date', color: 'text-slate-400', urgent: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return { label: 'Invalid Date', color: 'text-slate-400', urgent: false };
    
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', color: 'text-red-600', urgent: true };
    if (diffDays === 0) return { label: 'Today', color: 'text-red-500', urgent: true };
    if (diffDays <= 30) return { label: `${diffDays}d Left`, color: 'text-orange-500', urgent: true };
    return { label: 'Valid', color: 'text-emerald-500', urgent: false };
  };

  const getExpiryFromVessel = (v: any) => v.valid_until ?? v.validUntil ?? v.expiry_date ?? v.expiry ?? v.validity ?? null;
  const getGrossTonnageFromVessel = (v: any) => Number(v.gross_tonnage ?? v.grossTonnage ?? v.gt ?? v.tonnage ?? 1.5);
  const getContactNumberFromVessel = (v: any) => v.phone ?? v.phone_number ?? v.cp_number ?? v.contact_number ?? 'N/A';
  const getRegistrationFeeFromVessel = (v: any) => Number(v.registration_fee ?? v.registrationFee ?? v.fee ?? v.amount ?? 500);

  // --- MEMOIZED STATISTICS & COMPUTATIONS ---
  const { stats, notifications, uniqueBarangays } = useMemo(() => {
    const safeVessels = Array.isArray(Vessels) ? Vessels : [];
    
    const bMap: Record<string, number> = {};
    const gearMap: Record<string, number> = {};
    const alerts: any[] = [];
    
    let totalRevenue = 0;
    let totalTonnage = 0;
    let pendingCount = 0;
    let smallCraftCount = 0; // < 3 GT (Municipal)
    let commercialCraftCount = 0; // >= 3 GT

    safeVessels.forEach(v => {
      // Barangay breakdown
      const bName = v.barangay || 'Unassigned';
      bMap[bName] = (bMap[bName] || 0) + 1;

      // Gear taxonomy breakdown
      const gear = (v.gear_type || v.type || 'Unspecified').toUpperCase();
      gearMap[gear] = (gearMap[gear] || 0) + 1;

      // Financials & Gross Tonnage estimation
      const fee = getRegistrationFeeFromVessel(v);
      totalRevenue += isNaN(fee) ? 0 : fee;

      const gt = getGrossTonnageFromVessel(v);
      totalTonnage += isNaN(gt) ? 0 : gt;
      if (gt >= 3) commercialCraftCount++; else smallCraftCount++;

      // Status check
      const statusStr = (v.status || '').toUpperCase();
      if (['PENDING', 'UNDER_REVIEW', 'SUBMITTED'].includes(statusStr)) {
        pendingCount++;
      }

      // Notification logic
      const status = getExpirationStatus(getExpiryFromVessel(v));
      if (status.urgent) {
        alerts.push({
          id: `exp-${v.id}`,
          type: 'URGENT',
          title: 'Permit Expiry',
          message: `${v.vessel_name || v.gear_type || 'Asset'} (${v.owner_name || 'N/A'}) requires immediate renewal.`,
          time: status.label,
          icon: <AlertCircle size={14} className="text-red-500" />
        });
      }
    });

    alerts.push({
      id: 'sys-sync',
      type: 'INFO',
      title: 'Database Synchronized',
      message: 'Cloud registry active with realtime update stream.',
      time: 'Just now',
      icon: <CheckCircle2 size={14} className="text-emerald-500" />
    });

    return {
      notifications: alerts,
      uniqueBarangays: Object.keys(bMap).sort(),
      stats: {
        totalRevenue,
        avgTonnage: safeVessels.length > 0 ? (totalTonnage / safeVessels.length).toFixed(1) : '0',
        pendingCount,
        smallCraftCount,
        commercialCraftCount,
        motorized: safeVessels.filter(v => v.is_motorized).length,
        nonMotorized: safeVessels.filter(v => !v.is_motorized).length,
        fishingGear: safeVessels.filter(v => (v.type || v.asset_category || '').toLowerCase().includes('gear')).length,
        payaoBalsa: safeVessels.filter(v => (v.type || v.asset_category || '').toLowerCase().match(/payao|balsa/)).length,
        activePermits: safeVessels.filter(v => ['PASSED', 'APPROVED', 'REGISTERED', 'ACTIVE'].includes((v.status || '').toUpperCase())).length,
        critical: safeVessels.filter(v => getExpirationStatus(getExpiryFromVessel(v)).urgent),
        recent: [...safeVessels].reverse().slice(0, 5),
        barangayData: Object.entries(bMap).sort((a, b) => b[1] - a[1]).slice(0, 6),
        gearData: Object.entries(gearMap).sort((a, b) => b[1] - a[1]).slice(0, 4)
      }
    };
  }, [Vessels]);

  const complianceRate = Vessels.length > 0 ? Math.round((stats.activePermits / Vessels.length) * 100) : 0;

  // Filtered vessel dataset for search/filter operations
  const filteredVessels = useMemo(() => {
    return Vessels.filter(v => {
      const nameMatch = (v.vessel_name || v.gear_type || '').toLowerCase().includes(searchTerm.toLowerCase());
      const ownerMatch = (v.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const brgyMatch = selectedBarangay === 'ALL' || (v.barangay || 'Unassigned') === selectedBarangay;
      return (nameMatch || ownerMatch) && brgyMatch;
    });
  }, [Vessels, searchTerm, selectedBarangay]);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="animate-spin mb-4 text-blue-500" size={40} />
      <p className="font-black uppercase tracking-widest text-xs italic text-blue-600">Syncing Municipal Database...</p>
    </div>
  );

  return (
    <div className="pt-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative">
      
      {/* --- NOTIFICATION PANEL OVERLAY --- */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-black uppercase italic tracking-tighter text-slate-900">Notifications ({notifications.length})</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(false)}><X/></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.map(n => (
                <div key={n.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-colors">
                  <div className="flex gap-3">
                    <div className="mt-1">{n.icon}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black uppercase text-slate-400">{n.type}</p>
                        <p className="text-[8px] font-bold text-blue-500 uppercase">{n.time}</p>
                      </div>
                      <p className="text-xs font-black uppercase italic text-slate-800 mt-1">{n.title}</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200 pb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Bureau of Fisheries & Aquatic Resources Registry</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">Command <span className="text-blue-600">Center</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNotifications(true)}
            className="h-12 w-12 rounded-2xl border-2 border-slate-200 bg-white flex items-center justify-center relative hover:border-blue-600 transition-all"
          >
            {notifications.length > 1 ? <BellRing className="text-blue-600 animate-bounce" size={20} /> : <Bell size={20} className="text-slate-400" />}
            {notifications.length > 1 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-4 ring-white">{notifications.length - 1}</span>}
          </button>
          <Button className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white px-6 shadow-xl shadow-slate-200 hover:bg-blue-600 transition-colors">
            <Printer size={16} className="mr-2" /> Export Audit Log
          </Button>
        </div>
      </div>

      {/* --- TOP METRICS & FINANCIALS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPIStat title="Total Registered" count={Vessels.length} icon={<Ship size={18}/>} color="bg-white border text-slate-900" trend="+4% MTD" />
        <KPIStat title="Compliance Rate" count={`${complianceRate}%`} icon={<ShieldCheck size={18}/>} color="bg-blue-600 text-white" trend="Target 90%" />
        <KPIStat title="Action Needed" count={stats.critical.length} icon={<AlertCircle size={18}/>} color="bg-red-50 text-red-600 ring-1 ring-red-200" trend="Expired / Due" />
        <KPIStat title="Est. Revenue" count={`₱${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign size={18}/>} color="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" trend="Fees Collected" />
        <KPIStat title="Pending Review" count={stats.pendingCount} icon={<RefreshCw size={18}/>} color="bg-amber-50 text-amber-700 ring-1 ring-amber-200" trend="Queue Active" />
      </div>

      {/* --- QUICK ACTIONS & TOOLBAR --- */}
      <div className="bg-slate-900 rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between text-white shadow-xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search vessel or owner..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 text-xs font-bold pl-9 pr-4 py-2.5 rounded-xl border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
            <Filter size={14} className="text-slate-400" />
            <select 
              value={selectedBarangay} 
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-800 text-white">All Barangays</option>
              {uniqueBarangays.map(b => (
                <option key={b} value={b} className="bg-slate-800 text-white">Brgy. {b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Showing {filteredVessels.length} / {Vessels.length} Records
          </span>
        </div>
      </div>

      {/* --- MAIN DASHBOARD CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT COLUMN: REGIONAL HOTSPOTS & WATCHLIST --- */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* REGIONAL DISTRIBUTION */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Map size={20}/></div>
                <div>
                  <h3 className="text-lg font-black uppercase italic text-slate-900 leading-none">Barangay Density</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Vessel Concentrations by District</p>
                </div>
              </div>
              <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider">Top 6 Districts</span>
            </div>
            
            <div className="space-y-5">
              {stats.barangayData.map(([name, count], idx) => (
                <div key={name} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase text-slate-700 italic">Brgy. {name}</span>
                    <span className="text-[10px] font-black text-blue-600">{count} Registered Units ({Math.round((count / (Vessels.length || 1)) * 100)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                      style={{ width: `${(count / (Vessels.length || 1)) * 100}%`, opacity: Math.max(0.3, 1 - idx * 0.12) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CRITICAL WATCHLIST TABLE */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Calendar size={20}/></div>
                <div>
                  <h3 className="text-lg font-black uppercase italic text-slate-900">Permit Watchlist</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Licenses Expired or Due for Renewal</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase">
                {stats.critical.length} Action Needed
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b">
                  <tr>
                    <th className="px-8 py-4">Asset & Owner</th>
                    <th className="px-8 py-4">Barangay</th>
                    <th className="px-8 py-4">Contact</th>
                    <th className="px-8 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.critical.length > 0 ? stats.critical.slice(0, 5).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="font-black italic text-slate-900 uppercase text-xs">
                          {v.vessel_name || v.gear_type || 'Unnamed Asset'}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">{v.owner_name || 'N/A'}</div>
                      </td>
                      <td className="px-8 py-4 text-xs font-bold text-slate-600 uppercase">
                        {v.barangay || 'N/A'}
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-[11px] bg-slate-50 border px-3 py-1 rounded-xl w-fit">
                          <Phone size={10} className="text-blue-500" /> {getContactNumberFromVessel(v)}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className={`text-[10px] font-black uppercase ${getExpirationStatus(getExpiryFromVessel(v)).color}`}>
                          {getExpirationStatus(getExpiryFromVessel(v)).label}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-12 text-center text-slate-300 font-black uppercase italic text-[10px]">No critical issues flagged</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: ACTIVITY, ASSET METRICS & TONNAGE --- */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* RECENT REGISTRATION LOG */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <LayoutDashboard className="absolute -right-6 -top-6 h-24 w-24 text-white opacity-[0.03]" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center gap-2">
              <Clock size={14}/> Recent Registrations
            </h3>
            <div className="space-y-8 relative">
              {stats.recent.map((v, i) => (
                <div key={v.id} className="flex gap-4 relative">
                  {i !== stats.recent.length - 1 && <div className="absolute left-1.5 top-6 w-0.5 h-8 bg-slate-800" />}
                  <div className="h-3 w-3 rounded-full bg-blue-600 mt-1 z-10" />
                  <div>
                    <p className="text-[11px] font-black uppercase italic leading-none">
                      {v.vessel_name || v.gear_type || "Asset Modified"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[8px] bg-slate-800 text-blue-400 font-black px-2 py-0.5 rounded uppercase">
                        {v.barangay || 'Brgy. N/A'}
                      </span>
                      <span className="text-[8px] text-slate-400 font-black">
                        ID: {v.id?.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ASSET TAXONOMY & CLASSIFICATION */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Mix & Fleet Structure</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <AssetMiniCard label="Gears / Nets" count={stats.fishingGear} icon={<Fish size={14}/>} />
              <AssetMiniCard label="Payao / Balsa" count={stats.payaoBalsa} icon={<Box size={14}/>} />
              <AssetMiniCard label="Motorized Craft" count={stats.motorized} icon={<TrendingUp size={14}/>} />
              <AssetMiniCard label="Manual Paddle" count={stats.nonMotorized} icon={<Waves size={14}/>} />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500 uppercase text-[10px]">Municipal Fleet (&lt; 3 GT)</span>
                <span className="text-slate-900 font-black">{stats.smallCraftCount} Units</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500 uppercase text-[10px]">Commercial Fleet (&ge; 3 GT)</span>
                <span className="text-blue-600 font-black">{stats.commercialCraftCount} Units</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500 uppercase text-[10px]">Avg Fleet Tonnage</span>
                <span className="text-slate-900 font-black">{stats.avgTonnage} GT</span>
              </div>
            </div>
          </div>

          {/* TOP GEAR TYPES */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Top Gear Types</h3>
            <div className="space-y-3">
              {stats.gearData.map(([gear, count]) => (
                <div key={gear} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-xs font-black uppercase text-slate-700 italic">{gear}</span>
                  <span className="text-xs font-black text-blue-600 bg-white px-3 py-1 rounded-xl shadow-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- HELPER KPI STAT CARD ---
function KPIStat({ title, count, icon, color, trend }: any) {
  return (
    <Card className={`rounded-[2rem] border-none shadow-xs transition-all hover:-translate-y-1 duration-300 ${color}`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.1em] opacity-60">{title}</CardTitle>
        <div className="opacity-40">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black italic leading-none tracking-tighter">{count}</div>
        <p className="text-[9px] font-bold mt-3 uppercase opacity-50 flex items-center gap-1">
          <ArrowUpRight size={10}/> {trend}
        </p>
      </CardContent>
    </Card>
  );
}

// --- HELPER MINI CARD ---
function AssetMiniCard({ label, count, icon }: any) {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-colors">
      <div className="text-blue-600 mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-lg font-black italic text-slate-900 leading-none">{count}</p>
      <p className="text-[9px] font-black uppercase text-slate-400 mt-1">{label}</p>
    </div>
  );
}