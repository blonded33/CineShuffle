
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Folder, Movie } from './types';
import { CreateFolderModal } from './components/CreateFolderModal';
import { RandomizerOverlay } from './components/RandomizerOverlay';
import { QuickShuffleModal } from './components/QuickShuffleModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AddMovieModal } from './components/AddMovieModal';
import { MovieCard } from './components/MovieCard';
import { translations } from './constants/translations';
import { 
  Folder as FolderIcon, 
  Plus, 
  ChevronRight, 
  Shuffle, 
  Film, 
  Clock, 
  ArrowLeft,
  Sparkles,
  Trash2,
  RefreshCcw,
  Zap,
  CheckCircle,
  Search,
  Globe
} from 'lucide-react';
import { generateMovieSuggestions } from './services/geminiService';

// --- Components (Inline for simplicity given strict file limit, but structured logically) ---

// 1. Dashboard Page
const Dashboard = () => {
  const { folders, history, addToHistory, language, setLanguage } = useStore();
  const t = translations[language];
  const [showModal, setShowModal] = useState(false);
  const [showQuickShuffle, setShowQuickShuffle] = useState(false);
  
  // State for Quick Shuffle Result
  const [quickMovies, setQuickMovies] = useState<Movie[]>([]);
  const [showQuickRandomizer, setShowQuickRandomizer] = useState(false);

  // Calculate stats
  const totalUnwatched = useStore(state => state.movies.length);
  const totalWatched = history.length;

  const handleQuickMoviesGenerated = (movies: Movie[]) => {
    setQuickMovies(movies);
    setShowQuickShuffle(false);
    setShowQuickRandomizer(true);
  };

  const handleQuickWatch = (movieId: string) => {
    const movie = quickMovies.find(m => m.id === movieId);
    if (movie) {
      addToHistory(movie);
    }
    setShowQuickRandomizer(false);
    setQuickMovies([]);
  };

  return (
    <div className="pb-24 pt-6 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
      
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {t.appTitle}<span className="text-primary">{t.appTitleSuffix}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t.tagline}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 transition-colors border border-slate-700"
          >
            <Globe size={14} />
            {language === 'en' ? 'TR' : 'EN'}
          </button>
          <div className="bg-surface px-4 py-2 rounded-full border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-2">
             <Film size={14} className="text-primary" /> {totalUnwatched} 
             <span className="w-px h-3 bg-slate-600"></span>
             <Clock size={14} className="text-green-500" /> {totalWatched}
          </div>
        </div>
      </header>

      {/* Instant Action Banner */}
      <section>
        <button 
          onClick={() => setShowQuickShuffle(true)}
          className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-orange-600 p-6 text-left shadow-lg shadow-primary/20 group hover:scale-[1.01] transition-transform"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity group-hover:rotate-12 transform duration-500">
             <Zap size={100} className="fill-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-white/80 font-bold text-xs uppercase tracking-wider">
              <Sparkles size={14} />
              <span>{t.instantLabel}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">{t.instantTitle}</h2>
            <p className="text-white/90 text-sm sm:text-base max-w-xs">
              {t.instantDesc}
            </p>
          </div>
        </button>
      </section>

      {/* Folders Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{t.collectionsTitle}</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Create New Button */}
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-3 h-24 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-primary hover:text-primary hover:bg-surface/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus size={20} />
            </div>
            <span className="font-semibold">{t.createNew}</span>
          </button>

          {/* Folder Cards */}
          {folders.map(folder => (
            <Link 
              key={folder.id} 
              to={`/folder/${folder.id}`}
              className="relative group bg-surface rounded-xl p-5 border border-slate-800 hover:border-slate-600 transition-all shadow-lg hover:shadow-xl flex flex-col justify-between h-32 overflow-hidden"
            >
              {folder.type === 'ai' && (
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-secondary/20 rounded-full blur-xl group-hover:bg-secondary/30 transition-all" />
              )}
              
              <div className="flex items-start justify-between relative z-10">
                <div className={`p-2 rounded-lg ${folder.type === 'ai' ? 'bg-secondary/20 text-secondary' : 'bg-slate-700 text-slate-300'}`}>
                  {folder.type === 'ai' ? <Sparkles size={20} /> : <FolderIcon size={20} />}
                </div>
                {folder.type === 'ai' && (
                   <span className="text-[10px] uppercase tracking-wider font-bold text-secondary border border-secondary/30 px-2 py-0.5 rounded-full">AI</span>
                )}
              </div>
              
              <div className="relative z-10">
                <h3 className="font-bold text-white text-lg truncate">{folder.name}</h3>
                <div className="flex items-center text-xs text-slate-400 mt-1">
                  <span>{useStore.getState().movies.filter(m => m.folderId === folder.id).length} {t.moviesCount}</span>
                  <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
      {/* History Link */}
      <section>
        <Link to="/history" className="block bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-xl border border-slate-700/50 flex items-center gap-4 hover:border-slate-600 transition-colors">
           <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
             <Clock size={20} />
           </div>
           <div>
             <h3 className="font-bold text-white">{t.watchHistory}</h3>
             <p className="text-xs text-slate-400">{t.watchHistoryDesc}</p>
           </div>
           <ChevronRight size={18} className="ml-auto text-slate-500" />
        </Link>
      </section>

      {showModal && <CreateFolderModal onClose={() => setShowModal(false)} />}
      
      {showQuickShuffle && (
        <QuickShuffleModal 
          onClose={() => setShowQuickShuffle(false)} 
          onMoviesGenerated={handleQuickMoviesGenerated}
        />
      )}

      {showQuickRandomizer && (
        <RandomizerOverlay 
          movies={quickMovies} 
          onClose={() => setShowQuickRandomizer(false)} 
          onWatch={handleQuickWatch}
        />
      )}
    </div>
  );
};

// 2. Folder Details Page
const FolderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { folders, movies, deleteFolder, addMovie, removeMovie, markAsWatched, language } = useStore();
  const t = translations[language];
  
  const folder = folders.find(f => f.id === id);
  const folderMovies = movies.filter(m => m.folderId === id);
  
  const [showRandomizer, setShowRandomizer] = useState(false);
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!folder) return <div className="text-center p-10 text-slate-400">Folder not found</div>;

  const handleRefill = async () => {
    if (!folder.aiPrompt) return;
    setIsRefilling(true);
    try {
      const newSuggestions = await generateMovieSuggestions(folder.aiPrompt, language);
      // Filter out duplicates roughly by title
      const existingTitles = new Set(folderMovies.map(m => m.title.toLowerCase()));
      const uniqueNew = newSuggestions.filter(s => !existingTitles.has(s.title.toLowerCase()));
      
      uniqueNew.forEach(s => {
        addMovie({
          id: Math.random().toString(36).substr(2, 9),
          title: s.title,
          year: s.year,
          overview: s.short_summary,
          posterUrl: s.poster_url, // Pass through URL if valid
          folderId: folder.id,
          addedAt: Date.now()
        });
      });
    } catch (e) {
      console.error(e);
    }
    setIsRefilling(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteFolder(folder.id);
    navigate('/');
  };

  const handleWatch = (movieId: string) => {
     markAsWatched(movieId);
     setShowRandomizer(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-dark/80 backdrop-blur-md border-b border-slate-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-300 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-lg text-white truncate max-w-[150px] sm:max-w-[250px]">{folder.name}</h1>
        </div>
        
        <div className="flex items-center gap-1">
           <button 
             onClick={() => setShowAddMovie(true)}
             className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
             title={t.addManually}
           >
             <Plus size={24} />
           </button>
           <button onClick={handleDelete} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
             <Trash2 size={20} />
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-32 max-w-5xl mx-auto w-full">
        {folder.type === 'ai' && (
          <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Sparkles className="text-secondary shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs text-secondary font-bold uppercase tracking-wide mb-1">{t.aiPromptLabel}</p>
              <p className="text-sm text-slate-300 italic">"{folder.aiPrompt}"</p>
            </div>
          </div>
        )}

        {folderMovies.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center">
              <Film size={48} className="mb-4 opacity-20" />
              <p className="mb-6">{t.emptyFolder}</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setShowAddMovie(true)} 
                  className="px-6 py-3 bg-surface border border-slate-700 text-white rounded-xl font-medium text-sm hover:bg-slate-700 flex items-center gap-2"
                >
                   <Search size={16} />
                   {t.addManually}
                </button>
                
                {folder.type === 'ai' && (
                  <button 
                    onClick={handleRefill} 
                    disabled={isRefilling}
                    className="px-6 py-3 bg-secondary text-white rounded-xl font-medium text-sm flex items-center gap-2"
                  >
                    {isRefilling ? <RefreshCcw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {isRefilling ? t.generating : t.generateMore}
                  </button>
                )}
              </div>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {folderMovies.map(movie => (
              <MovieCard 
                key={movie.id} 
                movie={movie} 
                onWatch={markAsWatched}
                onDelete={removeMovie}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky Footer Action */}
      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center gap-4 pointer-events-none z-20">
         <div className="pointer-events-auto flex gap-4">
            {folder.type === 'ai' && (
              <button 
                onClick={handleRefill}
                disabled={isRefilling}
                className="w-14 h-14 rounded-full bg-surface border border-slate-600 text-slate-300 shadow-xl flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all"
                title={t.refillTitle}
              >
                <RefreshCcw size={24} className={isRefilling ? 'animate-spin' : ''} />
              </button>
            )}
            
            {folderMovies.length > 0 && (
              <button 
                onClick={() => setShowRandomizer(true)}
                className="h-14 px-8 rounded-full bg-primary text-white shadow-xl shadow-primary/30 flex items-center gap-2 font-bold text-lg hover:bg-rose-700 transition-transform active:scale-95"
              >
                <Shuffle size={20} />
                {t.shufflePick}
              </button>
            )}
         </div>
      </div>

      {showRandomizer && (
        <RandomizerOverlay 
          movies={folderMovies} 
          onClose={() => setShowRandomizer(false)} 
          onWatch={handleWatch}
        />
      )}
      
      {showAddMovie && (
        <AddMovieModal 
          folderId={folder.id}
          onAddMovie={addMovie}
          onClose={() => setShowAddMovie(false)}
        />
      )}

      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteMsg}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmLabel={t.confirmLabel}
        cancelLabel={t.cancelLabel}
        isDangerous={true}
      />
    </div>
  );
};

// 3. History Page
const HistoryPage = () => {
  const navigate = useNavigate();
  const { history, removeFromHistory, language } = useStore();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-dark p-4 max-w-4xl mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-300 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white">{t.watchHistory}</h1>
      </header>

      <div className="space-y-4">
        {history.length === 0 ? (
           <p className="text-slate-500 text-center py-10">{t.emptyHistory}</p>
        ) : (
          history.map(movie => (
            <div key={movie.id} className="relative flex gap-4 bg-surface p-3 rounded-xl border border-slate-800 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all items-center group">
               <div className="w-16 h-16 rounded-lg bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                  {movie.posterUrl && !movie.posterUrl.includes('picsum') ? (
                    <img src={movie.posterUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="text-slate-600" size={24} />
                  )}
               </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold truncate">{movie.title}</h3>
                  <p className="text-sm text-slate-400">{movie.year}</p>
                </div>
                <div className="flex items-center gap-3 pl-2">
                   <div className="text-xs text-green-500 flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle size={14} /> <span className="hidden sm:inline">{t.watchedLabel}</span>
                   </div>
                   <button 
                     onClick={() => removeFromHistory(movie.id)}
                     className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                     title={t.removeFromHistory}
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/folder/:id" element={<FolderDetails />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
