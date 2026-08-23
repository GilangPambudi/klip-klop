# PRD — Klip-Klop Android APK

> Product Requirements Document
> Versi: 1.0 · Tanggal: 2026-08-23 · Status: **Draft (menunggu review)**

---

## 1. Ringkasan Eksekutif

Klip-Klop adalah aplikasi untuk mengunduh video YouTube dan membuat klip (memotong segmen tertentu dari video). Saat ini berjalan sebagai aplikasi **web (Next.js)** yang mengeksekusi `yt-dlp` dan `ffmpeg` di server lokal (PC).

Versi **Android APK** adalah bentuk produk baru yang menjadikan **HP Android sebagai mesin utamanya** — tanpa PC, tanpa server, tanpa Termux. Seluruh proses (probe info, download, pemotongan, penyimpanan) berjalan di dalam perangkat.

**Sasaran inti:** menjaga 100% pengalaman UI yang ada (web tetap dipakai via `npm run dev`), dan menambahkan versi native yang bisa dipakai kapan saja di HP.

---

## 2. Konteks & Problem Statement

### 2.1 Kondisi saat ini
- Klip-Klop berjalan sebagai **Next.js app** dengan **API routes** yang memanggil binary eksternal (`yt-dlp`, `ffmpeg`) via child process.
- Semua proses hanya bisa berjalan di **mesin yang sedang menjalankan server** (PC Windows/Linux).
- Untuk memakai klip-klop, pengguna **wajib** memiliki laptop/PC yang menyala.

### 2.2 Masalah yang dihadapi pengguna
> "Aku tidak mau ada server atau komputer nyala. Seharusnya HP bisa menjadi mesin itu sendiri untuk melakukan download dan pemotongan."

**Statement masalah:**
- Pengguna harus membawa laptop kapan pun ingin mengunduh/memotong video.
- Workflow saat ini terikat pada lingkungan yang selalu menyala (server localhost).

### 2.3 Kenapa bukan solusi lain
| Opsi | Alasan gagal |
|---|---|
| Hosting di Vercel/cloud | Fungsi serverless punya timeout ketat, filesystem ephemeral, tidak bisa menjalankan binary custom (yt-dlp/ffmpeg) secara persisten, dan YouTube memblokir IP datacenter ("sign in to confirm you're not a bot"). |
| PWA | Tidak punya akses penuh ke penyimpanan MediaStore/Gallery & hardware encoding secara andal di semua device. |
| Termux | Terlalu teknis untuk pengguna umum (harus buka terminal, jalankan server, khawatir proses di-kill Android); bukan pengalaman aplikasi. |

---

## 3. Tujuan (Goals) & Non-Tujuan (Non-Goals)

### 3.1 Goals
1. **G1 — APK Android mandiri:** Pengguna bisa mengunduh + memotong video YouTube langsung dari HP, tanpa server/PC/Termux.
2. **G2 — UI identik:** Pengalaman frontend di APK setara dengan versi web; tidak ada fitur web yang hilang kecuali yang memang tidak masuk akal di mobile.
3. **G3 — Web tetap berjalan:** Versi web (`npm run dev`) 100% tidak terganggu oleh penambahan APK.
4. **G4 — Hasil mudah diakses:** File hasil otomatis masuk ke Gallery/Downloads Android (MediaStore) + bisa dibagikan.
5. **G5 — Tahan terhadap perubahan YouTube:** yt-dlp bisa diperbarui dari dalam app (auto-check saat app dibuka).
6. **G6 — Pemotongan cepat:** Trim/klip memakai Media3 Transformer (hardware-accelerated) untuk performa yang baik di perangkat seluler.
7. **G7 — Antisipasi blokir:** Opsi input cookies tersedia (di menu Advanced) sebagai cadangan saat YouTube melakukan bot-check.
8. **G8 — Distribusi sederhana:** APK di-distribusikan via sideload (file APK / GitHub Release) tanpa ketergantungan ke app store.

