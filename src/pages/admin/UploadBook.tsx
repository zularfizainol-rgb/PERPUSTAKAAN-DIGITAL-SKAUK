import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { categorizeBookContent } from '../../lib/gemini';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { BookPlus, Wand2, Star } from 'lucide-react';

export function UploadBook() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [pages, setPages] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [bookType, setBookType] = useState('Buku Umum');
  const [submitting, setSubmitting] = useState(false);
  const [autoCategory, setAutoCategory] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      // Use Gemini to auto-categorize
      const category = await categorizeBookContent(title, content);
      setAutoCategory(category);

      let finalCoverUrl = coverUrl;
      if (!finalCoverUrl) {
        // Generate an attractive default logo/image if not provided
        finalCoverUrl = `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(title)}`;
      }
      setCoverUrl(finalCoverUrl); // update state to show on success screen

      const bookData = {
        title,
        author,
        publisher,
        pages,
        content,
        category,
        bookType,
        coverUrl: finalCoverUrl,
        ...(fileUrl ? { fileUrl } : {}),
        uploadedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'books'), bookData);
      
      // Artificial delay to show the category and image to the user briefly before navigating
      setTimeout(() => {
        navigate('/catalog');
      }, 3000);

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'books');
      setSubmitting(false);
    }
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
        <p className="text-slate-600">Sila log masuk sebagai Admin/Guru Perpustakaan untuk melihat muat naik bahan bacaan.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <BookPlus className="w-6 h-6 mr-2 text-indigo-600" />
          Tambah Bahan Bacaan
        </h1>
        <p className="text-slate-600 mt-1">
          Muat naik tajuk dan kandungan. Sistem AI akan mengekstrak kategori secara automatik.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {autoCategory ? (
          <div className="text-center py-12 animate-in fade-in zoom-in duration-500 flex flex-col items-center">
            {coverUrl ? (
              <div className="w-40 h-56 mb-6 rounded-xl shadow-lg border-4 border-indigo-100 overflow-hidden relative group">
                <img src={coverUrl} alt="Cover Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-indigo-600/20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Star className="w-8 h-8 text-yellow-300 drop-shadow-md mb-1" />
                  <span className="text-white font-bold text-sm drop-shadow-md">Menarik!</span>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                <Wand2 className="w-10 h-10 text-indigo-600 animate-pulse" />
              </div>
            )}
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Bahan Berjaya Ditambah!</h3>
            <p className="text-slate-500">Kategori secara automatik dikesan:</p>
            <div className="mt-3 inline-block px-5 py-2.5 bg-indigo-50 border-2 border-indigo-200 rounded-xl text-lg font-black text-indigo-700 shadow-sm">
              {autoCategory}
            </div>
            <p className="text-sm font-medium text-slate-400 mt-8 flex items-center justify-center">
              <Wand2 className="w-4 h-4 mr-2 animate-spin" />
              Menyediakan paparan untuk murid...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <span className="text-sm text-slate-600 font-medium">Contoh data untuk ujian sistem:</span>
              <button
                type="button"
                onClick={() => {
                  setTitle('Kembara ke Angkasa Lepas');
                  setAuthor('Dr. Angkasa');
                  setPublisher('Penerbit Bintang');
                  setPages('250');
                  setCoverUrl('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop');
                  setFileUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
                  setContent('Sistem suria kita terdiri daripada lapan planet yang mengelilingi matahari. Matahari adalah sebuah bintang gas gergasi yang membekalkan tenaga kepada seluruh sistem suria. Bumi, planet ketiga dari matahari, adalah satu-satunya planet yang diketahui mempunyai hidupan. Musytari pula adalah planet terbesar, manakala Utarid adalah yang paling hampir dengan matahari...');
                }}
                className="text-sm bg-white border border-slate-300 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 px-4 py-2 rounded-lg transition-colors shadow-sm font-semibold"
              >
                Isi Data Contoh
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Tajuk Bahan Bacaan</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                placeholder="Contoh: Sejarah Kesultanan Melaka"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Jenis / Tab Bacaan</label>
              <select
                required
                value={bookType}
                onChange={(e) => setBookType(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white"
              >
                <option value="Buku Umum">Buku Umum</option>
                <option value="Buku / E-Book">Buku / E-Book</option>
                <option value="Artikel / Jurnal">Artikel / Jurnal</option>
                <option value="Sumber Digital">Sumber Digital</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Pilih tab di mana bahan ini akan dipaparkan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Penulis (Pilihan)</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="Nama Penulis"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Penerbit (Pilihan)</label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="Nama Penerbit"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Bilangan Muka Surat (Pilihan)</label>
                <input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="Contoh: 150"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">URL Gambar Kulit (Pilihan)</label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Dokumen Bacaan (Muat Naik atau Pautan)</label>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 700000) {
                          alert('Maaf, saiz fail terlalu besar (Maksimum 700KB). Sila gunakan pilihan muat naik pautan jika fail anda lebih besar.');
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
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100"
                  />
                  <div className="text-xs text-slate-500 whitespace-nowrap font-medium">Maks: 700KB</div>
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Atau masukkan pautan luaran</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="https://... (Contoh: awam dari Google Drive)"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Muat naik fail dari komputer, atau tampal pautan awam dokumen. Fail PDF/Imej akan dipaparkan terus dalam pandangan murid.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Kandungan / Sinopsis (Teks)</label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                placeholder="Salin dan tampal kandungan penuh di sini, atau tuliskan sinopsis ringkas jika meletakkan pautan fail PDF di atas..."
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <>
                    <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses AI...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Tambah & Kategori (AI)
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
