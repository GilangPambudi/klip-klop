# Klip-Klop: progres login, credit, dan database

Terakhir diperbarui: 10 Nov 2026

## Sudah di-commit dan di-push (`1a7e6bb`)

- Login Discord. Google sudah terpasang tapi dimatikan (`AUTH_GOOGLE_ENABLED=false`).
- Cut dan preview bebas, Download wajib login.
- Riwayat download per akun, hapus cuma punya sendiri. Share link tetap publik.
- Credit: 3 per akun, tidak isi ulang, kepotong kalau download sukses.
- Foto profil kotak di header, dropdown Profile dan Log out, dialog Profile.
- Sisa credit tampil di tombol Download.
- Port dev dikunci di 4200.

## Sudah dikerjakan, belum di-commit

- Panel kanan: border fokus tidak kepotong, scrollbar pindah ke luar dan ditipiskan.
- Login lewat popup: halaman utama tidak reload, jadi video dan isian tidak berubah. Kalau popup diblokir, balik ke cara lama (pindah halaman, isian disimpan lalu dibalikin).
- Database MySQL pakai Drizzle (detail di bawah).
- Ban: akun dengan `banned = 1` tidak bisa download, tombolnya jadi "Account banned".
- Nama file: tiap file diberi prefix akun (`discord_123-...`), dan kalau namanya sudah ada otomatis jadi `nama (2)`, `nama (3)`. Prefix tidak ikut tampil di daftar Downloads maupun nama file yang diunduh.
- Preview file sekarang privat: cuma pemilik file yang bisa memutar.
- Tabel `config` untuk resolusi default, tema default, dan lama simpan file.

Sudah dites: logika credit, ban, unlimited di MySQL lokal, penamaan file, dan pembacaan config (`npm test`).
Belum dites: alur popup di browser (desktop dan HP), tampilan panel kanan, download sungguhan lewat database, dan efek tiga setelan config di app.

## Database

```mermaid
erDiagram
    users ||--o{ downloads : "punya"

    users {
        varchar id PK "discord:123456 atau google:abc"
        varchar provider "discord / google / local"
        varchar name
        varchar image "URL foto profil"
        int credits "default 3"
        boolean unlimited "default false, akun bebas credit"
        boolean banned "default false, tidak bisa download"
        datetime created_at
        datetime last_login_at
    }

    downloads {
        varchar token PK "dipakai di link /api/d/token"
        varchar user_id FK
        varchar file "nama file di disk, termasuk prefix akun"
        varchar source_url "link YouTube asal"
        varchar start_time
        varchar end_time
        varchar format "mp4 / mp3 / m4a / ogg / opus"
        datetime created_at
        datetime expires_at "file dihapus setelah ini"
    }

    config {
        varchar name PK "default_height / default_theme / retention_hours"
        varchar value
    }
```

Isi tabel `config` (berlaku tanpa restart, tinggal edit `value`):

| name | value | arti |
|---|---|---|
| `default_height` | `720`, `1080`, ... atau `max` | Resolusi yang langsung terpilih saat video dimuat: yang terbaik di angka itu atau di bawahnya |
| `default_theme` | `mono-light`, `mono-dark`, `neon-light`, `neon-dark` | Tema untuk pengunjung yang belum pernah memilih tema |
| `retention_hours` | angka positif | Berapa jam hasil download disimpan sebelum dihapus |

Nilai yang kosong atau ngawur otomatis balik ke `max`, `mono-light`, dan `24`. `DOWNLOAD_RETENTION_HOURS` di `.env` sudah tidak dipakai.

- **users**: dibuat saat pertama login, lalu nama, foto, dan `last_login_at` diperbarui tiap login. Credit, `unlimited`, dan `banned` tidak pernah ditimpa oleh login.
- **downloads**: menggantikan `download/.links.json`. Baris tidak dihapus saat file kedaluwarsa atau dihapus pemiliknya, jadi riwayat tetap ada.
- `AUTH_UNLIMITED_IDS` sudah tidak dipakai. Akun bebas dan ban diatur lewat kolom `unlimited` dan `banned` (misal dari phpMyAdmin).
- File `download/.credits.json` dan `download/.links.json` sudah tidak dibaca.

## Langkah Master supaya database jalan di lokal

1. Buat database `klip_klop` di MySQL lokal (phpMyAdmin di `localhost:8888`).
2. Tambah di `.env`: `DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/klip_klop`
3. Buat tabel: `npm run db:migrate` (jalankan lagi tiap ada migrasi baru, misalnya untuk tabel `config`)
4. Cek: `npm test`
5. Restart `npm run dev`, login, lalu di tabel `users` set `unlimited = 1` di baris akun Master.

## Belum dikerjakan

- App diam-diam terbuka kalau `AUTH_SECRET` kosong.
- Mode lokal tanpa login sekarang juga butuh database.
- Deploy ke server: buat database + user di MariaDB server, isi env, `npm run db:migrate`.
