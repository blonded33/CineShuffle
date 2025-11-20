
export type FolderType = 'standard' | 'ai';

export type Language = 'en' | 'tr';

export interface Movie {
  id: string;
  title: string;
  year?: string;
  posterUrl?: string; // Placeholder or simulated TMDB URL
  overview?: string;
  addedAt: number;
  watchedAt?: number;
  folderId: string;
}

export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  aiPrompt?: string;
  icon?: string;
  createdAt: number;
}

export interface AIResponseMovie {
  title: string;
  year: string;
  short_summary: string;
  poster_url?: string;
}
