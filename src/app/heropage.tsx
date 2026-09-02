import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, ShieldCheck, FileText, Anchor, Info, Ship, X, 
  Search, CalendarClock, ShieldAlert, MapPin, Activity, AlertTriangle, RotateCcw 
} from 'lucide-react';

import heroBg from './components/photo/romblom1.jpg';
import { useAquaData } from './components/context/AquaRegCONTEXT';

// Define strict TypeScript interface for Vessel objects
interface Vessel {
  id: string | number;
  status?: string;
  vessel_name?: string;
  owner_name?: string;
  owner?: string;
  gear_type?: string;
  barangay?: string;
  rejection_reason?: string;
  notes?: string;
  remarks?: string;
  scheduled_date?: string;
  inspection_date?: string;
  asset_category?: string;
  type?: string;
  is_motorized?: boolean;
}

export default function Homepage() {
  const navigate = useNavigate();
  const { Vessels = [], loading } = useAquaData();

  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [vesselSearch, setVesselSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'rejected'>('all');
  
  // Track selected vessel data if re-registering from a rejected item
  const [reRegisterData, setReRegisterData] = useState<Vessel | null>(null);

  // Standard "Register Vessel" flow (Fresh Registration)
  const handleRegisterClick = () => {
    setReRegisterData(null);
    localStorage.removeItem('reRegisterVesselData');
    localStorage.removeItem('isReRegistering');
    setShowTermsModal(true);
  };

  // Dedicated "Register Again" flow for Rejected/Flagged Items
  const handleReRegister = (vessel: Vessel) => {
    setReRegisterData(vessel);
    localStorage.setItem('reRegisterVesselData', JSON.stringify(vessel));
    localStorage.setItem('isReRegistering', 'true');
    setShowTermsModal(true);
  };

  const handleAcceptTerms = () => {
    setShowTermsModal(false);
    
    if (reRegisterData) {
      navigate('/new-registration', { 
        state: { 
          reRegisterVessel: reRegisterData, 
          isReAudit: true,
          existingId: reRegisterData.id,
          originalName: reRegisterData.vessel_name 
        } 
      });
    } else {
      localStorage.removeItem('reRegisterVesselData');
      localStorage.removeItem('isReRegistering');
      navigate('/new-registration');
    }
  };

  const scrollToDashboard = () => {
    const el = document.getElementById('vessels-dashboard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- DASHBOARD FOCUS: SCHEDULED & REJECTED / FLAGGED VESSELS ---
  const filteredVessels = useMemo(() => {
    return (Vessels as Vessel[]).filter((v) => {
      const vesselIdStr = String(v?.id || '');

      const status = (v?.status || '').toLowerCase();
      const isTargetStatus = ['scheduled', 'rejected', 'flagged'].includes(status);
      if (!isTargetStatus) return false;

      const normalizedStatus = status === 'flagged' ? 'rejected' : status;
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) {
        return false;
      }

      const query = vesselSearch.toLowerCase().trim();
      if (!query) return true;

      return (
        v.vessel_name?.toLowerCase().includes(query) ||
        v.owner_name?.toLowerCase().includes(query) ||
        v.gear_type?.toLowerCase().includes(query) ||
        v.barangay?.toLowerCase().includes(query) ||
        v.rejection_reason?.toLowerCase().includes(query) ||
        v.notes?.toLowerCase().includes(query) ||
        v.remarks?.toLowerCase().includes(query) ||
        vesselIdStr.toLowerCase().includes(query)
      );
    });
  }, [Vessels, vesselSearch, statusFilter]);

  const scheduledCount = useMemo(() => {
    return (Vessels as Vessel[]).filter((v) => v?.status?.toLowerCase() === 'scheduled').length;
  }, [Vessels]);

  const rejectedCount = useMemo(() => {
    return (Vessels as Vessel[]).filter((v) => {
      const status = (v?.status || '').toLowerCase();
      return status === 'rejected' || status === 'flagged';
    }).length;
  }, [Vessels]);

  return (
    <div 
      className="min-h-screen font-sans text-white flex flex-col relative antialiased bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className="absolute inset-0 bg-slate-900/50 -z-10" />

      {/* Navigation */}
      <nav className="w-full pt-4 px-4 sticky top-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto shadow-2xl rounded-full px-8 py-3 flex justify-between items-center border border-white/30 bg-white/10 backdrop-blur-2xl">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="p-2.5 bg-blue-600/90 rounded-xl text-white shadow-lg group-hover:scale-105 transition-transform border border-white/20">
              <Anchor size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-3xl text-white leading-none drop-shadow-md">AQUAREG</span>
              <span className="text-[11px] font-bold tracking-widest text-blue-300 uppercase leading-none mt-1">ROMBLON MARITIME</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button type="button" onClick={scrollToDashboard} className="hidden md:flex items-center gap-2 font-black uppercase text-xs tracking-wider text-white hover:text-blue-300 transition-colors drop-shadow-md">
              <Ship size={16} /> Audit Tracker
            </button>
            <button type="button" onClick={() => navigate('/about_us')} className="flex items-center gap-2 font-black uppercase text-xs tracking-wider text-white hover:text-blue-300 transition-colors drop-shadow-md">
              <Info size={16} /> About Us
            </button>
            <button type="button" onClick={() => navigate('/login')} className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase text-xs tracking-wider transition-all active:scale-95 shadow-lg border border-white/30">
              <Lock size={14} className="text-white" /> STAFF PORTAL
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 flex flex-col justify-center w-full gap-16">
        <div className="flex items-center justify-between gap-8 w-full">
          <div className="flex-1 flex flex-col items-start text-left space-y-8 p-10 md:p-14 w-full max-w-2xl bg-white/10 backdrop-blur-3xl border border-white/25 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/15 border border-white/30 rounded-full text-white backdrop-blur-md">
              <Anchor size={16} className="text-blue-300" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white">DEPT OF AGRICULTURE • ROMBLON</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-white leading-none">DIGITAL BOAT</h1>
              <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-blue-200 leading-none">REGISTRY</h1>
              <p className="max-w-xl text-white text-lg font-medium leading-relaxed pt-4">
                Streamlining maritime governance in Romblon. Register vessels, verify municipal permits, and track inspection schedules effortlessly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full">
              <button type="button" onClick={handleRegisterClick} className="flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 w-full sm:w-auto border border-white/20">
                REGISTER VESSEL -&gt;
              </button>
              <button type="button" onClick={() => navigate('/verify-permit')} className="px-8 py-5 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-md rounded-full font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg w-full sm:w-auto text-center">
                Verify Permit
              </button>
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-6 w-80">
            <div className="p-6 bg-white/10 backdrop-blur-3xl border border-white/25 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="p-3 bg-blue-600/80 border border-white/30 rounded-2xl text-white">
                <CalendarClock size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{scheduledCount}</h3>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Scheduled Audits</p>
              </div>
            </div>

            <div className="p-6 bg-white/10 backdrop-blur-3xl border border-white/25 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="p-3 bg-red-600/80 border border-white/30 rounded-2xl text-white">
                <ShieldAlert size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{rejectedCount}</h3>
                <p className="text-xs font-bold uppercase tracking-wider text-red-200">Flagged / Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Section - LINEUP TABLE VIEW */}
        <section id="vessels-dashboard" className="w-full pt-10">
          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/15 pb-8">
              <div>
                <div className="flex items-center gap-3 text-blue-300 font-bold text-xs uppercase tracking-widest mb-2">
                  <Activity size={18} /> Application Status Directory
                </div>
                <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-white leading-none">
                  Scheduled &amp; Rejected Queue
                </h2>
                <p className="text-sm font-medium text-blue-100 mt-2 max-w-xl">
                  Public audit portal. Check whether your application has been scheduled for physical inspection or flagged due to invalid document/ID requirements.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-blue-900/40 border border-blue-400/30 rounded-2xl p-4 backdrop-blur-md">
                  <CalendarClock size={24} className="text-blue-400" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-200 tracking-wider">Scheduled</p>
                    <p className="text-xl font-black text-white leading-none">{scheduledCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-red-900/40 border border-red-400/30 rounded-2xl p-4 backdrop-blur-md">
                  <ShieldAlert size={24} className="text-red-400" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-red-200 tracking-wider">Rejected</p>
                    <p className="text-xl font-black text-white leading-none">{rejectedCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={18} />
                <input
                  type="text"
                  placeholder="Search name, ID, rejection reason, or barangay..."
                  value={vesselSearch}
                  onChange={(e) => setVesselSearch(e.target.value)}
                  className="w-full pl-12 pr-4 h-14 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button onClick={() => setStatusFilter('all')} className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${statusFilter === 'all' ? 'bg-blue-600 text-white border-white/40 shadow-lg' : 'bg-white/5 text-white/80 border-white/15 hover:bg-white/15'}`}>
                  All ({scheduledCount + rejectedCount})
                </button>
                <button onClick={() => setStatusFilter('scheduled')} className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${statusFilter === 'scheduled' ? 'bg-blue-600 text-white border-white/40 shadow-lg' : 'bg-white/5 text-blue-200 border-white/15 hover:bg-white/15'}`}>
                  <CalendarClock size={14} /> Scheduled ({scheduledCount})
                </button>
                <button onClick={() => setStatusFilter('rejected')} className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${statusFilter === 'rejected' ? 'bg-red-600 text-white border-white/40 shadow-lg' : 'bg-white/5 text-red-300 border-white/15 hover:bg-white/15'}`}>
                  <ShieldAlert size={14} /> Rejected ({rejectedCount})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest text-blue-200">Loading Audit Queue...</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-3xl border border-white/20 bg-slate-950/40 backdrop-blur-2xl shadow-xl">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/15 bg-white/5 text-[10px] font-black uppercase tracking-wider text-blue-200">
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Vessel / Asset Name</th>
                      <th className="py-4 px-6">Owner</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Schedule / Notice Details</th>
                      <th className="py-4 px-6 text-center">Location &amp; Type</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {filteredVessels.map((vessel) => {
                      const status = (vessel.status || '').toLowerCase();
                      const isRejected = status === 'rejected' || status === 'flagged';

                      return (
                        <tr 
                          key={vessel.id}
                          className={`transition-colors hover:bg-white/10 ${isRejected ? 'bg-red-950/20' : 'bg-blue-950/20'}`}
                        >
                          {/* Reg ID */}
                          <td className="py-4 px-6 font-mono font-bold text-white/60 text-[11px] whitespace-nowrap">
                            #{vessel.id}
                          </td>

                          {/* Vessel Name */}
                          <td className="py-4 px-6 font-black uppercase text-white tracking-tight">
                            {vessel.vessel_name || vessel.gear_type || 'UNNAMED ASSET'}
                          </td>

                          {/* Owner */}
                          <td className="py-4 px-6 font-bold text-blue-100 uppercase whitespace-nowrap">
                            {vessel.owner_name || vessel.owner || 'N/A'}
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${isRejected ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/40'}`}>
                              {isRejected ? <ShieldAlert size={12} /> : <CalendarClock size={12} />}
                              {vessel.status}
                            </span>
                          </td>

                          {/* Schedule / Rejection details */}
                          <td className="py-4 px-6 max-w-xs">
                            {isRejected ? (
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1">
                                  <AlertTriangle size={10} /> Rejection Reason
                                </span>
                                <p className="text-red-200 italic font-medium leading-tight truncate">
                                  {vessel.rejection_reason || vessel.notes || vessel.remarks || 'Invalid documents or contact details.'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                                  <CalendarClock size={10} /> Scheduled Inspection
                                </span>
                                <p className="text-white font-bold leading-tight">
                                  {(() => {
                                    const dateVal = vessel.scheduled_date || vessel.inspection_date;
                                    if (!dateVal) return 'Pending Date Confirmation';
                                    
                                    const date = new Date(dateVal);
                                    return !isNaN(date.getTime()) 
                                      ? date.toLocaleDateString() 
                                      : String(dateVal).split('T')[0];
                                  })()}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Barangay & Motorized Category */}
                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-white/80 font-bold uppercase flex items-center justify-center gap-1 text-[11px]">
                                <MapPin size={10} className="text-blue-400" /> {vessel.barangay || 'N/A'}
                              </span>
                              <span className="text-[9px] font-bold text-white/40 uppercase">
                                {vessel.asset_category || vessel.type || 'vessel'} • {vessel.is_motorized ? 'Motorized' : 'Non-Motorized'}
                              </span>
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            {isRejected ? (
                              <button
                                type="button"
                                onClick={() => handleReRegister(vessel)}
                                className="inline-flex items-center gap-1.5 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 border border-white/20"
                              >
                                <RotateCcw size={12} /> Register Again
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                                Inspection Active
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredVessels.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center space-y-2">
                          <ShieldAlert size={36} className="mx-auto text-white/40" />
                          <p className="text-sm font-black uppercase text-white/70">No Scheduled or Rejected records found</p>
                          <p className="text-xs text-white/40">Try searching for another applicant name or registration ID.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full pb-12 px-6 flex flex-col sm:flex-row justify-center items-center gap-6 text-white">
        <div className="flex items-center gap-4 bg-white/10 px-8 py-5 rounded-2xl border border-white/25 backdrop-blur-3xl shadow-xl w-full sm:w-auto max-w-sm">
          <ShieldCheck size={38} className="text-blue-300" strokeWidth={2} />
          <div className="text-left">
            <h4 className="text-lg font-black text-white leading-tight">SECURE</h4>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-200">GOVERNMENT ENCRYPTED</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 px-8 py-5 rounded-2xl border border-white/25 backdrop-blur-3xl shadow-xl w-full sm:w-auto max-w-sm">
          <FileText size={38} className="text-blue-300" strokeWidth={2} />
          <div className="text-left">
            <h4 className="text-lg font-black text-white leading-tight">INSTANT</h4>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-200">DIGITAL CERTIFICATES</p>
          </div>
        </div>
      </footer>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-slate-900/90 border border-white/20 rounded-3xl shadow-2xl p-8 text-white backdrop-blur-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/90 rounded-xl text-white">
                  <FileText size={20} />
                </div>
                <h3 className="text-xl font-black tracking-wide">
                  {reRegisterData ? 'Re-Audit Terms & Guidelines' : 'Terms & Privacy Policy'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowTermsModal(false)} className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="my-6 overflow-y-auto space-y-4 pr-2 text-sm text-white/80 leading-relaxed">
              {reRegisterData && (
                <div className="p-4 bg-red-900/40 border border-red-500/30 rounded-2xl mb-4">
                  <p className="text-xs font-bold text-red-200">
                    <span className="font-black uppercase text-red-400 block mb-1">Re-Audit Notice for Reg ID #{reRegisterData.id}:</span>
                    You are re-submitting an application for <strong className="text-white uppercase">{reRegisterData.vessel_name || reRegisterData.gear_type}</strong>. Updating information will modify or replace the existing record in the database.
                  </p>
                </div>
              )}

              <h4 className="font-bold text-white text-base">1. Acceptance of Terms</h4>
              <p>By accessing and using the AQUAREG Romblon Maritime Digital Boat Registry, you agree to comply with and be bound by these terms, government regulations, and local maritime policies.</p>

              <h4 className="font-bold text-white text-base">2. Data Privacy &amp; Information Collection</h4>
              <p>All personal and vessel data is collected under the authority of the Department of Agriculture - Romblon for maritime governance, safety, and official record-keeping in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).</p>

              <h4 className="font-bold text-white text-base">3. Accuracy &amp; Record Modification</h4>
              <p>Submitting corrections will update your existing database entry or replace incorrect attributes with newly validated entries. Providing false, misleading, or fraudulent information may result in statutory penalties and permit revocation.</p>

              <h4 className="font-bold text-white text-base">4. Inspection &amp; Compliance Standards</h4>
              <p>All registered vessels must undergo scheduled physical inspection audits by authorized inspectors. Failure to present the vessel or required identification documents on the scheduled date may result in automatic rejection or flagging of the application.</p>

              <h4 className="font-bold text-white text-base">5. Re-Audit &amp; Resubmission Guidelines</h4>
              <p>If your vessel registration is flagged or rejected, you are permitted to resubmit corrective documents or details via the Re-Audit portal. Prior submissions will be archived, and updated details will replace prior records upon approval.</p>

              <h4 className="font-bold text-white text-base">6. Data Security &amp; Usage Rights</h4>
              <p>Information submitted through this portal is encrypted and restricted to authorized personnel of the Department of Agriculture and local municipal authorities. Your information will not be sold or shared with unauthorized third parties.</p>

              <h4 className="font-bold text-white text-base">7. System Modifications &amp; Updates</h4>
              <p>The municipal registry authority reserves the right to update or modify registration guidelines, requirements, or terms of service at any time to comply with evolving maritime laws and local ordinances.</p>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button type="button" onClick={() => setShowTermsModal(false)} className="w-full sm:w-auto px-6 py-3 rounded-full font-bold uppercase text-xs tracking-wider bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20">
                Cancel
              </button>
              <button type="button" onClick={handleAcceptTerms} className="w-full sm:w-auto px-8 py-3 rounded-full font-black uppercase text-xs tracking-wider bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg border border-white/30 flex items-center justify-center gap-2">
                {reRegisterData ? <RotateCcw size={14} /> : null}
                {reRegisterData ? 'Proceed to Re-Register' : 'I Agree & Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}