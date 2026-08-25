import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Lock, MapPin, 
  Phone, ShieldCheck, 
  Mail, UploadCloud, Trash2, ShieldAlert,
  ChevronLeft, AlertCircle, CheckCircle2,
  Eye, EyeOff, BadgeAlert, Briefcase, Calendar, Heart, Award, CreditCard
} from 'lucide-react';
import { Input } from './components/ui/input'; 
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import type { FormEvent } from "react";
import { toast } from 'sonner';
import { useAquaData, useAquaReg } from '../app/components/context/AquaRegCONTEXT';

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

/**
 * COMPRESSION ENGINE: Scales down and compresses uploaded image documents
 * to make sure they fit perfectly inside standard database text/json columns.
 */

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supabase } = useAquaReg();
  const currentView = location.state?.view || 'signup';

  const [view, setView] = useState<'register' | 'reset'>(
    currentView === 'reset' ? 'reset' : 'register'
  );

  const idInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dragActiveId, setDragActiveId] = useState(false);

  // Form Field States
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female'>('Male');
  const [position, setPosition] = useState('');
  const [yearsInService, setYearsInService] = useState('');
  const [cellphone, setCellphone] = useState('');
  useAquaData();

  // Native File Objects
  const [idFile, setIdFile] = useState<File | undefined>(undefined);
  
  // UI Previews
  const [idPreview, setIdPreview] = useState<string | null>(null);
  
  // --- VALIDATION METRICS ---
  const securityMetrics = useMemo(() => {
    const p = password || '';
    return {
      length: p.length >= 8,
      hasLetter: /[a-zA-Z]/.test(p),
      hasNumber: /\d/.test(p),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(p),
      match: p === confirmPassword && p !== ''
    };
  }, [password, confirmPassword]);

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const cellphoneIsValid = useMemo(() => /^(09|\+639)\d{9}$/.test(cellphone), [cellphone]);
  
  const ageIsValid = useMemo(() => {
    const numAge = parseInt(age, 10);
    return !isNaN(numAge) && numAge >= 18 && numAge <= 90;
  }, [age]);

  const serviceIsValid = useMemo(() => {
    const yrs = parseInt(yearsInService, 10);
    return !isNaN(yrs) && yrs >= 0 && yrs <= 60;
  }, [yearsInService]);

  const isSecureEnough = Object.values(securityMetrics).every(Boolean);
  const LabelStyle = "text-[10px] font-black uppercase text-slate-600 tracking-widest px-1 flex items-center gap-2 mb-2";

  const handleFileChange = (file: File, type: 'id' | 'signature') => {
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("File Too Large", { description: "Scanned documents must be under 5MB." });
    }

    const url = URL.createObjectURL(file);

    if (type === 'id') {
      idPreview && URL.revokeObjectURL(idPreview);
      setIdFile(file);
      setIdPreview(url);
      toast.success("Identity Proof Loaded");
    } 
  };

  const clearFile = (type: 'id' | 'signature') => {
    if (type === 'id') {
      setIdFile(undefined);
      idPreview && URL.revokeObjectURL(idPreview);
      setIdPreview(null);
      if (idInputRef.current) idInputRef.current.value = "";
    } 
  };

  const isIdentityVerified = view === 'reset' || (!!idFile);
  const isFormValid = view === 'register' 
    ? (isSecureEnough && isIdentityVerified && emailIsValid && cellphoneIsValid && ageIsValid && serviceIsValid && name && idNumber && barangay && position && sex)
    : (isSecureEnough && emailIsValid);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error("Validation Error", { description: "Please complete all fields correctly." });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. SIGN UP THE USER
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: name.trim().toUpperCase(),
            Phone: cellphone.trim(),
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Authentication failed.");

      const userId = authData.user.id;

      // 2. UPLOAD IMAGE (using the new user's ID)
      const idImageUrl = idFile ? await uploadIdScan(idFile, userId) : "";

      // 3. PREPARE PAYLOAD
      const payload = {
        id: userId,
        name: name.trim().toUpperCase(),
        id_number: idNumber.trim(),
        email: email.trim().toLowerCase(),
        cellphone: cellphone.trim(),
        position: position,
        age: Number(age) || 0,
        sex: sex,
        years_in_service: Number(yearsInService) || 0,
        barangay: barangay,
        municipal_id_image: idImageUrl,
        role: "inspector",
        profile_status: "pending",
      };

      // 4. INSERT INTO DATABASE
      const { error: profileError } = await supabase
        .from("personnel_profiles")
        .insert([payload]);

      if (profileError) throw profileError;

      toast.success("Enrollment Successful! Please verify your email.");
      navigate("/");

    } catch (err: any) {
      console.error("Submission Error:", err);
      toast.error("Process Failed", { description: err.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadIdScan = async (
    file: File,
    userId: string
  ): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("id-scans")
      .upload(fileName, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("id-scans")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-indigo-50/50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Background ambient lighting blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-cyan-300/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-white/75 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white/80 overflow-hidden relative z-10">
        
        <button 
          type="button" 
          onClick={() => navigate('/login')} 
          aria-label="Return to login portal page"
          title="Back to Access Login Portal"
          className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all group z-10"
        >
          <div className="w-8 h-8 rounded-full border border-white/90 bg-white/60 backdrop-blur-md flex items-center justify-center group-hover:bg-white/90 shadow-sm">
            <ChevronLeft size={16} />
          </div>
          Back to Access
        </button>

        <div className="p-10 pb-0 mt-4 flex flex-col items-center text-center">
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 backdrop-blur-md border border-white/60 ${view === 'register' ? 'bg-slate-950/90' : 'bg-amber-500/90'}`}>
              {view === 'register' ? <User size={28} /> : <ShieldAlert size={28} />}
           </div>
           <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              {view === 'register' ? 'Personnel Enrollment' : 'Identity Recovery'}
           </h1>
           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">AquaReg Security Protocol Phase 02</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* DATA ATTRIBUTES COLUMN */}
            <div className="space-y-5">
              <SectionDivider label="Verification Details" />
              
              {view === 'register' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className={LabelStyle}><User size={14} /> Full Name</Label>
                    <Input id="fullName" required placeholder="JUAN DELA CRUZ" className="h-11 rounded-xl bg-white/70 backdrop-blur-md border-white/90 font-bold text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idNumber" className={LabelStyle}><CreditCard size={14} /> ID Number</Label>
                    <Input id="idNumber" required placeholder="MFO-ROM-2026-XXXX" className="h-11 rounded-xl bg-white/70 backdrop-blur-md border-white/90 font-bold text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailAddress" className={LabelStyle}><Mail size={14} /> Email</Label>
                  <div className="relative">
                    <Input id="emailAddress" required type="email" placeholder="name@gov.ph" className={`h-11 rounded-xl bg-white/70 backdrop-blur-md border-white/90 pr-8 text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${email && !emailIsValid ? 'border-red-300' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {email && (emailIsValid ? <CheckCircle2 size={14} className="text-green-500" /> : <BadgeAlert size={14} className="text-red-400" />)}
                    </div>
                  </div>
                </div>

                {view === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber" className={LabelStyle}><Phone size={14} /> Contact No.</Label>
                    <div className="relative">
                      <Input id="contactNumber" required type="tel" placeholder="09xxxxxxxxx" className={`h-11 rounded-xl bg-white/70 backdrop-blur-md border-white/90 pr-8 text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${cellphone && !cellphoneIsValid ? 'border-red-300' : ''}`} value={cellphone} onChange={(e) => setCellphone(e.target.value)} />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        {cellphone && (cellphoneIsValid ? <CheckCircle2 size={14} className="text-green-500" /> : <BadgeAlert size={14} className="text-red-400" />)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {view === 'register' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="systemPosition" className={LabelStyle}><Briefcase size={14} /> System Position</Label>
                      <select 
                        id="systemPosition" 
                        required 
                        title="Select System Position Assignment" 
                        className="w-full h-11 rounded-xl bg-white/70 backdrop-blur-md border border-white/90 px-3 text-xs font-semibold text-slate-700 focus:outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" 
                        value={position} 
                        onChange={(e) => setPosition(e.target.value)}
                      >
                        <option value="" disabled>Select Assignment</option>
                        {AVAILABLE_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="personnelAge" className={LabelStyle}><Calendar size={14} /> Age</Label>
                      <Input id="personnelAge" required type="number" placeholder="25" min="18" max="90" className={`h-11 rounded-xl bg-white/70 backdrop-blur-md border-white/90 font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${age && !ageIsValid ? 'border-red-300' : ''}`} value={age} onChange={(e) => setAge(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-2">
                      <Label htmlFor="biologicalSex" className={LabelStyle}><Heart size={14} /> Sex</Label>
                      <select 
                        id="biologicalSex" 
                        required 
                        title="Select Biological Sex" 
                        className="w-full h-11 rounded-xl bg-white/70 backdrop-blur-md border border-white/90 px-2 text-xs font-semibold text-slate-700 focus:outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" 
                        value={sex} 
                        onChange={(e) => setSex(e.target.value as 'Male' | 'Female')}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="col-span-1 space-y-2">
                      <Label htmlFor="yearsInService" className={LabelStyle}><Award size={14} /> Service Yrs</Label>
                      <Input id="yearsInService" required type="number" placeholder="0" min="0" max="60" className={`h-11 rounded-xl bg-white/70 backdrop-blur-md border-white/90 font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${yearsInService && !serviceIsValid ? 'border-red-300' : ''}`} value={yearsInService} onChange={(e) => setYearsInService(e.target.value)} />
                    </div>

                    <div className="col-span-1 space-y-2">
                      <Label htmlFor="assignedBarangay" className={LabelStyle}><MapPin size={14} /> Barangay</Label>
                      <select 
                        id="assignedBarangay" 
                        required 
                        title="Select Operational Barangay Assignment" 
                        className="w-full h-11 rounded-xl bg-white/70 backdrop-blur-md border border-white/90 px-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" 
                        value={barangay} 
                        onChange={(e) => setBarangay(e.target.value)}
                      >
                        <option value="" disabled>Brgy</option>
                        {AVAILABLE_BARANGAYS.map((brgy) => <option key={brgy} value={brgy}>{brgy}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* DRAG AND DROP FILE COLUMN */}
            {view === 'register' ? (
              <div className="flex flex-col space-y-4 justify-between">
                <div className="space-y-2">
                  <SectionDivider label="Municipal Identity Scan" />
                  <div 
                    className="relative"
                    onDragEnter={(e) => { e.preventDefault(); setDragActiveId(true); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={() => setDragActiveId(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActiveId(false); if(e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0], 'id'); }}
                  >
                    {idPreview ? (
                      <div className="relative h-28 rounded-2xl overflow-hidden border border-white/90 shadow-inner bg-white/60 backdrop-blur-md">
                        <img src={idPreview} className="w-full h-full object-cover" alt="ID Scan Preview" />
                        <button 
                          type="button" 
                          onClick={() => clearFile('id')} 
                          aria-label="Remove identity file" 
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-2xl bg-white/60 backdrop-blur-md cursor-pointer transition-all ${dragActiveId ? 'border-blue-500 bg-blue-50/50' : 'border-white/90 hover:bg-white/80'}`}>
                        <UploadCloud size={24} className={`mb-1 ${dragActiveId ? 'text-blue-500' : 'text-slate-400'}`} />
                        <span className="text-[9px] font-black uppercase text-slate-500">Upload or Drop ID Document</span>
                        <input ref={idInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleFileChange(e.target.files[0], 'id'); }} />
                      </label>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col justify-center items-center bg-white/60 backdrop-blur-md rounded-[2rem] p-6 text-center border border-white/90 h-full min-h-[240px] shadow-sm">
                <ShieldAlert size={36} className="text-amber-500 mb-2" />
                <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider mb-1">Recovery Mode Active</h4>
                <p className="text-[11px] text-slate-500 font-medium max-w-[200px]">Provide your registered email and set a new compliant security authorization key.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <SectionDivider label="New Security Key" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2 relative">
                  <Label htmlFor="securityKey" className={LabelStyle}><Lock size={14} /> New Password</Label>
                  <div className="relative">
                    <Input id="securityKey" required type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-11 rounded-xl bg-white/70 backdrop-blur-md border-white/90 pr-10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
               </div>
               <div className="space-y-2">
                  <Label htmlFor="confirmSecurityKey" className={LabelStyle}><ShieldCheck size={14} /> Confirm</Label>
                  <Input id="confirmSecurityKey" required type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-11 rounded-xl bg-white/70 backdrop-blur-md border-white/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
               </div>
            </div>

            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 grid grid-cols-2 gap-2 border border-white/90 shadow-sm">
              <SecurityReq label="8+ Characters" met={securityMetrics.length} />
              <SecurityReq label="Contains Letter" met={securityMetrics.hasLetter} />
              <SecurityReq label="Contains Number" met={securityMetrics.hasNumber} />
              <SecurityReq label="Special Symbol" met={securityMetrics.hasSymbol} />
              <SecurityReq label="Keys Match" met={securityMetrics.match} className="col-span-2" />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={!isFormValid || isSubmitting}
            className={`w-full h-16 rounded-2xl font-black uppercase text-xs tracking-widest text-white shadow-xl transition-all 
              ${isFormValid ? 'bg-slate-950 hover:bg-blue-600' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            {isSubmitting ? 'Verifying Protocol...' : view === 'register' ? 'Authorize Enrollment' : 'Execute Recovery Protocol'}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setView(view === 'register' ? 'reset' : 'register')}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
            >
              {view === 'register' ? 'Need to recover identity key?' : 'Return to personnel enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SecurityReq({ label, met, className = "" }: { label: string; met: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {met ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-slate-300" />}
      <span className={`text-[8px] font-black uppercase tracking-tighter ${met ? 'text-green-600' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="h-[1px] bg-white/90 flex-1" />
      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
      <div className="h-[1px] bg-white/90 flex-1" />
    </div>
  );
}