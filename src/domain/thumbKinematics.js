import { RANGES, THUMB_KINEMATICS } from "../constants";
import { clamp, deg2rad } from "../utils";
import { mapClinicalCmcToRigAngles } from "./thumbCmcMapping";

function clampClinicalThumb(thumb) {
  return {
    CMC_abd: clamp(thumb.CMC_abd, RANGES.CMC_ABD),
    CMC_flex: clamp(thumb.CMC_flex, RANGES.CMC_FLEX),
    CMC_opp: clamp(thumb.CMC_opp, RANGES.CMC_OPP),
    MCP_flex: clamp(thumb.MCP_flex, RANGES.THUMB_MCP_FLEX),
    IP: clamp(thumb.IP, RANGES.THUMB_IP),
  };
}

export function mapClinicalThumbToRigAngles(thumb) {
  const t = clampClinicalThumb(thumb);
  const cmc = mapClinicalCmcToRigAngles(t);
  const mcpAccessory = t.MCP_flex * THUMB_KINEMATICS.MCP_ACCESSORY_GAIN;

  return {
    clinical: t,
    cmcAbd: cmc.cmcAbd,
    cmcFlex: cmc.cmcFlex,
    cmcPronation: cmc.cmcPronation,
    mcpFlex: t.MCP_flex,
    mcpAccessory,
    ipFlex: t.IP,
  };
}

export function mapClinicalThumbToRigRadians(thumb) {
  const a = mapClinicalThumbToRigAngles(thumb);
  return {
    ...a,
    radians: {
      cmcAbd: deg2rad(a.cmcAbd),
      cmcFlex: deg2rad(a.cmcFlex),
      cmcPronation: deg2rad(a.cmcPronation),
      mcpFlex: deg2rad(a.mcpFlex),
      mcpAccessory: deg2rad(a.mcpAccessory),
      ipFlex: deg2rad(a.ipFlex),
    },
  };
}
