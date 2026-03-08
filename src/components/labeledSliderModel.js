import { clamp } from "../utils";

export function normalizeSliderInput(temp, value, step, min, max) {
  if (String(temp).trim() === "") return String(value);
  const n = Number(temp);
  if (!Number.isFinite(n)) return String(value);
  const next = clamp(Math.round(n / step) * step, [min, max]);
  return String(next);
}
