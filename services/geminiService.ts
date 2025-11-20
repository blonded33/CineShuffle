
import { GoogleGenAI, Type } from "@google/genai";
import { AIResponseMovie, Language } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const movieSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    year: { type: Type.STRING },
    short_summary: { type: Type.STRING },
    poster_url: { type: Type.STRING, description: "A valid URL for the movie poster if available, otherwise null." }
  },
  required: ["title", "year", "short_summary"]
};

export const generateMovieSuggestions = async (prompt: string, lang: Language = 'en'): Promise<AIResponseMovie[]> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    return [];
  }

  const langInstruction = lang === 'tr' 
    ? 'Provide the movie titles in their original language (or common Turkish title) and provide the short_summary in Turkish.' 
    : 'Provide standard English titles and summaries.';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Suggest 5-8 distinct movies based on this request: "${prompt}". 
                 Ensure they are real movies. 
                 ${langInstruction}
                 Return a JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: movieSchema
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const data = JSON.parse(text) as AIResponseMovie[];
    return data;

  } catch (error) {
    console.error("Error generating movies:", error);
    throw error;
  }
};

export const searchMovies = async (query: string, lang: Language = 'en'): Promise<AIResponseMovie[]> => {
  if (!process.env.API_KEY) return [];

  const langInstruction = lang === 'tr' 
    ? 'Provide the short_summary in Turkish.' 
    : '';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Search for real movies matching the title or query: "${query}". 
                 Return the top 5 most relevant results.
                 ${langInstruction}
                 Return a JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: movieSchema
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    return JSON.parse(text) as AIResponseMovie[];
  } catch (error) {
    console.error("Error searching movies:", error);
    return [];
  }
};
