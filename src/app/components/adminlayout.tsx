import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Ship, BarChart3, Settings, LogOut, 
  ShieldAlert, Menu, X, PersonStandingIcon, Printer 
} from 'lucide-react';
import { useAquaAuth } from '../../app/components/context/AquaRegCONTEXT';
import { Navigate } from "react-router-dom";
import { supabase } from '../../supabaseClient';



interface AdminLayoutProps {
  children?: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
  currentUser,
  loading,
  authInitialized,
} = useAquaAuth();

 const handleLogout = async () => {
  try {
   
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
  } catch (error) {
    console.warn("Sign out request failed, likely already signed out:", );
  } finally {
   
    window.location.href = '/login';
  }
};


   useEffect(() => {
  if (loading) return;

  if(!loading && authInitialized && !currentUser){
 navigate("/login");
}

 
}, [loading, currentUser, navigate]);

 
  const adminNavItems = [
    { label: 'Overview', path: '/admin', icon: <LayoutDashboard size={14} /> },
    { label: 'Audit', path: '/admin/audit-queue', icon: <Ship size={14} /> },
    { label: 'Permits', path: '/admin/permits', icon: <Printer size={14} /> }, 
    { label: 'Reports', path: '/admin/reports', icon: <BarChart3 size={14} /> },
    { label: 'Records', path: '/admin/records', icon: <Settings size={14} /> },
    { label: 'Inspectors', path: '/admin/accounts', icon: <PersonStandingIcon size={14} /> },
  ];

if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Authenticating...</p>
    </div>
  );
}

if (!currentUser) {
  return <Navigate to="/login" replace />;
}

if (currentUser.role !== "admin") {
  return <Navigate to="/login" replace />;
}
  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans antialiased text-slate-900">
      <nav className="print:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-2 group cursor-pointer" 
              onClick={() => navigate('/admin')}
            >
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-105">
                <ShieldAlert size={18} />
              </div>
              <span className="font-bold tracking-tight text-slate-900">AquaReg</span>
            </div>

            <div className="hidden lg:flex items-center gap-1">
              {adminNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                    location.pathname === item.path 
                      ? 'bg-slate-100 text-slate-900' 
                      : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon} {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right mr-2">
              <p className="text-[10px] font-bold text-slate-900 leading-none">{currentUser?.name || 'Admin'}</p>
              <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">System HQ</p>
            </div>
            
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              title="Logout"
            >
              <LogOut size={16} />
            </button>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-900"
            >
              {isMobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>
      </nav>

      
      {isMobileMenuOpen && (
        <div className="print:hidden fixed inset-0 z-[60] bg-white p-8 flex flex-col animate-in fade-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-12">
            <span className="font-black text-slate-900 text-xl tracking-tighter uppercase italic">Navigation</span>
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(false)} 
              className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center"
              aria-label="Close menu"
              title="Close menu"
            >
              <X size={24}/>
            </button>
          </div>
          <nav className="space-y-4">
            {adminNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                className={`w-full text-left text-3xl font-black uppercase tracking-tighter ${
                  location.pathname === item.path ? 'text-slate-900' : 'text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 animate-in fade-in duration-700">
          <div className="relative">
        
            {children || <Outlet />}
          </div>
        </div>
      </main>
    </div>
  );
}