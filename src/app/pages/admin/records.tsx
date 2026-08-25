import { useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { 
  User, MapPin, Phone, Box, FileText, 
  ArrowLeft, Edit3, Search, Eye, 
  UserPlus, Ship, History as HistoryIcon, CheckCircle2, X, Save,
  Waves, Settings2, Upload, Trash2, AlertTriangle
} from 'lucide-react';
import { Badge } from '../../components/ui/badge'; 
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAquaData, useAquaAuth } from '../../components/context/AquaRegCONTEXT';
import { toast } from 'sonner';

// Type definition matching COI SubTypes
type SubType = 'motorized' | 'non-motorized' | 'pangulong' | 'fishing-gear' | 'payao-balsa' | 'others';

// Category Helper
const getAssetCategory = (record: any): SubType => {
  if (!record) return 'fishing-gear';

  const vType = (record.type || record.assetCategory || '').toUpperCase();
  const assetCat = (record.assetCategory || record.asset_category || '').toUpperCase();

  if (vType.includes('PANGULONG') || assetCat.includes('PANGULONG'))
    return 'pangulong';

  if (vType.includes('PAYAO') || vType.includes('BALSA') || assetCat.includes('PAYAO'))
    return 'payao-balsa';

  if (record.isMotorized || record.is_motorized)
    return 'motorized';

  if (vType.includes('NON-MOTORIZED'))
    return 'non-motorized';

  return 'fishing-gear';
};

// Normalize Record Helper
const normalizeRecord = (v: any) => ({
  ...v,
  id: v.id,
  registrationNo: v.registration_no || v.registrationNo,
  vesselName: v.vesselName || v.vessel_name || v.name || v.gear_type || "",
  ownerName: v.ownerName || v.owner_name || v.owner || "",
  assetCategory: v.assetCategory || v.asset_category || "",
  isMotorized: v.isMotorized ?? v.is_motorized ?? false,
  phone: v.phone || v.cp_number || "",
  barangay: v.barangay || "",
  fishR: v.fishR || v.fishr_number || "",
  hull: {
    length: v.hull?.length ?? v.hull_length ?? 0,
    width: v.hull?.width ?? v.hull_width ?? 0,
    depth: v.hull?.depth ?? v.hull_depth ?? 0
  },
  engine: {
    make: v.engine_make ?? v.engine?.make ?? "",
    hp: v.engine_hp ?? v.engine?.hp ?? "",
    serial: v.engine_serial ?? v.engine?.serial ?? ""
  },
  tonnage: {
    gross: v.tonnage?.gross ?? v.tonnage_gross ?? 0,
    net: v.tonnage?.net ?? v.tonnage_net ?? 0
  },
  documents: v.documents || v.requirements || v.documentUrls || {},
  requirements: v.requirements || v.documents || v.documentUrls || {},
  createdAt: v.createdAt || v.created_at || null,
  inspectedBy: v.inspected_by || v.inspectedBy || "",
  inspectorName: v.inspector_name || v.inspectorName || "",
  status: v.status || 'REGISTERED'
});

