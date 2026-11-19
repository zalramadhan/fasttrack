"use client";

import { useRef } from "react";
import { clamp, formatTime } from "@/lib/format";
import { buildTimeline, type Clip } from "@/lib/types";
import { Panel } from "./ui";
import { useI18n } from "@/lib/i18n";

type Props = {
  clips: Clip[];
  totalDuration: number;
  time: number;
  onSeek: (relative: number) => void;
};

export default function Timeline({ clips, totalDuration, time, onSeek }: Props) {
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const total = Math.max(0.1, totalDuration);
  const playFrac = clamp(time / total, 0, 1);
  const timeline = buildTimeline(clips);

  function fraction(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  }

  function seek(clientX: number) {
    onSeek(fraction(clientX) * total);
  }

  return (
    <Panel
      title={t("timeline.title")}
      action={<span className="chip tabular-nums">{formatTime(total, true)}</span>}
    >
      <div
        ref={trackRef}
        onPointerDown={(event) => {
          if (!clips.length) return;
          draggingRef.current = true;
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          seek(event.clientX);
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) seek(event.clientX);
        }}
        onPointerUp={(event) => {
          draggingRef.current = false;
          (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        className={`relative h-9 touch-none select-none overflow-hidden rounded-lg border border-line bg-paper ${
          clips.length ? "cursor-pointer" : "opacity-50"
        }`}
      >
        <div className="absolute inset-0">
          {timeline.map((item) => (
            <div
              key={item.clip.key}
              className={`absolute inset-y-0 flex items-center gap-1 overflow-hidden border-r border-surface px-1.5 ${
                item.index % 2 === 0 ? "bg-ink/[0.06]" : "bg-ink/[0.02]"
              }`}
              style={{
                left: `${(item.offset / total) * 100}%`,
                width: `${(item.length / total) * 100}%`,
              }}
            >
              <span className="truncate font-mono text-[9.5px] tabular-nums text-muted">
                {item.index + 1}
              </span>
              {item.transitionIn > 0 && (
                <span
                  className="absolute inset-y-0 left-0 w-1 bg-ink/20"
                  title={t("common.transition")}
                />
              )}
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-[1.5px] bg-ink"
          style={{ left: `${playFrac * 100}%` }}
        >
          <div className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-ink" />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] tabular-nums text-muted">
        <span>0:00</span>
        <span>{formatTime(total, true)}</span>
      </div>
    </Panel>
  );
}
