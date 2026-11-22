export type Locale = 'en' | 'id';

export type TransitionMode = 'fade' | 'slide' | 'zoom';

export interface SampleClip {
  id: string;
  label: string;
  trackTitleEn: string;
  trackTitleId: string;
  timecode: string;
  durationSec: number;
  image: string;
  headlineTopEn: string;
  headlineAccentEn: string;
  headlineBottomEn: string;
  headlineTopId: string;
  headlineAccentId: string;
  headlineBottomId: string;
  transitionMode: TransitionMode;
  transitionName: string;
}

export const SAMPLE_CLIPS: SampleClip[] = [
  {
    id: 'clip-01',
    label: '01',
    trackTitleEn: 'Intro · Overpass',
    trackTitleId: 'Intro · Jalan Layang',
    timecode: '00:00 – 00:10',
    durationSec: 10,
    image: '/landing/hero_video_frame_1795330081443.jpg',
    headlineTopEn: 'Create',
    headlineAccentEn: 'something',
    headlineBottomEn: 'remarkable.',
    headlineTopId: 'Buat karya',
    headlineAccentId: 'yang lebih',
    headlineBottomId: 'berkesan.',
    transitionMode: 'fade',
    transitionName: 'Cross Dissolve',
  },
  {
    id: 'clip-02',
    label: '02',
    trackTitleEn: 'Main clip · Pour over',
    trackTitleId: 'Klip utama · Seduh kopi',
    timecode: '00:10 – 00:22',
    durationSec: 12,
    image: '/landing/clip_thumb_cafe_1795330079102.jpg',
    headlineTopEn: 'Morning',
    headlineAccentEn: 'craft in',
    headlineBottomEn: 'every frame.',
    headlineTopId: 'Ritme pagi',
    headlineAccentId: 'di setiap',
    headlineBottomId: 'bingkai.',
    transitionMode: 'slide',
    transitionName: 'Whip Pan Left',
  },
  {
    id: 'clip-03',
    label: '03',
    trackTitleEn: 'Cutaway · Studio',
    trackTitleId: 'Cutaway · Studio',
    timecode: '00:22 – 00:32',
    durationSec: 10,
    image: '/landing/clip_thumb_studio_1795330078351.jpg',
    headlineTopEn: 'Dialed',
    headlineAccentEn: 'sound &',
    headlineBottomEn: 'rhythm.',
    headlineTopId: 'Padukan',
    headlineAccentId: 'suara &',
    headlineBottomId: 'musik.',
    transitionMode: 'zoom',
    transitionName: 'Zoom Punch',
  },
  {
    id: 'clip-04',
    label: '04',
    trackTitleEn: 'Outro · Blue hour',
    trackTitleId: 'Outro · Senja kota',
    timecode: '00:32 – 00:42',
    durationSec: 10,
    image: '/landing/clip_thumb_city_1795330078575.jpg',
    headlineTopEn: 'Export',
    headlineAccentEn: '1080p',
    headlineBottomEn: 'ready to post.',
    headlineTopId: 'Ekspor',
    headlineAccentId: '1080p',
    headlineBottomId: 'siap tayang.',
    transitionMode: 'fade',
    transitionName: 'Film Burn',
  },
];

