import streamlit as st
import google.generativeai as genai
import requests
import time
import uuid
import json
import random
from datetime import datetime

# ==========================================
# 1. CONFIG & STYLES
# ==========================================
st.set_page_config(
    page_title="CineShuffle",
    page_icon="🎬",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Custom CSS for "Cinematic" Dark Mode styling
st.markdown("""
<style>
    /* Global Styles */
    .stApp {
        background-color: #0f172a;
        color: white;
    }
    
    /* Card Styling */
    .movie-card {
        background-color: #1e293b;
        border-radius: 12px;
        padding: 0;
        overflow: hidden;
        border: 1px solid #334155;
        transition: transform 0.2s;
        margin-bottom: 20px;
    }
    
    .movie-info {
        padding: 10px;
    }
    
    .movie-title {
        font-weight: bold;
        font-size: 1rem;
        color: white;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .movie-year {
        font-size: 0.8rem;
        color: #94a3b8;
    }

    /* Buttons */
    .stButton button {
        border-radius: 8px;
        font-weight: bold;
    }
    
    /* Primary Button Color Override */
    div[data-testid="stHorizontalBlock"] button[kind="primary"] {
        background-color: #E11D48 !important;
        border-color: #E11D48 !important;
    }

    /* Header */
    .header-title {
        font-size: 2.5rem;
        font-weight: 800;
        margin-bottom: 0;
    }
    .header-suffix {
        color: #E11D48;
    }
    
    /* Hide Streamlit Elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. STATE MANAGEMENT (Zustand equivalent)
# ==========================================

# Initialize Session State
if 'folders' not in st.session_state:
    st.session_state.folders = [
        {'id': '1', 'name': 'Weekend Watch', 'type': 'standard', 'createdAt': time.time()},
        {'id': '2', 'name': '90s Sci-Fi Gems', 'type': 'ai', 'aiPrompt': 'Underrated 90s Sci-Fi movies', 'createdAt': time.time()}
    ]

if 'movies' not in st.session_state:
    st.session_state.movies = [
        {'id': 'm1', 'folderId': '1', 'title': 'Inception', 'year': '2010', 'posterUrl': 'https://image.tmdb.org/t/p/w500/9gk7admal40G07SfTsalzp80sLC.jpg', 'overview': 'A thief who steals corporate secrets...', 'addedAt': time.time()},
        {'id': 'm2', 'folderId': '2', 'title': 'Dark City', 'year': '1998', 'posterUrl': 'https://image.tmdb.org/t/p/w500/5gppu1775K4E6y6j6y73b7549.jpg', 'overview': 'A man struggles with memories...', 'addedAt': time.time()}
    ]

if 'history' not in st.session_state:
    st.session_state.history = []

if 'language' not in st.session_state:
    st.session_state.language = 'en'

if 'page' not in st.session_state:
    st.session_state.page = 'dashboard'

if 'active_folder_id' not in st.session_state:
    st.session_state.active_folder_id = None

# Actions
def set_page(page_name, folder_id=None):
    st.session_state.page = page_name
    if folder_id:
        st.session_state.active_folder_id = folder_id
    st.rerun()

def toggle_language():
    st.session_state.language = 'tr' if st.session_state.language == 'en' else 'en'
    st.rerun()

def delete_folder(folder_id):
    st.session_state.folders = [f for f in st.session_state.folders if f['id'] != folder_id]
    st.session_state.movies = [m for m in st.session_state.movies if m['folderId'] != folder_id]
    set_page('dashboard')

def mark_as_watched(movie_id):
    movie = next((m for m in st.session_state.movies if m['id'] == movie_id), None)
    if movie:
        st.session_state.movies = [m for m in st.session_state.movies if m['id'] != movie_id]
        movie['watchedAt'] = time.time()
        st.session_state.history.insert(0, movie)
        st.rerun()

def delete_movie(movie_id):
    st.session_state.movies = [m for m in st.session_state.movies if m['id'] != movie_id]
    st.rerun()

def delete_from_history(movie_id):
    st.session_state.history = [m for m in st.session_state.history if m['id'] != movie_id]
    st.rerun()

def add_folder_action(name, folder_type, prompt=None):
    new_id = str(uuid.uuid4())
    new_folder = {
        'id': new_id,
        'name': name,
        'type': folder_type,
        'aiPrompt': prompt,
        'createdAt': time.time()
    }
    st.session_state.folders.insert(0, new_folder)
    return new_id

def add_movie_action(movie_data):
    st.session_state.movies.insert(0, movie_data)

# ==========================================
# 3. SERVICES (API Integrations)
# ==========================================

# API Keys from st.secrets
GEMINI_API_KEY = st.secrets.get("GEMINI_API_KEY", "")
TMDB_API_KEY = st.secrets.get("TMDB_API_KEY", "")

# Gemini Service
def generate_movie_suggestions(prompt, lang='en'):
    if not GEMINI_API_KEY:
        st.warning("⚠️ API Key Missing! Please add GEMINI_API_KEY to secrets.")
        return []
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    lang_instruction = "Provide titles in Turkish and summaries in Turkish." if lang == 'tr' else "Provide English titles and summaries."
    
    prompt_text = f"""
    Suggest 5 distinct movies based on: "{prompt}".
    Ensure they are real movies.
    {lang_instruction}
    Return a JSON array of objects with keys: "title", "year", "short_summary".
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt_text, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except Exception as e:
        st.error(f"AI Error: {e}")
        return []

def search_movies_ai(query, lang='en'):
    if not GEMINI_API_KEY: return []
    genai.configure(api_key=GEMINI_API_KEY)
    lang_instruction = "Provide short_summary in Turkish." if lang == 'tr' else ""
    
    prompt_text = f"""
    Search for real movies matching: "{query}".
    Return top 5 results as a JSON array with keys: "title", "year", "short_summary".
    {lang_instruction}
    """
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt_text, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except:
        return []

# TMDB Service
def search_tmdb(query, lang='en'):
    if not TMDB_API_KEY: return []
    lang_code = 'tr-TR' if lang == 'tr' else 'en-US'
    url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={query}&language={lang_code}"
    try:
        res = requests.get(url).json()
        results = []
        for item in res.get('results', [])[:5]:
            results.append({
                'title': item['title'],
                'year': item.get('release_date', '')[:4],
                'overview': item['overview'],
                'posterUrl': f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get('poster_path') else None
            })
        return results
    except:
        return []

def hydrate_with_tmdb(title, year, lang='en'):
    if not TMDB_API_KEY: return None
    lang_code = 'tr-TR' if lang == 'tr' else 'en-US'
    try:
        url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={title}&year={year}&language={lang_code}"
        data = requests.get(url).json()
        if data.get('results'):
            item = data['results'][0]
            return {
                'posterUrl': f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get('poster_path') else None,
                'overview': item['overview']
            }
    except:
        pass
    return None

# ==========================================
# 4. TRANSLATIONS
# ==========================================
TRANS = {
    'en': {
        'appTitle': "CineShuffle", 'tagline': "What are we watching?", 'collections': "Your Collections",
        'createNew': "Create New", 'instant': "Shuffle Play", 'instantDesc': "Pick a mood, get a movie.",
        'movies': "movies", 'history': "History", 'empty': "No movies here.", 'add': "Add Movie",
        'shuffle': "Shuffle
