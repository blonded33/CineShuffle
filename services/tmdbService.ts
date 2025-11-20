
import { Movie, Language } from '../types';

// ---------------------------------------------------------------------------
// INSTRUCTIONS FOR REAL POSTERS:
// 1. Go to https://www.themoviedb.org/documentation/api
// 2. Sign up (it's free) and get an "API Read Access Token" or "API Key".
// 3. Paste it inside the quotes below.
// ---------------------------------------------------------------------------
const TMDB_API_KEY = ''; // e.g., 'your_api_key_here'
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Checks if the API key is configured.
 */
export const isTmdbConfigured = () => {
  return TMDB_API_KEY.length > 0;
};

const getLangCode = (lang: Language) => lang === 'tr' ? 'tr-TR' : 'en-US';

/**
 * Searches for movies using TMDB API.
 */
export const searchMoviesTMDB = async (query: string, lang: Language = 'en'): Promise<Movie[]> => {
  if (!isTmdbConfigured()) return [];

  const langCode = getLangCode(lang);

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=${langCode}&page=1`
    );

    if (!response.ok) throw new Error('TMDB Search Failed');

    const data = await response.json();
    
    return data.results.slice(0, 8).map((item: any) => ({
      id: item.id.toString(), // Keep ID as string for consistency
      title: item.title,
      year: item.release_date ? item.release_date.split('-')[0] : '',
      overview: item.overview,
      posterUrl: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : undefined,
      folderId: 'temp', // Placeholder
      addedAt: Date.now()
    }));

  } catch (error) {
    console.error("TMDB Search Error:", error);
    return [];
  }
};

/**
 * Tries to find a movie by title/year to upgrade AI suggestions with real posters.
 */
export const findMovieMetadata = async (title: string, year?: string, lang: Language = 'en'): Promise<{ posterUrl?: string, overview?: string } | null> => {
  if (!isTmdbConfigured()) return null;

  const langCode = getLangCode(lang);

  try {
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&include_adult=false&language=${langCode}`;
    if (year) url += `&year=${year}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const match = data.results[0];
      return {
        posterUrl: match.poster_path ? `${IMAGE_BASE_URL}${match.poster_path}` : undefined,
        overview: match.overview
      };
    }
    return null;

  } catch (error) {
    return null;
  }
};
