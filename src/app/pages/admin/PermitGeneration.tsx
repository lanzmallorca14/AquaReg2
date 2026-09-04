import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';
import { 
  Ship, Search, ChevronRight, ArrowLeft, Anchor, 
  Edit3, Lock, CheckCircle2, Waves, FileText, Settings2, Check, Trash2
} from 'lucide-react';
import { useAquaData } from '../../components/context/AquaRegCONTEXT';
import {supabase} from '../../../supabaseClient'
import { aquaOfflineDB } from '../../../offline/db';
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";


type SubType = 'MOTORIZED' | 'NON-MOTORIZED' | 'PANGULONG' | 'FISHING GEAR' | 'PAYAO/BALSA';

interface VesselDataState {
  registrationId: string;
  vesselName: string;
  ownerName: string;
  orNumber: string;
  barangay: string;
  sitio: string;
  address: string;
  phone: string;
  sealUrl: string;
  status: string;
  length: string;
  breadth: string;
  depth: string;
  numberOfBoats: string;
  grossTonnage: string;
  netTonnage: string;
  engineMake: string;
  serialNumber: string;
  certificateNo: string;
  horsePower: string;
  officialNo: string;
  boatName: string;
  paymentDate: string;
  issuedFullDate: string;
  gearCategory: string;
  boat_builder_no: string;
  unitsInWords: string;
  units?: string;
  permitFee?: string;
  yearBuilt: string;
  placeOfBuilt: string;
}

const numberToWords = (num: number): string => {
  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN"
  ];

  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY"
  ];

  if (num < 20) return ones[num];

  if (num < 100) {
    return (
      tens[Math.floor(num / 10)] +
      (num % 10 ? "-" + ones[num % 10] : "")
    );
  }

  if (num < 1000) {
    return (
      ones[Math.floor(num / 100)] +
      " HUNDRED" +
      (num % 100 ? " " + numberToWords(num % 100) : "")
    );
  }

  if (num < 1000000) {
    return (
      numberToWords(Math.floor(num / 1000)) +
      " THOUSAND" +
      (num % 1000 ? " " + numberToWords(num % 1000) : "")
    );
  }

  return num.toString();
};



  

const formatMoney = (value:string) => {
  const number = Number(value.replace(/,/g, ""));
  if (Number.isNaN(number)) return "";
  return number.toLocaleString("en-US");
};

