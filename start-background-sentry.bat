@echo off
cd /d "%~dp0"
echo Starting LADDU Background Voice Sentry...
wscript "%~dp0start-background-sentry.vbs"
echo LADDU Background Voice Sentry is now running in the background.
timeout /t 3 >nul
