"use client";

import type { ReactNode } from "react";
import { clamp } from "@/lib/format";

export function Panel({
  title,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {title && (
        <header className="flex h-10 items-center justify-between border-b border-line px-3.5">
          <h2 className="label">{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? "p-3.5" : ""}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        {hint && <span className="text-[10.5px] tabular-nums text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function FieldGroup({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        {hint && <span className="text-[10.5px] tabular-nums text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
  format?: (value: number) => string;
}) {
  return (
    <Field label={label} hint={`${format ? format(value) : value}${suffix}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="focus-ring rounded-full"
      />
    </Field>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  full = true,
}: {
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  full?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg border border-line bg-paper/70 p-0.5 ${
        full ? "flex w-full" : ""
      }`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`focus-ring flex-1 rounded-[6px] px-2 py-1 text-[11.5px] font-medium transition ${
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(20,20,25,0.08)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-ink">{label}</div>
        {description && (
          <div className="mt-0.5 text-[11px] leading-snug text-muted">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`focus-ring relative h-[22px] w-[38px] shrink-0 rounded-full border transition ${
          checked ? "border-ink bg-ink" : "border-line-strong bg-paper"
        }`}
      >
        <span
          className={`absolute top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full bg-paper shadow-sm transition-all ${
            checked ? "left-[19px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} hint={value.toUpperCase()}>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-1.5 py-1">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-7 rounded-md"
          aria-label={label}
        />
        <input
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(next)) onChange(next);
          }}
          className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] uppercase text-ink outline-none"
          spellCheck={false}
        />
      </div>
    </Field>
  );
}

export function Divider() {
  return <div className="my-3 h-px bg-line" />;
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-[11.5px] leading-relaxed text-muted">{children}</p>;
}
