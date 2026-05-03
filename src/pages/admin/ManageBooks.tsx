import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { Settings, Trash2, Edit, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Book {
  id: string;
  title: string;
  author?: string;
  category: string;
  bookType?: string;
  createdAt?: any;
}

export function ManageBooks() {
  const { user, profile, loading: authLoading } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, title: string} | null>(null);

  const fetchBooks = async () => {
    try {
      const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setBooks(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user]);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'books', deleteConfirm.id));
      setDeleteConfirm(null);
      fetchBooks();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `books/${deleteConfirm.id}`);
    }
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
        <p className="text-slate-600">Sila log masuk sebagai Admin/Guru Perpustakaan untuk menyelenggara bahan bacaan.</p>
      </div>
    );
  }

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (b.author && b.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-slate-600" />
          Selenggara Buku
        </h1>
        <p className="text-slate-600 mt-1">
          Urus, kemas kini atau padam bahan bacaan yang ada di dalam arkib katalog perpustakaan.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari buku berdasarkan tajuk atau penulis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-shadow text-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-slate-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl w-10">#</th>
                  <th className="px-6 py-4">Maklumat Buku</th>
                  <th className="px-6 py-4">Kategori & Jenis</th>
                  <th className="px-6 py-4 text-center rounded-tr-xl">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map((book, i) => (
                  <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 truncate max-w-[250px] sm:max-w-xs block" title={book.title}>{book.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{book.author || 'Penerbit Umum'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mr-2 border border-indigo-100 mt-1">
                        {book.category}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1">
                        {book.bookType || 'Umum'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex justify-center space-x-3">
                      <Link 
                        to={`/admin/manage/edit/${book.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Edit Buku"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm({ id: book.id, title: book.title })}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Padam Buku"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBooks.length === 0 && (
              <div className="py-12 text-center text-slate-500 bg-white">
                Tiada buku dijumpai dalam sistem.
              </div>
            )}
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Padam Bahan Bacaan?</h3>
            <p className="text-slate-600 mb-6">
              Adakah anda pasti untuk memadam rekod <span className="font-semibold text-slate-800">"{deleteConfirm.title}"</span>? 
              Tindakan ini tidak boleh dikembalikan.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Padam Rekod
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
