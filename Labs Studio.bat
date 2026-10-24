@echo off
rem Membuka Labs Studio seperti aplikasi.
rem Server dinyalakan di jendela kecil (biarkan terbuka selama bekerja), lalu studio dibuka di jendela Edge tanpa tab.
cd /d "%~dp0"
if not exist node_modules (
  echo Menyiapkan studio pertama kali...
  call npm install
)
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:5173/api/info -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "Labs Studio - server" /min cmd /c "npm run dev"
  timeout /t 4 /nobreak >nul
)
start "" msedge --app=http://localhost:5173 --window-size=1600,950
