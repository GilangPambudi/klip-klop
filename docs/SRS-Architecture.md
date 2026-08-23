# SRS — Klip-Klop APK · Bagian 6–7 (Use Cases & Arsitektur)

> Kelanjutan [SRS.md](SRS.md). Nomor bagian melanjutkan SRS utama.
> Dokumen pendamping: [SRS-Requirements.md](SRS-Requirements.md) (§3–5).

---

# 6. Use Cases

> Prioritas: **M** (must), **S** (should), **C** (could). Setiap use case punya normal flow + alternate/exception flow.

## UC-01 — Membuka app & memuat video dari URL
- **Prioritas:** M · **Trace:** FR-1, FR-2, US-01, US-02

**Precondition:** App terpasang, yt-dlp sudah di-bundle (atau update otomatis selesai/belum diperlukan).

**Normal flow:**
1. User membuka app (WebView memuat UI React statis).
2. User menempel URL YouTube di field.
3. Sistem mendeteksi video ID valid → memanggil `client.probe(url)`.
4. Sistem menampilkan loading "Reading video info...".
5. Native `probe()` memanggil yt-dlp `-g --print title/duration/heights` → kembalikan JSON.
6. UI menampilkan judul, durasi, dropdown resolusi, dan menyiapkan preview.
7. UI menampilkan toast "Video loaded!".

**Alternate flow A1 (URL tidak valid):**
- Langkah 3: ID tidak terdeteksi → tampil "Invalid or unsupported URL." → berhenti.

**Alternate flow A2 (probe gagal / jaringan):**
- Langkah 5: yt-dlp error → map ke pesan user-friendly (FR-7.1) → toast error → state kosong.

**Alternate flow A3 (bot-check / blokir):**
- Langkah 5: yt-dlp kena blokir → pesan "Video is blocked. Try adding cookies (Advanced)." → jika cookies tersedia, pakai & retry.

## UC-02 — Menonton preview & memilih segmen
- **Prioritas:** M · **Trace:** FR-3, US-13

**Normal flow:**
1. Preview player memainkan `directUrl`.
2. User menggeser slider / input start-end.
3. User menekan "Set start" / "Set end" dari posisi player (mengisi `currentTime`).
4. User menekan tombol preview → seek ke start → play.
5. Saat `currentTime >= end`, player auto-pause.

**Alternate flow A1 (end <= start):**
- Sistem menampilkan error validasi "End time must be after start time." (tidak lanjut ke download).

**Alternate flow A2 (stream tak bisa diputar):**
- `directUrl` gagal (expired/blocked) → tampilkan "Preview failed. Download anyway?" → lanjut download tanpa preview.

## UC-03 — Download & potong klip
- **Prioritas:** M · **Trace:** FR-4, FR-5, US-04..US-09

**Normal flow:**
1. User menekan "Download".
2. Sistem membangun parameter `{url, start, end, filename, height}` (filename di-sanitize).
3. Native `downloadClip()`:
   a. yt-dlp download `--download-sections *from-to` → file intermediate (internal).
   b. Media3 Transformer trim final → file final.
   c. Simpan ke MediaStore (Gallery/Downloads).
4. UI menampilkan progres (download → trim → save) secara real-time.
5. Sukses → toast "Download complete: <file>", tombol share, update recent downloads.

**Alternate flow A1 (cancel):**
- Step 3a/3b: user tekan "Cancel" → interrupt proses → partial file dihapus → state idle.

**Alternate flow A2 (gagal download):**
- Step 3a error → pesan user-friendly (jaringan/blokir/resolusi) → tidak simpan partial.

**Alternate flow A3 (gagal trim):**
- Step 3b error → fallback transcode software → jika tetap gagal → pesan "Trimming failed. Keep raw download?" (opsional) atau hapus.

**Alternate flow A4 (storage penuh):**
- MediaStore insert gagal → pesan "Storage full. Free up space."

## UC-04 — Melihat & membagikan hasil
- **Prioritas:** M · **Trace:** FR-5, US-05, US-06, US-12

**Normal flow:**
1. Recent downloads menampilkan daftar file.
2. User mengetuk item → menu: buka / bagikan / hapus.
3. "Bagikan" → Android share sheet dengan `content://` URI.
4. File terlihat di Gallery/Downloads.

