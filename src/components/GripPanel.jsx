import { LabeledSlider } from "./LabeledSlider";

export function GripPanel({ grip, globalMode, onGrip }) {
  return (
    <LabeledSlider
      label={globalMode === "pinch" ? "Fechamento (pinça) 0-100" : "Fechamento (funcional) 0-100"}
      min={0}
      max={100}
      value={grip}
      onChange={onGrip}
    />
  );
}
