@echo off
title LADDU Assistant - Allow Mobile Wi-Fi Access
echo ========================================================
echo   LADDU Assistant - Windows Firewall Unblocker
echo ========================================================
echo Requesting Administrator privileges to unblock Ports 3000 and 3443...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\allow-firewall.ps1"

echo.
echo Done.
pause
