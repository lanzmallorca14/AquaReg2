import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, UserCheck, Lock, Mail, 
  ChevronRight, RefreshCcw, ShieldX, Clock,
  X, ShieldAlert, ArrowLeft, Eye, EyeOff 
} from 'lucide-react';
import { Button } from './components/ui/button';
import { toast } from 'sonner';
import { useAquaReg } from './components/context/AquaRegCONTEXT';
import Layout from './components/Layout';

interface InputFieldProps {
  icon: React.ReactNode;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  theme: 'blue' | 'indigo';
  disabled?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

function InputField({ 
  icon, label, type, placeholder, value, onChange, disabled, 
  showPasswordToggle, showPassword, onTogglePassword 
}: InputFieldProps) {
  return (
    <div className="space-y-2 text-left">
      <label className="text-[10px] font-black uppercase tracking-widest text-black px-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors">
          {icon}
        </div>
        <input 
          type={type} value={value} onChange={onChange} disabled={disabled}
          placeholder={placeholder} 
          className="w-full h-14 pl-12 pr-12 rounded-2xl bg-white/75 backdrop-blur-md border border-slate-300/80 outline-none focus:bg-white focus:border-slate-500 text-sm font-bold text-black placeholder-slate-400 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] disabled:opacity-50 disabled:cursor-not-allowed" 
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black transition-colors focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [role, setRole] = useState<'inspector' | 'admin'>('inspector');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [hp, setHp] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const { supabase, login } = useAquaReg();
  const navigate = useNavigate();
  const theme = role === 'admin' ? 'indigo' : 'blue';

  // --- PERSISTENT LOCKOUT CHECK ON MOUNT ---
  useEffect(() => {
    const lockedUntil = localStorage.getItem('aqua_lockout_until');
    if (lockedUntil) {
      const remainingTime = Math.ceil((Number(lockedUntil) - Date.now()) / 1000);
      if (remainingTime > 0) {
        setIsLocked(true);
        setCountdown(remainingTime);
      } else {
        localStorage.removeItem('aqua_lockout_until');
      }
    }
  }, []);

  // --- COUNTDOWN TIMER EFFECT ---
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isLocked && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsLocked(false);
            setAttempts(0);
            localStorage.removeItem('aqua_lockout_until');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isLocked, countdown]);

  const handleFailedAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    if (newAttempts >= 3) {
      const lockDuration = 30; // 30 seconds lockout
      const unlockTimestamp = Date.now() + lockDuration * 1000;
      localStorage.setItem('aqua_lockout_until', unlockTimestamp.toString());
      setIsLocked(true);
      setCountdown(lockDuration);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return;
    if (isLocked || loading) return;

    if (!formData.email || !formData.password) {
      toast.error("Required fields missing");
      return;
    }

    setLoading(true);
    const inputEmail = formData.email.toLowerCase().trim();
    const inputPass = formData.password.trim();

    try {
      // --- SPECIAL HANDLING FOR HARDCODED ADMIN ACCOUNT ---
      if (role === 'admin' && inputEmail === 'agricultureoffice@gov.ph' && inputPass === 'admin123') {
        const adminUser = {
          id: 'admin-master',
          email: inputEmail,
          name: 'LGU Administrator',
          role: 'admin',
          profile_status: 'approved'
        };
        localStorage.setItem('aqua_current_user', JSON.stringify(adminUser));

        try {
          if (typeof login === 'function') {
            await login(inputEmail, inputPass, 'admin');
          }
        } catch (loginErr) {
          console.warn("Context login warning for master admin, bypassing via local override.", loginErr);
        }
        toast.success("Admin Access Granted");
        setLoading(false);
        navigate("/admin", { replace: true });
        return;
      }

      let user: any = null;
      let isOfflineLogin = false;

      // --- 1. TRY ONLINE SUPABASE AUTHENTICATION FIRST ---
      if (navigator.onLine && supabase) {
        try {
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email: inputEmail,
              password: inputPass
            });

          if (authError || !authData.user) {
            toast.error("Invalid email or password");
            handleFailedAttempt();
            setLoading(false);
            return;
          }

          const { data: profile, error: profileError } =
            await supabase
              .from("personnel_profiles")
              .select("*")
              .eq("email", inputEmail)
              .maybeSingle();

          if (profileError || !profile) {
            toast.error("Personnel profile not registered");
            setLoading(false);
            return;
          }

          user = profile;
        } catch (err) {
          console.error("Online login failed:", err);
          isOfflineLogin = true;
        }
      } else {
        isOfflineLogin = true;
      }

