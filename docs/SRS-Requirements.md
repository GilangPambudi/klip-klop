# SRS — Klip-Klop APK · Bagian 3–5 (Requirements Detail)

> Dokumen ini adalah kelanjutan [SRS.md](SRS.md) §3–§5. Nomor bagian melanjutkan SRS utama.
> Dokumen pendamping: [SRS-Architecture.md](SRS-Architecture.md) (§6–7).

---

# 3. Functional Requirements

> **Format ID:** `FR-<nomor>` untuk functional requirement, `FR-<nomor>.<sub>` untuk sub-item.
> **Prioritas:** M = Must (wajib rilis), S = Should (penting), C = Could (nice-to-have).
> **Traceability:** tiap FR dipetakan ke user story (US) di PRD.

## 3.1 Modul: Input URL & Validasi

### FR-1.1 — Input URL
- **Prioritas:** M · **Trace:** US-01
- Sistem menerima input URL YouTube melalui text field.
- Format didukung:
  - `https://www.youtube.com/watch?v=<11char>`
  - `https://youtu.be/<11char>`
  - `https://www.youtube.com/shorts/<11char>`
  - `&v=<11char>` (URL dengan parameter tambahan)
- **Sub:** FR-1.1.1 — Sistem mengekstrak video ID (11 karakter alfanumerik).
- **Sub:** FR-1.1.2 — Jika input bukan URL YouTube / tidak ada 11-char ID → tampilkan error: `"Invalid or unsupported URL."` dan **tidak** melanjutkan probe.

### FR-1.2 — Aksi validasi otomatis (on-change)
- **Prioritas:** M
- Saat URL valid (video ID terdeteksi), sistem **langsung** memanggil probe (FR-2) secara otomatis.
- Saat URL belum lengkap → tidak ada aksi; UI tetap tenang.

## 3.2 Modul: Probe Info Video

### FR-2.1 — Panggil backend native
- **Prioritas:** M · **Trace:** US-02
- Sistem memanggil `KlipKlop.probe(url)` (plugin Capacitor) di jalur native; fallback `fetch("/api/info")` di jalur web (lihat Adapter §4.2).
- **Sub:** FR-2.1.1 — Response harus berisi: `title` (string), `duration` (angka, detik), `heights` (array angka), `directUrl` (string URL stream), `error` (optional).

### FR-2.2 — Response mapping
- **Prioritas:** M
- Sistem memetakan response menjadi state UI:
  - `title` → tampilkan judul.
  - `duration` → untuk batas max slider/input end.
  - `heights` → dropdown resolusi (`360p,480p,720p,1080p`, default `best`).
  - `directUrl` → set sebagai sumber preview player.
- **Sub:** FR-2.2.1 — Jika `heights` kosong → default ke `best`, jangan crash.

### FR-2.3 — State loading & error
- **Prioritas:** M
- Selama probe → tampilkan indikator loading ("Reading video info...").
- Jika probe gagal (jaringan, blokir, video tak tersedia):
  - Tampilkan pesan error yang **jelas & actionable** (FR-8.1).
  - Set state ke kondisi awal (kosong).

### FR-2.4 — Timeout probe
- **Prioritas:** S
- Probe yang tidak selesai dalam **30 detik** → timeout, tampilkan error "Video info timed out. Try again."

## 3.3 Modul: Preview Player

### FR-3.1 — Sumber stream langsung
- **Prioritas:** M · **Trace:** US-13
- Player memainkan `directUrl` (stream googlevideo) — **bukan** iframe YouTube. (Identik dengan perilaku web saat ini.)

### FR-3.2 — Kontrol segmen
- **Prioritas:** M
- Input start (`HH:mm:ss`) & end (`HH:mm:ss`) + slider.
- Slider beroperasi dalam rentang `[0, duration]`; start ≤ end.
- **Sub:** FR-3.2.1 — Set dari posisi player (tombol "Set start"/"Set end") → mengisi input dari `player.currentTime`.

### FR-3.3 — Auto-pause pada end-time
- **Prioritas:** M · **Trace:** US-13
- Saat playback berjalan dan `currentTime >= end` → player di-`pause()` otomatis.
- (Perilaku ini sudah ada di `useVideoEditor.ts:194-210`.)

### FR-3.4 — Preview dari start
- **Prioritas:** M
- Tombol preview → seek ke `start`, lalu `play()`.

## 3.4 Modul: Download & Potong

### FR-4.1 — Parameter download
- **Prioritas:** M · **Trace:** US-04
- Input ke native:
  - `url` (string) — URL YouTube penuh.
  - `start`, `end` (string `HH:mm:ss`).
  - `filename` (string, sudah di-sanitize).
  - `height` (angka, optional; `undefined` = best).
