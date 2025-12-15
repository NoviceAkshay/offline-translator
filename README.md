# Live Audio Translator (Offline L&T System)

A fully offline, secure, real-time speech-to-speech translator using OpenAI Whisper, Meta M2M100, and Coqui TTS.

## Prerequisites
- **Python 3.11** (Required for ML libraries)
- Node.js & npm
- FFmpeg (Required for audio processing)

## Quick Start (Windows)

We have provided batch scripts to make running the system easy.

1.  **First Time Setup**:
    Double-click `setup_system.bat`.
    *This will install all dependencies (into a Python 3.11 venv) and download the necessary AI models.*

2.  **Run the Backend**:
    Double-click `run_backend.bat`.
    *Wait for "Application startup complete" message.*

3.  **Run the Frontend**:
    Double-click `run_frontend.bat`.
    *This will open the web interface in your browser.*

## Manual Setup Instructions

### 1. Backend Setup

1. Open a terminal in the root directory.
2. Create and activate a Python 3.11 virtual environment:
   ```powershell
   py -3.11 -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. **Critical**: Download Offline Models
   ```bash
   python backend/scripts/download_models.py
   ```

### 2. Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```

## Architecture
- **STT**: OpenAI Whisper (base model)
- **Translation**: Meta M2M100 (418M)
- **TTS**: Coqui TTS (YourTTS/VITS)
- **Offline**: All models stored in `backend/models`.