### 3.2 Non-Goals (untuk versi 1.0 APK)
- NG1 — Dukungan platform lain (iOS, iPadOS). **Hanya Android.**
- NG2 — Upload multi-video / antrian download massal. Download 1 video pada satu waktu.
- NG3 — Fitur editing lanjut (multi-track, subtitle, filter, transisi). **Hanya potong satu segmen.**
- NG4 — Manajemen akun / login / sinkronisasi cloud.
- NG5 — Monetisasi / iklan.
- NG6 — Mendukung situs selain YouTube (walau yt-dlp mendukung banyak; fokus produk = YouTube).
- NG7 — Serverless deployment (Vercel, dsb.) sebagai target runtime APK.
- NG8 — Menghindari potensi pelanggaran ToS YouTube secara aktif — ini **di luar lingkup**: produk ini mengandalkan kemampuan yt-dlp seperti adanya, dan bukan fokus desain untuk mem-bypass proteksi.
- NG9 — Distribusi via Google Play Store / F-Droid pada v1. **Distribusi = sideload APK** (file APK langsung / GitHub Release). Konsekuensi: signing via keystore pribadi; tidak terkait kebijakan store.

---

## 4. Persona & Target Pengguna

### 4.1 Persona utama — "Rian, pengguna mobile yang sering offline"
- **Usia:** 20–35.
- **Perangkat:** HP Android kelas menengah (RAM 4–8 GB).
- **Konteks:** Sering di perjalanan / di luar, tidak selalu bawa laptop. Menonton video pendek YouTube yang ingin disimpan.
- **Kebutuhan:** "Download klip video YouTube yang kusuka tanpa perlu laptop, dan simpan ke galeri biar bisa dibuka kapan saja."
- **Tingkat teknis:** Menengah. Tidak mau membuka terminal. Menginginkan aplikasi yang tap-and-go.

### 4.2 Persona sekunder — "Developer/power user"
- **Usia:** 25–40.
- **Konteks:** Membutuhkan kecepatan update yt-dlp (ekstraktor YouTube sering berubah) dan kontrol resolusi.
- **Kebutuhan:** melihat status versi yt-dlp, update manual/otomatis, dan memilih resolusi dengan jelas.

---

## 5. User Stories

Prioritas: **M = Must** (wajib untuk rilis), **S = Should** (penting), **C = Could** (nice-to-have).

| ID | Sebagai… | Saya ingin… | Sehingga… | Prioritas |
|---|---|---|---|---|
| US-01 | pengguna | membuka app dan menempel URL YouTube | saya bisa memulai workflow | M |
| US-02 | pengguna | app memvalidasi URL & menampilkan info video (judul, durasi, resolusi) | saya yakin video valid sebelum lanjut | M |
| US-03 | pengguna | memilih segmen (start–end) dengan slider/preview | saya bisa menandai bagian yang ingin diunduh | M |
| US-04 | pengguna | app mengunduh segmen video sebagai file mp4 | saya punya klip jadi | M |
| US-05 | pengguna | app menyimpan hasil ke Gallery/Downloads Android | saya bisa membuka/bagikan hasil di luar app | M |
| US-06 | pengguna | melihat daftar hasil unduhan sebelumnya | saya bisa mengelola/membagikan file lama | M |
| US-07 | pengguna | memilih resolusi unduhan (360/480/720/1080/best) | saya mengontrol kualitas vs ukuran | M |
| US-08 | pengguna | app menampilkan progres download | saya tahu proses berjalan & berapa sisa | M |
| US-09 | pengguna | menghentikan download | saya bisa membatalkan jika salah video/segmen | M |
| US-10 | pengguna | melihat error yang jelas (mis. video diblokir, jaringan gagal) | saya tahu apa yang harus diperbaiki | M |
| US-11 | pengguna | app mengecek update yt-dlp secara otomatis saat dibuka | saya tidak perlu khawatir ekstraktor basi | M |
| US-12 | pengguna | membagikan hasil via Android share sheet | saya bisa kirim klip ke orang lain/aplikasi lain | M |
| US-13 | pengguna | menonton preview video dari stream langsung | saya bisa memastikan segmen yang benar | M |
| US-14 | pengguna | app memberikan opsi cookies bila video terblokir | saya bisa tetap mengunduh saat kena bot-check | S |
| US-15 | pengguna | memberi nama file custom | hasil saya tersimpan dengan nama yang saya mau | C |
| US-16 | pengguna | download berjalan di background tanpa app di-kill | saya bisa menunggu proses panjang | C |
| US-17 | developer | melihat log/progress detail proses | saya bisa debug saat ada masalah | S |

---

## 6. Fitur (Feature Requirements)

### FR-1 — Input URL & validasi
- Pengguna menempel URL YouTube (termasuk format `youtu.be/`, `/shorts/`, `/watch?v=`, `&v=`).
- App mengekstrak **video ID** (regex 11 karakter).
- URL non-YouTube / tidak valid → error yang jelas.

