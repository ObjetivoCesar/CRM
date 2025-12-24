@echo off
setlocal
echo ==========================================
echo    INICIANDO CRM OBJETIVO (MODO PRO)
echo ==========================================

:: Check if .next folder exists (if it doesn't, we need to build)
if not exist ".next" (
    echo [1/2] El proyecto no tiene un build de produccion. Generando...
    call npm run build
) else (
    echo [1/2] Build de produccion encontrado.
)

echo [2/2] Iniciando servidor de produccion...

:: Start the server in a new window so this one can continue to open the browser
start /b npm start

echo Esperando a que el servidor este listo...
timeout /t 5 /nobreak > nul

echo Abriendo CRM en el navegador...
start http://localhost:3000

echo ==========================================
echo    CRM INICIADO CORRECTAMENTE
echo    No cierres esta ventana mientras uses el CRM.
echo ==========================================
pause
