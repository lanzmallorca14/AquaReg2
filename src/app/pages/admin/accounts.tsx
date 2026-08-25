import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserMinus,
  ShieldAlert,
  Search,
  Trash2,
  ShieldCheck,
  UserX,
  ArchiveX,
  ClipboardCheck,
  KeyRound,
  Eye,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { useAquaReg } from '../../components/context/AquaRegCONTEXT';

export default function AccountsPage() {
  const { 
    inspectors = [], 
    updateInspectorStatus, 
    deleteInspector, 
    loading,
    supabase 
  } = useAquaReg(); 
  
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all');
  const [search, setSearch] = useState("");
  const [selectedInspector, setSelectedInspector] = useState<any>(null);
  const [selectedRecovery, setSelectedRecovery] = useState<any>(null);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const filteredInspectors = inspectors.filter(ins => {
    if (!ins) return false;
    const matchesFilter = filter === 'all' || ins.status === filter;
    const matchesSearch = (ins.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (ins.email || '').toLowerCase().includes(search.toLowerCase()) ||
                          (ins.idNumber || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const loadPasswordRequests = async () => {
    const { data, error } = await supabase
      .from("password_recovery_requests")
      .select("*")
      .eq("status", "pending");

    if (error) {
      console.error("Recovery request error:", error);
      return;
    }
    setPasswordRequests(data || []);
  };

  useEffect(() => {
    loadPasswordRequests();
  }, [supabase]);

  const handleApprove = async (id: string, name: string) => {
    try {
      await updateInspectorStatus(id, 'approved'); 
      toast.success("Identity Verified", { 
        description: `${name || 'Personnel'} has been granted system access.`,
        icon: <ShieldCheck className="text-emerald-500" size={16} />
      });
    } catch (error) {
      toast.error("Operation Failed", { description: "Could not update personnel status." });
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    try {
      await updateInspectorStatus(id, 'rejected'); 
      toast.error("Access Revoked", { 
        description: `${name || 'Personnel'}'s portal credentials have been suspended.`,
        icon: <ShieldAlert className="text-rose-500" size={16} />
      });
    } catch (error) {
      toast.error("Operation Failed", { description: "Could not revoke portal access." });
    }
  };

  const handleDeleteRegistry = async (id: string, name: string) => {
    const confirmDrop = window.confirm(`Move ${name} to Rejected Records?`);
    if (!confirmDrop) return;

    try {
      await updateInspectorStatus(id, "rejected");
      toast.success("Inspector Archived", {
        description: `${name} has been moved to the rejected records.`,
        icon: <UserX className="text-slate-900" size={16} />
      });
    } catch (error) {
      toast.error("Operation Failed", { description: "Could not update the inspector." });
    }
  };

  const handleApprovePasswordChange = async (req: any) => {
    setProcessingRequestId(req.id);
    try {
      // Call the secure Postgres function
      const { error: rpcErr } = await supabase.rpc('admin_update_inspector_password', {
        target_email: req.inspector_email,
        new_password: req.requested_password
      });

      if (rpcErr) throw rpcErr;

      // Update the request status to approved
      const { error: updateReqErr } = await supabase
        .from("password_recovery_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString()
        })
        .eq("id", req.id);

      if (updateReqErr) throw updateReqErr;

      // Mark personnel profile as recovered
      await supabase
        .from("personnel_profiles")
        .update({
          password_recovered: true,
          password_changed_at: new Date().toISOString()
        })
        .eq("email", req.inspector_email);

      toast.success("Password Updated Successfully", {
        description: `Credentials updated for ${req.full_name}.`
      });

      loadPasswordRequests();
    } catch (err: any) {
      toast.error("Password Change Failed", { description: err.message || "Unable to sync updates." });
    } finally {
      setProcessingRequestId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 font-sans bg-slate-50 min-h-screen flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Syncing Personnel Registries with Supabase...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 font-sans bg-slate-50 min-h-screen">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Manage portal access and registry approvals
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="SEARCH PERSONNEL / ID..." 
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* --- Password Recovery Requests Section --- */}
      {passwordRequests.length > 0 && (
        <div className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="text-blue-600" size={18} />
            <h2 className="font-black uppercase text-sm text-slate-900">
              Pending Password Change Requests ({passwordRequests.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passwordRequests.map(req => (
              <div key={req.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="font-black text-xs uppercase text-slate-900">{req.full_name}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{req.inspector_email}</p>
                  <p className="text-[9px] text-slate-400">Municipal ID: <span className="font-bold">{req.municipal_id}</span></p>
                  {req.municipal_id_image && (
                    <a 
                      href={req.municipal_id_image} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 hover:underline mt-1"
                    >
                      <Eye size={12} /> View Uploaded ID Scan
                    </a>
                  )}
                </div>

                <Button
                  disabled={processingRequestId === req.id}
                  onClick={() => handleApprovePasswordChange(req)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider h-9"
                >
                  {processingRequestId === req.id ? "Processing..." : "Authorize Password Change"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Filter Tabs --- */}
      <div className="flex p-1 bg-slate-200/50 rounded-2xl w-fit backdrop-blur-sm">
        {(['all', 'approved', 'pending', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              filter === tab 
                ? 'bg-white text-emerald-600 shadow-md scale-105' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* --- Personnel Table Output Data --- */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Credential Profile</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Jurisdiction</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Auth Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInspectors.map((inspector) => (
                <tr key={inspector.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 font-black text-xs shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                        {inspector.name ? inspector.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 uppercase italic leading-none mb-1">
                          {inspector.name || 'UNNAMED REGISTRY'}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-slate-400 leading-none">
                            {inspector.email || 'no-email-provided'}
                          </span>
                          {inspector.idNumber && (
                            <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase leading-none mt-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                              ID: {inspector.idNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                      {inspector.position || 'Fishery Inspector'}
                    </div>
                    <div className="text-[9px] text-emerald-600 uppercase font-black tracking-widest">
                      Brgy. {inspector.barangay || 'UNDEFINED'}
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex gap-2 items-center">
                      <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        inspector.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        inspector.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        {inspector.status}
                      </span>

                      {inspector.password_recovered && (
                        <button
                          type="button"
                          onClick={() => setSelectedRecovery(inspector)}
                          className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-[8px] font-black uppercase hover:bg-blue-100 transition"
                        >
                          Password Updated
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      {inspector.status === 'pending' ? (
                        <Button
                          onClick={() => setSelectedInspector(inspector)}
                          className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-md shadow-emerald-100 active:scale-95 transition-all"
                        >
                          Confirm Registry
                        </Button> 
                      ) : inspector.status === 'approved' ? (
                        <button 
                          type="button"
                          onClick={() => handleDeactivate(inspector.id, inspector.name)} 
                          className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:shadow-inner transition-all"
                          title="Suspend Access"
                        >
                          <UserMinus size={16} />
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleApprove(inspector.id, inspector.name)} 
                          className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                          title="Re-activate"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}

                      {filter === "rejected" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updateInspectorStatus(inspector.id, "pending")}
                            className="p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                            title="Return to Approval"
                          >
                            <ClipboardCheck size={16} /> 
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const confirmDelete = window.confirm(
                                "This record will be permanently deleted.\n\nThis action cannot be undone.\n\nDo you want to continue?"
                              );

                              if (!confirmDelete) return;

                              try {
                                await deleteInspector(inspector.id);
                                toast.success("Record Deleted", {
                                  description: `${inspector.name} has been permanently deleted.`,
                                });
                              } catch (error) {
                                toast.error("Delete Failed", {
                                  description: "Unable to delete the record.",
                                });
                              }
                            }}
                            className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                            title="Delete Permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteRegistry(inspector.id, inspector.name)}
                          className="p-3 rounded-xl bg-slate-50 text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          title="Move to Rejected"
                        >
                          <ArchiveX size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- Empty Result Block --- */}
        {filteredInspectors.length === 0 && (
          <div className="py-24 text-center">
            <ShieldAlert className="mx-auto text-slate-200 mb-4 animate-pulse" size={48} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
              No matching personnel records
            </p>
          </div>
        )}
      </div>

      {/* --- Confirm Inspector Modal --- */}
      {selectedInspector && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase">Confirm Inspector</h2>
              <button onClick={() => setSelectedInspector(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedInspector.municipal_id_image || selectedInspector.municipalIdImage || '/placeholder-id.png'}
                  alt="ID" className="w-64 h-40 object-cover rounded-xl border shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black">Full Name</p>
                  <p className="font-bold text-xs">{selectedInspector.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black">Email</p>
                  <p className="font-bold text-xs">{selectedInspector.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black">Barangay</p>
                  <p className="font-bold text-xs">{selectedInspector.barangay}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black">Position</p>
                  <p className="font-bold text-xs">{selectedInspector.position}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedInspector(null)}
                className="rounded-xl text-xs font-black uppercase"
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase"
                onClick={async () => {
                  await handleApprove(selectedInspector.id, selectedInspector.name);
                  setSelectedInspector(null);
                }}
              >
                Approve Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- Password Recovery Details Modal --- */}
      {selectedRecovery && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black uppercase">Password Recovery Details</h2>
              <button onClick={() => setSelectedRecovery(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black">Full Name</p>
                <p className="font-bold uppercase text-xs">{selectedRecovery.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black">Email</p>
                <p className="font-bold text-xs">{selectedRecovery.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black">Recovery Status</p>
                <p className="text-blue-600 font-black uppercase text-xs">Password Updated</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black">Changed At</p>
                <p className="font-bold text-xs">
                  {selectedRecovery.password_changed_at
                    ? new Date(selectedRecovery.password_changed_at).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>

            <Button
              className="w-full bg-slate-900 rounded-xl text-xs font-black uppercase text-white"
              onClick={() => setSelectedRecovery(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}