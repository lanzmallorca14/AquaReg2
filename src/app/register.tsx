import { useState, useMemo, useRef, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Lock, MapPin, Phone, ShieldCheck, Mail, UploadCloud, 
  Trash2, ShieldAlert, ChevronLeft, AlertCircle, CheckCircle2,
  Eye, EyeOff, BadgeAlert, Briefcase, Calendar, Heart, Award, CreditCard
} from 'lucide-react';

import { Input } from './components/ui/input'; 
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import { toast } from 'sonner';
import { useAquaData, useAquaReg } from '../app/components/context/AquaRegCONTEXT';

// --- CONSTANTS ---
const AVAILABLE_BARANGAYS = [
  "Agbaluto", "Agbudia", "Agnaga", "Agnay", "Agnipa", "Agpanabat", "Agtongo",
  "Alad", "Bagacay", "Barangay I", "Barangay II", "Barangay III", "Barangay IV",
  "Cajimos", "Calabogo", "Capaclan", "Cobrador", "Ginablan", "Guimpingan",
  "Ilauran", "Lamao", "Li-o", "Logbon", "Lonos", "Lunas", "Macalas",
  "Mapula", "Palje", "Sablayan", "Sawang", "Tambac"
];

const AVAILABLE_POSITIONS = [
  "Fishery Inspector",
  "Municipal Officer",
  "Data Encoder",
  "Aquaculturist",
  "Bfaro Representative"
];

