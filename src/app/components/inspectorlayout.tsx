import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  ClipboardCheck, 
  History, 
  LogOut, 
  Anchor, 
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { useAquaAuth, useAquaData } from '../../app/components/context/AquaRegCONTEXT';

interface InspectorLayoutProps {
  children?: ReactNode;
}

export default function InspectorLayout({ children }: InspectorLayoutProps) {
  const { currentUser, logout, loading } = useAquaAuth(); 
  const { inspectors } = useAquaData(); 
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profile = React.useMemo(() => {
    if (!currentUser) return null;
    return inspectors.find(ins => ins.email.toLowerCase() === currentUser.email.toLowerCase());
  }, [currentUser, inspectors]);

  // AUTH GUARD
  useEffect(() => {
    if (!loading) {
      if (!currentUser || currentUser.role !== 'inspector') {
        navigate('/login', { replace: true });
      }
    }
  }, [currentUser, loading, navigate]);

  const navItems = [
    { label: 'Dashboard', path: '/inspector', icon: <ClipboardCheck size={14} /> },
    { label: 'COI Management', path: '/inspector/inspection', icon: <History size={14} /> },
    { label: 'Records', path: '/inspector/records', icon: <BarChart3 size={14} /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return null; 
  if (!currentUser || currentUser.role !== 'inspector') return null;

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans antialiased text-slate-900">
      
      {/* MAIN NAVBAR */}
      <nav className="print:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-2 group cursor-pointer" 
              onClick={() => navigate('/inspector')}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-105 shadow-lg shadow-blue-200">
                <Anchor size={18} strokeWidth={3} />
              </div>
              <span className="font-bold tracking-tight text-slate-900">AquaReg <span className="text-blue-600 italic">Field</span></span>
            </div>

            {/* DESKTOP NAV */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                    location.pathname === item.path 
                      ? 'bg-blue-50 text-blue-700' 
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
              <p className="text-[10px] font-bold text-slate-900 leading-none">{profile?.name || currentUser.name}</p>
              <p className="text-[9px] text-blue-500 font-black mt-1 uppercase tracking-tighter italic">
                {profile?.barangay ? `Brgy. ${profile.barangay}` : 'Field Inspector'}
              </p>
            </div>
            
            <button 
              onClick={handleLogout}
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

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="print:hidden fixed inset-0 z-[60] bg-white p-8 flex flex-col animate-in fade-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-12">
            <span className="font-black text-slate-900 text-xl tracking-tighter uppercase italic">Inspector Portal</span>
            <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close mobile menu" className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <X size={24}/>
            </button>
          </div>
          <nav className="space-y-4">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                className={`w-full text-left text-3xl font-black uppercase tracking-tighter ${
                  location.pathname === item.path ? 'text-blue-600' : 'text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-700">
          <section className="relative">
            {children || <Outlet />}
          </section>
        </div>
      </main>
    </div>
  );
}