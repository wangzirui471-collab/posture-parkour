@echo off
chcp 65001 >nul
setlocal
set "DEMO_DIR=%~dp0"
set "PY=%DEMO_DIR%..\runtime\python.exe"
if not exist "%PY%" set "PY=D:/TH-MS01/files/runtime/python.exe"
if not exist "%PY%" set "PY=D:/shangweiji/Taihe_TH-MS01/files/runtime/python.exe"
if not exist "%PY%" set "PY=python.exe"
"%PY%" --version >nul 2>&1
if errorlevel 1 goto keyboard_only

echo.
echo   MS01 红外感知台 · 姿态跑酷
echo   ------------------------------------
echo   [1/3] 启动 WebSocket 桥接服务 ...
start "MS01-桥接服务" /min "%PY%" -B "%DEMO_DIR%ws_server.py"
timeout /t 2 /nobreak >nul

echo   [2/3] 启动感知台骨骼文件桥接 ...
start "MS01-骨骼桥接" /min "%PY%" -B "%DEMO_DIR%ms01_bridge.py" --verbose
timeout /t 1 /nobreak >nul

echo   [3/3] 打开游戏页面 ...
start "" "%DEMO_DIR%index.html"

echo.
echo   就绪。请确认：
echo     1. 红外感知台已打开，处于“本机识别”运行状态
echo     2. 人站在画面里（感知台能看到骨骼）
echo   动作：左倾/右倾变道，双肩快速上抬跳，双肩下沉蹲。
echo   关闭“MS01-桥接服务”和“MS01-骨骼桥接”窗口即可停止。
echo.
timeout /t 5 /nobreak >nul
goto done

:keyboard_only
echo   未找到 Python，已打开游戏。可使用键盘操控。
start "" "%DEMO_DIR%index.html"
timeout /t 5 /nobreak >nul

:done
endlocal