**Alternate flow A1 (file dihapus di galeri):**
- List menyegarkan; item yang tidak ada → ditandai/hapus dari daftar.

## UC-05 — Auto-update yt-dlp saat app dibuka
- **Prioritas:** M · **Trace:** FR-6, US-11

**Normal flow:**
1. App dimuat → native `updateYtDlp()` cek versi.
2. Jika ada versi baru → download & pasang binary (via youtubedl-android).
3. Status versi tampil di UI (FR-6.2).

**Alternate flow A1 (update gagal / rate-limit):**
- Tampilkan pesan non-fatal "yt-dlp update failed. Will retry next launch." → lanjut normal.

## UC-06 — Menangani blokir dengan cookies (advanced)
- **Prioritas:** C · **Trace:** FR-7, US-14 · **Keputusan:** tampil di menu "Advanced" (OQ1); berlaku per-sesi (OQ3).

**Normal flow:**
1. User membuka menu "Advanced" (tersembunyi, mis. ikon gear) → input cookies.
2. Cookies disimpan **di memori sesi** (bukan persistence) — hilang saat app di-close.
3. Download berikutnya menyertakan cookies ke yt-dlp.

**Alternate flow A1 (cookies invalid):**
- Download tetap gagal → pesan "Cookies are invalid or expired. Update them."

**Alternate flow A2 (cookies kosong / belum diisi):**
- Download berjalan normal tanpa cookies (default).

---

# 7. Arsitektur Sistem

## 7.1 Gambaran Arsitektur (3 lapisan)

```
┌─────────────────────────────────────────────────────────────────────┐
│ LAPISAN UI (React, TIDAK BERUBAH)                                   │
│  - src/app/page.tsx, src/components/VideoEditor.tsx                 │
│  - src/components/video-editor/* (Content, Controls, VideoPlayer)   │
│  - styling tailwind + theme neon/mono                               │
│  - Satu-satunya perubahan: ganti fetch("/api/...") → client.*        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ (semua via adapter)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ LAPISAN ADAPTER (src/lib/client.ts) — BARU                         │
│  - isNative() → pilih jalur                                         │
│  - probe(url), downloadClip(p), listDownloads(), updateYtDlp()      │
│  - WEB : fetch("/api/info" | "/api/download" | "/api/links")        │
│  - NATIVE : Capacitor KlipKlop plugin                               │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ LAPISAN NATIVE (Kotlin / Capacitor plugin) — BARU                  │
│  ├─ yt-dlp runtime  : youtubedl-android (Python + yt-dlp binary)    │
│  ├─ trim/transcode  : Media3 Transformer (hardware accel.)          │
│  ├─ storage         : MediaStore (Gallery/Downloads) + internal     │
│  └─ update          : auto-check yt-dlp (youtubedl-android)         │
└─────────────────────────────────────────────────────────────────────┘
```

## 7.2 Struktur direktori target (tambahan pada repo)

```
klip-klop/
├── docs/                          # [NEW] PRD + SRS (dokumen ini)
├── next.config.*                  # ubah: output: 'export'
├── src/
│   ├── lib/
│   │   ├── client.ts              # [NEW] adapter seam
│   │   └── ... (download, runtime, dst — TIDAK berubah, tetap utk web)
│   ├── components/...             # TIDAK berubah (kecuali 1 baris Content.tsx)
│   └── app/api/...                # TETAP (kontrak web; tidak dipakai di APK)
├── android/                       # [NEW] hasil `npx cap add android`
│   └── app/src/main/java/.../KlipKlopPlugin.kt   # [NEW]
└── package.json                   # + deps Capacitor
```

## 7.3 Data Flow

### 7.3.1 Probe
```
UI probeVideo(url)
  → client.probe(url)
    → native: KlipKlopPlugin.probe
      → youtubedl-android: yt-dlp -g -f "best[ext=mp4]..." --print %(title)s --print %(duration)s --print %(formats.:.height)j
      → parse → { title, duration, heights, directUrl }
    → web: fetch POST /api/info (sama response)
  → set state (title, heights, previewUrl, selectedHeight)
```

