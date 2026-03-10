import { Vector3 } from "three";
import { THUMB_CMC } from "../constants/biomechanics";
import { toPalmFrameVector } from "./thumbFrameUtils";

const RAD_TO_DEG = 180 / Math.PI;

function projectOnPlane(vector, planeNormal) {
  const normal = planeNormal.clone().normalize();
  return vector.clone().sub(normal.multiplyScalar(vector.dot(normal)));
}

function signedAngleOnPlane(from, to, planeNormal) {
  const fromLen = from.length();
  const toLen = to.length();
  if (fromLen < 1e-6 || toLen < 1e-6) return 0;

  const fromUnit = from.clone().multiplyScalar(1 / fromLen);
  const toUnit = to.clone().multiplyScalar(1 / toLen);
  const angle = fromUnit.angleTo(toUnit);
  const cross = new Vector3().crossVectors(fromUnit, toUnit);
  const sign = Math.sign(cross.dot(planeNormal)) || 1;
  return angle * RAD_TO_DEG * sign;
}

function normalizeSignedZero(value) {
  return Object.is(value, -0) ? 0 : value;
}

function toRoundedDeg(radians) {
  return normalizeSignedZero(Math.round((Number(radians) || 0) * RAD_TO_DEG));
}

function toRoundedNumber(value) {
  return normalizeSignedZero(Math.round(Number(value) || 0));
}

function readComposedFromRig(rig) {
  const flexExtRad = rig?.thumb?.cmcFlexExt?.rotation?.z;
  const abdAddRad = rig?.thumb?.cmcAbdAdd?.rotation?.y;
  if (typeof flexExtRad === "number" && typeof abdAddRad === "number") {
    return {
      CMC_flexExt: toRoundedDeg(flexExtRad),
      CMC_abdAdd: toRoundedDeg(abdAddRad),
    };
  }

  const cmcOrigin = rig?.thumb?.cmcFlexExt?.getWorldPosition?.(new Vector3());
  const thumbMcp = rig?.thumb?.mcp?.getWorldPosition?.(new Vector3());
  const d2Mcp = rig?.fingers?.[0]?.mcp?.getWorldPosition?.(new Vector3());
  const d2Pip = rig?.fingers?.[0]?.pip?.getWorldPosition?.(new Vector3());
  if (!cmcOrigin || !thumbMcp || !d2Mcp || !d2Pip || !rig?.palm) return null;

  const mobileWorld = thumbMcp.clone().sub(cmcOrigin);
  const fixedWorld = d2Pip.clone().sub(d2Mcp);

  const mobilePalm = toPalmFrameVector(rig.palm, mobileWorld);
  const fixedPalm = toPalmFrameVector(rig.palm, fixedWorld);

  const palmNormal = new Vector3(0, 1, 0);
  const palmTransverse = new Vector3(0, 0, 1);

  const fixedAbdPlane = projectOnPlane(fixedPalm, palmNormal);
  const mobileAbdPlane = projectOnPlane(mobilePalm, palmNormal);
  const abdAddMeasured = -signedAngleOnPlane(fixedAbdPlane, mobileAbdPlane, palmNormal);

  const fixedFlexPlane = projectOnPlane(fixedPalm, palmTransverse);
  const mobileFlexPlane = projectOnPlane(mobilePalm, palmTransverse);
  const flexExtMeasured = signedAngleOnPlane(fixedFlexPlane, mobileFlexPlane, palmTransverse);

  return {
    CMC_flexExt: normalizeSignedZero(Math.round(flexExtMeasured)),
    CMC_abdAdd: normalizeSignedZero(Math.round(abdAddMeasured)),
  };
}

function deriveIsolatedFromComposed(composed, thumb) {
  if (!composed) return null;
  if (!thumb) return { ...composed };

  const opp = Number(thumb.CMC_opp) || 0;
  const flexExtCoupling = THUMB_CMC.CLINICAL_FLEX_EXT_SIGN * THUMB_CMC.OPP_COUPLING.FLEX_EXT_GAIN * opp;
  const abdAddCoupling = THUMB_CMC.OPP_COUPLING.ABD_ADD_GAIN * opp;

  return {
    CMC_flexExt: toRoundedNumber(composed.CMC_flexExt - flexExtCoupling),
    CMC_abdAdd: toRoundedNumber(composed.CMC_abdAdd - abdAddCoupling),
  };
}

export function measureThumbCmcGoniometryFromRig(rig, options = {}) {
  const composed = readComposedFromRig(rig);
  if (!composed) return null;

  const isolatedRaw = deriveIsolatedFromComposed(composed, options.thumb);
  const baseline = options.baseline || { CMC_flexExt: 0, CMC_abdAdd: 0 };

  const isolated = {
    CMC_flexExt: toRoundedNumber((isolatedRaw?.CMC_flexExt ?? composed.CMC_flexExt) - (Number(baseline.CMC_flexExt) || 0)),
    CMC_abdAdd: toRoundedNumber((isolatedRaw?.CMC_abdAdd ?? composed.CMC_abdAdd) - (Number(baseline.CMC_abdAdd) || 0)),
  };

  return {
    CMC_flexExt: isolated.CMC_flexExt,
    CMC_abdAdd: isolated.CMC_abdAdd,
    isolated,
    composed,
  };
}

