import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { Users, BookOpen, Trophy, Sparkles, Star, Medal, Crown, Eye, X, Filter, Download, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LogData {
  id: string;
  studentName: string;
  studentClass: string;
  studentStream: string;
  dateRead?: string;
  bookTitle?: string;
  author?: string;
  publisher?: string;
  pages?: string;
  source?: string;
  language?: string;
  summary?: string;
  lesson?: string;
}

export function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const currentYearStr = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [editingLog, setEditingLog] = useState<LogData | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const confirmDeleteLog = async () => {
    if (!deleteLogId) return;
    try {
      await deleteDoc(doc(db, 'logs', deleteLogId));
      setStatusMessage({ type: 'success', text: 'Rekod berjaya dipadam.' });
      setDeleteLogId(null);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error('Gagal memadam rekod:', error);
      setStatusMessage({ type: 'error', text: 'Gagal memadam rekod.' });
      setDeleteLogId(null);
      setTimeout(() => setStatusMessage(null), 3000);
      handleFirestoreError(error, OperationType.DELETE, 'logs');
    }
  };

  const handleDeleteLog = (id: string) => {
    setDeleteLogId(id);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLog) return;
    
    try {
      const logRef = doc(db, 'logs', editingLog.id);
      await updateDoc(logRef, {
        studentName: editingLog.studentName,
        studentClass: editingLog.studentClass,
        studentStream: editingLog.studentStream,
        bookTitle: editingLog.bookTitle,
        dateRead: editingLog.dateRead,
        author: editingLog.author || '',
        publisher: editingLog.publisher || '',
        pages: editingLog.pages || '',
        language: editingLog.language || '',
        source: editingLog.source || '',
        summary: editingLog.summary || '',
        lesson: editingLog.lesson || ''
      });
      setEditingLog(null);
      setStatusMessage({ type: 'success', text: 'Rekod berjaya dikemaskini.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error('Gagal mengemaskini rekod:', error);
      setStatusMessage({ type: 'error', text: 'Gagal mengemaskini rekod.' });
      setTimeout(() => setStatusMessage(null), 3000);
      handleFirestoreError(error, OperationType.UPDATE, 'logs');
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'logs'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogData));
        setLogs(logsData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'logs');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center">
        <div className="bg-rose-100 text-rose-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
        <p className="text-slate-600">Sila log masuk sebagai Admin/Guru Perpustakaan untuk melihat halaman ini.</p>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-fuchsia-500 mb-4"></div>
      <p className="text-fuchsia-600 font-medium animate-pulse">Memuatkan data ceria analitik...</p>
    </div>
  );

  // Analitik calculations
  const yearsSet = new Set<string>();
  ['2024', '2025', '2026', currentYearStr].forEach(y => yearsSet.add(y));
  logs.forEach(log => {
    if (log.dateRead) {
      const y = log.dateRead.substring(0, 4);
      if (y && y.length === 4) yearsSet.add(y);
    }
  });
  const yearOptions = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));

  const filteredLogs = logs.filter(log => {
    const logYear = log.dateRead ? log.dateRead.substring(0, 4) : '';
    return (!selectedYear || logYear === selectedYear) &&
           (!selectedStream || log.studentStream === selectedStream) &&
           (!selectedClass || log.studentClass === selectedClass);
  });

  const totalRead = filteredLogs.length;

  const classDataMap: Record<string, number> = {};
  const streamDataMap: Record<string, number> = {};
  const studentDataMap: Record<string, { total: number, className: string }> = {};

  filteredLogs.forEach(log => {
    const classNameFull = `${log.studentStream || ''} ${log.studentClass || ''}`.trim();
    if (classNameFull) {
      classDataMap[classNameFull] = (classDataMap[classNameFull] || 0) + 1;
    }
    if (log.studentStream) streamDataMap[log.studentStream] = (streamDataMap[log.studentStream] || 0) + 1;
    if (log.studentName) {
      if (!studentDataMap[log.studentName]) {
        studentDataMap[log.studentName] = { total: 0, className: classNameFull || '-' };
      }
      studentDataMap[log.studentName].total += 1;
    }
  });

  const classData = Object.keys(classDataMap).map(k => ({ name: k, Nilai: classDataMap[k] })).sort((a, b) => b.Nilai - a.Nilai);
  const streamData = Object.keys(streamDataMap).map(k => ({ name: k, value: streamDataMap[k] })).sort((a, b) => b.value - a.value);
  
  const allStudents = Object.keys(studentDataMap)
    .map(k => ({ name: k, total: studentDataMap[k].total, className: studentDataMap[k].className }))
    .sort((a, b) => b.total - a.total);

  const streamsOptions = ['Tahun 1', 'Tahun 2', 'Tahun 3', 'Tahun 4', 'Tahun 5', 'Tahun 6'];
  const classesOptions = ['UIAM', 'UM', 'USM', 'UTM', 'UPM', 'UKM', 'UITM', 'USIM', 'UUM', 'UPSI', 'UNISZA'];


  const maxStudent = allStudents.length > 0 ? allStudents[0].total : 1;
  const maxClass = classData.length > 0 ? classData[0].Nilai : 1;
  const maxStream = streamData.length > 0 ? streamData[0].value : 1;

  const getRankIcon = (index: number) => {
    switch(index) {
      case 0: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 1: return <Medal className="w-5 h-5 text-slate-400" />;
      case 2: return <Medal className="w-5 h-5 text-amber-700" />;
      default: return <Star className="w-4 h-4 text-emerald-400" />;
    }
  };

  const clearAllData = async () => {
    setIsGenerating(true);
    setShowConfirmClear(false);
    try {
      // Clear logs
      const logsSnap = await getDocs(collection(db, 'logs'));
      const logDeletes = logsSnap.docs.map(docSnapshot => deleteDoc(doc(db, 'logs', docSnapshot.id)));
      await Promise.all(logDeletes);

      // Clear books
      const booksSnap = await getDocs(collection(db, 'books'));
      const bookDeletes = booksSnap.docs.map(docSnapshot => deleteDoc(doc(db, 'books', docSnapshot.id)));
      await Promise.all(bookDeletes);

      // We can use a nice toast or just rely on the UI updating (logs length become 0)
    } catch (error) {
      console.error("Gagal memadam data:", error);
      handleFirestoreError(error, OperationType.DELETE, 'logs/books');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockData = async () => {
    setIsGenerating(true);
    const mockNames = ['Ahmad', 'Ali', 'Abu', 'Siti', 'Aminah', 'Aisyah', 'Muthu', 'Raju', 'Ah Chong', 'Mei Ling'];
    const mockClasses = ['UIAM', 'UM', 'USM', 'UTM', 'UPM', 'UKM', 'UITM', 'USIM', 'UUM', 'UPSI', 'UNISZA'];
    const mockStreams = ['Tahun 1', 'Tahun 2', 'Tahun 3', 'Tahun 4', 'Tahun 5', 'Tahun 6'];
    const mockBooks = ['Buku Cerita Haiwan', 'Sejarah Melaka', 'Sains Angkasa', 'Koleksi Pantun', 'Kembara Hutan', 'Ensiklopedia Dinosaur'];
    const mockAuthors = ['Siti Ruzaini', 'Ahmad Kamal', 'Lee Wai', 'John Doe', 'Tiada Data'];
    const mockPublishers = ['DBP', 'Penerbitan Pelangi', 'Oxford', 'Gramedia'];
    const mockLangs = ['Bahasa Melayu', 'Bahasa Inggeris', 'Lain-lain'];
    const mockSources = ['Buku', 'Buku Digital', 'Artikel', 'Jurnal'];
    
    try {
      for (let i = 0; i < 20; i++) {
        const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
        const randomClass = mockClasses[Math.floor(Math.random() * mockClasses.length)];
        const randomStream = mockStreams[Math.floor(Math.random() * mockStreams.length)];
        const randomBook = mockBooks[Math.floor(Math.random() * mockBooks.length)];
        const randomAuthor = mockAuthors[Math.floor(Math.random() * mockAuthors.length)];
        const randomPublisher = mockPublishers[Math.floor(Math.random() * mockPublishers.length)];
        const randomPages = (Math.floor(Math.random() * 200) + 10).toString();
        const randomLang = mockLangs[Math.floor(Math.random() * mockLangs.length)];
        const randomSource = mockSources[Math.floor(Math.random() * mockSources.length)];
        
        const randomDate = new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365 * 3));
        const dateReadStr = randomDate.toISOString().split('T')[0];
        
        await addDoc(collection(db, 'logs'), {
          studentName: randomName,
          studentClass: randomClass,
          studentStream: randomStream,
          bookTitle: randomBook,
          author: randomAuthor,
          publisher: randomPublisher,
          pages: randomPages,
          language: randomLang,
          source: randomSource,
          summary: 'Ini adalah rumusan ringkas untuk buku ini.',
          lesson: 'Saya banyak belajar dari buku ini.',
          dateRead: dateReadStr,
          createdAt: serverTimestamp()
        });
      }
      // Successfully generated mock data
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    } finally {
      setIsGenerating(false);
    }
  };

  const getRankBg = (index: number) => {
    switch(index) {
      case 0: return 'bg-yellow-100 border-yellow-200';
      case 1: return 'bg-slate-100 border-slate-200';
      case 2: return 'bg-amber-100 border-amber-200';
      default: return 'bg-emerald-50 border-emerald-100';
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    const title = `Rekod e-NILAM Murid`;
    let subtitle = `Tahun Rekod: ${selectedYear || 'Semua'}, Aliran: ${selectedStream || 'Semua'}, Kelas: ${selectedClass || 'Semua'}`;
    
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 22);

    const tableColumn = ["Bil.", "Nama Murid", "Nama Kelas", "Jumlah Buku Dibaca"];
    const tableRows: any[] = [];

    allStudents.forEach((student, index) => {
      const rowData = [
        (index + 1).toString(),
        student.name,
        student.className,
        student.total.toString()
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 50, halign: 'left' },
        3: { cellWidth: 40, halign: 'center' }
      }
    });

    doc.save(`Rekod_eNilam_${selectedYear || 'Semua'}_${selectedStream || 'Semua'}_${selectedClass || 'Semua'}.pdf`);
  };

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div className={`px-4 py-3 font-bold text-white rounded-2xl shadow-sm text-center animate-in slide-in-from-top-4 ${statusMessage.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {statusMessage.text}
        </div>
      )}
      {/* Header Section */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 p-8 rounded-3xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20">
          <BookOpen className="w-64 h-64 text-white" />
        </div>
        <div className="absolute bottom-0 left-20 -mb-10 opacity-20">
          <Sparkles className="w-32 h-32 text-white" />
        </div>

        <div className="relative z-10 flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center">
              Dashboard Analisis
              <Sparkles className="w-6 h-6 ml-3 text-yellow-300 animate-pulse" />
            </h1>
            <p className="text-purple-100 font-medium text-lg">Pantau pencapaian cemerlang murid-murid kita!</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={generateMockData}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl transition-all w-max font-bold border border-white/30 text-sm disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? 'Menjana...' : 'Jana Data Mock'}
            </button>
            {!showConfirmClear ? (
              <button 
                onClick={() => setShowConfirmClear(true)}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-md text-red-50 px-4 py-2 rounded-xl transition-all w-max font-bold border border-red-500/30 text-sm disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {isGenerating ? 'Memadam...' : 'Padam Semua Data'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-md py-1 px-2 rounded-xl border border-red-500/50">
                <span className="text-white text-sm font-bold ml-2">Pasti padam semua?</span>
                <button
                  onClick={clearAllData}
                  disabled={isGenerating}
                  className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-red-50 transition-colors"
                >
                  {isGenerating ? 'Tunggu...' : 'Ya, Padam'}
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  disabled={isGenerating}
                  className="bg-transparent text-red-50 px-3 py-1.5 rounded-lg text-xs font-black border border-red-300/30 hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white/20 backdrop-blur-md px-8 py-5 rounded-2xl flex items-center border border-white/30 relative z-10 shadow-xl">
          <div className="bg-white p-3 rounded-2xl mr-5 shadow-inner">
            <BookOpen className="h-8 w-8 text-fuchsia-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-fuchsia-100 uppercase tracking-widest mb-1">Total Rekod NILAM</p>
            <p className="text-5xl font-black text-white drop-shadow-sm">{totalRead}</p>
          </div>
        </div>
      </div>

      {/* Filters for Analytics */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select 
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
          >
            <option value="">Semua Tahun Rekod</option>
            {yearOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        <div className="flex-1 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select 
            value={selectedStream}
            onChange={e => setSelectedStream(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
          >
            <option value="">Semua Tahun / Aliran</option>
            {streamsOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        <div className="flex-1 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
          >
            <option value="">Semua Kelas</option>
            {classesOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        <button 
          onClick={downloadPDF}
          className="md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl transition-all font-bold shadow-md shadow-indigo-200"
        >
          <Download className="w-5 h-5" />
          Muat Turun PDF
        </button>
      </div>

      {/* Analytics Progress Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Card 1: Pembaca */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-orange-100 flex flex-col">
          <div className="flex items-center mb-8">
            <div className="bg-orange-100 p-3 rounded-2xl mr-4 shadow-inner">
              <Trophy className="h-7 w-7 text-orange-500" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800">Juara Membaca</h3>
              <p className="text-sm font-medium text-slate-500">Top 10 Murid</p>
            </div>
          </div>
          <div className="space-y-5 flex-grow overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
            {allStudents.slice(0, 10).map((student, i) => (
              <div key={student.name} className="group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-black text-slate-300 group-hover:text-orange-400 transition-colors">{i + 1}.</span>
                    <span className="font-bold text-slate-700 line-clamp-1" title={student.name}>{student.name}</span>
                  </div>
                  <span className="font-black text-orange-500 bg-orange-50 px-2.5 py-0.5 rounded-lg text-sm">{student.total}</span>
                </div>
                <div className="w-full bg-slate-100/80 rounded-full h-3 ml-8" style={{ width: 'calc(100% - 2rem)' }}>
                  <div className="bg-gradient-to-r from-orange-400 to-rose-500 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" style={{ width: `${(student.total / maxStudent) * 100}%` }}>
                  </div>
                </div>
              </div>
            ))}
            {allStudents.length === 0 && <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl">Belum ada rekod.</p>}
          </div>
        </div>

        {/* Card 2: Kelas */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-cyan-100 flex flex-col">
          <div className="flex items-center mb-8">
            <div className="bg-cyan-100 p-3 rounded-2xl mr-4 shadow-inner">
              <Users className="h-7 w-7 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800">Prestasi Kelas</h3>
              <p className="text-sm font-medium text-slate-500">Analisis Semua Kelas</p>
            </div>
          </div>
          <div className="space-y-5 flex-grow overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
            {classData.map((cls, i) => (
              <div key={cls.name} className="group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-black text-slate-300 group-hover:text-cyan-400 transition-colors">{i + 1}.</span>
                    <span className="font-bold text-slate-700 line-clamp-1">{cls.name}</span>
                  </div>
                  <span className="font-black text-cyan-500 bg-cyan-50 px-2.5 py-0.5 rounded-lg text-sm">{cls.Nilai}</span>
                </div>
                <div className="w-full bg-slate-100/80 rounded-full h-3 ml-8" style={{ width: 'calc(100% - 2rem)' }}>
                  <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" style={{ width: `${(cls.Nilai / maxClass) * 100}%` }}>
                  </div>
                </div>
              </div>
            ))}
            {classData.length === 0 && <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl">Belum ada rekod.</p>}
          </div>
        </div>

        {/* Card 3: Aliran */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-100 flex flex-col">
          <div className="flex items-center mb-8">
            <div className="bg-emerald-100 p-3 rounded-2xl mr-4 shadow-inner">
              <BookOpen className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800">Pecahan Aliran</h3>
              <p className="text-sm font-medium text-slate-500">Analisis Semua Aliran</p>
            </div>
          </div>
          <div className="space-y-5 flex-grow overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
            {streamData.map((stream, i) => (
              <div key={stream.name} className="group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-black text-slate-300 group-hover:text-emerald-400 transition-colors">{i + 1}.</span>
                    <span className="font-bold text-slate-700 line-clamp-1">{stream.name}</span>
                  </div>
                  <span className="font-black text-emerald-500 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-sm">{stream.value}</span>
                </div>
                <div className="w-full bg-slate-100/80 rounded-full h-3 ml-8" style={{ width: 'calc(100% - 2rem)' }}>
                  <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" style={{ width: `${(stream.value / maxStream) * 100}%` }}>
                  </div>
                </div>
              </div>
            ))}
            {streamData.length === 0 && <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl">Belum ada rekod.</p>}
          </div>
        </div>
      </div>

      {/* Full Data Table */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center">
          Daftar Rekod e-NILAM Murid
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                <th className="px-6 py-4">Tarikh</th>
                <th className="px-6 py-4">Nama Murid</th>
                <th className="px-6 py-4">Kelas / Aliran</th>
                <th className="px-6 py-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-medium">{log.dateRead}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{log.studentName}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold text-xs mr-2 border border-indigo-100">
                      {log.studentClass}
                    </span>
                    <span className="inline-block bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold text-xs border border-emerald-100">
                      {log.studentStream}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors inline-flex items-center justify-center border border-transparent hover:border-blue-100"
                        title="Lihat Maklumat"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingLog(log)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors inline-flex items-center justify-center border border-transparent hover:border-amber-100"
                        title="Edit Maklumat"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex items-center justify-center border border-transparent hover:border-rose-100"
                        title="Padam Rekod"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="text-center py-16 text-slate-500 font-medium">Tiada data rekod e-NILAM buat masa ini.</div>
          )}
        </div>
      </div>

      {/* Modal Maklumat Bacaan */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 sm:pb-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full flex flex-col max-h-[75vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
                Maklumat Bacaan
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-5">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Murid</p>
                <p className="text-lg font-bold text-slate-800">{selectedLog.studentName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">{selectedLog.studentClass}</span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">{selectedLog.studentStream}</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Bahan Bacaan</p>
                <p className="text-lg font-bold text-purple-700">{selectedLog.bookTitle}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm font-medium text-slate-500">
                  {selectedLog.author && <span className="bg-slate-100 px-2 py-1 rounded-md">Penulis: {selectedLog.author}</span>}
                  {selectedLog.publisher && <span className="bg-slate-100 px-2 py-1 rounded-md">Penerbit: {selectedLog.publisher}</span>}
                  {selectedLog.pages && <span className="bg-slate-100 px-2 py-1 rounded-md">{selectedLog.pages} ms</span>}
                  {selectedLog.source && <span className="bg-slate-100 px-2 py-1 rounded-md">{selectedLog.source}</span>}
                  {selectedLog.language && <span className="bg-slate-100 px-2 py-1 rounded-md">{selectedLog.language}</span>}
                  {selectedLog.dateRead && <span className="text-slate-400 font-semibold">{selectedLog.dateRead}</span>}
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <p className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2">Rumusan</p>
                <p className="text-slate-700 font-medium whitespace-pre-wrap">{selectedLog.summary || 'Tiada rumusan.'}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-2">Pengajaran / Nilai Murni</p>
                <p className="text-slate-700 font-medium whitespace-pre-wrap">{selectedLog.lesson || 'Tiada pengajaran dicatat.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Rekod */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 sm:pb-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full flex flex-col max-h-[75vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 flex-shrink-0 bg-white rounded-t-3xl z-10">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                <Edit className="w-5 h-5 mr-2 text-amber-600" />
                Kemaskini Rekod
              </h3>
              <button
                onClick={() => setEditingLog(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nama Murid</label>
                    <input 
                      type="text" 
                      required
                      value={editingLog.studentName} 
                      onChange={e => setEditingLog({...editingLog, studentName: e.target.value})}
                      className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Kelas</label>
                    <input 
                      type="text" 
                      required
                      value={editingLog.studentClass} 
                      onChange={e => setEditingLog({...editingLog, studentClass: e.target.value})}
                      className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Aliran / Tahun</label>
                    <input 
                      type="text" 
                      required
                      value={editingLog.studentStream} 
                      onChange={e => setEditingLog({...editingLog, studentStream: e.target.value})}
                      className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tarikh Bacaan</label>
                    <input 
                      type="date" 
                      required
                      value={editingLog.dateRead || ''} 
                      onChange={e => setEditingLog({...editingLog, dateRead: e.target.value})}
                      className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-3">Maklumat Bahan Bacaan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Tajuk Buku / Bahan Bacaan</label>
                      <input 
                        type="text" 
                        required
                        value={editingLog.bookTitle || ''} 
                        onChange={e => setEditingLog({...editingLog, bookTitle: e.target.value})}
                        className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Penulis</label>
                      <input 
                        type="text" 
                        value={editingLog.author || ''} 
                        onChange={e => setEditingLog({...editingLog, author: e.target.value})}
                        className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Penerbit</label>
                      <input 
                        type="text" 
                        value={editingLog.publisher || ''} 
                        onChange={e => setEditingLog({...editingLog, publisher: e.target.value})}
                        className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Bilangan Muka Surat</label>
                      <input 
                        type="number" 
                        value={editingLog.pages || ''} 
                        onChange={e => setEditingLog({...editingLog, pages: e.target.value})}
                        className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Bahasa</label>
                      <select 
                        value={editingLog.language || ''} 
                        onChange={e => setEditingLog({...editingLog, language: e.target.value})}
                        className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none bg-white"
                      >
                        <option value="Bahasa Melayu">Bahasa Melayu</option>
                        <option value="Bahasa Inggeris">Bahasa Inggeris</option>
                        <option value="Lain-lain">Lain-lain</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Rumusan</label>
                      <textarea 
                        rows={3}
                        value={editingLog.summary || ''} 
                        onChange={e => setEditingLog({...editingLog, summary: e.target.value})}
                        className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Pengajaran</label>
                      <textarea 
                        rows={2}
                        value={editingLog.lesson || ''} 
                        onChange={e => setEditingLog({...editingLog, lesson: e.target.value})}
                        className="w-full p-2.5 font-medium text-sm border-2 border-slate-200 rounded-xl focus:border-amber-400 outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-6 py-2.5 font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pengesahan Padam */}
      {deleteLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Padam Rekod?</h3>
            <p className="text-slate-500 mb-6 font-medium">
              Adakah anda pasti mahu memadam rekod ini secara kekal? Tindakan ini tidak boleh dibatalkan.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteLogId(null)}
                className="px-5 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex-1"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteLog}
                className="px-5 py-2.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm flex-1"
              >
                Padam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
