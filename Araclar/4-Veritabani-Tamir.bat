@echo off
title VERITABANI TAMIR
color 0E
cls
echo ===================================================
echo     VERITABANI KILITLERI TEMIZLENIYOR...
echo ===================================================
echo.
echo Once tum node islemlerini kapatalim...
taskkill /F /IM node.exe
echo.
echo Lock dosyalari veya cache temizleniyor olabilir...
echo.
echo Yeniden olusturuluyor...
call npx prisma generate
echo.
echo Islem Tamamlandi. Simdi 1-Sunucuyu-Baslat ile sistemi acabilirsiniz.
pause
