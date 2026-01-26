@echo off
title Ngeklip Launcher
echo Starting Ngeklip...
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

:: Start browser waiter in background
echo Waiting for server to be ready...
start /b powershell -nop -c "$i=0; while ($i -lt 60 -and !(Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet)) { Start-Sleep -Seconds 1; $i++ }; if ($i -lt 60) { Start-Process 'http://localhost:3000' }"

:: Run the dev server
echo Starting development server...
call npm run dev

exit
