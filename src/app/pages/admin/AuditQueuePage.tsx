import {
  useState,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

import {
  Search,
  Ship,
  ChevronRight,
  User,
  Anchor,
  X,
  MapPin,
  Eye,
  CheckCircle2,
  Calculator,
  ShieldAlert,
  FileCheck,
  CalendarClock,
  LifeBuoy,
  Phone,
  XCircle,
  Trash2,
  Bell,
} from 'lucide-react';

import { useAquaData } from '../../components/context/AquaRegCONTEXT';
import { supabase } from '../../../supabaseClient';

/* =========================================================
   TYPES
========================================================= */

type AuditPhase = 'review' | 'schedule' | 'reject';

interface AuditQueuePageProps {}

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

/* =========================================================
   CATEGORY HELPERS

   ALL CATEGORIES USE THE SAME ID / REJECTION LOGIC.

   Supported:
   - VESSEL
   - FISHING GEAR
   - PAYAO/BALSA
   - PANGULONG
========================================================= */

const VESSEL_CATEGORIES = [
  'vessel',
  'boat',
  'fishing vessel',
];

const PAYAO_CATEGORIES = [
  'payao',
  'balsa',
  'payao/balsa',
  'payao balsa',
];

const FISHING_GEAR_CATEGORIES = [
  'gear',
  'gears',
  'fishing gear',
  'fishinggear',
];

const PANGULONG_CATEGORIES = [
  'pangulong',
  'pangulong gear',
  'pangulong (ring net)',
  'ring net',
  'ringnet',
];

const normalizeCategoryValue = (value: any): string => {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ');
};

const normalizeCategory = (vessel: any): string => {
  return normalizeCategoryValue(
    vessel?.asset_category ||
      vessel?.type ||
      vessel?.category ||
      ''
  );
};

const isVesselCategory = (vessel: any): boolean => {
  return VESSEL_CATEGORIES.includes(
    normalizeCategory(vessel)
  );
};

const isPayaoCategory = (vessel: any): boolean => {
  return PAYAO_CATEGORIES.includes(
    normalizeCategory(vessel)
  );
};

const isFishingGearCategory = (vessel: any): boolean => {
  return FISHING_GEAR_CATEGORIES.includes(
    normalizeCategory(vessel)
  );
};

const isPangulongCategory = (vessel: any): boolean => {
  return PANGULONG_CATEGORIES.includes(
    normalizeCategory(vessel)
  );
};

const isGearCategory = (vessel: any): boolean => {
  const category = normalizeCategory(vessel);

  return (
    PAYAO_CATEGORIES.includes(category) ||
    FISHING_GEAR_CATEGORIES.includes(category) ||
    PANGULONG_CATEGORIES.includes(category)
  );
};

const getCategoryLabel = (vessel: any): string => {
  if (isPayaoCategory(vessel)) {
    return 'PAYAO/BALSA';
  }

  if (isPangulongCategory(vessel)) {
    return 'PANGULONG';
  }

  if (isFishingGearCategory(vessel)) {
    return 'FISHING GEAR';
  }

  if (isVesselCategory(vessel)) {
    return 'VESSEL';
  }

  return (
    normalizeCategory(vessel).toUpperCase() ||
    'GENERAL'
  );
};

/* =========================================================
   DISPLAY NAME
========================================================= */

const getAssetDisplayName = (vessel: any): string => {
  const candidates = [
    vessel?.vessel_name,
    vessel?.name,
    vessel?.boat_name,
    vessel?.registered_vessel_name,
    vessel?.vesselName,
  ];

  const validName = candidates.find(
    (name) =>
      typeof name === 'string' &&
      name.trim().length > 0
  );

  if (validName) {
    return validName.trim();
  }

  if (isPayaoCategory(vessel)) {
    return (
      vessel?.payao_vessel_name ||
      vessel?.parent_vessel_name ||
      'UNNAMED PAYAO/BALSA'
    );
  }

  if (isPangulongCategory(vessel)) {
    return (
      vessel?.gear_type ||
      'UNNAMED PANGULONG'
    );
  }

  if (isFishingGearCategory(vessel)) {
    return (
      vessel?.gear_type ||
      'UNNAMED FISHING GEAR'
    );
  }

  if (isVesselCategory(vessel)) {
    return 'UNNAMED VESSEL';
  }

  return 'UNNAMED ASSET';
};

/* =========================================================
   SEARCH
========================================================= */

const matchesSearch = (
  vessel: any,
  query: string
): boolean => {
  if (!query) {
    return true;
  }

  const searchableValues = [
    vessel?.id,
    vessel?.owner_name,
    vessel?.owner,
    vessel?.vessel_name,
    vessel?.name,
    vessel?.boat_name,
    vessel?.registered_vessel_name,
    vessel?.vesselName,
    vessel?.gear_type,
    vessel?.asset_category,
    vessel?.type,
    vessel?.category,
    vessel?.barangay,
    vessel?.sitio,
  ];

  return searchableValues.some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(query)
  );
};

/* =========================================================
   OWNER NAME COMPARISON
========================================================= */

/**
 * Normalizes owner names before comparison so harmless formatting
 * differences do not prevent a match.
 *
 * Examples:
 * "Juan Dela Cruz" == "JUAN  DELA-CRUZ"
 * "Maria, Santos" == "Maria Santos"
 */
