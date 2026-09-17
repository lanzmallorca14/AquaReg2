import { 
  useState, 
  useEffect, 
  useMemo, 
  useCallback, 
  type ChangeEvent 
} from 'react'; 
 
import { 
  useNavigate, 
  useLocation 
} from 'react-router-dom'; 
 
import { Card } from '../../components/ui/card'; 
import { Button } from '../../components/ui/button'; 
import { Input } from '../../components/ui/input'; 
import { Label } from '../../components/ui/label'; 
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../../components/ui/tabs'; 
 
import { 
  RadioGroup, 
  RadioGroupItem 
} from '../../components/ui/radio-group'; 
 
import { Badge } from '../../components/ui/badge'; 
import { toast } from 'sonner'; 
 
import { 
  CheckCircle2, 
  UploadCloud, 
  Trash2, 
  RefreshCw, 
  Eye,  
  Ship, 
  Anchor, 
  Search,  
  ClipboardList, 
  ArrowLeft, 
  FileCheck2, 
  FileX2 
} from 'lucide-react'; 
 
import { 
  useAquaData 
} from '../../components/context/AquaRegCONTEXT'; 
 
import BackToHome from '../../backtohome'; 
 
import { supabase } from './../../../supabaseClient'; 
 
import { 
  saveOfflineImage 
} from '../../../offline/db'; 
 
 
/* ============================================================ 
   FISHING GEARS 
============================================================ */ 
 
const GEARS = [ 
  'FISH JIGGING', 
  'PAILAWAN', 
  'SPEAR GUN', 
  'TABUNAN', 
  'GILL NET (LANGARITE)', 
  'GILL NET (PANGTAPUYOK)', 
  'GILL NET (PANAMBA)', 
  'GILL NET (PANGBYANWAG)' 
]; 
 
 
/* ============================================================ 
   BARANGAYS 
============================================================ */ 
 
const BARANGAYS = [ 
  'AGBALUTO', 'AGBUDIA', 'AGNAGA', 'AGNAY', 'AGNIPA', 'AGPANABAT', 
  'AGTONGO', 'ALAD', 'BAGACAY', 'BARANGAY I', 'BARANGAY II', 
  'BARANGAY III', 'BARANGAY IV', 'CAJIMOS', 'CALABOGO', 'CAPACLAN', 
  'COBRADOR', 'GINABLAN', 'GUIMPINGAN', 'ILAURAN', 'LAMAO', 'LI-O', 
  'LOGBON', 'LONOS', 'LUNAS', 'MACALAS', 'MAPULA', 'PALJE', 
  'SABLAYAN', 'SAWANG', 'TAMBAC' 
]; 
 
 
/* ============================================================ 
   CATEGORY -> ID PREFIX 
============================================================ */ 
 
const CATEGORY_PREFIX: Record<string, string> = { 
  vessel: 'RM', 
  payao: 'PY', 
  pangulong: 'PG', 
  gears: 'FG' 
}; 
 
 
/* ============================================================ 
   GENERATE CUSTOM ID 
============================================================ */ 
 
const findNextAvailableNumber = (existingNumbers: number[]): number => { 
 
  const sorted = 
    [...existingNumbers] 
      .filter(n => Number.isFinite(n) && n > 0) 
      .sort((a, b) => a - b); 
 
  let candidate = 1; 
 
  for (const n of sorted) { 
 
    if (n === candidate) { 
      candidate += 1; 
      continue; 
    } 
 
    if (n > candidate) { 
      break; 
    } 
  } 
 
  return candidate; 
}; 
 
const generateCustomId = async (category: string) => { 
  const prefix = CATEGORY_PREFIX[category] || 'RM'; 
 
  try { 
 
    const { 
      data, 
      error 
    } = await supabase 
      .from('Vessels') 
      .select('id') 
      .like('id', `${prefix}-%`); 
 
    if (error) throw error; 
 
    const numbers = 
      data 
        ?.map((v: any) => { 
          const parts = String(v.id).split('-'); 
          return parseInt(parts[1], 10); 
        }) 
        .filter((n: number) => !isNaN(n)) || []; 
 
    const nextNum = findNextAvailableNumber(numbers); 
 
    return `${prefix}-${String(nextNum).padStart(5, '0')}`; 
 
  } catch (err) { 
 
    console.error( 
      'Error generating custom ID:', 
      err 
    ); 
 
    return `${prefix}-00001`; 
  } 
}; 
 
 
/* ============================================================ 
   NUMBER -> WORDS 
============================================================ */ 
 
const numberToWords = (num: number): string => { 
 
  const ones = [ 
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 
    'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 
    'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 
    'NINETEEN' 
  ]; 
 
  const tens = [ 
    '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 
    'SEVENTY', 'EIGHTY', 'NINETY' 
  ]; 
 
  const value = Math.floor(Number(num) || 0); 
 
  if (value < 20) { 
    return ones[value] || String(value); 
  } 
 
  if (value < 100) { 
    return ( 
      tens[Math.floor(value / 10)] + 
      (value % 10 ? `-${ones[value % 10]}` : '') 
    ); 
  } 
 
  if (value < 1000) { 
    return ( 
      ones[Math.floor(value / 100)] + 
      ' HUNDRED' + 
      (value % 100 ? ` ${numberToWords(value % 100)}` : '') 
    ); 
  } 
 
  if (value < 1000000) { 
    return ( 
      numberToWords(Math.floor(value / 1000)) + 
      ' THOUSAND' + 
      (value % 1000 ? ` ${numberToWords(value % 1000)}` : '') 
    ); 
  } 
 
  return String(value); 
}; 
 
 
/* ============================================================ 
   GET UNIT COUNT 
============================================================ */ 
 
const getUnitCount = ( 
  value: string | number | null | undefined 
): number => { 
 
  const digits = String(value ?? '').replace(/\D/g, ''); 
  const count = Number(digits); 
 
  return Number.isFinite(count) ? Math.floor(count) : 0; 
}; 
 
 
/* ============================================================ 
   PANGULONG UNITS 
============================================================ */ 
 
const formatPangulongUnits = ( 
  value: string | number | null | undefined 
): string => { 
 
  const count = getUnitCount(value); 
  if (count < 1) return ''; 
 
  return ( 
    `${numberToWords(count)} (${count}) ` + 
    `${count === 1 ? 'UNIT' : 'UNITS'} ` + 
    `RING NET (PANGULONG)` 
  ); 
}; 
 
 
/* ============================================================ 
   FISHING GEAR UNITS 
============================================================ */ 
 
const formatGearUnits = ( 
  value: string | number | null | undefined, 
  gearType: string 
): string => { 
 
  const count = getUnitCount(value); 
  if (count < 1) return ''; 
 
  const gear = String(gearType || 'FISHING GEAR').trim().toUpperCase(); 
 
  return ( 
    `${numberToWords(count)} (${count}) ` + 
    `${count === 1 ? 'UNIT' : 'UNITS'} ${gear}` 
  ); 
}; 
 
 
/* ============================================================ 
   PAYAO UNITS 
============================================================ */ 
 
const formatPayaoUnits = ( 
  value: string | number | null | undefined 
): string => { 
 
  const count = getUnitCount(value); 
  if (count < 1) return ''; 
 
  return ( 
    `${numberToWords(count)} (${count}) ` + 
    `${count === 1 ? 'UNIT' : 'UNITS'} OF PAYAO/BALSA` 
  ); 
}; 
 
 
/* ============================================================ 
   PAYAO NUMBERS 
============================================================ */ 
 
