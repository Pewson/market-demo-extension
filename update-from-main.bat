@echo off
setlocal

set "ZIP_URL=https://github.com/Pewson/market-demo-extension/archive/refs/heads/main.zip"
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

:menu
cls
echo.
echo Gladiatus Market Demo updater
echo Folder: %ROOT%
echo.
echo 1. Use Git fetch/reset
echo 2. Download latest ZIP
echo Q. Exit
echo.
choice /C 12Q /N /M "Choose an option: "

if errorlevel 3 goto :exit
if errorlevel 2 goto :zip_update
if errorlevel 1 goto :git_update

:git_update
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found.
  echo Choose option 2 to update without Git, or install Git for Windows:
  echo https://git-scm.com/download/win
  goto :end
)

if not exist "%ROOT%\.git\" (
  echo This folder is not a Git checkout.
  echo Choose option 2 to update from the latest GitHub ZIP.
  goto :end
)

echo Updating Git checkout from main...
git -C "%ROOT%" fetch origin main
if errorlevel 1 goto :fail

git -C "%ROOT%" reset --hard FETCH_HEAD
if errorlevel 1 goto :fail

goto :done

:zip_update
echo.
echo Downloading the latest main.zip from GitHub...

set "TEMP_DIR=%TEMP%\market-demo-extension-update"
set "ZIP_FILE=%TEMP_DIR%\main.zip"
set "EXTRACT_DIR=%TEMP_DIR%\extract"
set "EXTRACTED_ROOT=%EXTRACT_DIR%\market-demo-extension-main"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "Remove-Item -LiteralPath '%TEMP_DIR%' -Recurse -Force -ErrorAction SilentlyContinue;" ^
  "New-Item -ItemType Directory -Force -Path '%TEMP_DIR%' | Out-Null;" ^
  "Invoke-WebRequest -Uri '%ZIP_URL%' -OutFile '%ZIP_FILE%';" ^
  "Expand-Archive -LiteralPath '%ZIP_FILE%' -DestinationPath '%EXTRACT_DIR%' -Force"
if errorlevel 1 goto :fail

if not exist "%EXTRACTED_ROOT%\" (
  echo Downloaded archive did not contain the expected folder.
  goto :fail
)

echo Copying latest files into this folder...
robocopy "%EXTRACTED_ROOT%" "%ROOT%" /E /XD ".git" /XF "update-from-main.bat" >nul
if %ERRORLEVEL% GEQ 8 goto :fail

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Remove-Item -LiteralPath '%TEMP_DIR%' -Recurse -Force -ErrorAction SilentlyContinue"

goto :done

:done
echo.
echo Update complete.
echo Reload the extension on chrome://extensions if Chrome does not pick up changes automatically.
goto :end

:fail
echo.
echo Update failed. Check the messages above.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Remove-Item -LiteralPath '%TEMP_DIR%' -Recurse -Force -ErrorAction SilentlyContinue" >nul 2>nul
goto :end

:end
echo.
pause
exit /b 0

:exit
exit /b 0