export default function ManualPermitPortal() {
  const { vesselId } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation(); 
  const { Vessels = [], updateVessel } = useAquaData() || { Vessels: [], updateVessel: async () => false}; 
  const [isModalOpen, setIsModalOpen] = useState(false);
const handleDeletePermit = async () => {
  if (!vesselId) return;

  if (!window.confirm("Are you sure you want to delete this vessel card?")) {
    return;
  }

  try {
    const id = String(vesselId);

    // Only hide the card locally.
    // DO NOT delete/update anything in Supabase.
    setHiddenCards(prev => {
      const updated = [...new Set([...prev, id])];

      localStorage.setItem(
        "permit_portal_hidden_cards",
        JSON.stringify(updated)
      );

      return updated;
    });

    toast.success("Vessel card removed from the Permit Portal.");

    navigate("/admin/permit-portal", {
      replace: true
    });

  } catch (error) {
    console.error("Failed to hide vessel card:", error);
    toast.error("Failed to remove vessel card.");
  }
};
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [tempOrNumber, setTempOrNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditable, setIsEditable] = useState(false);
  const [permits, setPermits] = useState<any[]>([]);
  const [subType, setSubType] = useState<SubType>('MOTORIZED');
  const [coiRecords, setCoiRecords] = useState<any[]>([]);
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
 

  const expirationDate = "DECEMBER 31, 2026";

  useEffect(() => {
  const loadPermits = async () => {

    try {

      let permitData = [];

      if (navigator.onLine) {

        const { data, error } = await supabase
          .from("permit_management")
          .select("*");

        if(error) throw error;

        permitData = data || [];


        // SAVE ONLINE DATA TO OFFLINE DB
        const db = await aquaOfflineDB;

        for(const permit of permitData){

          await db.put(
            "permit_management",
            {
              ...permit,
              sync_status:"synced"
            }
          );

        }


      } else {

        const db = await aquaOfflineDB;

        permitData = await db.getAll(
          "permit_management"
        );

      }


      setPermits(permitData);


    } catch(err){

      console.error(
        "PERMIT LOAD ERROR:",
        err
      );

    }

  };


  loadPermits();


},[]);


useEffect(() => {

  const loadCOI = async () => {

    try {

      const { data, error } = await supabase
        .from("COI")
        .select("*");

      if(error) throw error;

      setCoiRecords(data || []);

    } catch(err){
      console.error("COI LOAD ERROR:", err);
    }

  };


  loadCOI();

},[]);





  const autoVessel = useMemo(() => Vessels.find(v => String(v?.id) === String(vesselId)), [Vessels, vesselId]);
   
const verifiedList = useMemo(
  () => [
    // Get verified vessels from Vessels table
    ...Vessels.filter(
      v =>
        ["PASSED", "REGISTERED"].includes(
          String(v?.status || "").toUpperCase()
        )
    ),

    // Get existing permits from permit_management table
    ...permits.filter(
      p =>
        ["REGISTERED", "PASSED"].includes(
          String(p?.status || "").toUpperCase()
        )
    )
  ].filter(item => {
    const id = String(
      (item as any).asset_id ||
      (item as any).id ||
      ""
    );

    return !hiddenCards.includes(id);
  }),
  [Vessels, permits, hiddenCards]
);

useEffect(() => {
  try {
    const saved = localStorage.getItem("permit_portal_hidden_cards");

    if (saved) {
      setHiddenCards(JSON.parse(saved));
    }
  } catch (error) {
    console.error("Failed to load hidden cards:", error);
  }
}, []);
 
  const generateCertificateNo = async () => {
    const year = new Date().getFullYear().toString().slice(-2); // "26" for 2026

    const { data, error } = await supabase
      .from("permit_management")
      .select("certificate_no")
      .like("certificate_no", `${year}-%`);

    if (error) {
      console.error(error);
      return `${year}-0001`;
    }

    const numbers = data
      ?.map(v => Number(String(v.certificate_no).split("-")[1]))
      .filter(n => !isNaN(n)) || [];

    const next = numbers.length ? Math.max(...numbers) + 1 : 1;
    return `${year}-${String(next).padStart(4, "0")}`;
  };

 
  const [data, setData] = useState<VesselDataState>({
  registrationId: '',
  certificateNo: '',
  vesselName: '',
  ownerName: '',
  orNumber: '',
  barangay: '',
  sitio: 'N/A',
  address: 'N/A',
  phone: '+639',
  status: 'Pending',
  length: '0.00',
  breadth: '0.00',
  depth: '0.00',
  grossTonnage: '0.00',
  netTonnage: '0.00',

  // IMPORTANT: don't use fake defaults here
  engineMake: '',
  serialNumber: '',
  horsePower: '',

  officialNo: '',
  paymentDate: '',
  issuedFullDate: '',
  unitsInWords: '',
  gearCategory: '',
  boatName: '',
  numberOfBoats: '',
  boat_builder_no: '',
  yearBuilt: '',
  placeOfBuilt: '',
  sealUrl: '',
  permitFee: ''
});


/* ============================================================
   PUT THE NEW USEEFFECT HERE
   ============================================================ */

useEffect(() => {
  if (!autoVessel || isEditable) return;

  const vesselRecord = autoVessel as unknown as Record<string, unknown>;
  const vesselIdString = String(vesselRecord.id || vesselId || "");

  const coi = coiRecords.find(
    c => String(c.vessel_id) === vesselIdString
  );

  const permit = permits.find(
    p =>
      String(p.asset_id) === vesselIdString ||
      String(p.vessel_id) === vesselIdString
  );

  console.log("========== PERMIT PORTAL DATA ==========");
  console.log("VESSEL:", vesselRecord);
  console.log("COI:", coi);
  console.log("PERMIT:", permit);
  console.log("========================================");

  const initialOr = String(
    location.state?.orNumber ||
    coi?.or_number ||
    permit?.or_number ||
    vesselRecord.or_number ||
    ""
  );

  const assetCat = String(
    vesselRecord.asset_category ||
    vesselRecord.type ||
    ""
  ).toUpperCase();

  const gearType = String(
    vesselRecord.gear_type || ""
  ).toUpperCase();

  let detectedType: SubType = "MOTORIZED";

  if (
    assetCat.includes("PANGULONG") ||
    gearType.includes("PANGULONG")
  ) {
    detectedType = "PANGULONG";
  } else if (
    assetCat.includes("PAYAO") ||
    assetCat.includes("BALSA")
  ) {
    detectedType = "PAYAO/BALSA";
  } else if (
    assetCat.includes("GEAR") ||
    assetCat.includes("FISHING")
  ) {
    detectedType = "FISHING GEAR";
  } else if (Boolean(vesselRecord.is_motorized)) {
    detectedType = "MOTORIZED";
  } else {
    detectedType = "NON-MOTORIZED";
  }

  setSubType(detectedType);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const engineMake = String(
    coi?.engine_make ??
    permit?.engine_Make ??
    permit?.engine_make ??
    vesselRecord.engine_make ??
    "N/A"
  );

  const serialNumber = String(
    coi?.engine_serial ??
    permit?.serialNumber ??
    permit?.engine_serial ??
    vesselRecord.engine_serial ??
    "N/A"
  );

  const horsePower = String(
    coi?.engine_hp ??
    permit?.horsePower ??
    permit?.engine_hp ??
    vesselRecord.engine_hp ??
    "N/A"
  );

  const boatBuilderNo = String(
    coi?.boat_builder_no ??
    coi?.number_of_boat_builder ??
    permit?.boat_builder_no ??
    vesselRecord.boat_builder_no ??
    "1"
  );

  const permitFee = String(
    permit?.permit_fee ??
    vesselRecord.permit_fee ??
    vesselRecord.permitFee ??
    "0.00"
  );

  const yearBuilt = String(
    coi?.year_built ??
    permit?.year_built ??
    vesselRecord.year_built ??
    ""
  );

  const placeBuilt = String(
    coi?.place_built ??
    permit?.place_built ??
    vesselRecord.place_built ??
    ""
  );

  setData({
    registrationId: String(vesselRecord.id || ""),

    certificateNo: String(
      permit?.certificate_no ??
      vesselRecord.certificate_no ??
      ""
    ),

   vesselName:
  detectedType === "PAYAO/BALSA"
    ? String(
        vesselRecord.payao_vessel_name ||
        vesselRecord.vessel_name ||
        ""
      ).toUpperCase()
    : detectedType === "FISHING GEAR"
      ? String(
          vesselRecord.gear_type ||
          vesselRecord.vessel_name ||
          "FISHING GEAR"
        ).toUpperCase()
      : String(
          vesselRecord.vessel_name ||
          "UNNAMED"
        ).toUpperCase(),

    ownerName: String(
      vesselRecord.owner_name ||
      permit?.owner_name ||
      "UNKNOWN"
    ).toUpperCase(),

    barangay: String(
      vesselRecord.barangay || "N/A"
    ).toUpperCase(),

    sitio: String(
      vesselRecord.sitio || "N/A"
    ).toUpperCase(),

    address: String(
      vesselRecord.address || "N/A"
    ).toUpperCase(),

    phone: String(
      vesselRecord.phone ||
      vesselRecord.cp_number ||
      ""
    ),

    status: String(
      vesselRecord.status ||
      permit?.status ||
      "Pending"
    ),

    orNumber: initialOr,

    permitFee,

    yearBuilt: yearBuilt.toUpperCase(),

    placeOfBuilt: placeBuilt.toUpperCase(),

    boatName: String(
  vesselRecord.payao_numbers ||
  vesselRecord.boat_name ||
  permit?.boat_name ||
  ""
).toUpperCase(),

    unitsInWords: String(
      vesselRecord.units_in_words ||
      permit?.units_in_words ||
      ""
    ).toUpperCase(),

    length: String(
      vesselRecord.hull_length || "0"
    ),

    breadth: String(
      vesselRecord.hull_width || "0"
    ),

    numberOfBoats: String(
  vesselRecord.number_of_boats || 
  permit?.number_of_boats ||
  ""
),

    depth: String(
      vesselRecord.hull_depth || "0"
    ),

    sealUrl: String(
      vesselRecord.seal_url || ""
    ),

    grossTonnage: String(
      vesselRecord.tonnage_gross || "0"
    ),

    netTonnage: String(
      vesselRecord.tonnage_net || "0"
    ),

    engineMake: engineMake.toUpperCase(),

    serialNumber: serialNumber.toUpperCase(),

    horsePower: horsePower.toUpperCase(),

    boat_builder_no: boatBuilderNo.toUpperCase(),

    officialNo: String(
      permit?.official_no ??
      vesselRecord.registration_no ??
      vesselRecord.official_no ??
      vesselRecord.id ??
      ""
    ),

    paymentDate: today,

    issuedFullDate: today,

    gearCategory: String(
      vesselRecord.gear_type ||
      "JIGGING"
    ).toUpperCase(),
  });

}, [
  autoVessel,
  coiRecords,
  permits,
  isEditable,
  location.state,
  vesselId
]);

  const isCOIValidated = (vessel:any) => {

  const coi = coiRecords.find(
    c => String(c.vessel_id) === String(vessel.id)
  );


  if(!coi){
    return false;
  }


  return (
    String(coi.status).toUpperCase() === "PASSED" &&
    Boolean(coi.or_number) &&
    Boolean(coi.inspected_by)
  );

};

const handleOpenModal = (id: string) => {
  const selected = Vessels.find(v => String(v.id) === String(id));

  if (!selected) return;

  const assetCat = String(
    selected.asset_category || selected.type || ''
  ).toUpperCase();

  const isVessel =
    assetCat.includes("VESSEL") ||
    assetCat.includes("MOTORIZED") ||
    assetCat.includes("NON-MOTORIZED");

  // VESSEL: use COI OR number only
  if (isVessel) {


  // REQUIRE VERIFIED COI
  if (!isCOIValidated(selected)) {

    toast.error(
      "Certificate of Inspection must be submitted, verified and passed before permit issuance."
    );

    return;
  }


  const coi = coiRecords.find(
  c => String(c.vessel_id) === String(selected.id)
);


navigate(`/admin/permit-portal/${id}`, {

  state:{
    orNumber: coi.or_number,
    lockedOR:true
  }

});

  return;
}


  // OTHER ASSETS: manual OR entry
  setSelectedVesselId(id);
  setTempOrNumber("");
  setIsModalOpen(true);
};
  const handleConfirmOr = () => {
    if (!tempOrNumber.trim()) return toast.error("Please enter an OR Number.");
    setIsModalOpen(false);
    navigate(`/admin/permit-portal/${selectedVesselId}`, { state: { orNumber: tempOrNumber } });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;

  setData(prev => ({
    ...prev,
    [name]: value.toUpperCase(),
  }));
};

const handleFinishEdit = async () => {
  try {
    if (!vesselId) return;

    await updateVessel(vesselId, {
      boat_name: data.boatName,
      number_of_boats: data.numberOfBoats,
      units_in_words: data.unitsInWords,

      permit_fee: String(
        Number(data.permitFee?.replace(/,/g, '') || 0)
      ),

      gear_type: data.gearCategory,
    });

    setIsEditable(false);

    toast.success("Terminal Synced");
  } catch (error) {
    console.error("SYNC ERROR:", error);
    toast.error("Failed to sync data");
  }
};



const handleExportWPS = async () => {
  const printElement = document.getElementById("permit-document");

  if (!printElement) {
    toast.error("Permit document not found.");
    return;
  }

  try {
    toast.loading("Preparing WPS document...", {
      id: "wps-export",
    });

    // ---------------------------------------------------------
    // 1. WAIT FOR FONTS
    // ---------------------------------------------------------
    if ("fonts" in document) {
      await document.fonts.ready;
    }

    // ---------------------------------------------------------
    // 2. WAIT FOR ALL IMAGES
    // ---------------------------------------------------------
    const images = Array.from(
      printElement.querySelectorAll("img")
    );

    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      })
    );

    // Allow browser layout to settle.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolve())
      )
    );

    // ---------------------------------------------------------
    // 3. GET THE ACTUAL RENDERED SIZE
    // ---------------------------------------------------------
    const rect = printElement.getBoundingClientRect();

    const renderedWidth = Math.round(rect.width);
    const renderedHeight = Math.round(rect.height);

    if (!renderedWidth || !renderedHeight) {
      throw new Error("Permit document has invalid dimensions.");
    }

    // ---------------------------------------------------------
    // 4. CAPTURE EXACTLY WHAT IS CURRENTLY DISPLAYED
    // ---------------------------------------------------------
    const canvas = await html2canvas(printElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,

      width: renderedWidth,
      height: renderedHeight,

      windowWidth: renderedWidth,
      windowHeight: renderedHeight,

      scrollX: 0,
      scrollY: 0,

      onclone: (clonedDocument) => {
        const clonedElement =
          clonedDocument.getElementById("permit-document");

        if (!clonedElement) return;

        // IMPORTANT:
        // Keep the exact dimensions of the displayed document.
        clonedElement.style.transform = "none";
        clonedElement.style.margin = "0";
        clonedElement.style.boxSizing = "border-box";
      },
    });

    // ---------------------------------------------------------
    // 5. DETERMINE PAPER SIZE
    // ---------------------------------------------------------
    const isCertificate = isVesselType;

    const pageWidth = isCertificate
      ? 215.9
      : 210;

    const pageHeight = isCertificate
      ? 355.6
      : 297;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [pageWidth, pageHeight],
      compress: true,
    });

    // ---------------------------------------------------------
    // 6. FIT IMAGE TO PAPER WITHOUT DISTORTION
    // ---------------------------------------------------------
    const canvasRatio = canvas.width / canvas.height;
    const pageRatio = pageWidth / pageHeight;

    let imageWidth: number;
    let imageHeight: number;

    if (canvasRatio > pageRatio) {
      // Wider than page
      imageWidth = pageWidth;
      imageHeight = imageWidth / canvasRatio;
    } else {
      // Taller than page
      imageHeight = pageHeight;
      imageWidth = imageHeight * canvasRatio;
    }

    const x = (pageWidth - imageWidth) / 2;
    const y = (pageHeight - imageHeight) / 2;

    // ---------------------------------------------------------
    // 7. ADD IMAGE
    // ---------------------------------------------------------
    const imageData = canvas.toDataURL(
      "image/jpeg",
      0.98
    );

    pdf.addImage(
      imageData,
      "JPEG",
      x,
      y,
      imageWidth,
      imageHeight,
      undefined,
      "FAST"
    );

    // ---------------------------------------------------------
    // 8. FILE NAME
    // ---------------------------------------------------------
    const fileName = isCertificate
      ? `Certificate-${data.certificateNo || data.registrationId || "Permit"}.pdf`
      : `Mayors-Permit-${data.officialNo || data.registrationId || "Permit"}.pdf`;

    pdf.save(fileName);

    toast.success("WPS/PDF exported successfully.", {
      id: "wps-export",
    });

  } catch (error) {
    console.error("WPS EXPORT ERROR:", error);

    toast.error("Failed to export permit.", {
      id: "wps-export",
    });
  }
};


