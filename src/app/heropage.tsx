import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  ShieldCheck,
  FileText,
  Anchor,
  Info,
  Ship,
  X,
  Search,
  CalendarClock,
  ShieldAlert,
  MapPin,
  Activity,
  RotateCcw,
  CheckCircle2,
  CreditCard
} from 'lucide-react';

import heroBg from './components/photo/romblom1.jpg';
import { useAquaData } from './components/context/AquaRegCONTEXT';
import { supabase } from '../supabaseClient';


// ============================================================
// VESSEL / ASSET INTERFACE
// ============================================================

interface Vessel {
  id: string | number;
  status?: string;
  name?: string;
  vessel_name?: string;
  owner_name?: string;
  owner?: string;
  boat_name?: string;
  registered_vessel_name?: string;
  vesselName?: string;
  gear_type?: string;
  barangay?: string;
  sitio?: string;
  rejection_reason?: string;
  rejection_notes?: string;
  rejection_details?: string;
  audit_note?: string;
  audit_notes?: string;
  inspection_notes?: string;
  audit_remarks?: string;
  detailed_explanation?: string;
  notes?: string;
  remarks?: string;
  scheduled_date?: string;
  inspection_date?: string;
  created_at?: string;
  updated_at?: string;
  archived?: boolean;
  is_archived?: boolean;
  is_deleted?: boolean;
  deleted_at?: string;
  asset_category?: string;
  type?: string;
  is_motorized?: boolean;
  permit_saved?: boolean;
  permitSaved?: boolean;
  is_permit_saved?: boolean;
  permit_issued?: boolean;
  is_permit_issued?: boolean;
  permit_status?: string;
  permitStatus?: string;
  permit_id?: string | number;
  permit_number?: string;
  permitNumber?: string;
  permit_no?: string;
  permitNo?: string;
  permit?: any;
  permit_deleted?: boolean;
  permitDeleted?: boolean;
  is_permit_deleted?: boolean;
  permit_deleted_at?: string;
  permitDeletedAt?: string;
}

interface RejectionNotice {
  id: string | number;
  original_vessel_id?: string | number | null;
  owner_name?: string | null;
  vessel_name?: string | null;
  asset_category?: string | null;
  barangay?: string | null;
  rejection_reason?: string | null;
  rejection_notes?: string | null;
  rejected_at?: string | null;
  updated_at?: string | null;
}


// ============================================================
// CATEGORY NORMALIZATION
// ============================================================

const getCategory = (vessel: Vessel | RejectionNotice): string => {
  const rawValues = [(vessel as any)?.asset_category, (vessel as any)?.type];

  const normalizedValues = rawValues
    .filter((value) => value !== undefined && value !== null)
    .map((value) =>
      String(value)
        .trim()
        .toLowerCase()
        .replace(/[\_-]+/g, ' ')
        .replace(/\s+/g, ' ')
    );

  const category = normalizedValues.join(' ');

  if (
    normalizedValues.some(
      (value) =>
        value === 'payao' ||
        value === 'balsa' ||
        value === 'payao/balsa' ||
        value === 'payao / balsa' ||
        value === 'payao balsa'
    ) ||
    category.includes('payao') ||
    category.includes('balsa')
  ) {
    return 'payao_balsa';
  }

  if (
    normalizedValues.some(
      (value) =>
        value === 'gear' ||
        value === 'gears' ||
        value === 'fishing gear' ||
        value === 'fishinggear'
    ) ||
    category.includes('fishing gear') ||
    category.includes('fishinggear')
  ) {
    return 'fishing_gear';
  }

  if (
    normalizedValues.some(
      (value) =>
        value === 'pangulong' ||
        value === 'pangulong gear' ||
        value.includes('pangulong')
    ) ||
    category.includes('pangulong')
  ) {
    return 'pangulong';
  }

  if (
    normalizedValues.some(
      (value) =>
        value === 'vessel' ||
        value === 'boat' ||
        value === 'fishing vessel'
    )
  ) {
    return 'vessel';
  }

  return category;
};


// ============================================================
// CATEGORY LABEL
// ============================================================

