# 🎵 Anti-Music

A sleek, minimalist offline mobile music app featuring YouTube-to-audio extraction, playlist folders with custom cover art, manual track reordering, a sleep timer, and a comprehensive **60-30-10 color customization studio**.

---

## ✨ Features

- **Apple Soft Aesthetics**: Tactile pill buttons, frosted glass cards, and a floating pill tab bar.
- **60-30-10 Color Architecture**: 
  - 60% Dominant (Canvas / Background)
  - 30% Secondary (Surfaces & Cards)
  - 10% Accent (Focal points & CTA buttons)
  - 6 curated Apple presets + free custom color swatches and HEX code input.
  - Custom background wallpaper with adjustable white-tint opacity (15%, 35%, 55%, 75%).
- **Playlist Folders**:
  - Create custom playlist folders.
  - Choose and update cover pictures from device storage.
  - **Shuffle Order**: Instantly mix and randomize the playback queue.
  - **Custom Song Ordering**: Manually choose track order with Move Up (`▲`) and Move Down (`▼`) controls.
- **Sleep Timer**:
  - Automatically stops playback after 15, 30, 45, 60, or 90 minutes.
  - Live countdown pill in the header.
- **Local Audio Import**:
  - Import audio files (`.mp3`, `.wav`, `.m4a`) directly from your laptop or phone storage.
- **YouTube Downloader**:
  - Built-in converter connected to a lightweight local/cloud Python FastAPI backend powered by `yt-dlp`.

---

## 🚀 Quick Start

### 1. Start the Python Backend
```bash
cd backend
python -m venv .venv
# Windows:
.\.venv\Scripts\Activate.ps1
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Mobile App
```bash
cd mobile-app
npx expo start -c
```
- Press **`w`** to test on your laptop browser.
- Or scan the QR code using **Expo Go** on Android/iOS.
