import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { categorizeBookContent } from '../../lib/gemini';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { Edit3, Wand2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EditBook() {
  const { bookId } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [bookType, setBookType] = useState('Buku Umum');
  const [originalData, setOriginalData] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoCategory, setAutoCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      if (!bookId) return;
      try {
        const docRef = doc(db, 'books', bookId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOriginalData(data);
          setTitle(data.title || '');
          setAuthor(data.author || '');
          setContent(data.content || '');
          setCoverUrl(data.coverUrl || '');
          setFileUrl(data.fileUrl || '');
          setBookType(data.bookType || 'Buku Umum');
        } else {
          alert('Buku tidak ditemui!');
          navigate('/admin/manage');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `books/${bookId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [bookId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bookId || !originalData) return;
    setSubmitting(true);

    try {
      // Re-evaluate category on update
      const category = await categorizeBookContent(title, content);
      setAutoCategory(category);

      const bookData = {
        title,
        content,
        category,
        bookType,
        author,
        coverUrl,
        fileUrl,
        updatedAt: serverTimestamp(),
        createdAt: originalData.createdAt,
        uploadedBy: originalData.uploadedBy,
      };

      await updateDoc(doc(db, 'books', bookId), bookData);
      
      setTimeout(() => {
        navigate('/admin/manage');
      }, 2000);

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `books/${bookId}`);
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return (
    <div className="flex justify-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-slate-500"></div>
    </div>
  );
  
  if (!user) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
        <p className="text-slate-600">Sila log masuk untuk menyunting data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex mb-6">
        <Link to="/admin/manage" className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Senarai
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <Edit3 className="w-6 h-6 mr-2 text-blue-600" />
          Sunting Bahan Bacaan
        </h1>
        <p className="text-slate-600 mt-1">
          Kemas kini butiran buku. AI akan membaca semula teks untuk menentukan kategori terkini.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {autoCategory ? (
          <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Wand2 className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Perubahan Berjaya Disimpan!</h3>
            <p className="text-slate-500">Kategori automatik terkini:</p>
            <div className="mt-4 inline-block px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-lg font-bold text-blue-700">
              {autoCategory}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Tajuk Bahan Bacaan</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Jenis / Tab Bacaan</label>
              <select
                required
                value={bookType}
                onChange={(e) => setBookType(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white"
              >
                <option value="Buku Umum">Buku Umum</option>
                <option value="Buku / E-Book">Buku / E-Book</option>
                <option value="Artikel / Jurnal">Artikel / Jurnal</option>
                <option value="Sumber Digital">Sumber Digital</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Penulis (Pilihan)</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">URL Gambar Kulit (Pilihan)</label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Dokumen Bacaan (Pautan / Fail)</label>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 700000) {
                          alert('Maaf, saiz fail terlalu besar (Maksimum 700KB).');
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFileUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Atau pautan luaran</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="Pautan (Google Drive, dll)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Kandungan / Sinopsis (Teks)</label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <>
                    <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
