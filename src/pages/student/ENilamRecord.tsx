import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { Edit3, CheckCircle2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export function ENilamRecord() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefilledTitle = location.state?.bookTitle || '';
  const prefilledAuthor = location.state?.author || '';
  const prefilledPublisher = location.state?.publisher || '';
  const prefilledPages = location.state?.pages || '';
  const prefilledSource = location.state?.source || '';
  const prefilledLanguage = location.state?.language || '';

  const [formData, setFormData] = useState({
    dateRead: format(new Date(), 'yyyy-MM-dd'),
    studentName: '',
    studentStream: '',
    studentClass: '',
    bookTitle: prefilledTitle,
    author: prefilledAuthor,
    publisher: prefilledPublisher,
    pages: prefilledPages,
    language: prefilledLanguage,
    source: prefilledSource,
    summary: '',
    lesson: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.language || !formData.source) {
      alert('Sila pilih Bahasa dan Sumber bacaan.');
      return;
    }

    setSubmitting(true);
    try {
      const q = query(
        collection(db, 'logs'),
        where('studentName', '==', formData.studentName.trim()),
        where('bookTitle', '==', formData.bookTitle.trim())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert('ANDA TELAH MEMBACA BUKU INI');
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'logs'), {
        ...formData,
        studentName: formData.studentName.trim(),
        bookTitle: formData.bookTitle.trim(),
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          dateRead: format(new Date(), 'yyyy-MM-dd'),
          studentName: '',
          studentStream: '',
          studentClass: '',
          bookTitle: '',
          author: '',
          publisher: '',
          pages: '',
          language: '',
          source: '',
          summary: '',
          lesson: ''
        });
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (success) {
    return (
      <div className="bg-emerald-50 p-12 rounded-3xl border-2 border-emerald-100 text-center max-w-2xl mx-auto mt-8 animate-in zoom-in duration-300 shadow-xl shadow-emerald-500/20">
        <div className="relative inline-block">
          <CheckCircle2 className="mx-auto h-24 w-24 text-emerald-500 mb-6" />
          <Sparkles className="absolute text-yellow-400 w-8 h-8 -top-2 -right-2 animate-bounce" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-4">Tahniah! 🎉</h2>
        <p className="text-slate-700 text-lg font-medium">Rekod e-NILAM anda telah berjaya disimpan. Teruskan membaca!</p>
        <button 
          onClick={() => navigate('/ranking')}
          className="mt-8 px-8 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 hover:-translate-y-1"
        >
          Lihat Ranking
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-emerald-400 to-teal-500 p-8 rounded-3xl shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-20 transform translate-x-1/4 -translate-y-1/4">
          <Edit3 className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black flex items-center mb-2">
            Rekod e-NILAM 📝
          </h1>
          <p className="text-emerald-50 font-medium text-lg">Catatkan bahan bacaan anda untuk kumpul poin dan tunjukkan kehebatan anda!</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border-2 border-slate-100 space-y-8">
        
        {/* Bahagian 1: Maklumat Murid */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-xl font-black text-emerald-600 border-b-2 border-emerald-100 pb-3 mb-5">👩‍🎓 Maklumat Murid</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tarikh Bacaan</label>
              <input type="date" name="dateRead" required value={formData.dateRead} onChange={handleChange} className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Penuh</label>
              <input type="text" name="studentName" required value={formData.studentName} onChange={handleChange} placeholder="Ali bin Abu" className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tahun / Aliran</label>
                <select name="studentStream" required value={formData.studentStream} onChange={handleChange} className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none bg-white">
                  <option value="">Pilih Tahun...</option>
                  <option value="Tahun 1">Tahun 1</option>
                  <option value="Tahun 2">Tahun 2</option>
                  <option value="Tahun 3">Tahun 3</option>
                  <option value="Tahun 4">Tahun 4</option>
                  <option value="Tahun 5">Tahun 5</option>
                  <option value="Tahun 6">Tahun 6</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Kelas</label>
                <select name="studentClass" required value={formData.studentClass} onChange={handleChange} className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none bg-white">
                  <option value="">Pilih Kelas...</option>
                  <option value="UIAM">UIAM</option>
                  <option value="UM">UM</option>
                  <option value="USM">USM</option>
                  <option value="UTM">UTM</option>
                  <option value="UPM">UPM</option>
                  <option value="UKM">UKM</option>
                  <option value="UITM">UITM</option>
                  <option value="USIM">USIM</option>
                  <option value="UUM">UUM</option>
                  <option value="UPSI">UPSI</option>
                  <option value="UNISZA">UNISZA</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bahagian 2: Maklumat Buku */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-xl font-black text-emerald-600 border-b-2 border-emerald-100 pb-3 mb-5">📚 Maklumat Bahan Bacaan</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tajuk Bacaan</label>
              <input type="text" name="bookTitle" required value={formData.bookTitle} onChange={handleChange} placeholder="Tajuk Buku / Artikel" className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Penulis</label>
                <input type="text" name="author" required value={formData.author} onChange={handleChange} placeholder="Nama Penulis" className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Penerbit</label>
                <input type="text" name="publisher" required value={formData.publisher} onChange={handleChange} placeholder="Penerbit Buku" className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Bilangan Muka Surat</label>
              <input type="number" name="pages" required value={formData.pages} onChange={handleChange} placeholder="Contoh: 120" min="1" className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none" />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Bahasa</label>
              <div className="flex flex-wrap gap-3">
                {['Bahasa Melayu', 'Bahasa Inggeris', 'Lain-lain'].map(lang => (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => setFormData(p => ({ ...p, language: lang }))}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${formData.language === lang ? 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm transform scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Sumber Bacaan</label>
              <div className="flex flex-wrap gap-3">
                {['Buku / e-Book', 'Sumber Digital', 'Artikel / Jurnal'].map(src => (
                  <button
                    type="button"
                    key={src}
                    onClick={() => setFormData(p => ({ ...p, source: src }))}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${formData.source === src ? 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm transform scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bahagian 3: Rumusan */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-xl font-black text-emerald-600 border-b-2 border-emerald-100 pb-3 mb-5">💡 Rumusan & Pengajaran</h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Rumusan (Pilihan)</label>
              <textarea name="summary" value={formData.summary} onChange={handleChange} rows={3} placeholder="Sila tulis ringkasan bahan bacaan..." className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pengajaran (Pilihan)</label>
              <textarea name="lesson" value={formData.lesson} onChange={handleChange} rows={2} placeholder="Sila tulis satu nilai murni / pengajaran..." className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none" />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-4 px-4 border-b-4 border-emerald-700 rounded-2xl shadow-lg shadow-emerald-500/30 text-lg font-black text-white bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 disabled:opacity-50 transition-all active:border-b-0 active:translate-y-1 hover:-translate-y-1 hover:scale-[1.01]"
          >
            {submitting ? 'Menyimpan...' : 'Hantar Rekod e-NILAM 🚀'}
          </button>
        </div>
      </form>
    </div>
  );
}
