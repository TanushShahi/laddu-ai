@echo off
setlocal enabledelayedexpansion
title LADDU AI Assistant Launcher

echo ==============================================================================
echo                      LADDU -- Universal Personal AI Assistant
echo             Voice-First * Local-First * Speaker Biometrics * Daily Companion
echo ==============================================================================
echo.

cd /d "%~dp0"

:: 1. Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is required to run LADDU but was not found on your PATH.
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Verify dependencies
if not exist "node_modules\" (
    echo [SETUP] Initializing dependencies for LADDU...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 3. Test if server is already running on port 3000
curl -s -m 2 http://localhost:3000/api/status >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [LADDU] Core Server is already online on http://localhost:3000.
) else (
    echo [LADDU] Starting LADDU Core Server on port 3000...
    start "LADDU Core Server" /min node src/server.js
    
    :: Wait for server to become responsive (up to 10 seconds)
    for /l %%i in (1, 1, 10) do (
        ping -n 2 127.0.0.1 >nul
        curl -s -m 1 http://localhost:3000/api/status >nul 2>nul
        if !errorlevel! equ 0 goto :ready
    )
)
:ready

:: 4. Locate browser for dedicated App Window
echo [LADDU] Initializing Desktop Interface...

set "EDGE_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"

set "CHROME_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if defined EDGE_EXE (
    echo [LADDU] Launching dedicated application window...
    start "" "!EDGE_EXE!" --app=http://localhost:3000 --window-size=1300,850 --name="LADDU"
    goto :launched
)

if defined CHROME_EXE (
    echo [LADDU] Launching dedicated application window...
    start "" "!CHROME_EXE!" --app=http://localhost:3000 --window-size=1300,850
    goto :launched
)

echo [LADDU] Launching in default web browser...
start http://localhost:3000

:launched
echo.
echo ==============================================================================
echo LADDU is online and active at: http://localhost:3000
echo Mobile companion available at: http://localhost:3000/mobile.html
echo Speak "Hey Laddu" or click the microphone to initiate voice interactions.
echo ==============================================================================
echo.
ping -n 3 127.0.0.1 >nul
exit /b 0
