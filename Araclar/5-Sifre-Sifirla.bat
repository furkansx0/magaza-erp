@echo off
cd /d "%~dp0\.."
echo.
echo ===================================================
echo     YONETICI SIFRESI SIFIRLAMA ARACI
echo ===================================================
echo.
echo Bu islem 'admin' userinin sifresini '1234' yapar.
echo Devam etmek icin bir tusa basin...
pause
cls
echo Islem baslatiliyor...
cmd /c npx tsx src/scripts/reset-password-emergency.ts
echo.
echo.
echo Islem tamamlandi. Pencereyi kapatabilirsiniz.
pause
