@echo off
title SUNUCUYU KAPAT
color 0C
cls
echo ===================================================
echo     TUM SUNUCULAR KAPATILIYOR...
echo ===================================================
echo.
echo Node.js islemleri sonlandiriliyor...
taskkill /F /IM node.exe
echo.
echo Islem tamamlandi. Pencereyi kapatabilirsiniz.
pause
