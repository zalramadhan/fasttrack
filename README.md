# fasttrack

Editor video card untuk sosial media: susun beberapa video, potong, tambah musik, atur framing & rasio, tempel teks, lalu export MP4. Akun gratis bisa export 720p dengan watermark; akses lifetime membuka 1080p tanpa watermark.

## Jalankan

```bash
npm install
npm run dev          # http://localhost:3000
```

- `/` — halaman publik: tempel link atau pilih video tanpa login. Saat lanjut ke editor, user diarahkan ke daftar/masuk, lalu sumber yang dipilih dilanjutkan otomatis di editor.
- `/login`, `/register` — masuk atau buat akun.
- `/verify` — hasil verifikasi email dari tautan yang dikirim setelah daftar.
- `/orders` — riwayat order lifetime milik user yang sedang login.
- `/help` — panduan editing, save project, verifikasi email, export, dan akun.
- `/admin` — dashboard admin: statistik, user, order, backup, storage, audit log, dan pengaturan link unlock Shopee.

Kebutuhan sistem:

- Node.js 22.5+ (memakai `node:sqlite` bawaan)
- `ffmpeg` + `ffprobe` dengan encoder `libx264` dan `aac` (untuk export MP4)
- `yt-dlp` untuk import dari link (YouTube, TikTok, Instagram, X, dll.)
- Chromium untuk import Threads (memakai browser headless)

```bash
npm run setup:ytdlp   # venv di .tools/ytdlp-venv
npm run setup:browser # install Chromium untuk Playwright
```

## Akun & lifetime

Halaman depan dan `/help` bisa diakses tanpa login. Upload, import link, simpan project, dan export membutuhkan akun. Akun baru otomatis masuk paket **free**: export 720p, bitrate 2 Mbps, dan watermark `fasttrack` di pojok kanan bawah. Setiap export free harus dibuka lewat iklan Shopee selama 5 detik; setelah export dimulai tombol kembali terkunci. Paket **lifetime** menghilangkan watermark, membuka export 1080p (7 atau 12 Mbps), dan tidak memakai unlock iklan.

Setelah daftar, user langsung masuk editor dan mendapat email verifikasi. Editing dan save project tetap bisa; export terkunci sampai email diverifikasi. Kalau pengiriman email belum dikonfigurasi, admin bisa menandai email terverifikasi dari `/admin`.

Pembayaran dilakukan manual via WhatsApp. User menekan **Upgrade lifetime**, mendapat kode order `FT-XXXXXX`, lalu chat admin dengan kode itu. Admin membuka `/admin`, menekan **Activate lifetime** setelah pembayaran masuk. Tidak ada payment gateway dan tidak ada penagihan otomatis.

Admin ditentukan lewat `ADMIN_EMAIL` (boleh beberapa email dipisah koma); email tersebut otomatis mendapat role admin saat daftar. Isi juga `WHATSAPP_NUMBER` (format internasional tanpa `+`, mis. `62812...`) dan `LIFETIME_PRICE` (rupiah, default `99000`).

```bash
cp .env.example .env.local
# edit .env.local, lalu restart server
```

Data akun, sesi, order, project, pengaturan, dan audit admin disimpan di SQLite (`data/app.db`). `DATABASE_PATH` bisa dipakai untuk memindahkan file database. Set `COOKIE_SECURE=1` jika app diakses lewat HTTPS.

### Email verifikasi

Isi `RESEND_API_KEY`, `EMAIL_FROM` (domain pengirim yang sudah diverifikasi di Resend), dan `APP_URL` agar link verifikasi menunjuk ke alamat publik. Tanpa konfigurasi ini, akun tetap dibuat tetapi email tidak terkirim dan export tetap terkunci sampai admin memverifikasi manual dari dashboard.

### Backup otomatis

Server membuat snapshot SQLite dengan `VACUUM INTO` ±15 detik setelah boot, lalu setiap 24 jam. Snapshot konsisten meski database sedang dipakai, dan disimpan di `data/backups/` dengan retensi 14 file terakhir. Lokasi, interval, dan retensi bisa diubah lewat `BACKUP_DIR`, `BACKUP_INTERVAL_HOURS`, dan `BACKUP_RETENTION`.

## Simpan project

