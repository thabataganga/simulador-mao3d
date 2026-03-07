import { RANGES, WRIST_SLIDER_CONFIG } from "../constants";
import { LabeledSlider } from "./LabeledSlider";

export function WristPanel({ wrist, onWrist, onHighlight, onClearPreset }) {
  return WRIST_SLIDER_CONFIG.map(item => {
    const [min, max] = RANGES[item.rangeKey];

    return (
      <LabeledSlider
        key={item.key}
        label={`${item.label} (${min}..+${max})`}
        min={min}
        max={max}
        value={wrist[item.key]}
        onChange={value => {
          onWrist(prev => ({ ...prev, [item.key]: value }));
          onClearPreset();
        }}
        leftHint={item.leftHint}
        rightHint={item.rightHint}
        onHighlight={() => onHighlight(item.debugKey)}
      />
    );
  });
}
