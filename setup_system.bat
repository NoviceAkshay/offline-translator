@echo off
echo ==========================================
echo      Installing Dependencies & Models
echo ==========================================
echo.
echo [1/2] Installing Python Dependencies...
call venv\Scripts\activate
pip install -r backend/requirements.txt
echo.
echo [2/2] Downloading Offline Models (Whisper, M2M100, TTS)...
python backend/scripts/download_models.py
echo.
echo ==========================================
echo           Setup Complete!
echo ==========================================
pause
