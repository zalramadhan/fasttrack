"use client";

import { useRef } from "react";
import { clamp, formatTime } from "@/lib/format";
import { MAX_DURATION, type Clip } from "@/lib/types";
import { EmptyHint, Panel } from "./ui";
import { useI18n } from "@/lib/i18n";

type Props = {
  clips: Clip[];
  totalDuration: number;
  onChange: (key: string, start: number, end: number) => void;
  disabled?: boolean;
};

const MIN_LENGTH = 0.5;

export default function ClipTrimPanel({ clips, totalDuration, onChange, disabled }: Props) {
  const { t } = useI18n();
  return (
    <Panel
      title={t("trim.title")}
      action={
        <span
          className={`font-mono text-[11px] font-semibold tabular-nums ${
            totalDuration > MAX_DURATION ? "text-red-400" : "text-muted"
          }`}
        >
          {formatTime(totalDuration, true)}
        </span>
      }
    >
      {clips.length === 0 ? (
        <EmptyHint>{t("trim.empty")}</EmptyHint>
      ) : (
        <div className="space-y-2.5">
          {clips.map((clip, index) => (
            <ClipRow
              key={clip.key}
              clip={clip}
              index={index}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
          <p className="text-[10.5px] leading-relaxed text-muted">
            {t("trim.note", { max: MAX_DURATION, min: MIN_LENGTH })}
          </p>
        </div>
      )}
    </Panel>
  );
}

function ClipRow({
  clip,
  index,
  onChange,
  disabled,
}: {
  clip: Clip;
  index: number;
  onChange: (key: string, start: number, end: number) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"start" | "end" | null>(null);

  const sourceDuration = Math.max(MIN_LENGTH, clip.asset.duration || MIN_LENGTH);
  const startFrac = clamp(clip.trimStart / sourceDuration, 0, 1);
  const endFrac = clamp(clip.trimEnd / sourceDuration, 0, 1);
  const length = Math.max(0, clip.trimEnd - clip.trimStart);

  function pointerFraction(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  }

  function updateStart(value: number) {
    const start = clamp(value, 0, Math.max(0, clip.trimEnd - MIN_LENGTH));
    onChange(clip.key, Number(start.toFixed(2)), clip.trimEnd);
  }

  function updateEnd(value: number) {
    const end = clamp(value, clip.trimStart + MIN_LENGTH, sourceDuration);
    onChange(clip.key, clip.trimStart, Number(end.toFixed(2)));
  }

  function handleDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const target = event.target as HTMLElement;
    dragRef.current = target.dataset.handle === "start" ? "start" : "end";
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || !dragRef.current) return;
    const seconds = pointerFraction(event.clientX) * sourceDuration;
    if (dragRef.current === "start") updateStart(seconds);
    else updateEnd(seconds);
  }

  function handleUp(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  return (
    <div className="rounded-[10px] border border-line bg-paper/45 px-2.5 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-surface font-mono text-[9px] font-bold tabular-nums text-accent">
            {index + 1}
          </span>
          <span className="truncate text-[11.5px] font-medium text-ink">{clip.asset.name}</span>
        </div>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
          {formatTime(length, true)}
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className={`relative h-6 touch-none select-none overflow-hidden rounded-md border border-line bg-paper ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <div
          className="absolute inset-y-0"
          style={{ left: `${startFrac * 100}%`, width: `${(endFrac - startFrac) * 100}%` }}
        >
          <div className="absolute inset-0 rounded-[3px] bg-accent/85" />
          <div
            data-handle="start"
            className="absolute inset-y-0 left-0 w-3.5 cursor-ew-resize"
            aria-label={t("trim.dragStart")}
          >
            <div className="absolute inset-y-1 left-1 w-[2px] rounded-full bg-accent-ink" />
          </div>
          <div
            data-handle="end"
            className="absolute inset-y-0 right-0 w-3.5 cursor-ew-resize"
            aria-label={t("trim.dragEnd")}
          >
            <div className="absolute inset-y-1 right-1 w-[2px] rounded-full bg-accent-ink" />
          </div>
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <label className="flex items-center gap-1.5">
          <span className="shrink-0 text-[9.5px] uppercase tracking-[0.1em] text-muted">
            {t("trim.start")}
          </span>
          <input
            type="number"
            min={0}
            max={Math.max(0, clip.trimEnd - MIN_LENGTH)}
            step={0.1}
            value={Number(clip.trimStart.toFixed(2))}
            disabled={disabled}
            onChange={(event) => updateStart(Number(event.target.value))}
            className="input px-1.5 py-1 text-[11px] tabular-nums"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="shrink-0 text-[9.5px] uppercase tracking-[0.1em] text-muted">
            {t("trim.end")}
          </span>
          <input
            type="number"
            min={clip.trimStart + MIN_LENGTH}
            max={sourceDuration}
            step={0.1}
            value={Number(clip.trimEnd.toFixed(2))}
            disabled={disabled}
            onChange={(event) => updateEnd(Number(event.target.value))}
            className="input px-1.5 py-1 text-[11px] tabular-nums"
          />
        </label>
      </div>
    </div>
  );
}