const normalizeOwnerName = (value: any): string => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: any;
  icon?: ReactNode;
}) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
        {icon}
        {label}
      </p>

      <p className="text-xs font-black text-slate-900 uppercase mt-0.5">
        {value || 'N/A'}
      </p>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AuditQueuePage(
  _props: AuditQueuePageProps
) {
  const {
    Vessels = [],
    loading,
    deleteVessel,
  } = useAquaData();

  const [searchQuery, setSearchQuery] =
    useState('');

  const [selectedVessel, setSelectedVessel] =
    useState<any | null>(null);

  const [rejectionNotices, setRejectionNotices] =
    useState<RejectionNotice[]>([]);

  const [loadingNotices, setLoadingNotices] =
    useState(true);

  /* =======================================================
     LOAD REJECTION NOTICES
  ======================================================= */

  const loadRejectionNotices = async () => {
    try {
      setLoadingNotices(true);

      const { data, error } = await supabase
        .from('RejectionNotices')
        .select('*')
        .order('rejected_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setRejectionNotices(
        (data || []) as RejectionNotice[]
      );
    } catch (error: any) {
      console.error(
        'Loading rejection notices failed:',
        error
      );

      toast.error(
        'Unable to load rejection notices',
        {
          description:
            error?.message ||
            'Check the RejectionNotices table.',
        }
      );
    } finally {
      setLoadingNotices(false);
    }
  };

  useEffect(() => {
    loadRejectionNotices();
  }, []);

  /* =======================================================
     PENDING QUEUE

     Only Pending records are shown here.
  ======================================================= */

  const queue = useMemo(() => {
    const query = searchQuery
      .toLowerCase()
      .trim();

    return Vessels.filter((v: any) => {
      const status = String(
        v?.status || ''
      )
        .toLowerCase()
        .trim();

      return (
        status === 'pending' &&
        matchesSearch(v, query)
      );
    });
  }, [Vessels, searchQuery]);

  /* =======================================================
     FILTERED REJECTION NOTICES
  ======================================================= */

  const filteredRejectionNotices =
    useMemo(() => {
      const query = searchQuery
        .toLowerCase()
        .trim();

      if (!query) {
        return rejectionNotices;
      }

      return rejectionNotices.filter(
        (notice) => {
          const values = [
            notice.id,
            notice.original_vessel_id,
            notice.owner_name,
            notice.vessel_name,
            notice.asset_category,
            notice.barangay,
            notice.rejection_reason,
            notice.rejection_notes,
          ];

          return values.some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      rejectionNotices,
      searchQuery,
    ]);

  /* =======================================================
     OWNER NAME MATCH NOTICE

     Compare the owner name in:
       Applications Awaiting Audit
     against:
       Rejection Notices

     A match means this owner has a previous rejection notice.
     The application itself is NOT blocked or changed automatically.
  ======================================================= */

  const rejectedOwnerNames = useMemo(() => {
    const names = new Set<string>();

    rejectionNotices.forEach((notice) => {
      const normalized = normalizeOwnerName(
        notice.owner_name
      );

      if (normalized) {
        names.add(normalized);
      }
    });

    return names;
  }, [rejectionNotices]);

  const getOwnerRejectionMatch = (
    vessel: any
  ): RejectionNotice | null => {
    const ownerName = normalizeOwnerName(
      vessel?.owner_name || vessel?.owner
    );

    if (!ownerName) {
      return null;
    }

    const exactNotice =
      rejectionNotices.find(
        (notice) =>
          normalizeOwnerName(
            notice.owner_name
          ) === ownerName
      ) || null;

    return exactNotice;
  };

  const ownerHasPreviousRejection = (
    vessel: any
  ): boolean => {
    const ownerName = normalizeOwnerName(
      vessel?.owner_name || vessel?.owner
    );

    return (
      ownerName.length > 0 &&
      rejectedOwnerNames.has(ownerName)
    );
  };

  /* =======================================================
     DELETE REJECTION NOTICE + ORIGINAL APPLICATION

     Deleting a rejection notice permanently removes:

     1. RejectionNotices row
     2. Original Vessels row

     This makes the registration ID available for a
     completely new future registration.
  ======================================================= */

  const handleDeleteRejectionNotice =
    async (
      notice: RejectionNotice
    ) => {
      const originalId =
        notice.original_vessel_id;

      const confirmed =
        window.confirm(
          `PERMANENT DELETION\n\n` +
          `Are you sure you want to permanently delete this rejection record?\n\n` +
          `Notice ID: ${notice.id}\n` +
          `Original Application ID: ${
            originalId || 'N/A'
          }\n` +
          `Owner: ${
            notice.owner_name || 'N/A'
          }\n` +
          `Category: ${
            notice.asset_category || 'GENERAL'
          }\n\n` +
          `This will permanently remove BOTH:\n` +
          `• The Rejection Notice\n` +
          `• The original Audit/Vessels application\n\n` +
          `The application ID will then become available for a future client.\n\n` +
          `THIS ACTION CANNOT BE UNDONE.`
        );

      if (!confirmed) {
        return;
      }

      try {
        if (!originalId) {
          throw new Error(
            'This rejection notice does not contain original_vessel_id. The original application cannot be safely identified.'
          );
        }

        /* =================================================
           STEP 1
           Verify original application exists.
        ================================================= */

        const {
          data: originalApplication,
          error: lookupError,
        } = await supabase
          .from('Vessels')
          .select('id')
          .eq(
            'id',
            originalId
          )
          .maybeSingle();

        if (lookupError) {
          throw lookupError;
        }

        /* =================================================
           STEP 2
           Permanently delete original application.
        ================================================= */

        if (originalApplication) {
          if (
            typeof deleteVessel ===
            'function'
          ) {
            await deleteVessel(
              String(originalId)
            );
          } else {
            const {
              error: vesselDeleteError,
            } = await supabase
              .from('Vessels')
              .delete()
              .eq(
                'id',
                originalId
              );

            if (vesselDeleteError) {
              throw vesselDeleteError;
            }
          }
        }

        /* =================================================
           STEP 3
           Permanently delete rejection notice.
        ================================================= */

        const {
          error: noticeDeleteError,
        } = await supabase
          .from('RejectionNotices')
          .delete()
          .eq(
            'id',
            notice.id
          );

        if (noticeDeleteError) {
          throw noticeDeleteError;
        }

        /* =================================================
           STEP 4
           Remove notice from local state.
        ================================================= */

        setRejectionNotices(
          (current) =>
            current.filter(
              (item) =>
                String(item.id) !==
                String(notice.id)
            )
        );

        /* =================================================
           STEP 5
           Close popup if necessary.
        ================================================= */

        if (
          selectedVessel &&
          String(selectedVessel.id) ===
            String(originalId)
        ) {
          setSelectedVessel(null);
        }

        toast.success(
          'Rejection permanently deleted',
          {
            description:
              `Application ${originalId} and its rejection notice were permanently removed. The ID is now available for a future registration.`,
          }
        );

        await loadRejectionNotices();
      } catch (error: any) {
        console.error(
          'Permanent rejection deletion error:',
          error
        );

        toast.error(
          'Permanent deletion failed',
          {
            description:
              error?.message ||
              'The rejection record could not be completely deleted.',
          }
        );
      }
    };

  /* =======================================================
     MANUAL DELETE OF PENDING / AUDIT APPLICATION
  ======================================================= */

  const handleDeleteAuditRecord =
    async (vessel: any) => {
      const confirmed =
        window.confirm(
          `Are you sure you want to permanently delete this audit application?\n\n` +
          `ID: ${vessel.id}\n` +
          `Owner: ${
            vessel.owner_name ||
            vessel.owner ||
            'N/A'
          }\n` +
          `Category: ${getCategoryLabel(
            vessel
          )}\n\n` +
          `This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        if (
          typeof deleteVessel !==
          'function'
        ) {
          throw new Error(
            'Delete function is not available in AquaRegCONTEXT.'
          );
        }

        await deleteVessel(
          vessel.id
        );

        setSelectedVessel(null);

        toast.success(
          'Audit application deleted',
          {
            description:
              `Application ${vessel.id} was permanently removed. Its registration ID is now available for reuse.`,
          }
        );
      } catch (error: any) {
        console.error(
          'Audit deletion error:',
          error
        );

        toast.error(
          'Deletion failed',
          {
            description:
              error?.message ||
              'Unable to permanently delete this application.',
          }
        );
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading ||
    loadingNotices
  ) {
    return (
      <div className="p-6 font-sans bg-slate-50 min-h-screen flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Loading Cloud Audit Queue...
        </p>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="relative space-y-6 animate-in fade-in duration-700 font-sans p-6 pt-10 bg-slate-50/30 min-h-screen">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">

        <div className="flex items-center gap-4 w-full lg:w-auto">

          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-200">
            <Ship
              className="text-emerald-400"
              size={20}
            />
          </div>

          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none italic">
              Registration Audit
            </h1>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {queue.length} Total Pending Review
              {' • '}
              {filteredRejectionNotices.length}{' '}
              Rejection Notices
            </p>
          </div>
        </div>

        {/* SEARCH */}

        <div className="relative flex-1 lg:max-w-md">

          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />

          <Input
            className="pl-10 h-12 rounded-xl border-slate-100 bg-slate-50/50 text-xs font-bold"
            placeholder="Search ID, name, barangay, category..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
          />
        </div>
      </div>

      {/* =================================================
          PENDING APPLICATIONS
      ================================================= */}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">

        <div className="px-8 py-5 bg-slate-900 flex items-center gap-3">

          <FileCheck
            size={17}
            className="text-emerald-400"
          />

          <p className="text-[10px] font-black text-white uppercase tracking-widest">
            Applications Awaiting Audit
          </p>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse min-w-[850px]">

            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Asset Details
                </th>

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Owner
                </th>

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                  Category
                </th>

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                  Action
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">

              {queue.map(
                (v: any) => {
                  const matchingRejection =
                    getOwnerRejectionMatch(v);

                  const hasPreviousRejection =
                    ownerHasPreviousRejection(v);

                  return (
                    <tr
                      key={v.id}
                      className="group hover:bg-slate-50/80 transition-all"
                    >

                      {/* ASSET */}

                      <td className="px-8 py-6">

                        <div className="flex items-center gap-4">

                          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-emerald-400 transition-all">

                            {isVesselCategory(
                              v
                            ) && (
                              <Ship size={20} />
                            )}

                            {isPayaoCategory(
                              v
                            ) && (
                              <Anchor size={20} />
                            )}

                            {(isFishingGearCategory(
                              v
                            ) ||
                              isPangulongCategory(
                                v
                              )) && (
                              <LifeBuoy size={20} />
                            )}

                          </div>

                          <div>

                            <div className="font-black italic text-slate-900 uppercase tracking-tight">
                              {getAssetDisplayName(
                                v
                              )}
                            </div>

                            <div className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                              ID: {v.id}
                            </div>

                          </div>

                        </div>

                      </td>

                      {/* OWNER */}

                      <td className="px-8 py-6">
                        <div className="text-xs font-black text-slate-700 uppercase italic">
                          {v.owner_name ||
                            v.owner ||
                            'N/A'}
                        </div>

                        {hasPreviousRejection && (
                          <div className="mt-2 inline-flex max-w-[320px] items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left">
                            <ShieldAlert
                              size={13}
                              className="mt-0.5 shrink-0 text-amber-600"
                            />

                            <div>
                              <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">
                                Previous Rejection Notice
                              </p>

                              <p className="mt-0.5 text-[8px] font-bold uppercase leading-relaxed text-amber-600">
                                This owner name matches a name in Rejection Notices.
                                {matchingRejection?.original_vessel_id
                                  ? ` Previous ID: ${matchingRejection.original_vessel_id}.`
                                  : ''}
                              </p>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* CATEGORY */}

                      <td className="px-8 py-6 text-center">

                        <Badge className="bg-blue-100 text-blue-600 border-none rounded-md text-[9px] font-black uppercase px-3">
                          {getCategoryLabel(v)}
                        </Badge>

                      </td>

                      {/* ACTION */}

                      <td className="px-8 py-6">

                        <div className="flex items-center justify-end gap-2">

                          <Button
                            onClick={() =>
                              setSelectedVessel(v)
                            }
                            className="bg-slate-900 text-white rounded-xl h-11 px-5 hover:bg-blue-600 transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                            Start Audit

                            <ChevronRight
                              size={14}
                              className="ml-2"
                            />
                          </Button>

                          <Button
                            type="button"
                            onClick={() =>
                              handleDeleteAuditRecord(
                                v
                              )
                            }
                            variant="outline"
                            className="h-11 w-11 p-0 rounded-xl border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                            title="Delete Audit Application"
                            aria-label={`Delete audit application ${v.id}`}
                          >
                            <Trash2 size={16} />
                          </Button>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )}

              {queue.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest"
                  >
                    No items awaiting review inside this queue.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================
          REJECTION NOTICES

          Rejected applications are represented here.

          AUDIT AGAIN:
          Rejected -> Pending -> Audit Queue

          DELETE:
          Rejected -> permanently deleted
      ================================================= */}

      <div className="bg-white rounded-[2.5rem] border border-red-100 shadow-xl overflow-hidden">

        <div className="px-8 py-5 bg-red-50 border-b border-red-100 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <Bell
              size={17}
              className="text-red-600"
            />

            <div>

              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">
                Rejection Notices
              </p>

              <p className="text-[9px] font-bold text-red-400 uppercase mt-1">
                Owner names are checked against previous rejection notices
              </p>

            </div>

          </div>

          <Badge className="bg-red-100 text-red-600 border-none text-[9px] font-black">
            {filteredRejectionNotices.length}
          </Badge>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse min-w-[1250px]">

            <thead>

              <tr className="bg-slate-50 border-b border-slate-100">

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Application
                </th>

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Owner
                </th>

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Category
                </th>

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Rejection Notice
                </th>

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Date
                </th>

                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-50">

              {filteredRejectionNotices.map(
                (notice) => {

                  return (
                    <tr
                      key={String(
                        notice.id
                      )}
                      className="hover:bg-red-50/30 transition-all"
                    >

                      {/* APPLICATION */}

                      <td className="px-8 py-6">

                        <div className="flex items-center gap-4">

                          <div className="h-11 w-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">

                            <XCircle
                              size={19}
                            />

                          </div>

                          <div>

                            <p className="font-black italic uppercase text-slate-900">

                              {notice.vessel_name ||
                                'REJECTED APPLICATION'}

                            </p>

                            <p className="text-[9px] font-mono font-bold text-red-500 uppercase">

                              ID:{' '}
                              {notice.original_vessel_id ||
                                'N/A'}

                            </p>

                          </div>

                        </div>

                      </td>

                      {/* OWNER */}

                      <td className="px-8 py-6">

                        <p className="text-xs font-black uppercase italic text-slate-700">
                          {notice.owner_name ||
                            'N/A'}
                        </p>

                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">

                          <MapPin
                            size={10}
                            className="inline mr-1"
                          />

                          {notice.barangay ||
                            'N/A'}

                        </p>

                      </td>

                      {/* CATEGORY */}

                      <td className="px-8 py-6">

                        <Badge className="bg-red-100 text-red-700 border-none rounded-md text-[9px] font-black uppercase px-3">

                          {getCategoryLabel({
                            asset_category:
                              notice.asset_category,
                          })}

                        </Badge>

                      </td>

                      {/* NOTICE */}

                      <td className="px-8 py-6 max-w-md">

                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">

                          <div className="flex items-center gap-2 mb-2">

                            <ShieldAlert
                              size={14}
                              className="text-red-600"
                            />

                            <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">
                              Rejected
                            </span>

                          </div>

                          <p className="text-[11px] font-black text-slate-800 uppercase">
                            {notice.rejection_reason ||
                              'Application rejected.'}
                          </p>

                          {notice.rejection_notes && (
                            <p className="text-[10px] font-medium text-slate-500 mt-2 whitespace-pre-line">
                              {notice.rejection_notes}
                            </p>
                          )}

                        </div>

                      </td>

                      {/* DATE */}

                      <td className="px-8 py-6">

                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">

                          <CalendarClock
                            size={13}
                          />

                          {notice.rejected_at
                            ? new Date(
                                notice.rejected_at
                              ).toLocaleDateString()
                            : 'N/A'}

                        </div>

                      </td>

                      {/* ACTION */}

                      <td className="px-8 py-6">

                        <div className="flex items-center justify-end gap-2">

                          {/* DELETE */}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              handleDeleteRejectionNotice(
                                notice
                              )
                            }
                            className="h-10 w-10 p-0 rounded-xl border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                            title="Permanently Delete Rejection and Original Application"
                            aria-label={`Permanently delete rejection notice ${notice.id} and original application ${notice.original_vessel_id}`}
                          >

                            <Trash2
                              size={15}
                            />

                          </Button>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )}

              {filteredRejectionNotices.length ===
                0 && (
                <tr>

                  <td
                    colSpan={6}
                    className="px-8 py-12 text-center"
                  >

                    <div className="flex flex-col items-center">

                      <CheckCircle2
                        size={30}
                        className="text-emerald-400 mb-3"
                      />

                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        No rejection notices found.
                      </p>

                    </div>

                  </td>

                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =================================================
          AUDIT POPUP
      ================================================= */}

      {selectedVessel && (
        <AuditDetailPopup
          vessel={selectedVessel}
          onClose={() =>
            setSelectedVessel(null)
          }
        />
      )}

    </div>
  );
}

/* =========================================================
   AUDIT DETAIL POPUP
========================================================= */

function AuditDetailPopup({
  vessel,
  onClose,
}: {
  vessel: any;
  onClose: () => void;
}) {
  const {
    updateVesselStatus,
    scheduleInspection,
    inspectors = [],
    deleteVessel,
  } = useAquaData();

  const [phase, setPhase] =
    useState<AuditPhase>('review');

  const [
    assignedInspectorIdNumber,
    setAssignedInspectorIdNumber,
  ] = useState('');

  const [
    scheduledDate,
    setScheduledDate,
  ] = useState(
    new Date()
      .toISOString()
      .split('T')[0]
  );

  /* =======================================================
     REJECTION
  ======================================================= */

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState(
    'Invalid Valid ID'
  );

  const [
    rejectionNotes,
    setRejectionNotes,
  ] = useState('');

  const [
    isSubmittingRejection,
    setIsSubmittingRejection,
  ] = useState(false);

  /* =======================================================
     CATEGORY
  ======================================================= */

  const isPangulong =
    isPangulongCategory(vessel);

  const isFishingGear =
    isFishingGearCategory(vessel);

  const isPayao =
    isPayaoCategory(vessel);

  /* =======================================================
     MOTOR / NON-MOTOR
  ======================================================= */

  const isMotorizedVessel =
    isVesselCategory(vessel) &&
    (
      vessel.vesselType ===
        'motorized' ||
      vessel.vessel_type ===
        'motorized' ||
      vessel.is_motorized === true
    );

  const isNonMotorizedVessel =
    isVesselCategory(vessel) &&
    (
      vessel.vesselType ===
        'non-motorized' ||
      vessel.vessel_type ===
        'non-motorized' ||
      vessel.is_motorized === false
    );

  const gearCategory =
    isGearCategory(vessel);

  /* =======================================================
     DISPLAY NAME
  ======================================================= */

  const displayVesselName =
    useMemo(
      () =>
        getAssetDisplayName(
          vessel
        ),
      [vessel]
    );

  /* =======================================================
     DOCUMENT REQUIREMENTS

     Gear categories use:
     - BFAR Permit
     - MARINA Permit
     - Barangay Clearance
     - Cedula

     Vessel categories use:
     - Barangay Clearance
     - Valid ID
     - Cedula
  ======================================================= */

  const activeDocKeys =
    useMemo(() => {
      if (gearCategory) {
        return [
          'barangayClearance',
          'cedula',
        ];
      }

      return [
        'barangayClearance',
        'validID',
        'cedula',
      ];
    }, [gearCategory]);

  /* =======================================================
     ACTIVE PERSONNEL
  ======================================================= */

  const activePersonnel =
    useMemo(() => {
      return (
        inspectors || []
      ).filter(
        (ins: any) =>
          String(
            ins.status || ''
          )
            .toLowerCase()
            .trim() ===
          'approved'
      );
    }, [inspectors]);

  /* =======================================================
     PROCEED

     Gear/PAYAO/PANGULONG:
       Direct Pass

     Vessel:
       Schedule Inspection
  ======================================================= */

  const handleProceed =
    async () => {
      if (gearCategory) {
        try {
          if (
            typeof updateVesselStatus !==
            'function'
          ) {
            throw new Error(
              'Database status update function is unavailable.'
            );
          }

          await updateVesselStatus(
            vessel.id,
            'Passed'
          );

          toast.success(
            `${getCategoryLabel(
              vessel
            )} Approved Directly`,
            {
              description:
                `Application ${vessel.id} passed the audit.`,
            }
          );

          onClose();
        } catch (error: any) {
          console.error(
            'Direct approval error:',
            error
          );

          toast.error(
            'Approval failed',
            {
              description:
                error?.message ||
                'Unable to update application status.',
            }
          );
        }

        return;
      }

      setPhase('schedule');
    };

  /* =======================================================
     REJECT

     Rejection does NOT delete the application.

       Vessels:
         status = Rejected

       RejectionNotices:
         new historical notice
  ======================================================= */

  const handleRejectSubmission =
    async () => {
      if (!rejectionReason) {
        toast.error(
          'Please select a reason for rejection.'
        );

        return;
      }

      setIsSubmittingRejection(
        true
      );

      try {
        const rejectionTimestamp =
          new Date().toISOString();

        /* =================================================
           STEP 1
           Create rejection notice.
        ================================================= */

        const {
          error: noticeError,
        } = await supabase
          .from('RejectionNotices')
          .insert([
            {
              original_vessel_id:
                String(vessel.id),

              owner_name:
                vessel.owner_name ||
                vessel.owner ||
                'N/A',

              vessel_name:
                getAssetDisplayName(
                  vessel
                ),

              asset_category:
                vessel.asset_category ||
                vessel.type ||
                'GENERAL',

              barangay:
                vessel.barangay ||
                'N/A',

              rejection_reason:
                rejectionReason,

              rejection_notes:
                rejectionNotes ||
                null,

              rejected_at:
                rejectionTimestamp,

              updated_at:
                rejectionTimestamp,
            },
          ]);

        if (noticeError) {
          throw noticeError;
        }

        /* =================================================
           STEP 2
           KEEP original Vessels record.
           Only change its status.
        ================================================= */

        if (
          typeof updateVesselStatus !==
          'function'
        ) {
          throw new Error(
            'Status update function is not available in AquaRegCONTEXT.'
          );
        }

        await updateVesselStatus(
          vessel.id,
          'Rejected'
        );

        toast.success(
          'Registration Rejected',
          {
            description:
              `Application ${vessel.id} was retained as Rejected and added to Rejection Notices.`,
          }
        );

        onClose();
      } catch (error: any) {
        console.error(
          'Rejection submission error:',
          error
        );

        toast.error(
          'Failed to reject application',
          {
            description:
              error?.message ||
              'The rejection notice could not be saved or the application status could not be updated.',
          }
        );
      } finally {
        setIsSubmittingRejection(
          false
        );
      }
    };

  /* =======================================================
     FINAL SCHEDULE
  ======================================================= */

  const handleFinalSchedule =
    async () => {
      if (
        !assignedInspectorIdNumber
      ) {
        toast.error(
          'Officer Assignment Required'
        );

        return;
      }

      try {
        if (
          typeof scheduleInspection ===
          'function'
        ) {
          await scheduleInspection(
            vessel.id,
            assignedInspectorIdNumber,
            scheduledDate
          );
        } else if (
          typeof updateVesselStatus ===
          'function'
        ) {
          await updateVesselStatus(
            vessel.id,
            'Scheduled'
          );
        } else {
          throw new Error(
            'Missing structural mutators inside context wrapper.'
          );
        }

        toast.success(
          'Successfully scheduled for inspection.',
          {
            description:
              'The inspection has been successfully scheduled.',
          }
        );

        onClose();
      } catch (error: any) {
        console.error(
          'Schedule Error:',
          error
        );

        toast.error(
          'Scheduling failed',
          {
            description:
              error?.message ||
              'Unable to bind assigned personnel profile.',
          }
        );
      }
    };

  /* =======================================================
     DELETE FROM POPUP
  ======================================================= */

  const handleDeleteAuditRecord =
    async () => {
      const confirmed =
        window.confirm(
          `Are you sure you want to permanently delete this audit application?\n\n` +
          `ID: ${vessel.id}\n` +
          `Owner: ${
            vessel.owner_name ||
            vessel.owner ||
            'N/A'
          }\n\n` +
          `This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        if (
          typeof deleteVessel !==
          'function'
        ) {
          throw new Error(
            'Delete function is not available in AquaRegCONTEXT.'
          );
        }

        await deleteVessel(
          vessel.id
        );

        onClose();

        toast.success(
          'Audit application deleted',
          {
            description:
              `Application ${vessel.id} was permanently removed and its ID is available for reuse.`,
          }
        );
      } catch (error: any) {
        console.error(
          'Audit deletion error:',
          error
        );

        toast.error(
          'Deletion failed',
          {
            description:
              error?.message ||
              'Unable to permanently delete this application.',
          }
        );
      }
    };

  /* =======================================================
     TECHNICAL SPECS
  ======================================================= */

  const renderTechnicalSpecs =
    () => {
      return (
        <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">

          <div className="flex items-center gap-2 mb-8">

            <Anchor
              className="text-emerald-500"
              size={18}
            />

            <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest italic">
              Technical Specs
            </h4>

          </div>

          <div className="grid grid-cols-2 gap-y-8 mb-8">

            <DetailItem
              label="Category"
              value={getCategoryLabel(
                vessel
              )}
            />

            {isVesselCategory(
              vessel
            ) ? (

              <DetailItem
                label="Propulsion"
                value={
                  isMotorizedVessel
                    ? 'MOTORIZED'
                    : isNonMotorizedVessel
                    ? 'NON-MOTORIZED'
                    : vessel.vesselType?.toUpperCase() ||
                      vessel.vessel_type?.toUpperCase() ||
                      'N/A'
                }
                icon={
                  <Ship
                    size={14}
                    className="text-blue-600"
                  />
                }
              />

            ) : isPayao ? (

              <DetailItem
                label="Asset Type"
                value="PAYAO/BALSA"
                icon={
                  <Anchor
                    size={14}
                    className="text-orange-500"
                  />
                }
              />

            ) : (

              <DetailItem
                label="Method / Type"
                value={
                  vessel.gear_type ||
                  getCategoryLabel(
                    vessel
                  )
                }
                icon={
                  <LifeBuoy
                    size={14}
                    className="text-orange-500"
                  />
                }
              />

            )}

          </div>

          {!gearCategory &&
            isVesselCategory(
              vessel
            ) && (
              <div className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-2">

                <DetailItem
                  label="Length (M)"
                  value={
                    vessel.hull_length ||
                    '0.00'
                  }
                />

                <DetailItem
                  label="Width (M)"
                  value={
                    vessel.hull_width ||
                    '0.00'
                  }
                />

                <DetailItem
                  label="Depth (M)"
                  value={
                    vessel.hull_depth ||
                    '0.00'
                  }
                />

              </div>
            )}

        </div>
      );
    };

  /* =======================================================
     MODAL
  ======================================================= */

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

      {/* BACKDROP */}

      <div
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
        onClick={onClose}
      />

      {/* MODAL */}

      <div className="relative bg-white w-full max-w-7xl h-[92vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

        {/* HEADER */}

        <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">

          <div className="flex gap-6 items-center">

            <div className="h-16 w-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20">

              <Calculator
                size={32}
              />

            </div>

            <div>

              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                {displayVesselName}
              </h2>

              <div className="mt-2">

                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  ID: {vessel.id}
                </div>

                <Badge className="mt-2 bg-blue-500 text-white border-none text-[9px] font-black uppercase tracking-widest">

                  {getCategoryLabel(
                    vessel
                  )}{' '}
                  Audit

                </Badge>

              </div>

            </div>

          </div>

          <div className="flex gap-3">

            <button
              onClick={
                handleDeleteAuditRecord
              }
              className="p-4 hover:bg-red-600 rounded-2xl transition-all group"
              aria-label="Delete Audit Record"
              title="Delete Audit Record"
            >

              <Trash2 className="group-hover:scale-110 transition-transform" />

            </button>

            <button
              onClick={onClose}
              className="p-4 hover:bg-red-500 rounded-2xl transition-all group"
              aria-label="Close Audit Popup"
              title="Close Audit Popup"
            >

              <X className="group-hover:rotate-90 transition-transform" />

            </button>

          </div>

        </div>

        {/* CONTENT */}

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">

          {/* =================================================
              REVIEW
          ================================================= */}

          {phase === 'review' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* LEFT */}

              <div className="lg:col-span-4 space-y-6">

                {/* OWNER */}

                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">

                  <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-6 flex items-center gap-2">

                    <User size={14} />

                    Owner Information

                  </h4>

                  <div className="space-y-4">

                    <DetailItem
                      label="Full Legal Name"
                      value={
                        vessel.owner_name ||
                        vessel.owner ||
                        'N/A'
                      }
                      icon={
                        <User size={14} />
                      }
                    />

                    <DetailItem
                      label="CP Number"
                      value={
                        vessel.phone ||
                        vessel.cp_number ||
                        'N/A'
                      }
                      icon={
                        <Phone size={14} />
                      }
                    />

                    <DetailItem
                      label="Sitio / Brgy"
                      value={`${
                        vessel.sitio ||
                        'N/A'
                      }, Brgy. ${
                        vessel.barangay ||
                        'N/A'
                      }`}
                      icon={
                        <MapPin
                          size={14}
                        />
                      }
                    />

                    {!isPangulong &&
                      !isPayao &&
                      !isFishingGear && (
                        <>
                          <DetailItem
                            label="Place of Built"
                            value={
                              vessel.place_of_built ||
                              'N/A'
                            }
                          />

                          <DetailItem
                            label="Year Built"
                            value={
                              vessel.year_built ||
                              'N/A'
                            }
                          />
                        </>
                      )}

                  </div>

                </div>

                {/* CATEGORY DETAILS */}

                {(isPangulong ||
                  isFishingGear ||
                  isPayao) && (
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">

                    <div className="flex items-center gap-2 mb-6">

                      <LifeBuoy
                        className="text-emerald-500"
                        size={18}
                      />

                      <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest italic">
                        Asset Details
                      </h4>

                    </div>

                    <div>

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        Units in Words
                      </p>

                      <div className="p-4 mt-1 rounded-xl text-sm font-black uppercase text-black whitespace-pre-line">

                        {isPayao ? (
                          <>
                            {vessel.units_in_words ||
                              'ENTER UNIT COUNT'}

                            {(vessel.boat_name ||
                              vessel.payao_numbers) && (
                              <>
                                {'\n'}
                                {vessel.boat_name ||
                                  vessel.payao_numbers}
                              </>
                            )}
                          </>
                        ) : (
                          vessel.units_in_words ||
                          (isPangulong
                            ? 'ONE (1) UNIT RING NET (PANGULONG)'
                            : `ONE (1) UNIT ${
                                vessel.gear_type ||
                                'JIGGING'
                              }`)
                        )}

                      </div>

                    </div>

                  </div>
                )}

                {/* TECHNICAL */}

                {renderTechnicalSpecs()}

                {/* TONNAGE */}

                {isMotorizedVessel && (
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">

                    <Anchor
                      className="absolute -right-6 -bottom-6 text-white/5 rotate-12"
                      size={160}
                    />

                    <div className="relative z-10">

                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-6 italic">
                        Verified Tonnage
                      </h4>

                      <div className="grid grid-cols-2 gap-4">

                        <div className="p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">

                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">
                            Gross Tonnage
                          </p>

                          <p className="text-2xl font-black italic">
                            {vessel.tonnage_gross ||
                              '0.00'}
                          </p>

                        </div>

                        <div className="p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">

                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">
                            Net Tonnage
                          </p>

                          <p className="text-2xl font-black italic">
                            {vessel.tonnage_net ||
                              '0.00'}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>
                )}

                {/* ACTIONS */}

                <div className="space-y-3">

                  <Button
                    onClick={
                      handleProceed
                    }
                    className="w-full h-16 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 transition-all"
                  >

                    {gearCategory
                      ? 'Verify & Pass Audit'
                      : 'Verify & Schedule Inspection'}

                    <ChevronRight
                      size={18}
                      className="ml-2"
                    />

                  </Button>

                  <Button
                    onClick={() =>
                      setPhase(
                        'reject'
                      )
                    }
                    variant="outline"
                    className="w-full h-14 border-2 border-red-200 bg-red-50/50 text-red-600 hover:bg-red-600 hover:text-white rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all"
                  >

                    <XCircle
                      size={18}
                      className="mr-2"
                    />

                    Reject Application

                  </Button>

                </div>

              </div>

              {/* DOCUMENT VAULT */}

              <div className="lg:col-span-8 bg-white rounded-[3rem] border border-slate-200 shadow-inner overflow-hidden flex flex-col">

                <div className="bg-slate-50 p-6 border-b flex items-center gap-3">

                  <FileCheck
                    size={16}
                    className="text-slate-900"
                  />

                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                    Document Vault Review
                  </p>

                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-100/30">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">

                    {activeDocKeys.map((key) => {
                        const snakeKey = key.replace(
                          /[A-Z]/g,
                          (letter) => `_${letter.toLowerCase()}`
                        );

                        const altSnakeKey = key === 'validID' ? 'valid_id' : snakeKey;

                        const src =
                          vessel.requirements?.[key] ??
                          vessel.requirements?.[altSnakeKey] ??
                          vessel[key] ??
                          vessel[altSnakeKey];

                        return (
                          <div
                            key={key}
                            className="space-y-3"
                          >

                            <p className="text-[10px] font-black uppercase text-slate-500 italic px-2">

                              {key
                                .replace(
                                  /([A-Z])/g,
                                  ' $1'
                                )
                                .toUpperCase()}

                            </p>

                            {src ? (

                              <div className="rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden aspect-[4/3] bg-slate-200 relative group cursor-pointer">

                                <img
                                  src={src}
                                  className="w-full h-full object-cover"
                                  alt={key}
                                />

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">

                                  <Eye
                                    className="text-white"
                                    size={30}
                                  />

                                </div>

                              </div>

                            ) : (

                              <div className="border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center aspect-[4/3] bg-slate-100/50 text-slate-400">

                                <ShieldAlert
                                  size={24}
                                  className="mb-2 opacity-50"
                                />

                                <p className="text-[9px] font-black uppercase tracking-widest">
                                  Document Missing
                                </p>

                              </div>

                            )}

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              SCHEDULE
          ================================================= */}

          {phase === 'schedule' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">

              <div className="flex justify-between items-end">

                <div>

                  <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                    Assign Inspector
                  </h3>

                  <p className="text-slate-500 text-[10px] font-black uppercase mt-2">
                    Audit Site:{' '}
                    {vessel.barangay ||
                      'N/A'}
                  </p>

                </div>

                <div className="w-48">

                  <Label
                    htmlFor="audit-assignment-date"
                    className="text-[10px] font-black uppercase text-blue-600"
                  >
                    Audit Date
                  </Label>

                  <input
                    id="audit-assignment-date"
                    type="date"
                    value={
                      scheduledDate
                    }
                    onChange={(e) =>
                      setScheduledDate(
                        e.target.value
                      )
                    }
                    className="w-full h-12 mt-1 rounded-xl font-bold border px-4 border-slate-200 outline-none"
                  />

                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {activePersonnel.map(
                  (ins: any) => {

                    const targetIdNum =
                      ins.idNumber ||
                      ins.id_number ||
                      '';

                    const targetName =
                      ins.name ||
                      ins.inspector_name ||
                      'UNNAMED REGISTRY';

                    const isSelected =
                      assignedInspectorIdNumber ===
                        targetIdNum &&
                      targetIdNum !== '';

                    return (
                      <button
                        key={ins.id}
                        type="button"
                        onClick={() =>
                          setAssignedInspectorIdNumber(
                            targetIdNum
                          )
                        }
                        className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between text-left ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 shadow-lg'
                            : 'border-slate-100 bg-white'
                        }`}
                      >

                        <div className="flex items-center gap-4">

                          <div
                            className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100'
                            }`}
                          >

                            <User
                              size={24}
                            />

                          </div>

                          <div>

                            <p className="font-black text-sm uppercase italic text-slate-900 leading-tight">
                              {targetName}
                            </p>

                            <div className="flex flex-col gap-0.5 mt-1">

                              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">
                                {ins.position ||
                                  ins.role ||
                                  'Fishery Inspector'}
                              </p>

                              {targetIdNum && (
                                <span className="text-[8px] font-mono tracking-wider font-black text-slate-400 uppercase bg-slate-100 px-1 py-0.5 rounded w-fit mt-1">
                                  ID:{' '}
                                  {targetIdNum}
                                </span>
                              )}

                            </div>

                          </div>

                        </div>

                        {isSelected && (
                          <CheckCircle2
                            className="text-blue-600"
                            size={24}
                          />
                        )}

                      </button>
                    );
                  }
                )}

                {activePersonnel.length ===
                  0 && (
                  <div className="col-span-2 py-8 text-center text-xs font-bold text-slate-400 border border-dashed rounded-3xl">
                    No active verified inspectors found on file.
                  </div>
                )}

              </div>

              <div className="flex gap-4 pt-6">

                <Button
                  variant="ghost"
                  onClick={() =>
                    setPhase(
                      'review'
                    )
                  }
                  className="h-16 px-10 rounded-2xl font-black text-xs uppercase italic tracking-tighter"
                >
                  Back to Audit
                </Button>

                <Button
                  onClick={
                    handleFinalSchedule
                  }
                  disabled={
                    !assignedInspectorIdNumber
                  }
                  className="flex-1 h-16 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest hover:bg-blue-600 shadow-xl uppercase"
                >

                  <CalendarClock
                    className="mr-2"
                    size={18}
                  />

                  Confirm Assignment

                </Button>

              </div>

            </div>
          )}

          {/* =================================================
              REJECT
          ================================================= */}

          {phase === 'reject' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 bg-white p-8 rounded-[2.5rem] border border-red-100 shadow-xl">

              <div>

                <div className="flex items-center gap-3 text-red-600 mb-2">

                  <ShieldAlert
                    size={28}
                  />

                  <h3 className="text-2xl font-black uppercase italic tracking-tight">
                    Reject Application
                  </h3>

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
                    'Invalid Valid ID',
                    'Missing / Invalid Document Files',
                    'Wrong / Unreachable Contact Number',
                  ].map(
                    (reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() =>
                          setRejectionReason(
                            reason
                          )
                        }
                        className={`p-4 rounded-2xl border-2 text-left font-black text-xs uppercase transition-all ${
                          rejectionReason ===
                          reason
                            ? 'border-red-600 bg-red-50 text-red-700'
                            : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        {reason}
                      </button>
                    )
                  )}

                </div>

                <div className="space-y-2 pt-2">

                  <Label
                    htmlFor="rejection-notes"
                    className="text-[10px] font-black uppercase text-slate-500"
                  >
                    Detailed Explanation / Instructions for Applicant
                  </Label>

                  <textarea
                    id="rejection-notes"
                    value={
                      rejectionNotes
                    }
                    onChange={(e) =>
                      setRejectionNotes(
                        e.target.value
                      )
                    }
                    placeholder="Specify why the ID/Document/Number was flagged..."
                    className="w-full h-32 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />

                </div>

              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">

                <Button
                  variant="ghost"
                  onClick={() =>
                    setPhase(
                      'review'
                    )
                  }
                  disabled={
                    isSubmittingRejection
                  }
                  className="h-14 px-8 rounded-2xl font-black text-xs uppercase italic tracking-tighter"
                >
                  Cancel
                </Button>

                <Button
                  onClick={
                    handleRejectSubmission
                  }
                  disabled={
                    isSubmittingRejection
                  }
                  className="flex-1 h-14 bg-red-600 text-white hover:bg-red-700 rounded-2xl font-black text-xs tracking-wide uppercase"
                >

                  {isSubmittingRejection
                    ? 'Saving Rejection...'
                    : 'Confirm Rejection'}

                </Button>

              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}