export const TRANSITION_CATALOG: { name: string; mode: TransitionMode }[] = [
  { name: 'Cross Dissolve', mode: 'fade' },
  { name: 'Whip Pan Left', mode: 'slide' },
  { name: 'Whip Pan Right', mode: 'slide' },
  { name: 'Zoom Punch', mode: 'zoom' },
  { name: 'Luma Fade', mode: 'fade' },
  { name: 'Film Burn', mode: 'fade' },
  { name: 'Slide Up', mode: 'slide' },
  { name: 'Slide Down', mode: 'slide' },
  { name: 'Zoom Out Snap', mode: 'zoom' },
  { name: 'Shutter Cut', mode: 'fade' },
  { name: 'Glitch Split', mode: 'slide' },
  { name: 'Dip to Black', mode: 'fade' },
  { name: 'Dip to White', mode: 'fade' },
  { name: 'Push Left', mode: 'slide' },
  { name: 'Push Right', mode: 'slide' },
  { name: 'Iris Circle', mode: 'zoom' },
  { name: 'Box Wipe', mode: 'slide' },
  { name: 'Clock Wipe', mode: 'fade' },
  { name: 'Smooth Morph', mode: 'fade' },
  { name: 'Blur Dissolve', mode: 'fade' },
  { name: 'Flash Frame', mode: 'zoom' },
  { name: 'Spin Cut', mode: 'zoom' },
  { name: 'Diagonal Wipe', mode: 'slide' },
  { name: 'Edge Pull', mode: 'slide' },
  { name: 'Hard Cut', mode: 'fade' },
];

export const TEXT_PRESETS = [
  { id: 'display', labelEn: 'Bricolage Bold', labelId: 'Bricolage Tebal', className: 'font-display font-bold uppercase tracking-tight' },
  { id: 'editorial', labelEn: 'Editorial Serif', labelId: 'Serif Editorial', className: 'font-serif italic font-semibold tracking-normal' },
  { id: 'mono', labelEn: 'Mono Title', labelId: 'Judul Mono', className: 'font-mono font-medium uppercase tracking-wider text-lg sm:text-2xl' },
] as const;

export const COLOR_LOOKS = [
  { id: 'natural', labelEn: 'Natural 1080p', labelId: 'Natural 1080p', filter: 'none' },
  { id: 'cinema', labelEn: 'Cinema Contrast', labelId: 'Kontras Sinema', filter: 'contrast(1.12) saturate(1.08)' },
  { id: 'muted', labelEn: 'Editorial Matte', labelId: 'Matte Editorial', filter: 'contrast(0.95) saturate(0.82) brightness(0.96)' },
] as const;

