"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "id";

const EN = {
  "common.or": "or",
  "common.maxPerVideo": "max 400 MB per video",
  "common.uploading": "Uploading…",
  "common.pasteLinkFirst": "Paste a video link first.",
  "common.uploadFailed": "Upload failed.",
  "common.linkFailed": "Couldn't fetch the video from that link.",
  "common.exportFailed": "Export failed.",
  "common.videoUnreadable": "This video can't be read.",
  "common.reset": "Reset",
  "common.transition": "Transition",
  "common.language": "Language",

  "start.badge": "Video card · MP4 · free",
  "start.titleA": "Turn a plain video",
  "start.titleB": "into a post-ready card.",
  "start.subtitle":
    "Paste a link or upload a video. The editor opens for trimming, transitions, text, and music — then export MP4 without a watermark.",
  "start.linkPlaceholder": "Paste a video link…",
  "start.linkAria": "Video link",
  "start.fetching": "Fetching",
  "start.create": "Create",
  "start.chooseFile": "Choose a video from your device",
  "start.sources": "YouTube, TikTok, Instagram, Threads, X · max 400 MB per video",
  "start.features": "25 transitions · layered text · 1080p · no account",
  "start.legal": "Use public content and respect creators.",
  "start.madeBy": "Made by zal",

  "source.title": "01 · Video source",
  "source.count": "videos",
  "source.maxNote": "Max 180 seconds total · 6 videos",
  "source.drop": "Drag a video or click to choose",
  "source.addAnother": "Add another video",
  "source.limitReached": "6-video limit reached",
  "source.formats": "MP4, MOV, WEBM, M4V · max 400 MB per video",
  "source.linkPlaceholder": "Paste a video link…",
  "source.add": "Add",
  "source.hint": "YouTube, TikTok, Instagram, Threads, X, and other sites via yt-dlp.",
  "source.none": "No videos yet",
  "source.noneHint": "Added videos play in order",
  "source.remove": "Remove {name}",

  "editor.stepSource": "Source",
  "editor.stepTrim": "Trim & audio",
  "editor.stepText": "Text",
  "editor.stepExport": "Export",
  "editor.summary": "{videos} videos · {duration} · {size}",
  "editor.summaryOne": "{videos} video · {duration} · {size}",
  "editor.empty": "Once a video is added, trim & audio, text, and export appear here.",
  "editor.nextText": "Continue to text",
  "editor.nextExport": "Continue to export",
  "editor.privacy": "All files are stored temporarily on this machine. No account, no posting.",
  "editor.home": "Home",
  "editor.projectMax": "Up to {count} videos per project.",
  "editor.tooLong": "180-second limit reached. Trim the existing videos first.",
  "editor.durationUnreadable": "Couldn't read the video duration in the browser.",

  "trim.title": "Duration & trim",
  "trim.empty": "Add a video in the source panel above.",
  "trim.note":
    "Max {max} seconds total · minimum {min} seconds per video. Videos play in the order above.",
  "trim.start": "Start",
  "trim.end": "End",
  "trim.dragStart": "Drag start point",
  "trim.dragEnd": "Drag end point",

  "transition.title": "Transitions",
  "transition.seams": "{count} seams",
  "transition.cut": "Direct cut",
  "transition.none": "No transition (cut)",
  "transition.previewAria": "Preview transition",
  "transition.clipAria": "Transition into clip {n}",
  "transition.durationAria": "Transition duration for clip {n}",
  "transition.clamped": "Limited to 50% of the shortest clip ({seconds}s).",
  "transition.note":
    "Transitions shorten the total duration by the overlap. Pick an effect, then press play to see the seam.",
  "transition.category.motion": "Motion",
  "transition.category.light": "Light",
  "transition.category.glitch": "Glitch",
  "transition.category.wipe": "Wipe",
  "transition.category.warp": "Warp",
  "transition.category.3d": "3D",

  "frame.title": "03 · Video framing",
  "frame.empty": "Add a video first to adjust framing.",
  "frame.background": "Background",
  "frame.fill": "Fill frame",
  "frame.blur": "Blur",
  "frame.color": "Color",
  "frame.blurStrength": "Blur strength",
  "frame.dim": "Background dim",
  "frame.bgColor": "Background color",
  "frame.zoom": "Zoom",
  "frame.shiftX": "Shift X",
  "frame.shiftY": "Shift Y",
  "frame.note":
    "Blur and color modes show the full video with a background behind it. Zoom and shift apply to the main video.",

  "audio.title": "04 · Audio",
  "audio.looped": "looped to the video length",
  "audio.remove": "Remove music",
  "audio.volume": "Music volume",
  "audio.startAt": "Start music at",
  "audio.replace": "Replace music",
  "audio.add": "Add music",
  "audio.formats": "MP3, WAV, M4A · max 40 MB",
  "audio.original": "Original video audio",
  "audio.mutedDesc": "Muted — only the music is heard.",
  "audio.unmutedDesc": "Plays and mixes with the music.",
  "audio.sourceVolume": "Original audio volume",
  "audio.noMusic": "Without music, the video is exported with its original audio only.",
  "audio.uploadFailed": "Music upload failed.",

  "text.title": "Text",
  "text.sample": "Your text here",
  "text.addLayer": "Layer",
  "text.empty": "No text yet. Add your first layer.",
  "text.untitled": "No text",
  "text.duplicate": "Duplicate",
  "text.duplicateAria": "Duplicate layer",
  "text.deleteAria": "Delete layer",
  "text.content": "Text",
  "text.placeholder": "Write your text here…",
  "text.styleCopied": "Style copied. Select another layer, then Paste.",
  "text.styleHint": "Copy the style (font, color, outline, animation) to another layer.",
  "text.copy": "Copy",
  "text.paste": "Paste",
  "text.presets": "Style presets",
  "text.applyPreset": "Apply the {name} preset",
  "text.font": "Google font",
  "text.searchFont": "Search Google Fonts…",
  "text.noFonts": "No fonts found.",
  "text.closeFonts": "Close font list",
  "text.size": "Size",
  "text.weight": "Weight",
  "text.kerning": "Kerning",
  "text.lineHeight": "Line height",
  "text.color": "Text color",
  "text.outlineColor": "Outline color",
  "text.outlineWidth": "Outline width",
  "text.letterCase": "Case",
  "text.align": "Align",
  "text.left": "Left",
  "text.center": "Center",
  "text.right": "Right",
  "text.showAt": "Show at (s)",
  "text.hideAt": "Hide at (s)",
  "text.enter": "Entrance animation",
  "text.noAnimation": "No animation",
  "text.exit": "Exit animation",
  "text.exitNone": "None",
  "text.animDuration": "Animation duration",
  "text.x": "Position X",
  "text.y": "Position Y",
  "text.maxWidth": "Max text width",
  "text.centerCanvas": "Center on canvas",

  "export.title": "Export MP4",
  "export.resolution": "Resolution",
  "export.quality": "Quality",
  "export.fullQuality": "Full quality",
  "export.faster": "Faster & smaller",
  "export.defaultQuality": "Default",
  "export.daily": "For everyday posting",
  "export.high": "High",
  "export.sharper": "Sharper detail",
  "export.ratioRes": "Ratio & resolution",
  "export.duration": "Duration",
  "export.fps": "Frame rate",
  "export.video": "Video",
  "export.text": "Text",
  "export.estimate": "Estimated size",
  "export.clips": "{count} clips",
  "export.layers": "{count} layers",
  "export.empty": "Add a source video first to start exporting.",
  "export.cancel": "Cancel",
  "export.download": "Download MP4",
  "export.again": "Export again",
  "export.button": "Export MP4 · {rate} Mbps",
  "export.addVideo": "Add another video",
  "export.note":
    "Rendering happens in the browser (frames + text); ffmpeg on this machine encodes H.264/AAC. Files are stored temporarily in the .tmp folder.",
  "export.stagePreparing": "Preparing fonts & video…",
  "export.stageFrames": "Rendering frames…",
  "export.stageEncoding": "Encoding MP4 with ffmpeg…",
  "export.stageDone": "Done",
  "export.stageWorking": "Working…",
  "export.frame": "Frame {frame}/{total}",

  "timeline.title": "Timeline",

  "preview.ratio": "Ratio",
  "preview.empty": "Preview appears once a video is added",
  "preview.emptyHint": "Add a video in the source panel above",
  "preview.play": "Play",
  "preview.pause": "Pause",
  "preview.seek": "Preview position",
  "preview.clipCount": "{count} videos · ",

  "theme.toDark": "Switch to dark mode",
  "theme.toLight": "Switch to light mode",
  "theme.darkTitle": "Dark mode",
  "theme.lightTitle": "Light mode",
} as const;

