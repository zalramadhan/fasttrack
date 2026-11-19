"use client";

import { formatTime } from "@/lib/format";
import { DownloadIcon, PlusIcon, SpinnerIcon } from "./icons";
import { Divider, EmptyHint, FieldGroup, Panel, Segmented } from "./ui";
import { useI18n } from "@/lib/i18n";

export type ExportUIState = {
  running: boolean;
  stage: "idle" | "preparing" | "frames" | "encoding" | "done" | "error";
  frame: number;
  totalFrames: number;
  encode: number;
  error: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  startedAt: number | null;
};

type Props = {
  ready: boolean;
  duration: number;
  width: number;
  height: number;
  layerCount: number;
  clipCount: number;
  resolution: 720 | 1080;
  onResolution: (value: 720 | 1080) => void;
  quality: "standard" | "high";
  onQuality: (value: "standard" | "high") => void;
  state: ExportUIState;
  onExport: () => void;
  onCancel: () => void;
  onAddVideo: () => void;
};

export default function ExportPanel({
  ready,
  duration,
  width,
  height,
  layerCount,
  clipCount,
  resolution,
  onResolution,
  quality,
  onQuality,
  state,
  onExport,
  onCancel,
  onAddVideo,
}: Props) {
  const { t } = useI18n();
  const bitrate = quality === "high" ? 12 : 7;
  const estimatedMb = Math.round((bitrate * duration) / 8);
  const frameProgress = state.totalFrames ? state.frame / state.totalFrames : 0;
  const overall =
    state.stage === "encoding"
      ? 0.45 + state.encode * 0.55
      : state.stage === "done"
        ? 1
        : frameProgress * 0.45;

  const busy = state.running;
  const stageLabel =
    state.stage === "preparing"
      ? t("export.stagePreparing")
      : state.stage === "frames"
        ? t("export.stageFrames")
        : state.stage === "encoding"
          ? t("export.stageEncoding")
          : state.stage === "done"
            ? t("export.stageDone")
            : t("export.stageWorking");

  return (
    <Panel title={t("export.title")}>
      <div className="space-y-3">
        <FieldGroup label={t("export.resolution")}>
          <Segmented<"720" | "1080">
            value={String(resolution) as "720" | "1080"}
            onChange={(value) => onResolution(Number(value) as 720 | 1080)}
            options={[
              { value: "1080", label: "1080p", title: t("export.fullQuality") },
              { value: "720", label: "720p", title: t("export.faster") },
            ]}
          />
        </FieldGroup>

        <FieldGroup label={t("export.quality")}>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                {
                  value: "standard",
                  title: t("export.defaultQuality"),
                  bitrate: "7 Mbps",
                  note: t("export.daily"),
                },
                {
                  value: "high",
                  title: t("export.high"),
                  bitrate: "12 Mbps",
                  note: t("export.sharper"),
                },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onQuality(option.value)}
                disabled={busy}
                className={`focus-ring rounded-lg border px-2.5 py-2 text-left transition ${
                  quality === option.value
                    ? "border-ink bg-ink/[0.03]"
                    : "border-line hover:border-line-strong"
                }`}
              >
                <span className="flex items-baseline justify-between">
                  <span className="text-[12px] font-medium text-ink">{option.title}</span>
                  <span className="font-mono text-[10px] text-muted">{option.bitrate}</span>
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted">
                  {option.note}
                </span>
              </button>
            ))}
          </div>
        </FieldGroup>

        <div className="rounded-lg border border-line bg-paper/60 px-2.5 py-2">
          <dl className="space-y-1.5 text-[11.5px]">
            <SummaryRow label={t("export.ratioRes")} value={`${width}×${height}`} />
            <SummaryRow label={t("export.duration")} value={formatTime(duration, true)} />
            <SummaryRow label={t("export.fps")} value="30 fps" />
            <SummaryRow
              label={t("export.video")}
              value={t("export.clips", { count: clipCount })}
            />
            <SummaryRow
              label={t("export.text")}
              value={t("export.layers", { count: layerCount })}
            />
            <SummaryRow label={t("export.estimate")} value={`± ${estimatedMb} MB`} />
          </dl>
        </div>

        {!ready && <EmptyHint>{t("export.empty")}</EmptyHint>}

        {state.stage === "error" && (
          <p className="alert">{state.error}</p>
        )}

        {busy && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-ink">{stageLabel}</span>
              <span className="font-mono tabular-nums text-muted">
                {Math.round(overall * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-300"
                style={{ width: `${Math.max(2, overall * 100)}%` }}
              />
            </div>
            {state.stage === "frames" && (
              <p className="font-mono text-[10px] tabular-nums text-muted">
                {t("export.frame", { frame: state.frame, total: state.totalFrames })}
              </p>
            )}
            <button type="button" onClick={onCancel} className="btn w-full">
              {t("export.cancel")}
            </button>
          </div>
        )}

        {!busy && state.stage === "done" && state.downloadUrl && (
          <div className="space-y-2">
            <a href={state.downloadUrl} download={state.fileName ?? "fasttrack.mp4"} className="btn btn-primary w-full">
              <DownloadIcon className="h-4 w-4" /> {t("export.download")}
            </a>
            <button type="button" onClick={onExport} className="btn w-full">
              {t("export.again")}
            </button>
          </div>
        )}

        {!busy && state.stage !== "done" && (
          <button
            type="button"
            onClick={onExport}
            disabled={!ready}
            className="btn btn-primary w-full"
          >
            {state.stage === "preparing" ? (
              <SpinnerIcon className="h-4 w-4" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            {t("export.button", { rate: quality === "high" ? "12" : "7" })}
          </button>
        )}

        <button type="button" onClick={onAddVideo} className="btn w-full">
          <PlusIcon className="h-3.5 w-3.5" /> {t("export.addVideo")}
        </button>

        <Divider />
        <p className="text-[10.5px] leading-relaxed text-muted">{t("export.note")}</p>
      </div>
    </Panel>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono tabular-nums text-ink">{value}</dd>
    </div>
  );
}
