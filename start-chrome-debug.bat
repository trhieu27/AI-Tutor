@echo off
chcp 65001 > nul
echo ==========================================================
echo       AI Tutor - Chrome Debug Port 9222 Activator
echo ==========================================================
echo.

set "CHROME_PATH="

rem Kiem tra cac duong dan cai dat Chrome thong dung tren Windows
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%USERPROFILE%\AppData\Local\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%USERPROFILE%\AppData\Local\Google\Chrome\Application\chrome.exe"
)

if not defined CHROME_PATH (
    echo [ERROR] Khong tim thay Google Chrome tren he thong cua ban!
    echo Vui loi cai dat Google Chrome vac khoi chay Chrome thu cong bang co:
    echo --remote-debugging-port=9222 --user-data-dir="%%LOCALAPPDATA%%\AI-Tutor-Chrome-Debug"
    echo.
    pause
    exit /b 1
)

echo [+] Tim thay Chrome tai: "%CHROME_PATH%"
echo [+] Dang khoi dong Google Chrome o che do Go loi tu xa (Debug Port 9222)...
echo [+] Thu muc Profile co dinh: %LOCALAPPDATA%\AI-Tutor-Chrome-Debug
echo.
echo [LUU Y] Chrome se mo mot Profile sach biet lap.
echo Hay su dung cua so Chrome moi nay de mo ung dung AI Tutor va duyet web.
echo Trinh tro ly AI se co the quan sat va tuong tac truc tiep voi cua so nay!
echo.

start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\AI-Tutor-Chrome-Debug" --no-first-run

echo [+] Da khoi dong Chrome Debug Port 9222 thanh cong!
timeout /t 4
