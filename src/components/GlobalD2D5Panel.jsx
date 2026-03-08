import { RANGES } from "../constants/reference/biomechanics";
import { LabeledSlider } from "./LabeledSlider";

const SLIDERS = [
  { k: "MCP", L: "Extensao (-)", R: "Flexao (+)", dbk: "GLOBAL_MCP" },
  { k: "PIP", L: null, R: "Flexao (+)", dbk: "GLOBAL_PIP" },
  { k: "DIP", L: "Extensao (-)", R: "Flexao (+)", dbk: "GLOBAL_DIP" },
];

export function GlobalD2D5Panel({ globalD2D5, onUpdate, onHighlight, onClearPreset }) {
  return (
    <>
      <p className="text-xs text-gray-500 mb-3">Move todos os dedos (D2 a D5) simultaneamente.</p>
      {SLIDERS.map(({ k, L, R, dbk }) => (
        <LabeledSlider
          key={k}
          label={`${k} D2-D5 (${RANGES[k][0]}..+${RANGES[k][1]})`}
          min={RANGES[k][0]}
          max={RANGES[k][1]}
          value={globalD2D5[k]}
          onChange={v => {
            onUpdate(k, v);
            onClearPreset();
          }}
          leftHint={L}
          rightHint={R}
          onHighlight={() => onHighlight(dbk)}
        />
      ))}
    </>
  );
}



