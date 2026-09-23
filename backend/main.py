from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yt_dlp
import os
import uuid
import glob

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="YouTube Downloader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp_downloads"
os.makedirs(TEMP_DIR, exist_ok=True)

class DownloadRequest(BaseModel):
    url: str

def remove_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Error removing file {path}: {e}")

@app.get("/download")
async def download_audio(url: str, background_tasks: BackgroundTasks):
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    file_id = str(uuid.uuid4())
    # We download the best audio. If m4a is available, great.
    output_template = os.path.join(TEMP_DIR, f"{file_id}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            
            # Find the downloaded file (since extension can vary)
            downloaded_files = glob.glob(os.path.join(TEMP_DIR, f"{file_id}.*"))
            if not downloaded_files:
                raise HTTPException(status_code=500, detail="Failed to download audio")
                
            actual_file = downloaded_files[0]
            ext = actual_file.split('.')[-1]
            
            title = info_dict.get('title', 'Unknown Title')
            # Sanitize title for filename
            safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
            
            # Schedule file for deletion after sending
            background_tasks.add_task(remove_file, actual_file)
            
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
                    mins = int(duration_sec // 60)
                    secs = int(duration_sec % 60)
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

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is up and running!"}


