"use client";

import { DEFAULT_VIDEO_FRAME, type VideoBackground, type VideoFrame } from "@/lib/types";
import { ColorField, EmptyHint, FieldGroup, Panel, Segmented, SliderField } from "./ui";
import { ResetIcon } from "./icons";
import { useI18n } from "@/lib/i18n";

type Props = {
  hasSource: boolean;
  frame: VideoFrame;
  onChange: (frame: VideoFrame) => void;
};

export default function VideoFramePanel({ hasSource, frame, onChange }: Props) {
  const { t } = useI18n();
  function patch(next: Partial<VideoFrame>) {
    onChange({ ...frame, ...next });
  }

  return (
    <Panel
      title={t("frame.title")}
      action={
        <button
          type="button"
          onClick={() => onChange(DEFAULT_VIDEO_FRAME)}
          disabled={!hasSource}
          className="focus-ring inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[10.5px] font-medium text-muted transition hover:text-ink disabled:opacity-40"
        >
          <ResetIcon className="h-3 w-3" /> {t("common.reset")}
        </button>
      }
    >
      {!hasSource ? (
        <EmptyHint>{t("frame.empty")}</EmptyHint>
      ) : (
        <fieldset className="space-y-3">
          <FieldGroup label={t("frame.background")}>
            <Segmented<VideoBackground>
              value={frame.background}
              onChange={(background) => patch({ background })}
              options={[
                { value: "crop", label: t("frame.fill") },
                { value: "blur", label: t("frame.blur") },
                { value: "solid", label: t("frame.color") },
              ]}
            />
          </FieldGroup>

          {frame.background === "blur" && (
            <>
              <SliderField
                label={t("frame.blurStrength")}
                value={frame.blur}
                min={0}
                max={60}
                step={1}
                onChange={(blur) => patch({ blur })}
                suffix="px"
              />
              <SliderField
                label={t("frame.dim")}
                value={Math.round(frame.backgroundDim * 100)}
                min={0}
                max={85}
                step={1}
                onChange={(value) => patch({ backgroundDim: value / 100 })}
                suffix="%"
              />
            </>
          )}

          {frame.background === "solid" && (
            <ColorField
              label={t("frame.bgColor")}
              value={frame.backgroundColor}
              onChange={(backgroundColor) => patch({ backgroundColor })}
            />
          )}

          <SliderField
            label={t("frame.zoom")}
            value={Math.round(frame.zoom * 100)}
            min={100}
            max={250}
            step={1}
            onChange={(value) => patch({ zoom: value / 100 })}
            suffix="%"
          />

          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label={t("frame.shiftX")}
              value={Math.round(frame.offsetX * 100)}
              min={-100}
              max={100}
              step={1}
              onChange={(value) => patch({ offsetX: value / 100 })}
              suffix="%"
            />
            <SliderField
              label={t("frame.shiftY")}
              value={Math.round(frame.offsetY * 100)}
              min={-100}
              max={100}
              step={1}
              onChange={(value) => patch({ offsetY: value / 100 })}
              suffix="%"
            />
          </div>

          <p className="text-[10.5px] leading-relaxed text-muted">{t("frame.note")}</p>
        </fieldset>
      )}
    </Panel>
  );
}
