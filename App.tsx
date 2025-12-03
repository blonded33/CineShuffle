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

# API Keys from st.secrets (Make sure .streamlit/secrets.toml exists or handle gracefully)
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
        'shuffle': "Shuffle Pick", 'watch': "Watch", 'delete': "Delete", 'back': "Back",
        'folderName': "Folder Name", 'aiPrompt': "AI Prompt (e.g. 90s Horror)", 'create': "Create",
        'standard': "Standard", 'ai': "AI Powered", 'search': "Search movie...", 'results': "Results",
        'confirmDelete': "Delete this folder?", 'picking': "Picking...", 'winner': "Tonight's Pick",
        'refill': "Refill AI", 'watched': "Watched", 'emptyHistory': "History is empty."
    },
    'tr': {
        'appTitle': "CineShuffle", 'tagline': "Ne izliyoruz?", 'collections': "Koleksiyonların",
        'createNew': "Yeni Oluştur", 'instant': "Karıştır İzle", 'instantDesc': "Modunu seç, filmi kap.",
        'movies': "film", 'history': "Geçmiş", 'empty': "Burada film yok.", 'add': "Film Ekle",
        'shuffle': "Rastgele Seç", 'watch': "İzle", 'delete': "Sil", 'back': "Geri",
        'folderName': "Klasör Adı", 'aiPrompt': "YZ İstemi (örn. 90lar Korku)", 'create': "Oluştur",
        'standard': "Standart", 'ai': "YZ Destekli", 'search': "Film ara...", 'results': "Sonuçlar",
        'confirmDelete': "Klasörü sil?", 'picking': "Seçiliyor...", 'winner': "Bu Geceki Seçim",
        'refill': "YZ ile Doldur", 'watched': "İzlendi", 'emptyHistory': "Geçmiş boş."
    }
}

# ==========================================
# 5. PAGES & COMPONENTS
# ==========================================

def t(key):
    return TRANS[st.session_state.language][key]

def sidebar():
    with st.sidebar:
        st.title("⚙️ Settings")
        if st.button("🌐 " + ("English" if st.session_state.language == 'tr' else "Türkçe")):
            toggle_language()
        
        st.divider()
        if st.button("📜 " + t('history')):
            set_page('history')
        if st.button("🏠 Dashboard"):
            set_page('dashboard')