- **Sub:** FR-4.1.1 — Sanitize filename identik dengan web (`sanitizeFilename` di `downloader.ts:20-29`), dipindah/salin ke sisi native.

### FR-4.2 — Proses unduh via yt-dlp
- **Prioritas:** M
- Native memanggil yt-dlp dengan argumen ekivalen `downloadPart()` (`downloader.ts:68-96`):
  - `--no-playlist`
  - `-f bestvideo[height<=N]+bestaudio/best...` (atau `bestvideo+bestaudio/best` bila best)
  - `--merge-output-format mp4`
  - `--remux-video mp4`
  - `--force-keyframes-at-cuts`
  - `--download-sections *from-to`
  - `--ffmpeg-location` (**di APK: internal ffmpeg; di web: resolveBinary**)
  - **Dengan penyesuaian:** TIDAK memakai `--js-runtimes node` di jalur native (lihat §2.5.1).
  - `--extractor-args youtube:player_client=android_vr,tv` tetap dipakai.

### FR-4.3 — Hasil intermediate
- **Prioritas:** M
- Hasil download disimpan ke **internal storage app** (folder sementara) sebelum trim final.
- Partial file yang gagal/terpotong → dibersihkan.

### FR-4.4 — Trim final frame-exact (Media3 Transformer)
- **Prioritas:** M · **Trace:** US-04
- File intermediate di-trim ulang agar batas start–end presisi frame.
- Output final: **mp4** (h264/aac compatible dengan Android).
- **Sub:** FR-4.4.1 — Jika Media3 gagal (codec tidak didukung), fallback transcode software (lihat §5.6.2).

### FR-4.5 — Progres download
- **Prioritas:** M · **Trace:** US-08
- Native melaporkan progres (byte/%, fase: unduh → trim → simpan) ke UI.
- **Sub:** FR-4.5.1 — UI menampilkan progres secara real-time; tidak membeku.

### FR-4.6 — Pembatalan
- **Prioritas:** M · **Trace:** US-09
- Tombol "Cancel" → native menghentikan proses (interrupt yt-dlp + Media3), partial file dihapus, state kembali idle.

### FR-4.7 — Hasil akhir & navigasi
- **Prioritas:** M
- Setelah sukses: tampilkan notifikasi sukses + **tombol share** (FR-6.3) + update daftar recent downloads.

## 3.5 Modul: Penyimpanan ke MediaStore

### FR-5.1 — Simpan ke Gallery/Downloads
- **Prioritas:** M · **Trace:** US-05
- File final disimpan ke MediaStore:
  - Collection: `MediaStore.Video` (Movies) atau `Downloads`.
  - Display name = `filename.mp4`.
  - MIME: `video/mp4`.
- **Sub:** FR-5.1.1 — Setelah insert, file terlihat di Galeri & file manager Android.
- **Sub:** FR-5.1.2 — Izin storage: gunakan **scoped storage** (API 29+); tanpa `MANAGE_EXTERNAL_STORAGE`.

### FR-5.2 — Recent downloads
- **Prioritas:** M · **Trace:** US-06
- App menampilkan daftar file hasil (dari folder internal app + MediaStore).
- Setiap item: nama file, ukuran, waktu, aksi (bagikan / buka / hapus).

### FR-5.3 — Share sheet
- **Prioritas:** M · **Trace:** US-12
- Tombol "Share" pada hasil → membuka Android share sheet dengan `content://` URI hasil.

## 3.6 Modul: Update yt-dlp

### FR-6.1 — Auto-check saat app dibuka
- **Prioritas:** M · **Trace:** US-11
- Saat app selesai dimuat, native memeriksa versi yt-dlp & versi terbaru.
- Jika versi terbaru > versi saat ini → auto-update binary (via youtubedl-android).

### FR-6.2 — Status versi
- **Prioritas:** S
- UI menampilkan status versi yt-dlp (mis. di footer/daftar): "yt-dlp 2026.08.10 · up to date" atau "updating...".
- **Sub:** FR-6.2.1 — Jika update gagal (mis. GitHub rate limit), tampilkan pesan non-fatal & lanjutkan normal.

## 3.7 Modul: Error Handling & Cookies (Cadangan)

### FR-7.1 — Klasifikasi error
- **Prioritas:** M · **Trace:** US-10
- Error dibedakan dan ditampilkan user-friendly:

| Kondisi | Pesan (contoh) |
|---|---|
| Jaringan mati / timeout | "Network error. Check your connection and try again." |
| Video diblokir / bot-check | "Video is blocked. Try adding cookies (Advanced)." |
| Resolusi tidak tersedia | "Resolution Np not available. Choose another." |
| yt-dlp gagal parse | "Could not read video. Try again later." |

