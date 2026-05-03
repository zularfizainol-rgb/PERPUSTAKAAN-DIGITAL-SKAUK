import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { LogOut, BookOpen, Library, LineChart, Edit3, ShieldAlert, FileText, Trophy, PlusCircle, Sparkles, Settings, Key, X } from 'lucide-react';

export function Layout() {
  const { user, profile, loading, logout, signInWithGoogle, signInWithPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleAdminAuth = () => {
    setShowPasswordPrompt(true);
    setPasswordInput('');
    setPasswordError('');
  };

  const submitPassword = async () => {
    if (!passwordInput) return;
    
    if (passwordInput !== 'skauk0053') {
      setPasswordError('Kata laluan salah. Sila cuba lagi.');
      return;
    }
    
    setPasswordError('');
    
    try {
      await signInWithPassword(passwordInput);
      setShowPasswordPrompt(false);
      navigate('/admin');
    } catch (error: any) {
      console.error("Login error", error);
      setPasswordError(error.message || 'Gagal log masuk. Sila periksa sambungan internet.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 border-b border-indigo-600 sticky top-0 z-20 shadow-lg shadow-indigo-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm mr-4 shadow-inner">
                <Library className="h-8 w-8 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-2xl text-white tracking-tight drop-shadow-sm flex items-center">
                  Perpustakaan Digital Pintar
                  <Sparkles className="w-5 h-5 ml-2 text-yellow-300 animate-pulse" />
                </span>
                <span className="text-indigo-100 font-medium text-sm hidden sm:block opacity-90 drop-shadow-sm">Jom Membaca Bersama-sama! 📚✨</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {loading ? null : user ? (
                <div className="flex items-center text-sm font-bold text-white bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/20 shadow-inner">
                  <span className="hidden sm:inline-block mr-3 opacity-90">
                    Admin
                  </span>
                  <button
                    onClick={async () => { await logout(); window.location.href = '/'; }}
                    className="p-1 text-indigo-100 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                    title="Log Keluar"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <button
                    onClick={handleAdminAuth}
                    className="text-sm font-bold text-indigo-700 bg-white hover:bg-indigo-50 px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-105 flex items-center"
                  >
                    <ShieldAlert className="w-4 h-4 mr-2 text-indigo-500" />
                    Log Masuk Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Admin Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative shadow-2xl animate-in zoom-in duration-200 border-2 border-indigo-100">
            <button
              onClick={() => setShowPasswordPrompt(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-6">
              <div className="bg-indigo-100 p-4 rounded-full">
                <Key className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 text-center mb-2">Log Masuk Admin</h3>
            <p className="text-slate-500 font-medium text-center mb-6 text-sm">Sertakan kata laluan untuk meneruskan</p>
            <div className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Kata laluan"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-500 text-xs font-bold mt-2 ml-1">{passwordError}</p>
                )}
              </div>
              <button
                onClick={submitPassword}
                className="w-full font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-xl shadow-md shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
              >
                Sahkan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex mt-8 flex-1 pb-28">
        <main className="w-full min-w-0">
          <Outlet />
        </main>
      </div>

      <aside className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="flex overflow-x-auto space-x-2 sm:space-x-4 no-scrollbar items-center pb-1">
            <NavLink to="/" icon={<Sparkles />} text="Halaman Utama" current={location.pathname === '/'} colorClass="text-indigo-500" bgClass="bg-indigo-50" activeBg="bg-indigo-500" activeShadow="shadow-indigo-500/30" />
            <NavLink to="/catalog" icon={<BookOpen />} text="Katalog Buku" current={location.pathname === '/catalog' || location.pathname.startsWith('/read')} colorClass="text-blue-500" bgClass="bg-blue-50" activeBg="bg-blue-500" activeShadow="shadow-blue-500/30" />
            <NavLink to="/enilam" icon={<Edit3 />} text="Rekod e-NILAM" current={location.pathname === '/enilam'} colorClass="text-emerald-500" bgClass="bg-emerald-50" activeBg="bg-emerald-500" activeShadow="shadow-emerald-500/30" />
            <NavLink to="/ranking" icon={<Trophy />} text="Ranking" current={location.pathname === '/ranking'} colorClass="text-amber-500" bgClass="bg-amber-50" activeBg="bg-amber-500" activeShadow="shadow-amber-500/30" />
            
            <div className="flex items-center pl-2 ml-2 sm:pl-4 sm:ml-4 border-l-2 border-slate-100 space-x-2 sm:space-x-4 shrink-0">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0 hidden sm:block">Admin</span>
              <NavLink to="/admin" icon={<LineChart />} text="Dashboard Analisis" current={location.pathname === '/admin'} colorClass="text-purple-500" bgClass="bg-purple-50" activeBg="bg-purple-500" activeShadow="shadow-purple-500/30" />
              {user && (
                <>
                  <NavLink to="/admin/upload" icon={<PlusCircle />} text="Tambah Buku" current={location.pathname === '/admin/upload'} colorClass="text-pink-500" bgClass="bg-pink-50" activeBg="bg-pink-500" activeShadow="shadow-pink-500/30" />
                  <NavLink to="/admin/manage" icon={<Settings />} text="Selenggara Buku" current={location.pathname === '/admin/manage'} colorClass="text-slate-500" bgClass="bg-slate-50" activeBg="bg-slate-700" activeShadow="shadow-slate-700/30" />
                </>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </div>
  );
}

function NavLink({ to, icon, text, current, colorClass, bgClass, activeBg, activeShadow }: { to: string; icon: React.ReactNode; text: string; current: boolean; colorClass: string; bgClass: string; activeBg: string; activeShadow: string }) {
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-3.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border-2 shrink-0 ${
        current
          ? `${activeBg} text-white border-transparent shadow-lg ${activeShadow} transform scale-[1.02]`
          : `bg-white text-slate-600 border-transparent hover:${bgClass} hover:${colorClass} hover:border-slate-100`
      }`}
    >
      <span className={`mr-3 h-5 w-5 shrink-0 ${current ? 'text-white' : colorClass}`}>
        {icon}
      </span>
      {text}
    </Link>
  );
}