const getCategoryLabel = (vessel: Vessel | RejectionNotice): string => {
  const category = getCategory(vessel);

  switch (category) {
    case 'fishing_gear':
      return 'FISHING GEAR';
    case 'payao_balsa':
      return 'PAYAO/BALSA';
    case 'pangulong':
      return 'PANGULONG';
    case 'vessel':
      return 'VESSEL';
    default:
      return ((vessel as any)?.asset_category || (vessel as any)?.type || 'GENERAL')
        .toString()
        .toUpperCase();
  }
};


// ============================================================
// STATUS NORMALIZATION
// ============================================================

const getStatus = (vessel: Vessel): string => {
  return String(vessel?.status || '').trim().toLowerCase();
};


// ============================================================
// SPECIAL PAYMENT / PERMIT ASSET
// ============================================================

const isPaymentPermitAsset = (vessel: Vessel): boolean => {
  const category = getCategory(vessel);
  return ['fishing_gear', 'payao_balsa', 'pangulong'].includes(category);
};


// ============================================================
// APPROVED STATUS
// ============================================================

const isApprovedStatus = (vessel: Vessel): boolean => {
  const status = getStatus(vessel);
  return status === 'passed' || status === 'approved';
};


// ============================================================
// PAYMENT / PERMIT READY
// ============================================================

const isPaymentPermitReady = (vessel: Vessel): boolean => {
  return isApprovedStatus(vessel) && isPaymentPermitAsset(vessel);
};


// ============================================================
// PERMIT DELETED / ALREADY SAVED
// ============================================================

const isPermitDeleted = (vessel: Vessel): boolean => {
  if (
    vessel?.permit_deleted === true ||
    vessel?.permitDeleted === true ||
    vessel?.is_permit_deleted === true
  ) {
    return true;
  }

  if (
    (vessel?.permit_deleted_at !== undefined &&
      vessel?.permit_deleted_at !== null &&
      String(vessel.permit_deleted_at).trim() !== '') ||
    (vessel?.permitDeletedAt !== undefined &&
      vessel?.permitDeletedAt !== null &&
      String(vessel.permitDeletedAt).trim() !== '')
  ) {
    return true;
  }

  return false;
};

const isPermitAlreadySaved = (vessel: Vessel): boolean => {
  if (isPermitDeleted(vessel)) return true;

  if (
    vessel?.permit_saved === true ||
    vessel?.permitSaved === true ||
    vessel?.is_permit_saved === true ||
    vessel?.permit_issued === true ||
    vessel?.is_permit_issued === true
  ) {
    return true;
  }

  if (vessel?.permit_id !== undefined && vessel?.permit_id !== null && String(vessel.permit_id).trim() !== '') {
    return true;
  }

  const permitNumber =
    vessel?.permit_number ||
    vessel?.permitNumber ||
    vessel?.permit_no ||
    vessel?.permitNo;

  if (permitNumber !== undefined && permitNumber !== null && String(permitNumber).trim() !== '') {
    return true;
  }

  if (vessel?.permit && typeof vessel.permit === 'object') {
    return true;
  }

  const permitStatus = String(
    vessel?.permit_status || vessel?.permitStatus || ''
  ).trim().toLowerCase();

  return ['saved', 'issued', 'released', 'approved', 'active', 'completed'].includes(permitStatus);
};


// ============================================================
// DISPLAY NAME
// ============================================================

const getDisplayName = (vessel: Vessel): string => {
  const candidates = [
    vessel?.vessel_name,
    vessel?.name,
    vessel?.boat_name,
    vessel?.registered_vessel_name,
    vessel?.vesselName
  ];

  const validName = candidates.find(
    (name) => typeof name === 'string' && name.trim().length > 0
  );

  if (validName) return validName.trim();

  const category = getCategory(vessel);

  if (category === 'fishing_gear') return vessel?.gear_type || 'UNNAMED FISHING GEAR';
  if (category === 'payao_balsa') return vessel?.gear_type || 'UNNAMED PAYAO/BALSA';
  if (category === 'pangulong') return vessel?.gear_type || 'UNNAMED PANGULONG';

  return 'UNNAMED ASSET';
};


// ============================================================
// REJECTED RECORD & AUDIT HELPERS
// ============================================================