### FR-7.2 — Cookies (opsional, advanced — keputusan OQ1)
- **Prioritas:** C · **Trace:** US-14 · **Keputusan:** tampil di menu "Advanced" (tersembunyi dari UI utama).
- UI "Advanced" → input cookies (teks `name=value; ...`) → diteruskan ke yt-dlp (`--add-header Cookie:...` / `--cookies-from-browser` disesuaikan untuk Android).
- **Sub:** FR-7.2.1 — Disimpan lokal (internal), tidak dikirim keluar.
- **Sub:** FR-7.2.2 — Berlaku hanya untuk sesi ini (keputusan OQ3: tidak ada persistence riwayat); cookies dihapus saat app di-close atau saat logout manual.

---

# 4. External Interface Requirements

## 4.1 User Interfaces (UI)

### 4.1.1 Sumber
- UI = **React app hasil `next export`** (static), dimuat di **Capacitor WebView**.
- **TIDAK mengubah** komponen UI web: `page.tsx`, `VideoEditor.tsx`, `video-editor/*`, styling (tailwind + shadcn-like, theme neon/mono).

### 4.1.2 Perbedaan UI khusus native (delta kecil)

| Area | Perubahan |
|---|---|
| Tombol **"Stop server"** (`useVideoEditor.ts:283`) | **Disembunyikan** di native (tidak ada server). |
| Tombol **"Open folder"** (`useVideoEditor.ts:305`) | Diganti **Share / Save** (FR-5.3). |
| Sumber video hasil (`Content.tsx:21`) | Dari `/api/video?file=...` → **URI lokal** (`content://` / internal) bila `downloadedFilename` ada. |
| Recent downloads (`/api/links`) | Diganti list native (FR-5.2). |
| Menu "Advanced" (cookies) | Tambahan baru (FR-7.2). |

### 4.1.3 Responsive & mobile
- Layout sudah mobile-first (tailwind breakpoints). APK memakai ukuran layar penuh.
- Handle **keyboard dismiss** + scroll saat probe (perilaku mobile sudah ada di `useVideoEditor.ts:102-110`).
- Orientasi: **portrait** (default); landscape optional.

## 4.2 Software Interfaces

### 4.2.1 Adapter JS — `src/lib/client.ts` (baru)

> Seam tunggal yang menggantikan panggilan `fetch` di UI. Ini **satu-satunya** modul JS baru yang menyentuh jalur web.

```ts
// Pseudocode kontrak
export const client = {
  probe(url: string): Promise<ProbeResult>,        // web: fetch /api/info ; native: KlipKlop.probe
  downloadClip(params): Promise<DownloadResult>,   // web: fetch /api/download ; native: KlipKlop.downloadClip
  listDownloads(): Promise<DownloadItem[]>,        // web: fetch /api/links ; native: KlipKlop.listDownloads
  isNative(): boolean,
}
```

- **Jalur web** → memanggil API routes yang ada (kontrak tidak berubah).
- **Jalur native** → `Capacitor.Plugins.KlipKlop.{method}`.
- Deteksi native: `Capacitor.isNativePlatform()`.

### 4.2.2 Plugin Capacitor — `KlipKlopPlugin` (Kotlin, baru)

| Method | Input | Output (JS) | Fungsi |
|---|---|---|---|
| `probe(url)` | `{ url }` | `{ title, duration, heights[], directUrl, error? }` | yt-dlp `-g --print ...` (ekivalen `info/route.ts`) |
| `downloadClip(params)` | `{ url, start, end, filename, height? }` | `{ success, fileUri?, error? }` | yt-dlp `--download-sections` → Media3 trim → MediaStore |
| `listDownloads()` | — | `[{ name, size, uri, createdAt }]` | List internal + MediaStore |
| `updateYtDlp()` | — | `{ updated, version }` | Auto-update (FR-6) |
| `cancelDownload()` | — | `{ cancelled }` | Interrupt (FR-4.6) |

### 4.2.3 Runtime web ↔ native

| Concern | Web (master) | Native (APK) |
|---|---|---|
| yt-dlp | `resolveBinary("yt-dlp")` spawn | youtubedl-android API |
| ffmpeg | `resolveBinary("ffmpeg")` spawn | Media3 (no ffmpeg CLI) |
| `--js-runtimes node` | **ADA** | **DILARANG** (tidak ada Node di APK) |
| Storage | `./download` folder | MediaStore + internal app |
| HTTP server | Ada (Next.js) | **Tidak ada** |

## 4.3 Hardware Interfaces

- **Tidak ada** interface hardware langsung (tidak memakai kamera, sensor, Bluetooth).
- Media3 memakai **GPU/VPU encoder** bila tersedia (otomatis via platform) → bukan interface eksplisit, tapi konstrain performa.

## 4.4 Communication Interfaces