export type MessageKey = keyof typeof EN;

const ID: Record<MessageKey, string> = {
  "common.or": "atau",
  "common.maxPerVideo": "maks 400 MB per video",
  "common.uploading": "Mengunggah…",
  "common.pasteLinkFirst": "Tempel link video dulu.",
  "common.uploadFailed": "Upload gagal.",
  "common.linkFailed": "Gagal mengambil video dari link.",
  "common.exportFailed": "Export gagal.",
  "common.videoUnreadable": "Video tidak bisa dibaca.",
  "common.reset": "Reset",
  "common.transition": "Transisi",
  "common.language": "Bahasa",

  "start.badge": "Video card · MP4 · gratis",
  "start.titleA": "Video biasa jadi",
  "start.titleB": "card siap posting.",
  "start.subtitle":
    "Tempel link atau upload video. Setelah itu editor terbuka untuk trim, transisi, teks, dan musik — lalu export MP4 tanpa watermark.",
  "start.linkPlaceholder": "Tempel link video…",
  "start.linkAria": "Link video",
  "start.fetching": "Mengambil",
  "start.create": "Buat",
  "start.chooseFile": "Pilih video dari perangkat",
  "start.sources": "YouTube, TikTok, Instagram, Threads, X · maks 400 MB per video",
  "start.features": "25 transisi · teks berlapis · 1080p · tanpa akun",
  "start.legal": "Gunakan konten publik dan hormati hak kreator.",
  "start.madeBy": "Dibuat oleh zal",

  "source.title": "01 · Sumber video",
  "source.count": "video",
  "source.maxNote": "Maks 180 detik total · 6 video",
  "source.drop": "Tarik video atau klik untuk pilih",
  "source.addAnother": "Tambah video lain",
  "source.limitReached": "Batas 6 video tercapai",
  "source.formats": "MP4, MOV, WEBM, M4V · maks 400 MB per video",
  "source.linkPlaceholder": "Tempel link video…",
  "source.add": "Ambil",
  "source.hint": "YouTube, TikTok, Instagram, Threads, X, dan situs lain via yt-dlp.",
  "source.none": "Belum ada video",
  "source.noneHint": "Video yang ditambahkan diputar berurutan",
  "source.remove": "Hapus {name}",

  "editor.stepSource": "Sumber",
  "editor.stepTrim": "Trim & audio",
  "editor.stepText": "Teks",
  "editor.stepExport": "Export",
  "editor.summary": "{videos} video · {duration} · {size}",
  "editor.summaryOne": "{videos} video · {duration} · {size}",
  "editor.empty": "Setelah video ditambahkan, alur trim & audio, teks, dan export akan muncul di sini.",
  "editor.nextText": "Lanjut ke teks",
  "editor.nextExport": "Lanjut ke export",
  "editor.privacy": "Semua file hanya tersimpan sementara di mesin ini. Tanpa akun, tanpa postingan.",
  "editor.home": "Beranda",
  "editor.projectMax": "Maksimal {count} video per project.",
  "editor.tooLong": "Batas 180 detik tercapai. Trim video yang ada dulu.",
  "editor.durationUnreadable": "Durasi video tidak terbaca browser.",

  "trim.title": "Durasi & trim",
  "trim.empty": "Tambahkan video di panel sumber di atas.",
  "trim.note":
    "Total maksimal {max} detik · minimal {min} detik per video. Video diputar berurutan sesuai urutan di atas.",
  "trim.start": "Mulai",
  "trim.end": "Selesai",
  "trim.dragStart": "Geser titik mulai",
  "trim.dragEnd": "Geser titik selesai",

  "transition.title": "Transisi",
  "transition.seams": "{count} sambungan",
  "transition.cut": "Cut langsung",
  "transition.none": "Tanpa transisi (cut)",
  "transition.previewAria": "Pratinjau transisi",
  "transition.clipAria": "Transisi klip {n}",
  "transition.durationAria": "Durasi transisi klip {n}",
  "transition.clamped": "Dibatasi 50% klip terpendek ({seconds}s).",
  "transition.note":
    "Transisi memotong total durasi sebanyak durasi overlap. Pilih efek, lalu tekan play untuk melihat sambungannya.",
  "transition.category.motion": "Gerak",
  "transition.category.light": "Cahaya",
  "transition.category.glitch": "Glitch",
  "transition.category.wipe": "Sapuan",
  "transition.category.warp": "Distorsi",
  "transition.category.3d": "3D",

  "frame.title": "03 · Framing video",
  "frame.empty": "Tambahkan video dulu untuk mengatur framing.",
  "frame.background": "Latar",
  "frame.fill": "Isi penuh",
  "frame.blur": "Blur",
  "frame.color": "Warna",
  "frame.blurStrength": "Kekuatan blur",
  "frame.dim": "Dim latar",
  "frame.bgColor": "Warna latar",
  "frame.zoom": "Zoom",
  "frame.shiftX": "Geser X",
  "frame.shiftY": "Geser Y",
  "frame.note":
    "Mode blur dan warna menampilkan video utuh dengan latar di belakangnya. Zoom dan geser berlaku untuk video utama.",

  "audio.title": "04 · Audio",
  "audio.looped": "diulang sesuai durasi video",
  "audio.remove": "Hapus musik",
  "audio.volume": "Volume musik",
  "audio.startAt": "Mulai musik dari",
  "audio.replace": "Ganti musik",
  "audio.add": "Tambah musik",
  "audio.formats": "MP3, WAV, M4A · maks 40 MB",
  "audio.original": "Audio asli video",
  "audio.mutedDesc": "Dibisukan, hanya musik yang terdengar.",
  "audio.unmutedDesc": "Ikut diputar dan di-mix dengan musik.",
  "audio.sourceVolume": "Volume audio asli",
  "audio.noMusic": "Tanpa musik, video diexport dengan audio aslinya saja.",
  "audio.uploadFailed": "Upload musik gagal.",

  "text.title": "Teks",
  "text.sample": "Teks kamu di sini",
  "text.addLayer": "Layer",
  "text.empty": "Belum ada teks. Tambah layer pertama.",
  "text.untitled": "Tanpa teks",
  "text.duplicate": "Duplikat",
  "text.duplicateAria": "Duplikat layer",
  "text.deleteAria": "Hapus layer",
  "text.content": "Isi teks",
  "text.placeholder": "Tulis teks di sini…",
  "text.styleCopied": "Gaya tersalin. Pilih layer lain, lalu Tempel.",
  "text.styleHint": "Salin gaya (font, warna, outline, animasi) ke layer lain.",
  "text.copy": "Salin",
  "text.paste": "Tempel",
  "text.presets": "Preset gaya",
  "text.applyPreset": "Terapkan preset {name}",
  "text.font": "Font Google",
  "text.searchFont": "Cari font Google…",
  "text.noFonts": "Font tidak ditemukan.",
  "text.closeFonts": "Tutup daftar font",
  "text.size": "Ukuran",
  "text.weight": "Ketebalan",
  "text.kerning": "Kerning",
  "text.lineHeight": "Line height",
  "text.color": "Warna teks",
  "text.outlineColor": "Warna outline",
  "text.outlineWidth": "Tebal outline",
  "text.letterCase": "Huruf",
  "text.align": "Rata",
  "text.left": "Kiri",
  "text.center": "Tengah",
  "text.right": "Kanan",
  "text.showAt": "Muncul (detik)",
  "text.hideAt": "Hilang (detik)",
  "text.enter": "Animasi masuk",
  "text.noAnimation": "Tanpa animasi",
  "text.exit": "Animasi keluar",
  "text.exitNone": "Tidak",
  "text.animDuration": "Durasi animasi",
  "text.x": "Posisi X",
  "text.y": "Posisi Y",
  "text.maxWidth": "Lebar teks maksimum",
  "text.centerCanvas": "Taruh di tengah",

  "export.title": "Export MP4",
  "export.resolution": "Resolusi",
  "export.quality": "Kualitas",
  "export.fullQuality": "Kualitas penuh",
  "export.faster": "Lebih cepat & kecil",
  "export.defaultQuality": "Default",
  "export.daily": "Untuk posting harian",
  "export.high": "High",
  "export.sharper": "Detail lebih tajam",
  "export.ratioRes": "Rasio & resolusi",
  "export.duration": "Durasi",
  "export.fps": "Frame rate",
  "export.video": "Video",
  "export.text": "Teks",
  "export.estimate": "Perkiraan ukuran",
  "export.clips": "{count} klip",
  "export.layers": "{count} layer",
  "export.empty": "Tambahkan video sumber dulu untuk mulai export.",
  "export.cancel": "Batalkan",
  "export.download": "Download MP4",
  "export.again": "Export ulang",
  "export.button": "Export MP4 · {rate} Mbps",
  "export.addVideo": "Tambah video lagi",
  "export.note":
    "Render dilakukan di browser (frame + teks), encoding H.264/AAC oleh ffmpeg di mesin ini. File tersimpan sementara di folder .tmp.",
  "export.stagePreparing": "Menyiapkan font & video…",
  "export.stageFrames": "Merender frame…",
  "export.stageEncoding": "Encoding MP4 dengan ffmpeg…",
  "export.stageDone": "Selesai",
  "export.stageWorking": "Memproses…",
  "export.frame": "Frame {frame}/{total}",

  "timeline.title": "Timeline",

  "preview.ratio": "Rasio",
  "preview.empty": "Preview muncul setelah video ditambahkan",
  "preview.emptyHint": "Tambah video di panel sumber di atas",
  "preview.play": "Play",
  "preview.pause": "Pause",
  "preview.seek": "Posisi preview",
  "preview.clipCount": "{count} video · ",

  "theme.toDark": "Aktifkan mode gelap",
  "theme.toLight": "Aktifkan mode terang",
  "theme.darkTitle": "Mode gelap",
  "theme.lightTitle": "Mode terang",
};