const getAuditNotes = (vessel: Vessel): string => {
  const candidates = [
    vessel?.audit_note,
    vessel?.audit_notes,
    vessel?.inspection_notes,
    vessel?.audit_remarks,
    vessel?.detailed_explanation,
    vessel?.notes,
    vessel?.remarks
  ];

  const value = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
  );

  return typeof value === 'string' ? value.trim() : '';
};


// ============================================================
// HOMEPAGE COMPONENT
// ============================================================

export default function Homepage() {
  const navigate = useNavigate();
  const { Vessels = [], loading } = useAquaData();

  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [vesselSearch, setVesselSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'rejected' | 'payment'>('all');
  
  const [rejectionNotices, setRejectionNotices] = useState<RejectionNotice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState<boolean>(true);

  // Load rejection notices directly from the RejectionNotices table
  useEffect(() => {
    const loadRejectionNotices = async () => {
      try {
        setLoadingNotices(true);
        const { data, error } = await supabase
          .from('RejectionNotices')
          .select('*')
          .order('rejected_at', { ascending: false });

        if (error) throw error;
        setRejectionNotices((data || []) as RejectionNotice[]);
      } catch (error) {
        console.error('Error loading rejection notices for tracker:', error);
      } finally {
        setLoadingNotices(false);
      }
    };

    loadRejectionNotices();
  }, []);

  const handleRegisterClick = () => {
    localStorage.removeItem('reRegisterVesselData');
    localStorage.removeItem('isReRegistering');
    setShowTermsModal(true);
  };

  const handleAcceptTerms = () => {
    setShowTermsModal(false);
    localStorage.removeItem('reRegisterVesselData');
    localStorage.removeItem('isReRegistering');
    navigate('/new-registration');
  };

  const scrollToDashboard = () => {
    const el = document.getElementById('vessels-dashboard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scheduledCount = useMemo(() => {
    return (Vessels as Vessel[]).filter((vessel) => getStatus(vessel) === 'scheduled').length;
  }, [Vessels]);

  const rejectedCount = useMemo(() => {
    return rejectionNotices.length;
  }, [rejectionNotices]);

  const paymentPermitCount = useMemo(() => {
    return (Vessels as Vessel[]).filter(
      (vessel) => isPaymentPermitReady(vessel) && !isPermitAlreadySaved(vessel)
    ).length;
  }, [Vessels]);

  // Combined filtered items for the Audit Tracker directory
  const filteredTrackerItems = useMemo(() => {
    const query = vesselSearch.toLowerCase().trim();

    // 1. Process Scheduled and Payment Ready from Vessels
    const vesselItems = (Vessels as Vessel[])
      .filter((vessel) => {
        const status = getStatus(vessel);
        const isScheduled = status === 'scheduled';
        const isSpecialPaymentAsset = isPaymentPermitReady(vessel);

        if (isSpecialPaymentAsset && isPermitAlreadySaved(vessel)) return false;
        return isScheduled || isSpecialPaymentAsset;
      })
      .map((vessel) => {
        const isScheduled = getStatus(vessel) === 'scheduled';
        return {
          type: 'vessel' as const,
          id: vessel.id,
          displayId: vessel.id,
          name: getDisplayName(vessel),
          owner: vessel.owner_name || vessel.owner || 'N/A',
          status: isScheduled ? 'scheduled' : 'payment',
          statusLabel: isScheduled ? 'SCHEDULED' : 'APPROVED',
          barangay: vessel.barangay || 'N/A',
          categoryLabel: getCategoryLabel(vessel),
          motorizedInfo: getCategory(vessel) === 'vessel' ? (vessel.is_motorized ? 'Motorized' : 'Non-Motorized') : null,
          scheduledDate: vessel.scheduled_date || vessel.inspection_date,
          rejectionReason: null,
          rejectionNotes: null,
          auditNotes: getAuditNotes(vessel),
          raw: vessel,
        };
      });

    // 2. Process Rejection Notices from RejectionNotices table
    const rejectionItems = rejectionNotices.map((notice) => {
      return {
        type: 'rejection' as const,
        id: notice.id,
        displayId: notice.original_vessel_id || notice.id,
        name: notice.vessel_name || 'REJECTED APPLICATION',
        owner: notice.owner_name || 'N/A',
        status: 'rejected' as const,
        statusLabel: 'REJECTED',
        barangay: notice.barangay || 'N/A',
        categoryLabel: getCategoryLabel(notice),
        motorizedInfo: null,
        scheduledDate: null,
        rejectionReason: notice.rejection_reason || 'Application rejected.',
        rejectionNotes: notice.rejection_notes || null,
        auditNotes: null,
        raw: notice,
      };
    });

    const combined = [...vesselItems, ...rejectionItems];

    return combined
      .filter((item) => {
        if (statusFilter !== 'all') {
          if (statusFilter === 'scheduled' && item.status !== 'scheduled') return false;
          if (statusFilter === 'rejected' && item.status !== 'rejected') return false;
          if (statusFilter === 'payment' && item.status !== 'payment') return false;
        }

        if (!query) return true;

        const searchable = [
          item.displayId,
          item.name,
          item.owner,
          item.barangay,
          item.categoryLabel,
          item.rejectionReason,
          item.rejectionNotes,
          item.auditNotes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => {
        const timeA = new Date((a.raw as any)?.updated_at || (a.raw as any)?.created_at || (a.raw as any)?.rejected_at || 0).getTime();
        const timeB = new Date((b.raw as any)?.updated_at || (b.raw as any)?.created_at || (b.raw as any)?.rejected_at || 0).getTime();
        return timeB - timeA;
      });
  }, [Vessels, rejectionNotices, vesselSearch, statusFilter]);

  return (
    <div
      className="min-h-screen font-sans text-white flex flex-col relative antialiased bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className="absolute inset-0 bg-slate-950/60 -z-10 backdrop-blur-[2px]" />

      {/* ======================================================
          NAVIGATION
      ====================================================== */}
      <nav className="w-full pt-4 px-4 sticky top-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto shadow-2xl rounded-full px-8 py-3 flex justify-between items-center border border-white/25 bg-slate-900/40 backdrop-blur-2xl">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg group-hover:scale-105 transition-transform border border-white/20">
              <Anchor size={22} />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-2xl md:text-3xl text-white leading-none drop-shadow-md">
                AQUAREG
              </span>
              <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase leading-none mt-1">
                ROMBLON MARITIME
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={scrollToDashboard}
              className="hidden md:flex items-center gap-2 font-black uppercase text-xs tracking-wider text-white hover:text-blue-300 transition-colors drop-shadow-md"
            >
              <Ship size={16} />
              Audit Tracker
            </button>
            <button
              type="button"
              onClick={() => navigate('/about_us')}
              className="flex items-center gap-2 font-black uppercase text-xs tracking-wider text-white hover:text-blue-300 transition-colors drop-shadow-md"
            >
              <Info size={16} />
              About Us
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase text-xs tracking-wider transition-all active:scale-95 shadow-lg border border-white/30"
            >
              <Lock size={14} />
              STAFF PORTAL
            </button>
          </div>
        </div>
      </nav>

      {/* ======================================================
          MAIN CONTAINER
      ====================================================== */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 flex flex-col justify-center w-full gap-16">
        
        {/* ====================================================
            HERO SECTION
        ==================================================== */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 w-full">
          <div className="flex-1 flex flex-col items-start text-left space-y-6 p-8 md:p-14 w-full max-w-3xl bg-slate-900/40 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_25px_50px_rgba(0,0,0,0.5)]">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-200 backdrop-blur-md">
              <Anchor size={15} className="text-blue-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">
                DEPT OF AGRICULTURE • PROVINCE OF ROMBLON
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-white leading-none">
                DIGITAL BOAT
              </h1>
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-blue-300 leading-none">
                REGISTRY
              </h1>
              <p className="max-w-xl text-slate-200 text-base md:text-lg font-medium leading-relaxed pt-3">
                Streamlining maritime governance across Romblon. Register vessels, verify municipal permits, and track inspection schedules seamlessly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full">
              <button
                type="button"
                onClick={handleRegisterClick}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 w-full sm:w-auto border border-white/30"
              >
                REGISTER NOW!
              </button>
              <button
                type="button"
                onClick={() => navigate('/VerifyPermit')}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-md rounded-full font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg w-full sm:w-auto text-center"
              >
                Verify Permit
              </button>
            </div>
          </div>

          {/* SIDE STATS COUNTERS */}
          <div className="hidden lg:flex flex-col gap-4 w-80">
            <div className="p-5 bg-slate-900/50 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="p-3 bg-blue-600/80 border border-white/25 rounded-2xl text-white shadow-md">
                <CalendarClock size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{scheduledCount}</h3>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                  Scheduled Audits
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-900/50 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="p-3 bg-red-600/80 border border-white/25 rounded-2xl text-white shadow-md">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{rejectedCount}</h3>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-200">
                  Flagged / Rejected
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-900/50 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-xl flex items-center gap-4">
              <div className="p-3 bg-emerald-600/80 border border-white/25 rounded-2xl text-white shadow-md">
                <CreditCard size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{paymentPermitCount}</h3>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">
                  Payment / Permit Ready
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            AUDIT TRACKER SECTION
        ==================================================== */}
        <section id="vessels-dashboard" className="w-full pt-6">
          <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-8">
            
            {/* TRACKER HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
              <div>
                <div className="flex items-center gap-2 text-blue-300 font-extrabold text-[11px] uppercase tracking-widest mb-2">
                  <Activity size={16} />
                  Application Status Directory
                </div>
                <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight text-white leading-none">
                  Audit Tracker
                </h2>
                <p className="text-xs md:text-sm font-medium text-slate-300 mt-2 max-w-xl">
                  Public audit portal. Check whether your application is scheduled for physical inspection, flagged for corrections, or approved for payment and permit processing.
                </p>
              </div>

              {/* STATUS SUMMARY PILLS */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3 bg-blue-950/60 border border-blue-400/30 rounded-2xl p-3.5 backdrop-blur-md">
                  <CalendarClock size={22} className="text-blue-400" />
                  <div>
                    <p className="text-[8px] font-black uppercase text-blue-200 tracking-wider">Scheduled</p>
                    <p className="text-lg font-black text-white leading-none">{scheduledCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-red-950/60 border border-red-400/30 rounded-2xl p-3.5 backdrop-blur-md">
                  <ShieldAlert size={22} className="text-red-400" />
                  <div>
                    <p className="text-[8px] font-black uppercase text-red-200 tracking-wider">Rejected</p>
                    <p className="text-lg font-black text-white leading-none">{rejectedCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-400/30 rounded-2xl p-3.5 backdrop-blur-md">
                  <CreditCard size={22} className="text-emerald-400" />
                  <div>
                    <p className="text-[8px] font-black uppercase text-emerald-200 tracking-wider">Payment</p>
                    <p className="text-lg font-black text-white leading-none">{paymentPermitCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SEARCH AND FILTER CONTROLS */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  type="text"
                  placeholder="Search name, ID, rejection reason, or barangay..."
                  value={vesselSearch}
                  onChange={(e) => setVesselSearch(e.target.value)}
                  className="w-full pl-12 pr-4 h-13 bg-slate-950/40 border border-white/20 rounded-2xl text-white placeholder-white/40 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg'
                      : 'bg-slate-950/40 text-white/80 border-white/15 hover:bg-white/10'
                  }`}
                >
                  All ({scheduledCount + rejectedCount + paymentPermitCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('scheduled')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                    statusFilter === 'scheduled'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg'
                      : 'bg-slate-950/40 text-blue-200 border-white/15 hover:bg-white/10'
                  }`}
                >
                  <CalendarClock size={13} />
                  Scheduled ({scheduledCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                    statusFilter === 'rejected'
                      ? 'bg-red-600 text-white border-red-400 shadow-lg'
                      : 'bg-slate-950/40 text-red-300 border-white/15 hover:bg-white/10'
                  }`}
                >
                  <ShieldAlert size={13} />
                  Rejected ({rejectedCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('payment')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                    statusFilter === 'payment'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg'
                      : 'bg-slate-950/40 text-emerald-300 border-white/15 hover:bg-white/10'
                  }`}
                >
                  <CreditCard size={13} />
                  Payment ({paymentPermitCount})
                </button>
              </div>
            </div>

            {/* AUDIT DATA TABLE */}
            {loading || loadingNotices ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest text-blue-200">
                  Loading Audit Queue & Rejection Notices...
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-2xl border border-white/15 bg-slate-950/50 backdrop-blur-2xl shadow-xl">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-white/15 bg-white/5 text-[10px] font-black uppercase tracking-wider text-blue-200">
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Vessel / Asset Name</th>
                      <th className="py-4 px-6">Owner</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Schedule / Notice Details</th>
                      <th className="py-4 px-6 text-center">Location & Type</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {filteredTrackerItems.map((item) => {
                      const isRejected = item.status === 'rejected';
                      const isScheduled = item.status === 'scheduled';
                      const isSpecialPaymentAsset = item.status === 'payment';

                      return (
                        <tr
                          key={`${item.type}-${item.id}`}
                          className={`transition-colors hover:bg-white/10 ${
                            isRejected
                              ? 'bg-red-950/20'
                              : isSpecialPaymentAsset
                              ? 'bg-emerald-950/20'
                              : 'bg-blue-950/20'
                          }`}
                        >
                          <td className="py-4 px-6 font-mono font-bold text-white/60 text-[11px] whitespace-nowrap">
                            #{item.displayId}
                          </td>
                          <td className="py-4 px-6 font-black uppercase text-white tracking-tight">
                            {item.name}
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-100 uppercase whitespace-nowrap">
                            {item.owner}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                isRejected
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : isSpecialPaymentAsset
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              }`}
                            >
                              {isRejected ? (
                                <ShieldAlert size={12} />
                              ) : isSpecialPaymentAsset ? (
                                <CheckCircle2 size={12} />
                              ) : (
                                <CalendarClock size={12} />
                              )}
                              {item.statusLabel}
                            </span>
                          </td>
                          <td className="py-4 px-6 max-w-sm">
                            {isRejected ? (
                              <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 space-y-1">
                                <span className="text-[9px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1">
                                  <RotateCcw size={10} />
                                  Rejection Reason & Explanation
                                </span>
                                <p className="text-red-200 italic font-semibold leading-relaxed text-xs">
                                  {item.rejectionReason}
                                </p>
                                {item.rejectionNotes && (
                                  <p className="text-red-300/80 font-medium leading-relaxed whitespace-pre-wrap text-[11px] mt-1 pt-1 border-t border-red-500/20">
                                    {item.rejectionNotes}
                                  </p>
                                )}
                              </div>
                            ) : isSpecialPaymentAsset ? (
                              <div className="p-3.5 bg-emerald-950/40 border border-emerald-400/30 rounded-xl">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                                    <CreditCard size={18} className="text-emerald-300" />
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                                      <CheckCircle2 size={10} />
                                      Application Approved
                                    </span>
                                    <p className="text-white font-black uppercase text-[11px]">
                                      {item.categoryLabel} Approved
                                    </p>
                                    <p className="text-emerald-100 font-medium leading-tight text-[11px]">
                                      Proceed to Office of Agriculture for payment and permit. THANK YOU!!
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : isScheduled ? (
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                                  <CalendarClock size={10} />
                                  Scheduled Inspection
                                </span>
                                <p className="text-white font-bold leading-tight">
                                  {(() => {
                                    const dateVal = item.scheduledDate;
                                    if (!dateVal) return 'Pending Date Confirmation';
                                    const date = new Date(dateVal);
                                    return !isNaN(date.getTime()) ? date.toLocaleDateString() : String(dateVal).split('T')[0];
                                  })()}
                                </p>
                              </div>
                            ) : null}

                            {item.auditNotes && (
                              <div className="mt-2 space-y-0.5">
                                <span className="text-[9px] font-black uppercase text-white/50 tracking-wider flex items-center gap-1">
                                  <FileText size={10} />
                                  Audit Notes
                                </span>
                                <p className="text-white/80 font-medium leading-relaxed whitespace-pre-wrap text-[11px]">
                                  {item.auditNotes}
                                </p>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-white/90 font-bold uppercase flex items-center justify-center gap-1 text-[11px]">
                                <MapPin size={10} className="text-blue-400" />
                                {item.barangay}
                              </span>
                              <span className="text-[9px] font-bold text-white/40 uppercase">
                                {item.categoryLabel}
                                {item.motorizedInfo && ` • ${item.motorizedInfo}`}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            {isRejected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-300 uppercase tracking-wider">
                                <RotateCcw size={11} />
                                REGISTER AGAIN
                              </span>
                            ) : isSpecialPaymentAsset ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                                <CreditCard size={11} />
                                Proceed to Office
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                Inspection Active
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTrackerItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center space-y-2">
                          <ShieldAlert size={36} className="mx-auto text-white/30" />
                          <p className="text-sm font-black uppercase text-white/70">
                            No Audit Records Found
                          </p>
                          <p className="text-xs text-white/40">
                            Try searching for another applicant name or registration ID.
                          </p>
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

      {/* ======================================================
          FOOTER
      ====================================================== */}
      <footer className="w-full pb-12 px-6 flex flex-col sm:flex-row justify-center items-center gap-6 text-white">
        <div className="flex items-center gap-4 bg-slate-900/50 px-6 py-4 rounded-2xl border border-white/20 backdrop-blur-3xl shadow-xl w-full sm:w-auto max-w-sm">
          <ShieldCheck size={34} className="text-blue-300" strokeWidth={2} />
          <div className="text-left">
            <h4 className="text-base font-black text-white leading-tight">SECURE</h4>
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-200">
              GOVERNMENT ENCRYPTED
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/50 px-6 py-4 rounded-2xl border border-white/20 backdrop-blur-3xl shadow-xl w-full sm:w-auto max-w-sm">
          <FileText size={34} className="text-blue-300" strokeWidth={2} />
          <div className="text-left">
            <h4 className="text-base font-black text-white leading-tight">INSTANT</h4>
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-200">
              DIGITAL CERTIFICATES
            </p>
          </div>
        </div>
      </footer>

      {/* ======================================================
          TERMS & PRIVACY POLICY MODAL
      ====================================================== */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl p-6 md:p-8 text-white backdrop-blur-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg md:text-xl font-black tracking-wide">
                  Terms & Privacy Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="my-6 overflow-y-auto space-y-4 pr-2 text-xs md:text-sm text-slate-300 leading-relaxed">
              <h4 className="font-bold text-white text-sm md:text-base">1. Acceptance of Terms</h4>
              <p>
                By accessing and using the AQUAREG Romblon Maritime Digital Boat Registry, you agree to comply with and be bound by these terms, government regulations, and local maritime policies.
              </p>

              <h4 className="font-bold text-white text-sm md:text-base">2. Data Privacy & Information Collection</h4>
              <p>
                All personal and vessel data is collected under the authority of the Department of Agriculture - Romblon for maritime governance, safety, and official record-keeping in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).
              </p>

              <h4 className="font-bold text-white text-sm md:text-base">3. Accuracy & Record Modification</h4>
              <p>
                Submitting corrections will update your existing database entry or replace incorrect attributes with newly validated entries. Providing false, misleading, or fraudulent information may result in statutory penalties and permit revocation.
              </p>

              <h4 className="font-bold text-white text-sm md:text-base">4. Inspection & Compliance Standards</h4>
              <p>
                All registered vessels must undergo scheduled physical inspection audits by authorized inspectors. Failure to present the vessel or required identification documents on the scheduled date may result in automatic rejection or flagging of the application.
              </p>

              <h4 className="font-bold text-white text-sm md:text-base">5. Re-Audit & Resubmission Guidelines</h4>
              <p>
                If your vessel registration is flagged or rejected, you may submit a new registration application with corrected documents or details. The previous rejected application remains in the audit history, while the new application receives its own registration record and proceeds independently.
              </p>

              <h4 className="font-bold text-white text-sm md:text-base">6. Data Security & Usage Rights</h4>
              <p>
                Information submitted through this portal is encrypted and restricted to authorized personnel of the Department of Agriculture and local municipal authorities. Your information will not be sold or shared with unauthorized third parties.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-full font-bold uppercase text-xs tracking-wider bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptTerms}
                className="w-full sm:w-auto px-8 py-3 rounded-full font-black uppercase text-xs tracking-wider bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg border border-white/30 flex items-center justify-center gap-2"
              >
                I Agree & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}