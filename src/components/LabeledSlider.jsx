import { useEffect, useState } from "react";
import { normalizeSliderInput } from "./labeledSliderModel";

export function LabeledSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  leftHint,
  rightHint,
  disabled,
  onHighlight,
  unit = "deg",
}) {
  const [temp, setTemp] = useState(value);
  useEffect(() => setTemp(value), [value]);

  const commit = () => {
    const normalized = normalizeSliderInput(temp, value, step, min, max);
    setTemp(normalized);
    if (normalized === String(value) && !Number.isFinite(Number(temp))) return;
    onChange(Number(normalized));
    onHighlight?.();
  };

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm font-medium mb-1">
        <span>{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={temp}
            onChange={e => setTemp(e.target.value)}
            onFocus={() => onHighlight?.()}
            onBlur={commit}
            onKeyDown={e => e.key === "Enter" && commit()}
            disabled={disabled}
            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right disabled:opacity-60"
          />
          <span>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          onChange(Number(e.target.value));
          onHighlight?.();
        }}
        disabled={disabled}
        className="w-full disabled:opacity-60"
      />
      {(leftHint || rightHint) && (
        <div className="flex justify-between text-[11px] text-gray-500 mt-1">
          <span>{leftHint || ""}</span>
          <span>{rightHint || ""}</span>
        </div>
      )}
    </div>
  );
}
