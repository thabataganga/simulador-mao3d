import { RANGES } from "./biomechanics";
import { TH_CMC_FLEX_EXT_DEBUG_KEY, TH_CMC_ABD_ADD_DEBUG_KEY, OPPOSITION_DEBUG_KEY } from "./debugKeys";

export const THUMB_SLIDER_CONFIG = [
  {
    key: "CMC_flexExt",
    label: "CMC Flexao/Extensao",
    rangeKey: "CMC_FLEX_EXT",
    leftHint: "Extensao (-)",
    rightHint: "Flexao (+)",
    debugKey: TH_CMC_FLEX_EXT_DEBUG_KEY,
  },
  {
    key: "CMC_abdAdd",
    label: "CMC Abd/Aducao",
    rangeKey: "CMC_ABD_ADD",
    leftHint: "Aducao (-)",
    rightHint: "Abducao (+)",
    debugKey: TH_CMC_ABD_ADD_DEBUG_KEY,
  },
  {
    key: "CMC_opp",
    label: "CMC Oposicao",
    rangeKey: "CMC_OPP",
    leftHint: "Retroposicao (-)",
    rightHint: "Oposicao (+)",
    debugKey: OPPOSITION_DEBUG_KEY,
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