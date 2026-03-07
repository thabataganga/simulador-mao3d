import { RANGES, THUMB_SLIDER_CONFIG } from "../constants";
import { LabeledSlider } from "./LabeledSlider";

export function ThumbPanel({ thumb, onThumbVal, onHighlight, onClearPreset }) {
  return THUMB_SLIDER_CONFIG.map(item => {
    const [min, max] = RANGES[item.rangeKey];

    return (
      <LabeledSlider
        key={item.key}
        label={`${item.label} (${min}..${max >= 0 ? `+${max}` : max})`}
        min={min}
        max={max}
        value={thumb[item.key]}
        onChange={value => { onThumbVal(item.key, value); onClearPreset(); }}
        leftHint={item.leftHint}
        rightHint={item.rightHint}
        onHighlight={() => onHighlight(item.debugKey)}
      />
    );
  });
}
