"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PreviewStage, { type PreviewHandle } from "./PreviewStage";
import SourceCard from "./SourceCard";
import AudioPanel from "./AudioPanel";
import ClipTrimPanel from "./ClipTrimPanel";
import TransitionPanel from "./TransitionPanel";
import VideoFramePanel from "./VideoFramePanel";
import TextPanel from "./TextPanel";
import ExportPanel, { type ExportUIState } from "./ExportPanel";
import { clamp, formatTime, uid } from "@/lib/format";
import { ensureFont } from "@/lib/fonts";
import { probeVideo } from "@/lib/media";
import { exportVideo } from "@/lib/export-client";
import {
  buildTimeline,
  DEFAULT_TRANSITION,
  DEFAULT_VIDEO_FRAME,
  MAX_CLIPS,
  MAX_DURATION,
  outputSize,
  timelineDuration,
  type AspectRatio,
  type Clip,
  type ClipTransition,
  type EditorStep,
  type MediaAsset,
  type PreviewQuality,
  type PublicUser,
  type SavedProject,
  type TextAnimation,
  type TextLayer,
  type VideoFrame,
} from "@/lib/types";
import {
  DownloadIcon,
  GithubIcon,
  HelpIcon,
  InstagramIcon,
  MenuIcon,
  SaveIcon,
  TypeIcon,
  XIcon,
} from "./icons";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import AccountMenu from "./AccountMenu";
import VerifyEmailBanner from "./VerifyEmailBanner";
import OnboardingTutorial from "./OnboardingTutorial";
import { Wordmark } from "./Logo";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { isLoopEffect } from "@/lib/text-animations";

const initialState: ExportUIState = {
  running: false,
  stage: "idle",
  frame: 0,
  totalFrames: 0,
  encode: 0,
  error: null,
  downloadUrl: null,
  fileName: null,
  startedAt: null,
};

type Step = EditorStep;

const STEPS: {
  id: "source" | Step;
  label: MessageKey;
  shortLabel: MessageKey;
  num: string;
}[] = [
  {
    id: "source",
    label: "editor.stepSource",
    shortLabel: "editor.stepSourceShort",
    num: "01",
  },
  {
    id: "trim",
    label: "editor.stepTrim",
    shortLabel: "editor.stepTrimShort",
    num: "02",
  },
  {
    id: "text",
    label: "editor.stepText",
    shortLabel: "editor.stepTextShort",
    num: "03",
  },
  {
    id: "export",
    label: "editor.stepExport",
    shortLabel: "editor.stepExportShort",
    num: "04",
  },
];

function makeLayer(start: number, end: number, text: string): TextLayer {
  return {
    id: uid("layer"),
    text,
    fontFamily: "Inter",
    fontSize: 92,
    fontWeight: 700,
    letterSpacing: 0,
    lineHeight: 1.15,
    color: "#ffffff",
    outlineWidth: 0,
    outlineColor: "#000000",
    transform: "none",
    align: "center",
    x: 0.5,
    y: 0.5,
    maxWidth: 0.86,
    start,
    end,
    enter: "fade",
    exit: "none",
    animDuration: 0.45,
    loopSpeed: 1,
  };
}

type Props = {
  user: PublicUser;
  /** First video handed over by the entry screen. */
  bootAsset?: MediaAsset | null;
  /** Project restored from the user's saved slot. */
  initialProject?: SavedProject | null;
  /** Error from the queued source that was handed over before the editor opened. */
  initialError?: string | null;
  shopeeUrl?: string;
};

