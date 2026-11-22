"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUpRight,
  Film,
  Layers,
  Link2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react';
import {
  COLOR_LOOKS,
  COPY,
  Locale,
  SAMPLE_CLIPS,
  TEXT_PRESETS,
  TRANSITION_CATALOG,
} from './content';

export interface LoadedMedia {
  type: 'url' | 'file';
  label: string;
  platform?: string;
  sizeMb?: string;
  objectUrl?: string;
  url?: string;
  file?: File;
}

type StudioTool = 'media' | 'text' | 'effects' | 'transitions' | 'audio';

interface HeroSectionProps {
  locale: Locale;
  onLocaleChange: (next: Locale) => void;
  loadedMedia: LoadedMedia | null;
  onMediaSelect: (media: LoadedMedia | null) => void;
  onStart: () => void;
  isAuthenticated: boolean;
}

const SUPPORTED_PLATFORMS = [
  { name: 'YouTube', match: /(youtube\.com|youtu\.be)/i },
  { name: 'TikTok', match: /tiktok\.com/i },
  { name: 'Instagram', match: /instagram\.com/i },
  { name: 'Threads', match: /threads\.(?:net|com)/i },
  { name: 'X', match: /(twitter\.com|x\.com)/i },
];

const MAX_MB = 400;
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HeroSection({
  locale,
  onLocaleChange,
  loadedMedia,
  onMediaSelect,
  onStart,
  isAuthenticated,
}: HeroSectionProps) {
  const t = COPY[locale].hero;
  const primaryCta = isAuthenticated
    ? locale === 'en'
      ? 'Open workspace'
      : 'Buka editor'
    : t.primaryCta;
  const trustItems = COPY[locale].trustStrip;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<StudioTool>('media');
  const [activeClipIdx, setActiveClipIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [proxyMode, setProxyMode] = useState<'Full' | 'Half' | 'Quarter'>('Full');
  const [textPresetIdx, setTextPresetIdx] = useState(0);
  const [lookIdx, setLookIdx] = useState(0);
  const [transitionIdx, setTransitionIdx] = useState(0);
  const [audioBalance, setAudioBalance] = useState(65);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const activeClip = SAMPLE_CLIPS[activeClipIdx];
  const activePreset = TEXT_PRESETS[textPresetIdx];
  const activeLook = COLOR_LOOKS[lookIdx];
  const activeTransition = TRANSITION_CATALOG[transitionIdx];

  useEffect(() => {
    if (!isPlaying || loadedMedia?.type === 'file') return;
    const timer = window.setInterval(() => {
      setActiveClipIdx((prev) => (prev + 1) % SAMPLE_CLIPS.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [isPlaying, loadedMedia]);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    heroRef.current.style.setProperty('--spot-x', `${x.toFixed(1)}%`);
    heroRef.current.style.setProperty('--spot-y', `${y.toFixed(1)}%`);
  };

  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError(
        locale === 'en'
          ? 'Paste a public video URL first.'
          : 'Tempel tautan video publik terlebih dahulu.'
      );
      return;
    }

    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const matched = SUPPORTED_PLATFORMS.find((p) => p.match.test(parsed.hostname));
      if (!matched) {
        setUrlError(
          locale === 'en'
            ? 'Use a public link from YouTube, TikTok, Instagram, Threads, or X.'
            : 'Gunakan tautan publik dari YouTube, TikTok, Instagram, Threads, atau X.'
        );
        return;
      }
      setUrlError(null);
      onMediaSelect({
        type: 'url',
        label: parsed.href,
        platform: matched.name,
        url: parsed.href,
      });
    } catch {
      setUrlError(
        locale === 'en'
          ? 'Enter a valid URL from YouTube, TikTok, Instagram, Threads, or X.'
          : 'Masukkan tautan valid dari YouTube, TikTok, Instagram, Threads, atau X.'
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMbNum = file.size / (1024 * 1024);
    if (sizeMbNum > MAX_MB) {
      setUrlError(
        locale === 'en'
          ? `File exceeds ${MAX_MB} MB limit (${sizeMbNum.toFixed(1)} MB selected).`
          : `Ukuran file melebihi batas ${MAX_MB} MB (${sizeMbNum.toFixed(1)} MB).`
      );
      return;
    }
    setUrlError(null);
    const objectUrl = URL.createObjectURL(file);
    onMediaSelect({
      type: 'file',
      label: file.name,
      sizeMb: `${sizeMbNum.toFixed(1)} MB`,
      objectUrl,
      file,
    });
  };

  const elapsedSec = SAMPLE_CLIPS.slice(0, activeClipIdx + 1).reduce(
    (sum, item) => sum + item.durationSec,
    0
  );
  const progressPct = Math.round((elapsedSec / 42) * 100);

  const animClass =
    activeTransition.mode === 'slide'
      ? 'animate-clip-slide'
      : activeTransition.mode === 'zoom'
        ? 'animate-clip-zoom'
        : 'animate-clip-fade';

  const tools: { id: StudioTool; labelEn: string; labelId: string; icon: typeof Film }[] = [
    { id: 'media', labelEn: 'Media', labelId: 'Media', icon: Layers },
    { id: 'text', labelEn: 'Text', labelId: 'Teks', icon: Type },
    { id: 'effects', labelEn: 'Effects', labelId: 'Efek', icon: Sparkles },
    { id: 'transitions', labelEn: 'Transitions', labelId: 'Transisi', icon: Sliders },
    { id: 'audio', labelEn: 'Audio', labelId: 'Audio', icon: Music },
  ];

  const proxyBlur =
    proxyMode === 'Quarter' ? 'blur(1px)' : proxyMode === 'Half' ? 'blur(0.35px)' : 'none';

  return (
    <>
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        style={
          {
            '--spot-x': '50%',
            '--spot-y': '28%',
          } as React.CSSProperties
        }
        className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-20"
      >
        {/* Dynamic Animated Studio Backdrop */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Precision grid masked by radial vignette + interactive cursor spotlight */}
          <div
            className="hero-grid-pattern absolute inset-0 opacity-60"
            style={{
              maskImage:
                'radial-gradient(620px circle at var(--spot-x) var(--spot-y), rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.28) 52%, transparent 88%)',
              WebkitMaskImage:
                'radial-gradient(620px circle at var(--spot-x) var(--spot-y), rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.28) 52%, transparent 88%)',
            }}
          />

          {/* Interactive soft lime cursor light */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background:
                'radial-gradient(520px circle at var(--spot-x) var(--spot-y), rgba(195,243,107,0.085), transparent 72%)',
            }}
          />

          {/* Slow-drifting key light A (top-right lime warmth) */}
          <div className="animate-studio-light-a absolute -top-44 -right-52 h-[540px] w-[720px] rounded-full bg-[radial-gradient(ellipse,rgba(195,243,107,0.09)_0%,transparent_68%)]" />

          {/* Slow-drifting fill light B (mid-left cool sage rim) */}
          <div className="animate-studio-light-b absolute top-24 -left-56 h-[460px] w-[620px] rounded-full bg-[radial-gradient(ellipse,rgba(128,164,132,0.07)_0%,transparent_70%)]" />

          {/* Subtle horizontal film-timeline light sweep */}
          <div className="animate-hero-scan absolute top-[18%] left-0 h-px w-[38%] bg-gradient-to-r from-transparent via-[#C3F36B]/30 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1160px] px-6">
          {/* Centered Hero Proposition */}
          <div className="mx-auto max-w-[850px] text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <p className="text-xs font-bold tracking-[1.6px] uppercase text-[#C3F36B]">
                {t.eyebrow}
              </p>
              <span aria-hidden="true" className="text-xs text-[#30332F]">
                |
              </span>
              <div className="inline-flex items-center rounded-lg border border-[#30332F] bg-[#181A18] p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => onLocaleChange('en')}
                  className={`rounded-md px-2 py-0.5 whitespace-nowrap transition-colors cursor-pointer ${
                    locale === 'en'
                      ? 'bg-[#C3F36B] text-[#151810]'
                      : 'text-[#A0A59B] hover:text-[#F4F5F1]'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onLocaleChange('id')}
                  className={`rounded-md px-2 py-0.5 whitespace-nowrap transition-colors cursor-pointer ${
                    locale === 'id'
                      ? 'bg-[#C3F36B] text-[#151810]'
                      : 'text-[#A0A59B] hover:text-[#F4F5F1]'
                  }`}
                >
                  ID
                </button>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.06, ease: EASE_OUT_EXPO }}
              style={{ fontSize: 'clamp(2.75rem, 6.8vw, 5.1rem)' }}
              className="font-display mx-auto mt-6 max-w-[14ch] font-semibold leading-[1.02] tracking-[-0.04em] text-[#F4F5F1] text-balance"
            >
              {t.headlineTop}{' '}
              <span className="text-[#C3F36B]">{t.headlineAccent}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.12, ease: EASE_OUT_EXPO }}
              className="mx-auto mt-6 max-w-[590px] text-base leading-relaxed text-[#A0A59B] sm:text-[17px]"
            >
              {t.subhead}
            </motion.p>

            {/* Inline Quick-Start Link & File Drop Bar */}
            <div className="mx-auto mt-8 max-w-[680px] rounded-2xl border border-[#30332F] bg-[#181A18] p-2.5">
              <form onSubmit={handleLoadUrl} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777D73]" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (urlError) setUrlError(null);
                    }}
                    placeholder={t.urlPlaceholder}
                    aria-label={t.urlPlaceholder}
                    className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] pr-3 pl-10 text-sm text-[#F4F5F1] placeholder:text-[#777D73] focus:border-[#C3F36B] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="h-11 flex-1 sm:flex-initial rounded-[10px] bg-[#202320] px-4 text-xs font-bold text-[#F4F5F1] border border-[#30332F] whitespace-nowrap transition-colors hover:border-[#555B50] hover:bg-[#2A2E2A] cursor-pointer"
                  >
                    {t.loadUrlBtn}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-m4v,.mp4,.mov,.webm,.m4v,.mkv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-11 flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-[10px] border border-[#30332F] bg-[#101110] px-3.5 text-xs font-semibold text-[#C3F36B] whitespace-nowrap transition-colors hover:border-[#C3F36B]/50 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{t.chooseFileBtn}</span>
                  </button>
                </div>
              </form>

              {urlError && (
                <p role="alert" className="mt-2 px-2 text-left text-xs font-medium text-[#FCA5A5]">
                  {urlError}
                </p>
              )}

              {loadedMedia?.platform === 'Threads' && (
                <p className="mt-2 flex items-start gap-2 rounded-[10px] border border-[#E8B84A]/25 bg-[#E8B84A]/8 px-3 py-2 text-left text-[11px] leading-relaxed text-[#E8C987]">
                  <span aria-hidden="true" className="mt-px font-bold">!</span>
                  <span>{t.threadsHint}</span>
                </p>
              )}

              {loadedMedia && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#C3F36B]/30 bg-[#C3F36B]/10 px-3 py-2 text-xs text-[#F4F5F1]">
                  <span className="truncate font-medium">
                    {loadedMedia.type === 'file'
                      ? `${loadedMedia.label} · ${loadedMedia.sizeMb}`
                      : `${loadedMedia.platform} · ${loadedMedia.label}`}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={onStart}
                      className="font-bold text-[#C3F36B] hover:underline whitespace-nowrap cursor-pointer"
                    >
                      {locale === 'en' ? 'Open in workspace' : 'Buka di editor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onMediaSelect(null);
                        setUrlInput('');
                      }}
                      className="inline-flex items-center gap-1 text-[#A0A59B] hover:text-white whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{locale === 'en' ? 'Reset' : 'Reset'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Primary & Secondary CTAs below input field area */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={isAuthenticated ? "/editor" : "/register"}
                onClick={(event) => {
                  event.preventDefault();
                  onStart();
                }}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] bg-[#C3F36B] px-6 text-sm font-bold text-[#151810] whitespace-nowrap transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#A9DF4E] cursor-pointer"
              >
                <span>{primaryCta}</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] border border-[#30332F] bg-white/3 px-6 text-sm font-bold text-[#F4F5F1] whitespace-nowrap transition-colors duration-150 hover:border-[#555B50] hover:bg-white/7"
              >
                <span>{t.secondaryCta}</span>
                <ArrowDown className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* FULL-WIDTH INTERACTIVE STUDIO EDITOR WINDOW */}
          <motion.div
            id="editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: EASE_OUT_EXPO }}
            className="mx-auto mt-14 max-w-[1000px] scroll-mt-24 rounded-[18px] border border-white/10 bg-gradient-to-br from-[#343832] via-[#181A18] to-[#181A18] p-2 shadow-[0_30px_100px_rgba(0,0,0,0.45)]"
          >
            <div className="overflow-hidden rounded-xl border border-white/6 bg-[#151715]">
              {/* Editor Topbar */}
              <div className="flex h-12 items-center justify-between gap-4 border-b border-white/6 bg-[#1C1E1B] px-4 text-[11px] text-[#8E938A]">
                <span className="font-mono uppercase tracking-wider text-[#A0A59B] whitespace-nowrap">
                  {aspectRatio} · {proxyMode}
                </span>

                <strong className="truncate font-medium text-[#E4E7DF]">
                  {loadedMedia ? loadedMedia.label : 'Untitled video card'}
                </strong>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(['Full', 'Half', 'Quarter'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setProxyMode(lvl)}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        proxyMode === lvl
                          ? 'bg-[#C3F36B] text-[#151810] font-bold'
                          : 'bg-[#252823] text-[#A0A59B] hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Column Studio Workspace */}
              <div className="grid min-h-[360px] grid-cols-1 md:grid-cols-[164px_minmax(0,1fr)] lg:grid-cols-[164px_minmax(0,1fr)_200px]">
                {/* Left Tools Sidebar */}
                <aside className="flex flex-row gap-1 overflow-x-auto border-b border-white/6 bg-[#191B19] p-2.5 md:flex-col md:border-r md:border-b-0 md:px-3 md:py-4">
                  <div className="hidden md:block mb-3 px-2 text-[9px] font-bold tracking-[1.2px] text-[#6F756B]">
                    TOOLS
                  </div>
                  {tools.map((tool) => {
                    const Icon = tool.icon;
                    const active = activeTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setActiveTool(tool.id)}
                        className={`flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#C3F36B]/10 text-[#C3F36B]'
                            : 'text-[#92978E] hover:bg-white/4 hover:text-[#F4F5F1]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{locale === 'en' ? tool.labelEn : tool.labelId}</span>
                      </button>
                    );
                  })}
                </aside>

                {/* Center Video Preview Stage */}
                <div className="studio-dot-grid flex flex-col items-center justify-center gap-3.5 p-5 sm:p-6">
                  {loadedMedia?.type === 'file' && loadedMedia.objectUrl ? (
                    <div
                      className={`relative overflow-hidden rounded-lg border border-white/12 bg-black ${
                        aspectRatio === '9:16'
                          ? 'aspect-[9/16] max-h-[290px]'
                          : 'aspect-video w-full max-w-[460px]'
                      }`}
                    >
                      <video
                        src={loadedMedia.objectUrl}
                        controls
                        playsInline
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className={`relative grid place-items-center overflow-hidden rounded-lg border border-white/12 bg-[#111512] transition-all duration-200 ${
                        aspectRatio === '9:16'
                          ? 'aspect-[9/16] h-[285px]'
                          : 'aspect-video w-full max-w-[460px]'
                      }`}
                    >
                      {!imgErrors[activeClip.id] ? (
                        <img
                          key={`${activeClip.id}-${activeTransition.name}`}
                          src={activeClip.image}
                          alt={activeClip.trackTitleEn}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setImgErrors((prev) => ({ ...prev, [activeClip.id]: true }))
                          }
                          style={{
                            filter: [activeLook.filter, proxyBlur]
                              .filter((f) => f !== 'none')
                              .join(' ') || 'none',
                          }}
                          className={`absolute inset-0 h-full w-full object-cover ${animClass}`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2B3325] to-[#111512]">
                          <Film className="h-8 w-8 text-white/40" />
                        </div>
                      )}

                      {/* Measured contrast scrim */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/80" />

                      {/* Overlaid Animated Card Headline */}
                      <div
                        className={`relative z-10 px-6 text-center leading-[1.03] text-white drop-shadow-[0_3px_15px_rgba(0,0,0,0.65)] ${
                          aspectRatio === '9:16' ? 'text-xl' : 'text-2xl sm:text-[34px]'
                        } ${activePreset.className}`}
                      >
                        <div>
                          {locale === 'en' ? activeClip.headlineTopEn : activeClip.headlineTopId}
                        </div>
                        <div className="text-[#C3F36B]">
                          {locale === 'en'
                            ? activeClip.headlineAccentEn
                            : activeClip.headlineAccentId}
                        </div>
                        <div>
                          {locale === 'en'
                            ? activeClip.headlineBottomEn
                            : activeClip.headlineBottomId}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsPlaying((prev) => !prev)}
                        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                        className="absolute bottom-3.5 left-3.5 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-xs transition-colors hover:bg-black/75 cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5 translate-x-px" />
                        )}
                      </button>

                      <span className="absolute right-3.5 bottom-4 z-10 font-mono text-[10px] tabular-nums text-white/80">
                        00:{String(elapsedSec).padStart(2, '0')} / 00:42
                      </span>
                    </div>
                  )}

                  {/* Scrubber Bar */}
                  <div className="flex w-full max-w-[460px] items-center gap-3 font-mono text-[10px] tabular-nums text-[#858B80]">
                    <span>00:{String(elapsedSec).padStart(2, '0')}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#383D35]">
                      <div
                        className="h-full rounded-full bg-[#C3F36B] transition-all duration-200"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span>00:42</span>
                  </div>
                </div>

                {/* Right Dynamic Properties Inspector */}
                <aside className="hidden border-l border-white/6 bg-[#191B19] p-4 lg:block">
                  <div className="mb-3 text-[9px] font-bold tracking-[1.2px] text-[#6F756B]">
                    PROPERTIES · {activeTool.toUpperCase()}
                  </div>

                  {activeTool === 'media' && (
                    <div className="space-y-3">
                      <div className="border-b border-white/6 pb-3">
                        <div className="flex justify-between text-[10px] text-[#858B80]">
                          <span>Frame Ratio</span>
                          <span className="font-mono text-[#F4F5F1]">{aspectRatio}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          {(['16:9', '9:16'] as const).map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setAspectRatio(ratio)}
                              className={`rounded-[5px] py-1.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                                aspectRatio === ratio
                                  ? 'bg-[#C3F36B] text-[#151810]'
                                  : 'bg-[#252823] text-[#BFC5B8] hover:text-white'
                              }`}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="border-b border-white/6 pb-3">
                        <div className="flex justify-between text-[10px] text-[#858B80]">
                          <span>Clip Limit</span>
                          <span className="font-mono tabular-nums text-[#F4F5F1]">6 · 180s</span>
                        </div>
                        <div className="mt-2 rounded-[5px] bg-[#252823] px-2.5 py-1.5 font-mono text-[10px] text-[#BFC5B8]">
                          Proxy: {proxyMode}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-[#858B80]">
                          <span>Export Target</span>
                          <span className="font-mono text-[#C3F36B]">MP4</span>
                        </div>
                        <div className="mt-2 rounded-[5px] bg-[#252823] px-2.5 py-1.5 font-mono text-[10px] text-[#BFC5B8]">
                          720p / 1080p
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTool === 'text' && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-[#858B80]">Google Fonts Preset</p>
                      {TEXT_PRESETS.map((preset, idx) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setTextPresetIdx(idx)}
                          className={`block w-full rounded-[6px] px-2.5 py-2 text-left text-[11px] font-medium transition-colors cursor-pointer ${
                            textPresetIdx === idx
                              ? 'bg-[#C3F36B] text-[#151810] font-bold'
                              : 'bg-[#252823] text-[#BFC5B8] hover:text-white'
                          }`}
                        >
                          {locale === 'en' ? preset.labelEn : preset.labelId}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTool === 'effects' && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-[#858B80]">Color Grade</p>
                      {COLOR_LOOKS.map((look, idx) => (
                        <button
                          key={look.id}
                          type="button"
                          onClick={() => setLookIdx(idx)}
                          className={`block w-full rounded-[6px] px-2.5 py-2 text-left text-[11px] font-medium transition-colors cursor-pointer ${
                            lookIdx === idx
                              ? 'bg-[#C3F36B] text-[#151810] font-bold'
                              : 'bg-[#252823] text-[#BFC5B8] hover:text-white'
                          }`}
                        >
                          {locale === 'en' ? look.labelEn : look.labelId}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTool === 'transitions' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-[#858B80]">
                        <span>25 Effects</span>
                        <span className="font-mono tabular-nums text-[#C3F36B]">
                          {String(transitionIdx + 1).padStart(2, '0')}/25
                        </span>
                      </div>
                      <div className="max-h-[215px] space-y-1 overflow-y-auto pr-1">
                        {TRANSITION_CATALOG.map((tr, idx) => (
                          <button
                            key={tr.name}
                            type="button"
                            onClick={() => {
                              setTransitionIdx(idx);
                              setActiveClipIdx((prev) => (prev + 1) % SAMPLE_CLIPS.length);
                              setIsPlaying(false);
                            }}
                            className={`block w-full truncate rounded-[5px] px-2.5 py-1.5 text-left text-[10px] font-medium transition-colors cursor-pointer ${
                              transitionIdx === idx
                                ? 'bg-[#C3F36B] text-[#151810] font-bold'
                                : 'bg-[#252823] text-[#BFC5B8] hover:text-white'
                            }`}
                          >
                            {tr.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTool === 'audio' && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] text-[#858B80]">
                        <span>Original Audio</span>
                        <span className="font-mono tabular-nums text-[#F4F5F1]">
                          {audioBalance}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={audioBalance}
                        onChange={(e) => setAudioBalance(Number(e.target.value))}
                        aria-label="Audio balance"
                        className="h-1.5 w-full cursor-pointer accent-[#C3F36B]"
                      />
                      <div className="flex justify-between text-[10px] text-[#858B80]">
                        <span>Background Music</span>
                        <span className="font-mono tabular-nums text-[#C3F36B]">
                          {100 - audioBalance}%
                        </span>
                      </div>
                    </div>
                  )}
                </aside>
              </div>

              {/* Multi-track Interactive Timeline */}
              <div className="border-t border-white/6 bg-[#1B1D1A] px-4 pt-3.5 pb-4">
                <div className="mb-2.5 flex items-center justify-between font-mono text-[9px] text-[#747A70]">
                  <span>TIMELINE · MAX 6 CLIPS / 180S</span>
                  <span className="tabular-nums">00:00 ────────── 00:42</span>
                </div>

                <div className="mb-1.5 grid h-9 grid-cols-4 gap-1.5">
                  {SAMPLE_CLIPS.map((clip, idx) => {
                    const selected = idx === activeClipIdx;
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => {
                          setActiveClipIdx(idx);
                          setIsPlaying(false);
                        }}
                        className={`flex items-center justify-between truncate rounded border px-2.5 text-left text-[10px] font-medium transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#C3F36B] bg-[#364228] text-[#F4F5F1]'
                            : 'border-[#4D5645] bg-[#2D3428] text-[#D0D7C8] hover:border-[#7B8A6B]'
                        }`}
                      >
                        <span className="truncate">
                          {locale === 'en' ? clip.trackTitleEn : clip.trackTitleId}
                        </span>
                        <span className="ml-2 hidden font-mono text-[9px] tabular-nums opacity-75 sm:inline">
                          {clip.durationSec}s
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex h-5 items-center rounded border border-[#514A70] bg-[#37334B] px-2.5 text-[9px] font-medium text-[#D8D4EB]">
                  Original mix ({audioBalance}%) · Background music ({100 - audioBalance}%)
                </div>
              </div>
            </div>
          </motion.div>

          <p className="mt-5 text-center text-xs text-[#767C72]">{t.stageCaption}</p>
        </div>
      </section>

      {/* TRUST STRIP (RUNNING MARQUEE) */}
      <div className="mx-auto max-w-[1160px] px-6">
        <div
          className="marquee-wrap relative overflow-hidden border-y border-white/8 py-5"
          style={{
            maskImage:
              'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}
        >
          <div className="animate-marquee flex w-max items-center">
            {[0, 1].map((dupIndex) => (
              <div
                key={dupIndex}
                aria-hidden={dupIndex === 1}
                className="flex shrink-0 items-center gap-10 pr-10 text-xs font-bold uppercase tracking-[0.12em]"
              >
                {trustItems.map((item) => (
                  <span
                    key={`${dupIndex}-${item.label}`}
                    className={`inline-flex items-center gap-2.5 whitespace-nowrap ${
                      item.bold ? 'text-[#C3F36B]' : 'text-[#D9DDD4]'
                    }`}
                  >
                    {!item.bold && (
                      <span aria-hidden="true" className="text-[#C3F36B]">
                        ✓
                      </span>
                    )}
                    <span>{item.label}</span>
                    <span aria-hidden="true" className="ml-5 text-[#30332F]">
                      /
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
