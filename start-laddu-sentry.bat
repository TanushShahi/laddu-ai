@echo off
setlocal enabledelayedexpansion
title LADDU Always-On Voice Sentry

echo ==============================================================================
echo                 LADDU -- Always-On Background Voice Sentry
echo        Hands-Free Room-Scale Activation * Speaker Biometrics * OS Control
echo ==============================================================================
echo.

cd /d "%~dp0"

:: 1. Verify Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is required to run LADDU Sentry.
    pause
    exit /b 1
)

:: 2. Check if LADDU server is alive, if not start background server
netstat -ano | findstr ":3000.*LISTENING" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [LADDU] Starting background core services on port 3000...
    start "LADDU Server" /b node src/server.js
    timeout /t 2 /nobreak >nul
)

:: 3. Launch the Background Voice Sentry Daemon
echo [LADDU] Activating microphone background sentry...
node voice/sentry/daemon.js

pause
