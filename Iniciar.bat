@echo off
chcp 65001 >nul
title Taller de Fondos Animados
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo   ============================================
    echo    No se encontro Node.js en esta computadora
    echo   ============================================
    echo.
    echo   Esta app necesita Node.js para renderizar el
    echo   video. Se instala en 2 minutos y es gratis:
    echo.
    echo       https://nodejs.org  ^(boton verde LTS^)
    echo.
    echo   Despues vuelve a dar doble clic aqui.
    echo.
    pause
    exit /b
)

if not exist "node_modules\@napi-rs\canvas" (
    echo.
    echo   Primera vez: instalando lo que hace falta...
    echo   Esto tarda unos minutos, solo pasa una vez.
    echo.
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo.
        echo   Fallo la instalacion. Revisa que haya internet.
        pause
        exit /b
    )
)

echo.
echo   Abriendo el Taller de Fondos Animados...
node servidor.js
pause
