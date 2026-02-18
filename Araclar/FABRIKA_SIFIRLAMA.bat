@echo off
chcp 65001 > nul
title FABRIKA AYARLARINA DONUS ARACI
color 4f
cls

echo ==============================================================================
echo                          DIKKAT: FABRIKA AYARLARINA DONUS
echo ==============================================================================
echo.
echo  BU ISLEM ASAGIDAKI TUM VERILERI KALICI OLARAK SILECEKTIR:
echo.
echo    - Tum Urunler ve Stoklar
echo    - Tum Satis Gecmisi ve Raporlar
echo    - Tum Musteri Kayitlari
echo    - Tum Magaza ve Kullanici Bilgileri
echo    - Tum Ayarlar
echo.
echo  Sistem tamamen sifirlanacak ve ilk kurulum halini alacaktir.
echo  Bu islem geri alinamaz!
echo.
echo  ONEMLI: Lutfen islemi baslatmadan once Web Uygulamasini (Terminali) kapatin.
echo          Aksi takdirde veritabani kilitli oldugu icin silinemeyebilir.
echo.
echo ==============================================================================
echo.
echo  Devam etmek istiyorsaniz bir tusa basin... (Iptal icin pencereyi kapatin)
pause > nul

cd /d "%~dp0\.."

echo.
echo  [1/3] Veritabani baglantisi kesiliyor...
timeout /t 2 > nul

echo.
echo  [2/3] Veritabani dosyasi siliniyor...
if exist "prisma\dev.db" (
    del /f /q "prisma\dev.db"
    echo  Eski veritabani silindi.
)

echo.
echo  [2.5/3] Veritabani guncel sema ile yeniden olusturuluyor...
echo  (Bu islem semadaki en son degisiklikleri dogrudan uygular)
echo.

call npx prisma db push --accept-data-loss

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo  HATA: Veritabani olusturma basarisiz oldu!
    echo  Lutfen sema dosyanizda hata olmadigindan emin olun.
    echo  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    pause
    exit /b %errorlevel%
)

echo.
echo  [3/3] Onbellek temizleniyor...
if exist ".next" (
    rmdir /s /q ".next"
    echo  .next klasoru temizlendi.
)

color 2f
cls
echo ==============================================================================
echo                            ISLEM BASARIYLA TAMAMLANDI
echo ==============================================================================
echo.
echo  Sistem fabrika ayarlarina dondu.
echo  Veritabani tamamen bosaltildi.
echo.
echo  Simdi uygulamayi tekrar baslatabilir (npm run dev) ve 
echo  sifirdan magaza acarak kullanmaya baslayabilirsiniz.
echo.
echo ==============================================================================
pause