export const COPY = {
  en: {
    nav: {
      features: 'Features',
      howItWorks: 'How it works',
      pricing: 'Pricing',
      faq: 'FAQ',
      cta: 'Start editing',
    },
    hero: {
      eyebrow: 'A better way to edit',
      headlineTop: 'Make every clip',
      headlineAccent: 'worth watching.',
      subhead:
        'Turn raw clips or social links from YouTube, TikTok, Instagram, Threads, and X into polished video cards. Edit, animate, and export MP4 in one browser tab.',
      urlPlaceholder: 'Paste YouTube, TikTok, Instagram, Threads, or X link…',
      loadUrlBtn: 'Load link',
      chooseFileBtn: 'Choose file (max 400 MB)',
      primaryCta: 'Start editing for free',
      secondaryCta: 'See how it works',
      stageCaption: 'Interactive workspace preview — click tools, timeline clips, or load your own video.',
      threadsHint:
        'Threads: paste a post that contains a video. Text-only and image posts cannot be imported.',
    },
    trustStrip: [
      { label: 'Made for creators', bold: true },
      { label: '6 clips · 180s timeline', bold: false },
      { label: '25 built-in transitions', bold: false },
      { label: 'MP4, MOV, WEBM up to 400 MB', bold: false },
    ],
    features: {
      eyebrow: 'Everything you need',
      headlineTop: 'Less time editing.',
      headlineBottom: 'More time creating.',
      subhead:
        'Every control sits next to the frame it changes. Focus on your story and let fasttrack render clean MP4 exports.',
      items: [
        {
          id: 'timeline',
          title: '6-clip timeline',
          body: 'Combine up to six clips within 180 seconds. Trim frames, reorder cuts, and keep your sequence tight.',
        },
        {
          id: 'text',
          title: 'Animated Google Fonts',
          body: 'Give your card crisp titles and captions with kinetic motion locked to safe social margins.',
        },
        {
          id: 'transitions',
          title: '25 smooth transitions',
          body: 'Connect clips with dissolves, whip pans, film burns, and directional wipes previewed in real time.',
        },
        {
          id: 'audio',
          title: 'Original mix + music',
          body: 'Blend your clip audio with background music so voice clarity and soundtrack sit together cleanly.',
        },
        {
          id: 'proxy',
          title: 'Full, Half, or Quarter proxy',
          body: 'Switch preview resolution when timelines get heavy. The proxy is cached; export always uses the original.',
        },
        {
          id: 'export',
          title: 'Direct MP4 export',
          body: 'Export 720p at 2 Mbps on Free or crisp 1080p at 7 or 12 Mbps on Lifetime. Nothing is auto-posted.',
        },
      ],
    },
    workflow: {
      eyebrow: 'Your creative workflow',
      headlineTop: 'From link or footage',
      headlineBottom: 'to ready-to-post.',
      subhead: 'Three simple steps. One browser workspace.',
      steps: [
        {
          num: '01. Import',
          title: 'Bring your clips',
          body: 'Paste a public link from YouTube, TikTok, Instagram, Threads, or X, or pick a local MP4, MOV, WEBM, M4V, or MKV up to 400 MB.',
        },
        {
          num: '02. Create',
          title: 'Build the card',
          body: 'Arrange up to six clips inside 180 seconds, add animated text, pick from 25 transitions, and balance music with original audio.',
        },
        {
          num: '03. Export',
          title: 'Download MP4',
          body: 'Preview exactly what comes out, then render 720p on Free or clean 1080p without watermarks on Lifetime.',
        },
      ],
    },
    pricing: {
      eyebrow: 'Simple pricing',
      headlineTop: 'Start free.',
      headlineBottom: 'Upgrade once.',
      subhead: 'The free plan is enough to post. Lifetime removes the watermark and the ad unlock.',
      waNote: 'Activated manually on WhatsApp after payment.',
      free: {
        name: 'Free',
        price: 'Rp0',
        cycle: 'forever',
        desc: 'Everything you need to cut and post your first card.',
        cta: 'Start for free',
        features: [
          '720p MP4 export at 2 Mbps',
          'Full 6-clip, 180s timeline access',
          '25 transitions & Google Fonts text',
          'Small watermark + ad unlock before export',
        ],
      },
      lifetime: {
        name: 'Lifetime',
        cycleNote: 'One-time upgrade',
        price: 'Rp 49.000',
        cycle: 'once',
        desc: 'Clean 1080p exports without watermarks or ad unlocks.',
        cta: 'See upgrade steps',
        features: [
          '1080p MP4 export at 7 or 12 Mbps',
          'No watermark on exported cards',
          'No ad unlock before export, ever',
          'Manual WhatsApp activation after payment',
        ],
      },
    },
    faq: {
      eyebrow: 'Before you start',
      headline: 'Good to know.',
      subhead: 'Short answers to the things people ask before their first export.',
      items: [
        {
          q: 'Do I need to install anything?',
          a: 'No. fasttrack runs directly in the browser. Paste a link or upload a file, edit, and export MP4 from the same tab.',
        },
        {
          q: 'What files and links can I use?',
          a: 'You can paste public links from YouTube, TikTok, Instagram, Threads, or X, or upload MP4, MOV, WEBM, M4V, or MKV up to 400 MB per video. One project holds six clips and 180 seconds total.',
        },
        {
          q: 'What is different about lifetime?',
          a: 'Free exports are 720p at 2 Mbps with a small watermark and an ad unlock before each export. Lifetime unlocks clean 1080p at 7 or 12 Mbps with zero watermark and no ad unlock.',
        },
        {
          q: 'Where are my files stored?',
          a: 'Uploads are stored on our server and backed up to private cloud storage while you work. Exports stay temporary, and nothing is ever posted automatically.',
        },
      ],
    },
    finalCta: {
      eyebrow: 'Your next video starts here',
      headline: 'Got a clip? Make something great.',
      subhead: 'Open fasttrack, paste a link or drop a file, and turn raw footage into a card worth sharing.',
      cta: 'Start editing for free',
    },
    footer: {
      notice: 'Use public content and respect creators.',
      helpGuide: 'Help guide',
      madeBy: 'Made by zal',
    },
  },
  id: {
    nav: {
      features: 'Fitur',
      howItWorks: 'Cara kerja',
      pricing: 'Harga',
      faq: 'FAQ',
      cta: 'Mulai edit',
    },
    hero: {
      eyebrow: 'Cara edit yang lebih ringkas',
      headlineTop: 'Buat setiap klip',
      headlineAccent: 'layak ditonton.',
      subhead:
        'Ubah klip mentah atau tautan YouTube, TikTok, Instagram, Threads, dan X menjadi video card siap tayang. Edit, animasikan, dan ekspor MP4 dalam satu tab browser.',
      urlPlaceholder: 'Tempel tautan YouTube, TikTok, Instagram, Threads, atau X…',
      loadUrlBtn: 'Muat tautan',
      chooseFileBtn: 'Pilih file (maks. 400 MB)',
      primaryCta: 'Mulai edit gratis',
      secondaryCta: 'Lihat cara kerja',
      stageCaption: 'Pratinjau ruang kerja interaktif — klik alat, klip timeline, atau muat videomu sendiri.',
      threadsHint:
        'Threads: tempel post yang berisi video. Post teks atau gambar belum bisa diimpor.',
    },
    trustStrip: [
      { label: 'Dibuat untuk kreator', bold: true },
      { label: 'Timeline 6 klip · 180 detik', bold: false },
      { label: '25 efek transisi bawaan', bold: false },
      { label: 'MP4, MOV, WEBM hingga 400 MB', bold: false },
    ],
    features: {
      eyebrow: 'Semua yang kamu butuhkan',
      headlineTop: 'Lebih cepat mengedit.',
      headlineBottom: 'Lebih banyak berkarya.',
      subhead:
        'Setiap kontrol berada tepat di sebelah bingkai yang diubahnya. Fokus pada ceritamu dan biarkan fasttrack merender MP4 dengan bersih.',
      items: [
        {
          id: 'timeline',
          title: 'Timeline 6 klip',
          body: 'Gabung hingga enam klip dalam durasi 180 detik. Potong bingkai, susun urutan, dan jaga alur tetap padat.',
        },
        {
          id: 'text',
          title: 'Teks animasi Google Fonts',
          body: 'Tambahkan judul dan takarir tajam dengan animasi gerak yang aman dari batas layar media sosial.',
        },
        {
          id: 'transitions',
          title: '25 transisi halus',
          body: 'Sambungkan klip dengan dissolve, whip pan, film burn, dan wipe yang dipratinjau secara real-time.',
        },
        {
          id: 'audio',
          title: 'Audio asli + musik latar',
          body: 'Padukan suara asli klip dengan musik latar agar vokal dan irama tetap seimbang.',
        },
        {
          id: 'proxy',
          title: 'Proxy Full, Half, atau Quarter',
          body: 'Ganti resolusi pratinjau saat timeline mulai berat. Proxy di-cache; ekspor selalu memakai file asli.',
        },
        {
          id: 'export',
          title: 'Ekspor MP4 langsung',
          body: 'Ekspor 720p (2 Mbps) di paket Gratis atau 1080p bersih (7 / 12 Mbps) di Lifetime. Tidak pernah auto-post.',
        },
      ],
    },
    workflow: {
      eyebrow: 'Alur kerja kreatifmu',
      headlineTop: 'Dari tautan atau klip',
      headlineBottom: 'ke video siap tayang.',
      subhead: 'Tiga langkah ringkas. Satu ruang kerja di browser.',
      steps: [
        {
          num: '01. Impor',
          title: 'Masukkan klip',
          body: 'Tempel tautan publik YouTube, TikTok, Instagram, Threads, atau X, atau pilih file MP4, MOV, WEBM, M4V, atau MKV hingga 400 MB.',
        },
        {
          num: '02. Susun',
          title: 'Bentuk kartu video',
          body: 'Atur hingga enam klip dalam 180 detik, tambahkan teks animasi, pilih dari 25 transisi, dan seimbangkan musik dengan audio asli.',
        },
        {
          num: '03. Ekspor',
          title: 'Unduh MP4',
          body: 'Pratinjau persis seperti hasil akhir, lalu render 720p di paket Gratis atau 1080p tanpa watermark di Lifetime.',
        },
      ],
    },
    pricing: {
      eyebrow: 'Harga transparan',
      headlineTop: 'Mulai gratis.',
      headlineBottom: 'Upgrade sekali.',
      subhead: 'Paket gratis sudah cukup untuk posting. Lifetime menghapus watermark dan iklan sebelum ekspor.',
      waNote: 'Diaktifkan manual lewat WhatsApp setelah pembayaran.',
      free: {
        name: 'Gratis',
        price: 'Rp0',
        cycle: 'selamanya',
        desc: 'Semua yang kamu butuhkan untuk memotong dan memposting kartu pertamamu.',
        cta: 'Mulai gratis',
        features: [
          'Ekspor MP4 720p di 2 Mbps',
          'Akses penuh timeline 6 klip & 180 detik',
          '25 transisi & teks Google Fonts',
          'Watermark kecil + buka iklan sebelum ekspor',
        ],
      },
      lifetime: {
        name: 'Lifetime',
        cycleNote: 'Upgrade sekali bayar',
        price: 'Rp 49.000',
        cycle: 'sekali',
        desc: 'Ekspor 1080p bersih tanpa watermark dan tanpa iklan.',
        cta: 'Lihat cara upgrade',
        features: [
          'Ekspor MP4 1080p di 7 atau 12 Mbps',
          'Tanpa watermark di video hasil ekspor',
          'Tanpa iklan sebelum ekspor, selamanya',
          'Aktivasi manual via WhatsApp setelah bayar',
        ],
      },
    },
    faq: {
      eyebrow: 'Sebelum mulai',
      headline: 'Hal yang perlu diketahui.',
      subhead: 'Jawaban singkat untuk hal yang paling sering ditanyakan sebelum ekspor pertama.',
      items: [
        {
          q: 'Apakah saya harus instal aplikasi?',
          a: 'Tidak. fasttrack berjalan langsung di browser. Tempel tautan atau unggah file, edit, dan ekspor MP4 dari tab yang sama.',
        },
        {
          q: 'File dan tautan apa saja yang didukung?',
          a: 'Kamu bisa menempel tautan publik dari YouTube, TikTok, Instagram, Threads, atau X, atau mengunggah MP4, MOV, WEBM, M4V, atau MKV hingga 400 MB per video. Satu proyek menampung enam klip dan total 180 detik.',
        },
        {
          q: 'Apa bedanya paket Lifetime?',
          a: 'Ekspor gratis beresolusi 720p (2 Mbps) dengan watermark kecil dan iklan sebelum tiap ekspor. Lifetime membuka ekspor 1080p bersih (7 atau 12 Mbps) tanpa watermark dan tanpa iklan.',
        },
        {
          q: 'Di mana file saya disimpan?',
          a: 'Unggahan disimpan di server dan dicadangkan ke cloud storage privat selama kamu bekerja. Hasil ekspor bersifat sementara, dan tidak ada yang diposting otomatis.',
        },
      ],
    },
    finalCta: {
      eyebrow: 'Video berikutnya dimulai di sini',
      headline: 'Punya klip? Buat sesuatu yang keren.',
      subhead: 'Buka fasttrack, tempel tautan atau pilih file, dan ubah rekaman mentah jadi video card siap bagikan.',
      cta: 'Mulai edit gratis',
    },
    footer: {
      notice: 'Gunakan konten publik dan hormati kreator.',
      helpGuide: 'Panduan bantuan',
      madeBy: 'Dibuat oleh zal',
    },
  },
} as const;