### FR-2 — Probe info video
- App memanggil yt-dlp untuk mendapatkan: **judul, durasi, daftar resolusi yang tersedia**.
- Memperoleh **direct stream URL** (googlevideo) untuk preview player.
- Menampilkan info dalam hitungan detik (loading state jelas).

### FR-3 — Preview player
- Video diputar dari **direct stream URL** (bukan iframe YouTube) — identik dengan versi web.
- Slider/input start–end + **auto-pause** ketika playback mencapai end-time.
- Tombol sync "set start" / "set end" dari posisi saat ini.

### FR-4 — Download & potong
- Input: URL, start `HH:mm:ss`, end `HH:mm:ss`, filename, resolusi (opsional).
- Backend native memanggil yt-dlp dengan **`--download-sections`** untuk memotong saat unduh (efisien).
- Setelah unduh, **Media3 Transformer** melakukan **trim final** presisi (memastikan batas frame tepat).
- Output: **mp4** yang siap dimainkan.

### FR-5 — Progres & pembatalan
- Menampilkan progres download (byte/%) dari output yt-dlp.
- Tombol **batalkan** → menghentikan proses native; partial file dibersihkan.

### FR-6 — Penyimpanan ke Gallery
- File hasil disimpan ke **MediaStore** (`Movies`/`Download`) sehingga muncul di Galeri/Downloads Android.
- Notifikasi sukses + **share sheet** otomatis ditawarkan (opsional: tombol share).
- Daftar "recent downloads" menunjukkan file-file hasil.

### FR-7 — Update yt-dlp
- Saat app dibuka, cek versi yt-dlp vs rilis terbaru.
- Jika ada pembaruan → auto-update binary dari dalam app (via youtubedl-android).
- Menampilkan status versi di UI (opsional, kecil).

### FR-8 — Error handling & cookies
- Error ditampilkan dalam bahasa yang jelas (bot-check, jaringan, resolusi tidak tersedia).
- (Cadangan) Input **cookies** dari pengguna untuk kasus blokir — dipertimbangkan untuk iterasi pertama, diimplementasikan sebagai opsi lanjutan.

---

## 7. Non-Functional Requirements (Ringkasan)

*Detail lengkap di SRS §5 (NFR).*

| Kategori | Persyaratan inti |
|---|---|
| **Performa** | Probe < 15 dtk; trim klip < 2 menit (720p, 60 dtk) di device menengah |
| **Ketersediaan** | 100% offline-capable setelah install; tidak butuh server |
| **Ukuran APK** | Target ≤ 40 MB (yt-dlp+python + native libs), masuk akal untuk APK media |
| **Konsumsi** | Download berhenti efisien; tidak ada background drain tanpa proses aktif |
| **Keamanan** | Tidak ada eksfiltraasi data; semua proses lokal; sanitize filename; akses MediaStore minimal |
| **Kompatibilitas** | Android 8.0 (API 26)+; ARM64 (arsitektur device modern) |
| **Maintainability** | Branch terpisah `apk`; adapter layer `src/lib/client.ts` sebagai seam tunggal |
| **Legal/etika** | Unduh untuk penggunaan pribadi; tidak menambah tooling untuk mem-bypass DRM/paywall |

---

## 8. Success Metrics (Metrik Keberhasilan)

### 8.1 Primary
- **M1 — Berhasil download:** % download yang selesai tanpa error dari total percobaan → target ≥ 80%.
- **M2 — Waktu download-klip:** median waktu dari tekan "download" sampai file muncul di Gallery ≤ 90 dtk (untuk klip ≤ 3 menit, 720p).

### 8.2 Secondary
- **M3 — Bot-check incidence:** frekuensi pengguna terkena "sign in to confirm" → target minim & dapat diatasi cookies.
- **M4 — Update yt-dlp otomatis:** % session di mana versi yt-dlp up-to-date saat download.
- **M5 — Sesi crash:** 0 crash fatal per 100 sesi (test: 20 device, 100 download).

---

## 9. Constraints (Batasan)

- **Binary eksternal:** yt-dlp (python) + Media3 native. Tidak ada Node.js runtime di APK → argumen `--js-runtimes node` harus dibedakan (web vs native).
- **Library youtubedl-android:** maintenance lambat; risiko pembaruan Python jarang. Mitigasi: keep up-to-date, pisahkan langkah update.
- **Media3 Transformer:** proses hardware-accelerated; perilaku encoder bergantung perangkat → butuh fallback software.
- **YouTube anti-bot:** kemungkinan blokir di IP seluler → desain input cookies.
- **Branching:** master tetap untuk web; semua kerja APK di branch `apk`.

