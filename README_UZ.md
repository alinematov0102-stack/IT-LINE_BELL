# IT-LINE SMART BELL — IT-LINE jadvali bilan

## Suratdagi jadval asosida kiritilgan dars va qo‘ng‘iroq vaqtlari

| Dars | Boshlanish | Tugash | Tanaffus |
|---|---:|---:|---:|
| 1-dars | 08:30 | 09:15 | 20 daqiqa |
| 2-dars | 09:35 | 10:20 | 5 daqiqa |
| 3-dars | 10:25 | 11:10 | 5 daqiqa |
| 4-dars | 11:15 | 12:00 | 45 daqiqa |
| 5-dars | 12:45 | 13:30 | 5 daqiqa |
| 6-dars | 13:35 | 14:20 | 5 daqiqa |
| 7-dars | 14:25 | 15:10 | 5 daqiqa |
| 8-dars | 15:15 | 16:00 | Tolma choy |

Tizim yangi ma'lumotlar bazasi yaratilganda 16 ta hodisani avtomatik qo‘shadi: har bir dars boshlanishi va tugashi. Jadval Dushanba–Shanba uchun yoqilgan. Yakshanba o‘chiq.

## Siz yuborgan audio fayllar
- `qongiroq-1.wav` — dars boshlanishi hodisalariga biriktirilgan.
- `qongiroq-2.m4a` — dars tugashi hodisalariga biriktirilgan.

Audio biriktirish taxminiy boshlang‘ich sozlama: ilova ichida istalgan hodisa audio faylini o‘zgartirishingiz mumkin.

## O‘rnatish
1. ZIP faylni oching.
2. Node.js 20 LTS yoki undan yangi LTS versiyasini o‘rnating.
3. VS Code terminalida:
   ```bash
   npm install
   npm run dev
   ```
4. Windows installer yaratish:
   ```bash
   npm run dist
   ```
   Tayyor installer `release` papkasiga chiqadi.

## Muhim
- Scheduler `Asia/Tashkent` vaqt mintaqasidan foydalanadi.
- Windows tizim soati to‘g‘ri bo‘lishi shart.
- Dastur oynasini yopish o‘rniga trayga yashiradi; traydan chiqish alohida.
- Kompyuter sleep holatida ovoz chiqishi uchun Wake Timers yoqilgan bo‘lishi va qurilma buni qo‘llashi kerak.
- Kompyuter butunlay o‘chganida yoki elektr uzilganda qo‘ng‘iroq chalolmaydi.
- Bu ishlab chiqish versiyasi: real maktab kompyuterida jadval va ovozni sinash shart.

## Responsive dizayn
Interfeys kompyuter, planshet va telefon ekranlariga moslashtirilgan. 700px dan kichik ekranda navigatsiya pastki panelga o‘tadi; jadval qatorlari, boshqaruv tugmalari va modal oynalar kichik ekranga moslashadi.


## Yangilangan versiya

- Dashboard keyingi qo‘ng‘iroqni bugun va kelasi 7 kun jadvalidan hisoblaydi.
- Dars tugash hodisalari endi tanaffus boshlanishi sifatida ko‘rsatiladi.
- Dars/tanaffus almashinuvi jadvaldagi aniq vaqtlar bo‘yicha avtomatik ishlaydi.
- Audio nomini tahrirlash alohida oynaga o‘tkazildi; `window.prompt` ishlatilmaydi.

Yangilangan loyihani ishga tushirishdan oldin Windows terminalida loyiha papkasida `npm install`, so‘ng `npm run dev` buyrug‘ini bajaring. O‘rnatilgan eski `node_modules` papkasini ZIP ichiga qo‘shmang.

## Windows EXE installer va fon rejimi

### Installer yaratish (Windows 10/11)
1. Node.js 20 LTS yoki undan yangi LTS versiyasini o‘rnating.
2. Loyiha papkasida PowerShell yoki CMD oching.
3. Quyidagilarni bajaring:
   ```powershell
   npm install
   npm run dist
   ```
4. Tayyor `.exe` installer `release` papkasida paydo bo‘ladi. Uni ishga tushirib, Windows'ga o‘rnating.

### Windows bilan avtomatik ishga tushish
O‘rnatilgan dastur Windows tizimiga kirilganda avtomatik ishga tushadi va dastlab System Tray ichida yashirin turadi. Tray belgisini ikki marta bosib oynani oching. Oynani yopish dasturni to‘liq o‘chirmaydi — trayga yashiradi. To‘liq chiqish uchun tray menyusidagi **Dasturdan chiqish** bandini tanlang.

### Zaxira nusxa
Dashboard yuqorisidagi zaxira belgisi yoki tray menyusidagi **Zaxira nusxa olish...** orqali papka tanlang. Dastur SQLite bazasi va barcha audio fayllarni vaqt belgisi bilan alohida papkaga ko‘chiradi. Zaxira papkasini boshqa diskka yoki tashqi xotiraga saqlang.

### Uyqu rejimidan uyg‘onish
Windows uyqu rejimidan qaytganda scheduler vaqtni qayta tekshiradi va ilova oynasini yangilaydi. Uyqu paytida kompyuter ovoz chiqarmaydi; uyg‘ongandan keyin o‘tib ketgan qo‘ng‘iroqni orqaga qaytarib chalmaslik — takroriy qo‘ng‘iroqlarni oldini olish uchun ataylab tanlangan xatti-harakat. Jadvaldagi keyingi vaqtlar odatdagidek ishlaydi. BIOS/Windows quvvat sozlamalari va qurilma imkoniyatlari uyg‘onish xatti-harakatiga ta'sir qiladi.

### Responsive
Interfeys 1024px gacha planshet ko‘rinishiga, 700px gacha telefon ko‘rinishiga moslashadi. Electron oynasining minimal eni 360px qilib belgilangan; mobil o‘lchamda navigatsiya pastki panelga o‘tadi.

## Muhim sinov
EXE installer Windows qurilmasida yaratilishi va maktab kompyuterida sinovdan o‘tkazilishi kerak. Ushbu ZIP'da tayyor Windows `.exe` emas, EXE yaratish uchun loyiha manbalari bor. Installerni Windows'da `npm run dist` buyrug‘i yaratadi.
