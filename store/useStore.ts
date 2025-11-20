
import { create } from 'zustand';
import { Folder, Movie, Language } from '../types';

interface StoreState {
  folders: Folder[];
  movies: Movie[];
  history: Movie[]; // Watched movies
  language: Language;
  
  // Actions
  addFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => void;
  addMovie: (movie: Movie) => void;
  markAsWatched: (movieId: string) => void;
  removeMovie: (movieId: string) => void;
  addToHistory: (movie: Movie) => void; // New action for instant shuffle
  removeFromHistory: (movieId: string) => void;
  setLanguage: (language: Language) => void;
}

// Initial Mock Data
const initialFolders: Folder[] = [
  { id: '1', name: 'Weekend Watch', type: 'standard', createdAt: Date.now() },
  { id: '2', name: '90s Sci-Fi Gems', type: 'ai', aiPrompt: 'Underrated 90s Sci-Fi movies', createdAt: Date.now() - 10000 }
];

const initialMovies: Movie[] = [
  { id: 'm1', folderId: '1', title: 'Inception', year: '2010', addedAt: Date.now(), overview: 'A thief who steals corporate secrets through the use of dream-sharing technology.' },
  { id: 'm2', folderId: '2', title: 'Dark City', year: '1998', addedAt: Date.now(), overview: 'A man struggles with memories of his past, including a wife he cannot remember, in a nightmarish world.' },
  { id: 'm3', folderId: '2', title: 'Gattaca', year: '1997', addedAt: Date.now(), overview: 'A genetically inferior man assumes the identity of a superior one in order to pursue his lifelong dream of space travel.' }
];

export const useStore = create<StoreState>((set) => ({
  folders: initialFolders,
  movies: initialMovies,
  history: [],
  language: 'en',

  addFolder: (folder) => set((state) => ({ 
    folders: [folder, ...state.folders] 
  })),

  deleteFolder: (id) => set((state) => ({
    folders: state.folders.filter((f) => f.id !== id),
    movies: state.movies.filter((m) => m.folderId !== id)
  })),

  addMovie: (movie) => set((state) => ({
    movies: [movie, ...state.movies]
  })),

  markAsWatched: (movieId) => set((state) => {
    const movie = state.movies.find((m) => m.id === movieId);
    if (!movie) return state;

    const watchedMovie: Movie = { ...movie, watchedAt: Date.now() };

    return {
      movies: state.movies.filter((m) => m.id !== movieId),
      history: [watchedMovie, ...state.history]
    };
  }),

  removeMovie: (movieId) => set((state) => ({
    movies: state.movies.filter((m) => m.id !== movieId)
  })),

  addToHistory: (movie) => set((state) => ({
    history: [{ ...movie, watchedAt: Date.now() }, ...state.history]
  })),

  removeFromHistory: (movieId) => set((state) => ({
    history: state.history.filter((m) => m.id !== movieId)
  })),

  setLanguage: (language) => set(() => ({ language }))
}));
