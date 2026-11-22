"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawFrame, drawLayers, hitTestLayers } from "@/lib/render";
import { TransitionCompositor } from "@/lib/transition-compositor";
import { clamp, formatTime } from "@/lib/format";
import {
  buildTimeline,
  timelineDuration,
  timelineIndexAt,
  transitionAt,
  type AspectRatio,
  type Clip,
  type MediaAsset,
  type PreviewQuality,
  type TextLayer,
  type VideoFrame,
} from "@/lib/types";
import { PauseIcon, PlayIcon, SpinnerIcon } from "./icons";
import { useI18n } from "@/lib/i18n";

export type PreviewHandle = { seek: (relativeTime: number) => void };

type Props = {
  previewRef: React.RefObject<PreviewHandle | null>;
  clips: Clip[];
  music: MediaAsset | null;
  ratio: AspectRatio;
  onRatio: (ratio: AspectRatio) => void;
  baseRes: 720 | 1080;
  previewQuality: PreviewQuality;
  onPreviewQuality: (quality: PreviewQuality) => void;
  watermarked?: boolean;
  layers: TextLayer[];
  videoFrame: VideoFrame;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveLayer: (id: string, x: number, y: number) => void;
  playing: boolean;
  onPlaying: (playing: boolean) => void;
  time: number;
  onTime: (time: number) => void;
  sourceVolume: number;
  muted: boolean;
  musicVolume: number;
  musicOffset: number;
};

const RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
];

type ProxyState = {
  status: "working" | "ready" | "error";
  url?: string;
};

