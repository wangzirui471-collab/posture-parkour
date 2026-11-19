@echo off
chcp 65001 >nul
setlocal
set "DEMO_DIR=%~dp0"
set "PY=%DEMO_DIR%..\runtime\python.exe"
if not exist "%PY%" set "PY=D:/shangweiji/Taihe_TH-MS01/files/runtime/python.exe"
if not exist "%PY%" set "PY=python.exe"
"%PY%" --version >nul 2>&1
if errorlevel 1 goto keyboard_only

echo.
echo   MS01 Pose Runner - DEMO MODE (no skeleton hardware)
echo   --------------------------------------------------
echo   [1/2] Starting bridge with simulated actions ...
start "MS01 Pose Bridge - DEMO" /min "%PY%" -B "%DEMO_DIR%ws_server.py" --demo --demo-interval 1.2
timeout /t 2 /nobreak >nul

echo   [2/2] Opening game in default browser ...
start "" "%DEMO_DIR%index.html"

echo.
echo   Demo actions (left/right/jump/idle) are pushed every 1.2s.
echo   Close the "MS01 Pose Bridge - DEMO" window to stop.
echo.
timeout /t 3 /nobreak >nul
goto done

:keyboard_only
echo   Python was not found. Opening in keyboard mode.
start "" "%DEMO_DIR%index.html"
timeout /t 5 /nobreak >nul

:done
endlocal
