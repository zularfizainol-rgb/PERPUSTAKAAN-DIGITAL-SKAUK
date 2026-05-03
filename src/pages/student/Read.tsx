import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-error';
import { ArrowLeft, CheckCircle2, ExternalLink, Trophy, Star, BookOpen } from 'lucide-react';

export function ReadBook() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    async function fetchBook() {
      if (!bookId) return;
      try {
        const docRef = doc(db, 'books', bookId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBook({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `books/${bookId}`);
      } finally {
        setLoading(false);
      }
    }
    fetchBook();
  }, [bookId]);

  const renderDocument = (url: string) => {
    // Check if it's an image
    if (url.startsWith('data:image/') || url.match(/\.(jpeg|jpg|gif|png)$/i)) {
      return (
        <img 
          src={url} 
          alt="Dokumen Bacaan" 
          referrerPolicy="no-referrer"
          className="w-full h-auto max-h-[800px] object-contain mx-auto"
        />
      );
    }

    // Convert Google Drive view links to preview links
    let embedUrl = url;
    if (embedUrl.includes('drive.google.com/file/d/')) {
      const match = embedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    } else if (embedUrl.includes('youtube.com/watch?v=')) {
      const match = embedUrl.match(/v=([^&]+)/);
      if (match && match[1]) {
        embedUrl = `https://www.youtube.com/embed/${match[1]}`;
      }
    } else if (embedUrl.includes('youtu.be/')) {
      const match = embedUrl.match(/youtu\.be\/([^?]+)/);
      if (match && match[1]) {
        embedUrl = `https://www.youtube.com/embed/${match[1]}`;
      }
    }

    // For PDFs (data URL or regular URL) and embeddable links
    return (
      <div className="h-[600px] sm:h-[900px] w-full relative bg-white">
        <iframe 
          src={embedUrl} 
          title="Dokumen Bacaan" 
          className="absolute top-0 left-0 w-full h-full border-0"
          allowFullScreen
        />
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
      <div className="text-blue-500 font-bold animate-pulse text-xl">Memuatkan buku... 📖</div>
    </div>
  );
  if (!book) return (
    <div className="p-12 text-center bg-white rounded-3xl border-2 border-slate-100 shadow-sm max-w-2xl mx-auto">
      <div className="text-red-500 font-bold text-xl mb-2">Alamak!</div>
      <p className="text-slate-500 font-medium">Bahan bacaan tidak dijumpai.</p>
      <button onClick={() => navigate('/catalog')} className="mt-6 px-6 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors">
        Kembali ke Katalog
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/catalog')} 
        className="inline-flex items-center px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-slate-600 hover:text-blue-600 hover:shadow-md transition-all group"
      >
        <ArrowLeft className="w-5 h-5 mr-2 text-slate-400 group-hover:text-blue-500 group-hover:-translate-x-1 transition-all" />
        Kembali ke Katalog
      </button>

      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-100 overflow-hidden relative">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 sm:p-10 border-b border-slate-100">
          <div className="inline-block px-3 py-1 mb-4 rounded-full bg-blue-100 text-blue-800 text-xs font-black tracking-wide uppercase">
            {book.category}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4 leading-tight">{book.title}</h1>
          {book.author && <p className="text-slate-600 font-bold text-lg flex items-center">
            <span className="text-slate-400 mr-2">Oleh</span> {book.author}
          </p>}
        </div>
        
        <div className="p-6 sm:p-10 lg:p-12">
          {book.fileUrl && (
            <div className="mb-10 w-full overflow-hidden bg-slate-100 rounded-2xl border-2 border-slate-200 shadow-inner">
              {renderDocument(book.fileUrl)}
              <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-between items-center px-6">
                <span className="text-sm font-semibold text-slate-500">Pratonton Dokumen Asal</span>
                <button 
                  onClick={() => {
                    if (book.fileUrl.startsWith('data:')) {
                      const link = document.createElement('a');
                      link.href = book.fileUrl;
                      link.download = `Dokumen_${book.title.replace(/\s+/g, '_')}`;
                      link.click();
                    } else {
                      window.open(book.fileUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Buka/Muat Turun Fail
                </button>
              </div>
            </div>
          )}

          <div className="prose prose-lg prose-blue max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
            {book.content}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8 pb-12">
        <button
          onClick={() => setShowCertificate(true)}
          className="inline-flex items-center px-8 py-4 border-b-4 border-emerald-700 rounded-2xl shadow-xl shadow-emerald-500/30 text-lg font-black text-white bg-emerald-500 hover:bg-emerald-400 active:border-b-0 active:translate-y-1 transition-all hover:scale-105"
        >
          <CheckCircle2 className="w-7 h-7 mr-3 text-emerald-100" />
          Selesai Membaca
        </button>
      </div>

      {/* Sijil Tahniah Modal */}
      {showCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            {/* Background design */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400"></div>
            <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
              <Trophy className="w-64 h-64 text-amber-500" />
            </div>

            <Trophy className="w-20 h-20 mx-auto text-amber-400 mb-6 drop-shadow-md animate-bounce" />
            
            <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-wide">
              Tahniah!
            </h2>
            <div className="flex flex-col items-center justify-center gap-2 mb-6">
              <div className="h-1 w-16 bg-amber-400 rounded-full"></div>
              <div className="flex gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
            </div>

            <p className="text-lg text-slate-600 font-medium mb-2">
              Anda telah berjaya menyelesaikan bacaan untuk bahan:
            </p>
            <p className="text-2xl font-bold text-blue-700 mb-8 border-y-2 border-slate-100 py-4 px-2">
              {book.title}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                onClick={() => navigate('/enilam', { state: { 
                  bookTitle: book.title,
                  author: book.author || '',
                  publisher: book.publisher || '',
                  pages: book.pages || '',
                  language: book.language || '',
                  source: book.bookType === 'Buku / E-Book' ? 'Buku / e-Book' : 
                          book.bookType === 'Artikel / Jurnal' ? 'Artikel / Jurnal' : 
                          book.bookType === 'Sumber Digital' ? 'Sumber Digital' : 'Buku / e-Book'
                } })}
                className="flex-1 inline-flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 hover:bg-blue-500 hover:-translate-y-1 transition-all"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Rekod Bacaan
              </button>
              <button
                onClick={() => navigate('/catalog')}
                className="flex-1 inline-flex items-center justify-center px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold border-2 border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-all hover:-translate-y-1"
              >
                Kembali ke Katalog
              </button>
            </div>
            
            <button
              onClick={() => setShowCertificate(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

