"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime, uid } from "@/lib/format";
import { importFromLink, uploadMedia } from "@/lib/media";
import { DEFAULT_TRANSITION, MAX_CLIPS, type Clip, type MediaAsset } from "@/lib/types";
import {
  ChevronDownIcon,
  FilmIcon,
  LinkIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
  UploadIcon,
} from "./icons";
import { EmptyHint } from "./ui";
import { useI18n } from "@/lib/i18n";

type Props = {
  clips: Clip[];
  busy: boolean;
  onAdd: (asset: MediaAsset) => Promise<void>;
  onRemove: (key: string) => void;
};

export default function SourceCard({ clips, busy, onAdd, onRemove }: Props) {
  const { t, errorText } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<null | "upload" | "link">(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(clips.length === 0);

  useEffect(() => {
    setOpen(clips.length === 0);
  }, [clips.length]);

  const full = clips.length >= MAX_CLIPS;
  const disabled = busy || working !== null || full;

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    setWorking("upload");
    try {
      const asset = await uploadMedia(file, "video");
      await onAdd(asset);
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("common.uploadFailed"));
    } finally {
      setWorking(null);
    }
  }

  async function handleLink() {
    if (!link.trim()) {
      setError(t("common.pasteLinkFirst"));
      return;
    }
    setError(null);
    setWorking("link");
    try {
      const asset = await importFromLink(link.trim());
      await onAdd(asset);
      setLink("");
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("common.linkFailed"));
    } finally {
      setWorking(null);
    }
  }

  return (
    <section id="source-card" className="card overflow-hidden scroll-mt-20">
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-3.5 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="card-title whitespace-nowrap">{t("source.title")}</h2>
          <span className="chip whitespace-nowrap tabular-nums">
            {clips.length}/{MAX_CLIPS} {t("source.count")}
          </span>
        </div>
        <span className="hidden shrink-0 text-[10.5px] text-muted sm:inline">
          {t("source.maxNote")}
        </span>
        {clips.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={t(open ? "source.collapse" : "source.expand")}
            className="focus-ring -mr-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-ink/[0.04] hover:text-ink"
          >
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </header>

      <div
        className={`${open ? "grid" : "hidden"} gap-3 p-3.5 sm:grid md:grid-cols-2`}
      >
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void handleFile(event.dataTransfer.files?.[0]);
            }}
            disabled={disabled}
            className={`focus-ring flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-5 text-center transition disabled:opacity-50 ${
              dragging
                ? "border-ink/40 bg-ink/[0.03]"
                : "border-line-strong bg-paper/40 hover:border-ink/30 hover:bg-ink/[0.02]"
            }`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-ink">
              {working === "upload" ? (
                <SpinnerIcon className="h-4 w-4" />
              ) : (
                <UploadIcon className="h-4 w-4" />
              )}
            </span>
            <span className="text-[12.5px] font-medium text-ink">
              {working === "upload"
                ? t("common.uploading")
                : full
                  ? t("source.limitReached")
                  : clips.length
                    ? t("source.addAnother")
                    : t("source.drop")}
            </span>
            <span className="text-[10.5px] text-muted">{t("source.formats")}</span>
          </button>

          <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.12em] text-muted">
            <span className="h-px flex-1 bg-line" />
            {t("common.or")}
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleLink();
                }}
                placeholder={t("source.linkPlaceholder")}
                className="input pl-8"
                disabled={disabled}
                spellCheck={false}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary shrink-0"
              onClick={() => void handleLink()}
              disabled={disabled || !link.trim()}
            >
              {working === "link" ? <SpinnerIcon className="h-3.5 w-3.5" /> : t("source.add")}
            </button>
          </div>
          <EmptyHint>{t("source.hint")}</EmptyHint>

          {error && <p className="alert">{error}</p>}
        </div>

        <div className="min-w-0">
          {clips.length === 0 ? (
            <div className="flex h-full min-h-[128px] flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-paper/40 text-center">
              <FilmIcon className="h-5 w-5 text-muted" />
              <p className="text-[11.5px] text-muted">{t("source.none")}</p>
              <p className="text-[10px] text-muted/80">{t("source.noneHint")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {clips.map((clip, index) => (
                <div
                  key={clip.key}
                  className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-1.5"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-paper font-mono text-[10px] tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-ink">{clip.asset.name}</p>
                    <p className="text-[10px] tabular-nums text-muted">
                      {formatTime(clip.asset.duration, true)} ·{" "}
                      {clip.asset.width && clip.asset.height
                        ? `${clip.asset.width}×${clip.asset.height}`
                        : "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(clip.key)}
                    className="focus-ring rounded-md p-1 text-muted transition hover:text-ink"
                    aria-label={t("source.remove", { name: clip.asset.name })}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {!full && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled}
                  className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-2 py-1.5 text-[11px] font-medium text-muted transition hover:border-ink/30 hover:text-ink disabled:opacity-40"
                >
                  <PlusIcon className="h-3.5 w-3.5" /> {t("source.addAnother")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/x-matroska"
        hidden
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </section>
  );
}

export function makeClip(asset: MediaAsset, trimEnd: number): Clip {
  return {
    key: uid("clip"),
    asset,
    trimStart: 0,
    trimEnd,
    transition: { ...DEFAULT_TRANSITION },
  };
}