Di editor, tombol **Simpan project** menyimpan klip, trim, transisi, framing, teks, audio, rasio, dan pengaturan export ke SQLite. Setiap akun punya satu slot project; menyimpan lagi akan menimpa project sebelumnya. Project tersimpan muncul sebagai **Lanjutkan project tersimpan** di layar awal.

Media yang dipakai project akan dipin sehingga tidak ikut cleanup `.tmp` otomatis. Media yang tidak pernah disimpan tetap dibersihkan setelah beberapa jam.

### Rate limit

Login dibatasi 8 percobaan gagal per email dan 30 per IP dalam 15 menit. Register dibatasi 10 akun per IP per jam, pembuatan order 10 kali per user per jam, dan kirim ulang email verifikasi 5 kali per user per jam. Respons `429` menyertakan header `Retry-After`.

### Password gate opsional

Isi `FASTTRACK_PASSWORD` untuk menambah HTTP Basic Auth di semua halaman dan API di depan login akun. Username default `fasttrack`, bisa diganti lewat `FASTTRACK_USER`. Kosongkan untuk app publik.

## Alur (step by step)

1. **Sumber video** — layar awal hanya berisi input link/upload. Setelah video pertama masuk, editor terbuka; card sumber di atas bisa dipakai menambah sampai 6 video yang diputar berurutan. Video bisa dihapus kapan saja.
2. **Trim & audio** — trim per video (drag handle atau isi detik), transisi antar klip, framing video (zoom/posisi/latar), dan musik. Total maksimal 180 detik.
3. **Teks** — layer teks dengan timing, font Google, preset gaya, dan animasi masuk/keluar.
4. **Export** — free: 720p 2 Mbps + watermark, dibuka dengan **Unlock with ads** dan menunggu 5 detik setiap kali export; lifetime: 1080p, Default 7 Mbps atau High 12 Mbps, tanpa watermark.

Preview sticky: di layar kecil preview tetap terlihat saat panel pengaturan di-scroll dan area preview memakai tinggi 55% viewport (minimal 336 px, maksimal 560 px). Di bagian bawah preview ada scrubber yang menyatu dengan tombol play/pause: klik atau geser track untuk lompat ke bagian mana pun tanpa menunggu playback, termasuk saat berada di langkah teks/export. Panel sumber bisa ditutup dan dibuka lagi dari header di semua ukuran layar. Mulai breakpoint `md`, header editor menampilkan menu lengkap; di ponsel semua aksi masuk ke menu hamburger.

## Fitur