export default function RecordsPage() {
  const { Vessels = [], deleteVessel } = useAquaData(); 
  const { currentUser } = useAquaAuth();
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteRecord = (id: string, name: string) => {
    if (typeof deleteVessel === 'function') {
      deleteVessel(id);
    }

    toast.success("Record Deleted", { description: `${name} (${id}) was removed from the registry.` });
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }
    setDeletingId(null);
  };

  const approvedRecords = useMemo(() => {
    return Vessels
      .map(normalizeRecord)
      .filter((v: any) => {
        const isPassedOrRegistered = 
          v.status === 'Passed' ||
          v.status === 'PASSED' ||
          v.status === 'REGISTERED' ||
          v.status === 'READY';

        if (!isPassedOrRegistered) return false;

        const userIdentifier = String(currentUser?.idNumber || currentUser?.id || '').trim().toUpperCase();
        const userName = String(currentUser?.name || '').trim().toUpperCase();
        const userRole = String(currentUser?.role || '').trim().toUpperCase();

        const isInspectorRole = userRole.includes('INSPECTOR') || userRole.includes('LAW ENFORCER') || currentUser?.idNumber;

        if (isInspectorRole && userIdentifier) {
          const recordInspectorId = String(v.inspectedBy || '').trim().toUpperCase();
          const recordInspectorName = String(v.inspectorName || '').trim().toUpperCase();
          
          const matchesId = recordInspectorId === userIdentifier;
          const matchesName = userName && recordInspectorName.includes(userName);

          if (!matchesId && !matchesName) {
            return false;
          }
        }

        return true;
      })
      .filter((v: any) =>
        [
          v.vesselName,
          v.ownerName,
          v.id,
          v.registrationNo
        ].some(f =>
          String(f || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
        )
      );
  }, [Vessels, searchTerm, currentUser]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {selectedRecord ? (
          <DetailView 
            record={selectedRecord} 
            onBack={() => setSelectedRecord(null)} 
            onDelete={(id: string, name: string) => handleDeleteRecord(id, name)}
          />
        ) : (
          <RegistryView 
            data={approvedRecords} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            onSelect={setSelectedRecord}
            onOpenManualEntry={() => setIsManualEntryOpen(true)}
            onConfirmDelete={(id: string) => setDeletingId(id)}
          />
        )}
      </div>

      {isManualEntryOpen && (
        <ManualEntryModal onClose={() => setIsManualEntryOpen(false)} />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <DeleteConfirmModal 
          id={deletingId} 
          record={Vessels.find((v: any) => v.id === deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={(id: string, name: string) => handleDeleteRecord(id, name)}
        />
      )}
    </div>
  );
}

// --- REGISTRY LIST VIEW ---
function RegistryView({ data, searchTerm, setSearchTerm, onSelect, onOpenManualEntry, onConfirmDelete }: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Official Registry</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Management of Certified Marine Assets</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={onOpenManualEntry} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase rounded-xl h-11 px-6 shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            <UserPlus size={16} className="mr-2" /> Manual Entry
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by vessel, owner name, or RM-ID..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-12 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 uppercase"
          />
        </div>
        <div className="px-4 flex items-center bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border">
           {data.length} Records Found
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Asset Details</th>
              <th className="px-8 py-5">Client / Owner</th>
              <th className="px-8 py-5">Category</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((record: any) => {
              const category = getAssetCategory(record);
              return (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => onSelect(record)}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {category === 'motorized' || category === 'non-motorized' ? <Ship size={20} /> : <Waves size={20} />}
                      </div>
                      <div>
                        <span className="block text-sm font-black text-slate-800 uppercase leading-none">{record.vesselName || record.name || record.gearType}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-400 italic">{record.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-bold uppercase text-xs text-slate-700">{record.ownerName || record.owner}</td>
                  <td className="px-8 py-5">
                    <Badge className="bg-slate-100 text-slate-500 font-black uppercase text-[8px] px-2 py-0 border-none">
                      {category.replace('-', ' ')}
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onSelect(record)} className="text-slate-300 hover:text-blue-600">
                        <Eye size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onConfirmDelete(record.id)} className="text-slate-300 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- DELETE CONFIRMATION MODAL ---
function DeleteConfirmModal({ id, record, onClose, onConfirm }: any) {
  const name = record?.vesselName || record?.vessel_name || record?.name || id;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase italic">Confirm Deletion</h3>
        <p className="text-xs font-medium text-slate-500 mt-2">
          Are you sure you want to delete <strong className="text-slate-900">{name}</strong> (<span className="font-mono">{id}</span>)? This action cannot be undone.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11 font-bold text-xs uppercase">
            Cancel
          </Button>
          <Button onClick={() => onConfirm(id, name)} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 font-bold text-xs uppercase">
            Delete Record
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- MANUAL ENTRY MODAL WITH IMAGE UPLOAD SUPPORT ---
function ManualEntryModal({ onClose }: { onClose: () => void }) {
  const { addVessel } = useAquaData();
  const { currentUser } = useAquaAuth();

  const [form, setForm] = useState({
    vesselName: '',
    ownerName: '',
    fishR: '',
    phone: '',
    barangay: '',
    assetCategory: 'motorized',
    isMotorized: true,
    length: '',
    width: '',
    depth: '',
    grossTonnage: '',
    netTonnage: '',
    engineMake: '',
    engineHp: '',
    engineSerial: ''
  });

  const [images, setImages] = useState({
    barangayClearance: '',
    cedula: '',
    validID: '',
    marinaPermit: '',
    bfarPermit: ''
  });

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setForm(prev => ({
      ...prev,
      assetCategory: val,
      isMotorized: val === 'motorized'
    }));
  };

  const handleImageUpload = (key: keyof typeof images, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({ ...prev, [key]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.vesselName.trim() || !form.ownerName.trim()) {
      toast.error("Required Fields Missing", { description: "Please enter at least the vessel/asset name and owner name." });
      return;
    }

    const newId = `RM-${Date.now().toString().slice(-6)}`;
    const newRecord = {
      id: newId,
      registration_no: newId,
      vessel_name: form.vesselName,
      owner_name: form.ownerName,
      phone: form.phone,
      fishr_number: form.fishR,
      barangay: form.barangay,
      asset_category: form.assetCategory,
      is_motorized: form.assetCategory === 'motorized',
      hull: {
        length: Number(form.length) || 0,
        width: Number(form.width) || 0,
        depth: Number(form.depth) || 0
      },
      tonnage: {
        gross: Number(form.grossTonnage) || 0,
        net: Number(form.netTonnage) || 0
      },
      engine: {
        make: form.engineMake,
        hp: form.engineHp,
        serial: form.engineSerial
      },
      documents: {
        barangayClearance: images.barangayClearance,
        barangay_clearance: images.barangayClearance,
        cedula: images.cedula,
        validID: images.validID,
        valid_id: images.validID,
        marinaPermit: images.marinaPermit,
        marina_permit: images.marinaPermit,
        bfarPermit: images.bfarPermit,
        bfar_permit: images.bfarPermit
      },
      requirements: {
        barangayClearance: images.barangayClearance,
        cedula: images.cedula,
        validID: images.validID,
        marinaPermit: images.marinaPermit,
        bfarPermit: images.bfarPermit
      },
      status: 'REGISTERED',
      createdAt: new Date().toISOString(),
      inspected_by: currentUser?.idNumber || currentUser?.id || '',
      inspector_name: currentUser?.name || ''
    };

    if (typeof addVessel === 'function') {
      addVessel(newRecord);
    }

    toast.success("Record Created Successfully", { description: `New asset registered under ${newId}` });
    onClose();
  };

  const isVessel = form.assetCategory === 'motorized' || form.assetCategory === 'non-motorized';

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Manual Entry Registration</h3>
            <p className="text-[10px] font-bold uppercase text-slate-400">Directly add a new marine asset record</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <SectionTitle title="Client Identity" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Owner Full Name *" value={form.ownerName} onChange={(val: string) => setForm({ ...form, ownerName: val })} />
            <InputGroup label="FishR Number" value={form.fishR} onChange={(val: string) => setForm({ ...form, fishR: val })} />
            <InputGroup label="Phone / Mobile" value={form.phone} onChange={(val: string) => setForm({ ...form, phone: val })} />
            <InputGroup label="Barangay Address" value={form.barangay} onChange={(val: string) => setForm({ ...form, barangay: val })} />
          </div>

          <SectionTitle title="Asset Details" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Vessel / Asset Name *" value={form.vesselName} onChange={(val: string) => setForm({ ...form, vesselName: val })} />
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-400">Category</Label>
              <select 
                value={form.assetCategory} 
                onChange={handleCategoryChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="motorized">Motorized Vessel</option>
                <option value="non-motorized">Non-Motorized Vessel</option>
                <option value="pangulong">Pangulong</option>
                <option value="fishing-gear">Fishing Gear</option>
                <option value="payao-balsa">Payao / Balsa</option>
                <option value="others">Others</option>
              </select>
            </div>
          </div>

          {isVessel && (
            <>
              <SectionTitle title="Hull Dimensions (Meters)" />
              <div className="grid grid-cols-3 gap-4">
                <InputGroup label="Length" type="number" value={form.length} onChange={(val: string) => setForm({ ...form, length: val })} />
                <InputGroup label="Width" type="number" value={form.width} onChange={(val: string) => setForm({ ...form, width: val })} />
                <InputGroup label="Depth" type="number" value={form.depth} onChange={(val: string) => setForm({ ...form, depth: val })} />
              </div>
            </>
          )}

          {form.assetCategory === 'motorized' && (
            <>
              <SectionTitle title="Tonnage Particulars" />
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Gross Tonnage" type="number" value={form.grossTonnage} onChange={(val: string) => setForm({ ...form, grossTonnage: val })} />
                <InputGroup label="Net Tonnage" type="number" value={form.netTonnage} onChange={(val: string) => setForm({ ...form, netTonnage: val })} />
              </div>

              <SectionTitle title="Engine Details" />
              <div className="grid grid-cols-3 gap-4">
                <InputGroup label="Engine Make" value={form.engineMake} onChange={(val: string) => setForm({ ...form, engineMake: val })} />
                <InputGroup label="Horsepower (HP)" value={form.engineHp} onChange={(val: string) => setForm({ ...form, engineHp: val })} />
                <InputGroup label="Serial Number" value={form.engineSerial} onChange={(val: string) => setForm({ ...form, engineSerial: val })} />
              </div>
            </>
          )}

          <SectionTitle title="Document Attachments (Images)" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <ImageUploaderBox 
              label="Barangay Clearance" 
              imageSrc={images.barangayClearance} 
              onUpload={(e) => handleImageUpload('barangayClearance', e)} 
              onRemove={() => setImages(prev => ({ ...prev, barangayClearance: '' }))}
            />
            <ImageUploaderBox 
              label="Cedula" 
              imageSrc={images.cedula} 
              onUpload={(e) => handleImageUpload('cedula', e)} 
              onRemove={() => setImages(prev => ({ ...prev, cedula: '' }))}
            />
            <ImageUploaderBox 
              label="Valid ID" 
              imageSrc={images.validID} 
              onUpload={(e) => handleImageUpload('validID', e)} 
              onRemove={() => setImages(prev => ({ ...prev, validID: '' }))}
            />
            {!isVessel && (
              <>
                <ImageUploaderBox 
                  label="Marina Permit" 
                  imageSrc={images.marinaPermit} 
                  onUpload={(e) => handleImageUpload('marinaPermit', e)} 
                  onRemove={() => setImages(prev => ({ ...prev, marinaPermit: '' }))}
                />
                <ImageUploaderBox 
                  label="BFAR Permit" 
                  imageSrc={images.bfarPermit} 
                  onUpload={(e) => handleImageUpload('bfarPermit', e)} 
                  onRemove={() => setImages(prev => ({ ...prev, bfarPermit: '' }))}
                />
              </>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95">
              <Save size={18} /> Register Asset
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- IMAGE UPLOADER COMPONENT ---
function ImageUploaderBox({ label, imageSrc, onUpload, onRemove }: {
  label: string;
  imageSrc: string;
  onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[9px] font-black uppercase text-slate-400">{label}</Label>
      <div className="relative aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group hover:border-blue-400 transition-colors">
        {imageSrc ? (
          <>
            <img src={imageSrc} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full p-2 text-center">
            <Upload size={20} className="text-slate-400 mb-1 group-hover:text-blue-600 transition-colors" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Attach Photo</span>
            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
}

// --- DETAIL VIEW ---
function DetailView({ record, onBack, onDelete }: { record: any; onBack: () => void; onDelete: (id: string, name: string) => void }) {
  const { updateVessel } = useAquaData();
  const [isEditing, setIsEditing] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const categoryIdentifier = useMemo(() => getAssetCategory(record), [record]);
  const isVesselCategory = categoryIdentifier === 'motorized' || categoryIdentifier === 'non-motorized';
  const isMotorized = categoryIdentifier === 'motorized';

  const [formData, setFormData] = useState({ 
    ...record,
    ownerName: record.ownerName || record.owner || '',
    vesselName: record.vesselName || record.name || record.gearType || '',
    phone: record.phone || '',
    fishR: record.fishR || '',
    hull: { length: record.hull?.length || '', width: record.hull?.width || '', depth: record.hull?.depth || '' },
    tonnage: { gross: record.tonnage?.gross || '', net: record.tonnage?.net || '' },
    engine: { make: record.engine_make || record.engine?.make || '', hp: record.engine_hp || record.engine?.hp || '', serial: record.engine_serial || record.engine?.serial || ''}
  });

  const handleSave = () => {
    updateVessel(record.id, formData);
    setIsEditing(false);
    toast.success("Record Updated", { description: "Client and asset particulars synchronized." });
  };

  const docs = record.requirements || record.documents || record.documentUrls || {};
  const barangayClearanceImg = docs.barangayClearance || docs.barangay_clearance || record.barangay_clearance || null;
  const cedulaImg = docs.cedula || record.cedula || null;
  const validIdImg = docs.validID || docs.valid_id || record.valid_id || null;
  const marinaPermitImg = docs.marina_permit || docs.marinaPermit || record.marina_permit || null;
  const bfarPermitImg = docs.bfar_permit || docs.bfarPermit || record.bfar_permit || null;

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-20 relative">
      {isEditing && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Edit Record: {formData.id}</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}><X/></Button>
            </div>
            
            <div className="space-y-8">
              <SectionTitle title="Client Personal Information" />
              <div className="grid grid-cols-1 gap-4">
                <InputGroup label="Full Legal Name" value={formData.ownerName} onChange={(val: string) => setFormData({...formData, ownerName: val})} />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="FishR Number" value={formData.fishR} onChange={(val: string) => setFormData({...formData, fishR: val})} />
                  <InputGroup label="Contact Number" value={formData.phone} onChange={(val: string) => setFormData({...formData, phone: val})} />
                </div>
                <InputGroup label="Barangay Address" value={formData.barangay || ''} onChange={(val: string) => setFormData({...formData, barangay: val})} />
              </div>

              <SectionTitle title="Asset Particulars" />
              <div className="grid grid-cols-1 gap-4">
                <InputGroup label="Vessel / Gear Name" value={formData.vesselName} onChange={(val: string) => setFormData({...formData, vesselName: val})} />
                {isVesselCategory && (
                  <div className="grid grid-cols-3 gap-4">
                    <InputGroup label="Length (m)" value={formData.hull.length} onChange={(val: string) => setFormData({...formData, hull: {...(formData.hull || {}), length: val}})} type="number" />
                    <InputGroup label="Width (m)" value={formData.hull.width} onChange={(val: string) => setFormData({...formData, hull: {...(formData.hull || {}), width: val}})} type="number" />
                    <InputGroup label="Depth (m)" value={formData.hull.depth} onChange={(val: string) => setFormData({...formData, hull: {...(formData.hull || {}), depth: val}})} type="number" />
                  </div>
                )}
              </div>

              {isMotorized && (
                <>
                  <SectionTitle title="Tonnage Particulars" />
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Gross Tonnage" value={formData.tonnage.gross} onChange={(val: string) => setFormData({...formData, tonnage: {...(formData.tonnage || {}), gross: val}})} type="number" />
                    <InputGroup label="Net Tonnage" value={formData.tonnage.net} onChange={(val: string) => setFormData({...formData, tonnage: {...(formData.tonnage || {}), net: val}})} type="number" />
                  </div>
                </>
              )}

              <Button onClick={handleSave} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"><Save size={18}/> Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {viewingImage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} alt="Document View" className="max-w-full max-h-[85vh] rounded-2xl border-8 border-white shadow-2xl animate-in zoom-in-95" />
        </div>
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmModal 
          id={record.id} 
          record={record} 
          onClose={() => setIsDeleteModalOpen(false)} 
          onConfirm={(id: string, name: string) => onDelete(id, name)} 
        />
      )}

      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onBack} className="text-slate-400 font-black text-[10px] uppercase hover:text-blue-600 transition-colors"><ArrowLeft size={16} className="mr-2" /> Registry Home</Button>
        <div className="flex gap-2">
          <Button onClick={() => setIsDeleteModalOpen(true)} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-11 px-4 font-black text-[10px] uppercase tracking-widest transition-all">
            <Trash2 size={14} className="mr-2" /> Delete Record
          </Button>
          <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95">
            <Edit3 size={14} className="mr-2" /> Update Client Info
          </Button>
        </div>
      </div>

      <header className="bg-white rounded-[2.5rem] border border-slate-200 p-10 flex flex-col md:flex-row gap-10 items-center shadow-sm relative overflow-hidden">
        <Ship size={240} className="absolute -right-10 top-0 opacity-[0.05] text-blue-600" />
        <div className="w-32 h-32 rounded-3xl bg-slate-900 flex items-center justify-center text-4xl font-black text-emerald-400 italic shadow-xl text-center">
            {formData.vesselName?.charAt(0)}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{formData.vesselName}</h1>
          <div className="flex gap-4 mt-3 justify-center md:justify-start">
            <Badge className="bg-blue-600 text-white font-black uppercase text-[9px] px-3 border-none">{formData.id}</Badge>
            <Badge className="bg-slate-100 text-slate-500 font-black uppercase text-[9px] px-3 border-none">
              {categoryIdentifier.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <CardWrapper title="Client Identity" icon={<User size={16}/>}>
            <InfoRow label="Legal Owner" value={formData.ownerName} icon={<User size={14}/>}/>
            <InfoRow label="Contact" value={formData.phone} icon={<Phone size={14}/>}/>
            <InfoRow label="Address" value={formData.barangay ? `Brgy. ${formData.barangay}` : '---'} icon={<MapPin size={14}/>}/>
          </CardWrapper>

          <CardWrapper title="Technical Specs" icon={<Settings2 size={16}/>}>
            {isVesselCategory && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <MetricBox label="L (m)" value={formData.hull.length} />
                <MetricBox label="W (m)" value={formData.hull.width} />
                <MetricBox label="D (m)" value={formData.hull.depth} />
              </div>
            )}
            {isMotorized && (
              <div className="grid grid-cols-2 gap-3">
                <MetricBox label="Gross Ton" value={formData.tonnage.gross} />
                <MetricBox label="Net Ton" value={formData.tonnage.net} />
              </div>
            )}
            {!isVesselCategory && !isMotorized && (
              <p className="text-xs font-bold text-slate-400 italic text-center py-4">No hull or tonnage specs required for this asset type.</p>
            )}
          </CardWrapper>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <CardWrapper title="Document Registry" icon={<FileText size={16}/>}>
            <div className={`grid gap-4 ${isVesselCategory ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {(isVesselCategory ? [
                { label: 'Barangay Clearance', url: barangayClearanceImg },
                { label: 'Cedula', url: cedulaImg },
                { label: 'Valid ID', url: validIdImg }
              ] : [
                { label: 'Barangay Clearance', url: barangayClearanceImg },
                { label: 'Cedula', url: cedulaImg },
                { label: 'Marina Permit', url: marinaPermitImg },
                { label: 'BFAR Permit', url: bfarPermitImg }
              ]).map((docItem, idx) => (
                <div key={idx} className="space-y-2 cursor-pointer" onClick={() => docItem.url && setViewingImage(docItem.url)}>
                  <p className="text-[9px] font-black text-slate-400 uppercase italic text-center truncate">{docItem.label}</p>
                  <div className="aspect-[3/4] rounded-2xl border bg-slate-50 overflow-hidden relative group">
                    {docItem.url ? (
                      <>
                        <img src={docItem.url} alt={docItem.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Eye/></div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200"><Box size={24}/></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardWrapper>

          <CardWrapper title="System Audit History" icon={<HistoryIcon size={16}/>}>
             <div className="space-y-4">
                  <HistoryItem label="Registration Initialized" date={record.createdAt} status="COMPLETED" />
                  <HistoryItem label="Document Verification" date={record.createdAt} status="VERIFIED" />
                  <HistoryItem label="Physical Inspection" date={record.inspectionDate || record.updatedAt || 'N/A'} status={record.status || 'PASSED'} />
             </div>
          </CardWrapper>
        </div>
      </div>
    </div>
  );
}

const SectionTitle = ({ title }: { title: string }) => (
  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">{title}</p>
);

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <Label className="text-[9px] font-black uppercase text-slate-400">{label}</Label>
    <Input type={type} value={value} onChange={e => onChange(e.target.value.toUpperCase())} className="font-bold h-11 rounded-xl focus-visible:ring-blue-600" />
  </div>
);

const CardWrapper = ({ title, icon, children }: any) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
    <div className="flex items-center gap-3 mb-6"><div className="text-blue-600 p-2 bg-blue-50 rounded-lg">{icon}</div><h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{title}</h3></div>
    {children}
  </div>
);

const InfoRow = ({ label, value, icon }: any) => (
  <div className="flex items-start gap-4 py-2 border-b border-slate-50 last:border-none">
    <div className="mt-1 text-slate-300">{icon}</div>
    <div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p><p className="text-sm font-black uppercase text-slate-800 truncate">{value || '---'}</p></div>
  </div>
);

const MetricBox = ({ label, value }: any) => (
  <div className="bg-slate-50 p-3 rounded-2xl border text-center">
    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</p>
    <p className="text-xs font-black text-slate-900">{value || '0.00'}</p>
  </div>
);

const HistoryItem = ({ label, date, status }: any) => (
  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border">
    <div className="flex items-center gap-3">
      <CheckCircle2 size={16} className="text-emerald-500"/>
      <div>
        <p className="text-xs font-black uppercase italic text-slate-900 leading-none">{label}</p>
        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{date ? new Date(date).toLocaleDateString() : 'N/A'}</p>
      </div>
    </div>
    <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[9px] px-2 rounded-md">{status}</Badge>
  </div>
);