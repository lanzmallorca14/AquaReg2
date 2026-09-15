import { useState, useMemo } from 'react';
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
  notes?: string;
  remarks?: string;

  scheduled_date?: string;
  inspection_date?: string;
  created_at?: string;
  updated_at?: string;

  asset_category?: string;
  type?: string;

  is_motorized?: boolean;

  // ============================================================
  // PERMIT MANAGEMENT
  // ============================================================

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

  // ============================================================
  // PERMIT DELETION
  // ============================================================

  permit_deleted?: boolean;
  permitDeleted?: boolean;

  is_permit_deleted?: boolean;

  permit_deleted_at?: string;
  permitDeletedAt?: string;
}


// ============================================================
// CATEGORY NORMALIZATION
// ============================================================
//
// AuditQueuePage categories:
//
// payao
// balsa
// gears
// pangulong
//
// ============================================================

const getCategory = (vessel: Vessel): string => {
  const rawValues = [
    vessel?.asset_category,
    vessel?.type
  ];

  const normalizedValues = rawValues
    .filter(
      (value) =>
        value !== undefined &&
        value !== null
    )
    .map((value) =>
      String(value)
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
    );

  const category = normalizedValues.join(' ');

  // ------------------------------------------------------------
  // PAYAO / BALSA
  // ------------------------------------------------------------

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


  // ------------------------------------------------------------
  // FISHING GEAR
  // ------------------------------------------------------------

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


  // ------------------------------------------------------------
  // PANGULONG
  // ------------------------------------------------------------

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


  // ------------------------------------------------------------
  // NORMAL VESSEL
  // ------------------------------------------------------------

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

const getCategoryLabel = (vessel: Vessel): string => {
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
      return (
        vessel?.asset_category ||
        vessel?.type ||
        'GENERAL'
      )
        .toString()
        .toUpperCase();
  }
};


// ============================================================
// STATUS NORMALIZATION
// ============================================================

const getStatus = (vessel: Vessel): string => {
  return String(
    vessel?.status || ''
  )
    .trim()
    .toLowerCase();
};


// ============================================================
// SPECIAL PAYMENT / PERMIT ASSET
// ============================================================
//
// ONLY these receive the payment/permit notice:
//
// Fishing Gear
// Payao/Balsa
// Pangulong
//
// ============================================================

const isPaymentPermitAsset = (
  vessel: Vessel
): boolean => {
  const category = getCategory(vessel);

  return [
    'fishing_gear',
    'payao_balsa',
    'pangulong'
  ].includes(category);
};


// ============================================================
// APPROVED STATUS
// ============================================================
//
// AuditQueuePage uses:
//
// Passed
//
// Other parts of the system may use:
//
// Approved
//
// Both are accepted.
// ============================================================

const isApprovedStatus = (
  vessel: Vessel
): boolean => {
  const status = getStatus(vessel);

  return (
    status === 'passed' ||
    status === 'approved'
  );
};


// ============================================================
// PAYMENT / PERMIT READY
// ============================================================

const isPaymentPermitReady = (
  vessel: Vessel
): boolean => {
  return (
    isApprovedStatus(vessel) &&
    isPaymentPermitAsset(vessel)
  );
};


// ============================================================
// PERMIT DELETED
// ============================================================

const isPermitDeleted = (
  vessel: Vessel
): boolean => {

  // ------------------------------------------------------------
  // BOOLEAN DELETION FLAGS
  // ------------------------------------------------------------

  if (
    vessel?.permit_deleted === true ||
    vessel?.permitDeleted === true ||
    vessel?.is_permit_deleted === true
  ) {
    return true;
  }


  // ------------------------------------------------------------
  // DELETION DATE
  // ------------------------------------------------------------

  if (
    vessel?.permit_deleted_at !== undefined &&
    vessel?.permit_deleted_at !== null &&
    String(
      vessel.permit_deleted_at
    ).trim() !== ''
  ) {
    return true;
  }


  if (
    vessel?.permitDeletedAt !== undefined &&
    vessel?.permitDeletedAt !== null &&
    String(
      vessel.permitDeletedAt
    ).trim() !== ''
  ) {
    return true;
  }


  return false;
};


// ============================================================
// PERMIT ALREADY SAVED
// ============================================================
//
// If a permit exists OR has already been issued/saved,
// the public payment notice disappears.
//
// A deleted permit also hides the notice when
// Permit Management marks the record as deleted.
// ============================================================