      // --- 2. OFFLINE FALLBACK SEARCH (IndexedDB) ---
      if (isOfflineLogin || !user) {
        try {
          const { aquaOfflineDB } = await import("../offline/db");
          const db = await aquaOfflineDB;
          
          if (db.objectStoreNames.contains("personnel_profiles")) {
            const profiles = await db.getAll("personnel_profiles");
            user = profiles.find(
              (p:any)=>
              p.email?.toLowerCase().trim() === inputEmail &&
              p.offline_password === inputPass
            );
          } else {
            console.warn("Object store 'personnel_profiles' not found in IndexedDB. Skipping to localStorage.");
          }
        } catch (dbErr) {
          console.warn("Offline local DB search failed, falling back to localStorage:", dbErr);
        }
      }

      // BLOCK UNKNOWN INSPECTOR ACCOUNT
      if (role === "inspector" && !user) {
        toast.error("Unauthorized inspector account");
        handleFailedAttempt();
        setLoading(false);
        return;
      }

      // --- 4. STRICT STATUS VALIDATION ---
      const statusField = user?.profile_status || user?.status;
      
      if (statusField === "pending") {
        toast.error("Account Pending Approval by Administrator");
        setLoading(false);
        return;
      }

      if (statusField === "rejected") {
        toast.error("Account Access Rejected");
        setLoading(false);
        return;
      }

      if (role === 'inspector' && statusField && statusField !== "approved") {
        toast.error("Unauthorized: Only approved registered inspectors can proceed.");
        setLoading(false);
        return;
      }

