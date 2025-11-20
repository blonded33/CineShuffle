
import React, { useState } from 'react';
import { X, Sparkles, FolderPlus, Wand2 } from 'lucide-react';
import { generateMovieSuggestions } from '../services/geminiService';
import { findMovieMetadata, isTmdbConfigured } from '../services/tmdbService';
import { useStore } from '../store/useStore';
import { translations } from '../constants/translations';
import { Folder, Movie } from '../types';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

interface CreateFolderModalProps {
  onClose: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ onClose }) => {
  const [folderName, setFolderName] = useState('');
  const [isAI, setIsAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { addFolder, addMovie, language } = useStore();
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsLoading(true);
    const newFolderId = generateId();

    const newFolder: Folder = {
      id: newFolderId,
      name: folderName,
      type: isAI ? 'ai' : 'standard',
      aiPrompt: isAI ? aiPrompt : undefined,
      createdAt: Date.now()
    };

    // Add folder to store immediately
    addFolder(newFolder);

    // If AI, fetch movies in background
    if (isAI && aiPrompt.trim()) {
      try {
        const suggestions = await generateMovieSuggestions(aiPrompt, language);
        
        // Process suggestions in parallel to fetch real metadata if possible
        const moviePromises = suggestions.map(async (s) => {
          let realData = null;
          
          // If TMDB is configured, try to get the real poster
          if (isTmdbConfigured()) {
             realData = await findMovieMetadata(s.title, s.year, language);
          }

          const movie: Movie = {
            id: generateId(),
            title: s.title,
            year: s.year,
            overview: realData?.overview || s.short_summary,
            posterUrl: realData?.posterUrl || s.poster_url,
            folderId: newFolderId,
            addedAt: Date.now()
          };
          return movie;
        });

        const moviesToAdd = await Promise.all(moviePromises);
        
        moviesToAdd.forEach(m => addMovie(m));

      } catch (err) {
        console.error("Failed to fetch initial AI movies", err);
      }
    }

    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-surface w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderPlus className="text-primary" size={20} />
            {t.newWatchlist}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          
          {/* Toggle Type */}
          <div className="flex p-1 bg-dark rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setIsAI(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                !isAI ? 'bg-surface text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.standardFolder}
            </button>
            <button
              type="button"
              onClick={() => setIsAI(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                isAI ? 'bg-secondary text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={14} />
              {t.aiFolder}
            </button>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t.folderNameLabel}</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={t.folderNamePlaceholder}
              className="w-full bg-dark border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              required
            />
          </div>

          {/* AI Prompt Input */}
          {isAI && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-2">
                <Wand2 size={14} />
                {t.aiPromptLabel}
              </label>
              <div className="relative">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t.aiPromptPlaceholder}
                  rows={3}
                  className="w-full bg-dark border border-secondary/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all resize-none placeholder:text-slate-600"
                  required={isAI}
                />
                <div className="absolute bottom-3 right-3 text-secondary opacity-50 pointer-events-none">
                  <Sparkles size={16} />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {t.aiDisclaimer}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !folderName}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                isLoading 
                  ? 'bg-slate-700 cursor-not-allowed' 
                  : isAI 
                    ? 'bg-gradient-to-r from-secondary to-purple-600 hover:shadow-secondary/25' 
                    : 'bg-primary hover:bg-rose-700 hover:shadow-primary/25'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isAI ? t.generating : t.creating}
                </>
              ) : (
                <>
                  {isAI ? t.createGenBtn : t.createBtn}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