const isPermitAlreadySaved = (
  vessel: Vessel
): boolean => {

  // ------------------------------------------------------------
  // DELETED PERMIT
  // ------------------------------------------------------------

  if (isPermitDeleted(vessel)) {
    return true;
  }


  // ------------------------------------------------------------
  // BOOLEAN FLAGS
  // ------------------------------------------------------------

  if (
    vessel?.permit_saved === true ||
    vessel?.permitSaved === true ||
    vessel?.is_permit_saved === true ||
    vessel?.permit_issued === true ||
    vessel?.is_permit_issued === true
  ) {
    return true;
  }


  // ------------------------------------------------------------
  // PERMIT ID
  // ------------------------------------------------------------

  if (
    vessel?.permit_id !== undefined &&
    vessel?.permit_id !== null &&
    String(
      vessel.permit_id
    ).trim() !== ''
  ) {
    return true;
  }


  // ------------------------------------------------------------
  // PERMIT NUMBER
  // ------------------------------------------------------------

  const permitNumber =
    vessel?.permit_number ||
    vessel?.permitNumber ||
    vessel?.permit_no ||
    vessel?.permitNo;

  if (
    permitNumber !== undefined &&
    permitNumber !== null &&
    String(
      permitNumber
    ).trim() !== ''
  ) {
    return true;
  }


  // ------------------------------------------------------------
  // PERMIT OBJECT
  // ------------------------------------------------------------

  if (
    vessel?.permit &&
    typeof vessel.permit === 'object'
  ) {
    return true;
  }


  // ------------------------------------------------------------
  // PERMIT STATUS
  // ------------------------------------------------------------

  const permitStatus = String(
    vessel?.permit_status ||
    vessel?.permitStatus ||
    ''
  )
    .trim()
    .toLowerCase();

  if (
    [
      'saved',
      'issued',
      'released',
      'approved',
      'active',
      'completed'
    ].includes(permitStatus)
  ) {
    return true;
  }


  return false;
};


// ============================================================
// DISPLAY NAME
// ============================================================

const getDisplayName = (
  vessel: Vessel
): string => {

  const candidates = [
    vessel?.vessel_name,
    vessel?.name,
    vessel?.boat_name,
    vessel?.registered_vessel_name,
    vessel?.vesselName
  ];

  const validName = candidates.find(
    (name) =>
      typeof name === 'string' &&
      name.trim().length > 0
  );

  if (validName) {
    return validName.trim();
  }


  const category = getCategory(vessel);


  if (category === 'fishing_gear') {
    return (
      vessel?.gear_type ||
      'UNNAMED FISHING GEAR'
    );
  }


  if (category === 'payao_balsa') {
    return (
      vessel?.gear_type ||
      'UNNAMED PAYAO/BALSA'
    );
  }


  if (category === 'pangulong') {
    return (
      vessel?.gear_type ||
      'UNNAMED PANGULONG'
    );
  }


  return 'UNNAMED ASSET';
};


// ============================================================
// HOMEPAGE
// ============================================================

