import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner'; 
import { 
  Search, Ship, ChevronRight, User, Anchor, X, 
  MapPin, Eye, CheckCircle2, Calculator,  
  ShieldAlert, FileCheck, CalendarClock, LifeBuoy, Phone, XCircle
} from 'lucide-react';
import { useAquaData } from '../../components/context/AquaRegCONTEXT';
import { supabase } from '../../../supabaseClient';

export default function AuditQueuePage() {
  const { Vessels = [], loading } = useAquaData(); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVessel, setSelectedVessel] = useState<any | null>(null);

  // --- UPDATED PATTERNS FOR SUPABASE SNAKE_CASE COLUMNS ---
  const queue = useMemo(() => {
    return Vessels.filter((v: any) => {
      const isPending = v?.status?.toLowerCase() === 'pending';
      if (!isPending) return false;

      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      return (
        v.owner_name?.toLowerCase().includes(query) ||
        v.vessel_name?.toLowerCase().includes(query) ||
        v.gear_type?.toLowerCase().includes(query) ||
        String(v.id || '').toLowerCase().includes(query) ||
        v.barangay?.toLowerCase().includes(query)
      );
    });
  }, [Vessels, searchQuery]);

  if (loading) {
    return (
      <div className="p-6 font-sans bg-slate-50 min-h-screen flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Cloud Audit Queue...</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 animate-in fade-in duration-700 font-sans p-6 pt-10 bg-slate-50/30 min-h-screen">
      
      {/* Page Header */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-200">
            <Ship className="text-emerald-400" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none italic">Registration Audit</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{queue.length} Total Pending Review</p>
          </div>
        </div>
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input 
            className="pl-10 h-12 rounded-xl border-slate-100 bg-slate-50/50 text-xs font-bold" 
            placeholder="Search name, ID, or barangay..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Details</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Owner</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Category</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map((v: any) => {
                const normalizedCategory = (v.asset_category || v.type || '').toLowerCase();
                return (
                  <tr key={v.id} className="group hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-emerald-400 transition-all">
                          {normalizedCategory === 'vessel' && <Ship size={20} />}
                          {normalizedCategory === 'payao' && <Anchor size={20} />}
                          {['gears', 'pangulong'].includes(normalizedCategory) && <LifeBuoy size={20} />}
                        </div>
                        <div>
                          <div className="font-black italic text-slate-900 uppercase tracking-tight">
                            {v.vessel_name || v.gear_type || 'UNNAMED ASSET'}
                          </div>
                          <div className="text-[9px] font-mono font-bold text-slate-400 uppercase">ID: {v.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-black text-slate-700 uppercase italic">
                      {v.owner_name || v.owner}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <Badge className="bg-blue-100 text-blue-600 border-none rounded-md text-[9px] font-black uppercase px-3">
                        {(v.asset_category || v.type || 'GENERAL').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Button onClick={() => setSelectedVessel(v)} className="bg-slate-900 text-white rounded-xl h-11 px-5 hover:bg-blue-600 transition-all text-[10px] font-black uppercase tracking-widest">
                        Start Audit <ChevronRight size={14} className="ml-2" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    No items awaiting review inside this queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedVessel && <AuditDetailPopup vessel={selectedVessel} onClose={() => setSelectedVessel(null)} />}
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-xs font-black text-slate-900 uppercase mt-0.5">{value}</p>
    </div>
  );
}

function AuditDetailPopup({ vessel, onClose }: { vessel: any, onClose: () => void }) {
  const { updateVesselStatus, scheduleInspection, inspectors = [] } = useAquaData();
  const [phase, setPhase] = useState<'review' | 'schedule' | 'reject'>('review');

  const [assignedInspectorIdNumber, setAssignedInspectorIdNumber] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Rejection State
  const [rejectionReason, setRejectionReason] = useState<string>("Invalid Valid ID");
  const [rejectionNotes, setRejectionNotes] = useState<string>("");
  const [isSubmittingRejection, setIsSubmittingRejection] = useState<boolean>(false);

  const rawCategory = (vessel.asset_category || vessel.type || '').toLowerCase();
  const isGearCategory = ['payao', 'balsa', 'pangulong', 'gears'].includes(rawCategory);

  // Document requirement setup:
  const activeDocKeys = useMemo(() => {
    if (isGearCategory) {
      return ['bfarPermit', 'marinaPermit', 'barangayClearance', 'cedula'];
    }
    return ['barangayClearance', 'validID', 'cedula'];
  }, [isGearCategory]);

  const activePersonnel = useMemo(() => {
    return (inspectors || []).filter((ins: any) => ins.status === 'approved');
  }, [inspectors]);

  const handleProceed = async () => {
    if (isGearCategory) {
      if (typeof updateVesselStatus === 'function') {
        await updateVesselStatus(vessel.id, 'Passed');
        toast.success(`${(vessel.asset_category || 'Asset').toUpperCase()} Approved Directly`);
      } else {
        toast.error("Database connection function missing.");
      }
      onClose();
    } else {
      setPhase('schedule');
    }
  };

  const handleRejectSubmission = async () => {
    if (!rejectionReason) {
      return toast.error("Please select a reason for rejection.");
    }

    setIsSubmittingRejection(true);
    try {
      const fullReasonText = rejectionNotes ? `${rejectionReason}: ${rejectionNotes}` : rejectionReason;

      // Changed table name from 'vessels' to 'Vessels' to match database case sensitivity
      const { error } = await supabase
        .from('Vessels')
        .update({ 
          status: 'Rejected', 
          rejection_reason: fullReasonText,
          updated_at: new Date().toISOString()
        })
        .eq('id', vessel.id);

      if (error) throw error;

      // Optional context fallback update if function exists
      if (typeof updateVesselStatus === 'function') {
        await updateVesselStatus(vessel.id, 'Rejected');
      }

      toast.error("Registration Rejected", {
        description: `Application ID ${vessel.id} marked as rejected.`
      });
      onClose();
    } catch (err: any) {
      console.error("Rejection submission error:", err);
      toast.error("Failed to update status", {
        description: err.message || "An error occurred while marking as rejected."
      });
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleFinalSchedule = async () => {
    if (!assignedInspectorIdNumber) {
      return toast.error("Officer Assignment Required");
    }

    try {
      if (typeof scheduleInspection === "function") {
        await scheduleInspection(
          vessel.id,
          assignedInspectorIdNumber,
          scheduledDate
        );
      } else if (typeof updateVesselStatus === "function") {
        await updateVesselStatus(
          vessel.id,
          "Scheduled"
        );
      } else {
        throw new Error("Missing structural mutators inside context wrapper");
      }

      toast.success(
        "Successfully scheduled for inspection.",
        {
          description: "The inspection has been successfully scheduled."
        }
      );

      onClose();
    } catch (error) {
      console.error("Schedule Error:", error);
      toast.error(
        "Scheduling failed",
        {
          description: "Unable to bind assigned personnel profile."
        }
      );
    }
  };

  const renderTechnicalSpecs = () => {
    return (
      <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-2 mb-8">
          <Anchor className="text-emerald-500" size={18} />
          <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest italic">Technical Specs</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-y-8 mb-8">
          <DetailItem 
            label="Category" 
            value={rawCategory === 'gears' ? 'FISHING GEAR' : rawCategory.toUpperCase() || '---'} 
          />
          
          {!isGearCategory ? (
            <DetailItem 
              label="Propulsion" 
              value={vessel.vesselType?.toUpperCase() || (vessel.is_motorized ? 'MOTORIZED' : 'NON-MOTORIZED')} 
              icon={<Ship size={14} className="text-blue-600" />} 
            />
          ) : (
            <DetailItem 
              label="Method/Type" 
              value={vessel.gear_type || rawCategory.toUpperCase() || 'STATIONARY'} 
              icon={<LifeBuoy size={14} className="text-orange-500" />} 
            />
          )}
        </div>

        {!['payao', 'balsa'].includes(rawCategory) ? (
          <div className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-2">
            <DetailItem label="Length (M)" value={vessel.hull_length || '0.00'} />
            <DetailItem label="Width (M)" value={vessel.hull_width || '0.00'} />
            <DetailItem label="Depth (M)" value={vessel.hull_depth || '0.00'} />
          </div>
        ) : (
          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-dashed border-amber-200 text-center">
             <p className="text-[9px] font-black text-amber-700 uppercase leading-tight italic">
                Stationary Asset: Verify GPS and Anchoring location.
             </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-7xl h-[92vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Modal Header */}
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
          <div className="flex gap-6 items-center">
            <div className="h-16 w-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Calculator size={32} />
            </div>
            <div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                {vessel.vessel_name || vessel.gear_type || 'Audit Review'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-blue-500 text-white border-none text-[9px] font-black uppercase tracking-widest">
                  {(vessel.asset_category || vessel.type)?.toUpperCase()} Audit
                </Badge>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID: {vessel.id}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-4 hover:bg-red-500 rounded-2xl transition-all group"
            aria-label="Close Audit Popup"
            title="Close Audit Popup"
          >
            <X className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          {phase === 'review' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                  <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-6 flex items-center gap-2"><User size={14}/> Owner Information</h4>
                  <div className="space-y-4">
                    <DetailItem
                      label="Full Legal Name"
                      value={vessel.owner_name || vessel.owner}
                      icon={<User size={14} />}
                    />

                    <DetailItem
                      label="CP Number"
                      value={vessel.phone || vessel.cp_number || 'N/A'}
                      icon={<Phone size={14} />}
                    />

                    <DetailItem
                      label="Sitio / Brgy"
                      value={`${vessel.sitio || 'N/A'}, Brgy. ${vessel.barangay || 'N/A'}`}
                      icon={<MapPin size={14} />}
                    />

                    <DetailItem
                      label="Place of Built"
                      value={vessel.place_of_built || 'N/A'}
                    />

                    <DetailItem
                      label="Year Built"
                      value={vessel.year_built || 'N/A'}
                    />
                  </div>
                </div>

                {renderTechnicalSpecs()}

                {!isGearCategory && (
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                    <Anchor className="absolute -right-6 -bottom-6 text-white/5 rotate-12" size={160} />
                    <div className="relative z-10">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 italic">Verified Tonnage</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Gross Tonnage</p>
                          <p className="text-2xl font-black italic">{vessel.tonnage_gross || '0.00'}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Net Tonnage</p>
                          <p className="text-2xl font-black italic">{vessel.tonnage_net || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Button onClick={handleProceed} className="w-full h-16 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                    {isGearCategory ? 'Verify & Pass Audit' : 'Verify & Schedule Inspection'} <ChevronRight size={18} className="ml-2" />
                  </Button>

                  <Button onClick={() => setPhase('reject')} variant="outline" className="w-full h-14 border-2 border-red-200 bg-red-50/50 text-red-600 hover:bg-red-600 hover:text-white rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all">
                    <XCircle size={18} className="mr-2" /> Reject Application
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-8 bg-white rounded-[3rem] border border-slate-200 shadow-inner overflow-hidden flex flex-col">
                <div className="bg-slate-50 p-6 border-b flex items-center gap-3">
                  <FileCheck size={16} className="text-slate-900"/>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Document Vault Review</p>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-100/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                    {activeDocKeys.map((key) => {
                      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                      const altSnakeKey = key === 'validID' ? 'valid_id' : snakeKey;
                      
                      const src = 
                        vessel.requirements?.[key] || 
                        vessel.requirements?.[altSnakeKey] ||
                        vessel.documents?.[key] || 
                        vessel.documents?.[altSnakeKey] ||
                        vessel[key] || 
                        vessel[altSnakeKey];

                      return (
                        <div key={key} className="space-y-3">
                          <p className="text-[10px] font-black uppercase text-slate-500 italic px-2">
                            {key.replace(/([A-Z])/g, ' $1').replace('bfar', 'BFAR').toUpperCase()}
                          </p>
                          {src ? (
                            <div className="rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden aspect-[4/3] bg-slate-200 relative group cursor-pointer">
                               <img src={src} className="w-full h-full object-cover" alt={key} />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <Eye className="text-white" size={30} />
                               </div>
                            </div>
                          ) : (
                            <div className="border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center aspect-[4/3] bg-slate-100/50 text-slate-400">
                              <ShieldAlert size={24} className="mb-2 opacity-50" />
                              <p className="text-[9px] font-black uppercase tracking-widest">Document Missing</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === 'schedule' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Assign Inspector</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase mt-2">Audit Site: {vessel.barangay}</p>
                </div>
                
                <div className="w-48">
                  <Label htmlFor="audit-assignment-date" className="text-[10px] font-black uppercase text-blue-600">
                    Audit Date
                  </Label>
                  <input 
                    id="audit-assignment-date"
                    type="date" 
                    value={scheduledDate} 
                    onChange={(e) => setScheduledDate(e.target.value)} 
                    className="w-full h-12 mt-1 rounded-xl font-bold border px-4 border-slate-200 outline-none" 
                    title="Select scheduled audit date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePersonnel.map((ins: any) => {
                  const targetIdNum = ins.idNumber || ins.id_number || "";
                  const targetName = ins.name || ins.inspector_name || 'UNNAMED REGISTRY';
                  const isSelected = assignedInspectorIdNumber === targetIdNum && targetIdNum !== "";

                  return (
                    <button 
                      key={ins.id} 
                      type="button"
                      onClick={() => setAssignedInspectorIdNumber(targetIdNum)} 
                      className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between text-left ${
                        isSelected ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-100 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100'
                        }`}>
                          <User size={24} />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase italic text-slate-900 leading-tight">
                            {targetName}
                          </p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">
                              {ins.position || ins.role || 'Fishery Inspector'}
                            </p>
                            {targetIdNum && (
                              <span className="text-[8px] font-mono tracking-wider font-black text-slate-400 uppercase bg-slate-100 px-1 py-0.5 rounded w-fit mt-1">
                                ID: {targetIdNum}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="text-blue-600" size={24} />}
                    </button>
                  );
                })}

                {activePersonnel.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-xs font-bold text-slate-400 border border-dashed rounded-3xl">
                    No active verified inspectors found on file.
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <Button variant="ghost" onClick={() => setPhase('review')} className="h-16 px-10 rounded-2xl font-black text-xs uppercase italic tracking-tighter">
                  Back to Audit
                </Button>
                <Button 
                  onClick={handleFinalSchedule} 
                  disabled={!assignedInspectorIdNumber} 
                  className="flex-1 h-16 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest hover:bg-blue-600 shadow-xl uppercase"
                >
                  <CalendarClock className="mr-2" size={18} /> Confirm Assignment
                </Button>
              </div>
            </div>
          )}

          {phase === 'reject' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 bg-white p-8 rounded-[2.5rem] border border-red-100 shadow-xl">
              <div>
                <div className="flex items-center gap-3 text-red-600 mb-2">
                  <ShieldAlert size={28} />
                  <h3 className="text-2xl font-black uppercase italic tracking-tight">Reject Application</h3>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Select the explicit non-compliance factor for ID #{vessel.id}
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-slate-500">
                  Primary Rejection Category
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    "Invalid Valid ID",
                    "Missing / Invalid Document Files",
                    "Wrong / Unreachable Contact Number"
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectionReason(reason)}
                      className={`p-4 rounded-2xl border-2 text-left font-black text-xs uppercase transition-all ${
                        rejectionReason === reason
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="rejection-notes" className="text-[10px] font-black uppercase text-slate-500">
                    Detailed Explanation / Instructions for Applicant
                  </Label>
                  <textarea
                    id="rejection-notes"
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="Specify why the ID/Document/Number was flagged (e.g., Expiration date passed, blurriness, invalid phone digits)..."
                    className="w-full h-32 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <Button 
                  variant="ghost" 
                  onClick={() => setPhase('review')} 
                  className="h-14 px-8 rounded-2xl font-black text-xs uppercase italic tracking-tighter"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRejectSubmission} 
                  disabled={isSubmittingRejection}
                  className="flex-1 h-14 bg-red-600 text-white hover:bg-red-700 rounded-2xl font-black text-xs tracking-wide uppercase"
                >
                  {isSubmittingRejection ? "Submitting..." : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}