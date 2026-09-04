
import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom'; 
import { Card } from '../../components/ui/card'; 
import { Button } from '../../components/ui/button'; 
import { Input } from '../../components/ui/input'; 
import { Label } from '../../components/ui/label'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'; 
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'; 
import { Badge } from '../../components/ui/badge'; 
import { toast } from 'sonner';  
import {  
  CheckCircle2, UploadCloud, Trash2, RefreshCw, Eye, 
  ShieldAlert, Ship, Anchor, Search, AlertTriangle, RotateCcw 
} from 'lucide-react'; 
import { useAquaData } from '../../components/context/AquaRegCONTEXT'; 
import BackToHome from '../../backtohome';  
import { supabase } from './../../../supabaseClient'; 
import { saveOfflineImage } from '../../../offline/db'; 

const GEARS = [ 
  'FISH JIGGING', 'PAILAWAN', 'SPEAR GUN', 'TABUNAN',  
  'GILL NET (LANGARITE)', 'GILL NET (PANGTAPUYOK)',  
  'GILL NET (PANAMBA)', 'GILL NET (PANGBYANWAG)' 
]; 

const BARANGAYS = [ 
  "AGBALUTO", "AGBUDIA", "AGNAGA", "AGNAY", "AGNIPA", "AGPANABAT", "AGTONGO", 
  "ALAD", "BAGACAY", "BARANGAY I", "BARANGAY II", "BARANGAY III", "BARANGAY IV", 
  "CAJIMOS", "CALABOGO", "CAPACLAN", "COBRADOR", "GINABLAN", "GUIMPINGAN", 
  "ILAURAN", "LAMAO", "LI-O", "LOGBON", "LONOS", "LUNAS", "MACALAS", 
  "MAPULA", "PALJE", "SABLAYAN", "SAWANG", "TAMBAC" 
]; 

// ============================================================
// CATEGORY -> ID PREFIX (also used as the duplicate-name "namespace")
// ============================================================
const CATEGORY_PREFIX: Record<string, string> = {
  vessel: 'RM',
  payao: 'PY',
  pangulong: 'PG',
  gears: 'FG',
};

const generateCustomId = async (category: string) => { 
  const prefix = CATEGORY_PREFIX[category] || 'RM';

  try { 
    const { data, error } = await supabase 
      .from('Vessels') 
      .select('id') 
      .like('id', `${prefix}-%`); 

    if (error) throw error; 

    const numbers = data 
      ?.map(v => { 
        const parts = String(v.id).split('-'); 
        return parseInt(parts[1], 10); 
      }) 
      .filter(n => !isNaN(n)) || []; 

    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1; 

    return `${prefix}-${String(nextNum).padStart(5, '0')}`; 
  } catch (err) { 
    console.error('Error generating custom ID:', err); 
    return `${prefix}-00001`; 
  } 
}; 

// ============================================================
// UNIT / PAYAO DISPLAY HELPERS
// ============================================================
const numberToWords = (num: number): string => {
  const ones = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN',
    'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN',
    'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN',
    'NINETEEN'
  ];

  const tens = [
    '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY',
    'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'
  ];

  const value = Math.floor(Number(num) || 0);

  if (value < 20) return ones[value] || String(value);
  if (value < 100) {
    return tens[Math.floor(value / 10)] +
      (value % 10 ? `-${ones[value % 10]}` : '');
  }
  if (value < 1000) {
    return ones[Math.floor(value / 100)] +
      ' HUNDRED' +
      (value % 100 ? ` ${numberToWords(value % 100)}` : '');
  }
  if (value < 1000000) {
    return numberToWords(Math.floor(value / 1000)) +
      ' THOUSAND' +
      (value % 1000 ? ` ${numberToWords(value % 1000)}` : '');
  }

  return String(value);
};

const getUnitCount = (value: string | number | null | undefined): number => {
  const digits = String(value ?? '').replace(/\D/g, '');
  const count = Number(digits);
  return Number.isFinite(count) ? Math.floor(count) : 0;
};

const formatPangulongUnits = (value: string | number | null | undefined): string => {
  const count = getUnitCount(value);
  if (count < 1) return '';
  return `${numberToWords(count)} (${count}) ${count === 1 ? 'UNIT' : 'UNITS'} RING NET (PANGULONG)`;
};

const formatGearUnits = (
  value: string | number | null | undefined,
  gearType: string
): string => {
  const count = getUnitCount(value);
  if (count < 1) return '';

  const gear = String(gearType || 'FISHING GEAR').trim().toUpperCase();
  return `${numberToWords(count)} (${count}) ${count === 1 ? 'UNIT' : 'UNITS'} ${gear}`;
};

const formatPayaoUnits = (value: string | number | null | undefined): string => {
  const count = getUnitCount(value);
  if (count < 1) return '';
  return `${numberToWords(count)} (${count}) ${count === 1 ? 'UNIT' : 'UNITS'} OF PAYAO/BALSA`;
};

const formatPayaoNumbers = (value: string): string => {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => v.startsWith('#') ? v : `#${v}`)
    .join(', ');
};

const formatPayaoDisplay = (
  unitCount: string | number,
  vesselName: string,
  numbers: string
): string => {
  const units = formatPayaoUnits(unitCount);
  const cleanName = String(vesselName || '').trim().toUpperCase();
  const cleanNumbers = formatPayaoNumbers(numbers);

  if (!units) return '';

  if (!cleanName && !cleanNumbers) return units;
  if (!cleanName) return `${units}\nNUMBER(S): ${cleanNumbers}`;
  if (!cleanNumbers) return `${units}\nNAME: ${cleanName}`;

  return `${units}\nNAME: ${cleanName} ${cleanNumbers}`;
};

// ============================================================
// NAME HELPERS (First / Middle / Last / Suffix -> display + storage)
// ============================================================
const SUFFIXES = ['', 'JR.', 'SR.', 'II', 'III', 'IV', 'V'];

const sanitizeNamePart = (v: string) =>
  String(v || '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\s.'’\-]/gu, '')
    .toUpperCase();