export default function Homepage() {

  const navigate = useNavigate();

  const {
    Vessels = [],
    loading
  } = useAquaData();


  const [showTermsModal, setShowTermsModal] =
    useState<boolean>(false);


  const [vesselSearch, setVesselSearch] =
    useState<string>('');


  const [statusFilter, setStatusFilter] =
    useState<
      'all' |
      'scheduled' |
      'rejected' |
      'payment'
    >('all');


  // ============================================================
  // REGISTER
  // ============================================================
  //
  // IMPORTANT:
  // This always starts a NEW registration.
  //
  // It does NOT load or reuse a rejected record.
  //
  // ============================================================

  const handleRegisterClick = () => {

    localStorage.removeItem(
      'reRegisterVesselData'
    );

    localStorage.removeItem(
      'isReRegistering'
    );

    setShowTermsModal(true);
  };


  // ============================================================
  // ACCEPT TERMS
  // ============================================================

  const handleAcceptTerms = () => {

    setShowTermsModal(false);


    // ----------------------------------------------------------
    // ALWAYS START A FRESH REGISTRATION
    // ----------------------------------------------------------

    localStorage.removeItem(
      'reRegisterVesselData'
    );

    localStorage.removeItem(
      'isReRegistering'
    );


    navigate(
      '/new-registration'
    );
  };


  // ============================================================
  // SCROLL TO DASHBOARD
  // ============================================================

  const scrollToDashboard = () => {

    const el =
      document.getElementById(
        'vessels-dashboard'
      );

    if (el) {

      el.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };


  // ============================================================
  // SCHEDULED COUNT
  // ============================================================

  const scheduledCount = useMemo(() => {

    return (Vessels as Vessel[])
      .filter(
        (vessel) =>
          getStatus(vessel) ===
          'scheduled'
      )
      .length;

  }, [Vessels]);


  // ============================================================
  // REJECTED / FLAGGED COUNT
  // ============================================================

  const rejectedCount = useMemo(() => {

    return (Vessels as Vessel[])
      .filter(
        (vessel) => {

          const status =
            getStatus(vessel);

          return (
            status === 'rejected' ||
            status === 'flagged'
          );
        }
      )
      .length;

  }, [Vessels]);


  // ============================================================
  // PAYMENT / PERMIT COUNT
  // ============================================================

  const paymentPermitCount = useMemo(() => {

    return (Vessels as Vessel[])
      .filter(
        (vessel) =>
          isPaymentPermitReady(vessel) &&
          !isPermitAlreadySaved(vessel)
      )
      .length;

  }, [Vessels]);


  // ============================================================
  // FILTERED AUDIT RECORDS
  // ============================================================

  const filteredVessels = useMemo(() => {

    const query =
      vesselSearch
        .toLowerCase()
        .trim();


    return (Vessels as Vessel[])
      .filter(
        (vessel) => {

          const status =
            getStatus(vessel);


          // ------------------------------------------------------
          // REJECTED / FLAGGED
          // ------------------------------------------------------

          const isRejected =
            status === 'rejected' ||
            status === 'flagged';


          // ------------------------------------------------------
          // SCHEDULED
          // ------------------------------------------------------

          const isScheduled =
            status === 'scheduled';


          // ------------------------------------------------------
          // PAYMENT ASSET
          // ------------------------------------------------------

          const isSpecialPaymentAsset =
            isPaymentPermitReady(vessel);


          // ------------------------------------------------------
          // PERMIT SAVED OR DELETED
          // ------------------------------------------------------

          if (
            isSpecialPaymentAsset &&
            isPermitAlreadySaved(vessel)
          ) {
            return false;
          }


          // ------------------------------------------------------
          // ONLY SHOW:
          //
          // Scheduled
          // Rejected
          // Flagged
          // Approved Fishing Gear
          // Approved Payao/Balsa
          // Approved Pangulong
          // ------------------------------------------------------

          const isTarget =
            isScheduled ||
            isRejected ||
            isSpecialPaymentAsset;


          if (!isTarget) {
            return false;
          }


          // ------------------------------------------------------
          // FILTER BUTTON
          // ------------------------------------------------------

          let normalizedStatus:
            | 'scheduled'
            | 'rejected'
            | 'payment'
            | 'other';


          if (isRejected) {

            normalizedStatus =
              'rejected';

          } else if (isScheduled) {

            normalizedStatus =
              'scheduled';

          } else if (
            isSpecialPaymentAsset
          ) {

            normalizedStatus =
              'payment';

          } else {

            normalizedStatus =
              'other';
          }


          if (
            statusFilter !== 'all' &&
            normalizedStatus !==
              statusFilter
          ) {
            return false;
          }


          // ------------------------------------------------------
          // SEARCH
          // ------------------------------------------------------

          if (!query) {
            return true;
          }


          const searchable = [
            vessel?.id,
            vessel?.vessel_name,
            vessel?.boat_name,
            vessel?.registered_vessel_name,
            vessel?.owner_name,
            vessel?.owner,
            vessel?.gear_type,
            vessel?.barangay,
            vessel?.sitio,
            vessel?.asset_category,
            vessel?.type,
            vessel?.rejection_reason,
            vessel?.notes,
            vessel?.remarks,
            getCategoryLabel(vessel),
            getDisplayName(vessel)
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();


          return searchable.includes(
            query
          );
        }
      )
      .sort(
        (a, b) => {

          const dateA =
            new Date(
              a?.updated_at ||
              a?.created_at ||
              0
            ).getTime();

          const dateB =
            new Date(
              b?.updated_at ||
              b?.created_at ||
              0
            ).getTime();

          return dateB - dateA;
        }
      );

  }, [
    Vessels,
    vesselSearch,
    statusFilter
  ]);


  // ============================================================
  // PAGE
  // ============================================================

  return (

    <div
      className="min-h-screen font-sans text-white flex flex-col relative antialiased bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage:
          `url(${heroBg})`
      }}
    >

      <div className="absolute inset-0 bg-slate-900/50 -z-10" />


      {/* ======================================================
          NAVIGATION
      ====================================================== */}

      <nav className="w-full pt-4 px-4 sticky top-0 z-50 bg-transparent">

        <div className="max-w-7xl mx-auto shadow-2xl rounded-full px-8 py-3 flex justify-between items-center border border-white/30 bg-white/10 backdrop-blur-2xl">

          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >

            <div className="p-2.5 bg-blue-600/90 rounded-xl text-white shadow-lg group-hover:scale-105 transition-transform border border-white/20">

              <Anchor size={24} />

            </div>


            <div className="flex flex-col">

              <span className="font-black tracking-tight text-3xl text-white leading-none drop-shadow-md">
                AQUAREG
              </span>

              <span className="text-[11px] font-bold tracking-widest text-blue-300 uppercase leading-none mt-1">
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
              onClick={() =>
                navigate('/about_us')
              }
              className="flex items-center gap-2 font-black uppercase text-xs tracking-wider text-white hover:text-blue-300 transition-colors drop-shadow-md"
            >
              <Info size={16} />
              About Us
            </button>


            <button
              type="button"
              onClick={() =>
                navigate('/login')
              }
              className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase text-xs tracking-wider transition-all active:scale-95 shadow-lg border border-white/30"
            >
              <Lock size={14} />
              STAFF PORTAL
            </button>

          </div>

        </div>

      </nav>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 flex flex-col justify-center w-full gap-16">


        {/* ====================================================
            HERO
        ==================================================== */}

        <div className="flex items-center justify-between gap-8 w-full">

          <div className="flex-1 flex flex-col items-start text-left space-y-8 p-10 md:p-14 w-full max-w-2xl bg-white/10 backdrop-blur-3xl border border-white/25 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)]">

            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/15 border border-white/30 rounded-full text-white backdrop-blur-md">

              <Anchor
                size={16}
                className="text-blue-300"
              />

              <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                DEPT OF AGRICULTURE • ROMBLON
              </span>

            </div>


            <div className="space-y-1">

              <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-white leading-none">
                DIGITAL BOAT
              </h1>

              <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-blue-200 leading-none">
                REGISTRY
              </h1>

              <p className="max-w-xl text-white text-lg font-medium leading-relaxed pt-4">
                Streamlining maritime governance in Romblon.
                Register vessels, verify municipal permits, and
                track inspection schedules effortlessly.
              </p>

            </div>


            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full">

              <button
                type="button"
                onClick={
                  handleRegisterClick
                }
                className="flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 w-full sm:w-auto border border-white/20"
              >
                REGISTER VESSEL 
              </button>


              <button
                type="button"
                onClick={() =>
                  navigate('/verify-permit')
                }
                className="px-8 py-5 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-md rounded-full font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg w-full sm:w-auto text-center"
              >
                Verify Permit
              </button>

            </div>

          </div>


          {/* ==================================================
              COUNTERS
          ================================================== */}

          <div className="hidden lg:flex flex-col gap-6 w-80">

            {/* SCHEDULED */}

            <div className="p-6 bg-white/10 backdrop-blur-3xl border border-white/25 rounded-3xl shadow-xl flex items-center gap-4">

              <div className="p-3 bg-blue-600/80 border border-white/30 rounded-2xl text-white">
                <CalendarClock size={32} />
              </div>

              <div>

                <h3 className="text-2xl font-black text-white">
                  {scheduledCount}
                </h3>

                <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Scheduled Audits
                </p>

              </div>

            </div>


            {/* REJECTED */}

            <div className="p-6 bg-white/10 backdrop-blur-3xl border border-white/25 rounded-3xl shadow-xl flex items-center gap-4">

              <div className="p-3 bg-red-600/80 border border-white/30 rounded-2xl text-white">
                <ShieldAlert size={32} />
              </div>

              <div>

                <h3 className="text-2xl font-black text-white">
                  {rejectedCount}
                </h3>

                <p className="text-xs font-bold uppercase tracking-wider text-red-200">
                  Flagged / Rejected
                </p>

              </div>

            </div>


            {/* PAYMENT */}

            <div className="p-6 bg-white/10 backdrop-blur-3xl border border-white/25 rounded-3xl shadow-xl flex items-center gap-4">

              <div className="p-3 bg-emerald-600/80 border border-white/30 rounded-2xl text-white">
                <CreditCard size={32} />
              </div>

              <div>

                <h3 className="text-2xl font-black text-white">
                  {paymentPermitCount}
                </h3>

                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Payment / Permit
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* ====================================================
            AUDIT TRACKER
        ==================================================== */}

        <section
          id="vessels-dashboard"
          className="w-full pt-10"
        >

          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8">


            {/* HEADER */}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/15 pb-8">

              <div>

                <div className="flex items-center gap-3 text-blue-300 font-bold text-xs uppercase tracking-widest mb-2">

                  <Activity size={18} />

                  Application Status Directory

                </div>


                <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-white leading-none">
                  Audit Tracker
                </h2>


                <p className="text-sm font-medium text-blue-100 mt-2 max-w-xl">
                  Public audit portal. Check whether your application
                  has been scheduled for physical inspection, flagged
                  due to invalid requirements, or approved for payment
                  and permit processing.
                </p>

              </div>


              <div className="flex items-center gap-3 flex-wrap">


                {/* SCHEDULED */}

                <div className="flex items-center gap-3 bg-blue-900/40 border border-blue-400/30 rounded-2xl p-4 backdrop-blur-md">

                  <CalendarClock
                    size={24}
                    className="text-blue-400"
                  />

                  <div>

                    <p className="text-[9px] font-black uppercase text-blue-200 tracking-wider">
                      Scheduled
                    </p>

                    <p className="text-xl font-black text-white leading-none">
                      {scheduledCount}
                    </p>

                  </div>

                </div>


                {/* REJECTED */}

                <div className="flex items-center gap-3 bg-red-900/40 border border-red-400/30 rounded-2xl p-4 backdrop-blur-md">

                  <ShieldAlert
                    size={24}
                    className="text-red-400"
                  />

                  <div>

                    <p className="text-[9px] font-black uppercase text-red-200 tracking-wider">
                      Rejected
                    </p>

                    <p className="text-xl font-black text-white leading-none">
                      {rejectedCount}
                    </p>

                  </div>

                </div>


                {/* PAYMENT */}

                <div className="flex items-center gap-3 bg-emerald-900/40 border border-emerald-400/30 rounded-2xl p-4 backdrop-blur-md">

                  <CreditCard
                    size={24}
                    className="text-emerald-400"
                  />

                  <div>

                    <p className="text-[9] font-black uppercase text-emerald-200 tracking-wider">
                      Payment / Permit
                    </p>

                    <p className="text-xl font-black text-white leading-none">
                      {paymentPermitCount}
                    </p>

                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                SEARCH + FILTER
            ================================================= */}

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

              <div className="relative w-full md:max-w-md">

                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
                  size={18}
                />

                <input
                  type="text"
                  placeholder="Search name, ID, rejection reason, or barangay..."
                  value={vesselSearch}
                  onChange={(e) =>
                    setVesselSearch(
                      e.target.value
                    )
                  }
                  className="w-full pl-12 pr-4 h-14 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md transition-all"
                />

              </div>


              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">


                {/* ALL */}

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter('all')
                  }
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white border-white/40 shadow-lg'
                      : 'bg-white/5 text-white/80 border-white/15 hover:bg-white/15'
                  }`}
                >
                  All (
                  {scheduledCount +
                    rejectedCount +
                    paymentPermitCount}
                  )
                </button>


                {/* SCHEDULED */}

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      'scheduled'
                    )
                  }
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${
                    statusFilter ===
                    'scheduled'
                      ? 'bg-blue-600 text-white border-white/40 shadow-lg'
                      : 'bg-white/5 text-blue-200 border-white/15 hover:bg-white/15'
                  }`}
                >

                  <CalendarClock size={14} />

                  Scheduled (
                  {scheduledCount}
                  )

                </button>


                {/* REJECTED */}

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      'rejected'
                    )
                  }
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${
                    statusFilter ===
                    'rejected'
                      ? 'bg-red-600 text-white border-white/40 shadow-lg'
                      : 'bg-white/5 text-red-300 border-white/15 hover:bg-white/15'
                  }`}
                >

                  <ShieldAlert size={14} />

                  Rejected (
                  {rejectedCount}
                  )

                </button>


                {/* PAYMENT */}

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      'payment'
                    )
                  }
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${
                    statusFilter ===
                    'payment'
                      ? 'bg-emerald-600 text-white border-white/40 shadow-lg'
                      : 'bg-white/5 text-emerald-300 border-white/15 hover:bg-white/15'
                  }`}
                >

                  <CreditCard size={14} />

                  Payment (
                  {paymentPermitCount}
                  )

                </button>

              </div>

            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            {loading ? (

              <div className="py-20 text-center space-y-4">

                <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />

                <p className="text-xs font-black uppercase tracking-widest text-blue-200">
                  Loading Audit Queue...
                </p>

              </div>

            ) : (

              <div className="w-full overflow-x-auto rounded-3xl border border-white/20 bg-slate-950/40 backdrop-blur-2xl shadow-xl">

                <table className="w-full text-left border-collapse min-w-[900px]">

                  <thead>

                    <tr className="border-b border-white/15 bg-white/5 text-[10px] font-black uppercase tracking-wider text-blue-200">

                      <th className="py-4 px-6">
                        ID
                      </th>

                      <th className="py-4 px-6">
                        Vessel / Asset Name
                      </th>

                      <th className="py-4 px-6">
                        Owner
                      </th>

                      <th className="py-4 px-6">
                        Status
                      </th>

                      <th className="py-4 px-6">
                        Schedule / Notice Details
                      </th>

                      <th className="py-4 px-6 text-center">
                        Location & Type
                      </th>

                      <th className="py-4 px-6 text-right">
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-white/10 text-xs">

                    {filteredVessels.map(
                      (vessel) => {

                        const status =
                          getStatus(vessel);


                        const isRejected =
                          status ===
                            'rejected' ||
                          status ===
                            'flagged';


                        const isScheduled =
                          status ===
                          'scheduled';


                        const isSpecialPaymentAsset =
                          isPaymentPermitReady(
                            vessel
                          );


                        return (

                          <tr
                            key={
                              vessel.id
                            }
                            className={`transition-colors hover:bg-white/10 ${
                              isRejected
                                ? 'bg-red-950/20'
                                : isSpecialPaymentAsset
                                ? 'bg-emerald-950/20'
                                : 'bg-blue-950/20'
                            }`}
                          >

                            {/* ID */}

                            <td className="py-4 px-6 font-mono font-bold text-white/60 text-[11px] whitespace-nowrap">

                              #{vessel.id}

                            </td>


                            {/* ASSET NAME */}

                            <td className="py-4 px-6 font-black uppercase text-white tracking-tight">

                              {getDisplayName(
                                vessel
                              )}

                            </td>


                            {/* OWNER */}

                            <td className="py-4 px-6 font-bold text-blue-100 uppercase whitespace-nowrap">

                              {vessel.owner_name ||
                                vessel.owner ||
                                'N/A'}

                            </td>


                            {/* STATUS */}

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

                                  <ShieldAlert
                                    size={12}
                                  />

                                ) : isSpecialPaymentAsset ? (

                                  <CheckCircle2
                                    size={12}
                                  />

                                ) : (

                                  <CalendarClock
                                    size={12}
                                  />

                                )}

                                {isSpecialPaymentAsset
                                  ? 'APPROVED'
                                  : vessel.status}

                              </span>

                            </td>


                            {/* DETAILS */}

                            <td className="py-4 px-6 max-w-sm">


                              {/* REJECTED */}

                              {isRejected ? (

                                <div className="space-y-1">

                                  <span className="text-[9px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1">

                                    <RotateCcw
                                      size={10}
                                    />

                                    Rejection Reason

                                  </span>


                                  <p className="text-red-200 italic font-medium leading-tight">

                                    {vessel.rejection_reason ||
                                      vessel.notes ||
                                      vessel.remarks ||
                                      'Invalid documents or contact details.'}

                                  </p>

                                </div>


                              ) : isSpecialPaymentAsset ? (


                                /* ==========================================
                                   PAYMENT NOTICE
                                ========================================== */

                                <div className="p-4 bg-emerald-900/30 border border-emerald-400/30 rounded-2xl">

                                  <div className="flex items-start gap-3">

                                    <div className="p-2 bg-emerald-500/20 rounded-xl">

                                      <CreditCard
                                        size={20}
                                        className="text-emerald-300"
                                      />

                                    </div>


                                    <div className="space-y-1">

                                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">

                                        <CheckCircle2
                                          size={10}
                                        />

                                        Application Approved

                                      </span>


                                      <p className="text-white font-black uppercase text-xs">

                                        {getCategoryLabel(
                                          vessel
                                        )}{' '}
                                        Approved

                                      </p>


                                      <p className="text-emerald-100 font-medium leading-relaxed">

                                        Proceed to Office
                                        of Agriculture
                                        for payment and
                                        permit.

                                        {' '}THANK YOU!!

                                      </p>

                                    </div>

                                  </div>

                                </div>


                              ) : isScheduled ? (


                                /* ==========================================
                                   SCHEDULED
                                ========================================== */

                                <div className="space-y-0.5">

                                  <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">

                                    <CalendarClock
                                      size={10}
                                    />

                                    Scheduled Inspection

                                  </span>


                                  <p className="text-white font-bold leading-tight">

                                    {(() => {

                                      const dateVal =
                                        vessel.scheduled_date ||
                                        vessel.inspection_date;


                                      if (!dateVal) {

                                        return 'Pending Date Confirmation';

                                      }


                                      const date =
                                        new Date(
                                          dateVal
                                        );


                                      return !isNaN(
                                        date.getTime()
                                      )
                                        ? date.toLocaleDateString()
                                        : String(
                                            dateVal
                                          ).split(
                                            'T'
                                          )[0];

                                    })()}

                                  </p>

                                </div>


                              ) : null}

                            </td>


                            {/* LOCATION / TYPE */}

                            <td className="py-4 px-6 text-center whitespace-nowrap">

                              <div className="flex flex-col items-center gap-0.5">

                                <span className="text-white/80 font-bold uppercase flex items-center justify-center gap-1 text-[11px]">

                                  <MapPin
                                    size={10}
                                    className="text-blue-400"
                                  />

                                  {vessel.barangay ||
                                    'N/A'}

                                </span>


                                <span className="text-[9px] font-bold text-white/40 uppercase">

                                  {getCategoryLabel(
                                    vessel
                                  )}

                                  {/* MOTOR STATUS ONLY FOR NORMAL VESSEL */}

                                  {getCategory(vessel) === 'vessel' && (
                                    <>
                                      {' • '}
                                      {vessel.is_motorized
                                        ? 'Motorized'
                                        : 'Non-Motorized'}
                                    </>
                                  )}

                                </span>

                              </div>

                            </td>


                            {/* ACTION */}

                            <td className="py-4 px-6 text-right whitespace-nowrap">


                              {isRejected ? (

                                /*
                                 * IMPORTANT:
                                 *
                                 * There is NO Register Again button.
                                 *
                                 * The rejected record remains as history.
                                 * The client can use the main REGISTER VESSEL
                                 * button to create a completely new application.
                                 */

                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-300 uppercase tracking-wider">

                                  <RotateCcw
                                    size={12}
                                  />

                                  REGISTERED AGAIN — NEW APPLICATION

                                </span>


                              ) : isSpecialPaymentAsset ? (

                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-300 uppercase tracking-wider">

                                  <CreditCard
                                    size={12}
                                  />

                                  Proceed to Office

                                </span>


                              ) : (

                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">

                                  Inspection Active

                                </span>

                              )}

                            </td>

                          </tr>

                        );
                      }
                    )}


                    {/* EMPTY */}

                    {filteredVessels.length === 0 && (

                      <tr>

                        <td
                          colSpan={7}
                          className="py-16 text-center space-y-2"
                        >

                          <ShieldAlert
                            size={36}
                            className="mx-auto text-white/40"
                          />

                          <p className="text-sm font-black uppercase text-white/70">
                            No Audit Records Found
                          </p>

                          <p className="text-xs text-white/40">
                            Try searching for another
                            applicant name or registration ID.
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

        <div className="flex items-center gap-4 bg-white/10 px-8 py-5 rounded-2xl border border-white/25 backdrop-blur-3xl shadow-xl w-full sm:w-auto max-w-sm">

          <ShieldCheck
            size={38}
            className="text-blue-300"
            strokeWidth={2}
          />

          <div className="text-left">

            <h4 className="text-lg font-black text-white leading-tight">
              SECURE
            </h4>

            <p className="text-xs font-bold uppercase tracking-wide text-blue-200">
              GOVERNMENT ENCRYPTED
            </p>

          </div>

        </div>


        <div className="flex items-center gap-4 bg-white/10 px-8 py-5 rounded-2xl border border-white/25 backdrop-blur-3xl shadow-xl w-full sm:w-auto max-w-sm">

          <FileText
            size={38}
            className="text-blue-300"
            strokeWidth={2}
          />

          <div className="text-left">

            <h4 className="text-lg font-black text-white leading-tight">
              INSTANT
            </h4>

            <p className="text-xs font-bold uppercase tracking-wide text-blue-200">
              DIGITAL CERTIFICATES
            </p>

          </div>

        </div>

      </footer>


      {/* ======================================================
          TERMS MODAL
      ====================================================== */}

      {showTermsModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">

          <div className="relative w-full max-w-xl bg-slate-900/90 border border-white/20 rounded-3xl shadow-2xl p-8 text-white backdrop-blur-2xl flex flex-col max-h-[85vh]">


            <div className="flex items-center justify-between pb-4 border-b border-white/10">

              <div className="flex items-center gap-3">

                <div className="p-2 bg-blue-600/90 rounded-xl text-white">

                  <FileText size={20} />

                </div>

                <h3 className="text-xl font-black tracking-wide">

                  Terms & Privacy Policy

                </h3>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowTermsModal(
                    false
                  )
                }
                className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >

                <X size={20} />

              </button>

            </div>


            <div className="my-6 overflow-y-auto space-y-4 pr-2 text-sm text-white/80 leading-relaxed">


              <h4 className="font-bold text-white text-base">
                1. Acceptance of Terms
              </h4>

              <p>
                By accessing and using the AQUAREG Romblon Maritime
                Digital Boat Registry, you agree to comply with and
                be bound by these terms, government regulations,
                and local maritime policies.
              </p>


              <h4 className="font-bold text-white text-base">
                2. Data Privacy & Information Collection
              </h4>

              <p>
                All personal and vessel data is collected under the
                authority of the Department of Agriculture - Romblon
                for maritime governance, safety, and official
                record-keeping in accordance with Republic Act No.
                10173 (Data Privacy Act of 2012).
              </p>


              <h4 className="font-bold text-white text-base">
                3. Accuracy & Record Modification
              </h4>

              <p>
                Submitting corrections will update your existing
                database entry or replace incorrect attributes with
                newly validated entries. Providing false, misleading,
                or fraudulent information may result in statutory
                penalties and permit revocation.
              </p>


              <h4 className="font-bold text-white text-base">
                4. Inspection & Compliance Standards
              </h4>

              <p>
                All registered vessels must undergo scheduled
                physical inspection audits by authorized inspectors.
                Failure to present the vessel or required
                identification documents on the scheduled date may
                result in automatic rejection or flagging of the
                application.
              </p>


              <h4 className="font-bold text-white text-base">
                5. Re-Audit & Resubmission Guidelines
              </h4>

              <p>
                If your vessel registration is flagged or rejected,
                you may submit a new registration application with
                corrected documents or details. The previous
                rejected application remains in the audit history,
                while the new application receives its own
                registration record and proceeds independently.
              </p>


              <h4 className="font-bold text-white text-base">
                6. Data Security & Usage Rights
              </h4>

              <p>
                Information submitted through this portal is
                encrypted and restricted to authorized personnel of
                the Department of Agriculture and local municipal
                authorities. Your information will not be sold or
                shared with unauthorized third parties.
              </p>


              <h4 className="font-bold text-white text-base">
                7. System Modifications & Updates
              </h4>

              <p>
                The municipal registry authority reserves the right
                to update or modify registration guidelines,
                requirements, or terms of service at any time to
                comply with evolving maritime laws and local
                ordinances.
              </p>

            </div>


            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  setShowTermsModal(
                    false
                  )
                }
                className="w-full sm:w-auto px-6 py-3 rounded-full font-bold uppercase text-xs tracking-wider bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20"
              >
                Cancel
              </button>


              <button
                type="button"
                onClick={
                  handleAcceptTerms
                }
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

