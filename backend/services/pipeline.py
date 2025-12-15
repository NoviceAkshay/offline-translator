import os
import torch
import whisper
import scipy.io.wavfile
import librosa
import numpy as np
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer, VitsModel, AutoTokenizer
from core import config

# FORCE OFFLINE MODE
# These environment variables tell HuggingFace/Transformers to NEVER check the internet.
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

class STTService:
    def __init__(self):
        print("Loading Whisper...")
        # Load from local device
        self.model = whisper.load_model(config.WHISPER_MODEL_SIZE, download_root=config.WHISPER_MODEL_PATH)
        print("Whisper Loaded.")

    def _validate_audio(self, audio_path):
        """
        Ensure audio is 16kHz Mono Float32 PCM.
        """
        try:
            # librosa load automatically resamples to sr and converts to mono
            audio, _ = librosa.load(audio_path, sr=16000, mono=True)
            
            # Normalization: Fix low microphone volume
            max_val = np.abs(audio).max()
            if max_val > 0:
                audio = audio / max_val
                
            print(f"Audio Loaded: Shape={audio.shape}, Max={max_val:.4f}")
            return audio.astype(np.float32)
        except Exception as e:
            print(f"Audio Validation Error: {e}")
            return None

    def _apply_vad(self, audio, top_db=20):
        """
        Trim silence. Relaxed threshold to 20db to catch quieter speech.
        """
        if audio is None: 
            return None
            
        # Split silence
        intervals = librosa.effects.split(audio, top_db=top_db)
        if len(intervals) == 0:
            return None
            
        return np.concatenate([audio[start:end] for start, end in intervals])

    def transcribe(self, audio_path, language=None):
        # 1. Validation & Loading
        # Validation now includes Normalization
        raw_audio = self._validate_audio(audio_path)
        if raw_audio is None:
            print("Audio Load Failed.")
            return ""

        # DEBUG: Save what Whisper actually hears
        # This confirms if ffmpeg/librosa loaded the audio correctly
        debug_path = audio_path + "_debug.wav"
        scipy.io.wavfile.write(debug_path, 16000, raw_audio)
        print(f"DEBUG: Saved processed audio to {debug_path}")

        # TEMPORARILY DISABLED VAD
        # To rule out VAD cutting off speech in noisy/quiet offline setups
        speech_audio = raw_audio
        
        # 3. Whisper Inference
        options = {
            "beam_size": 1, 
            "temperature": 0.0,
            "condition_on_previous_text": False,
            "fp16": False
        }
        
        if language and language != "auto":
             options["language"] = language
        
        try:
            print(f"Running Whisper on {len(speech_audio)} samples...")
            result = self.model.transcribe(speech_audio, **options)
            text = result["text"].strip()
            print(f"Whisper Out: {text}")
            return text
        except Exception as e:
            print(f"Transcribe Error: {e}")
            return ""

class TranslationService:
    def __init__(self):
        print("Loading M2M100 (Offline)...")
        # local_files_only=True ensures no connection attempt is made to HF Hub
        self.tokenizer = M2M100Tokenizer.from_pretrained(config.M2M100_MODEL_PATH, local_files_only=True)
        self.model = M2M100ForConditionalGeneration.from_pretrained(config.M2M100_MODEL_PATH, local_files_only=True)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        print(f"M2M100 Loaded on {self.device}.")

    def translate(self, text, src_lang, tgt_lang):
        # M2M100 language codes often match ISO 2 letter codes, but consistent checking is good.
        self.tokenizer.src_lang = src_lang
        encoded_hi = self.tokenizer(text, return_tensors="pt").to(self.device)
        generated_tokens = self.model.generate(**encoded_hi, forced_bos_token_id=self.tokenizer.get_lang_id(tgt_lang))
        return self.tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]

class TTSService:
    def __init__(self):
        print("Loading TTS Services...")
        self.models = {}
        self.tokenizers = {}
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # We load models on demand to save RAM, or preload if specified. 
        # For this demo, let's lazy load.
    
    def load_lang(self, lang_code):
        if lang_code in self.models:
            return
            
        print(f"Loading TTS for {lang_code}...")
        try:
            local_path = os.path.join(config.TTS_MODELS_DIR, lang_code)
            # Fallback to English if language model not found? 
            # Or try to run from cache/online if not disconnected.
            # Assuming downloaded:
            if not os.path.exists(local_path):
                raise Exception(f"Model for {lang_code} not found in {local_path}")
                
            self.models[lang_code] = VitsModel.from_pretrained(local_path, local_files_only=True).to(self.device)
            self.tokenizers[lang_code] = AutoTokenizer.from_pretrained(local_path, local_files_only=True)
            print(f"Loaded TTS {lang_code}")
        except Exception as e:
            print(f"Error loading TTS for {lang_code}: {e}")
            # Fallback to English?
            if lang_code != "en":
               self.load_lang("en")
    
    def generate_speech(self, text, language, output_file):
        # Ensure model is loaded
        use_lang = language if language in config.TTS_LANGUAGES else "en"
        self.load_lang(use_lang)
        
        if use_lang not in self.models and "en" in self.models:
             use_lang = "en"
        
        if use_lang not in self.models:
            raise Exception("No suitable TTS model loaded")

        model = self.models[use_lang]
        tokenizer = self.tokenizers[use_lang]

        inputs = tokenizer(text, return_tensors="pt")
        inputs = inputs.to(self.device)
        
        with torch.no_grad():
            output = model(**inputs).waveform
        
        # Save to file
        waveform = output[0].cpu().numpy()
        # VITS MMS usually 16khz? Or check model.config.sampling_rate
        sr = model.config.sampling_rate
        
        scipy.io.wavfile.write(output_file, sr, waveform)
        
        return output_file
