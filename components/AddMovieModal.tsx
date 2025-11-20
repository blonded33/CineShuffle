
import React, { useState } from 'react';
import { X, Search, Plus, Loader2, Sparkles, Film } from 'lucide-react';
import { searchMovies } from '../services/geminiService';
import { searchMoviesTMDB, isTmdbConfigured } from '../services/tmdbService';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';
import { useStore } from '../store/useStore';
import { translations } from '../constants/translations';

interface AddMovieModalProps {
  folderId: string;
  onAddMovie: (movie: Movie) => void;
  onClose: () => void;
}

export const AddMovieModal: React.FC<AddMovieModalProps> = ({ folderId, onAddMovie, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchSource, setSearchSource] = useState<'tmdb' | 'ai' | null>(null);
  
  const { language } = useStore();
  const t = translations[language];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setSearchSource(null);

    try {
      let movies: Movie[] = [];

      // 1. Try TMDB First (Real Data)
      if (isTmdbConfigured()) {
        movies = await searchMoviesTMDB(query, language);
        if (movies.length > 0) setSearchSource('tmdb');
      }

      // 2. Fallback to AI if TMDB isn't configured or returned no results
      if (movies.length === 0) {
        const aiMovies = await searchMovies(query, language);
        movies = aiMovies.map(m => ({
          id: Math.random().toString(36).substr(2, 9),
          title: m.title,
          year: m.year,
          posterUrl: m.poster_url,
          overview: m.short_summary,
          folderId: folderId,
          addedAt: Date.now()
        }));
        if (movies.length > 0) setSearchSource('ai');
      }

      // Ensure correct folderId for adding
      const formattedMovies = movies.map(m => ({
        ...m,
        id: m.id || Math.random().toString(36).substr(2, 9),
        folderId: folderId
      }));

      setResults(formattedMovies);

    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = (movie: Movie) => {
    onAddMovie(movie);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-slate-700 shrink-0">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-dark border border-slate-600 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              autoFocus
            />
          </form>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p>{t.searching}</p>
            </div>
          ) : results.length > 0 ? (
            <>
              {searchSource === 'ai' && (
                <div className="mb-4 px-2 flex items-center gap-2 text-xs text-secondary bg-secondary/10 p-2 rounded-lg w-fit">
                  <Sparkles size={12} />
                  <span>{t.resultsByAI}</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {results.map(movie => (
                  <div key={movie.id} className="relative group">
                     <div onClick={() => handleAdd(movie)} className="cursor-pointer">
                        <MovieCard movie={movie} isCompact />
                     </div>
                     <button 
                        onClick={() => handleAdd(movie)}
                        className="absolute top-2 right-2 bg-primary text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                     >
                       <Plus size={20} />
                     </button>
                  </div>
                ))}
              </div>
            </>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Search size={48} className="mb-4 opacity-20" />
              <p>{t.noResults}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center max-w-xs mx-auto">
              <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                 <Film size={32} className="text-slate-500" />
              </div>
              <h3 className="text-white font-medium mb-1">{t.findMovie}</h3>
              <p className="text-sm">{t.findMovieDesc}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
