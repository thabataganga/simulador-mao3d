import { RANGES, THUMB_KINEMATICS } from "../constants/biomechanics";
import { clamp, deg2rad } from "../utils/math/core";
import { clampClinicalCmc, mapClinicalCmcToRigAngles } from "./thumbCmcMapping";

function clampClinicalThumb(thumb) {
  const cmc = clampClinicalCmc(thumb);
  return {
    CMC_flexExt: cmc.CMC_flexExt,
    CMC_abdAdd: cmc.CMC_abdAdd,
    CMC_opp: cmc.CMC_opp,
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
    cmcFlexExt: cmc.cmcFlexExt,
    cmcAbdAdd: cmc.cmcAbdAdd,
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
      cmcFlexExt: deg2rad(a.cmcFlexExt),
      cmcAbdAdd: deg2rad(a.cmcAbdAdd),
      cmcPronation: deg2rad(a.cmcPronation),
      mcpFlex: deg2rad(a.mcpFlex),
      mcpAccessory: deg2rad(a.mcpAccessory),
      ipFlex: deg2rad(a.ipFlex),
    },
  };
}




