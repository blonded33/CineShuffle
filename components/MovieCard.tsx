
import React, { useState } from 'react';
import { Film, Clock, Trash2 } from 'lucide-react';
import { Movie } from '../types';
import { useStore } from '../store/useStore';
import { translations } from '../constants/translations';

interface MovieCardProps {
  movie: Movie;
  onWatch?: (movieId: string) => void;
  onDelete?: (movieId: string) => void;
  isCompact?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onWatch, onDelete, isCompact = false }) => {
  const [imageError, setImageError] = useState(false);
  const { language } = useStore();
  const t = translations[language];

  // Check for valid URL. Note: TMDB urls are reliable.
  const hasValidUrl = movie.posterUrl && !movie.posterUrl.includes('picsum.photos');
  const showImage = hasValidUrl && !imageError;

  // Dynamic classes based on compact mode
  const containerClasses = isCompact 
    ? "aspect-[2/3] rounded-xl" 
    : "aspect-[2/3] rounded-3xl";
  
  const titleSize = isCompact ? "text-xs" : "text-sm sm:text-base";
  const buttonPadding = isCompact ? "py-1.5" : "py-2 sm:py-2.5";
  const contentPadding = isCompact ? "p-3" : "p-5 sm:p-6";

  return (
    <div className={`relative bg-surface overflow-hidden shadow-lg border border-white/5 ${containerClasses}`}>
      
      {showImage ? (
        <img 
          src={movie.posterUrl} 
          alt={movie.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
          <Film className="absolute text-white/5 w-48 h-48 -rotate-12 -bottom-10 -right-10" />
          
          <div className="relative z-10 bg-slate-800/50 p-4 rounded-full mb-3 backdrop-blur-sm border border-white/10">
            <Film size={isCompact ? 20 : 32} className="text-primary" />
          </div>
          
          <h4 className={`relative z-10 text-white font-bold leading-tight line-clamp-2 mb-1 px-2 ${titleSize}`}>
            {movie.title}
          </h4>
          <span className="relative z-10 text-slate-400 text-xs font-medium px-2 py-1 bg-black/20 rounded-md">
            {movie.year || 'Unknown'}
          </span>
        </div>
      )}

      {/* Overlay Gradient - Always visible */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end gap-2 ${contentPadding}`}>
        
        {/* Text Content */}
        {showImage && (
          <div className="w-full">
            <h4 className={`text-white font-bold leading-tight line-clamp-2 drop-shadow-md ${titleSize}`}>{movie.title}</h4>
            <p className="text-slate-300 text-xs mt-0.5 font-medium shadow-black drop-shadow-md">{movie.year}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full mt-1">
          {onWatch && (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch(movie.id); }}
              className={`flex-1 bg-white/10 hover:bg-primary backdrop-blur-md text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10 active:scale-95 ${buttonPadding}`}
            >
              <Clock size={14} />
              {t.watch}
            </button>
          )}
          
          {onDelete && (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(movie.id); }}
              className={`flex items-center justify-center bg-black/40 hover:bg-red-500/80 backdrop-blur-md text-white/70 hover:text-white rounded-xl transition-colors border border-white/10 active:scale-95 aspect-square ${isCompact ? 'w-8' : 'w-10'}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
