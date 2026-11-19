export function formatTime(seconds: number, withTenths = false) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  if (!withTenths) {
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  // Round to tenths first so 3.4 does not print as 3.3 from float error.
  const total = Math.round(safe * 10);
  const m = Math.floor(total / 600);
  const s = Math.floor((total % 600) / 10);
  const tenths = total % 10;
  return `${m}:${String(s).padStart(2, "0")}.${tenths}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

let counter = 0;
export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter}`;
}