const handleSavePermit = async () => {
  if (!vesselId) {
    toast.error("No vessel selected");
    return;
  }

  try {
    const category =
      subType === "MOTORIZED" ||
      subType === "NON-MOTORIZED"
        ? "VESSEL"
        : subType;

    // Check if permit already exists
    const { data: existingPermits, error: fetchError } =
      await supabase
        .from("permit_management")
        .select("id, certificate_no")
        .eq("asset_id", vesselId);

    if (fetchError) throw fetchError;

    let certificateNo: string;
    let permitId: string;

    if (existingPermits && existingPermits.length > 0) {
      permitId = existingPermits[0].id;

      certificateNo =
        existingPermits[0].certificate_no ||
        await generateCertificateNo();
    } else {
      certificateNo = await generateCertificateNo();

      const { data: generatedPermitId, error: rpcError } =
        await supabase.rpc("generate_romblon_permit_id");

      if (rpcError) throw rpcError;

      permitId = generatedPermitId;
    }

    const officialNo = String(
      autoVessel?.registration_no ||
      autoVessel?.id ||
      ""
    );

    const { data: permitNo, error: permitNoError } =
      await supabase.rpc("generate_permit_number", {
        asset_type: category
      });

    if (permitNoError) throw permitNoError;

    const permitPayload = {
      id: permitId,
      asset_id: vesselId,

      certificate_no: certificateNo,

      asset_category: category,

      permit_no:
        permitNo ||
        certificateNo,

      official_no: officialNo,

      vessel_name: data.vesselName,

      owner_name: data.ownerName,

      or_number: data.orNumber,

      engine_Make: data.engineMake,

      horsePower: data.horsePower,

      serialNumber: data.serialNumber,

      year_built: data.yearBuilt,

      place_built: data.placeOfBuilt,

      boat_builder_no: data.boat_builder_no,

      permit_fee: Number(
        (data.permitFee || "0").replace(/,/g, "")
      ),

      // SOURCE OF TRUTH FROM NEW REGISTRATION
      units_in_words:
        data.unitsInWords || null,

      number_of_boats:
        data.numberOfBoats || null,

      expiration_date: "2026-12-31",
    };

    const { error } = await supabase
      .from("permit_management")
      .upsert(
        permitPayload,
        {
          onConflict: "id"
        }
      );

    if (error) throw error;

    await updateVessel(vesselId, {
      status: "REGISTERED",

      or_number:
        data.orNumber,

      official_no:
        officialNo,

      certificate_no:
        certificateNo,
    });

    setData(prev => ({
      ...prev,

      certificateNo,

      officialNo,
    }));

    toast.success(
      "Permit Saved Successfully"
    );

  } catch (err) {

    console.error(
      "SAVE PERMIT ERROR:",
      err
    );

    toast.error(
      "Failed to save permit"
    );
  }
};


  const isVesselType = subType === 'MOTORIZED' || subType === 'NON-MOTORIZED';

  // --- RENDERING ROUTE A: DASHBOARD VIEW (NO ASSET SELECTED) ---
 if (!vesselId) {


  

    return (
      <div className="min-h-screen bg-slate-50 p-8 pt-12 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                <FileText className="text-blue-600" size={32} /> Issuance <span className="text-blue-600">Portal</span>
              </h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
                Select verified assets for final permit printing
              </p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Search owner or ID..." 
                className="pl-12 rounded-2xl border-slate-200 bg-white shadow-sm h-12 text-sm font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Grid List Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {verifiedList
              .filter((v) => {
                const query = searchQuery.toLowerCase();
                const record = v as unknown as Record<string, unknown>;
                const ownerValue = String(record.owner_name ?? record.owner ?? '').toLowerCase();
                const idValue = String(record.id ?? '').toLowerCase();
                return ownerValue.includes(query) || idValue.includes(query);
              })
            .map((item) => {

  const record = item as unknown as Record<string, unknown>;

  const assetCat = String(
    record.asset_category ||
    record.type ||
    ''
  ).toUpperCase();


  const ownerLabel = String(
    record.owner_name ||
    record.owner ||
    ''
  ).toUpperCase();


  const assetId = String(
    record.asset_id ||
    record.id ||
    ''
  );

                
                return (
                  <Card key={assetId} className="border-none rounded-[2rem] bg-white shadow-xl hover:shadow-2xl transition-all group overflow-hidden">
                    <div className="h-2 bg-blue-600 w-full" />
                    <CardContent className="p-8 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-slate-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {assetCat.includes('PAYAO') ? (
                            <Anchor size={20} />
                          ) : assetCat.includes('GEAR') ? (
                            <Waves size={20} />
                          ) : (
                            <Ship size={20} />
                          )}
                        </div>
                        <div className="bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase px-2 py-1 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Verified
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-black text-lg text-slate-900 truncate uppercase italic leading-tight">
                          {ownerLabel}
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          ID: {assetId}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={() => handleOpenModal(assetId)} 
                        className="w-full bg-slate-900 hover:bg-blue-600 text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-widest"
                      >
                        Open Terminal <ChevronRight size={14} className="ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>

        </div>

        
    {isModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl">

      <h2 className="text-2xl font-black text-center uppercase italic">
        Payment Auth
      </h2>

      <Input
        value={tempOrNumber}
        onChange={(e)=>setTempOrNumber(e.target.value)}
        placeholder="OR NO. 1234567"
        className="mt-5 h-14 text-center font-black"
      />

      <div className="space-y-2 mt-5">

        <Button 
          onClick={handleConfirmOr}
          className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs"
        >
          Confirm & Proceed
        </Button>

        <Button
          variant="outline"
          onClick={()=>setIsModalOpen(false)}
          className="w-full h-12 rounded-2xl font-black uppercase text-xs"
        >
          Cancel
        </Button>

      </div>

    </div>

  </div>
)}
    </div>
  );
}

