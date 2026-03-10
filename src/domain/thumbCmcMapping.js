import { RANGES, THUMB_CMC } from "../constants/biomechanics";
import { clamp, deg2rad } from "../utils/math/core";

export function getCmcCommandRange(axis) {
  const oppMin = RANGES.CMC_OPP[0];
  const oppMax = RANGES.CMC_OPP[1];

  if (axis === "CMC_flexExt") {
    const gain = THUMB_CMC.CLINICAL_FLEX_EXT_SIGN * THUMB_CMC.OPP_COUPLING.FLEX_EXT_GAIN;
    const min = Math.floor(Math.min(RANGES.CMC_FLEX_EXT[0] - gain * oppMin, RANGES.CMC_FLEX_EXT[0] - gain * oppMax));
    const max = Math.ceil(Math.max(RANGES.CMC_FLEX_EXT[1] - gain * oppMin, RANGES.CMC_FLEX_EXT[1] - gain * oppMax));
    return [min, max];
  }

  if (axis === "CMC_abdAdd") {
    const gain = THUMB_CMC.OPP_COUPLING.ABD_ADD_GAIN;
    const min = Math.floor(Math.min(RANGES.CMC_ABD_ADD[0] - gain * oppMin, RANGES.CMC_ABD_ADD[0] - gain * oppMax));
    const max = Math.ceil(Math.max(RANGES.CMC_ABD_ADD[1] - gain * oppMin, RANGES.CMC_ABD_ADD[1] - gain * oppMax));
    return [min, max];
  }

  return RANGES[axis];
}

export function clampClinicalCmc(thumb) {
  const [flexExtMin, flexExtMax] = getCmcCommandRange("CMC_flexExt");
  const [abdAddMin, abdAddMax] = getCmcCommandRange("CMC_abdAdd");

  return {
    CMC_flexExt: clamp(thumb.CMC_flexExt, [flexExtMin, flexExtMax]),
    CMC_abdAdd: clamp(thumb.CMC_abdAdd, [abdAddMin, abdAddMax]),
    CMC_opp: clamp(thumb.CMC_opp, RANGES.CMC_OPP),
  };
}

export function mapClinicalCmcToRigAngles(thumb) {
  const t = clampClinicalCmc(thumb);
  const abdAddClinical = t.CMC_abdAdd;

  // Keep clinical conventions from UI per renamed axis keys.
  const cmcFlexExt = THUMB_CMC.CLINICAL_FLEX_EXT_SIGN * t.CMC_flexExt + t.CMC_opp * THUMB_CMC.OPP_COUPLING.FLEX_EXT_GAIN;
  const cmcAbdAdd = abdAddClinical + t.CMC_opp * THUMB_CMC.OPP_COUPLING.ABD_ADD_GAIN;
  const cmcPronation = t.CMC_opp * THUMB_CMC.OPP_COUPLING.PRONATION_GAIN;

  return {
    clinical: t,
    cmcFlexExt,
    cmcAbdAdd,
    cmcPronation,
  };
}

export function mapClinicalCmcToRigRadians(thumb) {
  const a = mapClinicalCmcToRigAngles(thumb);
  return {
    ...a,
    radians: {
      cmcFlexExt: deg2rad(a.cmcFlexExt),
      cmcAbdAdd: deg2rad(a.cmcAbdAdd),
      cmcPronation: deg2rad(a.cmcPronation),
    },
  };
}