def render_movie_card(movie, show_actions=True, compact=False):
    # Using HTML/CSS for card rendering because Streamlit columns are too wide
    poster = movie.get('posterUrl') or "https://via.placeholder.com/300x450/1e293b/ffffff?text=No+Image"
    
    col1, col2 = st.columns([1, 2]) if compact else st.columns([1])
    
    with st.container():
        st.markdown(f"""
        <div style="display: flex; gap: 10px; margin-bottom: 10px; background: #1e293b; border-radius: 10px; overflow: hidden; border: 1px solid #334155;">
            <img src="{poster}" style="width: {'80px' if compact else '100px'}; height: {'120px' if compact else '150px'}; object-fit: cover;">
            <div style="padding: 10px; flex: 1;">
                <div style="font-weight: bold; font-size: 1.1rem;">{movie['title']}</div>
                <div style="color: #94a3b8; font-size: 0.9rem;">{movie['year']}</div>
                <div style="color: #64748b; font-size: 0.8rem; height: 40px; overflow: hidden;">{movie.get('overview', '')[:60]}...</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        if show_actions:
            c1, c2 = st.columns(2)
            if c1.button(f"👁️ {t('watch')}", key=f"w_{movie['id']}"):
                mark_as_watched(movie['id'])
            if c2.button(f"🗑️", key=f"d_{movie['id']}"):
                delete_movie(movie['id'])

def page_dashboard():
    # Header
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown(f"<h1 class='header-title'>{t('appTitle')}<span class='header-suffix'>Shuffle</span></h1>", unsafe_allow_html=True)
        st.caption(t('tagline'))
    with col2:
        st.metric(label=t('history'), value=len(st.session_state.history))

    # Instant Shuffle
    st.markdown("---")
    with st.container():
        st.subheader(f"⚡ {t('instant')}")
        st.caption(t('instantDesc'))
        with st.form("quick_shuffle"):
            mood = st.text_input("Mood", placeholder="Sci-fi, Funny, Dark...")
            submitted = st.form_submit_button(t('shuffle'))
            if submitted and mood:
                with st.spinner(t('picking')):
                    suggestions = generate_movie_suggestions(mood, st.session_state.language)
                    if suggestions:
                        # Convert to movie objects
                        temp_movies = []
                        for s in suggestions:
                            meta = hydrate_with_tmdb(s['title'], s['year'], st.session_state.language)
                            temp_movies.append({
                                'id': str(uuid.uuid4()), 'title': s['title'], 'year': s['year'],
                                'overview': meta['overview'] if meta else s['short_summary'],
                                'posterUrl': meta['posterUrl'] if meta else None
                            })
                        
                        # Pick one
                        winner = random.choice(temp_movies)
                        # Add to history directly? Or show result
                        st.session_state.winner_movie = winner
                        st.session_state.temp_shuffle_list = temp_movies # For animation effect if needed
                        set_page('randomizer')

    # Folders
    st.markdown("---")
    st.subheader(f"📂 {t('collections')}")
    
    # Create New Folder
    with st.expander(f"➕ {t('createNew')}"):
        with st.form("new_folder"):
            f_name = st.text_input(t('folderName'))
            f_type = st.radio("Type", ["Standard", "AI Powered"])
            f_prompt = st.text_area(t('aiPrompt')) if f_type == "AI Powered" else None
            
            if st.form_submit_button(t('create')):
                fid = add_folder_action(f_name, 'ai' if f_type == "AI Powered" else 'standard', f_prompt)
                
                if f_type == "AI Powered" and f_prompt:
                    with st.spinner("AI Magic happening..."):
                        suggestions = generate_movie_suggestions(f_prompt, st.session_state.language)
                        for s in suggestions:
                            meta = hydrate_with_tmdb(s['title'], s['year'], st.session_state.language)
                            add_movie_action({
                                'id': str(uuid.uuid4()), 'folderId': fid, 'title': s['title'], 'year': s['year'],
                                'overview': meta['overview'] if meta else s['short_summary'],
                                'posterUrl': meta['posterUrl'] if meta else None,
                                'addedAt': time.time()
                            })
                set_page('dashboard')

    # List Folders
    if not st.session_state.folders:
        st.info("No folders yet.")
    
    for folder in st.session_state.folders:
        count = len([m for m in st.session_state.movies if m['folderId'] == folder['id']])
        col_a, col_b = st.columns([4, 1])
        with col_a:
            label = f"📁 **{folder['name']}**"
            if folder['type'] == 'ai': label += " ✨"
            st.markdown(label)
            st.caption(f"{count} {t('movies')}")
        with col_b:
            if st.button("Open", key=f"open_{folder['id']}"):
                set_page('folder', folder['id'])
        st.divider()

def page_folder():
    fid = st.session_state.active_folder_id
    folder = next((f for f in st.session_state.folders if f['id'] == fid), None)
    if not folder:
        set_page('dashboard')
        return

    # Header
    c1, c2, c3 = st.columns([1, 4, 1])
    if c1.button(f"⬅️"): set_page('dashboard')
    c2.markdown(f"## {folder['name']}")
    if c3.button("🗑️", type="primary"): 
        delete_folder(fid)
    
    folder_movies = [m for m in st.session_state.movies if m['folderId'] == fid]

    # Actions
    ac1, ac2 = st.columns(2)
    if ac1.button(f"🎲 {t('shuffle')}", use_container_width=True, type="primary"):
        if folder_movies:
            st.session_state.winner_movie = None # Reset
            st.session_state.shuffle_pool = folder_movies
            set_page('randomizer', fid)
        else:
            st.warning("Empty folder!")

    if folder['type'] == 'ai' and ac2.button(f"✨ {t('refill')}", use_container_width=True):
        with st.spinner("AI is thinking..."):
            suggestions = generate_movie_suggestions(folder['aiPrompt'], st.session_state.language)
            for s in suggestions:
                # Check duplicate roughly
                if not any(m['title'] == s['title'] for m in folder_movies):
                    meta = hydrate_with_tmdb(s['title'], s['year'], st.session_state.language)
                    add_movie_action({
                        'id': str(uuid.uuid4()), 'folderId': fid, 'title': s['title'], 'year': s['year'],
                        'overview': meta['overview'] if meta else s['short_summary'],
                        'posterUrl': meta['posterUrl'] if meta else None,
                        'addedAt': time.time()
                    })
            st.rerun()

    # Add Movie Search
    with st.expander(f"🔍 {t('add')}"):
        query = st.text_input(t('search'))
        if st.button("Go"):
            results = []
            # Try TMDB
            tmdb_res = search_tmdb(query, st.session_state.language)
            if tmdb_res:
                results = tmdb_res
            else:
                # Fallback AI
                results = search_movies_ai(query, st.session_state.language)
            
            st.session_state.search_results = results

        if 'search_results' in st.session_state:
            for res in st.session_state.search_results:
                rc1, rc2 = st.columns([3, 1])
                rc1.write(f"**{res['title']}** ({res['year']})")
                if rc2.button("Add", key=f"add_{res['title']}"):
                    add_movie_action({
                        'id': str(uuid.uuid4()), 'folderId': fid, 'title': res['title'], 'year': res['year'],
                        'overview': res.get('overview'),
                        'posterUrl': res.get('posterUrl'),
                        'addedAt': time.time()
                    })
                    st.success("Added!")
                    time.sleep(0.5)
                    st.rerun()

    # Movie List Grid
    st.divider()
    if not folder_movies:
        st.info(t('empty'))
    else:
        # Create grid layout
        cols = st.columns(2)
        for i, movie in enumerate(folder_movies):
            with cols[i % 2]:
                render_movie_card(movie)

def page_randomizer():
    # Retrieve pool
    pool = st.session_state.get('shuffle_pool') or st.session_state.get('temp_shuffle_list')
    winner = st.session_state.get('winner_movie')

    # Animation Loop if winner not already set contextually or strictly needed
    # Since Streamlit reruns script, we handle animation via placeholder
    
    st.markdown("<br><br>", unsafe_allow_html=True)
    
    placeholder = st.empty()
    
    if not winner and pool:
        # Animation
        for _ in range(15):
            m = random.choice(pool)
            poster = m.get('posterUrl') or "https://via.placeholder.com/300"
            placeholder.markdown(f"""
            <div style="text-align: center; opacity: 0.7;">
                <h2>{t('picking')}</h2>
                <img src="{poster}" style="width: 200px; height: 300px; object-fit: cover; border-radius: 15px;">
                <h3>{m['title']}</h3>
            </div>
            """, unsafe_allow_html=True)
            time.sleep(0.1)
        
        winner = random.choice(pool)
        st.session_state.winner_movie = winner
    
    # Show Winner
    if winner:
        poster = winner.get('posterUrl') or "https://via.placeholder.com/300"
        placeholder.markdown(f"""
        <div style="text-align: center; animation: zoom-in 0.5s;">
            <h1 style="color: #E11D48;">🎉 {t('winner')} 🎉</h1>
            <img src="{poster}" style="width: 250px; height: 375px; object-fit: cover; border-radius: 20px; box-shadow: 0 0 30px #E11D48;">
            <h2>{winner['title']} ({winner['year']})</h2>
            <p>{winner.get('overview', '')}</p>
        </div>
        """, unsafe_allow_html=True)
        
        c1, c2 = st.columns(2)
        if c1.button(f"✅ {t('watch')}", use_container_width=True, type="primary"):
            # If it's a temp movie (Quick Shuffle), add to history manually
            if 'temp_shuffle_list' in st.session_state:
                winner['watchedAt'] = time.time()
                st.session_state.history.insert(0, winner)
                del st.session_state.temp_shuffle_list
                del st.session_state.winner_movie
                set_page('history')
            else:
                # Existing movie
                mark_as_watched(winner['id'])
                set_page('dashboard')
                
        if c2.button(f"🔙 {t('back')}", use_container_width=True):
            if st.session_state.active_folder_id:
                set_page('folder', st.session_state.active_folder_id)
            else:
                set_page('dashboard')

def page_history():
    st.title(f"📜 {t('history')}")
    if st.button(t('back')): set_page('dashboard')
    
    if not st.session_state.history:
        st.info(t('emptyHistory'))
    
    for m in st.session_state.history:
        c1, c2 = st.columns([4, 1])
        with c1:
            st.markdown(f"**{m['title']}** ({m['year']})")
            st.caption(f"Watched: {datetime.fromtimestamp(m.get('watchedAt', time.time())).strftime('%Y-%m-%d')}")
        with c2:
            if st.button("❌", key=f"hist_{m['id']}"):
                delete_from_history(m['id'])
        st.divider()

# ==========================================
# 6. MAIN ROUTER
# ==========================================

sidebar()

if st.session_state.page == 'dashboard':
    page_dashboard()
elif st.session_state.page == 'folder':
    page_folder()
elif st.session_state.page == 'randomizer':
    page_randomizer()
elif st.session_state.page == 'history':
    page_history()
