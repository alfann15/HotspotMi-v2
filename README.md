# HotspotMi v2

Aplikasi manajemen hotspot MikroTik berbasis web dengan tampilan modern, multi-router, dan multi-user.

## Stack

- **Next.js 16** (App Router)
- **Prisma 7** + PostgreSQL
- **shadcn/ui** + Tailwind CSS v4
- **Recharts** untuk grafik
- **JWT** untuk autentikasi

---

## Fitur Utama

### Autentikasi
- Login dengan akun lokal (username + password)
- Role **Admin** dan **User**
- Session berbasis JWT (HTTP-only cookie)

### Multi-Router
- Tambah beberapa router MikroTik per akun
- Test koneksi (ping) sebelum menyimpan
- Password router dienkripsi AES-256 di database
- Pilih router aktif — semua fitur menggunakan router yang dipilih
- **Share router** ke user lain (akses bersama)

### Dashboard
- Overview CPU, Memory, Storage, Uptime
- Pendapatan hari ini
- Alert user expired yang belum dimigrasi
- Quick actions: Generate Voucher, Kick All, Install Script
- Aktivitas voucher terbaru
- Grafik CPU & Memory realtime

### Hotspot
- **Sesi Aktif** — card per user, search, sort, countdown refresh, progress sisa waktu
- **Manajemen User** — edit inline, enable/disable, copy credentials, export CSV, hapus massal
- **Profil Paket** — tambah profil bandwidth

### Voucher
- Generate massal dengan konfigurasi lengkap (prefix, durasi, harga, format)
- Buat user manual satu per satu
- Copy username/password per baris atau semua sekaligus
- Cetak voucher (layout 2x/3x/4x, QR code WiFi)

### Monitoring
- Grafik CPU, Memory, dan jumlah sesi aktif
- Interface traffic realtime (download/upload per interface)
- Top 5 user dengan bandwidth terbesar

### Laporan
- Statistik bulanan dan tahunan
- Toggle grafik: jumlah voucher / pendapatan
- Detail per bulan: breakdown prefix dan profil
- Data gabungan dari router (ACTIVE) + database (EXPIRED yang dimigrasi)

### Migrasi Expired
- List user expired dari router aktif
- Pilih user yang ingin dipindah ke database
- Opsi hapus dari router setelah migrasi

### Admin
- CRUD user aplikasi (admin/user)
- Ganti password user
- Manajemen history data — pindahkan data ke router lain jika router asal dihapus

### Lainnya
- Dark / Light mode (toggle)
- Script auto-expire voucher (inject ke on-login profil MikroTik)
- Terminal RouterOS langsung dari browser

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Konfigurasi environment

Buat file `.env`:

```env
DATABASE_URL="postgres://..."
JWT_SECRET="your-secret-key"
CRYPTO_KEY="your-32-char-crypto-key"
```

### 3. Push schema database

```bash
npx prisma db push
npx prisma generate
```

### 4. Buat akun admin pertama

```bash
npx tsx prisma/seed.ts
```

Default: `admin` / `admin123` — **ganti password setelah login pertama**.

### 5. Jalankan

```bash
npm run dev   # development
npm run build && npm start  # production
```

---

## Alur Penggunaan

1. Login dengan akun admin
2. Tambah router MikroTik di halaman **Routers**
3. Pilih router aktif
4. Install script auto-expire di **Pengaturan → Install Script**
5. Generate voucher di halaman **Voucher**
6. Monitor di **Dashboard** dan **Monitoring**
7. Migrasi user expired secara berkala di **Migrasi Expired**
8. Lihat laporan pendapatan di **Laporan**
