"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PreviewStage, { type PreviewHandle } from "./PreviewStage";
import SourceCard from "./SourceCard";
import AudioPanel from "./AudioPanel";
import Timeline from "./Timeline";
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
  type MediaAsset,
  type TextLayer,
  type VideoFrame,
} from "@/lib/types";
import { DownloadIcon, GithubIcon, InstagramIcon, TypeIcon } from "./icons";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { useI18n, type MessageKey } from "@/lib/i18n";

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

type Step = "trim" | "text" | "export";

const STEPS: { id: "source" | Step; label: MessageKey; num: string }[] = [
  { id: "source", label: "editor.stepSource", num: "01" },
  { id: "trim", label: "editor.stepTrim", num: "02" },
  { id: "text", label: "editor.stepText", num: "03" },
  { id: "export", label: "editor.stepExport", num: "04" },
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
  };
}

type Props = {
  /** First video handed over by the entry screen. */
  bootAsset?: MediaAsset | null;
};

export default function Editor({ bootAsset }: Props) {
  const { t, errorText } = useI18n();
  const [clips, setClips] = useState<Clip[]>([]);
  const [music, setMusic] = useState<MediaAsset | null>(null);
  const [videoFrame, setVideoFrame] = useState<VideoFrame>(DEFAULT_VIDEO_FRAME);
  const [ratio, setRatio] = useState<AspectRatio>("9:16");
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [resolution, setResolution] = useState<720 | 1080>(1080);
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [step, setStep] = useState<Step>("trim");
  const [sourceVolume, setSourceVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [musicOffset, setMusicOffset] = useState(0);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportState, setExportState] = useState<ExportUIState>(initialState);

  const previewRef = useRef<PreviewHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeRef = useRef(0);
  timeRef.current = time;

  const timeline = useMemo(() => buildTimeline(clips), [clips]);
  const totalDuration = useMemo(() => timelineDuration(timeline), [timeline]);
  const exportSize = outputSize(ratio, resolution);

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

  const previewTransition = useCallback(
    (key: string) => {
      const index = clips.findIndex((clip) => clip.key === key);
      const item = timeline[index];
      if (!item || index === 0) return;
      const start = Math.max(0, item.offset);
      setPlaying(false);
      setTime(start);
      previewRef.current?.seek(start);
      setPlaying(true);
    },
    [clips, timeline],
  );

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

  const handleSeek = useCallback((relative: number) => {
    setPlaying(false);
    setTime(relative);
    previewRef.current?.seek(relative);
  }, []);

  const handlePlayingChange = useCallback(
    (next: boolean) => {
      if (next && !clips.length) return;
      setPlaying(next);
    },
    [clips.length],
  );

  function focusSource() {
    document.getElementById("source-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleExport() {
    if (!clips.length) return;
    setPlaying(false);
    setStep("export");
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
          bitrateMbps: quality === "high" ? 12 : 7,
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

  const hasClips = clips.length > 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-[56px] max-w-[1580px] items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-ink text-paper">
              <span className="ml-0.5 block h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-current" />
            </span>
            <span className="text-[14.5px] font-semibold tracking-[-0.02em] text-ink">
              fasttrack
            </span>
            <span className="chip hidden sm:inline">video → mp4</span>
          </div>

          <div className="flex items-center gap-2">
            {totalDuration > 0 && (
              <span className="hidden font-mono text-[11px] tabular-nums text-muted sm:inline">
                {t(clips.length === 1 ? "editor.summaryOne" : "editor.summary", {
                  videos: clips.length,
                  duration: formatTime(totalDuration, true),
                  size: `${exportSize.width}×${exportSize.height}`,
                })}
              </span>
            )}
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setStep("export")}
              disabled={!hasClips}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-ink bg-ink px-3 py-1.5 text-[12px] font-medium text-on-ink transition hover:bg-ink/90 disabled:opacity-40"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1580px] px-3 pb-10 pt-3">
        <SourceCard
          clips={clips}
          busy={sourceBusy}
          onAdd={handleAddSource}
          onRemove={removeClip}
        />

        {error && <p className="alert mt-3">{error}</p>}

        {!hasClips && (
          <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted">
            {t("editor.empty")}
          </p>
        )}

        {hasClips && (
        <>
        <nav className="mt-3 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
          {STEPS.map((item) => {
            const active = item.id === step;
            const reachable = item.id === "source" || hasClips;
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
                className={`focus-ring flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium transition disabled:opacity-40 ${
                  active
                    ? "bg-ink text-on-ink"
                    : "text-muted hover:bg-ink/[0.03] hover:text-ink"
                }`}
              >
                <span
                  className={`font-mono text-[9.5px] tabular-nums ${
                    active ? "text-on-ink/60" : "text-muted/70"
                  }`}
                >
                  {item.num}
                </span>
                <span className="truncate">{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-3 grid items-start gap-3 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="order-2 flex min-w-0 flex-col gap-3 xl:order-1">
            {step === "trim" && (
              <>
                <Timeline
                  clips={clips}
                  totalDuration={totalDuration}
                  time={time}
                  onSeek={handleSeek}
                />
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
                    className="btn"
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
                />
                <div className="flex justify-end">
                  <button type="button" onClick={() => setStep("export")} className="btn">
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
                onResolution={setResolution}
                quality={quality}
                onQuality={setQuality}
                state={exportState}
                onExport={() => void handleExport()}
                onCancel={handleCancel}
                onAddVideo={focusSource}
              />
            )}

            <div className="px-1 text-[10.5px] leading-relaxed text-muted">
              <p>{t("editor.privacy")}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <a
                  href="https://github.com/zalramadhan"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition hover:text-ink"
                >
                  <GithubIcon className="h-3 w-3" /> GitHub
                </a>
                <a
                  href="https://instagram.com/zalsomeone"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition hover:text-ink"
                >
                  <InstagramIcon className="h-3 w-3" /> @zalsomeone
                </a>
                <a href="/" className="transition hover:text-ink">
                  {t("editor.home")}
                </a>
              </div>
            </div>
          </div>

          <div className="sticky top-[56px] z-30 order-1 h-[42vh] min-h-[260px] max-h-[440px] bg-paper xl:order-2 xl:h-[calc(100vh-68px)] xl:max-h-none">
            <PreviewStage
              previewRef={previewRef}
              clips={clips}
              music={music}
              ratio={ratio}
              onRatio={setRatio}
              baseRes={resolution}
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
        </>
        )}
      </main>
    </div>
  );
}