// Storage format kept as "LAST, FIRST MIDDLE SUFFIX" so existing
// downstream consumers (permits, reports) that read owner_name
// as a single string keep working.
const buildFullOwnerName = (parts: {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
}) => {
  const first = parts.firstName.trim();
  const middle = parts.middleName.trim();
  const last = parts.lastName.trim();
  const suffix = parts.suffix.trim();

  // If middle name is "-" or blank, don't show it in preview
  const cleanMiddle =
    middle === '-' || middle === '—' ? '' : middle;

  const cleanSuffix =
    suffix === '-' || suffix === '—' ? '' : suffix;

  return [first, cleanMiddle, last, cleanSuffix]
    .filter(Boolean)
    .join(' ')
    .trim();
};
// Best-effort parse of a legacy "LAST, FIRST MIDDLE SUFFIX" string
// back into parts, used only when prefilling from existing records
// that were saved before this change.
const parseOwnerNameParts = (fullName: string) => {
  const raw = String(fullName || '').trim();
  if (!raw) {
    return { firstName: '', middleName: '', lastName: '', suffix: '' };
  }

  const [lastPartRaw, restRaw = ''] = raw.split(',').map(s => s.trim());

  if (!restRaw) {
    // No comma present — can't reliably split, put everything in lastName.
    return { firstName: '', middleName: '', lastName: sanitizeNamePart(lastPartRaw), suffix: '' };
  }

  const restTokens = restRaw.split(/\s+/).filter(Boolean);
  let suffix = '';
  const suffixUpper = restTokens[restTokens.length - 1]?.toUpperCase();
  if (suffixUpper && SUFFIXES.includes(suffixUpper)) {
    suffix = suffixUpper;
    restTokens.pop();
  }

  const firstName = restTokens.shift() || '';
  const middleName = restTokens.join(' ');

  return {
    firstName: sanitizeNamePart(firstName),
    middleName: sanitizeNamePart(middleName),
    lastName: sanitizeNamePart(lastPartRaw),
    suffix,
  };
};

