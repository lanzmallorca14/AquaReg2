import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useState, type ChangeEvent } from 'react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Search, Shield, CheckCircle, XCircle, 
  AlertTriangle, Anchor, MapPin
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useAquaData } from '../components/context/AquaRegCONTEXT'; 
import BackToHome from '../backtohome';

export default function VerifyPermit() {
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Pull live records dynamically from the context
  const { Vessels = [] } = useAquaData();

  const handleVerify = () => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) {
      setVerificationResult({
        status: 'NOT_FOUND',
        message: 'Please enter a registration identifier, vessel ID, vessel name, or owner name to search.',
      });
      return;
    }

    const safeVessels = Array.isArray(Vessels) ? Vessels : [];
    
    // Find matching vessel from context checking all possible fields
    const foundVessel = safeVessels.find((v: any) => {
      if (!v) return false;
      const vId = String(v.id || v.registration_no || '').toUpperCase();
      const permitNo = String(v.permit_no || '').toUpperCase();
      const certificateNo = String(v.certificate_no || '').toUpperCase();
      const vName = String(v.vessel_name || v.boat_name || v.name || '').toUpperCase();
      const owner = String(v.owner_name || '').toUpperCase();
      
      return (
        vId === term || 
        vId.replace(/[-_\s]/g, '') === term.replace(/[-_\s]/g, '') ||
        vId.includes(term) ||
        permitNo.includes(term) ||
        certificateNo.includes(term) ||
        vName.includes(term) ||
        owner.includes(term)
      );
    });

    if (foundVessel) {
      const statusStr = String(foundVessel.status || 'PENDING').toLowerCase();
      let resultStatus = 'VALID';

      if (statusStr === 'expired') {
        resultStatus = 'EXPIRED';
      } else if (statusStr !== 'registered' && statusStr !== 'passed' && statusStr !== 'ready') {
        // If it's pending or flagged/etc, you can treat it as validly found or validate status
        resultStatus = 'VALID'; 
      }

      setVerificationResult({
        status: resultStatus,
        data: foundVessel,
      });
      return;
    }

    setVerificationResult({
      status: 'NOT_FOUND',
      message: 'No matching vessel record was found for that search term in the database context.',
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] opacity-30" />
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] opacity-60" />

      <BackToHome />

      <main className="max-w-5xl mx-auto w-full px-6 py-10 space-y-10">
        
        {/* --- HEADER SECTION --- */}
        <header className="border-b border-slate-100 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
              <Shield size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Enforcement Portal</span>
            </div>
            <h1 className="text-5xl font-black text-slate-950 tracking-tighter uppercase italic leading-none">
              Permit <span className="text-blue-600">Validator</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]"> Romblon Municipal Division</p>
          </div>
        </header>

        {/* --- SEARCH INTERFACE --- */}
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-sm border border-white">
          <CardContent className="p-10 flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 space-y-3 w-full">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Registration Identifier, Vessel ID, or Name</Label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <Input 
                  placeholder="Search by vessel, owner name, or ID..." 
                  className="h-16 pl-12 rounded-2xl border-slate-200 bg-white font-black text-lg shadow-inner focus:ring-8 focus:ring-blue-600/5 transition-all w-full" 
                  value={searchTerm} 
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()} 
                />
              </div>
            </div>
            <Button onClick={handleVerify} className="h-16 px-12 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-blue-200 w-full md:w-auto transition-all active:scale-95">
              Verify Authenticity
            </Button>
          </CardContent>
        </Card>

        {/* --- RESULTS AREA --- */}
        {verificationResult && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {verificationResult.status === 'VALID' && (
              <Card className="border-4 border-emerald-500 rounded-[3rem] shadow-2xl overflow-hidden bg-white">
                <div className="bg-emerald-500 p-8 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CheckCircle size={48} className="drop-shadow-lg" />
                    <div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter">VALID PERMIT</h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80"> Authorized Unit</p>
                    </div>
                  </div>
                  <Badge className="bg-white text-emerald-600 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest shadow-sm">
                    Context Live Sync
                  </Badge>
                </div>
                
                <CardContent className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <ResultItem label="Registry ID" value={verificationResult.data.id || verificationResult.data.registration_no} highlight />
                    <ResultItem label="Owner Name" value={verificationResult.data.owner_name} />
                    <ResultItem label="Vessel/Asset Name" value={verificationResult.data.vessel_name || verificationResult.data.boat_name} />
                    
                    <ResultItem label="Category" value={verificationResult.data.asset_category || verificationResult.data.type} color="text-blue-600" />
                    <ResultItem label="Home Barangay" value={verificationResult.data.barangay} />
                    <ResultItem label="Status" value={verificationResult.data.status || 'ACTIVE'} />

                    <div className="col-span-full border-t border-slate-100 pt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <ResultItem label="Length" value={verificationResult.data.hull_length ? `${verificationResult.data.hull_length}m` : '0.00m'} />
                        <ResultItem label="Breadth" value={verificationResult.data.hull_width ? `${verificationResult.data.hull_width}m` : '0.00m'} />
                        <ResultItem label="Gross Tonnage" value={verificationResult.data.tonnage_gross ? `${verificationResult.data.tonnage_gross} GT` : '0.00 GT'} />
                        <ResultItem label="Net Tonnage" value={verificationResult.data.tonnage_net ? `${verificationResult.data.tonnage_net} NT` : '0.00 NT'} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {verificationResult.status === 'EXPIRED' && (
                <Card className="border-4 border-amber-500 rounded-[3rem] overflow-hidden shadow-2xl bg-white">
                  <div className="bg-amber-500 p-8 text-white flex items-center gap-4">
                    <AlertTriangle size={48} />
                    <div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">PERMIT EXPIRED</h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Unauthorized for Maritime Activity</p>
                    </div>
                  </div>
                  <CardContent className="p-10 text-center space-y-4">
                    <ResultItem label="Asset ID" value={verificationResult.data.id || verificationResult.data.registration_no} highlight color="text-amber-600" />
                    <p className="text-slate-500 font-medium text-sm">
                      This registration for <span className="font-black uppercase italic text-slate-800">{verificationResult.data.vessel_name || verificationResult.data.boat_name}</span> has been flagged as <span className="text-amber-600 font-black">Expired</span> in Agriculture Database. 
                      Operating this unit without renewal constitutes a violation of Municipal Ordinance.
                    </p>
                  </CardContent>
                </Card>
            )}

            {verificationResult.status === 'NOT_FOUND' && (
                <Card className="border-4 border-rose-600 rounded-[3rem] overflow-hidden shadow-2xl bg-white">
                  <div className="bg-rose-600 p-8 text-white flex items-center gap-4">
                    <XCircle size={48} />
                    <div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter">NOT FOUND</h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Security Risk Detected</p>
                    </div>
                  </div>
                  <CardContent className="p-10 space-y-6">
                    <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl">
                      <p className="text-rose-900 font-bold uppercase text-xs mb-2">⚠ Enforcement Warning</p>
                      <p className="text-sm text-rose-700 leading-relaxed font-bold">
                        {verificationResult.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <InfoCard icon={<Anchor className="text-blue-600" />} title="Authorized Users" desc="Exclusively for PCG, Bantay Dagat, and Municipal Inspectors." />
           <InfoCard icon={<MapPin className="text-blue-600" />} title="Registry Scope" desc="Contains all Vessels registered in Romblon, Mimaropa." />
           <InfoCard icon={<Shield size={24} className="text-blue-600" />} title="Context Sync" desc="Live database verification against application registry state." />
        </div>
      </main>
    </div>
  );
}

function ResultItem({ label, value, highlight, color = "text-slate-900" }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      <p className={`font-black uppercase tracking-tight ${highlight ? 'text-2xl italic' : 'text-sm'} ${color}`}>
        {value || '---'}
      </p>
    </div>
  );
}

function InfoCard({ icon, title, desc }: any) {
  return (
    <Card className="border-none shadow-lg rounded-3xl bg-white/50 backdrop-blur-sm p-6 border border-white">
      <div className="mb-4">{icon}</div>
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">{title}</h4>
      <p className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</p>
    </Card>
  );
}