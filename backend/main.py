from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yt_dlp
import os
import uuid
import glob
import re
import hashlib
import json
import urllib.request
import urllib.parse

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Anti-Music Audio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent Audio Cache Directory
CACHE_DIR = "audio_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

class DownloadRequest(BaseModel):
    url: str

def extract_video_id(url: str) -> str:
    """Extract YouTube video ID or create safe hash from URL."""
    match = re.search(r'(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})', url)
    if match:
        return match.group(1)
    return hashlib.md5(url.encode('utf-8')).hexdigest()[:12]

@app.get("/download")
async def download_audio(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    video_id = extract_video_id(url)

    # 1. Check if track is already cached on disk (Instant 0ms stream)
    cached_files = glob.glob(os.path.join(CACHE_DIR, f"{video_id}.*"))
    if cached_files:
        cached_file = cached_files[0]
        ext = cached_file.split('.')[-1]
        return FileResponse(
            path=cached_file,
            media_type=f'audio/{ext}',
            filename=f"{video_id}.{ext}"
        )

    # 2. Extract and download into persistent cache
    output_template = os.path.join(CACHE_DIR, f"{video_id}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            
            downloaded_files = glob.glob(os.path.join(CACHE_DIR, f"{video_id}.*"))
            if not downloaded_files:
                raise HTTPException(status_code=500, detail="Failed to save audio file")
                
            actual_file = downloaded_files[0]
            ext = actual_file.split('.')[-1]
            
            title = info_dict.get('title', 'Unknown Title')
            safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
            
            return FileResponse(
                path=actual_file,
                media_type=f'audio/{ext}',
                filename=f"{safe_title}.{ext}"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@app.get("/search")
async def search_youtube(q: str, limit: int = 12):
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Search query 'q' is required")

    ydl_opts = {
        'extract_flat': True,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_query = f"ytsearch{min(limit, 25)}:{q.strip()}"
            result = ydl.extract_info(search_query, download=False)
            entries = result.get('entries', []) or []

            results = []
            for entry in entries:
                if not entry:
                    continue
                video_id = entry.get('id')
                thumb = None
                if entry.get('thumbnails'):
                    thumb = entry['thumbnails'][-1].get('url')
                elif entry.get('thumbnail'):
                    thumb = entry['thumbnail']
                elif video_id:
                    thumb = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

                duration_sec = entry.get('duration') or 0
                if duration_sec:
                    hours = int(duration_sec // 3600)
                    mins = int((duration_sec % 3600) // 60)
                    secs = int(duration_sec % 60)
                    if hours > 0:
                        formatted_duration = f"{hours}:{mins:02d}:{secs:02d}"
                    else:
                        formatted_duration = f"{mins}:{secs:02d}"
                else:
                    formatted_duration = "Audio"

                results.append({
                    "id": video_id or str(uuid.uuid4()),
                    "title": entry.get('title') or "Untitled Track",
                    "channel": entry.get('uploader') or entry.get('channel') or "YouTube Artist",
                    "duration": formatted_duration,
                    "duration_sec": duration_sec,
                    "thumbnail": thumb,
                    "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else entry.get('url'),
                })
            return {"query": q, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

def clean_song_query(title: str, artist: str = "") -> str:
    """Strip extraneous YouTube fluff like (Official Video), [4K], feat., etc."""
    cleaned = title
    cleaned = re.sub(r'\[.*?\]|\(.*?\)', '', cleaned)
    cleaned = re.sub(r'(?i)\b(official\s+video|official\s+audio|lyrics|music\s+video|hd|4k|remastered|live|visualizer)\b', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    if artist and artist.lower() not in cleaned.lower() and "youtube" not in artist.lower():
        return f"{artist} {cleaned}"
    return cleaned

@app.get("/lyrics")
def get_lyrics(title: str, artist: str = ""):
    if not title:
        raise HTTPException(status_code=400, detail="Song title is required")
        
    query = clean_song_query(title, artist)
    
    try:
        url = "https://lrclib.net/api/search?" + urllib.parse.urlencode({"q": query})
        req = urllib.request.Request(url, headers={"User-Agent": "Anti-Music-App/1.0"})
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode("utf-8"))
            
        if not data or not isinstance(data, list):
            return {"found": False, "message": "No lyrics found for this track", "lines": []}
            
        # Find best match: preference to entry with syncedLyrics
        best = next((item for item in data if item.get("syncedLyrics")), data[0])
        
        synced_raw = best.get("syncedLyrics")
        plain_raw = best.get("plainLyrics")
        
        parsed_lines = []
        if synced_raw:
            for line in synced_raw.splitlines():
                m = re.match(r'\[(\d+):(\d+(?:\.\d+)?)\](.*)', line)
                if m:
                    mins = int(m.group(1))
                    secs = float(m.group(2))
                    text = m.group(3).strip()
                    time_ms = int((mins * 60 + secs) * 1000)
                    if text:
                        parsed_lines.append({"timeMs": time_ms, "text": text})
                        
        return {
            "found": True,
            "isSynced": len(parsed_lines) > 0,
            "trackName": best.get("trackName") or title,
            "artistName": best.get("artistName") or artist,
            "lines": parsed_lines,
            "plainLyrics": plain_raw or ""
        }
    except Exception as e:
        return {"found": False, "error": str(e), "lines": []}

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Anti-Music Backend is up and running!"}

