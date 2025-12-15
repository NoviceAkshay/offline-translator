from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import shutil
import os
import uuid
import sys
import traceback

# --- FFmpeg Fix for Windows ---
# Whisper relies on the 'ffmpeg' CLI tool being in the system PATH.
# We use 'imageio-ffmpeg' to provide a static binary, but it has a custom name.
# We must rename/copy it to 'ffmpeg.exe' so Whisper's subprocess call finds it.
try:
    import imageio_ffmpeg
    ffmpeg_original_path = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_original_path)
    ffmpeg_exe_path = os.path.join(ffmpeg_dir, "ffmpeg.exe")
    
    # If ffmpeg.exe doesn't exist, copy the imageio binary to it
    if not os.path.exists(ffmpeg_exe_path):
        print(f"Copying {ffmpeg_original_path} -> {ffmpeg_exe_path}")
        shutil.copy(ffmpeg_original_path, ffmpeg_exe_path)
    
    # Add to PATH so subprocess calls (like in Whisper) can find 'ffmpeg'
    if ffmpeg_dir not in os.environ["PATH"]:
        os.environ["PATH"] += os.pathsep + ffmpeg_dir
    
    print(f"Injecting FFmpeg to PATH: {ffmpeg_dir}")
except ImportError:
    print("WARNING: imageio-ffmpeg not found. Ensure FFmpeg is installed and in PATH.")
except Exception as e:
    print(f"Error checking FFmpeg: {e}")
# ------------------------------

# Ensure we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.pipeline import STTService, TranslationService, TTSService
from core import config

app = FastAPI(title="Offline Live Audio Translator")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
stt_service = None
trans_service = None
tts_service = None

# Temp storage
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)
app.mount("/audio", StaticFiles(directory=TEMP_DIR), name="audio")

@app.on_event("startup")
async def startup_event():
    global stt_service, trans_service, tts_service
    # Initialize services. 
    try:
        # Check if models exist first to avoid cryptic errors
        if not os.path.exists(config.WHISPER_MODEL_PATH):
            print(f"WARNING: Whisper model not found at {config.WHISPER_MODEL_PATH}")
        
        stt_service = STTService()
        trans_service = TranslationService()
        tts_service = TTSService()
    except Exception as e:
        print(f"CRITICAL ERROR loading models: {e}")
        traceback.print_exc()
        print("Ensure you have run 'setup_system.bat' to download models!")

@app.post("/translate")
async def translate_audio(
    file: UploadFile = File(...),
    src_lang: str = Form(...),
    tgt_lang: str = Form(...)
):
    if not stt_service or not trans_service or not tts_service:
        raise HTTPException(status_code=503, detail="Models not loaded. Check server logs.")

    request_id = str(uuid.uuid4())
    input_audio_path = os.path.join(TEMP_DIR, f"{request_id}_input.webm") 
    
    # Save Uploaded File
    try:
        with open(input_audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
         print(f"File Save Error: {e}")
         raise HTTPException(status_code=500, detail="Failed to save audio file")
    
    # 1. STT
    try:
        print(f"Transcribing {input_audio_path} (Language: {src_lang})...")
        transcript = stt_service.transcribe(input_audio_path, language=src_lang)
        print(f"Transcription: {transcript}")
    except Exception as e:
        print(f"STT Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"STT Error: {str(e)}")

    if not transcript:
        return {"transcript": "", "translation": "", "audio_url": None}

    # 2. Translation
    try:
        print(f"Translating ({src_lang}->{tgt_lang})...")
        translation = trans_service.translate(transcript, src_lang=src_lang, tgt_lang=tgt_lang)
        print(f"Translation: {translation}")
    except Exception as e:
         print(f"Translation Error: {e}")
         traceback.print_exc()
         raise HTTPException(status_code=500, detail=f"Translation Error: {str(e)}")

    # 3. TTS (DISABLED AUTO-PLAY)
    # We now return just the text. The frontend will request audio via /speak-text if user clicks button.
    
    return {
        "transcript": transcript,
        "translation": translation,
        "audio_url": None # No auto-generated audio
    }

from pydantic import BaseModel

class TextTranslationRequest(BaseModel):
    text: str
    src_lang: str
    tgt_lang: str

@app.post("/translate-text")
async def translate_text(request: TextTranslationRequest):
    if not trans_service:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        print(f"Translating Text ({request.src_lang}->{request.tgt_lang})...")
        translation = trans_service.translate(request.text, src_lang=request.src_lang, tgt_lang=request.tgt_lang)
        print(f"Translation: {translation}")
        return {"translation": translation}
    except Exception as e:
         print(f"Translation Error: {e}")
         traceback.print_exc()
         raise HTTPException(status_code=500, detail=f"Translation Error: {str(e)}")

@app.post("/speak-text")
async def speak_text(
    text: str = Form(...),
    language: str = Form(...)
):
    """
    Generate audio for specific text on demand.
    """
    if not tts_service:
        raise HTTPException(status_code=503, detail="TTS Model not loaded")

    request_id = str(uuid.uuid4())
    output_audio_filename = f"{request_id}_tts.wav"
    output_audio_path = os.path.join(TEMP_DIR, output_audio_filename)
    
    try:
        print(f"Generating Speech ({language})...")
        tts_service.generate_speech(text, language=language, output_file=output_audio_path)
        return {"audio_url": f"http://localhost:8000/audio/{output_audio_filename}"}
    except Exception as e:
        print(f"TTS Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS Error: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "System Online", "offline_mode": True}
