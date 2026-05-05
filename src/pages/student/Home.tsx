import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Edit3, Trophy, Sparkles, Rocket, Star, Globe } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 relative overflow-hidden bg-white/50 rounded-3xl border-2 border-slate-100 shadow-xl w-full">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none rounded-3xl">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 space-y-12 w-full max-w-4xl py-12">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-100/80 backdrop-blur-sm rounded-full mb-4 shadow-inner">
            <Rocket className="w-12 h-12 text-indigo-600 animate-bounce" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 drop-shadow-sm tracking-tight">
            SELAMAT DATANG KE <br />
            <span className="text-4xl md:text-6xl inline-block mt-4 text-slate-800">PERPUSTAKAAN DIGITAL PINTAR SKAUK</span>
          </h1>

          <div className="flex justify-center items-center gap-6 mt-8 mb-2">
            <img 
              src="https://i.postimg.cc/x1yzrs3k/IMG-20220901-WA0001(1).jpg" 
              alt="Logo SK AUK" 
              className="h-24 md:h-32 object-contain rounded-2xl shadow-md border-4 border-white bg-white"
              referrerPolicy="no-referrer"
            />
            <img 
              src="https://i.postimg.cc/bYsF95Q0/IMG-20220901-WA0002(1).jpg" 
              alt="Logo TS25" 
              className="h-24 md:h-32 object-contain rounded-2xl shadow-md border-4 border-white bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto flex items-center justify-center gap-3">
            <Sparkles className="text-yellow-400 w-6 h-6" />
            Meneroka Dunia Ilmu Tanpa Sempadan
            <Sparkles className="text-yellow-400 w-6 h-6" />
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <button 
            onClick={() => navigate('/catalog')}
            className="group relative flex flex-col items-center p-8 bg-white rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/30 hover:-translate-y-2 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex border-4 border-blue-100 bg-white items-center justify-center w-20 h-20 rounded-full mb-6 group-hover:bg-blue-600 group-hover:border-blue-200 transition-colors">
              <BookOpen className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="relative z-10 text-xl font-black text-slate-800 mb-2">Katalog Buku</h3>
            <p className="relative z-10 text-slate-500 text-sm font-medium">Cari dan baca pelbagai bahan bacaan digital yang menarik.</p>
          </button>

          <button 
            onClick={() => navigate('/enilam')}
            className="group relative flex flex-col items-center p-8 bg-white rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/30 hover:-translate-y-2 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-white rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex border-4 border-emerald-100 bg-white items-center justify-center w-20 h-20 rounded-full mb-6 group-hover:bg-emerald-600 group-hover:border-emerald-200 transition-colors">
              <Edit3 className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="relative z-10 text-xl font-black text-slate-800 mb-2">Rekod e-NILAM</h3>
            <p className="relative z-10 text-slate-500 text-sm font-medium">Rekodkan bacaan anda untuk kumpul mata ganjaran.</p>
          </button>

          <button 
            onClick={() => navigate('/ranking')}
            className="group relative flex flex-col items-center p-8 bg-white rounded-3xl border border-amber-100 shadow-xl shadow-amber-500/10 hover:shadow-amber-500/30 hover:-translate-y-2 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-white rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex border-4 border-amber-100 bg-white items-center justify-center w-20 h-20 rounded-full mb-6 group-hover:bg-amber-500 group-hover:border-amber-200 transition-colors">
              <Trophy className="w-10 h-10 text-amber-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="relative z-10 text-xl font-black text-slate-800 mb-2">Ranking</h3>
            <p className="relative z-10 text-slate-500 text-sm font-medium">Lihat pencapaian dan kedudukan pemenang e-NILAM.</p>
          </button>
        </div>

      </div>
    </div>
  );
}
