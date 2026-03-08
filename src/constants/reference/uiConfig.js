import { RANGES } from "./biomechanics";

export const THUMB_SLIDER_CONFIG = [
  {
    key: "CMC_abd",
    label: "CMC Abd/Aducao",
    rangeKey: "CMC_ABD",
    leftHint: "Aducao (-)",
    rightHint: "Abducao (+)",
    debugKey: "TH_CMC_ABD",
  },
  {
    key: "CMC_flex",
    label: "CMC Flexao",
    rangeKey: "CMC_FLEX",
    leftHint: "Extensao (-)",
    rightHint: "Flexao (+)",
    debugKey: "TH_CMC_FLEX",
  },
  {
    key: "CMC_opp",
    label: "CMC Oposicao",
    rangeKey: "CMC_OPP",
    leftHint: "Retroposicao (-)",
    rightHint: "Oposicao (+)",
    debugKey: "TH_CMC_OPP",
  },
  {
    key: "MCP_flex",
    label: "MCP Flexao",
    rangeKey: "THUMB_MCP_FLEX",
    leftHint: null,
    rightHint: "Flexao (+)",
    debugKey: "TH_MCP",
  },
  {
    key: "IP",
    label: "IP",
    rangeKey: "THUMB_IP",
    leftHint: "Extensao (-)",
    rightHint: "Flexao (+)",
    debugKey: "TH_IP",
  },
];

export const WRIST_SLIDER_CONFIG = [
  {
    key: "flex",
    label: "Flexao/Extensao",
    rangeKey: "WRIST_FLEX",
    leftHint: "Extensao (-)",
    rightHint: "Flexao (+)",
    debugKey: "WR_FLEX",
  },
  {
    key: "dev",
    label: "Desvio radial/ulnar",
    rangeKey: "WRIST_DEV",
    leftHint: "Ulnar (-)",
    rightHint: "Radial (+)",
    debugKey: "WR_DEV",
  },
];

export function getRangeByKey(rangeKey) {
  return RANGES[rangeKey];
}

