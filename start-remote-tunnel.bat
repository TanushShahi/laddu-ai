@echo off
title LADDU Universal Remote Tunnel Bridge
cls
echo =======================================================
echo    LADDU UNIVERSAL REMOTE ACCESS TUNNEL
echo    Expose local LADDU to any device worldwide over 4G/5G
echo =======================================================
echo.
echo [1/2] Checking local LADDU server status on port 3000...
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [INFO] Local LADDU server not running. Starting background server...
    start "" /b node src/server.js
    timeout /t 3 /nobreak >nul
)

echo.
echo [2/2] Launching secure public HTTPS tunnel via Localtunnel...
echo.
echo -------------------------------------------------------
echo  Your LADDU server will be given a global public HTTPS URL.
echo  You can open this URL on ANY device (iPhone, Android,
echo  Tablet, Laptop) from ANYWHERE in the world on cellular
echo  data (4G/5G) or external Wi-Fi!
echo.
echo  TIP: In Mobile LADDU Settings, you can paste this URL into
echo  "Remote Server URL" to link your phone to this laptop!
echo -------------------------------------------------------
echo.
npx --yes localtunnel --port 3000
pause