export default function PreviewStage(props: Props) {
  const {
    previewRef,
    clips,
    music,
    ratio,
    onRatio,
    baseRes,
    previewQuality,
    onPreviewQuality,
    watermarked = false,
    layers,
    videoFrame,
    onSelect,
    onMoveLayer,
    playing,
    onPlaying,
    time,
    onTime,
    sourceVolume,
    muted,
    musicVolume,
    musicOffset,
  } = props;
  const { t } = useI18n();

  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const musicRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const lastReportRef = useRef(0);
  const activeIndexRef = useRef(0);
  const compositorRef = useRef<TransitionCompositor | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const timeRef = useRef(time);
  timeRef.current = time;
  const [proxyStates, setProxyStates] = useState<Record<string, ProxyState>>({});

  const timeline = useMemo(() => buildTimeline(clips), [clips]);
  const timelineRef = useRef(timeline);
  const totalDuration = timelineDuration(timeline);
  const totalRef = useRef(totalDuration);

  useEffect(() => {
    return () => {
      compositorRef.current?.dispose();
      compositorRef.current = null;
    };
  }, []);

  const latest = useRef({
    playing,
    muted,
    sourceVolume,
    onTime,
    onPlaying,
    musicOffset,
    musicVolume,
    music,
    totalDuration,
  });

  useEffect(() => {
    timelineRef.current = timeline;
    totalRef.current = totalDuration;
    latest.current = {
      playing,
      muted,
      sourceVolume,
      onTime,
      onPlaying,
      musicOffset,
      musicVolume,
      music,
      totalDuration,
    };
  }, [
    timeline,
    totalDuration,
    playing,
    muted,
    sourceVolume,
    onTime,
    onPlaying,
    musicOffset,
    musicVolume,
    music,
  ]);

  const assetIds = useMemo(
    () => Array.from(new Set(clips.map((clip) => clip.asset.id))),
    [clips],
  );
  const assetKey = assetIds.join("|");
  const proxyKey = (id: string) => `${previewQuality}:${id}`;

  useEffect(() => {
    if (previewQuality === "full" || assetIds.length === 0) {
      setProxyStates({});
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const load = async () => {
      const next: Record<string, ProxyState> = {};
      let working = false;

      await Promise.all(
        assetIds.map(async (id) => {
          try {
            const res = await fetch(
              `/api/media/${id}/preview?quality=${previewQuality}`,
              { cache: "no-store" },
            );
            const data = (await res.json().catch(() => ({}))) as {
              status?: string;
              url?: string;
            };
            if (cancelled) return;
            const key = `${previewQuality}:${id}`;
            if (res.status === 202) {
              next[key] = { status: "working" };
              working = true;
            } else if (res.ok && data.status === "ready" && data.url) {
              next[key] = { status: "ready", url: data.url };
            } else {
              next[key] = { status: "error" };
            }
          } catch {
            if (!cancelled) next[`${previewQuality}:${id}`] = { status: "error" };
          }
        }),
      );

      if (cancelled) return;
      setProxyStates(next);
      if (working) timer = window.setTimeout(load, 1200);
    };

    void load();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [previewQuality, assetKey]);

  const previewSize = useMemo(() => {
    const base = 720;
    if (ratio === "1:1") return { width: base, height: base };
    if (ratio === "4:5") return { width: base, height: Math.round((base * 5) / 4) };
    if (ratio === "9:16") return { width: base, height: Math.round((base * 16) / 9) };
    return { width: Math.round((base * 16) / 9), height: base };
  }, [ratio]);

  const exportSize = useMemo(() => {
    if (ratio === "1:1") return { width: baseRes, height: baseRes };
    if (ratio === "4:5") return { width: baseRes, height: Math.round((baseRes * 5) / 4) };
    if (ratio === "9:16") return { width: baseRes, height: Math.round((baseRes * 16) / 9) };
    return { width: Math.round((baseRes * 16) / 9), height: baseRes };
  }, [ratio, baseRes]);

  // Clamp the active clip whenever the sequence changes.
  useEffect(() => {
    if (!timeline.length) {
      activeIndexRef.current = 0;
      return;
    }
    const index = Math.min(activeIndexRef.current, timeline.length - 1);
    activeIndexRef.current = index;
    videoRefs.current.forEach((video, key) => {
      if (key !== timeline[index].clip.key) video.pause();
    });
  }, [timeline]);

  // Playback loop + rendering.
  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const canvas = canvasRef.current;
      const items = timelineRef.current;
      const info = latest.current;
      let video: HTMLVideoElement | null = null;
      let globalTime = 0;
      let transition: ReturnType<typeof transitionAt> = null;
      let incoming: HTMLVideoElement | null = null;

      if (items.length) {
        let index = Math.min(activeIndexRef.current, items.length - 1);
        let item = items[index];
        video = videoRefs.current.get(item.clip.key) ?? null;

        if (video && info.playing && video.currentTime >= item.clip.trimEnd - 0.02) {
          video.pause();
          if (index + 1 < items.length) {
            const nextItem = items[index + 1];
            const nextVideo = videoRefs.current.get(nextItem.clip.key) ?? null;
            activeIndexRef.current = index + 1;
            item = nextItem;
            video = nextVideo;
            if (nextVideo) {
              // With a transition the incoming clip is already mid-shot.
              if (nextItem.transitionIn <= 0.001) {
                nextVideo.currentTime = nextItem.clip.trimStart;
              }
              nextVideo.volume = info.muted ? 0 : clamp(info.sourceVolume, 0, 1);
              if (nextVideo.paused) void nextVideo.play().catch(() => info.onPlaying(false));
            }
          } else {
            activeIndexRef.current = 0;
            item = items[0];
            video = videoRefs.current.get(item.clip.key) ?? null;
            if (video) {
              video.currentTime = item.clip.trimStart;
              video.volume = info.muted ? 0 : clamp(info.sourceVolume, 0, 1);
              void video.play().catch(() => info.onPlaying(false));
            }
          }
        }

        if (video) {
          globalTime =
            item.offset +
            clamp(video.currentTime - item.clip.trimStart, 0, Math.max(0, item.length));
        } else {
          globalTime = item.offset;
        }

        transition = transitionAt(items, globalTime);
        if (transition) {
          incoming = videoRefs.current.get(transition.to.clip.key) ?? null;
          if (incoming) {
            const expected =
              transition.to.clip.trimStart +
              clamp(globalTime - transition.to.offset, 0, Math.max(0, transition.to.length));
            if (info.playing) {
              if (Math.abs(incoming.currentTime - expected) > 0.2) {
                incoming.currentTime = expected;
              }
              if (incoming.paused) void incoming.play().catch(() => info.onPlaying(false));
              incoming.volume = info.muted
                ? 0
                : clamp(info.sourceVolume * transition.progress, 0, 1);
              if (video) {
                video.volume = info.muted
                  ? 0
                  : clamp(info.sourceVolume * (1 - transition.progress), 0, 1);
              }
            } else if (Math.abs(incoming.currentTime - expected) > 0.03) {
              incoming.currentTime = expected;
            }
          }
        }
      }

      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const fromReady = video && video.readyState >= 2 ? video : null;
          const toReady = incoming && incoming.readyState >= 2 ? incoming : null;

          if (transition && toReady) {
            if (!compositorRef.current) compositorRef.current = new TransitionCompositor();
            compositorRef.current.draw(ctx, canvas.width, canvas.height, {
              from: fromReady,
              to: toReady,
              videoFrame,
              type: transition.to.clip.transition.type,
              progress: transition.progress,
            });
            drawLayers(ctx, layers, canvas.width, canvas.height, globalTime, !info.playing);
          } else {
            drawFrame(ctx, {
              width: canvas.width,
              height: canvas.height,
              video: fromReady,
              layers,
              time: globalTime,
              videoFrame,
              ghostInactive: !info.playing,
            });
          }

          const now = performance.now();
          if (now - lastReportRef.current > 90) {
            lastReportRef.current = now;
            info.onTime(Number.isFinite(globalTime) ? globalTime : 0);
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layers, videoFrame]);

  // Play / pause. Reads live values from `latest` so volume or time updates do
  // not restart the audio (that used to make uploaded music stutter).
  useEffect(() => {
    const items = timelineRef.current;
    const audio = musicRef.current;
    const info = latest.current;

    if (!playing) {
      videoRefs.current.forEach((video) => video.pause());
      audio?.pause();
      return;
    }
    if (!items.length) {
      info.onPlaying(false);
      return;
    }

    const index = Math.min(activeIndexRef.current, items.length - 1);
    const item = items[index];
    const video = videoRefs.current.get(item.clip.key);
    if (video) {
      if (
        video.currentTime < item.clip.trimStart ||
        video.currentTime >= item.clip.trimEnd - 0.02
      ) {
        video.currentTime = item.clip.trimStart;
      }
      video.volume = info.muted ? 0 : clamp(info.sourceVolume, 0, 1);
      void video.play().catch(() => info.onPlaying(false));
    }

    if (audio && info.music) {
      audio.volume = clamp(info.musicVolume, 0, 1);
      audio.loop = true;
      const relative = accumulatedTime(items, index, video);
      const offset =
        info.music.duration > 0
          ? (info.musicOffset + relative) % info.music.duration
          : info.musicOffset;
      // Only nudge the audio when it is actually out of sync; assigning
      // currentTime on every render is what caused the crackle.
      if (Math.abs(audio.currentTime - offset) > 0.35) audio.currentTime = offset;
      void audio.play().catch(() => {});
    }
  }, [playing, clips, music, musicOffset]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      video.volume = muted ? 0 : clamp(sourceVolume, 0, 1);
    });
  }, [muted, sourceVolume]);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.volume = clamp(musicVolume, 0, 1);
    audio.loop = true;
  }, [musicVolume, music]);

  const seekTo = useCallback(
    (relativeTime: number) => {
      const items = timelineRef.current;
      if (!items.length) return;
      const total = totalRef.current;
      const t = clamp(relativeTime, 0, Math.max(0, total - 0.02));
      const index = timelineIndexAt(items, t);
      const item = items[index];
      activeIndexRef.current = index;

      const transition = transitionAt(items, t);
      videoRefs.current.forEach((video, key) => {
        if (key !== item.clip.key && key !== transition?.to.clip.key) video.pause();
      });
      const video = videoRefs.current.get(item.clip.key);
      if (video) {
        video.currentTime =
          item.clip.trimStart + clamp(t - item.offset, 0, Math.max(0, item.length - 0.02));
      }
      if (transition) {
        const incoming = videoRefs.current.get(transition.to.clip.key);
        if (incoming) {
          incoming.currentTime =
            transition.to.clip.trimStart +
            clamp(t - transition.to.offset, 0, Math.max(0, transition.to.length - 0.02));
        }
      }

      const audio = musicRef.current;
      if (audio && music) {
        const offset = music.duration > 0 ? (musicOffset + t) % music.duration : musicOffset;
        audio.currentTime = offset;
      }
      lastReportRef.current = performance.now();
      onTime(t);
    },
    [music, musicOffset, onTime],
  );

  useEffect(() => {
    previewRef.current = { seek: seekTo };
  }, [previewRef, seekTo]);

  const proxyReadyKey = assetIds
    .map((id) => proxyStates[proxyKey(id)]?.status ?? "idle")
    .join("|");

  // Reloading a video with a proxy src resets its currentTime. Once the new
  // source is ready, put the playhead back where the user left it.
  useEffect(() => {
    if (!clips.length) return;
    const timer = window.setTimeout(() => seekTo(timeRef.current), 180);
    return () => window.clearTimeout(timer);
  }, [previewQuality, proxyReadyKey, clips.length, seekTo]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return { px, py, width: canvas.width, height: canvas.height };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const point = canvasPoint(event);
    if (!canvas || !point) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hit = hitTestLayers(ctx, layers, point.width, point.height, point.px, point.py);
    if (!hit) {
      onSelect(null);
      return;
    }
    onSelect(hit.id);
    dragRef.current = {
      id: hit.id,
      offsetX: point.px - hit.x * point.width,
      offsetY: point.py - hit.y * point.height,
    };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = canvasPoint(event);
    if (!point) return;
    const x = clamp((point.px - drag.offsetX) / point.width, 0, 1);
    const y = clamp((point.py - drag.offsetY) / point.height, 0, 1);
    onMoveLayer(drag.id, x, y);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    canvasRef.current?.releasePointerCapture?.(event.pointerId);
  }

  const scrubTotal = Math.max(0.1, totalDuration);
  const playFrac = clamp(time / scrubTotal, 0, 1);
  const activeClipIndex = timeline.length ? timelineIndexAt(timeline, time) : 0;
  const proxyPreparing =
    previewQuality !== "full" &&
    assetIds.some(
      (id) => !proxyStates[proxyKey(id)] || proxyStates[proxyKey(id)].status === "working",
    );
  const proxyFailed =
    previewQuality !== "full" &&
    assetIds.some((id) => proxyStates[proxyKey(id)]?.status === "error");

  function videoSrc(clip: Clip) {
    if (previewQuality === "full") return clip.asset.url;
    const proxy = proxyStates[proxyKey(clip.asset.id)];
    return proxy?.status === "ready" && proxy.url ? proxy.url : clip.asset.url;
  }

  function changeQuality(next: PreviewQuality) {
    onPlaying(false);
    onPreviewQuality(next);
  }

  function scrubTo(clientX: number) {
    const track = scrubberRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);
    seekTo(fraction * totalRef.current);
  }

  return (
    <section className="card flex h-full min-h-0 flex-col overflow-hidden shadow-[0_24px_70px_-36px_rgba(0,0,0,0.6)]">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="card-title shrink-0">{t("preview.ratio")}</span>
          <div className="flex items-center gap-0.5 rounded-[10px] border border-line bg-paper p-0.5">
            {RATIO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onRatio(option.value)}
                className={`focus-ring rounded-[7px] px-2 py-1 text-[11px] font-semibold tabular-nums transition cursor-pointer ${
                  ratio === option.value
                    ? "bg-accent text-accent-ink font-bold"
                    : "text-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="flex shrink-0 items-center gap-1">
            <span className="sr-only">{t("preview.quality")}</span>
            <select
              value={previewQuality}
              onChange={(event) => changeQuality(event.target.value as PreviewQuality)}
              title={t("preview.quality")}
              className="focus-ring h-7 rounded-lg border border-line bg-paper px-2 text-[11px] font-semibold text-ink"
            >
              <option value="full">{t("preview.full")}</option>
              <option value="half">{t("preview.half")}</option>
              <option value="quarter">{t("preview.quarter")}</option>
            </select>
          </label>
        </div>
        <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-muted sm:inline">
          {exportSize.width}×{exportSize.height} · {formatTime(totalDuration, true)}
        </span>
      </header>

      <div className="studio-dot-grid relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stage p-3 sm:p-4">
        {clips.length > 0 ? (
          <canvas
            ref={canvasRef}
            width={previewSize.width}
            height={previewSize.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative max-h-full max-w-full cursor-grab touch-none rounded-lg border border-white/10 bg-black shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] active:cursor-grabbing"
          />
        ) : (
          <div className="relative flex flex-col items-center gap-2 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 text-[#C3F36B]">
              <PlayIcon className="h-4 w-4" />
            </span>
            <p className="text-[12px] text-white/75">{t("preview.empty")}</p>
            <p className="text-[10.5px] text-white/40">{t("preview.emptyHint")}</p>
          </div>
        )}
        {watermarked && clips.length > 0 && (
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-md bg-black/45 px-2 py-1 font-display text-[11px] font-bold tracking-[-0.02em] text-white/80 backdrop-blur-sm">
            fasttrack
          </div>
        )}
        {proxyPreparing && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[10.5px] text-white/90 backdrop-blur-sm">
            <SpinnerIcon className="h-3 w-3 text-[#C3F36B]" /> {t("preview.preparing")}
          </div>
        )}
        {proxyFailed && !proxyPreparing && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-amber-300/20 bg-black/65 px-2 py-1 text-[10px] text-amber-200/90 backdrop-blur-sm">
            {t("preview.proxyFallback")}
          </div>
        )}
        {clips.map((clip, index) => (
          <video
            key={clip.key}
            ref={(element) => {
              if (element) videoRefs.current.set(clip.key, element);
              else videoRefs.current.delete(clip.key);
            }}
            src={videoSrc(clip)}
            className="pointer-events-none absolute h-px w-px opacity-0"
            playsInline
            preload={index === activeClipIndex || index === activeClipIndex + 1 ? "auto" : "metadata"}
            onLoadedMetadata={() => {
              if (clip.key === timelineRef.current[activeIndexRef.current]?.clip.key) {
                seekTo(timeRef.current);
              }
            }}
          />
        ))}
        {music && <audio ref={musicRef} src={music.url} loop preload="auto" />}
      </div>

      <div className="flex h-14 shrink-0 items-center gap-3 border-t border-line bg-surface px-3.5">
        <button
          type="button"
          onClick={() => onPlaying(!playing)}
          disabled={!clips.length}
          className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition hover:bg-accent-hover disabled:opacity-30 cursor-pointer sm:h-9 sm:w-9"
          aria-label={playing ? t("preview.pause") : t("preview.play")}
        >
          {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
        </button>

        <span className="w-10 shrink-0 font-mono text-[10.5px] tabular-nums text-ink">
          {formatTime(time, true)}
        </span>

        <div
          ref={scrubberRef}
          role="slider"
          tabIndex={clips.length > 0 ? 0 : -1}
          aria-label={t("preview.seek")}
          aria-valuemin={0}
          aria-valuemax={Number(scrubTotal.toFixed(2))}
          aria-valuenow={Number(time.toFixed(2))}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            onPlaying(false);
            seekTo(time + (event.key === "ArrowRight" ? 0.5 : -0.5));
          }}
          onPointerDown={(event) => {
            if (!clips.length) return;
            scrubbingRef.current = true;
            (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
            onPlaying(false);
            scrubTo(event.clientX);
            event.preventDefault();
          }}
          onPointerMove={(event) => {
            if (scrubbingRef.current) scrubTo(event.clientX);
          }}
          onPointerUp={(event) => {
            scrubbingRef.current = false;
            (event.currentTarget as HTMLDivElement).releasePointerCapture?.(event.pointerId);
          }}
          onPointerCancel={() => {
            scrubbingRef.current = false;
          }}
          className={`focus-ring group relative h-8 min-w-0 flex-1 touch-none select-none rounded-sm ${
            clips.length ? "cursor-pointer" : "opacity-40"
          }`}
        >
          <div className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-line" />
          {timeline.map((item) => (
            <div
              key={item.clip.key}
              className={`absolute top-1/2 h-[4px] -translate-y-1/2 overflow-hidden rounded-full ${
                item.index % 2 === 0 ? "bg-accent/70" : "bg-accent/40"
              }`}
              style={{
                left: `${(item.offset / scrubTotal) * 100}%`,
                width: `${(item.length / scrubTotal) * 100}%`,
              }}
            >
              {item.transitionIn > 0 && (
                <span className="absolute inset-y-0 left-0 w-1.5 bg-[#e2452a]/85" />
              )}
            </div>
          ))}
          <div
            className="pointer-events-none absolute inset-y-0 w-[2px] -translate-x-1/2 bg-accent"
            style={{ left: `${playFrac * 100}%` }}
          >
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent shadow-[0_1px_4px_rgba(0,0,0,0.45)]" />
          </div>
        </div>

        <span className="w-10 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-muted">
          {formatTime(scrubTotal, true)}
        </span>

        <span className="hidden shrink-0 font-mono text-[10.5px] tabular-nums text-muted sm:inline">
          {clips.length > 1 ? t("preview.clipCount", { count: clips.length }) : ""}
          {baseRes}p · 30 fps
        </span>
      </div>
    </section>
  );
}

function accumulatedTime(
  items: ReturnType<typeof buildTimeline>,
  index: number,
  video: HTMLVideoElement | null | undefined,
) {
  const item = items[Math.min(index, items.length - 1)];
  if (!item) return 0;
  const local = video ? clamp(video.currentTime - item.clip.trimStart, 0, item.length) : 0;
  return item.offset + local;
}
