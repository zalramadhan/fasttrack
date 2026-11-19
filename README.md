# fasttrack

Editor video card untuk sosial media: susun beberapa video, potong, tambah musik, atur framing & rasio, tempel teks, lalu export MP4. Tanpa postingan, tanpa akun.

## Jalankan

```bash
npm install
npm run dev          # http://localhost:3000
```

- `/` — layar awal: tempel link atau upload video. Editor baru muncul setelah video pertama siap.

Kebutuhan sistem:

- Node.js 20+
- `ffmpeg` + `ffprobe` dengan encoder `libx264` dan `aac` (untuk export MP4)
- `yt-dlp` untuk import dari link (YouTube, TikTok, Instagram, X, dll.)
- Chromium untuk import Threads (memakai browser headless)

```bash
npm run setup:ytdlp   # venv di .tools/ytdlp-venv
npm run setup:browser # install Chromium untuk Playwright
```

## Alur (step by step)

1. **Sumber video** — layar awal hanya berisi input link/upload. Setelah video pertama masuk, editor terbuka; card sumber di atas bisa dipakai menambah sampai 6 video yang diputar berurutan. Video bisa dihapus kapan saja.
2. **Trim & audio** — timeline gabungan, trim per video (drag handle atau isi detik), transisi antar klip, framing video (zoom/posisi/latar), dan musik. Total maksimal 180 detik.
3. **Teks** — layer teks dengan timing, font Google, preset gaya, dan animasi masuk/keluar.
4. **Export** — 1080p/720p, Default 7 Mbps atau High 12 Mbps, plus tombol untuk menambah video lagi.

Preview sticky: di layar kecil preview tetap terlihat saat panel pengaturan di-scroll. Di bagian bawah preview ada timeline yang menyatu dengan tombol play/pause: klik atau geser track untuk lompat ke bagian mana pun tanpa menunggu playback, termasuk saat berada di langkah teks/export.

## Fitur

- **Multi-video berurutan** (maks 6 klip) dengan trim masing-masing; audio semua klip digabung rapi, termasuk klip tanpa audio.
- **25 transisi** antar klip (gerak, cahaya, sapuan, glitch, distorsi, 3D) dari shader WebGL clipframes. Durasi 0,2–1,5 detik, dibatasi 50% klip terpendek; audio di sambungan di-crossfade. Memilih efek langsung memutar sambungannya tanpa menekan play.
- **Sumber**: upload MP4/MOV/WEBM/M4V/MKV (maks 400 MB per video) atau link via yt-dlp. Link Threads publik ditangani browser headless karena halaman Threads tidak menyediakan metadata video untuk request biasa.
- **Rasio**: 1:1, 4:5, 9:16, 16:9.
- **Framing video**: zoom 100–250%, geser X/Y, latar **Isi penuh**, **Blur** (kekuatan blur + dim), atau **Warna** (color picker).
- **Audio**: musik upload (MP3/WAV/M4A) dengan volume, titik mulai, loop otomatis; audio asli tiap klip bisa dimute dan diatur volumenya.
- **Teks**: banyak layer dengan waktu muncul/hilang, font Google (cari & load on-demand), ukuran, ketebalan, kerning, line-height, warna, outline, uppercase/lowercase, rata, lebar maksimum, dan posisi drag di preview. Gaya bisa disalin ke layer lain (Salin/Tempel) tanpa menimpa isi, posisi, atau timing.
- **Layar awal minimalis** dengan input link/upload, tema terang-gelap, dan tautan GitHub/Instagram; editor baru tampil setelah sumber pertama berhasil dibaca.
- **Preset gaya**: Clean, Poster, Editorial, Impact, Mono, Soft, Lime, Tag.
- **Animasi teks**: fade, pop, slide untuk masuk dan keluar, ditambah 10 efek dari katalog typeframes (Line Mask Rise, Word Pop, Char Stagger, Letter Wave, Flip 3D, Typewriter, Neon Flicker, Echo Stack, Track Tighten, Gradient Sheen). Durasi 0,1–1,5 detik; ikut ter-render ke MP4. Memilih animasi masuk/keluar langsung memutar bagian itu, lalu berhenti sendiri.
- **Bahasa Indonesia / English** dengan switch EN/ID di header; default English, pilihan tersimpan di browser. Semua teks UI dan pesan error ikut berganti bahasa.
- **Tema terang/gelap** dengan toggle di header, tersimpan di browser.
- **Export**: H.264 + AAC 48 kHz, faststart, 30 fps.

## Cara kerja export

1. Browser merender tiap frame (video klip yang aktif + teks + animasi + framing) ke canvas. Saat transisi, dua klip digambar ke canvas terpisah lalu digabung shader WebGL di canvas yang sama. JPEG per frame dikirim ke server.
2. Server menulis frame ke `frames.mjpeg`, lalu menjalankan ffmpeg sekali: `libx264` pada bitrate target, sementara audio tiap klip dipotong sesuai offset timeline (dengan fade in/out di overlap) lalu dimix dengan musik (`amix`).
3. Progres encoding dipantau dari `-progress`, hasil MP4 bisa diunduh.

File sementara disimpan di `.tmp/` dan dibersihkan otomatis setelah beberapa jam.

## Struktur

```
app/            layar awal + editor (satu route), API routes (source, media, export)
components/     panel UI (sumber, trim, transisi, preview, teks, audio, export)
lib/            render canvas, transisi (shader + compositor), font Google, tipe, helper client/server
lib/server/     storage sementara, ffmpeg, yt-dlp, Threads, job export
```

## Batasan

- Export berjalan di server lokal (Node + ffmpeg).
- Total durasi maksimal 180 detik.
- Link privat/geo-block bisa gagal; pesan error ditampilkan di panel sumber.
- Threads hanya untuk post publik berisi video, dan butuh Chromium terpasang.
- Proyek tidak disimpan — refresh halaman memulai sesi baru.
