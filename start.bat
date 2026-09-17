@echo off
cd /d %~dp0

if not exist .env (
    echo.
    echo ========================================================
    echo  No .env file found in this folder.
    echo  Create one with a line like:
    echo      OPENAI_API_KEY=your-key-here
    echo ========================================================
    echo.
    pause
    exit /b
)

if not exist venv (
    echo Setting up for the first time - this only happens once...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

REM Open the browser a few seconds after the server starts, in the background
start "" cmd /c "timeout /t 3 >nul && start http://127.0.0.1:8000"

echo.
echo Starting ConceptConnect AI... close this window to stop the server.
echo.
uvicorn main:app --reload