export default function AquaRegNewRegistration() { 
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const { Vessels = [], addVessel } = useAquaData(); 

  const [createdRM, setCreatedRM] = useState(""); 
  const [isDuplicate, setIsDuplicate] = useState(false); 

  const [s, setS] = useState({  
    sub: 0,  
    proc: 0,  
    rev: 0,  
    mode: 'NEW' as 'NEW' | 'RENEWAL' | 'RE-AUDIT',  
    search: '',  
    id: null as string | null,  
    isEncrypted: false, 
    isEncrypting: false, 
    showSuccess: false  
  }); 

  const [f, setF] = useState({ 
    assetCategory: 'vessel', 
    vesselName: '', 
    ownerFirstName: '',
    ownerMiddleName: '',
    ownerLastName: '',
    ownerSuffix: '',
    ownerAge: '', 
    sitio: '', 
    barangay: '', 
    phone: '', 
    vesselType: 'motorized' as 'motorized' | 'non-motorized', 
    placeOfBuilt: '', 
    yearBuilt: '', 
    gearType: '', 
    length: '', 
    width: '', 
    depth: '', 
    grossTonnage: '0.00', 
    netTonnage: '0.00', 

    unitCount: '1',
    payaoVesselName: '',
    payaoNumbers: '',

    requirements: {} as Record<string, string | null> 
  }); 

  // Derived full name, used for payload + display + validation
  const ownerFullName = useMemo(
    () => buildFullOwnerName({
      firstName: f.ownerFirstName,
      middleName: f.ownerMiddleName,
      lastName: f.ownerLastName,
      suffix: f.ownerSuffix,
    }),
    [f.ownerFirstName, f.ownerMiddleName, f.ownerLastName, f.ownerSuffix]
  );

  // --- 🔄 PRE-FILL RE-AUDIT / RE-REGISTER DATA --- 
  useEffect(() => { 
    let prefillData = location.state?.reRegisterVessel; 

    if (!prefillData) { 
      try { 
        const stored = localStorage.getItem('reRegisterVesselData'); 
        if (stored) { 
          prefillData = JSON.parse(stored); 
        } 
      } catch (err) { 
        console.error("Failed to parse reRegisterVesselData from localStorage", err); 
      } 
    } 

    if (prefillData) { 
      const prefillCategory = String(
        prefillData.asset_category || prefillData.type || 'vessel'
      ).toLowerCase();

      setS(prev => ({ 
        ...prev, 
        mode: 'RE-AUDIT', 
        id: String(prefillData.id || prefillData.vessel_id || '') 
      })); 

      const nameParts = prefillData.owner_first_name || prefillData.owner_last_name
        ? {
            firstName: sanitizeNamePart(prefillData.owner_first_name || ''),
            middleName: sanitizeNamePart(prefillData.owner_middle_name || ''),
            lastName: sanitizeNamePart(prefillData.owner_last_name || ''),
            suffix: String(prefillData.owner_suffix || '').toUpperCase(),
          }
        : parseOwnerNameParts(prefillData.owner_name || prefillData.owner || '');

      setF({ 
        assetCategory: prefillCategory, 
        vesselName: (prefillData.vessel_name || prefillData.gear_type || '').toUpperCase(), 
        ownerFirstName: nameParts.firstName,
        ownerMiddleName: nameParts.middleName,
        ownerLastName: nameParts.lastName,
        ownerSuffix: nameParts.suffix,
        ownerAge: String(prefillData.owner_age || prefillData.age || '18'), 
        sitio: (prefillData.sitio || '').toUpperCase(), 
        barangay: (prefillData.barangay || '').toUpperCase(), 
        phone: prefillData.cp_number || prefillData.phone || '', 
        vesselType: prefillData.is_motorized ? 'motorized' : 'non-motorized', 
        placeOfBuilt: (prefillData.place_of_built || '').toUpperCase(), 
        yearBuilt: String(prefillData.year_built || ''), 
        gearType: prefillData.gear_type || '', 
        length: String(prefillData.hull_length || prefillData.length || ''), 
        width: String(prefillData.hull_width || prefillData.width || ''), 
        depth: String(prefillData.hull_depth || prefillData.depth || ''), 
        grossTonnage: String(prefillData.tonnage_gross || prefillData.grossTonnage || '0.00'), 
        netTonnage: String(prefillData.tonnage_net || prefillData.netTonnage || '0.00'),

        unitCount: String(
          prefillData.unit_count ??
          prefillData.number_of_units ??
          prefillData.number_of_boats ??
          '1'
        ),
        payaoVesselName: String(
          prefillData.payao_vessel_name ??
          prefillData.boat_owner_vessel_name ??
          ''
        ).toUpperCase(),
        payaoNumbers: String(
          prefillData.payao_numbers ??
          prefillData.boat_name ??
          ''
        ),

        requirements: { 
          barangayClearance: prefillData.barangay_clearance || null, 
          cedula: prefillData.cedula || null, 
          validID: prefillData.valid_id || null, 
          bfarPermit: prefillData.bfar_permit || null, 
          marinaPermit: prefillData.marina_permit || null 
        } 
      }); 

      toast.info("Re-Audit Data Pre-filled", { 
        description: `Loaded existing record ID #${prefillData.id}. Please update invalid details and re-submit.` 
      }); 
    } 
  }, [location.state]); 

  const hasInvalidFormat = useMemo(() => /[A-Za-z]\d/.test(f.vesselName), [f.vesselName]); 

  // ============================================================
  // Duplicate-name check now applies WITHIN a category only.
  // Reusing the same asset name across FG / PG / PY / vessel is
  // allowed; reusing it again inside the SAME category is blocked.
  // ============================================================
  const shouldCheckDuplicateName = useMemo(() => { 
    return Boolean(f.assetCategory); 
  }, [f.assetCategory]); 

  const activeDocKeys = useMemo(() => { 
    if (f.assetCategory === 'vessel') return ['barangayClearance', 'cedula', 'validID']; 
    return ['barangayClearance', 'cedula', 'bfarPermit', 'marinaPermit']; 
  }, [f.assetCategory]); 

  const handleRenewalSearch = () => { 
    const existing = Vessels.find( 
      (v: any) => String(v.id)?.toUpperCase() === s.search.toUpperCase() 
    ) as any; 

    if (!existing) { 
      toast.error("Record Not Found"); 
      return; 
    } 

    const existingCategory = String(
      existing.asset_category || existing.type || 'vessel'
    ).toLowerCase();

    const nameParts = existing.owner_first_name || existing.owner_last_name
      ? {
          firstName: sanitizeNamePart(existing.owner_first_name || ''),
          middleName: sanitizeNamePart(existing.owner_middle_name || ''),
          lastName: sanitizeNamePart(existing.owner_last_name || ''),
          suffix: String(existing.owner_suffix || '').toUpperCase(),
        }
      : parseOwnerNameParts(existing.owner_name || '');

    setS(prev => ({ ...prev, id: existing.id })); 

    setF(prev => ({ 
      ...prev, 
      ownerFirstName: nameParts.firstName,
      ownerMiddleName: nameParts.middleName,
      ownerLastName: nameParts.lastName,
      ownerSuffix: nameParts.suffix,
      ownerAge: String(existing.owner_age ?? ""), 
      vesselName: existing.vessel_name ?? "", 
      barangay: existing.barangay ?? "", 
      sitio: existing.sitio ?? "", 
      phone: existing.cp_number ?? "", 
      assetCategory: existingCategory,
      vesselType: existing.is_motorized ? "motorized" : "non-motorized", 
      gearType: existing.gear_type ?? "", 
      length: String(existing.hull_length ?? ""), 
      width: String(existing.hull_width ?? ""), 
      depth: String(existing.hull_depth ?? ""), 
      grossTonnage: String(existing.tonnage_gross ?? "0.00"), 
      netTonnage: String(existing.tonnage_net ?? "0.00"),

      unitCount: String(
        existing.unit_count ??
        existing.number_of_units ??
        existing.number_of_boats ??
        '1'

      ).toUpperCase(),
      payaoNumbers: String(
        existing.payao_numbers ??
        existing.boat_name ??
        ''
      ),

      requirements: { 
        barangayClearance: existing.barangay_clearance || null, 
        cedula: existing.cedula || null, 
        validID: existing.valid_id || null, 
        bfarPermit: existing.bfar_permit || null, 
        marinaPermit: existing.marina_permit || null 
      } 
    })); 

    toast.success("Record Found", { description: "Existing data pre-filled." }); 
  }; 

  const up = useCallback((k: string, v: any) => { 
    setF(p => { 
      let val = v; 
     if (k === 'phone') {
  // CP Number: numbers only, maximum 11 digits
  val = String(v)
    .replace(/\D/g, '')
    .slice(0, 11);
}
      else if (k === 'ownerAge') { 
        val = String(v).replace(/[^0-9]/g, '').slice(0, 3); 
      } 
      else if (k === 'unitCount') {
        val = String(v).replace(/[^0-9]/g, '').slice(0, 6);
      }
      else if (k === 'ownerSuffix') {
        val = String(v).toUpperCase();
      }
     else if ([
  'ownerFirstName',
  'ownerMiddleName',
  'ownerLastName',
  'vesselName',
  'sitio',
  'placeOfBuilt',
  'payaoVesselName'
].includes(k)) {
  val = String(v)
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}0-9\s,.#'’&()\-]/gu, '')
    .toUpperCase();
}
      return { ...p, [k]: val }; 
    }); 
  }, []); 

  const handleRequirementChange = (docKey: string, base64Data: string | null) => { 
    setF(p => ({ 
      ...p, 
      requirements: { ...p.requirements, [docKey]: base64Data } 
    })); 
  }; 

  const processFile = async (e: ChangeEvent<HTMLInputElement>, key: string) => { 
    const file = e.target.files?.[0]; 
    if (!file) return; 

    if (!navigator.onLine) { 
      try { 
        const vesselId = s.id ?? crypto.randomUUID(); 
        await saveOfflineImage(vesselId, key, file); 
        const preview = URL.createObjectURL(file); 
        handleRequirementChange(key, preview); 
        toast.success("Image saved offline. It will sync automatically."); 
      } catch (_error: any) { 
        toast.error("Failed saving image offline"); 
      } 
      return; 
    } 

    try { 
      const fileExt = file.name.split(".").pop(); 
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`; 
      const filePath = `documents/${s.id ?? "new"}/${key}/${fileName}`; 

      const { error } = await supabase.storage 
        .from("vessel-docs") 
        .upload(filePath, file, { cacheControl: "3600", upsert: false }); 

      if (error) { 
        toast.error("Upload failed: " + error.message); 
        return; 
      } 

      const { data: publicUrlData } = supabase.storage 
        .from("vessel-docs") 
        .getPublicUrl(filePath); 

      if (!publicUrlData?.publicUrl) { 
        toast.error("Failed to get file URL"); 
        return; 
      } 

      handleRequirementChange(key, publicUrlData.publicUrl); 
      toast.success("File uploaded successfully"); 
    } catch (error: any) { 
      toast.error(error.message || "Image processing failed"); 
    } 
  }; 

  useEffect(() => { 
    if (f.assetCategory !== "vessel" || f.vesselType !== "motorized") { 
      return; 
    } 

    const l = Number(f.length); 
    const w = Number(f.width); 
    const d = Number(f.depth); 

    if (!isNaN(l) && !isNaN(w) && !isNaN(d) && l > 0 && w > 0 && d > 0) { 
      const gt = (l * w * d * 0.7) / 2.83; 
      setF(prev => { 
        const newGt = gt.toFixed(2); 
        const newNt = (gt * 0.3).toFixed(2); 
        if (prev.grossTonnage === newGt && prev.netTonnage === newNt) return prev; 
        return { 
          ...prev, 
          grossTonnage: newGt, 
          netTonnage: newNt 
        }; 
      }); 
    } 
  }, [f.length, f.width, f.depth, f.assetCategory, f.vesselType]); 

  // ============================================================
  // Duplicate check — SAME CATEGORY ONLY.
  // "alien" used under FG stays available under PG / PY / vessel.
  // ============================================================
  useEffect(() => { 
    let isMounted = true; 

    if (!shouldCheckDuplicateName) { 
      setIsDuplicate(false); 
      return; 
    } 

    const checkDuplicateNameWithinCategory = async () => { 
      const trimmedName = f.vesselName.trim().toUpperCase(); 
      const category = f.assetCategory; 

      if (!trimmedName) { 
        if (isMounted) setIsDuplicate(false); 
        return; 
      } 

      try { 
        const foundLocally = Vessels.some((v: any) => { 
          const existingCategory = String( 
            v.asset_category || v.type || '' 
          ).toLowerCase(); 

          if (existingCategory !== category) { 
            return false; 
          } 

          const existingName = String( 
            v.vessel_name || v.gear_type || '' 
          ).trim().toUpperCase(); 

          const existingId = String(v.id || ''); 

          return ( 
            existingName === trimmedName && 
            existingId !== String(s.id || '') 
          ); 
        }); 

        if (foundLocally) { 
          if (isMounted) setIsDuplicate(true); 
          return; 
        } 

        if (navigator.onLine) { 
          const { data, error } = await supabase 
            .from('Vessels') 
            .select('id, vessel_name, gear_type, asset_category, type') 
            .or( 
              `vessel_name.eq.${trimmedName},gear_type.eq.${trimmedName}` 
            ); 

          if (!error && data) { 
            const matches = data.filter((v: any) => { 
              const existingCategory = String( 
                v.asset_category || v.type || '' 
              ).toLowerCase(); 

              if (existingCategory !== category) { 
                return false; 
              } 

              return String(v.id) !== String(s.id || ''); 
            }); 

            if (matches.length > 0) { 
              if (isMounted) setIsDuplicate(true); 
              return; 
            } 
          } 
        } 

        if (isMounted) setIsDuplicate(false); 

      } catch (err) { 
        console.error('Duplicate check error:', err); 

        if (isMounted) setIsDuplicate(false); 
      } 
    }; 

    const timer = setTimeout(checkDuplicateNameWithinCategory, 300); 

    return () => { 
      isMounted = false; 
      clearTimeout(timer); 
    }; 
  }, [ 
    f.vesselName, 
    f.assetCategory,
    s.id, 
    Vessels,
    shouldCheckDuplicateName
  ]); 

  const errs = useMemo(() => { 
    const r: string[] = []; 

    if (s.mode === 'RENEWAL' && !s.id) r.push("Validate ID first"); 

    if (isDuplicate && s.mode !== 'RE-AUDIT') { 
      r.push("This name is already used in this category (" + f.assetCategory.toUpperCase() + ")"); 
    } 

    if (hasInvalidFormat) {
      r.push("Vessel name must have a space before the number"); 
    }

    if (!f.ownerFirstName.trim()) r.push("Enter owner's first name");
    if (!f.ownerLastName.trim()) r.push("Enter owner's last name");

    const ageNum = parseInt(f.ownerAge);
    if (!f.ownerAge || ageNum < 18) r.push("Invalid Age (18+)");
    if (!f.barangay) r.push("Select Barangay");
    if (f.phone.length !== 11) r.push("CP Number must be exactly 11 digits");
    if (f.assetCategory === 'gears' && !f.gearType) r.push("Select Gear");

    if (
      ['pangulong', 'gears', 'payao'].includes(f.assetCategory) &&
      getUnitCount(f.unitCount) < 1
    ) {
      r.push("Enter number of units");
    }

    const missingDocs = activeDocKeys.some(key => !f.requirements[key]);
    if (missingDocs) r.push("Upload required scans");

    return r;
  }, [f, activeDocKeys, s.mode, s.id, isDuplicate, hasInvalidFormat]);

  const send = async () => { 
    const trimmedName = f.vesselName.trim().toUpperCase(); 
    const category = f.assetCategory;

    if ( 
      shouldCheckDuplicateName && 
      s.mode !== 'RE-AUDIT' && 
      trimmedName 
    ) { 
      const isAlreadyTaken = Vessels.some((v: any) => { 
        const existingCategory = String( 
          v.asset_category || v.type || '' 
        ).toLowerCase(); 

        if (existingCategory !== category) { 
          return false; 
        } 

        const existingName = String( 
          v.vessel_name || v.gear_type || '' 
        ).trim().toUpperCase(); 

        const existingId = String(v.id || ''); 

        return ( 
          existingName === trimmedName && 
          existingId !== String(s.id || '') 
        ); 
      }); 

      if (isAlreadyTaken || isDuplicate) { 
        toast.error( 
          `Registration Blocked: "${trimmedName}" is already registered under ${category.toUpperCase()}.` 
        ); 
        return; 
      } 
    } 

    setS(prev => ({ ...prev, proc: 1 })); 

    try { 
      const isVessel = f.assetCategory === 'vessel';
      const unitCount = getUnitCount(f.unitCount);

      const unitsInWords =
        f.assetCategory === 'pangulong'
          ? formatPangulongUnits(unitCount)
          : f.assetCategory === 'gears'
            ? formatGearUnits(unitCount, f.gearType)
            : f.assetCategory === 'payao'
              ? formatPayaoUnits(unitCount)
              : null;

      const payload = {
        vessel_name:
          f.assetCategory === 'payao'
            ? f.vesselName.trim().toUpperCase()
            : f.assetCategory === 'gears'
              ? f.gearType.trim().toUpperCase()
              : f.vesselName.trim().toUpperCase(),

        owner_name: ownerFullName,
        owner_suffix: f.ownerSuffix,
        owner_middle_name: f.ownerMiddleName,
        owner_age: Number(f.ownerAge),

        asset_category: f.assetCategory,
        type: isVessel ? 'vessel' : f.assetCategory,

        barangay: f.barangay,
        sitio: f.sitio,
        cp_number: f.phone,

        hull_length: isVessel ? Number(f.length) : 0,
        hull_width: isVessel ? Number(f.width) : 0,
        hull_depth: isVessel ? Number(f.depth) : 0,

        tonnage_gross: isVessel ? Number(f.grossTonnage) : 0,
        tonnage_net: isVessel ? Number(f.netTonnage) : 0,

        is_motorized: isVessel
          ? f.vesselType === "motorized"
          : false,

        place_of_built: isVessel
          ? (f.placeOfBuilt || null)
          : null,

        year_built: isVessel
          ? Number(f.yearBuilt)
          : null,

        gear_type:
          f.assetCategory === 'gears'
            ? f.gearType
            : f.assetCategory === 'pangulong'
              ? 'RING NET (PANGULONG)'
              : f.gearType,

        units_in_words: unitsInWords,

        number_of_boats:
          f.assetCategory === 'payao'
            ? String(unitCount)
            : '',

        boat_name:
          f.assetCategory === 'payao'
            ? formatPayaoNumbers(f.payaoNumbers)
            : '',

        barangay_clearance: f.requirements.barangayClearance,
        cedula: f.requirements.cedula,
        valid_id: f.requirements.validID,
        bfar_permit: f.requirements.bfarPermit,
        marina_permit: f.requirements.marinaPermit,

        status: "Pending",
        rejection_reason: null
      };
      console.log("PAYLOAD:", payload); 

      const existingTargetId =
        location.state?.existingId ||
        s.id ||
        JSON.parse(
          localStorage.getItem('reRegisterVesselData') || '{}'
        ).id; 

      const generatedId =
        existingTargetId ||
        await generateCustomId(f.assetCategory); 

      if (!navigator.onLine) { 
        const localId = generatedId; 
        const offlineVessel = {
          id: localId,
          ...payload,
          created_at: new Date().toISOString()
        }; 

        const offlineQueue = JSON.parse(
          localStorage.getItem('offline_Vessels_queue') || '[]'
        ); 

        offlineQueue.push({
          id: localId,
          payload
        }); 

        localStorage.setItem(
          'offline_Vessels_queue',
          JSON.stringify(offlineQueue)
        ); 

        try { 
          if (typeof addVessel === 'function') { 
            await addVessel(offlineVessel); 
          } 
        } catch (_e) {} 

        setCreatedRM(localId); 
        localStorage.removeItem('reRegisterVesselData'); 
        localStorage.removeItem('isReRegistering'); 

        toast.success(
          "Saved offline. Appears in audit list locally."
        ); 

        setS(prev => ({
          ...prev,
          showSuccess: true
        })); 

        return; 
      } 

      const recordPayload = { 
        id: generatedId, 
        ...payload, 
        updated_at: new Date().toISOString() 
      }; 

      let res; 
      const query = supabase.from('Vessels'); 

      if (s.id || existingTargetId) { 
        res = await query
          .upsert(recordPayload, { onConflict: 'id' })
          .select()
          .single(); 
      } else { 
        res = await query
          .insert(recordPayload)
          .select()
          .single(); 
      } 

      const {
        data: savedVessel,
        error: upsertError
      } = res; 

      if (upsertError) { 
        console.error(
          'Vessel save error:',
          upsertError
        ); 
        throw upsertError; 
      } 

      if (savedVessel) { 
        setCreatedRM(savedVessel.id); 
      } 

      if (existingTargetId) {
        setCreatedRM(existingTargetId);
      } 

      localStorage.removeItem('reRegisterVesselData'); 
      localStorage.removeItem('isReRegistering'); 

      setS(prev => ({
        ...prev,
        showSuccess: true
      })); 

      toast.success(
        "Registration Submitted Successfully!"
      ); 
    } catch (error: any) { 
      toast.error(
        error.message ||
        "Network error occurred"
      ); 
    } finally { 
      setS(prev => ({
        ...prev,
        proc: 0
      })); 
    } 
  }; 

  if (s.showSuccess) { 
    return ( 
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"> 
        <Card className="max-w-md w-full p-8 rounded-3xl text-center space-y-6 shadow-2xl border-none bg-white"> 
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200"> 
            <CheckCircle2 size={32} className="text-emerald-500" /> 
          </div> 
          <div className="space-y-2"> 
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Application Lodged</h2> 
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider"> 
              {navigator.onLine ? "Sent safely to the Municipal Office of Romblon" : "Saved locally (Offline Mode) - Visible in Audit"} 
            </p> 
          </div> 
          <div className="bg-slate-50 rounded-2xl p-4 border text-left space-y-2"> 
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"> 
              <span>Assigned ID:</span> 
              <span className="text-blue-600 font-black tracking-wider"> 
                {s.mode === 'RENEWAL' || s.mode === 'RE-AUDIT' ? s.id : createdRM} 
              </span> 
            </div> 
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"> 
              <span>Owner:</span> 
              <span className="text-slate-900">{ownerFullName}</span> 
            </div> 
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"> 
              <span>Vessel:</span> 
              <span className="text-slate-900">
                {f.assetCategory === 'payao'
                  ? f.payaoVesselName
                  : f.assetCategory === 'gears'
                    ? f.gearType
                    : f.vesselName}
              </span> 
            </div> 
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 items-center"> 
              <span>Status:</span> 
              <Badge className="bg-amber-500 text-white text-[8px] font-black uppercase">PENDING INSPECTION</Badge> 
            </div> 

            {(f.assetCategory === 'pangulong' ||
              f.assetCategory === 'gears' ||
              f.assetCategory === 'payao') && (
              <div className="pt-2 border-t text-[10px] font-black text-slate-700 text-left uppercase whitespace-pre-line">
                {f.assetCategory === 'pangulong'
                  ? formatPangulongUnits(f.unitCount)
                  : f.assetCategory === 'gears'
                    ? formatGearUnits(f.unitCount, f.gearType)
                    : formatPayaoDisplay(
                        f.unitCount,
                        f.payaoVesselName,
                        f.payaoNumbers
                      )}
              </div>
            )}

            <div className="pt-2 border-t text-[10px] font-bold text-slate-500 text-center uppercase tracking-wide"> 
              Please See the audit tracker to know your vessel's inspection schedule and your vessel status. You may also contact the Municipal Office of Romblon for inquiries. 
            </div> 
          </div> 
          <Button onClick={() => navigate('/')} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl tracking-wider"> 
            Dismiss Dashboard 
          </Button> 
        </Card> 
      </div> 
    ); 
  } 

  return ( 
    <div className="min-h-screen bg-white p-4 font-sans text-slate-900"> 
      <BackToHome /> 
      <main className="max-w-6xl mx-auto space-y-6 pt-4 pb-20"> 
        <header className="flex justify-between items-start border-b pb-6"> 
          <div className="space-y-1"> 
            <div className="flex items-center gap-2"> 
              <Anchor size={24} className="text-blue-600" /> 
              <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none"> 
                Aqua<span className="text-blue-600">Reg</span> 
              </h1> 
            </div> 
            <div className="flex items-center gap-2 mt-1"> 
              <Badge className="bg-slate-900 text-white text-[9px] font-black uppercase px-3 py-1">Official Registry</Badge> 
              {s.mode === 'RE-AUDIT' && ( 
                <Badge className="bg-red-600 text-white text-[9px] font-black uppercase px-3 py-1 flex items-center gap-1"> 
                  <RotateCcw size={10} /> Re-Audit Application #{s.id} 
                </Badge> 
              )} 
            </div> 
          </div> 
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200"> 
            {(['NEW', 'RENEWAL'] as const).map(m => ( 
              <button  
                key={m}  
                onClick={() => setS(v => ({ ...v, mode: m, id: null, search: '' }))}  
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${s.mode === m ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`} 
              > 
                {m} 
              </button> 
            ))} 
          </div> 
        </header> 

        {s.mode === 'RENEWAL' && ( 
          <Card className="p-6 rounded-3xl border-2 border-blue-600/20 bg-blue-50/30"> 
            <div className="flex flex-col md:flex-row gap-4 items-end"> 
              <div className="flex-1 space-y-1"> 
                <Label className="text-[10px] font-black uppercase text-blue-600">Registration ID</Label> 
                <div className="relative"> 
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/> 
                  <Input value={s.search} onChange={e => setS(v => ({...v, search: e.target.value}))} className="h-12 pl-10 font-black uppercase tracking-widest" placeholder="E.G. RM-00001"/> 
                </div> 
              </div> 
              <Button onClick={handleRenewalSearch} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-xl uppercase text-xs">Search</Button> 
            </div> 
          </Card> 
        )} 

        {s.mode === 'RE-AUDIT' && ( 
          <Card className="p-4 rounded-2xl border-2 border-red-500/30 bg-red-50/50 flex items-center gap-3"> 
            <ShieldAlert size={24} className="text-red-600 flex-shrink-0" /> 
            <div> 
              <h4 className="text-xs font-black uppercase text-red-700">Re-Submission Mode Active</h4> 
              <p className="text-[11px] font-medium text-red-600"> 
                You are updating a previously rejected application. Review all fields carefully before transmitting. 
              </p> 
            </div> 
          </Card> 
        )} 

        <div className={`grid lg:grid-cols-12 gap-6 transition-opacity ${s.mode === 'RENEWAL' && !s.id ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}> 
          <div className="lg:col-span-8 space-y-6"> 
            <Card className="p-6 rounded-3xl shadow-lg space-y-4"> 
              {/* Owner name: First / Middle / Last / Suffix */}
              <div className="grid grid-cols-12 gap-4"> 
                <div className="col-span-4 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400">First Name</Label> 
                  <Input value={f.ownerFirstName} onChange={e => up('ownerFirstName', e.target.value)} className="h-10 text-sm font-black uppercase" placeholder="FIRST NAME"/> 
                </div> 
                <div className="col-span-4 space-y-1">
  <Label className="text-[8px] font-black uppercase text-slate-400">
    Middle Name
  </Label>

  <div className="relative">
    <Input
      list="middle-name-options"
      value={f.ownerMiddleName}
      onChange={e => up('ownerMiddleName', e.target.value)}
      className="w-full h-10 px-3 pr-10 border rounded-md text-sm font-black uppercase bg-white"
      placeholder="MIDDLE NAME"
    />

    <datalist id="middle-name-options">
      <option value="-" />
    </datalist>

    {/* Down arrow */}
    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
      <svg
        className="w-4 h-4 text-slate-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m6 9 6 6 6-6"
        />
      </svg>
    </div>
  </div>
</div>
                <div className="col-span-3 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400">Last Name</Label> 
                  <Input value={f.ownerLastName} onChange={e => up('ownerLastName', e.target.value)} className="h-10 text-sm font-black uppercase" placeholder="LAST NAME"/> 
                </div> 
                <div className="col-span-1 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400">Suffix</Label> 
                  <select
                    value={f.ownerSuffix}
                    onChange={e => up('ownerSuffix', e.target.value)}
                    className="w-full h-10 px-1 bg-white border rounded-md text-[10px] font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    {SUFFIXES.map(sfx => (
                      <option key={sfx || 'none'} value={sfx}>{sfx || '—'}</option>
                    ))}
                  </select>
                </div> 
              </div> 
              <div className="grid grid-cols-12 gap-4"> 
                <div className="col-span-7 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400">Full Name Preview</Label> 
                  <div className="h-10 flex items-center px-3 bg-slate-50 border rounded-md text-sm font-black uppercase text-slate-700 truncate">
                    {ownerFullName || '—'}
                  </div>
                </div> 
                <div className="col-span-2 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400">Age</Label> 
                  <Input value={f.ownerAge} onChange={e => up('ownerAge', e.target.value)} className="h-10 text-sm font-black text-center" placeholder="18+"/> 
                </div> 
                <div className="col-span-3 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400">
    CP Number
  </Label>

  <Input
    value={f.phone}
    onChange={e => up('phone', e.target.value)}
    className="h-10 text-sm font-mono"
    placeholder="09XXXXXXXXX"
    inputMode="numeric"
    maxLength={11}
  /> 
                </div> 
              </div> 
              <div className="grid grid-cols-12 gap-4 border-t pt-4"> 
                <div className="col-span-4 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400">Sitio</Label> 
                  <Input value={f.sitio} onChange={e => up('sitio', e.target.value)} className="h-10 text-sm font-black uppercase"/> 
                </div> 
                <div className="col-span-8 space-y-1"> 
                  <Label htmlFor="barangay-select" className="text-[8px] font-black uppercase text-slate-400">Barangay</Label> 
                  <select  
                    id="barangay-select" 
                    value={f.barangay}  
                    onChange={e => up('barangay', e.target.value)}  
                    className="w-full h-10 px-4 bg-white border rounded-md text-sm font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" 
                  > 
                    <option value="">Select Barangay</option> 
                    {BARANGAYS.map(b => <option key={b} value={b.toUpperCase()}>{b}</option>)} 
                  </select> 
                </div> 
              </div> 
            </Card> 

            <Card className="p-6 rounded-3xl shadow-sm border-slate-100"> 
               <div className="space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400">Asset / Vessel Name</Label> 
                  <div className="relative"> 
                    <Input  
                      value={f.vesselName}  
                      onChange={e => up('vesselName', e.target.value)}  
                      className={`h-12 font-black uppercase text-sm pr-10 ${isDuplicate && s.mode !== 'RE-AUDIT' ? 'border-amber-500 bg-amber-50 focus-visible:ring-amber-500' : ''}`}  
                      placeholder="NAME OF BOAT / PAYAO ID" 
                    /> 
                    {isDuplicate && s.mode !== 'RE-AUDIT' && ( 
                      <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 animate-pulse" size={20}/> 
                    )} 
                  </div> 
                  {isDuplicate && s.mode !== 'RE-AUDIT' && ( 
                    <p className="text-[9px] font-black text-amber-600 mt-2 uppercase flex items-center gap-1"> 
                       <ShieldAlert size={12}/> This name is already recorded under {f.assetCategory.toUpperCase()} 
                    </p> 
                  )} 
                  {hasInvalidFormat && ( 
                    <p className="text-[9px] font-black text-red-600 mt-2 uppercase flex items-center gap-1"> 
                      <AlertTriangle size={12}/> 
                      Put a space before the number (Example: SEA QUEEN 1) 
                    </p> 
                  )} 
                </div> 
            </Card> 

            <Tabs value={f.assetCategory} onValueChange={v => {
              up('assetCategory', v);

              if (v !== 'payao') {
                setF(prev => ({
                  ...prev,
                  payaoVesselName: '',
                  payaoNumbers: ''
                }));
              }
            }}> 
              <TabsList className="w-full bg-slate-200/60 backdrop-blur-md p-1.5 h-14 flex gap-1.5 rounded-2xl mb-4 shadow-inner border border-slate-200/80"> 
  {['vessel', 'pangulong', 'payao', 'gears'].map((t) => ( 
    <TabsTrigger 
      key={t} 
      value={t} 
      className="flex-1 text-[10px] font-extrabold tracking-wider uppercase rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 text-slate-500 hover:text-slate-800 hover:bg-white/50 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:shadow-slate-200/50 active:scale-[0.98]" 
    > 
      {t === 'vessel' && <Ship size={15} className="mr-1.5 shrink-0 transition-transform duration-200 group-data-[state=active]:scale-110" />} 
      {t === 'payao' && <Anchor size={15} className="mr-1.5 shrink-0 transition-transform duration-200 group-data-[state=active]:scale-110" />} 
      <span className="truncate">{t === 'gears' ? 'fishing gear' : t}</span> 
    </TabsTrigger> 
  ))} 
</TabsList> 

              <TabsContent value="gears"> 
                <Card className="p-6 rounded-3xl bg-slate-50/50 space-y-5"> 
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-slate-500">
                        Number of Units
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={f.unitCount}
                        onChange={e => up('unitCount', e.target.value)}
                        className="h-10 font-black"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-slate-500">
                        Units in Words
                      </Label>
                      <Input
                        readOnly
                        value={formatGearUnits(f.unitCount, f.gearType || 'FISHING GEAR')}
                        className="h-10 font-black bg-white"
                        placeholder="ONE (1) UNIT FISH JIGGING"
                      />
                    </div>
                  </div>

                  <RadioGroup value={f.gearType} onValueChange={v => up('gearType', v)} className="grid grid-cols-2 gap-3"> 
                    {GEARS.map(g => ( 
                      <label key={g} className={`p-4 border-2 rounded-2xl flex justify-between items-center cursor-pointer transition-all ${f.gearType === g ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600'}`}> 
                        <span className="text-[10px] font-black uppercase leading-tight">{g}</span> 
                        <RadioGroupItem value={g} className="sr-only"/> 
                      </label> 
                    ))} 
                  </RadioGroup>

                  {f.gearType && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black uppercase text-blue-900">
                      {formatGearUnits(f.unitCount, f.gearType)}
                    </div>
                  )}
                </Card> 
              </TabsContent> 

              {f.assetCategory !== 'gears' && ( 
                <Card className="p-6 rounded-3xl space-y-6 border-slate-100"> 

                  {(f.assetCategory === 'pangulong' || f.assetCategory === 'payao') && (
                    <div className="space-y-4 border-b pb-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-slate-500">
                            Number of Units
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={f.unitCount}
                            onChange={e => up('unitCount', e.target.value)}
                            className="h-10 font-black"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-slate-500">
                            Units in Words
                          </Label>
                          <Input
                            readOnly
                            value={
                              f.assetCategory === 'pangulong'
                                ? formatPangulongUnits(f.unitCount)
                                : formatPayaoUnits(f.unitCount)
                            }
                            className="h-10 font-black bg-white"
                          />
                        </div>
                      </div>

                      {f.assetCategory === 'pangulong' && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black uppercase text-blue-900">
                          {formatPangulongUnits(f.unitCount) || 'ENTER UNIT COUNT'}
                        </div>
                      )}

                      {f.assetCategory === 'payao' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[8px] font-black uppercase text-slate-500">
                              Vessel / Boat Number(s)
                            </Label>
                            <Input
                              value={f.payaoNumbers}
                              onChange={e => up('payaoNumbers', e.target.value)}
                              placeholder="99, 100, 101, 102, 103, 104"
                              className="h-10 font-black"
                            />
                          </div>

                         <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black uppercase text-blue-900 whitespace-pre-line">
                          {formatPayaoDisplay(
                            f.unitCount,
                            f.vesselName,
                            f.payaoNumbers
                          ) || 'ENTER UNIT COUNT'}
                        </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1"> 
                    <Label className="text-[8px] uppercase text-slate-400">Propulsion</Label> 
                    {f.assetCategory === 'vessel' ? ( 
                      <RadioGroup value={f.vesselType} onValueChange={(v: any) => up('vesselType', v)} className="flex gap-2"> 
                        {['motorized', 'non-motorized'].map(m => ( 
                          <label key={m} className={`flex-1 p-2 border rounded-lg text-center cursor-pointer transition-all ${f.vesselType === m ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white'}`}> 
                            <span className="text-[8px] font-black uppercase tracking-tight">{m}</span> 
                            <RadioGroupItem value={m} className="sr-only"/> 
                          </label> 
                        ))} 
                      </RadioGroup> 
                    ) : <div className="p-2 bg-slate-50 text-[9px] font-bold text-slate-400 rounded-lg border border-dashed uppercase">Propulsion N/A</div>} 
                  </div> 

                 {f.assetCategory === 'vessel' && ( 
                    <> 
                      <div className="space-y-2"> 
                        <Label>Place of Built</Label> 
                        <Input 
                          value={f.placeOfBuilt} 
                          onChange={(e) => up('placeOfBuilt', e.target.value)} 
                          placeholder="Place of Built" 
                        /> 
                      </div> 

                      <div className="space-y-2"> 
                        <Label>Year Built</Label> 
                        <Input 
                          type="number" 
                          value={f.yearBuilt} 
                          onChange={(e) => up('yearBuilt', e.target.value)} 
                          placeholder="Year Built" 
                        /> 
                      </div> 

    <div className="grid grid-cols-2 gap-4"> 
  <div className="bg-white rounded-2xl p-5 text-center shadow-lg border border-slate-100"> 
    <p className="text-[9px] font-black uppercase text-blue-600 mb-1">Gross Tonnage</p> 
    <p className="text-3xl font-black text-slate-900 italic tracking-tighter"> 
      {f.grossTonnage} 
      <span className="text-[10px] not-italic text-slate-400"> GT</span> 
    </p> 
  </div> 
  <div className="bg-white rounded-2xl p-5 text-center shadow-lg border border-slate-100"> 
    <p className="text-[9px] font-black uppercase text-blue-500 mb-1">Net Tonnage</p> 
    <p className="text-3xl font-black text-slate-900 italic tracking-tighter"> 
      {f.netTonnage} 
      <span className="text-[10px] not-italic text-slate-400"> NT</span> 
    </p> 
  </div> 
</div> 

<div className="p-4 bg-slate-50/80 rounded-2xl grid grid-cols-3 gap-3 mt-4"> 
  {['length', 'width', 'depth'].map((d) => ( 
    <div 
      key={d} 
      className="flex flex-col items-center justify-between p-3 bg-white hover:bg-blue-50/40 rounded-xl border border-blue-100 shadow-sm transition-all" 
    > 
      <div className="flex items-center gap-1 mb-2"> 
        <Label className="text-xs font-black uppercase tracking-widest text-slate-700"> 
          {d} 
        </Label> 
        <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200"> 
          m 
        </span> 
      </div> 

      <Input 
        type="number" 
        step="0.01" 
        value={f[d as keyof typeof f] as string} 
        onChange={(e) => up(d, e.target.value)} 
        className="h-10 w-full text-center text-base font-black text-black bg-slate-50 border border-black rounded-lg focus-visible:ring-2 focus-visible:ring-black focus-visible:border-black transition-all" 
      /> 
    </div> 
  ))} 
</div> 
                    </> 
                  )} 
                </Card> 
              )} 
            </Tabs> 
          </div> 

          <div className="lg:col-span-4 space-y-4"> 
            {errs.length > 0 && ( 
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2"> 
                 <p className="text-[10px] font-black text-red-500 uppercase">Attention Required:</p> 
                 <ul className="text-[8px] font-bold text-red-400 uppercase list-disc list-inside"> 
                    {errs.map((e, i) => <li key={i}>{e}</li>)} 
                 </ul> 
              </div> 
            )} 

    <div className="space-y-3"> 
  <div className="flex items-center gap-2 border-b-2 border-black pb-2"> 
    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" /> 
    <p className="text-[10px] font-black uppercase tracking-wider text-black"> 
      Document Scans 
    </p> 
  </div> 

  <div className="space-y-2"> 
    {activeDocKeys.map((key) => { 
      const labelText = key.replace(/([A-Z])/g, ' $1').replace('bfar', 'BFAR'); 
      const fileUrl = f.requirements[key]; 

      return ( 
        <div key={key} className="space-y-1"> 
          <Label className="text-[8px] font-black uppercase text-slate-600 tracking-wider"> 
            {labelText} 
          </Label> 

          {fileUrl ? ( 
            <div className="flex items-center justify-between p-2.5 bg-white border-2 border-black rounded-xl shadow-sm gap-3"> 
              <div className="flex items-center gap-3 overflow-hidden"> 
                <div className="w-16 h-10 flex-shrink-0 rounded-lg overflow-hidden border border-black bg-slate-100"> 
                  <img 
                    src={fileUrl} 
                    className="w-full h-full object-cover" 
                    alt={key} 
                  /> 
                </div> 
                <div className="truncate"> 
                  <p className="text-xs font-bold text-black truncate"> 
                    {fileUrl.split('/').pop() || `${key}-scan.jpg`} 
                  </p> 
                  <span className="text-[9px] font-semibold text-blue-600 uppercase"> 
                    Uploaded 
                  </span> 
                </div> 
              </div> 

              <div className="flex items-center gap-1.5 flex-shrink-0"> 
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-black rounded-lg transition-colors border border-black flex items-center justify-center" 
                  title="View Document" 
                > 
                  <Eye size={14} /> 
                </a> 

                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-white transition-colors flex items-center justify-center"> 
                  <RefreshCw size={14} /> 
                  <input 
                    type="file" 
                    onChange={(e) => processFile(e, key)} 
                    className="hidden" 
                    accept="image/*" 
                  /> 
                </label> 

                <button 
                  onClick={() => handleRequirementChange(key, null)} 
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors flex items-center justify-center" 
                  type="button" 
                > 
                  <Trash2 size={14} /> 
                </button> 
              </div> 
            </div> 
          ) : ( 
            <label className="flex items-center justify-between p-3 border-2 border-dashed border-black hover:border-blue-600 bg-white hover:bg-blue-50/50 rounded-xl cursor-pointer transition-all group"> 
              <div className="flex items-center gap-2.5"> 
                <UploadCloud 
                  size={18} 
                  className="text-black group-hover:text-blue-600 transition-colors" 
                /> 
                <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors"> 
                  No file selected 
                </span> 
              </div> 
              <span className="text-[9px] font-black uppercase text-white bg-black group-hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors"> 
                Upload Scan 
              </span> 
              <input 
                type="file" 
                onChange={(e) => processFile(e, key)} 
                className="hidden" 
                accept="image/*" 
              /> 
            </label> 
          )} 
        </div> 
      ); 
    })} 
  </div> 
</div> 

            <Button  
              disabled={errs.length > 0 || s.proc === 1} 
              onClick={send}  
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xs uppercase rounded-2xl tracking-widest shadow-xl shadow-blue-500/20" 
            > 
              {s.proc === 1 ? 'Transmitting...' : s.mode === 'RE-AUDIT' ? 'Resubmit Application' : 'Submit Application'} 
            </Button> 
          </div> 
        </div> 
      </main> 
    </div> 
  ); 
}