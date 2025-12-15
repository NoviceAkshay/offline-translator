import os
import sys
import whisper
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer, VitsModel, AutoTokenizer

# Add backend directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import config

def download_whisper():
    print(f"Downloading Whisper model ({config.WHISPER_MODEL_SIZE})...")
    model = whisper.load_model(config.WHISPER_MODEL_SIZE, download_root=config.WHISPER_MODEL_PATH)
    print("Whisper model downloaded.")

def download_m2m100():
    print(f"Downloading M2M100 model ({config.M2M100_MODEL_ID})...")
    tokenizer = M2M100Tokenizer.from_pretrained(config.M2M100_MODEL_ID)
    model = M2M100ForConditionalGeneration.from_pretrained(config.M2M100_MODEL_ID)
    
    tokenizer.save_pretrained(config.M2M100_MODEL_PATH)
    model.save_pretrained(config.M2M100_MODEL_PATH)
    print("M2M100 model downloaded.")

def download_tts_models():
    print("Downloading MMS TTS models (VITS)...")
    os.makedirs(config.TTS_MODELS_DIR, exist_ok=True)
    
    for lang_code, model_id in config.TTS_LANGUAGES.items():
        print(f"  DL: {lang_code} -> {model_id}")
        local_path = os.path.join(config.TTS_MODELS_DIR, lang_code)
        
        try:
            model = VitsModel.from_pretrained(model_id)
            tokenizer = AutoTokenizer.from_pretrained(model_id)
            
            model.save_pretrained(local_path)
            tokenizer.save_pretrained(local_path)
        except Exception as e:
            print(f"  Failed to download {lang_code}: {e}")
            
    print("TTS models downloaded.")

if __name__ == "__main__":
    print("Starting model downloads. This is required for offline usage.")
    
    try:
        download_whisper()
    except Exception as e:
        print(f"Error downloading Whisper: {e}")

    try:
        download_m2m100()
    except Exception as e:
        print(f"Error downloading M2M100: {e}")

    try:
        download_tts_models()
    except Exception as e:
        print(f"Error downloading TTS Models: {e}")
        
    print("Download complete.")
