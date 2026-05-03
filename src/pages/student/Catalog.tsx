import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { Link } from 'react-router-dom';
import { BookOpen, Tag, ArrowRight, Loader2 } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author?: string;
  category: string;
  bookType?: string;
  coverUrl?: string;
}

export function Catalog() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rakmaya' | 'buku' | 'artikel' | 'sumber-digital'>('rakmaya');

  useEffect(() => {
    // Only fetch books when a tab that needs books is selected
    // Rak Maya doesn't need to load books from Firestore
    if (activeTab === 'rakmaya') {
      if (books.length === 0) setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        setBooks(booksData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'books');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTab]);

  const filteredBooks = books.filter(book => {
    if (activeTab === 'buku') return book.bookType === 'Buku / E-Book' || book.bookType === 'Buku Umum';
    if (activeTab === 'artikel') return book.bookType === 'Artikel / Jurnal';
    if (activeTab === 'sumber-digital') return book.bookType === 'Sumber Digital' || book.bookType === 'Bacaan Ringan' || !book.bookType;
    return false;
  });

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 p-8 sm:p-10 rounded-3xl shadow-lg shadow-blue-500/20 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <BookOpen className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Katalog Bahan Bacaan</h1>
          <p className="text-blue-50 text-lg max-w-xl font-medium mb-2">
            Pilih bahan kegemaran anda, luangkan masa membaca, dan jangan lupa rekod dalam e-NILAM!
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4 p-2 bg-white rounded-2xl shadow-sm border border-slate-100">
        <button
          onClick={() => setActiveTab('rakmaya')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'rakmaya' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
        >
          Rak Maya SKAUK
        </button>
        <button
          onClick={() => setActiveTab('buku')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'buku' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
        >
          Buku / E-Book
        </button>
        <button
          onClick={() => setActiveTab('artikel')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'artikel' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
        >
          Artikel / Jurnal
        </button>
        <button
          onClick={() => setActiveTab('sumber-digital')}
          className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'sumber-digital' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
        >
          Sumber Digital
        </button>
      </div>

      {activeTab === 'rakmaya' ? (
        <div className="bg-white rounded-3xl border-2 border-slate-100 p-8 sm:p-12 text-center shadow-sm">
          <BookOpen className="mx-auto h-20 w-20 text-blue-500 mb-6" />
          <h2 className="text-3xl font-black text-slate-900 mb-4">Rak Maya SKAUK</h2>
          <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto mb-8">
            Dapatkan pengalaman membaca yang luar biasa menerusi Rak Maya SKAUK. Buka tab baru untuk melihat katalog penuh kami yang dikemas kini setiap minggu!
          </p>
          <a
            href="https://skauk.rakmaya.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-500 transition-all hover:-translate-y-1 active:scale-95"
          >
            Akses Rak Maya Penuh
            <ArrowRight className="ml-3 w-6 h-6" />
          </a>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center p-12 min-h-[40vh] bg-white rounded-3xl border-2 border-slate-100 shadow-sm">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <div className="text-slate-600 font-bold animate-pulse">Memuatkan carian katalog...</div>
        </div>
      ) : (
        <>
          <div className="bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-amber-900 relative p-6 sm:p-10 rounded-3xl min-h-[50vh] shadow-inner border-8 border-amber-950">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-12 gap-x-4 sm:gap-x-6 relative z-10">
              {filteredBooks.map(book => (
                <div key={book.id} className="relative flex flex-col h-full group pb-6">
                  <Link 
                    to={`/read/${book.id}`}
                    className="z-10 flex flex-col bg-amber-50 rounded-t-xl rounded-b-sm overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:-translate-y-4 group-hover:shadow-[5px_15px_25px_rgba(0,0,0,0.6)] h-full border border-amber-200/50 relative transform perspective-1000 origin-bottom"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center relative overflow-hidden">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-400">
                          <BookOpen className="w-20 h-20" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 shadow-md">
                        <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded bg-white/95 backdrop-blur text-amber-900 text-[10px] sm:text-xs font-black shadow-sm border border-amber-100">
                          <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" />
                          <span className="truncate max-w-[80px] sm:max-w-max">{book.category}</span>
                        </span>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 flex-1 flex flex-col bg-gradient-to-b from-white to-amber-50">
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 line-clamp-2 mb-1 sm:mb-2 group-hover:text-amber-700 transition-colors leading-tight">
                        {book.title}
                      </h3>
                      {book.author && <p className="text-xs sm:text-sm text-slate-600 font-semibold line-clamp-1 mb-2 sm:mb-4">{book.author}</p>}
                      <div className="mt-auto pt-2 sm:pt-4 border-t border-amber-900/10 flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full whitespace-nowrap overflow-hidden text-ellipsis">Baca</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-amber-500 group-hover:text-amber-700 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>

                  {/* 3D Shelf Layer */}
                  <div className="absolute bottom-0 left-[-8%] right-[-8%] h-8 bg-gradient-to-b from-amber-800 to-amber-950 rounded-sm shadow-[0_15px_20px_rgba(0,0,0,0.6)] z-0 border-t border-amber-600 relative overflow-hidden flex flex-col align-top">
                    {/* Wood edge highlight */}
                    <div className="w-full h-1 bg-amber-500/40"></div>
                    <div className="w-full h-[1px] bg-amber-900/80 mt-1"></div>
                    <div className="w-full h-[1px] bg-amber-900/80 mt-1"></div>
                  </div>
                </div>
              ))}
            </div>

            {filteredBooks.length === 0 && (
              <div className="text-center py-20 relative z-10 bg-black/20 rounded-3xl backdrop-blur-sm border-2 border-amber-900/50 border-dashed mx-4">
                <BookOpen className="mx-auto h-16 w-16 text-amber-400 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-amber-100">Rak Kosong</h3>
                <p className="mt-2 text-amber-200/70 font-medium">Tiada bahan bacaan untuk diletakkan di rak ini.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