const INITIAL_FORM_STATE = {
  idNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  barangay: '',
  age: '',
  sex: 'Male' as 'Male' | 'Female',
  position: '',
  yearsInService: '',
  cellphone: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supabase } = useAquaReg();
  useAquaData();

  const idInputRef = useRef<HTMLInputElement>(null);

  const currentView = location.state?.view || 'signup';
  const [view, setView] = useState<'register' | 'reset'>(
    currentView === 'reset' ? 'reset' : 'register'
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dragActiveId, setDragActiveId] = useState(false);

  // Combined Form State
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // File Upload State
  const [idFile, setIdFile] = useState<File | undefined>(undefined);
  const [idPreview, setIdPreview] = useState<string | null>(null);

  const handleInputChange = (field: keyof typeof INITIAL_FORM_STATE, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validation Metrics
  const securityMetrics = useMemo(() => {
    const p = formData.password || '';
    return {
      length: p.length >= 8,
      hasLetter: /[a-zA-Z]/.test(p),
      hasNumber: /\d/.test(p),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(p),
      match: p === formData.confirmPassword && p !== ''
    };
  }, [formData.password, formData.confirmPassword]);

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email), [formData.email]);
  const cellphoneIsValid = useMemo(() => /^(09|\+639)\d{9}$/.test(formData.cellphone), [formData.cellphone]);
  
  const ageIsValid = useMemo(() => {
    const numAge = parseInt(formData.age, 10);
    return !isNaN(numAge) && numAge >= 18 && numAge <= 90;
  }, [formData.age]);

  const serviceIsValid = useMemo(() => {
    const yrs = parseInt(formData.yearsInService, 10);
    return !isNaN(yrs) && yrs >= 0 && yrs <= 60;
  }, [formData.yearsInService]);

  const isSecureEnough = Object.values(securityMetrics).every(Boolean);
  const isIdentityVerified = view === 'reset' || !!idFile;

  const isFormValid = view === 'register' 
    ? (isSecureEnough && isIdentityVerified && emailIsValid && cellphoneIsValid && ageIsValid && serviceIsValid && formData.name && formData.idNumber && formData.barangay && formData.position && formData.sex)
    : (isSecureEnough && emailIsValid);

  // File Upload Handlers
  const handleFileChange = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("File Too Large", { description: "Scanned documents must be under 5MB." });
    }

    if (idPreview) URL.revokeObjectURL(idPreview);
    
    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
    toast.success("Identity Proof Loaded");
  };

  const clearFile = () => {
    setIdFile(undefined);
    if (idPreview) URL.revokeObjectURL(idPreview);
    setIdPreview(null);
    if (idInputRef.current) idInputRef.current.value = "";
  };

  const uploadIdScan = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("id-scans")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (error) {
      console.error("ID SCAN UPLOAD ERROR:", error);
      throw error;
    }

    return fileName;
  };

  // Submit Handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error("Validation Error", { description: "Please complete all fields correctly before submitting." });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.name.trim().toUpperCase(),
            Phone: formData.cellphone.trim(),
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Authentication failed.");

      const userId = authData.user.id;

      // 2. Upload file scan
      const idImageUrl = idFile ? await uploadIdScan(idFile, userId) : "";

      // 3. Store personnel record
      const payload = {
        id: userId,
        name: formData.name.trim().toUpperCase(),
        id_number: formData.idNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        cellphone: formData.cellphone.trim(),
        position: formData.position,
        age: Number(formData.age) || 0,
        sex: formData.sex,
        years_in_service: Number(formData.yearsInService) || 0,
        barangay: formData.barangay,
        municipal_id_image: idImageUrl,
        role: "inspector",
        profile_status: "pending",
      };

      const { error: profileError } = await supabase
        .from("personnel_profiles")
        .insert([payload]);

      if (profileError) throw profileError;

      toast.success("Enrollment Successful!", { description: "Please verify your registered email address to complete activation." });
      navigate("/");

    } catch (err: any) {
      console.error("Submission Error:", err);
      toast.error("Process Failed", { description: err.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Background Decor Lights */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden relative z-10 my-6">
        
        {/* Top Header Bar */}
        <div className="bg-slate-950 px-8 py-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800">
          <button 
            type="button" 
            onClick={() => navigate('/login')} 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors group self-start md:self-auto"
          >
            <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center group-hover:border-slate-500">
              <ChevronLeft size={16} />
            </div>
            Back to Login
          </button>

          <div className="text-center md:text-right">
            <h1 className="text-xl font-black uppercase italic tracking-wider text-slate-100">
              {view === 'register' ? 'Personnel Enrollment' : 'Identity Recovery'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mt-0.5">
              AquaReg Security Authorization
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 bg-slate-50/50">

          {/* REGISTRATION FORM SECTIONS */}
          {view === 'register' ? (
            <div className="space-y-6">

              {/* CARD 1: PERSONAL IDENTIFICATION */}
              <FormCard sectionTitle="1. Identity & Contact Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    id="fullName"
                    label="Full Name"
                    icon={<User size={15} />}
                    placeholder="e.g. JUAN DELA CRUZ"
                    value={formData.name}
                    onChange={(val) => handleInputChange('name', val)}
                  />

                  <FormInput
                    id="idNumber"
                    label="Municipal ID Number"
                    icon={<CreditCard size={15} />}
                    placeholder="MFO-ROM-2026-XXXX"
                    value={formData.idNumber}
                    onChange={(val) => handleInputChange('idNumber', val)}
                  />

                  <FormInput
                    id="emailAddress"
                    type="email"
                    label="Email Address"
                    icon={<Mail size={15} />}
                    placeholder="official.name@gov.ph"
                    value={formData.email}
                    isValid={emailIsValid}
                    onChange={(val) => handleInputChange('email', val)}
                  />

                  <FormInput
                    id="contactNumber"
                    type="tel"
                    label="Contact Number"
                    icon={<Phone size={15} />}
                    placeholder="09171234567"
                    value={formData.cellphone}
                    isValid={cellphoneIsValid}
                    onChange={(val) => handleInputChange('cellphone', val)}
                  />
                </div>
              </FormCard>

              {/* CARD 2: OFFICIAL ASSIGNMENT DETAILS */}
              <FormCard sectionTitle="2. System & Official Assignment">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormSelect
                    id="systemPosition"
                    label="Position Assignment"
                    icon={<Briefcase size={15} />}
                    value={formData.position}
                    onChange={(val) => handleInputChange('position', val)}
                    options={AVAILABLE_POSITIONS}
                    placeholder="Select Official Title"
                  />

                  <FormSelect
                    id="assignedBarangay"
                    label="Assigned Barangay"
                    icon={<MapPin size={15} />}
                    value={formData.barangay}
                    onChange={(val) => handleInputChange('barangay', val)}
                    options={AVAILABLE_BARANGAYS}
                    placeholder="Select Location"
                  />

                  <FormSelect
                    id="biologicalSex"
                    label="Sex"
                    icon={<Heart size={15} />}
                    value={formData.sex}
                    onChange={(val) => handleInputChange('sex', val as 'Male' | 'Female')}
                    options={["Male", "Female"]}
                  />

                  <FormInput
                    id="personnelAge"
                    type="number"
                    label="Age"
                    icon={<Calendar size={15} />}
                    placeholder="25"
                    min="18"
                    max="90"
                    value={formData.age}
                    isValid={ageIsValid}
                    onChange={(val) => handleInputChange('age', val)}
                  />

                  <FormInput
                    id="yearsInService"
                    type="number"
                    label="Years in Service"
                    icon={<Award size={15} />}
                    placeholder="0"
                    min="0"
                    max="60"
                    value={formData.yearsInService}
                    isValid={serviceIsValid}
                    onChange={(val) => handleInputChange('yearsInService', val)}
                  />
                </div>
              </FormCard>

              {/* CARD 3: DOCUMENT PROOF */}
              <FormCard sectionTitle="3. Document Upload Verification">
                <FileUploadZone
                  previewUrl={idPreview}
                  dragActive={dragActiveId}
                  fileInputRef={idInputRef}
                  onDragActiveChange={setDragActiveId}
                  onFileSelect={handleFileChange}
                  onClearFile={clearFile}
                />
              </FormCard>

            </div>
          ) : (
            /* RESET PASSWORD MODE */
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
              <ShieldAlert size={36} className="text-amber-600 mx-auto" />
              <h3 className="text-sm font-black uppercase text-amber-950">Identity Recovery Activated</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Enter your registered government email address below and set a new authorization password key.
              </p>
              <div className="pt-4 max-w-md mx-auto">
                <FormInput
                  id="emailAddress"
                  type="email"
                  label="Registered Email Address"
                  icon={<Mail size={15} />}
                  placeholder="name@gov.ph"
                  value={formData.email}
                  isValid={emailIsValid}
                  onChange={(val) => handleInputChange('email', val)}
                />
              </div>
            </div>
          )}

          {/* CARD 4: SECURITY PASSWORD & CREDENTIALS */}
          <FormCard sectionTitle={view === 'register' ? "4. Access Security Credentials" : "New Security Key Credentials"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
              
              <div className="space-y-1.5">
                <Label htmlFor="securityKey" className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <Lock size={15} className="text-blue-600" /> New Password
                </Label>
                <div className="relative">
                  <Input 
                    id="securityKey" 
                    required 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="h-12 rounded-xl bg-white border-slate-200 pr-10 text-xs shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                    value={formData.password} 
                    onChange={(e) => handleInputChange('password', e.target.value)} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmSecurityKey" className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <ShieldCheck size={15} className="text-blue-600" /> Confirm Password
                </Label>
                <Input 
                  id="confirmSecurityKey" 
                  required 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="h-12 rounded-xl bg-white border-slate-200 text-xs shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                  value={formData.confirmPassword} 
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)} 
                />
              </div>

            </div>

            <PasswordRequirements metrics={securityMetrics} />
          </FormCard>

          {/* SUBMISSION ACTIONS */}
          <div className="space-y-4 pt-2">
            <Button 
              type="submit" 
              disabled={!isFormValid || isSubmitting}
              className={`w-full h-14 rounded-xl font-black uppercase text-xs tracking-widest text-white shadow-lg transition-all 
                ${isFormValid ? 'bg-blue-600 hover:bg-slate-900 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              {isSubmitting ? 'Processing Enrollment Request...' : view === 'register' ? 'Submit Enrollment Registration' : 'Update Security Key'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setView(view === 'register' ? 'reset' : 'register')}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 underline transition-colors"
              >
                {view === 'register' ? 'Need to reset or recover an existing key?' : 'Return to personnel enrollment registration'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

// ==========================================
// ORGANIZED SUBCOMPONENTS
// ==========================================

function FormCard({ sectionTitle, children }: { sectionTitle: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
      <h2 className="text-xs font-black uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-3">
        {sectionTitle}
      </h2>
      {children}
    </div>
  );
}

interface FormInputProps {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  isValid?: boolean;
  min?: string;
  max?: string;
}

function FormInput({
  id,
  label,
  icon,
  value,
  onChange,
  type = 'text',
  placeholder,
  isValid,
  min,
  max
}: FormInputProps) {
  const isInvalid = value !== '' && isValid === false;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-2">
        <span className="text-blue-600">{icon}</span> {label}
      </Label>
      <div className="relative">
        <Input 
          id={id} 
          required 
          type={type} 
          placeholder={placeholder} 
          min={min}
          max={max}
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className={`h-11 rounded-xl bg-white border-slate-200 text-xs shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${isValid !== undefined ? 'pr-9' : ''} ${isInvalid ? 'border-red-400 bg-red-50/20' : ''}`} 
        />
        {isValid !== undefined && value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isValid ? <CheckCircle2 size={16} className="text-emerald-500" /> : <BadgeAlert size={16} className="text-red-500" />}
          </div>
        )}
      </div>
    </div>
  );
}

interface FormSelectProps {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
}

function FormSelect({ id, label, icon, value, options, onChange, placeholder }: FormSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-2">
        <span className="text-blue-600">{icon}</span> {label}
      </Label>
      <select 
        id={id} 
        required 
        title={label}
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-xl bg-white border border-slate-200 px-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm cursor-pointer transition-all" 
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

interface FileUploadZoneProps {
  previewUrl: string | null;
  dragActive: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragActiveChange: (active: boolean) => void;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
}

function FileUploadZone({
  previewUrl,
  dragActive,
  fileInputRef,
  onDragActiveChange,
  onFileSelect,
  onClearFile
}: FileUploadZoneProps) {
  return (
    <div 
      className="relative"
      onDragEnter={(e) => { e.preventDefault(); onDragActiveChange(true); }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => onDragActiveChange(false)}
      onDrop={(e) => { 
        e.preventDefault(); 
        onDragActiveChange(false); 
        if (e.dataTransfer.files?.[0]) onFileSelect(e.dataTransfer.files[0]); 
      }}
    >
      {previewUrl ? (
        <div className="relative h-36 rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900 group">
          <img src={previewUrl} className="w-full h-full object-contain" alt="ID Scan Preview" />
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              type="button" 
              onClick={onClearFile} 
              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow hover:bg-red-700 transition-colors"
            >
              <Trash2 size={14} /> Remove Document
            </button>
          </div>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl bg-slate-50 cursor-pointer transition-all ${dragActive ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/20'}`}>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
            <UploadCloud size={20} />
          </div>
          <span className="text-xs font-bold uppercase text-slate-700">Click to upload or drag & drop ID document</span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">Supports PNG, JPG or WEBP (Max 5MB)</span>
          <input 
            ref={fileInputRef} 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }} 
          />
        </label>
      )}
    </div>
  );
}

function PasswordRequirements({ metrics }: { metrics: Record<string, boolean> }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-2">
      <SecurityBadge label="8+ Characters" met={metrics.length} />
      <SecurityBadge label="Letters" met={metrics.hasLetter} />
      <SecurityBadge label="Numbers" met={metrics.hasNumber} />
      <SecurityBadge label="Symbols" met={metrics.hasSymbol} />
      <SecurityBadge label="Passwords Match" met={metrics.match} className="col-span-2 md:col-span-4" />
    </div>
  );
}

function SecurityBadge({ label, met, className = "" }: { label: string; met: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {met ? <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" /> : <AlertCircle size={13} className="text-slate-300 flex-shrink-0" />}
      <span className={`text-[10px] font-bold uppercase tracking-tight ${met ? 'text-emerald-700' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}