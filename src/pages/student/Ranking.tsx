import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { Trophy, Medal, Crown, Star, Search, Filter, Loader2, Users } from 'lucide-react';

interface LogData {
  studentName: string;
  studentClass: string;
  studentStream?: string;
}

export function Ranking() {
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    // For small apps we can fetch all and rank client side. 
    // This allows accurate ranking across classes and individuals without complex Firebase aggregations.
    const q = query(collection(db, 'logs'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const logsData = snapshot.docs.map(doc => doc.data() as LogData);
        setLogs(logsData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'logs');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const studentCountMap: Record<string, { total: number, className: string, stream: string }> = {};
  const classCountMap: Record<string, number> = {};

  if (!loading) {
    logs.forEach(log => {
      if (!studentCountMap[log.studentName]) {
        studentCountMap[log.studentName] = { total: 0, className: log.studentClass, stream: log.studentStream || '' };
      }
      studentCountMap[log.studentName].total += 1;
      const combinedClassName = `${log.studentStream || ''} ${log.studentClass || ''}`.trim() || 'Tiada Kelas';
      classCountMap[combinedClassName] = (classCountMap[combinedClassName] || 0) + 1;
    });
  }

  const globalRankedStudents = Object.keys(studentCountMap)
    .map(name => ({
      name,
      className: studentCountMap[name].className,
      stream: studentCountMap[name].stream,
      total: studentCountMap[name].total
    }))
    .sort((a, b) => b.total - a.total)
    .map((s, index) => ({
      ...s,
      globalRank: index + 1
    }));

  const top10Students = globalRankedStudents.slice(0, 10);

  let filteredStudents = globalRankedStudents;

  // Apply filters
  if (selectedStream) {
    filteredStudents = filteredStudents.filter(s => s.stream === selectedStream);
  }

  if (selectedClass) {
    filteredStudents = filteredStudents.filter(s => s.className === selectedClass);
  }

  if (searchQuery) {
    filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  // Limit overall display to 100 to prevent huge lists, otherwise show all matches
  const displayFilteredStudents = (searchQuery || selectedStream || selectedClass) ? filteredStudents : filteredStudents.slice(0, 100);

  const topClasses = Object.keys(classCountMap)
    .map(className => ({
      name: className,
      total: classCountMap[className]
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const streamsOptions = Array.from(new Set(logs.map(l => l.studentStream).filter(Boolean))).sort();
  const classesOptions = Array.from(new Set(logs.map(l => l.studentClass).filter(Boolean))).sort();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4">
          <Trophy className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <Trophy className="w-20 h-20 mx-auto mb-6 text-yellow-200 drop-shadow-md animate-bounce" />
          <h1 className="text-4xl sm:text-5xl font-black mb-4 drop-shadow-sm flex justify-center items-center">
            Ranking Juara Membaca 🏆
          </h1>
          <p className="text-orange-50 text-xl font-medium max-w-2xl mx-auto">
            Teruskan membaca dan catatkan data e-NILAM anda untuk menaikkan nama anda dan kelas anda bergelar juara!
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <div className="text-blue-500 font-bold animate-pulse text-lg">Mengira rekod bacaan terkini...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top 10 Murid */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden h-fit">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Crown className="w-32 h-32" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center relative z-10">
                <Star className="w-6 h-6 mr-3 text-amber-500" />
                Top 10 Murid
              </h2>
              
              <div className="space-y-4 relative z-10">
                {top10Students.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-8">Belum ada rekod.</p>
                ) : (
                  top10Students.map((student, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg mr-4 shadow-sm shrink-0
                          ${i === 0 ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 
                            i === 1 ? 'bg-slate-200 text-slate-700 border-2 border-slate-300' : 
                            i === 2 ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' : 
                            'bg-white text-slate-500 border border-slate-200'}`}
                        >
                          #{i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 line-clamp-1">{student.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-indigo-100">{student.className}</span>
                            {student.stream && <span className="bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-emerald-100">{student.stream}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-center shrink-0 ml-2">
                        <div className="text-xl font-black text-rose-500 bg-white px-3 py-1 rounded-xl shadow-sm">{student.total}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top 10 Kelas */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden h-fit">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Trophy className="w-32 h-32" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center relative z-10">
                <Trophy className="w-6 h-6 mr-3 text-indigo-500" />
                Top 10 Kelas Terhebat
              </h2>
              
              <div className="space-y-4 relative z-10">
                {topClasses.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-8">Belum ada rekod.</p>
                ) : (
                  topClasses.map((cls, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 flex items-center justify-center font-black text-lg mr-4 bg-indigo-50 text-indigo-700 rounded-xl shadow-sm border border-indigo-100`}>
                          #{i + 1}
                        </div>
                        <div className="font-bold text-slate-900 text-lg">{cls.name}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-black text-indigo-600 bg-white px-4 py-1 rounded-xl shadow-sm">{cls.total} <span className="text-sm font-medium text-slate-500 ml-1">Buku</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Kedudukan Keseluruhan Murid */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center relative z-10">
              <Users className="w-6 h-6 mr-3 text-emerald-500" />
              Kedudukan Keseluruhan Murid
            </h2>
            
            {/* Filters & Search */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-4 mb-6">
              <div className="w-full relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama murid..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-amber-400 outline-none transition-all font-bold text-slate-700 shadow-sm"
                />
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select 
                    value={selectedStream}
                    onChange={e => setSelectedStream(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-amber-400 outline-none transition-all font-bold text-slate-700 appearance-none shadow-sm"
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
                    className="w-full pl-12 pr-10 py-3 bg-white border-2 border-slate-100 rounded-xl focus:border-amber-400 outline-none transition-all font-bold text-slate-700 appearance-none shadow-sm"
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
              </div>
            </div>

            <div className="space-y-4">
              {displayFilteredStudents.length === 0 ? (
                <p className="text-slate-500 italic text-center py-8">Tiada rekod ditemui.</p>
              ) : (
                displayFilteredStudents.map((student, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mr-4 shadow-sm shrink-0
                          ${student.globalRank === 1 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' : 
                            student.globalRank === 2 ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-300' : 
                            student.globalRank === 3 ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-300' : 
                            'bg-white text-slate-500 border border-slate-200'}`}
                        >
                          #{student.globalRank}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 line-clamp-1">{student.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-indigo-100">{student.className}</span>
                            {student.stream && <span className="bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-emerald-100">{student.stream}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-center shrink-0 ml-2">
                        <div className="text-2xl font-black text-rose-500">{student.total}</div>
                      </div>
                    </div>
                    
                    {/* Bintang Pembaca */}
                    <div className="bg-white p-3 rounded-xl border border-amber-100/50 flex flex-wrap gap-1 mt-2">
                      {Array.from({ length: Math.min(student.total, 50) }).map((_, idx) => (
                        <div key={idx} className="relative group">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-sm transform hover:scale-125 transition-transform" />
                        </div>
                      ))}
                      {student.total > 50 && (
                        <div className="flex items-center justify-center bg-yellow-100 text-amber-600 font-bold px-2 py-0.5 rounded-md text-xs ms-1">
                          +{student.total - 50} lagi
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