- **Multi-video berurutan** (maks 6 klip) dengan trim masing-masing; audio semua klip digabung rapi, termasuk klip tanpa audio.
- **25 transisi** antar klip (gerak, cahaya, sapuan, glitch, distorsi, 3D) dari shader WebGL clipframes. Durasi 0,2–1,5 detik, dibatasi 50% klip terpendek; audio di sambungan di-crossfade. Memilih efek langsung memutar sambungannya tanpa menekan play.
- **Sumber**: upload MP4/MOV/WEBM/M4V/MKV (maks 400 MB per video) atau link via yt-dlp. Link Threads publik ditangani browser headless karena halaman Threads tidak menyediakan metadata video untuk request biasa.
- **Rasio**: 1:1, 4:5, 9:16, 16:9.
- **Framing video**: zoom 100–250%, geser X/Y, latar **Isi penuh**, **Blur** (kekuatan blur + dim), atau **Warna** (color picker).
- **Audio**: musik upload (MP3/WAV/M4A) dengan volume, titik mulai, loop otomatis; audio asli tiap klip bisa dimute dan diatur volumenya.
- **Teks**: banyak layer dengan waktu muncul/hilang, font Google (cari & load on-demand), ukuran, ketebalan, kerning, line-height, warna, outline, uppercase/lowercase, rata, lebar maksimum, dan posisi drag di preview. Gaya bisa disalin ke layer lain (Salin/Tempel) tanpa menimpa isi, posisi, atau timing.
- **Preview quality**: pilihan Full, Half (540p), dan Quarter (360p) di header preview. Half/Quarter memakai proxy H.264 yang dibuat ffmpeg sekali lalu di-cache; video di atas 20 MB mulai membuat proxy Half di background setelah upload. Proxy memakai keyframe tiap detik agar scrubbing ringan, dan export tetap memakai video asli.
- **Halaman depan publik** dengan input link/upload. Sumber yang dipilih disimpan sementara di IndexedDB browser, lalu dilanjutkan otomatis setelah daftar atau masuk. Di ponsel, aksi editor masuk ke menu hamburger supaya header tidak bertumpuk.
- **Unlock with ads** wajib untuk setiap export akun free. URL Shopee diatur admin lewat `/admin` → Settings; user membuka link, menunggu 5 detik, lalu tombol export terbuka. Setelah export dimulai tombol kembali terkunci. Link memakai `rel="sponsored"`.
- **Preset gaya**: Clean, Poster, Editorial, Impact, Mono, Soft, Lime, Tag.
- **Animasi teks**: fade, pop, slide untuk keluar; masuk punya 18 efek one-shot dari katalog typeframes (Line Mask Rise, Word Mask Rise, Word Pop, Char Stagger, Letter Wave, Flip 3D, Typewriter, Caret Sweep, Neon Flicker, Glow Pulse, Echo Stack, Track Tighten, Gradient Sheen, Chromatic Split, VHS Skew, Character Shatter, Slice Shift, Scramble Decode) plus 3 loop: Vertical Ticker, Infinite Marquee, Diagonal Ticker. Loop mengisi tinggi frame, mendukung teks multi-baris (Enter), berjalan selama layer terlihat, dan kecepatannya bisa diatur 25–300%; Vertical Ticker memakai tinggi penuh video. Durasi entrance 0,1–1,5 detik; semua ikut ter-render ke MP4. Memilih animasi langsung memutar preview-nya (loop 2,2 detik).
- **Bahasa Indonesia / English** dengan switch EN/ID di header; default English, pilihan tersimpan di browser. Semua teks UI dan pesan error ikut berganti bahasa.
- **Tema terang/gelap** dengan toggle di header, tersimpan di browser.
- **Export**: H.264 + AAC 48 kHz, faststart, 30 fps. Batas resolusi/bitrate dan watermark diterapkan di server, bukan hanya di UI.
- **Akun**: register/login dengan sesi cookie HttpOnly, password di-hash scrypt, verifikasi email, role admin, order WhatsApp, riwayat order, rate limit, panduan, simpan project, dan aktivasi lifetime manual.
- **Dashboard admin** di `/admin`: statistik user/order/pendapatan, pencarian dan filter user, aktivasi lifetime, verifikasi email manual, suspend/reactivate, pembatalan order pending, status backup, pemakaian storage, audit log, dan pengaturan link Shopee.

## Cara kerja export

1. Browser merender tiap frame (video klip yang aktif + teks + animasi + framing) ke canvas. Saat transisi, dua klip digambar ke canvas terpisah lalu digabung shader WebGL di canvas yang sama. JPEG per frame dikirim ke server.
2. Server menulis frame ke `frames.mjpeg`, lalu menjalankan ffmpeg sekali: `libx264` pada bitrate target, sementara audio tiap klip dipotong sesuai offset timeline (dengan fade in/out di overlap) lalu dimix dengan musik (`amix`).
3. ffmpeg men-scale frame ke resolusi target dan menambahkan watermark `fasttrack` untuk akun free. Progres encoding dipantau dari `-progress`, hasil MP4 bisa diunduh.

File sementara disimpan di `.tmp/` dan dibersihkan otomatis setelah beberapa jam.

## Struktur

```
app/            layar awal + editor (satu route), API routes (source, media, export)
components/     panel UI (sumber, trim, transisi, preview, teks, audio, export)
lib/            render canvas, transisi (shader + compositor), font Google, tipe, helper client/server
lib/server/     SQLite/auth, storage sementara, ffmpeg, yt-dlp, Threads, job export
```

## Batasan

- Export berjalan di server lokal (Node + ffmpeg).
- Pembayaran dan aktivasi lifetime masih manual lewat WhatsApp + admin.
- Total durasi maksimal 180 detik.
- Link privat/geo-block bisa gagal; pesan error ditampilkan di panel sumber.
- Threads hanya untuk post publik berisi video, dan butuh Chromium terpasang.
- Hanya satu project tersimpan per akun; menyimpan project baru akan menimpa project sebelumnya.
