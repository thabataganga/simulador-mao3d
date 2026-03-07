import { RANGES } from "../constants";
import { LabeledSlider } from "./LabeledSlider";

export function WristPanel({ wrist, onWrist, onHighlight, onClearPreset }) {
  return (
    <>
      <LabeledSlider
        label={`Flexão/Extensão (${RANGES.WRIST_FLEX[0]}..+${RANGES.WRIST_FLEX[1]})`}
        min={RANGES.WRIST_FLEX[0]} max={RANGES.WRIST_FLEX[1]}
        value={wrist.flex}
        onChange={v => { onWrist(w => ({ ...w, flex: v })); onClearPreset(); }}
        leftHint="Extensão (−)" rightHint="Flexão (+)"
        onHighlight={() => onHighlight("WR_FLEX")}
      />
      <LabeledSlider
        label={`Desvio radial/ulnar (${RANGES.WRIST_DEV[0]}..+${RANGES.WRIST_DEV[1]})`}
        min={RANGES.WRIST_DEV[0]} max={RANGES.WRIST_DEV[1]}
        value={wrist.dev}
        onChange={v => { onWrist(w => ({ ...w, dev: v })); onClearPreset(); }}
        leftHint="Ulnar (−)" rightHint="Radial (+)"
        onHighlight={() => onHighlight("WR_DEV")}
      />
    </>
  );
}