import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, getDocs, writeBatch, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { OperationType, handleFirestoreError } from '../../lib/firestore-error';
import { Users, Plus, Trash2, Edit, X, Save, Upload, Download, RefreshCw, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  name: string;
  className: string;
  stream: string;
}

export function ManageStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Add new student
  const [newName, setNewName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newStream, setNewStream] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const DEFAULT_STREAMS = ['TAHUN 1', 'TAHUN 2', 'TAHUN 3', 'TAHUN 4', 'TAHUN 5', 'TAHUN 6', 'PRA-SEKOLAH'];
  const DEFAULT_CLASSES = ['UIAM', 'UM', 'USM', 'UTM', 'UPM', 'UKM', 'UITM', 'USIM', 'UUM', 'UPSI', 'UNISZA'];

  const streams = useMemo(() => {
    const dbStreams = students.map(s => String(s.stream).toUpperCase());
    return Array.from(new Set([...DEFAULT_STREAMS, ...dbStreams])).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const classes = useMemo(() => {
    const filtered = newStream ? students.filter(s => String(s.stream).toUpperCase() === newStream.toUpperCase()) : students;
    const dbClasses = filtered.map(s => String(s.className).toUpperCase());
    return Array.from(new Set([...DEFAULT_CLASSES, ...dbClasses])).sort((a, b) => a.localeCompare(b));
  }, [students, newStream]);
  
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.className.toLowerCase().includes(q) || 
      s.stream.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);
  
  // Bulk add
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkStream, setBulkStream] = useState('');
  const [bulkClassName, setBulkClassName] = useState('');
  
  // Edit
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'students'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        // Sort by stream, class, name
        studentData.sort((a, b) => {
          if (a.stream !== b.stream) return a.stream.localeCompare(b.stream);
          if (a.className !== b.className) return a.className.localeCompare(b.className);
          return a.name.localeCompare(b.name);
        });
        setStudents(studentData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newClassName.trim() || !newStream.trim()) return;
    
    try {
      const id = uuidv4();
      await setDoc(doc(db, 'students', id), {
        name: newName.trim().toUpperCase(),
        className: newClassName.trim().toUpperCase(),
        stream: newStream.trim().toUpperCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewName('');
      setNewClassName('');
      setNewStream('');
      setShowAddStudent(false);
      setStatusMessage({ type: 'success', text: 'Murid berjaya ditambah!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'students');
      setStatusMessage({ type: 'error', text: 'Gagal menambah murid.' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim() || !bulkStream.trim() || !bulkClassName.trim()) return;
    
    const names = bulkInput.split('\n').filter(n => n.trim().length > 0);
    if (names.length === 0) return;
    
    try {
      for (const name of names) {
        const id = uuidv4();
        await setDoc(doc(db, 'students', id), {
          name: name.trim().toUpperCase(),
          className: bulkClassName.trim().toUpperCase(),
          stream: bulkStream.trim().toUpperCase(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setBulkInput('');
      setBulkStream('');
      setBulkClassName('');
      setShowBulkAdd(false);
      setStatusMessage({ type: 'success', text: `${names.length} murid berjaya ditambah!` });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'students');
      setStatusMessage({ type: 'error', text: 'Gagal menambah murid secara pukal.' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDelete = (id: string) => {
    const studentToDelete = students.find(s => s.id === id);
    if (!studentToDelete) return;

    setConfirmDialog({
      title: 'Padam Murid',
      message: 'Adakah anda pasti mahu memadam murid ini? Data pendaftaran e-Nilam mereka juga akan dipadam.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const logsQuery = query(
            collection(db, 'logs'),
            where('studentName', '==', studentToDelete.name.trim().toUpperCase()),
            where('studentClass', '==', studentToDelete.className.trim().toUpperCase()),
            where('studentStream', '==', studentToDelete.stream.trim().toUpperCase())
          );
          const logsSnapshot = await getDocs(logsQuery);
          
          let batch = writeBatch(db);
          batch.delete(doc(db, 'students', id));
          
          let opCount = 1;
          for (const docSnap of logsSnapshot.docs) {
            batch.delete(docSnap.ref);
            opCount++;
            if (opCount >= 500) {
              await batch.commit();
              batch = writeBatch(db);
              opCount = 0;
            }
          }
          if (opCount > 0) {
            await batch.commit();
          }

          setStatusMessage({ type: 'success', text: 'Murid dan rekod e-nilam berjaya dipadam!' });
          setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
          console.error(error);
          handleFirestoreError(error, OperationType.DELETE, 'students/logs');
          setStatusMessage({ type: 'error', text: 'Gagal memadam murid.' });
          setTimeout(() => setStatusMessage(null), 3000);
        }
      }
    });
  };

  const handleDeleteAll = () => {
    setConfirmDialog({
      title: 'AMARAN: Padam Semua Murid',
      message: 'Adakah anda pasti mahu memadam SEMUA murid dan rekod e-nilam mereka? Tindakan ini tidak boleh diundur.',
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        try {
          const BATCH_SIZE = 500;
          let batch = writeBatch(db);
          let opCount = 0;
          
          for (const student of students) {
            batch.delete(doc(db, 'students', student.id));
            opCount++;
            
            if (opCount >= BATCH_SIZE) {
              await batch.commit();
              batch = writeBatch(db);
              opCount = 0;
            }
          }
          if (opCount > 0) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }

          // Delete matching records from 'logs'
          const logsQuery = collection(db, 'logs');
          const logsSnapshot = await getDocs(logsQuery);
          
          const studentSet = new Set(students.map(s => `${s.name.trim().toUpperCase()}-${s.className.trim().toUpperCase()}-${s.stream.trim().toUpperCase()}`));
          
          for (const docSnap of logsSnapshot.docs) {
            const data = docSnap.data();
            const logKey = `${(data.studentName || '').trim().toUpperCase()}-${(data.studentClass || '').trim().toUpperCase()}-${(data.studentStream || '').trim().toUpperCase()}`;
            
            if (studentSet.has(logKey)) {
              batch.delete(docSnap.ref);
              opCount++;
              if (opCount >= BATCH_SIZE) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
              }
            }
          }
          if (opCount > 0) {
            await batch.commit();
          }

          setStatusMessage({ type: 'success', text: 'Semua murid dan rekod berjaya dipadam!' });
          setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
          console.error(error);
          handleFirestoreError(error, OperationType.DELETE, 'students/logs');
          setStatusMessage({ type: 'error', text: 'Gagal memadam semua murid.' });
          setTimeout(() => setStatusMessage(null), 3000);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    try {
      await updateDoc(doc(db, 'students', editingStudent.id), {
        name: editingStudent.name.trim().toUpperCase(),
        className: editingStudent.className.trim().toUpperCase(),
        stream: editingStudent.stream.trim().toUpperCase(),
        updatedAt: serverTimestamp()
      });
      setEditingStudent(null);
      setStatusMessage({ type: 'success', text: 'Maklumat murid berjaya dikemaskini!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, 'students');
      setStatusMessage({ type: 'error', text: 'Gagal mengemaskini murid.' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'Nama Murid,Kelas,Aliran / Tahun\nALI BIN ABU,1 BESTARI,TAHUN 1\nSITI BINTI AHMAD,1 BESTARI,TAHUN 1';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Import_Murid.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadStudentsData = () => {
    const data = students.map(s => ({
      'Nama Murid': s.name,
      'Kelas': s.className,
      'Aliran / Tahun': s.stream
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Senarai_Murid.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncFromENilam = () => {
    setConfirmDialog({
      title: 'Sync dari e-NILAM',
      message: 'Adakah anda pasti mahu menyegerakkan data dari e-NILAM? Ini akan menambah murid yang belum ada dalam senarai.',
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        try {
          const logsQ = query(collection(db, 'logs'));
          const logsSnapshot = await getDocs(logsQ);
          
          const uniqueLogsMap = new Map<string, {name: string, className: string, stream: string}>();
          logsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.studentName && data.studentClass && data.studentStream) {
              const cleanedName = data.studentName.trim().toUpperCase();
              const cleanedClass = data.studentClass.trim().toUpperCase();
              const cleanedStream = data.studentStream.trim().toUpperCase();
              
              if (cleanedName.length > 0 && cleanedClass.length > 0 && cleanedStream.length > 0) {
                const s = {
                  name: cleanedName,
                  className: cleanedClass,
                  stream: cleanedStream
                };
                const key = `${s.name}-${s.className}-${s.stream}`;
                uniqueLogsMap.set(key, s);
              }
            }
          });

          const existingKeys = new Set(students.map(s => `${String(s.name).trim().toUpperCase()}-${String(s.className).trim().toUpperCase()}-${String(s.stream).trim().toUpperCase()}`));
          let addedCount = 0;

          for (const [key, s] of uniqueLogsMap.entries()) {
            const checkKey = `${s.name.toUpperCase()}-${s.className.toUpperCase()}-${s.stream.toUpperCase()}`;
            if (!existingKeys.has(checkKey)) {
              const id = uuidv4();
              try {
                await setDoc(doc(db, 'students', id), {
                  name: s.name,
                  className: s.className,
                  stream: s.stream,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
                addedCount++;
              } catch (err) {
                console.error('Failed to add student:', s, err);
              }
            }
          }

          setStatusMessage({ type: 'success', text: `Data telah sync! ${addedCount} murid baharu berjaya ditambah dari e-NILAM!` });
          setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
          console.error('Sync Error:', error);
          setStatusMessage({ type: 'error', text: 'Gagal menyegerakkan data.' });
          setTimeout(() => setStatusMessage(null), 3000);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      // Type assertion as we expect these keys
      const results = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      const validData = results.filter(row => {
        return row['Nama Murid']?.trim().length > 0 && 
               row['Kelas']?.trim().length > 0 && 
               row['Aliran / Tahun']?.trim().length > 0;
      });
      
      if (validData.length === 0) {
        setStatusMessage({ type: 'error', text: 'Tiada data sah dijumpai. Sila pastikan format adalah betul.' });
        setTimeout(() => setStatusMessage(null), 5000);
        return;
      }

      setLoading(true);
      
      // Use batch for better performance when importing large datasets
      let batch = writeBatch(db);
      let count = 0;
      
      for (const row of validData) {
        const id = uuidv4();
        const docRef = doc(db, 'students', id);
        batch.set(docRef, {
          name: row['Nama Murid'].trim().toUpperCase(),
          className: row['Kelas'].trim().toUpperCase(),
          stream: row['Aliran / Tahun'].trim().toUpperCase(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        count++;
        if (count >= 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
      
      setStatusMessage({ type: 'success', text: `${validData.length} murid berjaya diimport!` });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error('File Parsing Error:', error);
      setStatusMessage({ type: 'error', text: 'Ralat semasa membaca fail.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const totalStudents = students.length;
  const studentsPerStream = students.reduce((acc, student) => {
    acc[student.stream] = (acc[student.stream] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const studentsPerClass = students.reduce((acc, student) => {
    const key = `${student.stream} ${student.className}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500 mb-4"></div>
      <p className="text-slate-600">Memuatkan data murid...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {statusMessage && (
        <div className={`px-4 py-3 font-bold text-white rounded-xl shadow-sm text-center animate-in slide-in-from-top-4 ${statusMessage.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {statusMessage.text}
        </div>
      )}

      {/* Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold">Jumlah Murid</p>
            <h3 className="text-3xl font-black text-slate-800">{totalStudents}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <h4 className="text-slate-500 text-sm font-bold mb-3 flex items-center">
            Statistik Aliran / Tahun
          </h4>
          <div className="space-y-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(studentsPerStream).sort((a,b) => a[0].localeCompare(b[0])).map(([stream, count]) => (
              <div key={stream} className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-700">{stream}</span>
                <span className="bg-blue-50 text-blue-700 py-1 px-2 rounded-lg font-bold">{count} orang</span>
              </div>
            ))}
            {Object.keys(studentsPerStream).length === 0 && <p className="text-xs text-slate-400">Tiada data</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <h4 className="text-slate-500 text-sm font-bold mb-3 flex items-center">
            Statistik Kelas
          </h4>
          <div className="space-y-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(studentsPerClass).sort((a,b) => a[0].localeCompare(b[0])).map(([cls, count]) => (
              <div key={cls} className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-700">{cls}</span>
                <span className="bg-emerald-50 text-emerald-700 py-1 px-2 rounded-lg font-bold">{count} orang</span>
              </div>
            ))}
            {Object.keys(studentsPerClass).length === 0 && <p className="text-xs text-slate-400">Tiada data</p>}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">Pengurusan Murid</h2>
              <p className="text-slate-500 text-sm">Urus senarai nama murid bagi tujuan perekodan e-NILAM</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
            <button
              onClick={handleSyncFromENilam}
              className="flex items-center px-4 py-2 font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition-colors text-sm"
              title="Sync dari e-NILAM"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sync Data</span>
            </button>

            <button
              onClick={handleDownloadStudentsData}
              className="flex items-center px-4 py-2 font-bold text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-xl transition-colors text-sm"
              title="Muat Turun Senarai Murid"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Muat Turun Data</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="flex items-center px-4 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm"
              title="Muat Turun Template CSV"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Template CSV</span>
            </button>
            
            <label className="flex items-center px-4 py-2 font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors text-sm cursor-pointer" title="Import data dari fail Excel/CSV">
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Import Fail</span>
              <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={handleFileUpload} />
            </label>

            <button
              onClick={() => setShowBulkAdd(true)}
              className="flex items-center px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pukal
            </button>

            <button
              onClick={handleDeleteAll}
              className="flex items-center px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors text-sm"
              title="Padam Semua Murid"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Padam Semua
            </button>
          </div>
        </div>

        {/* Search Bar and Add Button */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari murid mengikut nama, kelas atau aliran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none font-medium text-slate-700 shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowAddStudent(true)}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-colors flex items-center justify-center whitespace-nowrap"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Murid
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-600 text-sm">Bil</th>
                <th className="p-4 font-bold text-slate-600 text-sm">Nama Murid</th>
                <th className="p-4 font-bold text-slate-600 text-sm">Kelas</th>
                <th className="p-4 font-bold text-slate-600 text-sm">Aliran / Tahun</th>
                <th className="p-4 font-bold text-slate-600 text-sm text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-500 font-medium text-sm">{index + 1}</td>
                  <td className="p-4 font-bold text-slate-800">{student.name}</td>
                  <td className="p-4 font-bold text-blue-600">{student.className}</td>
                  <td className="p-4 font-bold text-purple-600">{student.stream}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        title="Padam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    {searchQuery ? "Tiada murid sepadan dengan carian." : "Tiada rekod murid dijumpai. Sila tambah senarai murid."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-6 py-2.5 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                Teruskan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Student */}
      {showAddStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 flex-none">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                <Users className="w-5 h-5 mr-3 text-blue-600" />
                Tambah Murid Baru
              </h3>
              <button
                onClick={() => setShowAddStudent(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="add-student-form" onSubmit={handleAddStudent} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tahun / Aliran</label>
                    <select
                      value={newStream}
                      onChange={(e) => { setNewStream(e.target.value); setNewClassName(''); }}
                      className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none font-medium text-slate-700"
                      required
                    >
                      <option value="">Pilih Tahun / Aliran...</option>
                      {streams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Kelas</label>
                    {classes.length > 0 ? (
                      <select
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        disabled={!newStream}
                        className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none font-medium text-slate-700 disabled:bg-slate-100 disabled:opacity-50"
                        required
                      >
                        <option value="">Pilih Kelas...</option>
                        {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Masukkan kelas (cth: 1 UM)"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        disabled={!newStream}
                        className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none font-medium text-slate-700 disabled:bg-slate-100 disabled:opacity-50"
                        required
                      />
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nama Penuh Murid</label>
                  <input
                    type="text"
                    placeholder="Sila Masukkan Nama Penuh Murid"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none font-medium text-slate-700"
                    required
                  />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 flex-none bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowAddStudent(false)}
                className="px-6 py-2.5 font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="add-student-form"
                className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Tambah Murid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bulk Add */}
      {showBulkAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                <Users className="w-5 h-5 mr-3 text-blue-600" />
                Tambah Murid Secara Pukal
              </h3>
              <button
                onClick={() => setShowBulkAdd(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBulkAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Aliran / Tahun</label>
                  <input
                    type="text"
                    required
                    value={bulkStream}
                    onChange={(e) => setBulkStream(e.target.value)}
                    placeholder="Contoh: TAHUN 1"
                    className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    required
                    value={bulkClassName}
                    onChange={(e) => setBulkClassName(e.target.value)}
                    placeholder="Contoh: 1 BESTARI"
                    className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Senarai Nama (Satu nama setiap baris)</label>
                <textarea
                  required
                  rows={10}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="ALI BIN ABU&#10;SITI BINTI AHMAD&#10;..."
                  className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end pt-4 gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkAdd(false)}
                  className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  Simpan Semua
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                <Edit className="w-5 h-5 mr-3 text-amber-600" />
                Kemaskini Murid
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Murid</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                  className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Aliran / Tahun</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.stream}
                    onChange={(e) => setEditingStudent({...editingStudent, stream: e.target.value})}
                    className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.className}
                    onChange={(e) => setEditingStudent({...editingStudent, className: e.target.value})}
                    className="w-full p-3 font-medium border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