export default function Editor({
  user,
  bootAsset,
  initialProject,
  initialError,
  shopeeUrl = "",
}: Props) {
  const { t, errorText } = useI18n();
  const isPaid = user.plan === "lifetime";
  const saved = initialProject ?? null;
  const [clips, setClips] = useState<Clip[]>(() => saved?.clips ?? []);
  const [music, setMusic] = useState<MediaAsset | null>(() => saved?.music ?? null);
  const [videoFrame, setVideoFrame] = useState<VideoFrame>(
    () => saved?.videoFrame ?? DEFAULT_VIDEO_FRAME,
  );
  const [ratio, setRatio] = useState<AspectRatio>(() => saved?.ratio ?? "9:16");
  const [layers, setLayers] = useState<TextLayer[]>(() => saved?.layers ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => saved?.selectedId ?? null,
  );
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(() => saved?.time ?? 0);
  const [resolution, setResolution] = useState<360 | 720 | 1080>(() =>
    isPaid ? (saved?.resolution ?? 1080) : 720,
  );
  const [previewQuality, setPreviewQuality] = useState<PreviewQuality>(
    () => saved?.previewQuality ?? "full",
  );
  const [quality, setQuality] = useState<"standard" | "high">(
    () => saved?.quality ?? "standard",
  );
  const [step, setStep] = useState<Step>(() => saved?.step ?? "trim");
  const [sourceVolume, setSourceVolume] = useState(() => saved?.sourceVolume ?? 1);
  const [muted, setMuted] = useState(() => saved?.muted ?? false);
  const [musicVolume, setMusicVolume] = useState(() => saved?.musicVolume ?? 0.7);
  const [musicOffset, setMusicOffset] = useState(() => saved?.musicOffset ?? 0);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [exportState, setExportState] = useState<ExportUIState>(initialState);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [shopeeUnlock, setShopeeUnlock] = useState<"locked" | "checking" | "ready">(
    isPaid ? "ready" : "locked",
  );
  const [shopeeCountdown, setShopeeCountdown] = useState(5);
  const saveNoticeTimer = useRef<number | null>(null);
  const shopeeTimer = useRef<number | null>(null);

  const previewRef = useRef<PreviewHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewStopRef = useRef<number | null>(null);
  const transitionTypesRef = useRef<Map<string, string> | null>(null);
  const timeRef = useRef(0);
  timeRef.current = time;

  const timeline = useMemo(() => buildTimeline(clips), [clips]);
  const totalDuration = useMemo(() => timelineDuration(timeline), [timeline]);
  const exportSize = outputSize(ratio, resolution);
  const bitrateMbps = isPaid ? (quality === "high" ? 12 : 7) : 2;

  useEffect(() => {
    if (!isPaid && resolution !== 720) setResolution(720);
    else if (isPaid && resolution === 360) setResolution(720);
  }, [isPaid, resolution]);

  useEffect(
    () => () => {
      if (shopeeTimer.current !== null) {
        window.clearInterval(shopeeTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    void ensureFont("Inter", 400);
    void ensureFont("Inter", 500);
    void ensureFont("Inter", 600);
  }, []);

  useEffect(() => {
    for (const layer of layers) {
      void ensureFont(layer.fontFamily, 400);
      void ensureFont(layer.fontFamily, layer.fontWeight);
    }
  }, [layers]);

  // Keep text timing inside the timeline whenever clips change.
  useEffect(() => {
    setTime((prev) => clamp(prev, 0, Math.max(0, totalDuration - 0.05)));
    setLayers((prev) =>
      prev.map((layer) => {
        const start = clamp(layer.start, 0, Math.max(0, totalDuration - 0.1));
        const end = clamp(layer.end, start + 0.1, Math.max(start + 0.1, totalDuration));
        return start === layer.start && end === layer.end ? layer : { ...layer, start, end };
      }),
    );
  }, [totalDuration]);

  const handleAddSource = useCallback(
    async (asset: MediaAsset) => {
      if (clips.length >= MAX_CLIPS) {
        setError(t("editor.projectMax", { count: MAX_CLIPS }));
        return;
      }
      setSourceBusy(true);
      setError(null);
      try {
        const meta = await probeVideo(asset.url);
        const duration = Number.isFinite(meta.duration) ? meta.duration : 0;
        if (!duration) throw new Error(t("editor.durationUnreadable"));

        const full: MediaAsset = {
          ...asset,
          duration,
          width: meta.width,
          height: meta.height,
        };
        const currentTotal = clips.reduce(
          (sum, clip) => sum + Math.max(0, clip.trimEnd - clip.trimStart),
          0,
        );
        const room = MAX_DURATION - currentTotal;
        if (room < 0.5) {
          throw new Error(t("editor.tooLong"));
        }

        const clip: Clip = {
          key: uid("clip"),
          asset: full,
          trimStart: 0,
          trimEnd: Math.max(0.5, Math.min(duration, 15, room)),
          transition: { ...DEFAULT_TRANSITION },
        };
        setClips((prev) => [...prev, clip]);
        setExportState(initialState);

        if (clips.length === 0) {
          const firstLayer = makeLayer(0, Math.min(5, clip.trimEnd), t("text.sample"));
          setStep("trim");
          setPlaying(false);
          setTime(0);
          setLayers((prev) => (prev.length ? prev : [firstLayer]));
          setSelectedId((prev) => prev ?? firstLayer.id);
          requestAnimationFrame(() => previewRef.current?.seek(0));
        } else {
          requestAnimationFrame(() => previewRef.current?.seek(timeRef.current));
        }
      } catch (err) {
        setError(err instanceof Error ? errorText(err.message) : t("common.videoUnreadable"));
      } finally {
        setSourceBusy(false);
      }
    },
    [clips, errorText, t],
  );

  const bootRef = useRef<MediaAsset | null>(null);
  useEffect(() => {
    if (!bootAsset || bootRef.current === bootAsset) return;
    bootRef.current = bootAsset;
    void handleAddSource(bootAsset);
  }, [bootAsset, handleAddSource]);

  const removeClip = useCallback((key: string) => {
    setClips((prev) => prev.filter((clip) => clip.key !== key));
    setExportState(initialState);
    requestAnimationFrame(() => previewRef.current?.seek(timeRef.current));
  }, []);

  const updateClipTrim = useCallback((key: string, start: number, end: number) => {
    setClips((prev) => {
      const target = prev.find((clip) => clip.key === key);
      if (!target) return prev;
      const others = prev
        .filter((clip) => clip.key !== key)
        .reduce((sum, clip) => sum + Math.max(0, clip.trimEnd - clip.trimStart), 0);
      const maxLength = Math.max(0.5, MAX_DURATION - others);
      const sourceDuration = Math.max(0.5, target.asset.duration || 0.5);
      const nextStart = clamp(start, 0, Math.max(0, sourceDuration - 0.5));
      let nextEnd = clamp(end, nextStart + 0.5, sourceDuration);
      if (nextEnd - nextStart > maxLength) nextEnd = nextStart + maxLength;
      return prev.map((clip) =>
        clip.key === key ? { ...clip, trimStart: nextStart, trimEnd: nextEnd } : clip,
      );
    });
    setExportState(initialState);
    requestAnimationFrame(() => previewRef.current?.seek(timeRef.current));
  }, []);

  const updateClipTransition = useCallback((key: string, transition: ClipTransition) => {
    setClips((prev) =>
      prev.map((clip) => (clip.key === key ? { ...clip, transition } : clip)),
    );
    setExportState(initialState);
    requestAnimationFrame(() => previewRef.current?.seek(timeRef.current));
  }, []);

  const clearPreviewStop = useCallback(() => {
    if (previewStopRef.current !== null) {
      window.clearTimeout(previewStopRef.current);
      previewStopRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPreviewStop(), [clearPreviewStop]);

  useEffect(
    () => () => {
      if (saveNoticeTimer.current !== null) {
        window.clearTimeout(saveNoticeTimer.current);
      }
    },
    [],
  );

  const playPreview = useCallback(
    (start: number, seconds: number) => {
      clearPreviewStop();
      const from = Math.max(0, start);
      setPlaying(false);
      setTime(from);
      previewRef.current?.seek(from);
      setPlaying(true);
      previewStopRef.current = window.setTimeout(() => {
        previewStopRef.current = null;
        setPlaying(false);
      }, Math.max(700, seconds * 1000));
    },
    [clearPreviewStop],
  );

  const previewTransition = useCallback(
    (key: string) => {
      const index = clips.findIndex((clip) => clip.key === key);
      const item = timeline[index];
      if (!item || index === 0) return;
      playPreview(item.offset, Math.max(0.9, item.transitionIn + 0.75));
    },
    [clips, timeline, playPreview],
  );

  const previewLayerAnimation = useCallback(
    (id: string, direction: "enter" | "exit", effect: TextAnimation) => {
      const target = layers.find((layer) => layer.id === id);
      if (!target) return;
      const anim = clamp(target.animDuration, 0.1, 1.5);
      const preRoll = direction === "enter" ? 0.25 : 0.3;
      const anchor = direction === "enter" ? target.start : target.end - anim;
      const length = isLoopEffect(effect) ? 2.2 : preRoll + anim + 0.6;
      playPreview(Math.max(0, anchor - preRoll), length);
    },
    [layers, playPreview],
  );

  // Autoplay the seam as soon as a different transition effect is picked.
  useEffect(() => {
    const previous = transitionTypesRef.current;
    transitionTypesRef.current = new Map(
      clips.map((clip) => [clip.key, clip.transition.type]),
    );
    if (!previous) return;

    const changed = clips.find((clip) => {
      const before = previous.get(clip.key);
      return before !== undefined && before !== clip.transition.type;
    });
    if (!changed || changed.transition.type === "none") return;

    const index = clips.findIndex((clip) => clip.key === changed.key);
    const item = timeline[index];
    if (!item || index === 0) return;

    const timer = window.setTimeout(() => {
      playPreview(item.offset, Math.max(0.9, item.transitionIn + 0.75));
    }, 60);
    return () => window.clearTimeout(timer);
  }, [clips, timeline, playPreview]);

  const updateLayer = useCallback((id: string, patch: Partial<TextLayer>) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    );
    setExportState(initialState);
  }, []);

  const moveLayer = useCallback((id: string, x: number, y: number) => {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)));
  }, []);

  const addLayer = useCallback(() => {
    const length = Math.max(1, totalDuration);
    const start = clamp(time, 0, Math.max(0, length - 0.5));
    const end = Math.min(length, start + 5);
    const layer = makeLayer(start, Math.max(start + 0.5, end), t("text.sample"));
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  }, [totalDuration, time, t]);

  const duplicateLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const target = prev.find((layer) => layer.id === id);
      if (!target) return prev;
      const copy: TextLayer = { ...target, id: uid("layer"), y: clamp(target.y + 0.08, 0, 1) };
      setSelectedId(copy.id);
      return [...prev, copy];
    });
  }, []);

  const deleteLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const unlockShopee = useCallback(() => {
    if (isPaid || shopeeUnlock !== "locked" || !shopeeUrl) return;
    setShopeeUnlock("checking");
    setShopeeCountdown(5);
    let remaining = 5;
    shopeeTimer.current = window.setInterval(() => {
      remaining -= 1;
      setShopeeCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        if (shopeeTimer.current !== null) {
          window.clearInterval(shopeeTimer.current);
          shopeeTimer.current = null;
        }
        setShopeeUnlock("ready");
      }
    }, 1000);
  }, [isPaid, shopeeUnlock, shopeeUrl]);

  const handlePlayingChange = useCallback(
    (next: boolean) => {
      if (next && !clips.length) return;
      clearPreviewStop();
      setPlaying(next);
    },
    [clips.length, clearPreviewStop],
  );

  function focusSource() {
    document.getElementById("source-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleExport() {
    if (!clips.length) return;
    if (!user.emailVerifiedAt) {
      setStep("export");
      setError(t("verify.exportBlocked"));
      return;
    }
    if (!isPaid && shopeeUnlock !== "ready") {
      setStep("export");
      setError(t("export.unlockHint"));
      return;
    }
    setPlaying(false);
    setStep("export");
    if (!isPaid) {
      setShopeeUnlock("locked");
      setShopeeCountdown(5);
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setExportState({
      ...initialState,
      running: true,
      stage: "preparing",
      totalFrames: Math.round(totalDuration * 30),
      startedAt: Date.now(),
    });

    try {
      const result = await exportVideo(
        {
          clips,
          music,
          layers,
          width: exportSize.width,
          height: exportSize.height,
          fps: 30,
          sourceVolume: muted ? 0 : sourceVolume,
          musicVolume: music ? musicVolume : 0,
          musicOffset,
          bitrateMbps,
          videoFrame,
        },
        (update) => {
          setExportState((prev) => ({
            ...prev,
            running: update.stage !== "done",
            stage: update.stage,
            frame: update.frame,
            totalFrames: update.totalFrames,
            encode: update.encode,
            error: null,
          }));
        },
        controller.signal,
      );
      setExportState((prev) => ({
        ...prev,
        running: false,
        stage: "done",
        encode: 1,
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
      }));
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setExportState((prev) => ({
        ...prev,
        running: false,
        stage: aborted ? "idle" : "error",
        error: aborted
          ? null
          : err instanceof Error
            ? errorText(err.message)
            : t("common.exportFailed"),
      }));
    } finally {
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  async function handleSave() {
    if (!clips.length || saving) return;
    setSaving(true);
    setError(null);
    const project: SavedProject = {
      version: 1,
      clips,
      music,
      videoFrame,
      ratio,
      layers,
      selectedId,
      time,
      resolution,
      quality,
      step,
      sourceVolume,
      muted,
      musicVolume,
      musicOffset,
      previewQuality,
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("project.saveError"));
      setSavedNotice(true);
      if (saveNoticeTimer.current !== null) {
        window.clearTimeout(saveNoticeTimer.current);
      }
      saveNoticeTimer.current = window.setTimeout(() => {
        saveNoticeTimer.current = null;
        setSavedNotice(false);
      }, 2200);
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("project.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const hasClips = clips.length > 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/75 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex h-[62px] max-w-[1580px] items-center justify-between px-4 sm:px-5">
          <a href="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <Wordmark
              markClassName="h-7 w-7 text-accent"
              textClassName="text-[22px] text-ink"
            />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:inline">
              / studio
            </span>
          </a>

          <div className="hidden items-center gap-2 md:flex">
            {totalDuration > 0 && (
              <span className="hidden pr-1 font-mono text-[11px] tabular-nums text-muted lg:inline">
                {t(clips.length === 1 ? "editor.summaryOne" : "editor.summary", {
                  videos: clips.length,
                  duration: formatTime(totalDuration, true),
                  size: `${exportSize.width}×${exportSize.height}`,
                })}
              </span>
            )}
            <AccountMenu user={user} />
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!hasClips || saving}
              aria-label={t("project.save")}
              className="btn min-h-[38px] px-3 py-1.5 text-[12px] whitespace-nowrap"
            >
              <SaveIcon className="h-3.5 w-3.5" />
              <span>
                {saving
                  ? t("project.saving")
                  : savedNotice
                    ? t("project.saved")
                    : t("project.save")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStep("export")}
              disabled={!hasClips}
              className="btn btn-primary min-h-[38px] px-3.5 py-1.5 text-[12px] whitespace-nowrap"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Export
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenu((value) => !value)}
            aria-label={t(mobileMenu ? "editor.mobileClose" : "editor.mobileMenu")}
            aria-expanded={mobileMenu}
            className="focus-ring grid h-10 w-10 place-items-center rounded-[10px] border border-line bg-surface text-ink md:hidden"
          >
            {mobileMenu ? (
              <XIcon className="h-4 w-4" />
            ) : (
              <MenuIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {mobileMenu && (
          <div className="absolute left-0 right-0 top-[62px] z-50 border-b border-line bg-surface p-3 shadow-2xl md:hidden">
            <div className="mx-auto max-w-[1580px]">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-medium text-ink">
                    {user.email}
                  </p>
                  <p className="text-[10px] text-muted">
                    {t(isPaid ? "account.lifetime" : "account.free")}
                    {!user.emailVerifiedAt && ` · ${t("account.emailUnverified")}`}
                  </p>
                </div>
                <AccountMenu user={user} />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenu(false);
                    void handleSave();
                  }}
                  disabled={!hasClips || saving}
                  className="btn"
                >
                  <SaveIcon className="h-3.5 w-3.5" />
                  {saving
                    ? t("project.saving")
                    : savedNotice
                      ? t("project.saved")
                      : t("project.save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenu(false);
                    setStep("export");
                  }}
                  disabled={!hasClips}
                  className="btn btn-primary"
                >
                  <DownloadIcon className="h-3.5 w-3.5" /> Export
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between rounded-xl border border-line px-2.5 py-1.5">
                <span className="text-[10.5px] text-muted">{t("common.language")}</span>
                <div className="flex items-center gap-2">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <a href="/orders" className="btn">
                  {t("account.orders")}
                </a>
                <a href="/help" className="btn">
                  {t("account.help")}
                </a>
                <a href="/" className="btn">
                  {t("editor.home")}
                </a>
                {user.role === "admin" && (
                  <a href="/admin" className="btn">
                    {t("account.admin")}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <VerifyEmailBanner user={user} />

      <main className="mx-auto max-w-[1580px] px-3 pb-10 pt-3 sm:px-4">
        <SourceCard
          clips={clips}
          busy={sourceBusy}
          onAdd={handleAddSource}
          onRemove={removeClip}
        />

        {error && <p className="alert mt-3">{error}</p>}

        {!hasClips && (
          <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
            {t("editor.empty")}
          </p>
        )}

        <nav className="mt-3 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1">
          {STEPS.map((item) => {
            const active = item.id === step;
            const reachable = true;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!reachable}
                onClick={() => {
                  if (item.id === "source") {
                    focusSource();
                    return;
                  }
                  setStep(item.id);
                }}
                className={`focus-ring flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[12px] font-semibold transition cursor-pointer disabled:opacity-40 sm:min-h-0 sm:py-2 ${
                  active
                    ? "bg-accent text-accent-ink font-bold"
                    : "text-muted hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    active ? "text-accent-ink/75" : "text-muted/70"
                  }`}
                >
                  {item.num}
                </span>
                <span className="truncate sm:hidden">{t(item.shortLabel)}</span>
                <span className="hidden truncate sm:inline">{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-3 flex flex-col gap-3 xl:grid xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
          <div className="order-2 flex min-w-0 flex-col gap-3 xl:order-1">
            {step === "trim" && (
              <>
                <ClipTrimPanel
                  clips={clips}
                  totalDuration={totalDuration}
                  onChange={updateClipTrim}
                  disabled={!hasClips}
                />
                {clips.length > 1 && (
                  <TransitionPanel
                    clips={clips}
                    timeline={timeline}
                    onChange={updateClipTransition}
                    onPreview={previewTransition}
                  />
                )}
                <VideoFramePanel
                  hasSource={hasClips}
                  frame={videoFrame}
                  onChange={(frame) => {
                    setVideoFrame(frame);
                    setExportState(initialState);
                  }}
                />
                <AudioPanel
                  music={music}
                  onMusic={(asset) => {
                    setMusic(asset);
                    setMusicOffset(0);
                    setExportState(initialState);
                  }}
                  musicVolume={musicVolume}
                  onMusicVolume={setMusicVolume}
                  musicOffset={musicOffset}
                  onMusicOffset={setMusicOffset}
                  sourceVolume={sourceVolume}
                  onSourceVolume={setSourceVolume}
                  muted={muted}
                  onMuted={setMuted}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep("text")}
                    disabled={!hasClips}
                    className="btn w-full sm:w-auto"
                  >
                    <TypeIcon className="h-3.5 w-3.5" /> {t("editor.nextText")}
                  </button>
                </div>
              </>
            )}

            {step === "text" && (
              <>
                <TextPanel
                  layers={layers}
                  selectedId={selectedId}
                  duration={totalDuration}
                  time={time}
                  onSelect={setSelectedId}
                  onChange={updateLayer}
                  onAdd={addLayer}
                  onDelete={deleteLayer}
                  onDuplicate={duplicateLayer}
                  onPreviewAnimation={previewLayerAnimation}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep("export")}
                    className="btn w-full sm:w-auto"
                  >
                    <DownloadIcon className="h-3.5 w-3.5" /> {t("editor.nextExport")}
                  </button>
                </div>
              </>
            )}

            {step === "export" && (
              <ExportPanel
                ready={hasClips && totalDuration > 0 && !sourceBusy}
                duration={totalDuration}
                width={exportSize.width}
                height={exportSize.height}
                layerCount={layers.length}
                clipCount={clips.length}
                resolution={resolution}
                isPaid={isPaid}
                onResolution={setResolution}
                quality={quality}
                onQuality={setQuality}
                state={exportState}
                onExport={() => void handleExport()}
                onCancel={handleCancel}
                onAddVideo={focusSource}
                emailVerified={Boolean(user.emailVerifiedAt)}
                shopeeUrl={shopeeUrl}
                shopeeUnlocked={isPaid || shopeeUnlock === "ready"}
                shopeeChecking={shopeeUnlock === "checking"}
                shopeeCountdown={shopeeCountdown}
                onShopeeClick={unlockShopee}
              />
            )}

            <div className="px-1 text-[10.5px] leading-relaxed text-muted">
              <p>{t("editor.privacy")}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <a href="/help" className="inline-flex items-center gap-1 transition hover:text-accent">
                  <HelpIcon className="h-3 w-3" /> {t("account.help")}
                </a>
                <a
                  href="https://github.com/zalramadhan"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition hover:text-accent"
                >
                  <GithubIcon className="h-3 w-3" /> GitHub
                </a>
                <a
                  href="https://instagram.com/zalsomeone"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition hover:text-accent"
                >
                  <InstagramIcon className="h-3 w-3" /> @zalsomeone
                </a>
                <a href="/" className="transition hover:text-accent">
                  {t("editor.home")}
                </a>
              </div>
            </div>
          </div>

          <div className="sticky top-[62px] z-30 order-1 h-[clamp(336px,55dvh,560px)] shrink-0 bg-paper sm:h-[clamp(360px,50vh,580px)] xl:order-2 xl:h-[calc(100vh-74px)]">
            <PreviewStage
              previewRef={previewRef}
              clips={clips}
              music={music}
              ratio={ratio}
              onRatio={setRatio}
              baseRes={resolution === 360 ? 720 : resolution}
              previewQuality={previewQuality}
              onPreviewQuality={setPreviewQuality}
              watermarked={!isPaid}
              layers={layers}
              videoFrame={videoFrame}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveLayer={moveLayer}
              playing={playing}
              onPlaying={handlePlayingChange}
              time={time}
              onTime={setTime}
              sourceVolume={sourceVolume}
              muted={muted}
              musicVolume={musicVolume}
              musicOffset={musicOffset}
            />
          </div>
        </div>
      </main>
      <OnboardingTutorial />
    </div>
  );
}
