import { RANGES } from "../constants";
import { LabeledSlider } from "./LabeledSlider";

const THUMB_SLIDERS = [
  { k: "CMC_abd", lbl: "CMC Abd/Adução", min: RANGES.CMC_ABD[0], max: RANGES.CMC_ABD[1], L: "Adução (-)", R: "Abdução (+)", dbk: "TH_CMC_ABD" },
  { k: "CMC_flex", lbl: "CMC Flexão", min: RANGES.CMC_FLEX[0], max: RANGES.CMC_FLEX[1], L: "Extensão (-)", R: "Flexão (+)", dbk: "TH_CMC_FLEX" },
  { k: "CMC_opp", lbl: "CMC Oposição", min: RANGES.CMC_OPP[0], max: RANGES.CMC_OPP[1], L: "Retroposição (-)", R: "Oposição (+)", dbk: "TH_CMC_OPP" },
  { k: "MCP_flex", lbl: "MCP Flexão", min: RANGES.THUMB_MCP_FLEX[0], max: RANGES.THUMB_MCP_FLEX[1], L: null, R: "Flexão (+)", dbk: "TH_MCP" },
  { k: "IP", lbl: "IP", min: RANGES.THUMB_IP[0], max: RANGES.THUMB_IP[1], L: "Extensão (-)", R: "Flexão (+)", dbk: "TH_IP" },
];

export function ThumbPanel({ thumb, onThumbVal, onHighlight, onClearPreset }) {
  return THUMB_SLIDERS.map(c => (
    <LabeledSlider
      key={c.k}
      label={`${c.lbl} (${c.min}..${c.max >= 0 ? `+${c.max}` : c.max})`}
      min={c.min}
      max={c.max}
      value={thumb[c.k]}
      onChange={v => { onThumbVal(c.k, v); onClearPreset(); }}
      leftHint={c.L}
      rightHint={c.R}
      onHighlight={() => onHighlight(c.dbk)}
    />
  ));
}

