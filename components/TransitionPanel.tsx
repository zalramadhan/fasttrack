"use client";

import { CATEGORY_ORDER, TRANSITIONS } from "@/lib/transitions";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { MAX_TRANSITION, type Clip, type ClipTransition, type TimelineItem } from "@/lib/types";
import { PlayIcon } from "./icons";
import { Panel } from "./ui";

type Props = {
  clips: Clip[];
  timeline: TimelineItem[];
  onChange: (key: string, transition: ClipTransition) => void;
  onPreview: (key: string) => void;
};

export default function TransitionPanel({ clips, timeline, onChange, onPreview }: Props) {
  const { t } = useI18n();
  if (clips.length < 2) return null;

  return (
    <Panel
      title={t("transition.title")}
      action={
        <span className="font-mono text-[11px] font-medium tabular-nums text-muted">
          {t(clips.length === 2 ? "transition.seamsOne" : "transition.seams", {
            count: clips.length - 1,
          })}
        </span>
      }
    >
      <div className="space-y-2">
        {clips.slice(1).map((clip, offset) => {
          const index = offset + 1;
          const item = timeline[index];
          const active = clip.transition.type !== "none" && item.transitionIn > 0;
          const clamped = active && item.transitionIn < clip.transition.duration - 0.01;

          return (
            <div key={clip.key} className="rounded-[10px] border border-line bg-paper/45 px-2.5 py-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium text-ink">
                  <span className="font-mono text-[10px] tabular-nums text-muted">{index}</span>
                  <span className="text-muted">→</span>
                  <span className="font-mono text-[10px] tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <span className="truncate">
                    {active ? labelFor(clip.transition.type) : t("transition.cut")}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-accent">
                  {active ? `${item.transitionIn.toFixed(2)}s` : "—"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={clip.transition.type}
                  onChange={(event) =>
                    onChange(clip.key, {
                      type: event.target.value,
                      duration: clip.transition.duration,
                    })
                  }
                  className="input py-1 text-[11.5px]"
                  aria-label={t("transition.clipAria", { n: index + 1 })}
                >
                  <option value="none">{t("transition.none")}</option>
                  {CATEGORY_ORDER.map((category) => (
                    <optgroup
                      key={category}
                      label={t(`transition.category.${category}` as MessageKey)}
                    >
                      {TRANSITIONS.filter((effect) => effect.category === category).map(
                        (effect) => (
                          <option key={effect.id} value={effect.id}>
                            {effect.name}
                          </option>
                        ),
                      )}
                    </optgroup>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onPreview(clip.key)}
                  disabled={!active}
                  className="focus-ring grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-line bg-surface text-accent transition hover:border-accent/55 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                  aria-label={t("transition.previewAria")}
                  title={t("transition.previewAria")}
                >
                  <PlayIcon className="h-3 w-3" />
                </button>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="range"
                  min={0.2}
                  max={MAX_TRANSITION}
                  step={0.1}
                  value={clip.transition.duration}
                  disabled={!active}
                  onChange={(event) =>
                    onChange(clip.key, {
                      type: clip.transition.type,
                      duration: Number(event.target.value),
                    })
                  }
                  className="focus-ring disabled:opacity-40"
                  aria-label={t("transition.durationAria", { n: index + 1 })}
                />
                <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted">
                  {clip.transition.duration.toFixed(1)}s
                </span>
              </div>

              {clamped && (
                <p className="mt-1 text-[10px] leading-snug text-muted">
                  {t("transition.clamped", { seconds: item.transitionIn.toFixed(2) })}
                </p>
              )}
            </div>
          );
        })}
        <p className="text-[10.5px] leading-relaxed text-muted">
          {t("transition.note")}
        </p>
      </div>
    </Panel>
  );
}

function labelFor(type: string) {
  return TRANSITIONS.find((effect) => effect.id === type)?.name ?? type;
}