const formatPayaoNumbers = (value: string): string => { 
 
  return String(value || '') 
    .split(',') 
    .map(v => v.trim()) 
    .filter(Boolean) 
    .map(v => (v.startsWith('#') ? v : `#${v}`)) 
    .join(', '); 
}; 
 
 
/* ============================================================ 
   PAYAO DISPLAY 
============================================================ */ 
 
const formatPayaoDisplay = ( 
  unitCount: string | number, 
  vesselName: string, 
  numbers: string 
): string => { 
 
  const units = formatPayaoUnits(unitCount); 
  const cleanName = String(vesselName || '').trim().toUpperCase(); 
  const cleanNumbers = formatPayaoNumbers(numbers); 
 
  if (!units) return ''; 
 
  if (!cleanName && !cleanNumbers) { 
    return units; 
  } 
 
  if (!cleanName) { 
    return `${units}\nNUMBER(S): ${cleanNumbers}`; 
  } 
 
  if (!cleanNumbers) { 
    return `${units}\nNAME: ${cleanName}`; 
  } 
 
  return `${units}\nNAME: ${cleanName} ${cleanNumbers}`; 
}; 
 
 
/* ============================================================ 
   NAME HELPERS 
============================================================ */ 
 
const SUFFIXES = ['', 'JR.', 'SR.', 'II', 'III', 'IV', 'V']; 
 
 
/* ============================================================ 
   SANITIZE NAME PART 
============================================================ */ 
 