// --- RENDERING ROUTE B: TERMINAL ISSUANCE EDITOR & CANVAS VIEW (ASSET SELECTED) ---
return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-8 space-y-8 shrink-0 print:hidden overflow-y-auto h-screen sticky top-0">
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/permit-portal')} 
            className="px-0 hover:bg-transparent text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest"
          >
            <ArrowLeft size={14} className="mr-2" /> Exit Terminal
          </Button>
          <h2 className="text-xl font-black text-slate-900 uppercase italic leading-none">
            Terminal <span className="text-blue-600">Config</span>
          </h2>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase text-slate-400">Configuration Mode</Label>
              <button 
                type="button"
                onClick={() => setIsEditable(!isEditable)} 
                className={`p-2 rounded-lg transition-all ${isEditable ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
              >
                {isEditable ? <Edit3 size={18}/> : <Lock size={18}/>}
              </button>
            </div>
            
            {isEditable ? (
  <div className="space-y-4 animate-in fade-in slide-in-from-left-2">

    {/* OFFICIAL RECEIPT */}
    <div className="space-y-1.5">
      <Label className="text-[9px] font-black uppercase ml-1">
        Official Receipt
      </Label>

    <Input 
  name="orNumber"
  value={data.orNumber}
  onChange={handleChange}
  disabled={isVesselType}
  className={`h-10 font-bold border-slate-200 ${
    isVesselType 
      ? "bg-slate-200 cursor-not-allowed" 
      : "bg-slate-50"
  }`}
/>

      {isVesselType && (
        <p className="text-[9px] text-blue-600 font-black uppercase">
          OR NUMBER FROM COI - LOCKED
        </p>
      )}
    </div>


 


{/* PERMIT FEE ONLY */}
{(
  subType === "FISHING GEAR" ||
  subType === "PANGULONG" ||
  subType === "PAYAO/BALSA"
) && (
  <div className="space-y-3 border-t pt-4">

    <Label className="text-[9px] font-black uppercase">
      Permit Fee (Php)
    </Label>

    <Input
  type="text"
  value={data.permitFee}
  onChange={(e) =>
    setData(prev => ({
      ...prev,
      permitFee: formatMoney(e.target.value)
    }))
  }
  placeholder="100,000,000"
/>

  </div>
)}




    {/* OFFICIAL NUMBER */}
    <div className="space-y-1.5 pb-4">

      <Label className="text-[9px] font-black uppercase ml-1">
        Official No.
      </Label>

      <Input 
        name="officialNo"
        value={data.officialNo}
        onChange={handleChange}
        className="h-10 font-bold bg-slate-50 border-slate-200"
      />

    </div>
   
   


    {/* FINISH */}
    <Button 
      onClick={handleFinishEdit}
      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg"
    >
      <Check size={16} className="mr-2" />
      Finish & Sync
    </Button>

  </div>
) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-2">
                <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <Lock size={18} />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-500">Fields Locked</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <Button
              onClick={handleSavePermit}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
            >
              Save Permit
            </Button>


           <Button
  type="button"
  onClick={handleExportWPS}
  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
>
  <FileText size={16} className="mr-2" />
  Export WPS / PDF
</Button>

            {/* NEW: DELETE BUTTON FOR CERTIFICATE / PERMIT */}
            <Button
              onClick={handleDeletePermit}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest shadow-md"
            >
              <Trash2 size={14} className="mr-2" /> Delete Certificate
            </Button>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 items-start mt-4">
              <Settings2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[9px] font-bold text-blue-900 leading-tight italic">
                PRINT GUIDE: Scale 100%, Layout Portrait, Headers/Footers Off.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* DOCUMENT PREVIEW AREA */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto flex justify-center bg-slate-200">
        <div className="shadow-2xl print:shadow-none transition-all duration-500 bg-white">
          {isVesselType ? (
        /* LAYOUT A: CERTIFICATE OF NUMBER */
<div 
  id="permit-document"
  className="bg-white text-black font-sans print:m-0 overflow-hidden flex flex-col justify-between"
  style={{
    width: '215.9mm',
    height: '355.6mm',
    padding: '8mm 12mm',
    boxSizing: 'border-box'
  }}
>
  {/* HEADER SECTION WITH SEAL */}
  <div className="flex items-center justify-center relative mb-3">
    <div className="absolute left-2 w-14 h-14 rounded-full border border-green-800 flex items-center justify-center bg-green-50 overflow-hidden print:hidden">
      <img
        src={data.sealUrl || ''}
        alt="Seal"
        className="w-full h-full object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
    <div className="text-center">
      <p className="text-[13px] font-medium leading-tight">Republic of the Philippines</p>
      <p className="text-[13px] font-medium leading-tight">Province of Romblon</p>
      <p className="text-[13px] font-medium leading-tight">Municipality of Romblon</p>
      <h1 className="text-[22px] font-black text-green-800 mt-1 uppercase tracking-tight italic">OFFICE OF THE MAYOR</h1>
    </div>
  </div>
  
  {/* MAIN CONTENT CONTAINER */}
  <div className="border-[3px] border-black w-full text-[11px] uppercase flex-1 flex flex-col justify-between">
    
    {/* HEADERS */}
    <div className="flex border-b-[2px] border-black">
      <div className="w-1/2 p-3.5 border-r-[2px] border-black text-center">
        <p className="font-bold border-b border-black/10 mb-1 text-[10px]">CERTIFICATE OF NUMBER</p>
        <p className="text-[22px] font-black">{data.certificateNo || 'N/A'}</p>
      </div>
      <div className="w-1/2 p-3.5 text-center">
        <p className="font-bold border-b border-black/10 mb-1 text-[10px]">OFFICIAL NO.</p>
        <p className="text-[22px] font-black">{data.officialNo || 'null'}</p>
      </div>
    </div>

    {/* VESSEL IDENTITY */}
    <div className="flex border-b-[2px] border-black">
      <div className="w-1/2 p-3.5 border-r-[2px] border-black bg-slate-50/50 print:bg-transparent flex flex-col justify-center">
        <p className="font-bold border-b border-black/10 mb-2 text-[10px]">NAME OF FISHING VESSEL</p>
        <p className="text-center text-[24px] font-black italic">"{data.vesselName || 'UNNAMED'}"</p>
      </div>
      <div className="w-1/4 p-3.5 border-r-[2px] border-black flex flex-col justify-center">
        <p className="font-bold border-b border-black/10 mb-2 text-[10px]">VESSEL TYPE</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-black flex items-center justify-center font-black text-[12px]">
              {(!data.horsePower || data.horsePower === 'N/A' || data.horsePower === '0') ? '✓' : ''}
            </div>
            <span className="text-[11px] font-bold">Non-motorized</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-black flex items-center justify-center font-black text-[12px]">
              {(data.horsePower && data.horsePower !== 'N/A' && data.horsePower !== '0') ? '✓' : ''}
            </div>
            <span className="text-[11px] font-bold">Motorized</span>
          </div>
        </div>
      </div>
      <div className="w-1/4 p-3.5 text-center bg-slate-50/50 print:bg-transparent flex flex-col justify-center">
        <p className="font-bold border-b border-black/10 mb-2 text-[10px]">HOMEPORT</p>
        <p className="text-[20px] font-black">ROMBLON</p>
      </div>
    </div>

    {/* OWNER SECTION */}
    <div className="p-6 text-center border-b-[2px] border-black leading-relaxed text-[15px] font-bold italic flex items-center justify-center">
      <span>
        THIS IS TO CERTIFY THAT Mr./Mrs. <span className="underline decoration-2 underline-offset-2 px-3 font-black">{data.ownerName || 'UNKNOWN'}</span> of barangay <span className="underline decoration-2 underline-offset-2 px-3 font-black">{data.barangay || 'N/A'}</span> Municipality of Romblon in the Province of Romblon is the OWNER/OPERATOR.
      </span>
    </div>

    {/* DIMENSIONS TABLE */}
    <div className="bg-white border-b-[2px] border-black">
      <p className="text-center font-black border-b-[2px] border-black p-2 text-[11.5px] bg-slate-50 print:bg-transparent">FISHING VESSEL DIMENSION AND TONNAGES</p>
      <div className="grid grid-cols-3 divide-x-[2px] divide-black text-center">
        <div className="p-2">
          <p className="border-b border-black/10 pb-1 text-[10px] font-bold">LENGTH (METERS)</p>
          <p className="py-2.5 text-[20px] font-black">{data.length || '0.00'}</p>
        </div>
        <div className="p-2">
          <p className="border-b border-black/10 pb-1 text-[10px] font-bold">BREADTH (METERS)</p>
          <p className="py-2.5 text-[20px] font-black">{data.breadth || '0.00'}</p>
        </div>
        <div className="p-2">
          <p className="border-b border-black/10 pb-1 text-[10px] font-bold">DEPTH (METERS)</p>
          <p className="py-2.5 text-[20px] font-black">{data.depth || '0.00'}</p>
        </div>
      </div>
      <div className="flex border-t-[2px] border-black font-black bg-slate-50/30 print:bg-transparent">
        <div className="w-1/2 border-r-[2px] border-black p-3 text-center">
          <p className="text-[10px] mb-1">GROSS TONNAGE</p>
          <p className="text-[21px]">{data.grossTonnage || '0.00'}</p>
        </div>
        <div className="w-1/2 p-3 text-center">
          <p className="text-[10px] mb-1">NET TONNAGE</p>
          <p className="text-[21px]">{data.netTonnage || '0.00'}</p>
        </div>
      </div>
    </div>

    {/* PROPULSION & METADATA SECTION */}
    <div className="bg-white border-b-[2px] border-black">
      <p className="text-center font-black border-b-[2px] border-black p-2 text-[11.5px] bg-slate-50 print:bg-transparent">PARTICULARS OF PROPULSION SYSTEM</p>
      <div className="grid grid-cols-3 divide-x-[2px] divide-black text-center font-bold">
        <div className="p-3"><p className="text-[10px] mb-1">ENGINE MAKE</p><p className="py-1 text-[16px] font-black">{data.engineMake || 'N/A'}</p></div>
        <div className="p-3"><p className="text-[10px] mb-1">SERIAL NUMBER</p><p className="py-1 text-[16px] font-black">{data.serialNumber || 'N/A'}</p></div>
        <div className="p-3"><p className="text-[10px] mb-1">HORSEPOWER</p><p className="py-1 text-[16px] font-black">{data.horsePower || 'N/A'}</p></div>
      </div>
      <div className="grid grid-cols-3 divide-x-[2px] divide-black text-center font-bold border-t-[2px] border-black bg-slate-50/30 print:bg-transparent">
        <div className="p-3"><p className="text-[10px] mb-1">NO. OF BOAT BUILDER</p><p className="py-1 text-[16px] font-black">{data.boat_builder_no || '1'}</p></div>
        <div className="p-3"><p className="text-[10px] mb-1">PLACE BUILT</p><p className="py-1 text-[16px] font-black">{data.placeOfBuilt || 'ROMBLON'}</p></div>
        <div className="p-3"><p className="text-[10px] mb-1">YEAR BUILT</p><p className="py-1 text-[16px] font-black">{data.yearBuilt || '2024'}</p></div>
      </div>
    </div>

    {/* REMARKS / COMPLIANCE TEXT & SIGNATURE */}
    <div className="bg-white p-5 flex-1 flex flex-col justify-between border-b-[2px] border-black">
      <div>
        <p className="text-center font-black border-b-[2px] border-black pb-1.5 mb-4 text-[11.5px] bg-slate-50 print:bg-transparent">REMARKS, FINDING AND RECOMMENDATIONS</p>
        <p className="text-[13.5px] leading-relaxed font-bold">
          Issued in compliance with RA 8550 and EO 305 and under the provision of Section 25 of Municipal Ordinace No. 12-2006 at Romblon on <span className="border-b-2 border-black px-6 font-black">{data.issuedFullDate || 'N/A'}</span>
        </p>
      </div>
      <div className="text-right pr-8 mt-8">
        <div className="inline-block text-center">
          <p className="text-[19px] font-black border-b-2 border-black uppercase italic min-w-[280px] pb-1">ATTY. GERARD S. MONTOJO</p>
          <p className="text-[11.5px] font-black tracking-widest mt-1">Municipal Mayor</p>
        </div>
      </div>
    </div>

    {/* FOOTER DATA MATCHING REFERENCE LAYOUT */}
    <div className="grid grid-cols-2 font-black text-[11.5px] bg-slate-50/50 print:bg-transparent p-3.5">
      <div className="space-y-2.5">
        <div className="flex gap-2 items-center"><span>Paid under OR No.</span><span className="border-b-2 border-black w-40 text-center font-bold text-[12.5px]">{data.orNumber || 'N/A'}</span></div>
        <div className="flex gap-2 items-center"><span>Date:</span><span className="border-b-2 border-black w-48 text-center font-bold text-[12.5px]">{data.paymentDate || 'N/A'}</span></div>
        <div className="flex gap-2 items-center"><span>RM -</span><span className="border-b-2 border-black w-48 text-center font-bold text-[12.5px]">{data.officialNo || 'N/A'}</span></div>
      </div>
      <div className="space-y-2.5 pl-4 border-l-[2px] border-black/10 flex flex-col justify-center">
        <div className="flex gap-2 text-red-700 items-center"><span>EXPIRATION DATE:</span><span className="border-b-2 border-red-700 flex-1 text-center font-black text-[12.5px]">{expirationDate || 'N/A'}</span></div>
        <div className="flex gap-2 text-blue-800 items-center">
          <span>RIG NO.:</span>
          <span className="border-b-2 border-blue-800 flex-1 text-center font-bold text-[12.5px]">
            {data.officialNo && data.orNumber 
              ? `RM-${data.officialNo.replace(/^(RM|OR)-?/i, '')}-${data.orNumber.replace(/^(RM|OR)-?/i, '')}` 
              : data.officialNo 
              ? `RM-${data.officialNo.replace(/^(RM|OR)-?/i, '')}` 
              : data.orNumber 
              ? `RM-${data.orNumber.replace(/^(RM|OR)-?/i, '')}` 
              : 'N/A'}
          </span>
        </div>
      </div>
      {/* FOOTER SLOGAN */}
<div className="text-center pt-2 pb-1">
  <p className="text-[10px] font-black uppercase tracking-wide font-sans">
    ***“KATAHUM NG ROMBLON, IPAKADAKO NATON”***
  </p>
</div>
    </div>

  </div>
</div>
) : (
/* LAYOUT B: MAYOR'S PERMIT */
<div 
  id="permit-document"
  className="bg-white text-black font-serif print:m-0 relative overflow-hidden" 
  style={{ width: '8.27in', height: '11.69in', padding: '0.8in', boxSizing: 'border-box' }}
>
  <div className="text-center space-y-1 mb-12">
    <p className="text-sm font-bold uppercase">Republic of the Philippines</p>
    <p className="text-sm font-bold uppercase">Province of Romblon</p>
    <p className="text-xs italic text-slate-500">- Municipality of Romblon -</p>
    <h2 className="text-xl font-black tracking-tight mt-4 uppercase border-y border-black py-2">OFFICE OF THE MAYOR</h2>
  </div>

  <div className="absolute top-[0.8in] right-[0.8in] text-right">
    <div className="text-xs font-black border-2 border-black px-3 py-1 uppercase rounded-sm flex items-center gap-2 bg-white">
      <FileText size={12}/> Permit No: {data.officialNo || ''}
    </div>
  </div>

  <div className="text-center mt-12 relative">
    <h1 className="text-6xl font-black tracking-[0.2em] text-slate-900 leading-none">MAYOR'S PERMIT</h1>
    <div className="flex justify-center -mt-8">
      <span className="text-[160px] font-black opacity-[0.03] text-blue-900 leading-none select-none italic">2026</span>
    </div>
  </div>

  <div className="w-full text-center space-y-8 -mt-16 relative z-10">
    <p className="text-lg font-bold italic underline underline-offset-4 tracking-wide">To Whom It May Concern:</p>
    
    <div className="pt-6">
      <p className="text-md uppercase font-bold text-slate-500 tracking-widest leading-none">
  This permit is hereby granted to
</p>
<p className="text-4xl font-black uppercase mt-4 border-b-[3px] border-black inline-block pb-1 whitespace-nowrap italic leading-tight text-center">
  {(data.ownerName || 'UNKNOWN').replace(/\s+/g, ' ').trim()}
</p>
    </div>

    <div className="space-y-4">
      <p className="text-md font-medium max-w-2xl mx-auto leading-relaxed italic">
        To engage in fishing operations within the Municipal Waters of Romblon with
Fishing gear/s specified herein:
      </p>

      <div className="py-2">
        {/* ASSET NAME + UNITS DISPLAY */}

{subType === "PAYAO/BALSA" ? (

<div className="text-center">

    {/* UNITS FROM NEW REGISTRATION */}
    {data.unitsInWords && (
      <p className="text-3xl font-black uppercase italic text-black whitespace-nowrap">
        {data.unitsInWords}
      </p>
    )}

    {/* PAYAO / BALSA NAME + ACTUAL NUMBERS ON ONE LINE */}
    {(data.vesselName || data.boatName) && (
      <p className="mt-5 text-3xl font-black uppercase italic text-black whitespace-nowrap">
        NAME: {data.vesselName || ""}
        {data.boatName && ` ${data.boatName}`}
      </p>
    )}

  </div>

) : subType === "PANGULONG" ? (

  <div className="text-center">

    {/* EXACT VALUE FROM NEW REGISTRATION */}
    {data.unitsInWords && (
      <p className="text-3xl font-black uppercase italic text-black whitespace-nowrap">
  {data.unitsInWords}
</p>
    )}

  </div>

) : subType === "FISHING GEAR" ? (

  <div className="text-center">

    {/* EXACT VALUE FROM REGISTRATION */}
    <p className="text-3xl font-black italic uppercase text-black">
      {data.unitsInWords || data.gearCategory || "FISHING GEAR"}
    </p>

  </div>

) : (

  <div className="flex justify-center items-center gap-3 flex-wrap">

    <p className="text-3xl font-black uppercase underline decoration-[3px] underline-offset-[12px] italic text-blue-900">
      {data.vesselName || "UNNAMED"}
    </p>

  </div>

)}
    

        {/* ISSUANCE DATE */}
        <p className="text-md pt-10 italic">
          Issued this{" "}
          <span className="font-black border-b border-black px-4">
            {(() => {
              const day = new Date().getDate();
              const s = ["TH", "ST", "ND", "RD"];
              const v = day % 100;
              return day + (s[(v - 20) % 10] || s[v] || s[0]);
            })()}
          </span>{" "}
          day of{" "}
          <span className="font-black border-b border-black px-4 uppercase mx-1">
            {new Date().toLocaleString('default', { month: 'long' })}
          </span>{" "}
          at Romblon, Romblon.
        </p>
      </div>
    </div>

    {/* ORDINANCE TEXT */}

<div className="max-w-xl mx-auto space-y-2 pt-0 -mt-8 text-center text-xs font-bold font-sans uppercase tracking-tighter leading-relaxed">

  {subType === "PANGULONG" ? (
    <p className="text-center text-sm font-serif leading-relaxed">
      For the period ending the year 2026 pursuant to the provisions of
      Municipal Ordinance No. 01-2023 amending Section 61 of Ordinance No.
      12-2006 otherwise known as the Comprehensive Municipal Fishery
      Ordinance and Ordinance No. 13-2025.
    </p>

  ) : subType === "FISHING GEAR" || subType === "PAYAO/BALSA" ? (
    <p>
      For the period ending the year 2026<br />
      pursuant to the provisions of Municipal Ordinance No. 01 -2023 amending<br />
      Section 61 of Ordinance No. 12- 2006 otherwise known as the<br />
      Comprehensive Municipal Fishery Ordinance.
    </p>

  ) : (
    <p>
      For the period ending the year 2026<br />
      pursuant to the provisions of Municipal Ordinance No. 01 -2023 amending<br />
      Section 61 of Ordinance No. 12- 2006 otherwise known as the<br />
      Comprehensive Municipal Fishery Ordinance and Ordinance No. 13-2025.
    </p>
  )}

</div>
</div>
  {/* FOOTER / PAYMENT INFO */}
{/* METADATA GRID - MOVED DOWNWARD WITH mt-10 */}
{/* METADATA GRID - CONDITIONALLY POSITIONED */}
<div
  className={`grid grid-cols-2 gap-x-2 gap-y-1 text-xs -ml-10 ${
    subType === "FISHING GEAR" || subType === "PANGULONG"
      ? "mt-24" // Moved downward for Fishing Gear and Pangulong
      : "mt-10" // Retained position for Payao, Balsa, etc.
  }`}
>
  {/* PERMIT FEE — LEFT */}
  <div>
    <span className="font-bold">PERMIT FEE:</span>
    <span className="ml-1">
      ₱{Number(data.permitFee || 0).toLocaleString()}
    </span>
  </div>

  {/* DATE — FARTHER RIGHT + FIT */}
  <div className="ml-48 whitespace-nowrap">
    <span className="font-bold">DATE:</span>
    <span className="ml-1 text-[9px]">
      {data.issuedFullDate}
    </span>
  </div>

  {/* O.R. NO. — LEFT */}
  <div>
    <span className="font-bold">O.R. NO.:</span>
    <span className="ml-1">
      {data.orNumber}
    </span>
  </div>

  {/* EXPIRY DATE — FARTHER RIGHT + FIT */}
  <div className="ml-48 whitespace-nowrap">
    <span className="font-bold">EXPIRY DATE:</span>
    <span className="ml-1 text-[9px]">
      DECEMBER 31, {new Date().getFullYear()}
    </span>
  </div>
</div>

{/* FOOTER SLOGAN */}
<div className="absolute bottom-[0.25in] left-0 right-0 text-center">
  <p className="text-[10px] font-black uppercase tracking-wide font-sans">
    ***“KATAHUM NG ROMBLON, IPAKADAKO NATON”***
  </p>
</div>
</div>
          )}
        </div>
      </main>
    </div>
  ); }