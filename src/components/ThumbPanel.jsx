import { RANGES, THUMB_SLIDER_CONFIG } from "../constants";
import { LabeledSlider } from "./LabeledSlider";

function DirectionMagnitudeSlider({
  label,
  axis,
  clinical,
  positiveDirection,
  negativeDirection,
  min,
  max,
  onApply,
  onHighlight,
  negativeFirst = false,
}) {
  const selectedDirection = clinical.inputDirection;
  const inputMagnitude = clinical.inputMagnitudeDeg;
  const maxByDirection = selectedDirection === positiveDirection ? max : Math.abs(min);

  const apply = (direction, magnitudeRaw) => {
    const directionMax = direction === positiveDirection ? max : Math.abs(min);
    const magnitude = Math.min(Math.max(Number(magnitudeRaw) || 0, 0), directionMax);
    onApply(axis, direction, magnitude);
  };

  const directionOptions = negativeFirst
    ? [negativeDirection, positiveDirection]
    : [positiveDirection, negativeDirection];

  return (
    <div className="mb-3 border border-gray-200 rounded-md p-2">
      <div className="text-sm font-medium mb-2">{label}</div>

      <div className="mb-2 flex items-center gap-4 text-sm">
        {directionOptions.map(direction => (
          <label key={direction} className="inline-flex items-center gap-1">
            <input
              type="radio"
              name={`${axis}-direction`}
              value={direction}
              checked={selectedDirection === direction}
              onChange={e => {
                apply(e.target.value, inputMagnitude);
                onHighlight?.();
              }}
            />
            <span>{direction}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <input
          type="number"
          min={0}
          max={maxByDirection}
          step={1}
          value={inputMagnitude}
          onChange={e => apply(selectedDirection, Number(e.target.value))}
          onFocus={() => onHighlight?.()}
          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right"
        />
        <span className="text-sm">deg</span>
      </div>

      <input
        type="range"
        min={0}
        max={maxByDirection}
        step={1}
        value={inputMagnitude}
        onChange={e => {
          apply(selectedDirection, Number(e.target.value));
          onHighlight?.();
        }}
        className="w-full"
      />

      <div className="mt-1 text-xs text-gray-600">
        Medida goniometrica: <strong>{clinical.direction} {clinical.magnitudeDeg}deg</strong>
      </div>
      {clinical.saturated && (
        <div className="mt-1 text-[11px] text-amber-700">Ajuste limitado pelo range/articulacao.</div>
      )}
    </div>
  );
}

export function ThumbPanel({ thumb, thumbGoniometry, onThumbVal, onThumbCmcInput, onHighlight, onClearPreset }) {
  const panelOrder = ["CMC_flex", "CMC_abd", "CMC_opp", "MCP_flex", "IP"];
  const orderedItems = panelOrder
    .map(key => THUMB_SLIDER_CONFIG.find(item => item.key === key))
    .filter(Boolean);

  return orderedItems.map(item => {
    const [min, max] = RANGES[item.rangeKey];

    if (item.key === "CMC_abd") {
      return (
        <DirectionMagnitudeSlider
          key={item.key}
          axis="CMC_abd"
          label="CMC Abd/Aducao"
          clinical={thumbGoniometry.abd}
          positiveDirection="abducao"
          negativeDirection="aducao"
          min={min}
          max={max}
          onApply={(axis, direction, magnitude) => {
            onThumbCmcInput(axis, direction, magnitude);
            onClearPreset();
          }}
          onHighlight={() => onHighlight(item.debugKey)}
        />
      );
    }

    if (item.key === "CMC_flex") {
      return (
        <DirectionMagnitudeSlider
          key={item.key}
          axis="CMC_flex"
          label="CMC Flexao/Extensao"
          clinical={thumbGoniometry.flex}
          positiveDirection="flexao"
          negativeDirection="extensao"
          min={min}
          max={max}
          onApply={(axis, direction, magnitude) => {
            onThumbCmcInput(axis, direction, magnitude);
            onClearPreset();
          }}
          onHighlight={() => onHighlight(item.debugKey)}
          negativeFirst
        />
      );
    }

    return (
      <LabeledSlider
        key={item.key}
        label={`${item.label} (${min}..${max >= 0 ? `+${max}` : max})`}
        min={min}
        max={max}
        value={thumb[item.key]}
        onChange={value => {
          onThumbVal(item.key, value);
          onClearPreset();
        }}
        leftHint={item.leftHint}
        rightHint={item.rightHint}
        onHighlight={() => onHighlight(item.debugKey)}
      />
    );
  });
}
