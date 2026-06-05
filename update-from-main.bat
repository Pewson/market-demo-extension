@echo off
setlocal

set "ZIP_URL=https://github.com/Pewson/market-demo-extension/archive/refs/heads/main.zip"
set "ROOT=%~dp0"

echo.
echo Gladiatus Market Demo updater
echo Folder: %ROOT%
echo.

where git >nul 2>nul
if exist "%ROOT%.git\" (
  if errorlevel 1 (
    echo This folder is a Git checkout, but Git was not found.
    echo Install Git for Windows, then run this file again:
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
  )

  echo Updating Git checkout from main...
  git -C "%ROOT%" fetch origin main
  if errorlevel 1 goto :fail

  git -C "%ROOT%" pull --ff-only origin main
  if errorlevel 1 goto :fail

  goto :done
)

echo This folder is not a Git checkout.
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

goto :done

:done
echo.
echo Update complete.
echo Reload the extension on chrome://extensions if Chrome does not pick up changes automatically.
echo.
pause
exit /b 0

:fail
echo.
echo Update failed. Check the messages above.
echo.
pause
exit /b 1
