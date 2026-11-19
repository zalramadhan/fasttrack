"use client";

import { useEffect, useMemo, useState } from "react";
import { clamp, formatTime } from "@/lib/format";
import { ensureFont, FONT_WEIGHTS, GOOGLE_FONTS } from "@/lib/fonts";
import { TEXT_PRESETS } from "@/lib/presets";
import { TYPE_ANIMATIONS } from "@/lib/text-animations";
import type { TextAlign, TextAnimation, TextLayer, TextTransform } from "@/lib/types";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "./icons";
import {
  ColorField,
  Divider,
  EmptyHint,
  Field,
  FieldGroup,
  Panel,
  Segmented,
  SliderField,
} from "./ui";
import { useI18n } from "@/lib/i18n";

const STYLE_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "color",
  "outlineWidth",
  "outlineColor",
  "transform",
  "align",
  "enter",
  "exit",
  "animDuration",
] as const;

type LayerStyle = Pick<TextLayer, (typeof STYLE_KEYS)[number]>;

function pickStyle(layer: TextLayer): LayerStyle {
  return {
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    letterSpacing: layer.letterSpacing,
    lineHeight: layer.lineHeight,
    color: layer.color,
    outlineWidth: layer.outlineWidth,
    outlineColor: layer.outlineColor,
    transform: layer.transform,
    align: layer.align,
    enter: layer.enter,
    exit: layer.exit,
    animDuration: layer.animDuration,
  };
}

type Props = {
  layers: TextLayer[];
  selectedId: string | null;
  duration: number;
  time: number;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<TextLayer>) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onPreviewAnimation: (id: string, direction: "enter" | "exit") => void;
};

function FontPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GOOGLE_FONTS;
    return GOOGLE_FONTS.filter((font) => font.family.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    filtered.slice(0, 18).forEach((font) => void ensureFont(font.family, 400));
  }, [filtered, open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate" style={{ fontFamily: `"${value}", sans-serif` }}>
          {value}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label={t("text.closeFonts")}
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-16px_rgba(20,20,25,0.35)]">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("text.searchFont")}
              className="input mb-1"
            />
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((font) => (
                <button
                  key={font.family}
                  type="button"
                  onClick={() => {
                    onChange(font.family);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition hover:bg-paper ${
                    font.family === value ? "bg-paper text-ink" : "text-ink/80"
                  }`}
                  style={{ fontFamily: `"${font.family}", sans-serif` }}
                >
                  <span className="truncate">{font.family}</span>
                  <span className="shrink-0 text-[9.5px] uppercase tracking-[0.1em] text-muted">
                    {font.category}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-2 py-3 text-[11.5px] text-muted">{t("text.noFonts")}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TextPanel({
  layers,
  selectedId,
  duration,
  time,
  onSelect,
  onChange,
  onAdd,
  onDelete,
  onDuplicate,
  onPreviewAnimation,
}: Props) {
  const { t } = useI18n();
  const layer = layers.find((item) => item.id === selectedId) ?? null;
  const maxEnd = Math.max(0.5, duration);
  const [copiedStyle, setCopiedStyle] = useState<LayerStyle | null>(null);

  const copyStyle = () => {
    if (!layer) return;
    setCopiedStyle(pickStyle(layer));
  };

  const pasteStyle = () => {
    if (!layer || !copiedStyle) return;
    onChange(layer.id, copiedStyle);
    void ensureFont(copiedStyle.fontFamily, copiedStyle.fontWeight);
  };

  useEffect(() => {
    for (const preset of TEXT_PRESETS) {
      void ensureFont(preset.patch.fontFamily, preset.patch.fontWeight);
    }
  }, []);

  return (
    <Panel
      title={t("text.title")}
      action={
        <button
          type="button"
          onClick={onAdd}
          className="focus-ring inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10.5px] font-medium text-ink transition hover:bg-ink/[0.03]"
        >
          <PlusIcon className="h-3 w-3" /> {t("text.addLayer")}
        </button>
      }
    >
      <div className="space-y-1.5">
        {layers.length === 0 && <EmptyHint>{t("text.empty")}</EmptyHint>}
        {layers.map((item) => {
          const active = time >= item.start && time <= item.end;
          return (
            <div
              key={item.id}
              className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
                item.id === selectedId
                  ? "border-ink/25 bg-ink/[0.03]"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="focus-ring flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    active ? "bg-emerald-500" : "bg-line-strong"
                  }`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium text-ink">
                    {item.text.trim() || t("text.untitled")}
                  </span>
                  <span className="block text-[10px] tabular-nums text-muted">
                    {formatTime(item.start, true)} – {formatTime(item.end, true)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDuplicate(item.id)}
                className="focus-ring rounded-md px-1 py-0.5 text-[10px] font-medium text-muted opacity-0 transition group-hover:opacity-100 hover:text-ink"
                aria-label={t("text.duplicateAria")}
              >
                {t("text.duplicate")}
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="focus-ring rounded-md p-1 text-muted transition hover:text-ink"
                aria-label={t("text.deleteAria")}
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {layer && (
        <>
          <Divider />
          <div className="space-y-3">
            <Field label={t("text.content")}>
              <textarea
                value={layer.text}
                onChange={(event) => onChange(layer.id, { text: event.target.value })}
                rows={2}
                className="input resize-none leading-snug"
                placeholder={t("text.placeholder")}
              />
            </Field>

            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-paper/50 p-1.5">
              <span className="min-w-0 flex-1 px-1 text-[10.5px] leading-snug text-muted">
                {copiedStyle ? t("text.styleCopied") : t("text.styleHint")}
              </span>
              <button
                type="button"
                onClick={copyStyle}
                className="focus-ring shrink-0 rounded-md border border-line bg-surface px-2 py-1 text-[10.5px] font-medium text-ink transition hover:bg-ink/[0.03]"
              >
                {t("text.copy")}
              </button>
              <button
                type="button"
                onClick={pasteStyle}
                disabled={!copiedStyle}
                className="focus-ring shrink-0 rounded-md border border-line bg-surface px-2 py-1 text-[10.5px] font-medium text-ink transition hover:bg-ink/[0.03] disabled:pointer-events-none disabled:opacity-40"
              >
                {t("text.paste")}
              </button>
            </div>

            <div>
              <div className="label mb-1.5">{t("text.presets")}</div>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {TEXT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={t("text.applyPreset", { name: preset.name })}
                    onClick={() => onChange(layer.id, preset.patch)}
                    className="focus-ring w-[62px] shrink-0 rounded-lg border border-line px-1 py-1.5 text-center transition hover:border-line-strong hover:bg-paper/60"
                  >
                    <span
                      className="block text-[17px] leading-6 text-ink"
                      style={{
                        fontFamily: `"${preset.patch.fontFamily}", sans-serif`,
                        fontWeight: preset.patch.fontWeight,
                        textTransform:
                          preset.patch.transform === "uppercase" ? "uppercase" : undefined,
                      }}
                    >
                      Aa
                    </span>
                    <span className="mt-0.5 block truncate text-[9.5px] text-muted">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Field label={t("text.font")}>
              <FontPicker
                value={layer.fontFamily}
                onChange={(fontFamily) => onChange(layer.id, { fontFamily })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label={t("text.size")} hint={`${layer.fontSize}px`}>
                <input
                  type="number"
                  min={8}
                  max={320}
                  value={layer.fontSize}
                  onChange={(event) =>
                    onChange(layer.id, {
                      fontSize: clamp(Number(event.target.value) || 8, 8, 320),
                    })
                  }
                  className="input tabular-nums"
                />
              </Field>
              <Field label={t("text.weight")}>
                <select
                  value={layer.fontWeight}
                  onChange={(event) =>
                    onChange(layer.id, { fontWeight: Number(event.target.value) })
                  }
                  className="input"
                >
                  {FONT_WEIGHTS.map((weight) => (
                    <option key={weight} value={weight}>
                      {weight}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label={t("text.kerning")} hint={`${layer.letterSpacing}px`}>
                <input
                  type="range"
                  min={-12}
                  max={40}
                  step={0.5}
                  value={layer.letterSpacing}
                  onChange={(event) =>
                    onChange(layer.id, { letterSpacing: Number(event.target.value) })
                  }
                  className="focus-ring rounded-full"
                />
              </Field>
              <Field label={t("text.lineHeight")} hint={layer.lineHeight.toFixed(2)}>
                <input
                  type="range"
                  min={0.7}
                  max={2.4}
                  step={0.01}
                  value={layer.lineHeight}
                  onChange={(event) =>
                    onChange(layer.id, { lineHeight: Number(event.target.value) })
                  }
                  className="focus-ring rounded-full"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ColorField
                label={t("text.color")}
                value={layer.color}
                onChange={(color) => onChange(layer.id, { color })}
              />
              <ColorField
                label={t("text.outlineColor")}
                value={layer.outlineColor}
                onChange={(outlineColor) => onChange(layer.id, { outlineColor })}
              />
            </div>

            <SliderField
              label={t("text.outlineWidth")}
              value={layer.outlineWidth}
              min={0}
              max={24}
              step={0.5}
              onChange={(outlineWidth) => onChange(layer.id, { outlineWidth })}
              suffix="px"
            />

            <div className="grid grid-cols-2 gap-2">
              <FieldGroup label={t("text.letterCase")}>
                <Segmented<TextTransform>
                  value={layer.transform}
                  onChange={(transform) => onChange(layer.id, { transform })}
                  options={[
                    { value: "none", label: "Aa" },
                    { value: "uppercase", label: "AA" },
                    { value: "lowercase", label: "aa" },
                  ]}
                />
              </FieldGroup>
              <FieldGroup label={t("text.align")}>
                <Segmented<TextAlign>
                  value={layer.align}
                  onChange={(align) => onChange(layer.id, { align })}
                  options={[
                    { value: "left", label: t("text.left") },
                    { value: "center", label: t("text.center") },
                    { value: "right", label: t("text.right") },
                  ]}
                />
              </FieldGroup>
            </div>

            <UseTiming layer={layer} duration={duration} maxEnd={maxEnd} onChange={onChange} />

            <Field label={t("text.enter")} hint="Typeframes">
              <select
                value={layer.enter}
                aria-label={t("text.enter")}
                onChange={(event) => {
                  const enter = event.target.value as TextAnimation;
                  onChange(layer.id, { enter });
                  if (enter !== "none") onPreviewAnimation(layer.id, "enter");
                }}
                className="input"
              >
                <option value="none">{t("text.noAnimation")}</option>
                <option value="fade">Fade</option>
                <option value="pop">Pop</option>
                <option value="slide">Slide</option>
                <optgroup label="Typeframes">
                  {TYPE_ANIMATIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>

            <FieldGroup label={t("text.exit")}>
              <Segmented<TextAnimation>
                value={layer.exit}
                onChange={(exit) => {
                  onChange(layer.id, { exit });
                  if (exit !== "none") onPreviewAnimation(layer.id, "exit");
                }}
                options={[
                  { value: "none", label: t("text.exitNone") },
                  { value: "fade", label: "Fade" },
                  { value: "pop", label: "Pop" },
                  { value: "slide", label: "Slide" },
                ]}
              />
            </FieldGroup>

            <SliderField
              label={t("text.animDuration")}
              value={layer.animDuration}
              min={0.1}
              max={1.5}
              step={0.05}
              onChange={(animDuration) => onChange(layer.id, { animDuration })}
              format={(value) => `${value.toFixed(2)}s`}
            />

            <div className="grid grid-cols-2 gap-2">
              <SliderField
                label={t("text.x")}
                value={Math.round(layer.x * 100)}
                min={0}
                max={100}
                onChange={(value) => onChange(layer.id, { x: value / 100 })}
                suffix="%"
              />
              <SliderField
                label={t("text.y")}
                value={Math.round(layer.y * 100)}
                min={0}
                max={100}
                onChange={(value) => onChange(layer.id, { y: value / 100 })}
                suffix="%"
              />
            </div>

            <SliderField
              label={t("text.maxWidth")}
              value={Math.round(layer.maxWidth * 100)}
              min={30}
              max={100}
              onChange={(value) => onChange(layer.id, { maxWidth: value / 100 })}
              suffix="%"
            />

            <button
              type="button"
              onClick={() => onChange(layer.id, { x: 0.5, y: 0.5 })}
              className="btn w-full"
            >
              {t("text.centerCanvas")}
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}

function UseTiming({
  layer,
  duration,
  maxEnd,
  onChange,
}: {
  layer: TextLayer;
  duration: number;
  maxEnd: number;
  onChange: (id: string, patch: Partial<TextLayer>) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label={t("text.showAt")} hint={formatTime(layer.start, true)}>
        <input
          type="number"
          min={0}
          max={Math.max(0, layer.end - 0.1)}
          step={0.1}
          value={Number(layer.start.toFixed(2))}
          onChange={(event) => {
            const start = clamp(Number(event.target.value) || 0, 0, Math.max(0, duration - 0.1));
            onChange(layer.id, { start, end: Math.max(start + 0.1, layer.end) });
          }}
          className="input tabular-nums"
        />
      </Field>
      <Field label={t("text.hideAt")} hint={formatTime(layer.end, true)}>
        <input
          type="number"
          min={layer.start + 0.1}
          max={maxEnd}
          step={0.1}
          value={Number(layer.end.toFixed(2))}
          onChange={(event) => {
            const end = clamp(
              Number(event.target.value) || 0,
              layer.start + 0.1,
              Math.max(layer.start + 0.1, maxEnd),
            );
            onChange(layer.id, { end });
          }}
          className="input tabular-nums"
        />
      </Field>
    </div>
  );
}