### 7.3.2 Download + trim + save
```
UI handleDownload()
  → client.downloadClip({ url, start, end, filename, height })
    → native: KlipKlopPlugin.downloadClip
      → yt-dlp download ke internal (--download-sections *from-to, mp4)
      → Media3 Transformer: trim frame-exact → file final
      → MediaStore.insert (Video/Downloads) → uri
      → callback progres (phases: download→trim→save)
    → web: fetch POST /api/download (logika lama, tanpa Media3)
  → UI: toast sukses + tombol share + refresh recent
```

## 7.4 Strategi Branch & Build

### 7.4.1 Branch
- **`master`** — versi web. Tetap seperti sekarang.
- **`apk`** — semua kerja APK. Di-merge dari master secara berkala.
- Merge dua arah: `apk` menerima update web; perubahan `client.ts` backport ke `master` (agar web juga memakai adapter — konsisten).

### 7.4.2 Build pipeline (native)
1. `npm install` (+ deps Capacitor).
2. `npm run build` → `next export` → `out/`.
3. `npx cap sync android` → salin `out/` ke WebView.
4. `cd android && ./gradlew assembleRelease` → APK rilis.
5. (Optional) signing → distribute.

### 7.4.3 Build pipeline (web) — TIDAK berubah
- `npm run dev` / `npm run build && npm run start` (Next.js seperti biasa).

## 7.5 Resolusi Konflik `--js-runtimes node`

- `YTDLP_COMMON_ARGS` (`runtime.ts:8-13`) berisi `--js-runtimes node`.
- **Web:** tetap dipakai (Node tersedia).
- **Native:** argumen versi Android **tanpa** `--js-runtimes` (tidak ada Node); tetap pakai `--extractor-args youtube:player_client=android_vr,tv`.
- Implementasi: parameter platform di `client.ts` / konstanta argumen terpisah per platform.

## 7.6 Dependensi utama (vendor)

| Dependency | Kegunaan | Versi target |
|---|---|---|
| `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` | WebView + bridge | v7+ (latest stable) |
| `io.github.junkfood02:youtubedl-android` | yt-dlp runtime + update | 0.18.x |
| `androidx.media3:media3-transformer` | trim/transcode | latest stable |
| `next` | web app (tetap) | 16.1.4 (sudah ada) |

## 7.7 Batasan & Trade-off teknis

| Keputusan | Alasan | Konsekuensi |
|---|---|---|
| `output: 'export'` (statis) | Tidak ada server di APK | API routes tidak jalan di APK → harus lewat plugin |
| Media3 bukan ffmpeg | ffmpeg-kit pensiun; Media3 resmi & HW-accel | Argumen ffmpeg harus dikonversi ke API Transformer |
| yt-dlp via youtubedl-android | Python+yt-dlp bundle, bisa update | Maintenance lambat dari pihak ketiga |
| arm64 saja (default) | Ukuran APK ≤ 40MB | Device 32-bit tidak didukung (jarang di modern) |

## 7.8 Daftar Check-List Implementasi (tingkat tinggi)

- [ ] Branch `apk` dibuat dari `master`.
- [ ] `next.config` → `output: 'export'`; verifikasi `next export` sukses.
- [ ] Install Capacitor + `npx cap init` + `npx cap add android`.
- [ ] Tulis `src/lib/client.ts` (adapter; web fallback = API routes).
- [ ] Ganti `fetch("/api/...")` di `useVideoEditor.ts` → `client.*`.
- [ ] Tulis `KlipKlopPlugin.kt`: `probe`, `downloadClip`, `listDownloads`, `updateYtDlp`, `cancelDownload`.
- [ ] Integrasi youtubedl-android (bundling + update).
- [ ] Integrasi Media3 Transformer + fallback transcode.
- [ ] MediaStore insert + share sheet.
- [ ] Sembunyikan shutdown/open-folder di native; sesuaikan `Content.tsx` → URI lokal.
- [ ] UI status yt-dlp + auto-update.
- [ ] (Opsional) UI cookies advanced.
- [ ] Build APK rilis; tes di ≥2 device; dokumentasikan hasil.

---

*Selesai. SRS lengkap: [SRS.md](SRS.md) (§1–2) · [SRS-Requirements.md](SRS-Requirements.md) (§3–5) · [SRS-Architecture.md](SRS-Architecture.md) (§6–7).*