      // --- 5. SESSION PERSISTENCE ---
      const offlineUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        idNumber: user.id_number,
        role: role,
        profile_status: "approved",
        offline_password: inputPass
      };

      localStorage.setItem('aqua_current_user', JSON.stringify(offlineUser));

      const existingOffline = JSON.parse(localStorage.getItem("aqua_offline_personnel") || "[]");
      const filtered = existingOffline.filter((p: any) => p.email !== user.email);
      filtered.push(offlineUser);
      localStorage.setItem("aqua_offline_personnel", JSON.stringify(filtered));

      if (role === "admin") {
        try {
          if (typeof login === 'function') {
            await login(inputEmail, inputPass, 'admin');
          } else if (supabase) {
            await supabase.auth.signInWithPassword({ email: inputEmail, password: inputPass });
          }
        } catch (adminAuthErr) {
          console.warn("Admin context login warning:", adminAuthErr);
        }
        toast.success("Admin Access Granted");
        setLoading(false);
        navigate("/admin", { replace: true });
        return;
      }

      try {
        if (typeof login === 'function') {
          await login(inputEmail, inputPass, 'inspector');
        } else if (supabase) {
          await supabase.auth.signInWithPassword({ email: inputEmail, password: inputPass });
        }
      } catch (inspectorAuthErr) {
        console.warn("Inspector context login warning, proceeding with offline session profile:", inspectorAuthErr);
      }

      toast.success(`Welcome back, ${user.name || 'Personnel'} ${!navigator.onLine ? '(Offline Mode)' : ''}`);
      setLoading(false);
      navigate("/inspector", { replace: true });

    } catch (error: any) {
      console.error("Login execution error:", error);
      if (!navigator.onLine) {
        toast.error("Offline Error: Cannot verify approval status offline without local caching.");
        setLoading(false);
        return;
      }
      toast.error(error.message || "Login failed due to an unexpected error");
      handleFailedAttempt();
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="w-full min-h-[85vh] flex flex-col items-center justify-center relative px-4 text-black">
        
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <div className="bg-white/90 backdrop-blur-xl w-full max-w-[320px] rounded-[2.5rem] shadow-2xl border border-white/40 overflow-hidden text-black">
              <div className="bg-slate-100/60 p-6 flex justify-center relative border-b border-slate-200/60">
                <button 
                  type="button"
                  onClick={() => setShowAdminModal(false)} 
                  aria-label="Close protocol modal"
                  className="absolute top-4 right-4 text-slate-500 hover:text-black transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-16 h-16 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-800 border border-slate-200 shadow-inner">
                  <ShieldAlert size={32} />
                </div>
              </div>
              <div className="p-8 text-center space-y-4">
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-black">Security Protocol</h3>
                <p className="text-xs text-black font-medium leading-relaxed">Administrative root credentials cannot be reset through recovery.</p>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Contact Required</p>
                  <p className="text-xs font-black text-black uppercase italic leading-tight">Contact the Office Programmer for security changes.</p>
                </div>
                <Button type="button" onClick={() => setShowAdminModal(false)} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest h-12 border border-slate-700 shadow-lg">Understood</Button>
              </div>
            </div>
          </div>
        )}

        <input 
          type="text" 
          className="sr-only" 
          value={hp} 
          onChange={e => setHp(e.target.value)} 
          tabIndex={-1} 
          autoComplete="off" 
          aria-label="Human verification honeypot"
        />

        {/* --- TOP LEFT BACK BUTTON --- */}
        <div className="absolute top-0 left-0">
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/60 text-black font-black uppercase text-[10px] tracking-widest backdrop-blur-md transition-all shadow-lg active:scale-95"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>
        </div>

        {/* --- CENTERED LOGIN CARD --- */}
        <div className="w-full max-w-[500px] mt-6">
          <div className="text-center mb-6 space-y-2">
            <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg mb-3 text-white transition-all duration-500 border border-white/40 bg-blue-600/90 backdrop-blur-md">
              {isLocked ? <ShieldX size={30} /> : role === 'admin' ? <ShieldCheck size={30} /> : <UserCheck size={30} />}
            </div>
            <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none">
              {isLocked ? 'Locked' : 'Staff Login'}
            </h2>
            <p className="text-black text-xs font-black uppercase tracking-widest">
              {isLocked ? 'Protocol: Brute Force Prevention' : role === 'admin' ? 'LGU Agriculture Office' : 'Field Inspection Portal'}
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
            {!isLocked && (
              <div className="flex p-2 bg-slate-200/40 backdrop-blur-md border-b border-white/30">
                {(['inspector', 'admin'] as const).map((r) => (
                  <button 
                    key={r} type="button" disabled={loading}
                    onClick={() => setRole(r)} 
                    className={`flex-1 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${role === r ? 'bg-white/80 backdrop-blur-md shadow-sm text-black border border-white/60' : 'text-slate-500 hover:text-black'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              {isLocked && (
                <div className="flex items-center gap-4 p-5 bg-red-100/80 backdrop-blur-md border border-red-300/70 rounded-2xl text-black">
                  <Clock size={24} className="text-red-600 animate-spin" />
                  <div>
                    <p className="text-xs font-black uppercase text-red-700 leading-none">Security Hold</p>
                    <p className="text-xl font-black text-black tabular-nums">00:{countdown < 10 ? `0${countdown}` : countdown}</p>
                  </div>
                </div>
              )}

              <InputField 
                icon={<Mail size={20} />} label="Official Email" type="email" placeholder="user@romblon.gov" 
                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                theme={theme} disabled={isLocked || loading}
              />

              <InputField 
                icon={<Lock size={20} />} 
                label="Security Key" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                theme={theme} 
                disabled={isLocked || loading}
                showPasswordToggle={true}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              <Button 
                type="submit" 
                disabled={isLocked || loading}
                className={`w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-slate-700/20 ${isLocked ? 'bg-slate-300 text-slate-500 border-slate-300' : 'bg-slate-900 hover:bg-slate-800'}`}
              >
                {loading ? <RefreshCcw size={18} className="animate-spin" /> : <>Authorize Access <ChevronRight size={16} /></>}
              </Button>

              <div className="pt-2 flex flex-col items-center gap-3">
                {!isLocked && (
                  <>
                    {role === "admin" ? (
                      <button 
                        type="button"
                        onClick={() => setShowAdminModal(true)}
                        className="text-xs font-black uppercase tracking-widest text-black hover:text-blue-700 transition-colors underline-offset-4 hover:underline"
                      >
                        Forgot Security Key?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/RecoveryPage', { replace: true })}
                        className="text-xs font-black uppercase tracking-widest text-black hover:text-blue-700 transition-colors underline-offset-4 hover:underline"
                      >
                        Recover Password
                      </button>
                    )}

                    {role === 'inspector' && (
                      <button 
                        type="button" 
                        onClick={() => navigate('/register', { replace: true })} 
                        className="text-xs font-black uppercase tracking-widest text-black"
                      >
                        New Personnel? <span className="text-blue-700 underline font-black">register</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}