<div align="center">

# HotspotMi v2

**Solusi manajemen hotspot MikroTik berbasis web — multi-router, multi-user, siap produksi.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-latest-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

![Demo](https://placehold.co/900x450/1e293b/94a3b8?text=📸+Ganti+dengan+demo+GIF+aktual)

</div>

---

## Tentang Proyek

HotspotMi v2 dirancang untuk operator warnet, RT/RW Net, dan ISP skala kecil yang membutuhkan kontrol penuh atas jaringan hotspot MikroTik mereka — tanpa harus membuka Winbox setiap saat.

Kelola voucher, pantau sesi aktif, lihat laporan pendapatan, dan akses terminal RouterOS, semuanya dari satu antarmuka web yang modern.

---

## Fitur Utama

| Modul | Kemampuan |
|---|---|
| 🔐 **Autentikasi** | Login lokal, role Admin/User, JWT HTTP-only cookie |
| 🌐 **Multi-Router** | Kelola banyak router, enkripsi AES-256, share akses |
| 📊 **Dashboard** | CPU/Memory/Uptime real-time, pendapatan hari ini, alert expired |
| 🔥 **Hotspot** | Sesi aktif, manajemen user, profil bandwidth |
| 🎟️ **Voucher** | Generate massal, cetak layout 2×/3×/4×, QR code WiFi |
| 📈 **Monitoring** | Grafik historis, traffic per interface, top 5 user |
| 📋 **Laporan** | Statistik bulanan/tahunan, breakdown prefix & profil |
| 🔄 **Migrasi** | Pindahkan user expired dari router ke database |
| ⚙️ **Admin** | CRUD user aplikasi, manajemen history |
| 🛠️ **Lainnya** | Dark/Light mode, script auto-expire, terminal RouterOS |

---

## Stack Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router), shadcn/ui, Tailwind CSS v4, Recharts |
| Backend | Next.js API Routes, Prisma 7 |
| Database | PostgreSQL |
| Auth | JWT via HTTP-only cookie |

---

## Instalasi

### Prasyarat

- Node.js 18+
- PostgreSQL
- Router MikroTik dengan API aktif (port 8728)

### Langkah-langkah

**1. Clone repositori**

```bash
git clone https://github.com/your-username/hotspotmi_v2.git
cd hotspotmi_v2
npm install
```

**2. Buat file `.env`**

```env
DATABASE_URL="postgres://user:password@host:5432/dbname"
JWT_SECRET="your-secret-key"
CRYPTO_KEY="your-32-char-crypto-key"
```

**3. Inisialisasi database**

```bash
npx prisma db push
npx prisma generate
```

**4. Seed akun admin**

```bash
npx tsx prisma/seed.ts
```

> Login default: `admin` / `admin123` — **ganti password segera setelah login pertama.**

**5. Jalankan aplikasi**

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

---

## Alur Penggunaan

```
Login
 └── Tambah Router → Test Koneksi → Pilih Router Aktif
      └── Install Script Auto-Expire
           ├── Generate Voucher → Cetak
           ├── Pantau Dashboard & Monitoring
           ├── Migrasi User Expired (berkala)
           └── Lihat Laporan Pendapatan
```

---

## FAQ

<details>
<summary><strong>Router MikroTik tidak bisa terkoneksi. Apa yang harus dicek?</strong></summary>

Pastikan tiga hal berikut:
1. API MikroTik aktif — buka `/ip service` di Winbox, pastikan `api` berstatus *enabled*
2. Port 8728 tidak diblokir oleh firewall router maupun server
3. Kredensial (username/password) yang dimasukkan sudah benar

Gunakan tombol **Test Koneksi** sebelum menyimpan konfigurasi router.

</details>

<details>
<summary><strong>Bisakah mengelola lebih dari satu router?</strong></summary>

Bisa. Tambahkan beberapa router di menu **Router**, lalu pilih satu sebagai router aktif. Semua fitur — dashboard, hotspot, voucher, monitoring — akan mengacu pada router yang sedang aktif.

</details>

<details>
<summary><strong>Bagaimana cara berbagi akses router ke pengguna lain?</strong></summary>

Buka halaman detail router, lalu gunakan fitur **Share Router**. Masukkan username akun yang sudah terdaftar di aplikasi untuk memberikan akses.

</details>

<details>
<summary><strong>Apa itu Script Auto-Expire? Apakah wajib dipasang?</strong></summary>

Script ini di-inject ke profil `on-login` MikroTik untuk otomatis menonaktifkan voucher yang sudah habis masa berlakunya. Tidak wajib, tetapi sangat disarankan — tanpa script ini, data expired bisa tidak akurat dan fitur migrasi tidak berjalan optimal.

</details>

<details>
<summary><strong>Di mana data voucher expired disimpan?</strong></summary>

Setelah proses migrasi dijalankan, data disimpan di database PostgreSQL. Data ini tetap tersedia untuk laporan pendapatan historis meskipun user sudah dihapus dari router.

</details>

<details>
<summary><strong>Bisakah dijalankan di VPS atau server?</strong></summary>

Bisa. Build aplikasi dengan `npm run build && npm start`, lalu arahkan reverse proxy (Nginx atau Caddy) ke port yang digunakan. Pastikan PostgreSQL dapat diakses dari server tersebut.

</details>

---

## Lisensi

Proyek ini bersifat privat. Dilarang mendistribusikan ulang tanpa izin tertulis.
