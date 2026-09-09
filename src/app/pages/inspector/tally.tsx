import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/card';

import {
  Search,
  User,
  ChevronRight,
  Loader2,
  X,
  Ship,
  ShieldCheck,
  Shield,
  MapPin,
  Scale,
  Settings2,
  Anchor,
  Zap,
  Clipboard,
  Layers,
} from 'lucide-react';

import {
  useAquaData,
  useAquaAuth,
} from '../../components/context/AquaRegCONTEXT';

import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '../../components/ui/dialog';

interface Vessel {
  id?: string;

  vessel_name?: string | null;
  owner_name?: string | null;
  type?: string | null;
  barangay?: string | null;

  or_number?: string | null;

  status?: string | null;

  /*
   * Inspector assignment fields
   */
  inspector_id?: string | null;
  assigned_inspector?: string | null;

  /*
   * Some records may use alternative inspector fields.
   * Keeping these optional makes the filtering more tolerant
   * of records created by older versions of the system.
   */
  inspector_name?: string | null;
  inspected_by?: string | null;
  inspected_by_id?: string | null;

  updated_at?: string | null;
  created_at?: string | null;

  tonnage_gross?: string | number | null;
  tonnage_net?: string | number | null;

  hull_length?: string | number | null;
  hull_width?: string | number | null;
  hull_depth?: string | number | null;

  engine_make?: string | null;
  engine_hp?: string | number | null;
  engine_serial?: string | null;

  remarks?: string | null;
}

/* =========================================================
   NORMALIZE VALUE
========================================================= */

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

/* =========================================================
   GET INSPECTOR ID
========================================================= */

function getCurrentInspectorId(currentUser: any): string {
  if (!currentUser) return '';

  return normalize(
    currentUser.id ??
      currentUser.user_id ??
      currentUser.inspector_id ??
      currentUser.uid ??
      ''
  );
}

/* =========================================================
   GET INSPECTOR NAME
========================================================= */

function getCurrentInspectorName(currentUser: any): string {
  if (!currentUser) return '';

  return normalize(
    currentUser.name ??
      currentUser.full_name ??
      currentUser.fullName ??
      currentUser.username ??
      currentUser.email ??
      ''
  );
}

/* =========================================================
   CHECK IF RECORD BELONGS TO CURRENT INSPECTOR
========================================================= */

