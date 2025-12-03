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

# Custom CSS
st.markdown("""
<style>
    .stApp { background-color: #0f172a; color: white; }
    .movie-card {
        background-color: #1e293b; border-radius: 12px; padding: 0;
        overflow: hidden; border: 1px solid #334155; margin-bottom: 20px;
    }
    .stButton button { border-radius: 8px; font-weight: bold; }
    div[data-testid="stHorizontalBlock"] button[kind="primary"] {
        background-color: #E11D48 !important; border-color: #E11D48 !important;
    }
    .header-title { font-size: 2.5rem; font-weight: 800; margin-bottom: 0; }
    .header-suffix { color: #E11D48; }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. STATE MANAGEMENT
# ==========================================
if 'folders' not in st.session_state:
    st.session_state.folders = [
        {'id': '1', 'name': 'Haftasonu', 'type': 'standard', 'createdAt': time.time()},
        {'id': '2', 'name': 'Bilim Kurgu', 'type': 'ai', 'aiPrompt': '90s Sci-Fi movies', 'createdAt': time.time()}
    ]
if 'movies' not in st.session_state:
    st.session_state.movies = []
if 'history' not in st.session_state:
    st.session_state.history = []
if 'language' not in st.session_state:
    st.session_state.language = 'tr'
if 'page' not in st.session_state:
    st.session_state.page = 'dashboard'
if 'active_folder_id' not in st.session_state:
    st.session_state.active_folder_id = None

def set_page(page_name, folder_id=None):
    st.session_state.page = page_name
    if folder_id: st.session_state.active_folder_id = folder_id
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
    new_folder = {'id': new_id, 'name': name, 'type': folder_type, 'aiPrompt': prompt, 'createdAt': time.time()}
    st.session_state.folders.insert(0, new_folder)
    return new_id

def add_movie_action(movie_data):
    st.session_state.movies.insert(0, movie_data)

# ==========================================
# 3. SERVICES (API)
# ==========================================
GEMINI_API_KEY = st.secrets.get("GEMINI_API_KEY", "")
TMDB_API_KEY = st.secrets.get("TMDB_API_KEY", "")

def generate_movie_suggestions(prompt, lang='en'):
    if not GEMINI_API_KEY:
        st.warning("API Key Eksik!")
        return []
    genai.configure(api_key=GEMINI_API_KEY)
    lang_inst = "Titles and summaries in Turkish." if lang == 'tr' else "English titles/summaries."
    prompt_text = f"""Suggest 5 movies based on: "{prompt}". {lang_inst} Return JSON array: "title", "year", "short_summary"."""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt_text, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except: return []

def search_movies_ai(query, lang='en'):
    if not GEMINI_API_KEY: return []
    genai.configure(api_key=GEMINI_API_KEY)
    lang_inst = "Summary in Turkish." if lang == 'tr' else ""
    prompt_text = f"""Search movies: "{query}". Return top 5 as JSON array: "title", "year", "short_summary". {lang_inst}"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt_text, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except: return []

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
    except: return []

def hydrate_with_tmdb(title, year, lang='en'):
    if not TMDB_API_KEY: return None
    lang_code = 'tr-TR' if lang == 'tr' else 'en-US'
    try:
        url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={title}&year={year}&language={lang_code}"
        data = requests.get(url).json()
        if data.get('results'):
            item = data['results'][0]
            return {'posterUrl': f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get('poster_path') else None, 'overview': item['overview']}
    except: pass
    return None

# ==========================================
# 4. TRANSLATIONS (Fixed)
# ==========================================
TRANS = {
    'en': {
        'appTitle': "CineShuffle", 'tagline': "What are we watching?", 
        'collections': "Your Collections", # Added Back
        'createNew': "Create New", 'instant': "Shuffle Play", 
        'instantDesc': "Pick a mood, get a movie.", 'movies': "movies", 
        'history': "History", 'empty': "No movies here.", 'add': "Add Movie", 
        'shuffle': "Shuffle Pick", 'watch': "Watch", 'delete': "Delete", 
        'back': "Back", 'folderName': "Folder Name", 'aiPrompt': "AI Prompt", 
        'create': "Create", 'standard': "Standard", 'ai': "AI Powered", 
        'search': "Search movie...", 'picking': "Picking...", 
        'winner': "Tonight's Pick", 'refill': "Refill AI", 
        'watched': "Watched", 'emptyHistory': "History is empty."
    },
    'tr': {
        'appTitle': "CineShuffle", 'tagline': "Ne izliyoruz?", 
        'collections': "Koleksiyonların", # Added Back
        'createNew': "Yeni Oluştur", 'instant': "Karıştır İzle", 
        'instantDesc': "Modunu seç, filmi kap.", 'movies': "film", 
        'history': "Geçmiş", 'empty': "Burada film yok.", 'add': "Film Ekle", 
        'shuffle': "Rastgele Seç", 'watch': "İzle", 'delete': "Sil", 
        'back': "Geri", 'folderName': "Klasör Adı", 'aiPrompt': "YZ İstemi", 
        'create': "Oluştur", 'standard': "Standart", 'ai': "YZ Destekli", 
        'search': "Film ara...", 'picking': "Seçiliyor...", 
        'winner': "Bu Geceki Seçim", 'refill': "YZ ile Doldur", 
        'watched': "İzlendi", 'emptyHistory': "Geçmiş boş."
    }
}
def t(key): return TRANS[st.session_state.language][key]

# ==========================================
# 5. COMPONENTS
# ==========================================
def render_movie_card(movie):
    poster = movie.get('posterUrl') or "https://via.placeholder.com/300x450?text=No+Image"
    st.markdown(f"""
    <div style="display: flex; gap: 10px; margin-bottom: 10px; background: #1e293b; border-radius: 10px; overflow: hidden; border: 1px solid #334155;">
        <img src="{poster}" style="width: 100px; height: 150px; object-fit: cover;">
        <div style="padding: 10px; flex: 1;">
            <div style="font-weight: bold; font-size: 1.1rem;">{movie['title']}</div>
            <div style="color: #94a3b8; font-size: 0.9rem;">{movie['year']}</div>
            <div style="color: #64748b; font-size: 0.8rem; height: 60px; overflow: hidden;">{movie.get('overview', '')[:80]}...</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    c1, c2 = st.columns(2)
    if c1.button(f"👁️ {t('watch')}", key=f"w_{movie['id']}"): mark_as_watched(movie['id'])
    if c2.button(f"🗑️", key=f"d_{movie['id']}"): delete_movie(movie['id'])

# ==========================================
# 6. PAGES
# ==========================================
def page_dashboard():
    col1, col2 = st.columns([3, 1])
    col1.markdown(f"<h1 class='header-title'>{t('appTitle')}<span class='header-suffix'>Shuffle</span></h1>", unsafe_allow_html=True)
    col1.caption(t('tagline'))
    col2.metric(label=t('history'), value=len(st.session_state.history))
    if st.button("🌐 " + ("EN" if st.session_state.language == 'tr' else "TR")): toggle_language()

    st.markdown("---")
    st.subheader(f"⚡ {t('instant')}")
    st.caption(t('instantDesc'))
    with st.form("quick_shuffle"):
        mood = st.text_input("Mood", placeholder="Sci-fi, Funny...")
        if st.form_submit_button(t('shuffle')) and mood:
            with st.spinner(t('picking')):
                suggestions = generate_movie_suggestions(mood, st.session_state.language)
                if suggestions:
                    temp_movies = []
                    for s in suggestions:
                        meta = hydrate_with_tmdb(s['title'], s['year'], st.session_state.language)
                        temp_movies.append({'id': str(uuid.uuid4()), 'title': s['title'], 'year': s['year'], 'overview': meta['overview'] if meta else s['short_summary'], 'posterUrl': meta['posterUrl'] if meta else None})
                    st.session_state.winner_movie = random.choice(temp_movies)
                    st.session_state.temp_shuffle_list = temp_movies
                    set_page('randomizer')

    st.markdown("---")
    st.subheader(f"📂 {t('collections')}")
    with st.expander(f"➕ {t('createNew')}"):
        with st.form("new_folder"):
            f_name = st.text_input(t('folderName'))
            f_type = st.radio("Type", ["Standard", "AI Powered"])
            f_prompt = st.text_area(t('aiPrompt')) if f_type == "AI Powered" else None
            if st.form_submit_button(t('create')):
                fid = add_folder_action(f_name, 'ai' if f_type == "AI Powered" else 'standard', f_prompt)
                if f_type == "AI Powered" and f_prompt:
                    with st.spinner("AI..."):
                        for s in generate_movie_suggestions(f_prompt, st.session_state.language):
                            meta = hydrate_with_tmdb(s['title'], s['year'], st.session_state.language)
                            add_movie_action({'id': str(uuid.uuid4()), 'folderId': fid, 'title': s['title'], 'year': s['year'], 'overview': meta['overview'] if meta else s['short_summary'], 'posterUrl': meta['posterUrl'] if meta else None, 'addedAt': time.time()})
                set_page('dashboard')

    for folder in st.session_state.folders:
        count = len([m for m in st.session_state.movies if m['folderId'] == folder['id']])
        col_a, col_b = st.columns([4, 1])
        with col_a: st.markdown(f"📁 **{folder['name']}** ({count})")
        with col_b:
            if st.button("Open", key=f"open_{folder['id']}"): set_page('folder', folder['id'])
        st.divider()

def page_folder():
    fid = st.session_state.active_folder_id
    folder = next((f for f in st.session_state.folders if f['id'] == fid), None)
    if not folder: set_page('dashboard'); return

    c1, c2, c3 = st.columns([1, 4, 1])
    if c1.button(f"⬅️"): set_page('dashboard')
    c2.markdown(f"## {folder['name']}")
    if c3.button("🗑️", type="primary"): delete_folder(fid)
    
    folder_movies = [m for m in st.session_state.movies if m['folderId'] == fid]
    ac1, ac2 = st.columns(2)
    if ac1.button(f"🎲 {t('shuffle')}", use_container_width=True, type="primary"):
        if folder_movies:
            st.session_state.winner_movie = None
            st.session_state.shuffle_pool = folder_movies
            set_page('randomizer', fid)
        else: st.warning("Empty!")
    if folder['type'] == 'ai' and ac2.button(f"✨ {t('refill')}", use_container_width=True):
        with st.spinner("AI..."):
            for s in generate_movie_suggestions(folder['aiPrompt'], st.session_state.language):
                if not any(m['title'] == s['title'] for m in folder_movies):
                    meta = hydrate_with_tmdb(s['title'], s['year'], st.session_state.language)
                    add_movie_action({'id': str(uuid.uuid4()), 'folderId': fid, 'title': s['title'], 'year': s['year'], 'overview': meta['overview'] if meta else s['short_summary'], 'posterUrl': meta['posterUrl'] if meta else None, 'addedAt': time.time()})
            st.rerun()

    with st.expander(f"🔍 {t('add')}"):
        query = st.text_input(t('search'))
        if st.button("Go"):
            tmdb_res = search_tmdb(query, st.session_state.language)
            st.session_state.search_results = tmdb_res if tmdb_res else search_movies_ai(query, st.session_state.language)
        if 'search_results' in st.session_state:
            for i, res in enumerate(st.session_state.search_results):
                rc1, rc2 = st.columns([3, 1])
                rc1.write(f"**{res['title']}** ({res['year']})")
                if rc2.button("Add", key=f"add_{i}_{res['title']}"):
                    add_movie_action({'id': str(uuid.uuid4()), 'folderId': fid, 'title': res['title'], 'year': res['year'], 'overview': res.get('overview'), 'posterUrl': res.get('posterUrl'), 'addedAt': time.time()})
                    st.success("Added!")
                    st.rerun()

    st.divider()
    cols = st.columns(2)
    for i, movie in enumerate(folder_movies):
        with cols[i % 2]: render_movie_card(movie)

def page_randomizer():
    pool = st.session_state.get('shuffle_pool') or st.session_state.get('temp_shuffle_list')
    winner = st.session_state.get('winner_movie')
    st.markdown("<br><br>", unsafe_allow_html=True)
    placeholder = st.empty()
    if not winner and pool:
        for _ in range(10):
            m = random.choice(pool)
            poster = m.get('posterUrl') or "https://via.placeholder.com/300"
            placeholder.markdown(f"<div style='text-align: center;'><h2>{t('picking')}</h2><img src='{poster}' style='width: 200px;'></div>", unsafe_allow_html=True)
            time.sleep(0.1)
        winner = random.choice(pool)
        st.session_state.winner_movie = winner
    
    if winner:
        poster = winner.get('posterUrl') or "https://via.placeholder.com/300"
        placeholder.markdown(f"<div style='text-align: center;'><h1 style='color: #E11D48;'>🎉 {t('winner')} 🎉</h1><img src='{poster}' style='width: 250px; border-radius: 20px;'><h2>{winner['title']}</h2><p>{winner.get('overview', '')}</p></div>", unsafe_allow_html=True)
        c1, c2 = st.columns(2)
        if c1.button(f"✅ {t('watch')}", use_container_width=True, type="primary"):
            if 'temp_shuffle_list' in st.session_state:
                winner['watchedAt'] = time.time()
                st.session_state.history.insert(0, winner)
                del st.session_state.temp_shuffle_list
                del st.session_state.winner_movie
                set_page('history')
            else:
                mark_as_watched(winner['id'])
                set_page('dashboard')
        if c2.button(f"🔙 {t('back')}", use_container_width=True):
            set_page('folder', st.session_state.active_folder_id) if st.session_state.active_folder_id else set_page('dashboard')

def page_history():
    st.title(f"📜 {t('history')}")
    if st.button(t('back')): set_page('dashboard')
    if not st.session_state.history: st.info(t('emptyHistory'))
    for m in st.session_state.history:
        c1, c2 = st.columns([4, 1])
        with c1: st.markdown(f"**{m['title']}** ({m['year']})")
        with c2:
            if st.button("❌", key=f"hist_{m['id']}"): delete_from_history(m['id'])
        st.divider()

# ==========================================
# 7. ROUTER
# ==========================================
if st.session_state.page == 'dashboard': page_dashboard()
elif st.session_state.page == 'folder': page_folder()
elif st.session_state.page == 'randomizer': page_randomizer()
elif st.session_state.page == 'history': page_history()
