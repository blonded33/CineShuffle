
import React, { useEffect, useState } from 'react';
import { X, Film, CheckCircle, Sparkles } from 'lucide-react';
import { Movie } from '../types';
import { useStore } from '../store/useStore';
import { translations } from '../constants/translations';

interface RandomizerOverlayProps {
  movies: Movie[];
  onClose: () => void;
  onWatch: (movieId: string) => void;
}

export const RandomizerOverlay: React.FC<RandomizerOverlayProps> = ({ movies, onClose, onWatch }) => {
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [isShuffling, setIsShuffling] = useState(true);
  const [winner, setWinner] = useState<Movie | null>(null);
  const [imageError, setImageError] = useState(false);
  const { language } = useStore();
  const t = translations[language];

  useEffect(() => {
    if (movies.length === 0) return;
    setImageError(false);

    // Shuffle animation logic
    let interval: ReturnType<typeof setInterval>;
    let counter = 0;
    const maxIterations = 25; // How many flips before stopping
    const speed = 100;

    interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * movies.length);
      setCurrentMovie(movies[randomIndex]);
      setImageError(false); // Reset error for new frame
      counter++;

      if (counter >= maxIterations) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * movies.length);
        const winningMovie = movies[finalIndex];
        setWinner(winningMovie);
        setCurrentMovie(winningMovie);
        setIsShuffling(false);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [movies]);

  if (!currentMovie && isShuffling) return null;

  const hasValidUrl = currentMovie?.posterUrl && !currentMovie.posterUrl.includes('picsum.photos');
  const showImage = hasValidUrl && !imageError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-50"
      >
        <X size={32} />
      </button>

      <div className="w-full max-w-md flex flex-col items-center gap-8 animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {isShuffling ? t.shuffling : t.tonightsPick}
          </h2>
        </div>

        {/* Card */}
        <div className={`
          relative w-72 aspect-square bg-surface rounded-3xl shadow-2xl overflow-hidden border-4
          ${isShuffling ? 'border-surface' : 'border-primary shadow-[0_0_30px_rgba(225,29,72,0.6)]'}
          transition-all duration-500
        `}>
           {showImage ? (
             <img 
               src={currentMovie?.posterUrl} 
               alt={currentMovie?.title}
               onError={() => setImageError(true)}
               className={`w-full h-full object-cover ${isShuffling ? 'opacity-50 blur-sm' : 'opacity-100'}`}
             />
           ) : (
             <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 text-center relative">
                <Film className="absolute text-white/5 w-56 h-56 -rotate-12 -bottom-12 -right-12" />
                <div className="bg-surface p-5 rounded-full mb-4 shadow-inner">
                  <Film size={48} className="text-primary" />
                </div>
                <h3 className="relative z-10 text-2xl font-bold text-white leading-tight mb-2">
                  {currentMovie?.title}
                </h3>
                <span className="relative z-10 text-slate-400 font-medium border border-slate-700 px-3 py-1 rounded-full text-sm">
                  {currentMovie?.year}
                </span>
             </div>
           )}
            
            {/* Winner overlay icon */}
            {!isShuffling && (
              <div className="absolute top-4 right-4 bg-primary text-white p-2 rounded-full shadow-lg animate-bounce-short z-20">
                 <Sparkles size={24} />
              </div>
            )}
        </div>

        {/* Actions */}
        {!isShuffling && winner && (
          <div className="flex flex-col gap-3 w-full animate-in slide-in-from-bottom-4 duration-500 delay-200">
            <button 
              onClick={() => onWatch(winner.id)}
              className="w-full py-4 bg-primary hover:bg-red-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <CheckCircle size={24} />
              {t.markWatched}
            </button>
            
            <button 
              onClick={onClose}
              className="w-full py-3 bg-surface hover:bg-slate-700 text-gray-300 rounded-xl font-medium transition-colors"
            >
              {t.maybeLater}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