- **HTTP/HTTPS** — komunikasi ke YouTube (via yt-dlp internal).
- **Inter-Process** — none (semua dalam proses app).
- **Capacitor bridge** — komunikasi JS↔native (serialized JSON).

---

# 5. Non-Functional Requirements

## 5.1 Performa

| ID | Requirement | Kriteria |
|---|---|---|
| NFR-1.1 | Probe time | Median ≤ 15 dtk untuk video biasa (jaringan 4G/WiFi). |
| NFR-1.2 | Trim time | Klip 720p/60 dtk: trim final ≤ 2 menit di device menengah (hardware encoder). |
| NFR-1.3 | UI responsif | Tidak ada jank > 100ms saat interaksi; progres tampil real-time. |
| NFR-1.4 | Download | Throughput mendekati limit jaringan; tidak ada bottleneck app. |

## 5.2 Ketersediaan & Reliabilitas

| ID | Requirement | Kriteria |
|---|---|---|
| NFR-2.1 | Offline-capable | Semua fungsi (setelah install) berjalan tanpa server eksternal. |
| NFR-2.2 | Crash rate | ≤ 1 crash per 100 sesi aktif. |
| NFR-2.3 | Partial file handling | File gagal/terpotong tidak menumpuk; dibersihkan otomatis. |
| NFR-2.4 | Recoverability | Download terpotong (app di-kill) → file partial ditandai & dibersihkan saat restart. |

## 5.3 Keamanan

| ID | Requirement | Kriteria |
|---|---|---|
| NFR-3.1 | Data privacy | Semua proses lokal; tidak ada data diunggah ke server kami (tidak ada server). |
| NFR-3.2 | Filename sanitize | Path traversal dicegah (salin `sanitizeFilename` ke native). |
| NFR-3.3 | Storage permission | Hanya scoped storage (API 29+), tanpa `MANAGE_EXTERNAL_STORAGE`. |
| NFR-3.4 | Cookies | Disimpan lokal, tidak pernah dikirim keluar app. |

## 5.4 Kompatibilitas & Portabilitas

| ID | Requirement | Kriteria |
|---|---|---|
| NFR-4.1 | OS | Android 8.0 (API 26)+. |
| NFR-4.2 | ABI | arm64-v8a utama; x86_64/armv7a optional (dokumentasikan trade-off ukuran). |
| NFR-4.3 | Web compatibility | Versi web (`npm run dev`) tetap berfungsi; tidak ada regresi. |
| NFR-4.4 | Device matrix | Diuji pada ≥ 2 device nyata (mis. kelas menengah + flagship). |

## 5.5 Maintainability & Extensibility

| ID | Requirement | Kriteria |
|---|---|---|
| NFR-5.1 | Branch strategy | `master` = web; `apk` = work APK. Merge dua arah terjadwal. |
| NFR-5.2 | Seam tunggal | Semua akses native via `src/lib/client.ts`. Jangan tersebar `Capacitor.Plugins` di komponen. |
| NFR-5.3 | Doc | PRD/SRS di `docs/` mengikuti format ini; update bila arsitektur berubah. |
| NFR-5.4 | Build reproducibility | `npm run build && next export && npx cap sync android && ./gradlew assembleRelease` terdokumentasi. |
| NFR-5.5 | Single download | Hanya 1 download aktif pada satu waktu (keputusan OQ2); download baru menunggu/ membatalkan yang aktif. |

## 5.6 Performa & Resource (Native)

| ID | Requirement | Kriteria |
|---|---|---|
| NFR-6.1 | APK size | Target ≤ 40 MB (AAB/APK rilis, arm64). |
| NFR-6.2 | Memory | Trim 720p pada device RAM 4 GB berjalan tanpa OOM. |
| NFR-6.3 | Battery | Tidak ada background drain; proses hanya berjalan saat aksi user. |
| NFR-6.4 | Fallback codec | Media3 gagal → fallback transcode software (lebih lambat tapi berhasil). |

## 5.7 Legal, Etika & Distribusi

| ID | Requirement | Kriteria |
|---|---|---|
| NFR-7.1 | Penggunaan pribadi | Dokumentasikan penggunaan untuk klip pribadi; tidak menambah fitur bypass DRM/paywall. |
| NFR-7.2 | Open-source | Kode open-source (lisensi mengikuti repo web). |
| NFR-7.3 | Provenance | Jika rilis publik: bangun dengan reproducible build & tanda tangan yang jelas (issue #358 youtubedl-android relevan). |
| NFR-7.4 | Distribusi | Sideload APK (file APK / GitHub Release); tidak ada ketergantungan ke Play Store / F-Droid (keputusan OQ4). |

---

*Lanjut ke [SRS-Architecture.md](SRS-Architecture.md) untuk §6 (Use Cases) & §7 (Arsitektur).*
