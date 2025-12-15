import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Ensure models directory exists
os.makedirs(MODELS_DIR, exist_ok=True)

# Model Paths
WHISPER_MODEL_PATH = os.path.join(MODELS_DIR, "whisper")
M2M100_MODEL_PATH = os.path.join(MODELS_DIR, "m2m100")
TTS_MODELS_DIR = os.path.join(MODELS_DIR, "tts_mms")

# Settings
WHISPER_MODEL_SIZE = "base" # Options: tiny, base, small, medium, large
M2M100_MODEL_ID = "facebook/m2m100_418M"

# Supported TTS Languages for MMS (Facebook VITS)
# Checkpoints: facebook/mms-tts-[lang]
TTS_LANGUAGES = {
    "en": "facebook/mms-tts-eng",
    "fr": "facebook/mms-tts-fra",
    "de": "facebook/mms-tts-deu",
    "es": "facebook/mms-tts-spa",
    "hi": "facebook/mms-tts-hin",
    "zh": "facebook/mms-tts-cmn", # Mandarin
    "ar": "facebook/mms-tts-ara",
    "ru": "facebook/mms-tts-rus",
}
