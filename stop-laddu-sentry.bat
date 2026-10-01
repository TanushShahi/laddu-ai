@echo off
title Stop LADDU Sentry

echo ==============================================================================
echo                      Stopping LADDU Voice Sentry
echo ==============================================================================
echo.

:: Kill node processes running daemon.js
for /f "tokens=2" %%i in ('wmic process where "commandline like '%%voice/sentry/daemon.js%%'" get processid ^| findstr [0-9]') do (
    echo Stopping LADDU Sentry Daemon (PID: %%i)...
    taskkill /PID %%i /F >nul 2>nul
)

:: Kill powershell background recognition sentry
for /f "tokens=2" %%i in ('wmic process where "commandline like '%%windows-sentry.ps1%%'" get processid ^| findstr [0-9]') do (
    echo Stopping Windows Speech Sentry (PID: %%i)...
    taskkill /PID %%i /F >nul 2>nul
)

echo.
echo [DONE] LADDU Voice Sentry has been stopped.
echo.
timeout /t 2 /nobreak >nul
