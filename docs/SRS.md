# SRS — Klip-Klop Android APK

> Software Requirements Specification
> Versi: 1.0 · Tanggal: 2026-08-23 · Status: **Draft (menunggu review)**
> Dokumen berpasangan: [PRD](PRD.md)

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Deskripsi Keseluruhan](#2-deskripsi-keseluruhan)
3. [Functional Requirements](#3-functional-requirements)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Use Cases](#6-use-cases)
7. [Arsitektur Sistem](#7-arsitektur-sistem)

> **Catatan pembaca:** Bagian 1–2 di file ini (Task #2). Bagian 3–5 lanjutan (Task #3), bagian 6–7 di file terpisah (Task #4) — lihat [SRS-Architecture](SRS-Architecture.md) untuk §6–7.

---

# 1. Pendahuluan

## 1.1 Tujuan

Dokumen ini mendefinisikan **Software Requirements Specification (SRS)** untuk **Klip-Klop Android APK** — versi mobile native dari aplikasi pengunduh & pemotong video YouTube. SRS ini menjadi dasar implementasi, pengujian, dan pemeliharaan. Berlaku untuk **Android** saja.

Dokumen ini menargetkan:
- Pengembang & kontraktor yang akan mengimplementasikan APK.
- Penguji (QA) untuk menurunkan test case.
- Stakeholder teknis untuk review.

## 1.2 Scope

Sistem ini adalah **APK Android** yang menjalankan seluruh pipeline klip-klop **di dalam perangkat**:

```
URL YouTube → Probe info (yt-dlp) → Preview (stream langsung)
           → Download & potong (yt-dlp --download-sections)
           → Trim final (Media3 Transformer)
           → Simpan ke MediaStore (Gallery) + Share
           → (auto-update yt-dlp)
```

**Di luar scope:** semua fungsi server (shutdown, open-folder, token-serving), multi-platform, editing lanjut.

## 1.3 Definisi, Akronim, Singkatan

| Term | Definisi |
|---|---|
| **yt-dlp** | CLI downloader YouTube (Python). Membundel extractor & logika download. |
| **youtubedl-android** | Library Android yang membungkus yt-dlp (bundling Python + yt-dlp binary) dengan API Java/Kotlin. |
| **Media3 Transformer** | Library Google (AndroidX) untuk transformasi video (trim, transcode) memakai hardware encoder bila tersedia. |
| **MediaStore** | Penyimpanan media Android (Gallery/Downloads) via ContentResolver. |
| **Capacitor** | Framework untuk membungkus web app (webview) menjadi APK native + bridge JS↔Kotlin. |
| **--download-sections** | Fitur yt-dlp untuk mengunduh hanya segmen waktu tertentu (klip). |
| **Trim final** | Proses memotong ulang frame-exact pada file hasil download (karena --download-sections bisa off-frame). |
| **Probe** | Proses membaca metadata video (judul, durasi, resolusi, stream URL) sebelum download. |
| **Bot-check** | Halaman YouTube "Sign in to confirm you're not a bot" yang kadang muncul untuk IP tertentu. |
| **API route** | Handler HTTP Next.js di `src/app/api/*` — hanya untuk runtime web. |

## 1.4 Referensi

- PRD Klip-Klop APK — `docs/PRD.md`
- Repo web (master): kode sumber eksisting yang dipertahankan
  - `src/lib/downloader.ts` (logika argumen download)
  - `src/lib/runtime.ts` (resolve binary, YTDLP_COMMON_ARGS)
  - `src/components/video-editor/useVideoEditor.ts` (state & alur UI)
  - `src/app/api/*` (kontrak API web)
- [youtubedl-android](https://github.com/yausername/youtubedl-android)
- [Media3 Transformer](https://developer.android.com/media/media3/transformer)
- [Capacitor](https://capacitorjs.com)

## 1.5 Gambaran Ringkas Dokumen

- §2: konteks & batas sistem.
- §3: functional requirements (yang paling penting, dengan ID & traceability).
- §4: interface eksternal (UI, software, hardware).
- §5: NFR (performa, keamanan, dll.).
- §6–7: use cases & arsitektur (di `SRS-Architecture.md`).

---

# 2. Deskripsi Keseluruhan

## 2.1 Perspektif Produk

**Klip-Klop APK adalah produk baru, bukan portasi 1:1.** Ia mempertahankan **UI React** yang sama, namun mengganti **backend server** dengan **lapisan native Android**.

```
SEBELUM (web)                       SESUDAH (APK)
┌──────────────┐                    ┌──────────────┐
│ UI React     │  fetch /api/*      │ UI React     │  client.ts
│ (browser) ───┼─────────────────►  │ (WebView) ───┼──────────┐
└──────────────┘                    └──────────────┘          │
        │                                                      ▼
┌──────────────┐                    ┌──────────────────────────────┐
│ Next.js API  │  spawn             │  Capacitor bridge            │
│ routes ──────┼──► yt-dlp/ffmpeg   │  └── Kotlin plugin ──► yt-dlp│
└──────────────┘                    └───────── + Media3 + MediaStore│
```

### 2.1.1 Antarmuka dengan produk lain
- **Chrome WebView (embedded)** — menampilkan UI React hasil `next export`.
- **Android OS** — MediaStore, share sheet, notifications, storage.
- **YouTube (via yt-dlp)** — sumber video.

### 2.1.2 Batasan antarmuka (interface boundary)
- App **tidak menjalankan HTTP server**. Tidak ada `localhost`, tidak ada port.
- Semua akses file via native (MediaStore / internal storage), **bukan** via URL HTTP.

## 2.2 Fungsi Produk (ringkasan)

1. Input & validasi URL YouTube.
2. Probe info (judul, durasi, resolusi, direct stream URL).
3. Preview player dari stream langsung.
4. Pilih segmen start–end (slider + auto-pause).
5. Download & potong segmen (yt-dlp `--download-sections`).
6. Trim final frame-exact (Media3 Transformer).
7. Simpan hasil ke MediaStore (Gallery/Downloads).
8. Share sheet untuk membagikan hasil.
9. Daftar "recent downloads".
10. Auto-update yt-dlp saat app dibuka.
11. (Cadangan) Input cookies untuk kasus blokir.

## 2.3 Karakteristik & Target Pengguna

- Pengguna umum Android (mobile-first).
- Tidak perlu keahlian teknis (bukan pengguna terminal).
- Pengguna power (developer) sebagai secondary persona — membutuhkan kontrol resolusi & update.

## 2.4 Lingkungan Operasi

### 2.4.1 Perangkat
- **OS:** Android 8.0 (API 26) ke atas.
- **Arsitektur:** ARM64 (arm64-v8a) sebagai target utama. *(ABI lain optional; dokumentasikan.*)

### 2.4.2 Koneksi
- Koneksi internet dibutuhkan saat download/probe (tidak perlu server eksternal).
- Mendukung WiFi & data seluler.

### 2.4.3 Storage
- Ruang penyimpanan cukup untuk file hasil (bergantung ukuran video).
- Penyimpanan internal + akses MediaStore (tidak butuh `MANAGE_EXTERNAL_STORAGE`).

## 2.5 Constraints & Asumsi (Design Constraints)

### 2.5.1 Constraints
- **Tidak ada Node.js runtime di APK** → `--js-runtimes node` (di `runtime.ts:9`) **tidak boleh** dipakai di jalur native. Harus dipecah per-platform.
- **API routes tidak ada di APK** (`output: 'export'`) → frontend tidak boleh bergantung langsung pada `fetch("/api/...")` di jalur native.
- **ffmpeg-kit resmi pensiun (2025)** → tidak dipakai; pakai Media3.
- **youtubedl-android** membundel Python (3.12.x) — versi ini cukup untuk yt-dlp terkini, tapi maintenance lambat.
- Hanya 1 segmen per download; tidak ada antrian.

### 2.5.2 Asumsi
- Pengguna memasang app dengan storage internet & penyimpanan yang cukup.
- YouTube dapat diakses dari jaringan pengguna (kemungkinan bot-check ada — di-mitigasi via cookies cadangan).
- Versi web (`npm run dev`) tetap dipakai pengguna → master branch tetap dikelola.

## 2.6 Asumsi & Dependensi (Teknis)

| Asumsi | Risiko bila salah |
|---|---|
| youtubedl-android 0.18.x kompatibel dengan minSdk kita (API 26) | Perlu temuan M2 (Fase implementasi) |
| Media3 Transformer mendukung input mp4 h264/aac dari yt-dlp | Fallback transcode software |
| `next export` menghasilkan static yang bisa dimuat WebView (tanpa server) | Perlu penyesuaian basePath/assetPath |

## 2.7 Traceability ke PRD

| Kebutuhan SRS | PRD |
|---|---|
| FR-01..FR-08 (↓) | Fitur FR-1..FR-8, User Stories US-01..US-17 |

---

*Lanjut ke §3–5 di file berikutnya.*
