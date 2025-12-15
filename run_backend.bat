@echo off
title L&T Backend
echo Starting Backend Server...
call venv\Scripts\activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
pause
