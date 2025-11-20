
import React, { useState } from 'react';
import { X, Zap, Sparkles } from 'lucide-react';
import { generateMovieSuggestions } from '../services/geminiService';
import { Movie } from '../types';
import { useStore } from '../store/useStore';
import { translations } from '../constants/translations';

interface QuickShuffleModalProps {
  onClose: () => void;
  onMoviesGenerated: (movies: Movie[]) => void;
}

export const QuickShuffleModal: React.FC<QuickShuffleModalProps> = ({ onClose, onMoviesGenerated }) => {
  const [mood, setMood] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useStore();
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood.trim()) return;

    setIsLoading(true);
    try {
      const suggestions = await generateMovieSuggestions(mood, language);
      
      const movies: Movie[] = suggestions.map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        title: s.title,
        year: s.year,
        overview: s.short_summary,
        folderId: 'temp',
        addedAt: Date.now()
      }));

      onMoviesGenerated(movies);
    } catch (err) {
      console.error("Failed to fetch quick movies", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
        >
          <X size={24} />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <Zap size={32} className="text-white fill-white" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{t.instantShuffleTitle}</h2>
          <p className="text-slate-400 mb-8 text-sm">
            {t.instantShuffleDesc}
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
               <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder={t.moodPlaceholder}
                className="w-full bg-dark border border-slate-600 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-600 text-center font-medium"
                autoFocus
              />
              <Sparkles size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-50 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={isLoading || !mood}
              className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {t.picking}
                </>
              ) : (
                t.surpriseMe
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