---

## 10. Milestones & Timeline

| Milestone | Isi | Estimasi |
|---|---|---|
| **M0 — Fondasi** | Branch `apk`, scaffold Capacitor, `next export` statis, konfigurasi build | 1–2 hari |
| **M1 — Adapter web** | `src/lib/client.ts`, route API tetap sebagai kontrak | 1 hari |
| **M2 — Native probe** | Plugin `probe()`, youtubedl-android terpasang | 1–2 hari |
| **M3 — Native download** | Plugin `downloadClip()`, `--download-sections`, progres, pembatalan | 2–3 hari |
| **M4 — Media3 trim** | Trim final, MediaStore save, share sheet | 2–3 hari |
| **M5 — Update yt-dlp** | Auto-check saat buka, status UI | 1 hari |
| **M6 — UI native + polish** | Sembunyikan shutdown di native, recent downloads, error copy, cookies | 2 hari |
| **M7 — Build & tes APK** | Build rilis, tes di ≥2 device, siklus bot-check | 2–3 hari |

**Total estimasi:** ± 12–17 hari kerja (bisa menyusut jika hanya fokus M0–M4 = fungsional inti).

---

## 11. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | YouTube blokir IP seluler (bot-check) | Download gagal; pengalaman rusak | Argumen `player_client=android_vr,tv`; input cookies cadangan; error jelas |
| R2 | youtubedl-android stale (Python/yt-dlp tua) | Download gagal untuk video baru | Auto-update yt-dlp; pantau release library; pertimbangkan fork |
| R3 | Media3 Transformer tak dukung codec tertentu | Trim gagal/tidak efisien | Fallback ke transcode software; uji format umum (h264/aac) |
| R4 | Build APK terlalu besar | Tidak nyaman didistribusi | Target ≤40 MB; optimasi ABI (hanya arm64); dokumentasikan |
| R5 | Sinkronisasi web↔APK (branch) | Fitur baru web tak ikut APK | Review berkala; merge dua arah terjadwal |
| R6 | Proses download di-kill Android di background | Download terpotong | Foreground service / wakelock; simpan state (C — mungkin di versi lanjutan) |

---

## 12. Open Questions — Keputusan (Terkunci)

> Semua open question di bawah telah diputuskan. Status: **final untuk v1.0.**

| OQ | Pertanyaan | Keputusan |
|---|---|---|
| **OQ1** | Input cookies untuk bot-check/blokir | **Opsional di menu "Advanced"** — tersembunyi dari UI utama, tetap tersedia saat diperlukan. |
| **OQ2** | Dukungan antrian download (banyak video sekaligus) | **Tidak untuk v1** — hanya 1 download pada satu waktu. Sederhana & tanpa konflik file. |
| **OQ3** | Simpan riwayat download + nama file custom permanen | **Tidak untuk v1** — riwayat per-sesi; nama custom berlaku untuk download itu saja. |
| **OQ4** | Target distribusi APK | **Sideload APK** — distribusi lewat file APK langsung (GitHub Release / link). Tanpa Play Store / F-Droid. |

### Konsekuensi keputusan
- **OQ1** → FR-7.2 (cookies) diimplementasikan sebagai fitur advanced; tidak menambah UI di halaman utama.
- **OQ2** → FR-4 tidak perlu state antrian/konflik; satu proses download aktif di satu waktu (cancel sebelum download baru).
- **OQ3** → Tidak ada persistence layer untuk riwayat; `recent downloads` diisi dari folder internal + MediaStore saat itu juga (bukan DB riwayat).
- **OQ4** → Tidak perlu akun Google Play, signing via keystore pribadi, dan perhatian khusus terhadap kebijakan Play (yang bisa takedown downloader YouTube). Dokumentasikan provenance build (reproducible) untuk kredibilitas.

---

## 13. Referensi

- Repo: `D:\Github\klip-klop` (master = web)
- `src/lib/downloader.ts`, `src/lib/runtime.ts`, `src/lib/concatenator.ts`
- `src/components/video-editor/useVideoEditor.ts`
- API routes: `src/app/api/{info,download,video,d,links,open-folder,shutdown}`
- Library: [youtubedl-android](https://github.com/yausername/youtubedl-android) (bundling Python+yt-dlp)
- Google Media3 Transformer (trim/concat hardware-accelerated)

---

*Selesai. Lanjut ke SRS untuk detail teknis lengkap.*
