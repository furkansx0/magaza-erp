@echo off
title VERITABANI GUNCELLEME
color 0B
cls
echo ===================================================
echo     VERITABANI GUNCELLENIYOR...
echo ===================================================
echo.
echo 1. Veritabani semasi uygulaniyor (Migrate)...
call npx prisma migrate dev --name auto_update
echo.
echo 2. Istemci dosyalar olusturuluyor (Generate)...
call npx prisma generate
echo.
echo Islem Tamamlandi!
echo.
echo Eger hata aldiysaniz lutfen "4-Veritabani-Tamir.bat" dosyasini kullanin.
pause