const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { en: EN, id: ID };

type Vars = Record<string, string | number>;

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  errorText: (message: string) => string;
};

const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  t: (key, vars) => format(EN[key] ?? key, vars),
  errorText: (message) => localizeError(message, "en"),
});

function format(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fasttrack-lang");
      if (saved === "id" || saved === "en") setLangState(saved);
    } catch {
      // storage can be unavailable in private mode
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem("fasttrack-lang", next);
    } catch {
      // storage can be unavailable in private mode
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dictionary = DICTIONARIES[lang];
    return {
      lang,
      setLang,
      t: (key, vars) => format(dictionary[key] ?? EN[key] ?? key, vars),
      errorText: (message) => localizeError(message, lang),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

const EN_ERRORS: Record<string, string> = {
  "Butuh Chromium untuk mengambil video Threads. Jalankan: npm run setup:browser":
    "Chromium is required to fetch Threads videos. Run: npm run setup:browser",
  "Format video tidak didukung. Pakai MP4, MOV, WEBM, M4V, atau MKV.":
    "Unsupported video format. Use MP4, MOV, WEBM, M4V, or MKV.",
  "Format audio tidak didukung. Pakai MP3, WAV, M4A, AAC, OGG, atau FLAC.":
    "Unsupported audio format. Use MP3, WAV, M4A, AAC, OGG, or FLAC.",
  "Canvas tidak tersedia di browser ini.": "Canvas is not available in this browser.",
  "Gagal memulai export.": "Couldn't start the export.",
  "Gagal memulai encoding.": "Couldn't start encoding.",
  "Video Threads tidak ditemukan. Pastikan post publik dan berisi video, bukan hanya gambar.":
    "Threads video not found. Make sure the post is public and contains a video, not just images.",
  "File video Threads terlalu kecil atau tidak valid.":
    "The Threads video file is too small or invalid.",
  "yt-dlp belum terpasang. Jalankan: npm run setup:ytdlp":
    "yt-dlp is not installed. Run: npm run setup:ytdlp",
  "Video berhasil diunduh tetapi file tidak ditemukan.":
    "The video downloaded but the file could not be found.",
  "Tidak ada video untuk diexport.": "There are no videos to export.",
  "Maksimal 6 video per export.": "At most 6 videos per export.",
  "Salah satu video sumber tidak ditemukan, upload ulang.":
    "One of the source videos is missing. Upload it again.",
  "Durasi klip tidak valid.": "The clip duration is invalid.",
  "Durasi total terlalu pendek.": "The total duration is too short.",
  "Durasi total maksimal 180 detik.": "The total duration can be at most 180 seconds.",
  "File musik tidak ditemukan.": "The music file could not be found.",
  "Resolusi export tidak valid.": "The export resolution is invalid.",
  "Resolusi export harus genap.": "The export resolution must be even.",
  "Durasi export tidak valid.": "The export duration is invalid.",
  "Export tidak ditemukan.": "Export not found.",
  "Export sudah diproses.": "This export has already been processed.",
  "Frame kosong.": "The frame is empty.",
  "Video sumber hilang, upload ulang.": "The source video is missing. Upload it again.",
  "File media kosong.": "The media file is empty.",
  "ffmpeg tidak ditemukan di PATH.": "ffmpeg was not found on PATH.",
  "File export belum siap.": "The export file is not ready yet.",
  "File export tidak ditemukan.": "The export file could not be found.",
  "Permintaan tidak valid.": "Invalid request.",
  "URL tidak valid.": "Invalid URL.",
  "Hanya URL http/https yang didukung.": "Only http/https URLs are supported.",
  "Index frame tidak valid.": "Invalid frame index.",
  "Frame bukan JPEG yang valid.": "The frame is not a valid JPEG.",
  "File tidak ditemukan.": "File not found.",
  "Jenis file tidak valid.": "Invalid file type.",
  "Gagal menyimpan file.": "Could not save the file.",
  "Media tidak ditemukan.": "Media not found.",
  "Video tidak bisa dibaca browser.": "The browser can't read this video.",
  "Video tidak bisa dibaca.": "This video can't be read.",
  "Durasi video tidak terbaca browser.": "Couldn't read the video duration in the browser.",
  "Batas 180 detik tercapai. Trim video yang ada dulu.":
    "180-second limit reached. Trim the existing videos first.",
  "Gagal merender frame.": "Couldn't render the frame.",
  "Gagal memuat video sumber.": "Couldn't load the source video.",
  "Encoding terlalu lama. Coba durasi atau resolusi lebih kecil.":
    "Encoding took too long. Try a shorter duration or a smaller resolution.",
  "Encoding gagal.": "Encoding failed.",
  "Export gagal.": "Export failed.",
  "Upload musik gagal.": "Music upload failed.",
  "Gagal mengambil video dari link.": "Couldn't fetch the video from that link.",
  "Upload gagal.": "Upload failed.",
  "Tempel link video dulu.": "Paste a video link first.",
};

const EN_ERROR_PATTERNS: [RegExp, (match: RegExpMatchArray) => string][] = [
  [
    /^Gagal mengunduh video Threads \(HTTP (\d+)\)\.$/,
    (m) => `Couldn't download the Threads video (HTTP ${m[1]}).`,
  ],
  [
    /^Urutan frame tidak sesuai \(diharapkan (\d+)\)\.$/,
    (m) => `Frames arrived out of order (expected ${m[1]}).`,
  ],
  [
    /^Frame belum lengkap \((\d+)\/(\d+)\)\.$/,
    (m) => `Frames are incomplete (${m[1]}/${m[2]}).`,
  ],
  [
    /^ffmpeg gagal \(exit (\d+)\): (.*)$/,
    (m) => `ffmpeg failed (exit ${m[1]}): ${m[2]}`,
  ],
  [/^yt-dlp gagal: (.*)$/, (m) => `yt-dlp failed: ${m[1]}`],
  [/^Maksimal (\d+) video per project\.$/, (m) => `Up to ${m[1]} videos per project.`],
  [/^Ukuran file maksimal (\d+) MB\.$/, (m) => `The file can be at most ${m[1]} MB.`],
];

export function localizeError(message: string, lang: Lang) {
  if (lang !== "en") return message;
  const exact = EN_ERRORS[message];
  if (exact) return exact;
  for (const [pattern, map] of EN_ERROR_PATTERNS) {
    const match = message.match(pattern);
    if (match) return map(match);
  }
  return message;
}
