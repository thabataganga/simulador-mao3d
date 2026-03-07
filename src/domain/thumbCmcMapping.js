import { RANGES, THUMB_CMC } from "../constants";
import { clamp, deg2rad } from "../utils";

export function clampClinicalCmc(thumb) {
  return {
    CMC_abd: clamp(thumb.CMC_abd, RANGES.CMC_ABD),
    CMC_flex: clamp(thumb.CMC_flex, RANGES.CMC_FLEX),
    CMC_opp: clamp(thumb.CMC_opp, RANGES.CMC_OPP),
  };
}

export function mapClinicalCmcToRigAngles(thumb) {
  const t = clampClinicalCmc(thumb);
  const flexClinical = clamp(t.CMC_flex, THUMB_CMC.FLEX_EFFECTIVE_RANGE);

  // Composite opposition: modifies CMC abd/flex plus derived pronation.
  const cmcAbd = t.CMC_abd + t.CMC_opp * THUMB_CMC.OPP_COUPLING.ABD_GAIN;
  const cmcFlex = flexClinical + t.CMC_opp * THUMB_CMC.OPP_COUPLING.FLEX_GAIN;
  const cmcPronation = t.CMC_opp * THUMB_CMC.OPP_COUPLING.PRONATION_GAIN;

  return {
    clinical: t,
    cmcAbd,
    cmcFlex,
    cmcPronation,
  };
}

export function mapClinicalCmcToRigRadians(thumb) {
  const a = mapClinicalCmcToRigAngles(thumb);
  return {
    ...a,
    radians: {
      cmcAbd: deg2rad(a.cmcAbd),
      cmcFlex: deg2rad(a.cmcFlex),
      cmcPronation: deg2rad(a.cmcPronation),
    },
  };
}
