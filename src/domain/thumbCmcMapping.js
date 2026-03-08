import { RANGES, THUMB_CMC } from "../constants/biomechanics";
import { clamp, deg2rad } from "../utils/math/core";

export function getCmcCommandRange(axis) {
  const oppMin = RANGES.CMC_OPP[0];
  const oppMax = RANGES.CMC_OPP[1];

  if (axis === "CMC_abd") {
    const gain = THUMB_CMC.CLINICAL_ABD_SIGN * THUMB_CMC.OPP_COUPLING.ABD_GAIN;
    const min = Math.floor(Math.min(RANGES.CMC_ABD[0] - gain * oppMin, RANGES.CMC_ABD[0] - gain * oppMax));
    const max = Math.ceil(Math.max(RANGES.CMC_ABD[1] - gain * oppMin, RANGES.CMC_ABD[1] - gain * oppMax));
    return [min, max];
  }

  if (axis === "CMC_flex") {
    const gain = THUMB_CMC.OPP_COUPLING.FLEX_GAIN;
    const min = Math.floor(Math.min(RANGES.CMC_FLEX[0] - gain * oppMin, RANGES.CMC_FLEX[0] - gain * oppMax));
    const max = Math.ceil(Math.max(RANGES.CMC_FLEX[1] - gain * oppMin, RANGES.CMC_FLEX[1] - gain * oppMax));
    return [min, max];
  }

  return RANGES[axis];
}

export function clampClinicalCmc(thumb) {
  const [abdMin, abdMax] = getCmcCommandRange("CMC_abd");
  const [flexMin, flexMax] = getCmcCommandRange("CMC_flex");

  return {
    CMC_abd: clamp(thumb.CMC_abd, [abdMin, abdMax]),
    CMC_flex: clamp(thumb.CMC_flex, [flexMin, flexMax]),
    CMC_opp: clamp(thumb.CMC_opp, RANGES.CMC_OPP),
  };
}

export function mapClinicalCmcToRigAngles(thumb) {
  const t = clampClinicalCmc(thumb);
  const flexClinical = t.CMC_flex;

  // Keep clinical convention from UI: +abduction, -adduction.
  const cmcAbd = THUMB_CMC.CLINICAL_ABD_SIGN * t.CMC_abd + t.CMC_opp * THUMB_CMC.OPP_COUPLING.ABD_GAIN;
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




