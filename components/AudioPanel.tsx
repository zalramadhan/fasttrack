"use client";

import { useRef, useState } from "react";
import type { MediaAsset } from "@/lib/types";
import { probeAudio, uploadMedia } from "@/lib/media";
import { formatTime } from "@/lib/format";
import { MusicIcon, SpinnerIcon, TrashIcon } from "./icons";
import { Divider, EmptyHint, Panel, SliderField, Switch } from "./ui";
import { useI18n } from "@/lib/i18n";

type Props = {
  music: MediaAsset | null;
  onMusic: (asset: MediaAsset | null) => void;
  musicVolume: number;
  onMusicVolume: (value: number) => void;
  musicOffset: number;
  onMusicOffset: (value: number) => void;
  sourceVolume: number;
  onSourceVolume: (value: number) => void;
  muted: boolean;
  onMuted: (value: boolean) => void;
};

export default function AudioPanel({
  music,
  onMusic,
  musicVolume,
  onMusicVolume,
  musicOffset,
  onMusicOffset,
  sourceVolume,
  onSourceVolume,
  muted,
  onMuted,
}: Props) {
  const { t, errorText } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const asset = await uploadMedia(file, "audio");
      const duration = await probeAudio(asset.url);
      onMusic({ ...asset, duration });
      onMusicOffset(0);
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("audio.uploadFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel title={t("audio.title")}>
      {music ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-paper/50 px-2.5 py-2">
            <MusicIcon className="h-4 w-4 shrink-0 text-ink" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-ink">{music.name}</p>
              <p className="text-[10.5px] tabular-nums text-muted">
                {formatTime(music.duration, true)} · {t("audio.looped")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onMusic(null)}
              className="focus-ring rounded-md p-1 text-muted transition hover:text-ink"
              aria-label={t("audio.remove")}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <SliderField
            label={t("audio.volume")}
            value={musicVolume}
            min={0}
            max={1}
            step={0.01}
            onChange={onMusicVolume}
            format={(value) => `${Math.round(value * 100)}%`}
          />
          {music.duration > 0 && (
            <SliderField
              label={t("audio.startAt")}
              value={musicOffset}
              min={0}
              max={Math.max(0, Math.floor(music.duration))}
              step={0.5}
              onChange={onMusicOffset}
              format={(value) => formatTime(value, true)}
            />
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn w-full"
            disabled={loading}
          >
            {loading ? <SpinnerIcon className="h-3.5 w-3.5" /> : t("audio.replace")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="focus-ring flex w-full items-center gap-2.5 rounded-lg border border-dashed border-line-strong bg-paper/40 px-3 py-3 text-left transition hover:border-ink/30 hover:bg-ink/[0.02]"
          disabled={loading}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink">
            {loading ? <SpinnerIcon className="h-3.5 w-3.5" /> : <MusicIcon className="h-4 w-4" />}
          </span>
          <span>
            <span className="block text-[12px] font-medium text-ink">
              {loading ? t("common.uploading") : t("audio.add")}
            </span>
            <span className="block text-[10.5px] text-muted">{t("audio.formats")}</span>
          </span>
        </button>
      )}

      <Divider />

      <div className="space-y-3">
        <Switch
          checked={!muted}
          onChange={(value) => onMuted(!value)}
          label={t("audio.original")}
          description={muted ? t("audio.mutedDesc") : t("audio.unmutedDesc")}
        />
        <SliderField
          label={t("audio.sourceVolume")}
          value={sourceVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={onSourceVolume}
          format={(value) => `${Math.round(value * 100)}%`}
        />
      </div>

      {!music && !muted && (
        <div className="mt-3">
          <EmptyHint>{t("audio.noMusic")}</EmptyHint>
        </div>
      )}

      {error && (
        <p className="alert mt-2.5">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/flac"
        hidden
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </Panel>
  );
}
