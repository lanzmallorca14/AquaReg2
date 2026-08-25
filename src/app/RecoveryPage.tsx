import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCcw, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from './components/ui/button';
import { toast } from 'sonner';
import { useAquaReg } from './components/context/AquaRegCONTEXT';
import Layout from './components/Layout';

export default function RecoveryPage() {
  const navigate = useNavigate();
  const { supabase } = useAquaReg();

  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [recoveryData, setRecoveryData] = useState({
    fullName: "",
    age: "",
    email: "",
    municipalId: "",
    municipalIdImage: null as File | null,
    oldPassword: "",
    newPassword: ""
  });

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      return { label: "Too Weak", color: "text-red-600", score };
    }
    if (score === 3 || score === 4) {
      return { label: "Moderate", color: "text-amber-600", score };
    }
    return { label: "Strong", color: "text-emerald-700", score };
  };

  const handleInspectorRecovery = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (loading) return;

    try {
      const strength = checkPasswordStrength(recoveryData.newPassword);

      if (strength.label !== "Strong") {
        toast.error("Password must be Strong before submitting.");
        return;
      }

      if (
        !recoveryData.fullName ||
        !recoveryData.age ||
        !recoveryData.email ||
        !recoveryData.municipalId ||
        !recoveryData.municipalIdImage ||
        !recoveryData.oldPassword ||
        !recoveryData.newPassword
      ) {
        toast.error("Complete all recovery fields and upload your Municipal ID scan.");
        return;
      }

      if (recoveryData.municipalIdImage.size > 5 * 1024 * 1024) {
        toast.error("ID scan file size must be less than 5MB");
        return;
      }

      if (!recoveryData.municipalIdImage.type.startsWith("image/")) {
        toast.error("Municipal ID scan must be a valid image file");
        return;
      }

      setLoading(true);
      const email = recoveryData.email.toLowerCase().trim();

      const { data: user, error: userError } = await supabase
        .from("personnel_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (userError) {
        toast.error("An error occurred while verifying records");
        setLoading(false);
        return;
      }

      if (!user) {
        toast.error("Personnel not found in records");
        setLoading(false);
        return;
      }

      if (user.name.toLowerCase().trim() !== recoveryData.fullName.toLowerCase().trim()) {
        toast.error("Name does not match records");
        setLoading(false);
        return;
      }

      if (Number(user.age) !== Number(recoveryData.age)) {
        toast.error("Age does not match records");
        setLoading(false);
        return;
      }

      if (user.id_number !== recoveryData.municipalId) {
        toast.error("Municipal ID does not match records");
        setLoading(false);
        return;
      }

      const { error: oldPasswordError } = await supabase.auth.signInWithPassword({
        email,
        password: recoveryData.oldPassword
      });

      if (oldPasswordError) {
        toast.error("Old password is incorrect");
        setLoading(false);
        return;
      }

      let imageUrl = null;
      const fileExt = recoveryData.municipalIdImage.name.split('.').pop();
      const fileName = `recovery/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("id-scans")
        .upload(fileName, recoveryData.municipalIdImage, {
          upsert: true,
          contentType: recoveryData.municipalIdImage.type,
        });

      if (uploadError) {
        toast.error("Failed to upload Municipal ID scan image");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("id-scans")
        .getPublicUrl(fileName);

      imageUrl = urlData?.publicUrl || null;

      if (!imageUrl) {
        toast.error("Could not generate public URL for ID scan image");
        setLoading(false);
        return;
      }

      const { error: requestError } = await supabase
        .from("password_recovery_requests")
        .insert({
          inspector_email: email,
          full_name: recoveryData.fullName,
          age: Number(recoveryData.age),
          municipal_id: recoveryData.municipalId,
          municipal_id_image: imageUrl,
          requested_password: recoveryData.newPassword, 
          status: "pending",
          created_at: new Date().toISOString()
        });

      if (requestError) {
        toast.error("Failed to save request: " + requestError.message);
        setLoading(false);
        return;
      }

      toast.success("Password change request sent successfully.");
      setIsSubmitted(true);

    } catch (error: any) {
      toast.error(error?.message || "Recovery process failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="w-full min-h-[85vh] flex flex-col items-center justify-center relative px-4 py-6 text-black">
        
        {/* --- TOP LEFT BACK BUTTON --- */}
        <div className="absolute top-0 left-0">
          <button 
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/80 hover:bg-white border border-slate-300 text-black font-black uppercase text-[10px] tracking-widest backdrop-blur-md transition-all shadow-lg active:scale-95"
          >
            <ChevronLeft size={16} /> Back to Login
          </button>
        </div>

        {/* --- CENTERED & WIDER RECOVERY CONTAINER --- */}
        <div className="w-full max-w-[500px] mt-6">
          <div className="text-center mb-6 space-y-2">
            <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg mb-3 text-white bg-blue-600 border border-slate-300">
              <KeyRound size={30} />
            </div>
            <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none">
              Inspector Recovery
            </h2>
            <p className="text-black text-xs font-black uppercase tracking-widest">
              Verify identity to request password update
            </p>
          </div>

          <div className="bg-white/85 backdrop-blur-3xl border border-slate-300 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] overflow-hidden">
            
            {isSubmitted ? (
              <div className="p-10 text-center space-y-6 text-black">
                <div className="w-20 h-20 bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-[2rem] mx-auto flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={40} />
                </div>

                <div className="space-y-3">
                  <h2 className="text-xl font-black uppercase tracking-tight text-black">Request Successfully Submitted</h2>
                  <p className="text-xs text-black leading-relaxed font-bold">
                    Your password change request and identification scans have been securely queued for administrative review. Once approved by an administrator, your new password will take effect.
                  </p>
                </div>

                <div className="bg-slate-100 border border-slate-300 p-4 rounded-2xl flex items-center gap-3 text-left">
                  <ShieldCheck className="text-blue-700 shrink-0" size={22} />
                  <p className="text-[10px] text-black font-black uppercase tracking-wider">
                    Status: Pending Admin Authorization
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-300 shadow-lg"
                >
                  Return to Login Portal
                </Button>
              </div>
            ) : (
              <div className="p-10 space-y-6 overflow-y-auto max-h-[75vh]">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black px-1">Full Name</label>
                  <input
                    placeholder="Enter your full registered name"
                    value={recoveryData.fullName}
                    disabled={loading}
                    onChange={e => setRecoveryData({ ...recoveryData, fullName: e.target.value })}
                    className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-4 text-sm font-bold text-black placeholder-slate-400 focus:bg-white focus:border-slate-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black px-1">Age</label>
                    <input
                      placeholder="Age"
                      type="number"
                      value={recoveryData.age}
                      disabled={loading}
                      onChange={e => setRecoveryData({ ...recoveryData, age: e.target.value })}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-4 text-sm font-bold text-black placeholder-slate-400 focus:bg-white focus:border-slate-500 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black px-1">Municipal ID Number</label>
                    <input
                      placeholder="ID Number"
                      value={recoveryData.municipalId}
                      disabled={loading}
                      onChange={e => setRecoveryData({ ...recoveryData, municipalId: e.target.value })}
                      className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-4 text-sm font-bold text-black placeholder-slate-400 focus:bg-white focus:border-slate-500 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black px-1">Registered Email</label>
                  <input
                    placeholder="name@email.com"
                    type="email"
                    value={recoveryData.email}
                    disabled={loading}
                    onChange={e => setRecoveryData({ ...recoveryData, email: e.target.value })}
                    className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-4 text-sm font-bold text-black placeholder-slate-400 focus:bg-white focus:border-slate-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-white space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black block">Upload Municipal ID Photo Scan (Required)</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={loading}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setRecoveryData({ ...recoveryData, municipalIdImage: e.target.files[0] });
                      }
                    }}
                    className="w-full text-xs text-black file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black px-1">Old / Current Password</label>
                  <input
                    placeholder="Enter previous password"
                    type="password"
                    value={recoveryData.oldPassword}
                    disabled={loading}
                    onChange={e => setRecoveryData({ ...recoveryData, oldPassword: e.target.value })}
                    className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-4 text-sm font-bold text-black placeholder-slate-400 focus:bg-white focus:border-slate-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black">New Password</label>
                    {recoveryData.newPassword && (
                      <span className={`text-[10px] font-black uppercase ${checkPasswordStrength(recoveryData.newPassword).color}`}>
                        {checkPasswordStrength(recoveryData.newPassword).label}
                      </span>
                    )}
                  </div>
                  <input
                    placeholder="Enter strong new password"
                    type="password"
                    value={recoveryData.newPassword}
                    disabled={loading}
                    onChange={e => setRecoveryData({ ...recoveryData, newPassword: e.target.value })}
                    className="w-full h-14 rounded-2xl bg-white border border-slate-300 px-4 text-sm font-bold text-black placeholder-slate-400 focus:bg-white focus:border-slate-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={loading}
                    onClick={() => navigate('/login', { replace: true })}
                    className="w-1/2 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={16} /> Back to Login
                  </Button>
                  <Button 
                    type="button" 
                    disabled={loading}
                    onClick={handleInspectorRecovery}
                    className="w-1/2 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-300 shadow-lg"
                  >
                    {loading ? <RefreshCcw size={16} className="animate-spin" /> : "Submit Request"}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}