const sanitizeNamePart = (v: string) => 
  String(v || '') 
    .normalize('NFC') 
    .replace(/[^\p{L}\p{M}\s.'’\-]/gu, '') 
    .toUpperCase(); 
 
 
/* ============================================================ 
   BUILD FULL OWNER NAME 
============================================================ */ 
 
const buildFullOwnerName = ( 
  parts: { 
    firstName: string; 
    middleName: string; 
    lastName: string; 
    suffix: string; 
  } 
) => { 
 
  const first = parts.firstName.trim(); 
  const middle = parts.middleName.trim(); 
  const last = parts.lastName.trim(); 
  const suffix = parts.suffix.trim(); 
 
  const cleanMiddle = middle === '-' || middle === '—' ? '' : middle; 
  const cleanSuffix = suffix === '-' || suffix === '—' ? '' : suffix; 
 
  return [first, cleanMiddle, last, cleanSuffix] 
    .filter(Boolean) 
    .join(' ') 
    .trim(); 
}; 
 
 
/* ============================================================ 
   FIXED OWNER NAME PARSER 
============================================================ */ 
 
const parseOwnerNameParts = (fullName: string) => { 
 
  const raw = String(fullName || '').trim(); 
 
  if (!raw) { 
    return { firstName: '', middleName: '', lastName: '', suffix: '' }; 
  } 
 
  if (raw.includes(',')) { 
 
    const [lastPartRaw, restRaw = ''] = 
      raw.split(',').map(s => s.trim()); 
 
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
      suffix 
    }; 
  } 
 
  const tokens = raw.split(/\s+/).filter(Boolean); 
 
  let suffix = ''; 
 
  const lastToken = tokens[tokens.length - 1]?.toUpperCase(); 
 
  if (lastToken && SUFFIXES.includes(lastToken)) { 
    suffix = lastToken; 
    tokens.pop(); 
  } 
 
  if (tokens.length === 1) { 
    return { 
      firstName: sanitizeNamePart(tokens[0]), 
      middleName: '', 
      lastName: '', 
      suffix 
    }; 
  } 
 
  if (tokens.length === 2) { 
    return { 
      firstName: sanitizeNamePart(tokens[0]), 
      middleName: '', 
      lastName: sanitizeNamePart(tokens[1]), 
      suffix 
    }; 
  } 
 
  const firstName = tokens[0]; 
  const lastName = tokens[tokens.length - 1]; 
  const middleName = tokens.slice(1, -1).join(' '); 
 
  return { 
    firstName: sanitizeNamePart(firstName), 
    middleName: sanitizeNamePart(middleName), 
    lastName: sanitizeNamePart(lastName), 
    suffix 
  }; 
}; 
 
 
/* ============================================================ 
   DOCUMENT LABEL HELPER 
============================================================ */ 
 
const DOC_LABELS: Record<string, string> = { 
  barangayClearance: 'Barangay Clearance', 
  cedula: 'Cedula', 
  validID: 'Valid ID', 
  bfarPermit: 'BFAR Permit', 
  marinaPermit: 'Marina Permit' 
}; 
 
 
/* ============================================================ 
   DUPLICATE NAME HELPERS
============================================================ */

/*
  IMPORTANT:

  Rejected records are intentionally ignored by duplicate checking.

  Example:

  Existing:
    SEA QUEEN 1 -> Pending       => BLOCK
    SEA QUEEN 1 -> Passed        => BLOCK
    SEA QUEEN 1 -> Registered    => BLOCK
    SEA QUEEN 1 -> Rejected      => ALLOW

  This applies to both:
    1. Local Vessels data
    2. Online Supabase data

  The comparison is still category-specific.
*/

const normalizeDuplicateName = (value: any): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isRejectedStatus = (status: any): boolean => {
  return String(status || '')
    .trim()
    .toLowerCase() === 'rejected';
};

const getAssetNameForDuplicateCheck = (v: any): string => {
  return String(
    v?.vessel_name ??
    v?.gear_type ??
    v?.name ??
    v?.boat_name ??
    ''
  );
};

const isDuplicateAssetName = (
  asset: any,
  requestedName: string,
  requestedCategory: string,
  currentId?: string | null
): boolean => {

  /*
    REJECTED RECORDS NEVER COUNT AS DUPLICATES.
  */
  if (isRejectedStatus(asset?.status)) {
    return false;
  }

  const existingCategory = String(
    asset?.asset_category ||
    asset?.type ||
    ''
  )
    .trim()
    .toLowerCase();

  if (existingCategory !== requestedCategory) {
    return false;
  }

  const existingId = String(asset?.id || '');

  if (
    currentId !== undefined &&
    currentId !== null &&
    existingId === String(currentId)
  ) {
    return false;
  }

  const existingName = normalizeDuplicateName(
    getAssetNameForDuplicateCheck(asset)
  );

  const normalizedRequestedName =
    normalizeDuplicateName(requestedName);

  if (!existingName || !normalizedRequestedName) {
    return false;
  }

  return existingName === normalizedRequestedName;
};


/* ============================================================ 
   MAIN COMPONENT 
============================================================ */ 
 
export default function AquaRegNewRegistration() { 
 
  const navigate = useNavigate(); 
  const location = useLocation(); 
 
  const { Vessels = [], addVessel } = useAquaData(); 
 
 
  /* ==========================================================  
     STATE 
  ========================================================== */ 
 
  const [createdRM, setCreatedRM] = useState(''); 
  const [isDuplicate, setIsDuplicate] = useState(false); 
 
  const [s, setS] = useState({ 
    sub: 0, 
    proc: 0, 
    rev: 0, 
    mode: 'NEW' as 'NEW' | 'RENEWAL', 
    search: '', 
    id: null as string | null, 
    isEncrypted: false, 
    isEncrypting: false, 
    showSuccess: false, 
 
    showReceipt: false, 
    isPreparingReceipt: false, 
 
    pendingId: null as string | null 
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
 
 
  /* ==========================================================  
     DERIVED FULL NAME 
  ========================================================== */ 
 
  const ownerFullName = useMemo( 
    () => 
      buildFullOwnerName({ 
        firstName: f.ownerFirstName, 
        middleName: f.ownerMiddleName, 
        lastName: f.ownerLastName, 
        suffix: f.ownerSuffix 
      }), 
    [f.ownerFirstName, f.ownerMiddleName, f.ownerLastName, f.ownerSuffix] 
  ); 
 
 
 
 
 
  /* ==========================================================  
     INVALID VESSEL NAME FORMAT 
  ========================================================== */ 
 
  const hasInvalidFormat = useMemo( 
    () => /[A-Za-z]\d/.test(f.vesselName), 
    [f.vesselName] 
  ); 
 
 
  /* ==========================================================  
     DUPLICATE CHECK ENABLED 
  ========================================================== */ 
 
  const shouldCheckDuplicateName = useMemo( 
    () => Boolean(f.assetCategory), 
    [f.assetCategory] 
  ); 
 
 
  /* ==========================================================  
     ACTIVE DOCUMENTS 
  ========================================================== */ 
 
  const activeDocKeys = useMemo(() => {

  if (f.assetCategory === 'vessel') {

    // Non-motorized vessels do NOT require Valid ID.
    if (f.vesselType === 'non-motorized') {
      return ['barangayClearance', 'cedula'];
    }

    // Motorized vessels still require Valid ID.
    return ['barangayClearance', 'cedula', 'validID'];
  }

  return ['barangayClearance', 'cedula',];

}, [f.assetCategory, f.vesselType]);
 
 
  /* ==========================================================  
     RENEWAL SEARCH 
  ========================================================== */ 
 
  const handleRenewalSearch = () => { 
 
    const existing = Vessels.find( 
      (v: any) => String(v.id)?.toUpperCase() === s.search.toUpperCase() 
    ) as any; 
 
    if (!existing) { 
      toast.error('Record Not Found'); 
      return; 
    } 
 
    const existingCategory = String( 
      existing.asset_category || existing.type || 'vessel' 
    ).toLowerCase(); 
 
    const nameParts = 
      existing.owner_first_name || existing.owner_last_name 
        ? { 
            firstName: sanitizeNamePart(existing.owner_first_name || ''), 
            middleName: sanitizeNamePart(existing.owner_middle_name || ''), 
            lastName: sanitizeNamePart(existing.owner_last_name || ''), 
            suffix: String(existing.owner_suffix || '').toUpperCase() 
          } 
        : parseOwnerNameParts(existing.owner_name || ''); 
 
    setS(prev => ({ ...prev, id: existing.id })); 
 
    setF(prev => ({ 
      ...prev, 
 
      ownerFirstName: nameParts.firstName, 
      ownerMiddleName: nameParts.middleName, 
      ownerLastName: nameParts.lastName, 
      ownerSuffix: nameParts.suffix, 
 
      ownerAge: String(existing.owner_age ?? ''), 
      vesselName: existing.vessel_name ?? '', 
      barangay: existing.barangay ?? '', 
      sitio: existing.sitio ?? '', 
      phone: existing.cp_number ?? '', 
 
      assetCategory: existingCategory, 
 
      vesselType: existing.is_motorized ? 'motorized' : 'non-motorized', 
 
      gearType: existing.gear_type ?? '', 
 
      length: String(existing.hull_length ?? ''), 
      width: String(existing.hull_width ?? ''), 
      depth: String(existing.hull_depth ?? ''), 
 
      grossTonnage: String(existing.tonnage_gross ?? '0.00'), 
      netTonnage: String(existing.tonnage_net ?? '0.00'), 
 
      unitCount: String( 
        existing.unit_count ?? 
        existing.number_of_units ?? 
        existing.number_of_boats ?? 
        '1' 
      ), 
 
      payaoVesselName: String( 
        existing.payao_vessel_name ?? existing.boat_owner_vessel_name ?? '' 
      ).toUpperCase(), 
 
      payaoNumbers: String( 
        existing.payao_numbers ?? existing.boat_name ?? '' 
      ), 
 
      requirements: { 
        barangayClearance: existing.barangay_clearance || null, 
        cedula: existing.cedula || null, 
        validID: existing.valid_id || null, 
        bfarPermit: existing.bfar_permit || null, 
        marinaPermit: existing.marina_permit || null 
      } 
    })); 
 
    toast.success('Record Found', { 
      description: 'Existing data pre-filled.' 
    }); 
  }; 
 
 
  /* ==========================================================  
     UPDATE FORM 
  ========================================================== */ 
 
  const up = useCallback((k: string, v: any) => { 
 
    setF(p => { 
 
      let val = v; 
 
      if (k === 'phone') { 
        val = String(v).replace(/\D/g, '').slice(0, 11); 
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
 
 
  /* ==========================================================  
     REQUIREMENT CHANGE 
  ========================================================== */ 
 
  const handleRequirementChange = ( 
    docKey: string, 
    base64Data: string | null 
  ) => { 
    setF(p => ({ 
      ...p, 
      requirements: { ...p.requirements, [docKey]: base64Data } 
    })); 
  }; 
 
 
  /* ==========================================================  
     PROCESS FILE 
  ========================================================== */ 
 
  const processFile = async ( 
    e: ChangeEvent<HTMLInputElement>, 
    key: string 
  ) => { 
 
    const file = e.target.files?.[0]; 
    if (!file) return; 
 
    if (!navigator.onLine) { 
 
      try { 
        const vesselId = s.id ?? crypto.randomUUID(); 
        await saveOfflineImage(vesselId, key, file); 
 
        const preview = URL.createObjectURL(file); 
        handleRequirementChange(key, preview); 
 
        toast.success('Image saved offline. It will sync automatically.'); 
 
      } catch (_error: any) { 
        toast.error('Failed saving image offline'); 
      } 
 
      return; 
    } 
 
    try { 
 
      const fileExt = file.name.split('.').pop(); 
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`; 
      const filePath = `documents/${s.id ?? 'new'}/${key}/${fileName}`; 
 
      const { error } = await supabase.storage 
        .from('vessel-docs') 
        .upload(filePath, file, { cacheControl: '3600', upsert: false }); 
 
      if (error) { 
        toast.error('Upload failed: ' + error.message); 
        return; 
      } 
 
      const { data: publicUrlData } = supabase.storage 
        .from('vessel-docs') 
        .getPublicUrl(filePath); 
 
      if (!publicUrlData?.publicUrl) { 
        toast.error('Failed to get file URL'); 
        return; 
      } 
 
      handleRequirementChange(key, publicUrlData.publicUrl); 
      toast.success('File uploaded successfully'); 
 
    } catch (error: any) { 
      toast.error(error.message || 'Image processing failed'); 
    } 
  }; 
 
 
  /* ==========================================================  
     AUTO CALCULATE TONNAGE 
  ========================================================== */ 
 
  useEffect(() => { 
 
    if (f.assetCategory !== 'vessel' || f.vesselType !== 'motorized') { 
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
 
        if (prev.grossTonnage === newGt && prev.netTonnage === newNt) { 
          return prev; 
        } 
 
        return { ...prev, grossTonnage: newGt, netTonnage: newNt }; 
      }); 
    } 
 
  }, [f.length, f.width, f.depth, f.assetCategory, f.vesselType]); 
 
 
  /* ==========================================================  
     DUPLICATE CHECK 
  ========================================================== */ 
 
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
 
        /*
          LOCAL CHECK

          Rejected records are explicitly ignored by
          isDuplicateAssetName().
        */
        const foundLocally = Vessels.some((v: any) => 
          isDuplicateAssetName(
            v,
            trimmedName,
            category,
            s.id
          )
        ); 
 
        if (foundLocally) { 
          if (isMounted) setIsDuplicate(true); 
          return; 
        } 
 
        if (navigator.onLine) { 
 
          /*
            ONLINE CHECK

            Include status in the query result so rejected
            records can be excluded.
          */
          const { data, error } = await supabase 
            .from('Vessels') 
            .select(
              'id, vessel_name, gear_type, asset_category, type, status'
            ) 
            .or(
              `vessel_name.eq.${trimmedName},gear_type.eq.${trimmedName}`
            ); 
 
          if (!error && data) { 
 
            const matches = data.some((v: any) => 
              isDuplicateAssetName(
                v,
                trimmedName,
                category,
                s.id
              )
            ); 
 
            if (matches) { 
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
 
    const timer = setTimeout(
      checkDuplicateNameWithinCategory, 
      300
    ); 
 
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
 
 
  /* ==========================================================  
     VALIDATION ERRORS 
  ========================================================== */ 
 
  const errs = useMemo(() => { 
 
    const r: string[] = []; 
 
    if (s.mode === 'RENEWAL' && !s.id) { 
      r.push('Validate ID first'); 
    } 
 
    if (isDuplicate) {
      r.push( 
        'This name is already used in this category (' + 
        f.assetCategory.toUpperCase() + ')' 
      ); 
    } 
 
    if (hasInvalidFormat) { 
      r.push('Vessel name must have a space before the number'); 
    } 
 
    if (!f.ownerFirstName.trim()) { 
      r.push("Enter owner's first name"); 
    } 
 
    if (!f.ownerLastName.trim()) { 
      r.push("Enter owner's last name"); 
    } 
 
    const ageNum = parseInt(f.ownerAge); 
 
    if (!f.ownerAge || ageNum < 18) { 
      r.push('Invalid Age (18+)'); 
    } 
 
    if (!f.barangay) { 
      r.push('Select Barangay'); 
    } 
 
    if (f.phone.length !== 11) { 
      r.push('CP Number must be exactly 11 digits'); 
    } 
 
    if (f.assetCategory === 'gears' && !f.gearType) { 
      r.push('Select Gear'); 
    } 
 
    if ( 
      ['pangulong', 'gears', 'payao'].includes(f.assetCategory) && 
      getUnitCount(f.unitCount) < 1 
    ) { 
      r.push('Enter number of units'); 
    } 
 
    const missingDocs = activeDocKeys.some(key => !f.requirements[key]); 
 
    if (missingDocs) { 
      r.push('Upload required scans'); 
    } 
 
    return r; 
 
  }, [f, activeDocKeys, s.mode, s.id, isDuplicate, hasInvalidFormat]); 
 
 
  /* ==========================================================  
     RESOLVE EXISTING TARGET ID 
  ========================================================== */ 
 
  const resolveExistingTargetId = useCallback((): string | null => { 
 
    try { 
      const stored = localStorage.getItem('reRegisterVesselData'); 
      const storedData = stored ? JSON.parse(stored) : {}; 
 
      return ( 
        location.state?.existingId || 
        s.id || 
        storedData.id || 
        null 
      ); 
 
    } catch { 
      return location.state?.existingId || s.id || null; 
    } 
 
  }, [location.state, s.id]); 
 
 
  /* ==========================================================  
     OPEN RECEIPT 
  ========================================================== */ 
 
  const handleOpenReceipt = async () => { 
 
    if (errs.length > 0) return; 
 
    setS(prev => ({ ...prev, isPreparingReceipt: true })); 
 
    try { 
 
      const existingTargetId = resolveExistingTargetId(); 
 
      const idForReceipt = 
        existingTargetId || 
        await generateCustomId(f.assetCategory); 
 
      setS(prev => ({ 
        ...prev, 
        pendingId: idForReceipt, 
        showReceipt: true, 
        isPreparingReceipt: false 
      })); 
 
    } catch (err) { 
 
      console.error('Failed to prepare receipt:', err); 
 
      toast.error('Could not prepare the registration ID. Please try again.'); 
 
      setS(prev => ({ ...prev, isPreparingReceipt: false })); 
    } 
  }; 
 
 
  /* ==========================================================  
     PERFORM SUBMIT 
  ========================================================== */ 
 
  const performSubmit = async () => { 
 
    const trimmedName = f.vesselName.trim().toUpperCase(); 
    const category = f.assetCategory; 
 
    /* ====================================================  
       FINAL DUPLICATE CHECK

       IMPORTANT:
       REJECTED records are ignored here as well.

       This prevents a rejected application from blocking
       a new application using the same asset/vessel name.
    ==================================================== */ 
 
    if (
      shouldCheckDuplicateName &&
      trimmedName
    ) { 
 
      const isAlreadyTaken = Vessels.some((v: any) => 
        isDuplicateAssetName(
          v,
          trimmedName,
          category,
          s.id
        )
      ); 
 
      /*
        If the live duplicate state is true, we still block.
        However, that state can only become true from a
        non-rejected matching record because the duplicate
        checks above exclude Rejected records.
      */
      if (isAlreadyTaken || isDuplicate) { 
 
        toast.error( 
          `Registration Blocked: "${trimmedName}" is already registered under ${category.toUpperCase()}.` 
        ); 
 
        setS(prev => ({ 
          ...prev, 
          showReceipt: false 
        })); 
 
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
        owner_first_name: f.ownerFirstName.trim().toUpperCase(), 
        owner_middle_name: f.ownerMiddleName.trim().toUpperCase(), 
        owner_last_name: f.ownerLastName.trim().toUpperCase(), 
        owner_suffix: f.ownerSuffix.trim().toUpperCase(), 
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
 
        is_motorized: isVessel ? f.vesselType === 'motorized' : false, 
 
        place_of_built: isVessel ? (f.placeOfBuilt || null) : null, 
        year_built: isVessel ? Number(f.yearBuilt) : null, 
 
        gear_type: 
          f.assetCategory === 'gears' 
            ? f.gearType 
            : f.assetCategory === 'pangulong' 
              ? 'RING NET (PANGULONG)' 
              : f.gearType, 
 
        units_in_words: unitsInWords, 
 
        number_of_boats: 
          f.assetCategory === 'payao' ? String(unitCount) : '', 
 
        payao_vessel_name: 
          f.assetCategory === 'payao' 
            ? f.payaoVesselName.trim().toUpperCase() 
            : '', 
 
        payao_numbers: 
          f.assetCategory === 'payao' ? f.payaoNumbers.trim() : '', 
 
        boat_name: 
          f.assetCategory === 'payao' 
            ? formatPayaoNumbers(f.payaoNumbers) 
            : '', 
 
        barangay_clearance: f.requirements.barangayClearance, 
        cedula: f.requirements.cedula, 
        valid_id: f.requirements.validID, 
        bfar_permit: f.requirements.bfarPermit, 
        marina_permit: f.requirements.marinaPermit, 
 
        status: 'Pending', 
        rejection_reason: null 
      }; 
 
      console.log('PAYLOAD:', payload); 
 
      const existingTargetId = resolveExistingTargetId(); 
 
      const generatedId = 
        s.pendingId || 
        existingTargetId || 
        await generateCustomId(f.assetCategory); 
 
 
      /* ====================================================  
         OFFLINE 
      ==================================================== */ 
 
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

        toast.success('Saved offline. Appears in audit list locally.'); 
 
        setS(prev => ({ 
          ...prev, 
          showSuccess: true, 
          showReceipt: false 
        })); 
 
        return; 
      } 
 
 
      /* ====================================================  
         ONLINE SAVE 
      ==================================================== */ 
 
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
 
      const { data: savedVessel, error: upsertError } = res; 
 
      if (upsertError) { 
        console.error('Vessel save error:', upsertError); 
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
        showSuccess: true, 
        showReceipt: false 
      })); 
 
      toast.success('Registration Submitted Successfully!'); 
 
    } catch (error: any) { 
 
      console.error('Registration error:', error); 
 
      toast.error(error.message || 'Network error occurred'); 
 
      setS(prev => ({ 
        ...prev, 
        showReceipt: false 
      })); 
 
    } finally { 
 
      setS(prev => ({ 
        ...prev, 
        proc: 0 
      })); 
 
    } 
  }; 
 
 
  /* ==========================================================  
     SUCCESS SCREEN 
  ========================================================== */ 
 
  if (s.showSuccess) { 
 
    return ( 
 
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"> 
 
        <Card className="max-w-md w-full p-8 rounded-3xl text-center space-y-6 shadow-2xl border-none bg-white"> 
 
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200"> 
            <CheckCircle2 size={32} className="text-emerald-500" /> 
          </div> 
 
          <div className="space-y-2"> 
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900"> 
              Application Lodged 
            </h2> 
 
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider"> 
              { 
                navigator.onLine 
                  ? 'Sent safely to the Municipal Office of Romblon' 
                  : 'Saved locally (Offline Mode) - Visible in Audit' 
              } 
            </p> 
          </div> 
 
          <div className="bg-slate-50 rounded-2xl p-4 border text-left space-y-2"> 
 
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"> 
              <span>Assigned ID:</span> 
              <span className="text-blue-600 font-black tracking-wider"> 
                { 
                  s.mode === 'RENEWAL' 
                    ? s.id 
                    : createdRM 
                } 
              </span> 
            </div> 
 
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"> 
              <span>Owner:</span> 
              <span className="text-slate-900">{ownerFullName}</span> 
            </div> 
 
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"> 
              <span>Vessel:</span> 
              <span className="text-slate-900"> 
                { 
                  f.assetCategory === 'payao' 
                    ? f.payaoVesselName 
                    : f.assetCategory === 'gears' 
                      ? f.gearType 
                      : f.vesselName 
                } 
              </span> 
            </div> 
 
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 items-center"> 
              <span>Status:</span> 
              <Badge className="bg-amber-500 text-white text-[8px] font-black uppercase"> 
                PENDING INSPECTION 
              </Badge> 
            </div> 
 
            { 
              ( 
                f.assetCategory === 'pangulong' || 
                f.assetCategory === 'gears' || 
                f.assetCategory === 'payao' 
              ) && ( 
                <div className="pt-2 border-t text-[10px] font-black text-slate-700 text-left uppercase whitespace-pre-line"> 
                  { 
                    f.assetCategory === 'pangulong' 
                      ? formatPangulongUnits(f.unitCount) 
                      : f.assetCategory === 'gears' 
                        ? formatGearUnits(f.unitCount, f.gearType) 
                        : formatPayaoDisplay( 
                            f.unitCount, 
                            f.payaoVesselName, 
                            f.payaoNumbers
                          ) 
                  } 
                </div> 
              ) 
            } 
 
            <div className="pt-2 border-t text-[10px] font-bold text-slate-500 text-center uppercase tracking-wide"> 
              Please See the audit tracker to know your vessel's inspection schedule and your vessel status. You may also contact the Municipal Office of Romblon for inquiries. 
            </div> 
 
          </div> 
 
          <Button 
            onClick={() => navigate('/')} 
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl tracking-wider" 
          > 
            Dismiss Dashboard 
          </Button> 
 
        </Card> 
 
      </div> 
    ); 
  } 
 
 
  /* ==========================================================  
     RECEIPT / REVIEW OVERLAY 
  ========================================================== */ 
 
  const categoryLabel = 
    f.assetCategory === 'gears' 
      ? 'FISHING GEAR' 
      : f.assetCategory.toUpperCase(); 
 
  const assetDisplayName = 
    f.assetCategory === 'payao' 
      ? (f.payaoVesselName || f.vesselName || '—') 
      : f.assetCategory === 'gears' 
        ? (f.gearType || '—') 
        : (f.vesselName || '—'); 
 
  const unitsLine = 
    f.assetCategory === 'pangulong' 
      ? formatPangulongUnits(f.unitCount) 
      : f.assetCategory === 'gears' 
        ? formatGearUnits(f.unitCount, f.gearType) 
        : f.assetCategory === 'payao' 
          ? formatPayaoDisplay( 
              f.unitCount, 
              f.payaoVesselName, 
              f.payaoNumbers
            ) 
          : ''; 
 
  const ReceiptOverlay = s.showReceipt ? ( 
 
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"> 
 
      <Card className="max-w-lg w-full my-8 p-0 rounded-3xl shadow-2xl border-none bg-white overflow-hidden"> 
 
        <div className="bg-slate-900 text-white p-6 space-y-1"> 
 
          <div className="flex items-center gap-2"> 
            <ClipboardList size={20} className="text-blue-400" /> 
            <h2 className="text-lg font-black uppercase tracking-tight"> 
              Final Review 
            </h2> 
          </div> 
 
          <p className="text-[11px] text-slate-300 font-medium uppercase tracking-wide"> 
            Nothing is saved yet — check every detail before confirming. 
          </p> 
 
        </div> 
 
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto"> 
 
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl"> 
            <div> 
              <p className="text-[9px] font-black uppercase text-blue-600"> 
                {s.id ? 'Existing Registration ID' : 'Reserved Registration ID'} 
              </p> 
              <p className="text-2xl font-black text-blue-900 tracking-widest"> 
                {s.pendingId || '—'} 
              </p> 
            </div> 
            <Badge className="bg-blue-600 text-white text-[9px] font-black uppercase"> 
              {categoryLabel} 
            </Badge> 
          </div> 
 
          <div className="space-y-2"> 
            <p className="text-[10px] font-black uppercase text-slate-400 border-b pb-1"> 
              Owner 
            </p> 
            <div className="grid grid-cols-2 gap-y-1.5 text-xs"> 
              <span className="text-slate-400 font-bold uppercase text-[9px]">Full Name</span> 
              <span className="text-right font-black text-slate-900 uppercase"> 
                {ownerFullName || '—'} 
              </span> 
 
              <span className="text-slate-400 font-bold uppercase text-[9px]">Age</span> 
              <span className="text-right font-black text-slate-900"> 
                {f.ownerAge || '—'} 
              </span> 
 
              <span className="text-slate-400 font-bold uppercase text-[9px]">CP Number</span> 
              <span className="text-right font-black text-slate-900"> 
                {f.phone || '—'} 
              </span> 
 
              <span className="text-slate-400 font-bold uppercase text-[9px]">Sitio</span> 
              <span className="text-right font-black text-slate-900 uppercase"> 
                {f.sitio || '—'} 
              </span> 
 
              <span className="text-slate-400 font-bold uppercase text-[9px]">Barangay</span> 
              <span className="text-right font-black text-slate-900 uppercase"> 
                {f.barangay || '—'} 
              </span> 
            </div> 
          </div> 
 
          <div className="space-y-2"> 
            <p className="text-[10px] font-black uppercase text-slate-400 border-b pb-1"> 
              Asset 
            </p> 
 
            <div className="grid grid-cols-2 gap-y-1.5 text-xs"> 
 
              <span className="text-slate-400 font-bold uppercase text-[9px]">Name / ID</span> 
              <span className="text-right font-black text-slate-900 uppercase"> 
                {assetDisplayName} 
              </span> 
 
              { 
                f.assetCategory === 'vessel' && ( 
                  <> 
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Propulsion</span> 
                    <span className="text-right font-black text-slate-900 uppercase"> 
                      {f.vesselType} 
                    </span> 
 
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Place Built</span> 
                    <span className="text-right font-black text-slate-900 uppercase"> 
                      {f.placeOfBuilt || '—'} 
                    </span> 
 
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Year Built</span> 
                    <span className="text-right font-black text-slate-900"> 
                      {f.yearBuilt || '—'} 
                    </span> 
 
                    <span className="text-slate-400 font-bold uppercase text-[9px]">L × W × D (m)</span> 
                    <span className="text-right font-black text-slate-900"> 
                      {f.length || '0'} × {f.width || '0'} × {f.depth || '0'} 
                    </span> 
 
                    <span className="text-slate-400 font-bold uppercase text-[9px]">Gross / Net Tonnage</span> 
                    <span className="text-right font-black text-slate-900"> 
                      {f.grossTonnage} GT / {f.netTonnage} NT 
                    </span> 
                  </> 
                ) 
              } 
 
              { 
                unitsLine && ( 
                  <> 
                    <span className="text-slate-400 font-bold uppercase text-[9px] col-span-2 pt-1"> 
                      Units 
                    </span> 
 
                    <span className="col-span-2 text-right font-black text-blue-900 uppercase whitespace-pre-line bg-blue-50 border border-blue-100 rounded-lg p-2"> 
                      {unitsLine} 
                    </span> 
                  </> 
                ) 
              } 
 
            </div> 
          </div> 
 
          <div className="space-y-2"> 
 
            <p className="text-[10px] font-black uppercase text-slate-400 border-b pb-1"> 
              Document Scans 
            </p> 
 
            <div className="space-y-1.5"> 
 
              { 
                activeDocKeys.map(key => { 
 
                  const uploaded = Boolean(
                    f.requirements[key]
                  ); 
 
                  return ( 
 
                    <div 
                      key={key} 
                      className="flex items-center justify-between text-xs"
                    > 
 
                      <span className="text-slate-400 font-bold uppercase text-[9px]"> 
                        {DOC_LABELS[key] || key} 
                      </span> 
 
                      { 
                        uploaded ? ( 
                          <span className="flex items-center gap-1 text-emerald-600 font-black text-[9px] uppercase"> 
                            <FileCheck2 size={12} /> Attached 
                          </span> 
                        ) : ( 
                          <span className="flex items-center gap-1 text-red-500 font-black text-[9px] uppercase"> 
                            <FileX2 size={12} /> Missing 
                          </span> 
                        ) 
                      } 
 
                    </div> 
 
                  ); 
                }) 
              } 
 
            </div> 
 
          </div> 
 
        </div> 
 
        <div className="p-6 pt-0 flex gap-3"> 
 
          <Button 
            variant="outline" 
            disabled={s.proc === 1} 
            onClick={() => 
              setS(prev => ({ 
                ...prev, 
                showReceipt: false 
              }))
            } 
            className="flex-1 h-12 font-black text-xs uppercase rounded-xl tracking-wider flex items-center justify-center gap-2" 
          > 
            <ArrowLeft size={14} /> 
            Back to Edit 
          </Button> 
 
          <Button 
            disabled={s.proc === 1} 
            onClick={performSubmit} 
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xs uppercase rounded-xl tracking-wider" 
          > 
            {s.proc === 1 ? 'Transmitting...' : 'Confirm & Submit'} 
          </Button> 
 
        </div> 
 
      </Card> 
 
    </div> 
 
  ) : null; 
 
 
  /* ==========================================================  
     MAIN PAGE 
  ========================================================== */ 
 
  return ( 
 
    <div className="min-h-screen bg-white p-4 font-sans text-slate-900"> 
 
      <BackToHome /> 
 
      {ReceiptOverlay} 
 
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
 
              <Badge className="bg-slate-900 text-white text-[9px] font-black uppercase px-3 py-1"> 
                Official Registry 
              </Badge> 
 
            
 
            </div> 
 
          </div> 
 
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200"> 
 
            { 
              (['NEW', 'RENEWAL'] as const).map(m => ( 
                <button 
                  key={m} 
                  onClick={() => 
                    setS(v => ({ 
                      ...v, 
                      mode: m, 
                      id: null, 
                      search: '' 
                    })) 
                  } 
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${ 
                    s.mode === m 
                      ? 'bg-white shadow-md text-blue-600' 
                      : 'text-slate-400' 
                  }`} 
                > 
                  {m} 
                </button> 
              )) 
            } 
 
          </div> 
 
        </header> 
 
        { 
          s.mode === 'RENEWAL' && ( 
            <Card className="p-6 rounded-3xl border-2 border-blue-600/20 bg-blue-50/30"> 
 
              <div className="flex flex-col md:flex-row gap-4 items-end"> 
 
                <div className="flex-1 space-y-1"> 
 
                  <Label className="text-[10px] font-black uppercase text-blue-600"> 
                    Registration ID 
                  </Label> 
 
                  <div className="relative"> 
 
                    <Search 
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" 
                      size={16} 
                    /> 
 
                    <Input 
                      value={s.search} 
                      onChange={e => 
                        setS(v => ({ 
                          ...v, 
                          search: e.target.value 
                        }))
                      } 
                      className="h-12 pl-10 font-black uppercase tracking-widest" 
                      placeholder="E.G. RM-00001" 
                    /> 
 
                  </div> 
 
                </div> 
 
                <Button 
                  onClick={handleRenewalSearch} 
                  className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-xl uppercase text-xs" 
                > 
                  Search 
                </Button> 
 
              </div> 
 
            </Card> 
          ) 
        } 
 
       
        <div 
          className={`grid lg:grid-cols-12 gap-6 transition-opacity ${ 
            s.mode === 'RENEWAL' && !s.id 
              ? 'opacity-40 pointer-events-none' 
              : 'opacity-100' 
          }`} 
        > 
 
          <div className="lg:col-span-8 space-y-6"> 
 
            <Card className="p-6 rounded-3xl shadow-lg space-y-4"> 
 
              <div className="grid grid-cols-12 gap-4"> 
 
                <div className="col-span-4 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400"> 
                    First Name 
                  </Label> 
 
                  <Input 
                    value={f.ownerFirstName} 
                    onChange={e => 
                      up('ownerFirstName', e.target.value)
                    } 
                    className="h-10 text-sm font-black uppercase" 
                    placeholder="FIRST NAME" 
                  /> 
                </div> 
 
                <div className="col-span-4 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400"> 
                    Middle Name 
                  </Label> 
 
                  <div className="relative"> 
 
                    <Input 
                      list="middle-name-options" 
                      value={f.ownerMiddleName} 
                      onChange={e => 
                        up('ownerMiddleName', e.target.value)
                      } 
                      className="w-full h-10 px-3 pr-10 border rounded-md text-sm font-black uppercase bg-white" 
                      placeholder="MIDDLE NAME" 
                    /> 
 
                    <datalist id="middle-name-options"> 
                      <option value="-" /> 
                    </datalist> 
 
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
                  <Label className="text-[8px] font-black uppercase text-slate-400"> 
                    Last Name 
                  </Label> 
 
                  <Input 
                    value={f.ownerLastName} 
                    onChange={e => 
                      up('ownerLastName', e.target.value)
                    } 
                    className="h-10 text-sm font-black uppercase" 
                    placeholder="LAST NAME" 
                  /> 
                </div> 
 
                <div className="col-span-1 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400"> 
                    Suffix 
                  </Label> 
 
                  <select 
                    value={f.ownerSuffix} 
                    onChange={e => 
                      up('ownerSuffix', e.target.value)
                    } 
                    className="w-full h-10 px-1 bg-white border rounded-md text-[10px] font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" 
                  > 
 
                    { 
                      SUFFIXES.map(sfx => ( 
                        <option 
                          key={sfx || 'none'} 
                          value={sfx}
                        > 
                          {sfx || '—'} 
                        </option> 
                      )) 
                    } 
 
                  </select> 
 
                </div> 
 
              </div> 
 
              <div className="grid grid-cols-12 gap-4"> 
 
                <div className="col-span-7 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400"> 
                    Full Name Preview 
                  </Label> 
 
                  <div className="h-10 flex items-center px-3 bg-slate-50 border rounded-md text-sm font-black uppercase text-slate-700 truncate"> 
                    {ownerFullName || '—'} 
                  </div> 
                </div> 
 
                <div className="col-span-2 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400"> 
                    Age 
                  </Label> 
 
                  <Input 
                    value={f.ownerAge} 
                    onChange={e => 
                      up('ownerAge', e.target.value)
                    } 
                    className="h-10 text-sm font-black text-center" 
                    placeholder="18+" 
                  /> 
                </div> 
 
                <div className="col-span-3 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400"> 
                    CP Number 
                  </Label> 
 
                  <Input 
                    value={f.phone} 
                    onChange={e => 
                      up('phone', e.target.value)
                    } 
                    className="h-10 text-sm font-mono" 
                    placeholder="09XXXXXXXXX" 
                    inputMode="numeric" 
                    maxLength={11} 
                  /> 
                </div> 
 
              </div> 
 
              <div className="grid grid-cols-12 gap-4 border-t pt-4"> 
 
                <div className="col-span-4 space-y-1"> 
                  <Label className="text-[8px] font-black uppercase text-slate-400"> 
                    Sitio 
                  </Label> 
 
                  <Input 
                    value={f.sitio} 
                    onChange={e => 
                      up('sitio', e.target.value)
                    } 
                    className="h-10 text-sm font-black uppercase" 
                  /> 
                </div> 
 
                <div className="col-span-8 space-y-1"> 
 
                  <Label 
                    htmlFor="barangay-select" 
                    className="text-[8px] font-black uppercase text-slate-400"
                  > 
                    Barangay 
                  </Label> 
 
                  <select 
                    id="barangay-select" 
                    value={f.barangay} 
                    onChange={e => 
                      up('barangay', e.target.value)
                    } 
                    className="w-full h-10 px-4 bg-white border rounded-md text-sm font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" 
                  > 
 
                    <option value="">Select Barangay</option> 
 
                    { 
                      BARANGAYS.map(b => ( 
                        <option 
                          key={b} 
                          value={b.toUpperCase()}
                        > 
                          {b} 
                        </option> 
                      )) 
                    } 
 
                  </select> 
 
                </div> 
 
              </div> 

              <div className="space-y-1 border-t pt-4">
                <Label className="text-[8px] font-black uppercase text-slate-400">
                  Vessel Name
                </Label>

                <Input
                  value={f.vesselName}
                  onChange={e =>
                    up('vesselName', e.target.value)
                  }
                  className="h-10 text-sm font-black uppercase"
                  placeholder="VESSEL NAME OR ASSET NAME"
                />
              </div>


 
            </Card> 
 
            {/* CATEGORY TABS */} 
            <Tabs 
              value={f.assetCategory} 
              onValueChange={v => { 
                up('assetCategory', v); 
 
                if (v !== 'payao') { 
                  setF(prev => ({ 
                    ...prev, 
                    payaoVesselName: '', 
                    payaoNumbers: '' 
                  })); 
                } 
              }} 
            > 
 
              <TabsList className="w-full bg-slate-200/60 backdrop-blur-md p-1.5 h-14 flex gap-1.5 rounded-2xl mb-4 shadow-inner border border-slate-200/80"> 
 
                { 
                  ['vessel', 'pangulong', 'payao', 'gears'].map(t => ( 
                    <TabsTrigger 
                      key={t} 
                      value={t} 
                      className="flex-1 text-[10px] font-extrabold tracking-wider uppercase rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 text-slate-500 hover:text-slate-800 hover:bg-white/50 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:shadow-slate-200/50 active:scale-[0.98]" 
                    > 
 
                      {t === 'vessel' && ( 
                        <Ship 
                          size={15} 
                          className="mr-1.5 shrink-0 transition-transform duration-200" 
                        /> 
                      )} 
 
                      {t === 'payao' && ( 
                        <Anchor 
                          size={15} 
                          className="mr-1.5 shrink-0 transition-transform duration-200" 
                        /> 
                      )} 
 
                      <span className="truncate"> 
                        {t === 'gears' ? 'fishing gear' : t} 
                      </span> 
 
                    </TabsTrigger> 
                  )) 
                } 
 
              </TabsList> 
 
 
              {/* FISHING GEAR */} 
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
                        onChange={e => 
                          up('unitCount', e.target.value)
                        } 
                        className="h-10 font-black" 
                      /> 
 
                    </div> 
 
                    <div className="space-y-1"> 
 
                      <Label className="text-[8px] font-black uppercase text-slate-500"> 
                        Units in Words 
                      </Label> 
 
                      <Input 
                        readOnly 
                        value={formatGearUnits( 
                          f.unitCount, 
                          f.gearType || 'FISHING GEAR'
                        )} 
                        className="h-10 font-black bg-white" 
                        placeholder="ONE (1) UNIT FISH JIGGING" 
                      /> 
 
                    </div> 
 
                  </div> 
 
                  <RadioGroup 
                    value={f.gearType} 
                    onValueChange={v => up('gearType', v)} 
                    className="grid grid-cols-2 gap-3" 
                  > 
 
                    { 
                      GEARS.map(g => ( 
                        <label 
                          key={g} 
                          className={`p-4 border-2 rounded-2xl flex justify-between items-center cursor-pointer transition-all ${ 
                            f.gearType === g 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                              : 'bg-white border-slate-100 text-slate-600' 
                          }`} 
                        > 
 
                          <span className="text-[10px] font-black uppercase leading-tight"> 
                            {g} 
                          </span> 
 
                          <RadioGroupItem 
                            value={g} 
                            className="sr-only" 
                          /> 
 
                        </label> 
                      )) 
                    } 
 
                  </RadioGroup> 
 
                  { 
                    f.gearType && ( 
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black uppercase text-blue-900"> 
                        {formatGearUnits( 
                          f.unitCount, 
                          f.gearType
                        )} 
                      </div> 
                    ) 
                  } 
 
                </Card> 
 
              </TabsContent> 
 
 
              {/* NON-GEAR CATEGORIES */} 
              { 
                f.assetCategory !== 'gears' && ( 
 
                  <Card className="p-6 rounded-3xl space-y-6 border-slate-100"> 
 
                    { 
                      (f.assetCategory === 'pangulong' || f.assetCategory === 'payao') && ( 
 
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
                                onChange={e => 
                                  up('unitCount', e.target.value)
                                } 
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
 
                          { 
                            f.assetCategory === 'pangulong' && ( 
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black uppercase text-blue-900"> 
                                {formatPangulongUnits(f.unitCount) || 'ENTER UNIT COUNT'} 
                              </div> 
                            ) 
                          } 
 
                          { 
                            f.assetCategory === 'payao' && ( 
 
                              <div className="space-y-3"> 
 
                                <div className="space-y-1"> 
 
                                  <Label className="text-[8px] font-black uppercase text-slate-500"> 
                                    Vessel / Boat Number(s) 
                                  </Label> 
 
                                  <Input 
                                    value={f.payaoNumbers} 
                                    onChange={e => 
                                      up('payaoNumbers', e.target.value)
                                    } 
                                    placeholder="99, 100, 101, 102, 103, 104" 
                                    className="h-10 font-black" 
                                  /> 
 
                                </div> 
 
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-black uppercase text-blue-900 whitespace-pre-line"> 
                                  { 
                                    formatPayaoDisplay( 
                                      f.unitCount, 
                                      f.payaoVesselName || f.vesselName, 
                                      f.payaoNumbers
                                    ) || 
                                    'ENTER UNIT COUNT' 
                                  } 
                                </div> 
 
                              </div> 
                            ) 
                          } 
 
                        </div> 
                      ) 
                    } 
 
                    <div className="space-y-1"> 
 
                      <Label className="text-[8px] uppercase text-slate-400"> 
                        Propulsion 
                      </Label> 
 
                      { 
                        f.assetCategory === 'vessel' 
                          ? ( 
 
                            <RadioGroup 
                              value={f.vesselType} 
                              onValueChange={(v: any) => 
                                up('vesselType', v)
                              } 
                              className="flex gap-2" 
                            > 
 
                              { 
                                ['motorized', 'non-motorized'].map(m => ( 
 
                                  <label 
                                    key={m} 
                                    className={`flex-1 p-2 border rounded-lg text-center cursor-pointer transition-all ${ 
                                      f.vesselType === m 
                                        ? 'bg-blue-600 border-blue-600 text-white' 
                                        : 'bg-white' 
                                    }`} 
                                  > 
 
                                    <span className="text-[8px] font-black uppercase tracking-tight"> 
                                      {m} 
                                    </span> 
 
                                    <RadioGroupItem 
                                      value={m} 
                                      className="sr-only" 
                                    /> 
 
                                  </label> 
 
                                )) 
                              } 
 
                            </RadioGroup> 
 
                          ) 
                          : ( 
 
                            <div className="p-2 bg-slate-50 text-[9px] font-bold text-slate-400 rounded-lg border border-dashed uppercase"> 
                              Propulsion N/A 
                            </div> 
 
                          ) 
                      } 
 
                    </div> 
 
                    { 
                      f.assetCategory === 'vessel' && ( 
 
                        <> 
 
                          <div className="space-y-2"> 
 
                            <Label>Place of Built</Label> 
 
                            <Input 
                              value={f.placeOfBuilt} 
                              onChange={e => 
                                up('placeOfBuilt', e.target.value)
                              } 
                              placeholder="Place of Built" 
                            /> 
 
                          </div> 
 
                          <div className="space-y-2"> 
 
                            <Label>Year Built</Label> 
 
                            <Input 
                              type="number" 
                              value={f.yearBuilt} 
                              onChange={e => 
                                up('yearBuilt', e.target.value)
                              } 
                              placeholder="Year Built" 
                            /> 
 
                          </div> 
 
                          {f.assetCategory === 'vessel' && f.vesselType === 'motorized' && (
  <div className="col-span-full flex justify-center">
    <div className="grid grid-cols-2 gap-12 text-center">
      
      {/* Gross Tonnage */}
      <div>
        <p className="text-[9px] font-black uppercase text-blue-500 mb-1">
          Gross Tonnage
        </p>

        <p className="text-3xl font-black text-slate-900 italic tracking-tighter">
          {f.grossTonnage}
          <span className="text-[10px] not-italic text-slate-400">
            {' '}GT
          </span>
        </p>
      </div>

      {/* Net Tonnage */}
      <div>
        <p className="text-[9px] font-black uppercase text-blue-500 mb-1">
          Net Tonnage
        </p>

        <p className="text-3xl font-black text-slate-900 italic tracking-tighter">
          {f.netTonnage}
          <span className="text-[10px] not-italic text-slate-400">
            {' '}NT
          </span>
        </p>
      </div>

    </div>
  </div>
)}
                          <div className="p-4 bg-slate-50/80 rounded-2xl grid grid-cols-3 gap-3 mt-4"> 
 
                            { 
                              ['length', 'width', 'depth'].map(d => ( 
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
                                    onChange={e => 
                                      up(d, e.target.value)
                                    } 
                                    className="h-10 w-full text-center text-base font-black text-black bg-slate-50 border border-black rounded-lg focus-visible:ring-2 focus-visible:ring-black focus-visible:border-black transition-all" 
                                  /> 
 
                                </div> 
                              )) 
                            } 
 
                          </div> 
 
                        </> 
                      ) 
                    } 
 
                  </Card> 
                ) 
              } 
 
            </Tabs> 
 
          </div> 
 
 
          {/* RIGHT */} 
          <div className="lg:col-span-4 space-y-4"> 
 
            { 
              errs.length > 0 && ( 
 
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2"> 
 
                  <p className="text-[10px] font-black text-red-500 uppercase"> 
                    Attention Required: 
                  </p> 
 
                  <ul className="text-[8px] font-bold text-red-400 uppercase list-disc list-inside"> 
 
                    { 
                      errs.map((e, i) => 
                        <li key={i}>{e}</li>
                      ) 
                    } 
 
                  </ul> 
 
                </div> 
              ) 
            } 
 
 
            {/* DOCUMENT SCANS */} 
            <div className="space-y-3"> 
 
              <div className="flex items-center gap-2 border-b-2 border-black pb-2"> 
 
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" /> 
 
                <p className="text-[10px] font-black uppercase tracking-wider text-black"> 
                  Document Scans 
                </p> 
 
              </div> 
 
              <div className="space-y-2"> 
 
                { 
                  activeDocKeys.map(key => { 
 
                    
                    const fileUrl = f.requirements[key]; 
 
                    return ( 
 
                      <div key={key} className="space-y-1"> 
 
                        <Label className="text-[9px] font-black uppercase text-slate-500"> 
                          {DOC_LABELS[key] || key} 
                        </Label> 
 
                        { 
                          fileUrl ? ( 
 
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
                                    onChange={e => 
                                      processFile(e, key)
                                    } 
                                    className="hidden" 
                                    accept="image/*" 
                                  /> 
 
                                </label> 
 
                                <button 
                                  onClick={() => 
                                    handleRequirementChange(key, null)
                                  } 
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
                                onChange={e => 
                                  processFile(e, key)
                                } 
                                className="hidden" 
                                accept="image/*" 
                              /> 
 
                            </label> 
 
                          ) 
                        } 
 
                      </div> 
                    ); 
                  }) 
                } 
 
              </div> 
 
            </div> 
 
 
            {/* SUBMIT */} 
           <Button
  disabled={
    errs.length > 0 ||
    s.proc === 1 ||
    s.isPreparingReceipt
  }
  onClick={handleOpenReceipt}
  className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xs uppercase rounded-2xl tracking-widest shadow-xl shadow-blue-500/20"
>
  {
    s.isPreparingReceipt
      ? 'Preparing Receipt...'
      : 'Review & Submit'
  }
</Button>
 
          </div> 
 
        </div> 
 
      </main> 
 
    </div> 
  ); 
}