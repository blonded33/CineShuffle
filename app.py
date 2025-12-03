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
    .header-title { font-size: 2.5rem; font