function isRecordInspectedByCurrentInspector(
  vessel: Vessel,
  currentUser: any
): boolean {
  if (!currentUser) {
    return false;
  }

  const currentInspectorId =
    getCurrentInspectorId(currentUser);

  const currentInspectorName =
    getCurrentInspectorName(currentUser);

  /*
   * -------------------------------------------------------
   * 1. PRIMARY MATCH — INSPECTOR UUID / ID
   * -------------------------------------------------------
   */

  const recordInspectorIds = [
    vessel.inspector_id,
    vessel.inspected_by_id,
  ]
    .map(normalize)
    .filter(Boolean);

  if (
    currentInspectorId &&
    recordInspectorIds.includes(currentInspectorId)
  ) {
    return true;
  }

  /*
   * -------------------------------------------------------
   * 2. SECONDARY MATCH — INSPECTOR NAME
   * -------------------------------------------------------
   */

  const recordInspectorNames = [
    vessel.assigned_inspector,
    vessel.inspector_name,
    vessel.inspected_by,
  ]
    .map(normalize)
    .filter(Boolean);

  if (
    currentInspectorName &&
    recordInspectorNames.includes(currentInspectorName)
  ) {
    return true;
  }

  /*
   * -------------------------------------------------------
   * 3. HANDLE NAME FORMAT DIFFERENCES
   *
   * Example:
   *
   * Database:
   * "JUAN DELA CRUZ"
   *
   * Login:
   * "Juan Dela Cruz"
   *
   * Both normalize to the same value.
   * -------------------------------------------------------
   */

  if (currentInspectorName) {
    const currentNameParts = currentInspectorName
      .split(/\s+/)
      .filter(Boolean);

    for (const recordName of recordInspectorNames) {
      const recordNameParts = recordName
        .split(/\s+/)
        .filter(Boolean);

      /*
       * Require at least two matching name parts.
       * This avoids accidentally matching very short names.
       */
      if (
        currentNameParts.length >= 2 &&
        recordNameParts.length >= 2
      ) {
        const matchingParts = currentNameParts.filter((part) =>
          recordNameParts.includes(part)
        );

        if (matchingParts.length >= 2) {
          return true;
        }
      }
    }
  }

  return false;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function InspectionRecords() {
  const {
    Vessels = [],
    loading,
  } = useAquaData() as any;

  const {
    currentUser,
  } = useAquaAuth();

  const [searchQuery, setSearchQuery] =
    useState('');

  const [selectedRecord, setSelectedRecord] =
    useState<Vessel | null>(null);

  /* =======================================================
     FILTER RECORDS
  ======================================================= */

  const records = useMemo(() => {
    const safeVessels: Vessel[] =
      Array.isArray(Vessels)
        ? Vessels
        : [];

    /*
     * IMPORTANT:
     *
     * We DO NOT filter by:
     *
     * status === "Passed"
     *
     * and we DO NOT require:
     *
     * OR number
     *
     * anymore.
     *
     * Any record assigned/inspected by the current inspector
     * will appear here.
     */

    return safeVessels
      .filter((vessel) =>
        isRecordInspectedByCurrentInspector(
          vessel,
          currentUser
        )
      )

      /*
       * SEARCH
       */
      .filter((vessel) => {
        const query =
          normalize(searchQuery);

        if (!query) {
          return true;
        }

        const vesselName =
          normalize(vessel.vessel_name);

        const ownerName =
          normalize(vessel.owner_name);

        const orNumber =
          normalize(vessel.or_number);

        const category =
          normalize(vessel.type);

        const barangay =
          normalize(vessel.barangay);

        const status =
          normalize(vessel.status);

        return (
          vesselName.includes(query) ||
          ownerName.includes(query) ||
          orNumber.includes(query) ||
          category.includes(query) ||
          barangay.includes(query) ||
          status.includes(query)
        );
      })

      /*
       * MOST RECENT INSPECTION FIRST
       */
      .sort(
        (a, b) =>
          new Date(
            b.updated_at ||
              b.created_at ||
              0
          ).getTime() -
          new Date(
            a.updated_at ||
              a.created_at ||
              0
          ).getTime()
      );
  }, [
    Vessels,
    searchQuery,
    currentUser,
  ]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-10 text-[11px]">

      {/* ===================================================
          ARCHIVE HEADER
      =================================================== */}

      <header className="bg-[#0f172a] pt-12 pb-16 px-6 rounded-b-[2.5rem] shadow-xl">
        <div className="max-w-3xl mx-auto flex justify-between items-end">

          <div>
            <p className="text-blue-400 font-black uppercase tracking-widest mb-1">
              Municipal Registry
            </p>

            <h1 className="text-2xl font-black italic uppercase text-white leading-tight">
              Inspection{' '}
              <span className="text-blue-500">
                Archives
              </span>
            </h1>

            {/* CURRENT INSPECTOR */}
            {currentUser && (
              <p className="mt-2 text-[9px] text-slate-400 uppercase font-black">
                Inspector:{' '}
                <span className="text-white">
                  {currentUser.name ||
                    (currentUser as any).full_name ||
                    (currentUser as any).username ||
                    currentUser.email ||
                    'Authenticated Inspector'}
                </span>
              </p>
            )}
          </div>

          <div className="bg-white/10 p-2 px-4 rounded-xl border border-white/10 text-center">

            <p className="text-[8px] font-black uppercase text-slate-400 leading-none mb-1">
              Inspected Records
            </p>

            <p className="text-lg font-black text-white leading-none">
              {loading
                ? '...'
                : records.length}
            </p>

          </div>
        </div>
      </header>

      {/* ===================================================
          MAIN SEARCH & LIST FEED
      =================================================== */}

      <main className="max-w-3xl mx-auto px-6 -mt-8">

        {/* SEARCH */}
        <div className="relative mb-6">

          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />

          <input
            placeholder="Search name, owner, OR, category, barangay..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="h-14 w-full pl-12 pr-6 bg-white shadow-lg rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none border-none text-sm"
          />

        </div>

        {/* RECORD LIST */}

        <div className="grid grid-cols-1 gap-3">

          {loading ? (

            <div className="py-10 text-center text-slate-400 italic">

              <Loader2
                className="animate-spin mx-auto mb-2"
              />

              Syncing Database...

            </div>

          ) : records.length === 0 ? (

            <div className="py-12 text-center text-slate-400 italic bg-white rounded-2xl shadow-sm">

              <Shield
                className="mx-auto mb-3 text-slate-300"
                size={28}
              />

              <p>
                No inspection records found
                under your account.
              </p>

              <p className="text-[9px] mt-2 text-slate-300">
                Records assigned to this inspector
                will automatically appear here.
              </p>

            </div>

          ) : (

            records.map((record) => (

              <Card
                key={record.id}
                className="p-3 rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-white cursor-pointer"
                onClick={() =>
                  setSelectedRecord(record)
                }
              >

                <div className="flex items-center gap-4">

                  {/* ICON */}

                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">

                    <Ship size={20} />

                  </div>

                  {/* INFORMATION */}

                  <div className="flex-1 min-w-0">

                    <div className="flex items-center gap-2 mb-0.5">

                      <h3 className="font-black text-slate-900 uppercase italic truncate text-[12px]">
                        {record.vessel_name ||
                          'Unnamed Vessel'}
                      </h3>

                      <Badge className="bg-blue-100 text-blue-700 h-4 text-[7px] font-black uppercase px-1.5 border-none">
                        {record.type ||
                          'VESSEL'}
                      </Badge>

                    </div>

                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 font-bold uppercase">

                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {record.owner_name ||
                          'UNKNOWN OWNER'}
                      </span>

                      {record.or_number && (
                        <span className="text-emerald-600 font-black italic">
                          O.R. #{record.or_number}
                        </span>
                      )}

                      {record.status && (
                        <span className="text-blue-500 font-black italic">
                          {record.status}
                        </span>
                      )}

                    </div>

                  </div>

                  <ChevronRight
                    size={16}
                    className="text-slate-300 shrink-0"
                  />

                </div>

              </Card>

            ))

          )}

        </div>

      </main>

      {/* ===================================================
          SYSTEM ARCHIVE INSPECTION MODAL
      =================================================== */}

      <Dialog
        open={!!selectedRecord}
        onOpenChange={(open) =>
          !open &&
          setSelectedRecord(null)
        }
      >

        <DialogContent className="max-w-lg p-0 rounded-3xl overflow-hidden border-none shadow-2xl">

          {selectedRecord && (

            <div className="flex flex-col bg-white">

              {/* =================================================
                  MODAL HEADER
              ================================================= */}

              <div className="bg-[#0f172a] p-5 text-white flex justify-between items-start">

                <div>

                  <div className="flex items-center gap-2 mb-1 text-emerald-400">

                    <ShieldCheck size={16} />

                    <p className="text-[8px] font-black uppercase tracking-widest">
                      Official Audit Record
                    </p>

                  </div>

                  <h2 className="text-xl font-black italic uppercase tracking-tight leading-none">
                    {selectedRecord.vessel_name ||
                      'Unnamed Vessel'}
                  </h2>

                </div>

                <button
                  onClick={() =>
                    setSelectedRecord(null)
                  }
                  aria-label="Close archive detail modal"
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>

              </div>

              {/* =================================================
                  MODAL BODY
              ================================================= */}

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">

                {/* BASIC INFORMATION */}

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">

                  <DetailItem
                    icon={<User size={14} />}
                    label="Owner"
                    value={
                      selectedRecord.owner_name
                    }
                  />

                  <DetailItem
                    icon={<Layers size={14} />}
                    label="Category"
                    value={
                      selectedRecord.type
                    }
                  />

                  <DetailItem
                    icon={<MapPin size={14} />}
                    label="Barangay"
                    value={
                      selectedRecord.barangay
                    }
                  />

                  <DetailItem
                    icon={<Settings2 size={14} />}
                    label="O.R. No."
                    value={
                      selectedRecord.or_number ||
                      'NOT YET ASSIGNED'
                    }
                  />

                  <DetailItem
                    icon={<Clipboard size={14} />}
                    label="System ID"
                    value={
                      selectedRecord.id?.slice(
                        0,
                        18
                      )
                    }
                  />

                  <DetailItem
                    icon={<ShieldCheck size={14} />}
                    label="Status"
                    value={
                      selectedRecord.status ||
                      'INSPECTED'
                    }
                  />

                </div>

                {/* =================================================
                    INSPECTOR SECURITY DATA
                ================================================= */}

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-200">

                      <Shield size={18} />

                    </div>

                    <div>

                      <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">
                        Inspected By
                      </p>

                      <p className="font-black text-[12px] uppercase italic text-slate-800 leading-none">

                        {selectedRecord.assigned_inspector ||
                          selectedRecord.inspector_name ||
                          selectedRecord.inspected_by ||
                          currentUser?.name ||
                          'OFFICIAL INSPECTOR'}

                      </p>

                    </div>

                  </div>

                  <div className="text-right">

                    <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">
                      Inspection Date
                    </p>

                    <p className="font-black text-[11px] text-slate-700">

                      {selectedRecord.updated_at
                        ? new Date(
                            selectedRecord.updated_at
                          ).toLocaleDateString()
                        : selectedRecord.created_at
                        ? new Date(
                            selectedRecord.created_at
                          ).toLocaleDateString()
                        : new Date().toLocaleDateString()}

                    </p>

                  </div>

                </div>

                {/* =================================================
                    TECHNICAL SPECIFICATIONS
                ================================================= */}

                <div className="grid grid-cols-2 gap-3 pt-2">

                  <TechCard
                    icon={<Scale size={16} />}
                    label="Tonnage"
                    value={`${selectedRecord.tonnage_gross || '0.00'} GT / ${selectedRecord.tonnage_net || '0.00'} NT`}
                  />

                  <TechCard
                    icon={<Anchor size={16} />}
                    label="Dimensions"
                    value={`L: ${
                      selectedRecord.hull_length ||
                      '0'
                    }m | W: ${
                      selectedRecord.hull_width ||
                      '0'
                    }m | D: ${
                      selectedRecord.hull_depth ||
                      '0'
                    }m`}
                  />

                  <TechCard
                    icon={<Zap size={16} />}
                    label="Engine Make"
                    value={
                      selectedRecord.engine_make ||
                      'N/A'
                    }
                  />

                  <TechCard
                    icon={<Settings2 size={16} />}
                    label="Power & Serial"
                    value={`${selectedRecord.engine_hp || '0'} HP / SN: ${
                      selectedRecord.engine_serial ||
                      'N/A'
                    }`}
                  />

                </div>

                {/* =================================================
                    REMARKS
                ================================================= */}

                {selectedRecord.remarks && (

                  <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100">

                    <p className="text-[7px] font-black text-blue-400 uppercase mb-1">
                      Inspector Remarks
                    </p>

                    <p className="text-[10px] italic text-slate-600 leading-tight">
                      {selectedRecord.remarks}
                    </p>

                  </div>

                )}

              </div>

              {/* =================================================
                  FOOTER
              ================================================= */}

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">

                <button
                  onClick={() =>
                    setSelectedRecord(null)
                  }
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-black text-[9px] uppercase hover:bg-slate-300 transition-all shadow-sm active:scale-95"
                >
                  Close
                </button>

              </div>

            </div>

          )}

        </DialogContent>

      </Dialog>

    </div>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}

function DetailItem({
  icon,
  label,
  value,
}: DetailItemProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">

      <div className="text-blue-500 bg-blue-50 p-2 rounded-lg shrink-0">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">
          {label}
        </p>

        <p className="text-[10px] font-black uppercase italic text-slate-900 truncate leading-none">
          {value || '---'}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   TECH CARD
========================================================= */

interface TechCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function TechCard({
  icon,
  label,
  value,
}: TechCardProps) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">

      <div className="text-blue-500 shrink-0">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">
          {label}
        </p>

        <p className="font-black text-[9px] uppercase italic text-slate-700 leading-tight break-words">
          {value}
        </p>

      </div>

    </div>
  );
}