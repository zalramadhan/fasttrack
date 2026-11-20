"use client";

import { formatTime } from "@/lib/format";
import { DownloadIcon, PlusIcon, ShopeeIcon, SpinnerIcon } from "./icons";
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
  resolution: 360 | 720 | 1080;
  isPaid: boolean;
  onResolution: (value: 360 | 720 | 1080) => void;
  quality: "standard" | "high";
  onQuality: (value: "standard" | "high") => void;
  state: ExportUIState;
  onExport: () => void;
  onCancel: () => void;
  onAddVideo: () => void;
  emailVerified: boolean;
  shopeeUrl: string;
  shopeeUnlocked: boolean;
  shopeeChecking: boolean;
  shopeeCountdown: number;
  onShopeeClick: () => void;
};

export default function ExportPanel({
  ready,
  duration,
  width,
  height,
  layerCount,
  clipCount,
  resolution,
  isPaid,
  onResolution,
  quality,
  onQuality,
  state,
  onExport,
  onCancel,
  onAddVideo,
  emailVerified,
  shopeeUrl,
  shopeeUnlocked,
  shopeeChecking,
  shopeeCountdown,
  onShopeeClick,
}: Props) {
  const { t } = useI18n();
  const bitrate = isPaid ? (quality === "high" ? 12 : 7) : 2;
  const estimatedMb = Math.round((bitrate * duration) / 8);
  const frameProgress = state.totalFrames ? state.frame / state.totalFrames : 0;
  const overall =
    state.stage === "encoding"
      ? 0.45 + state.encode * 0.55
      : state.stage === "done"
        ? 1
        : frameProgress * 0.45;

  const busy = state.running;
  const shopeeRequired = !isPaid && !shopeeUnlocked;
  const canExport = ready && emailVerified && !shopeeRequired;
  const unlockControl = (
    <>
      {shopeeUrl ? (
        <a
          href={shopeeUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          onClick={onShopeeClick}
          aria-disabled={shopeeChecking}
          className="btn w-full border-amber-500 bg-amber-400 text-amber-950 hover:bg-amber-300"
        >
          {shopeeChecking ? (
            <SpinnerIcon className="h-4 w-4" />
          ) : (
            <ShopeeIcon className="h-4 w-4" />
          )}
          {shopeeChecking
            ? t("export.unlockChecking", { seconds: String(shopeeCountdown) })
            : t("export.unlock")}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="btn w-full border-amber-500 bg-amber-400 text-amber-950 disabled:opacity-60"
        >
          <ShopeeIcon className="h-4 w-4" /> {t("export.unlock")}
        </button>
      )}
      <p className="text-[10.5px] leading-relaxed text-muted">
        {shopeeUrl ? t("export.unlockHint") : t("export.unlockMissing")}
      </p>
    </>
  );
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
          {isPaid ? (
            <Segmented<"720" | "1080">
              value={String(resolution) as "720" | "1080"}
              onChange={(value) => onResolution(Number(value) as 720 | 1080)}
              options={[
                { value: "1080", label: "1080p", title: t("export.fullQuality") },
                { value: "720", label: "720p", title: t("export.faster") },
              ]}
            />
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-paper/60 px-2.5 py-2">
              <span className="text-[12px] font-medium text-ink">720p</span>
              <span className="text-[10px] text-muted">{t("export.free720")}</span>
            </div>
          )}
          {!isPaid && (
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
              {t("export.freeLocked")}
            </p>
          )}
        </FieldGroup>

        {isPaid ? (
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
        ) : (
          <div className="rounded-lg border border-line bg-paper/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
            {t("export.freePlan")}
          </div>
        )}

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

        {!emailVerified && (
          <p className="alert">{t("export.emailLocked")}</p>
        )}

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
            {shopeeRequired ? (
              unlockControl
            ) : (
              <button type="button" onClick={onExport} className="btn w-full">
                {t("export.again")}
              </button>
            )}
          </div>
        )}

        {!busy && state.stage !== "done" && shopeeRequired && unlockControl}

        {!busy && state.stage !== "done" && !shopeeRequired && (
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className="btn btn-primary w-full"
          >
            {state.stage === "preparing" ? (
              <SpinnerIcon className="h-4 w-4" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
            {t("export.button", { rate: String(bitrate) })}
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
