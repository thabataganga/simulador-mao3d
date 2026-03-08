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
  const abdRad = rig?.thumb?.cmcAbd?.rotation?.z;
  const flexRad = rig?.thumb?.cmcFlex?.rotation?.y;
  if (typeof abdRad === "number" && typeof flexRad === "number") {
    return {
      CMC_abd: toRoundedDeg(abdRad),
      CMC_flex: toRoundedDeg(flexRad),
    };
  }

  const cmcOrigin = rig?.thumb?.cmcAbd?.getWorldPosition?.(new Vector3());
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
  const abdMeasured = -signedAngleOnPlane(fixedAbdPlane, mobileAbdPlane, palmNormal);

  const fixedFlexPlane = projectOnPlane(fixedPalm, palmTransverse);
  const mobileFlexPlane = projectOnPlane(mobilePalm, palmTransverse);
  const flexMeasured = signedAngleOnPlane(fixedFlexPlane, mobileFlexPlane, palmTransverse);

  return {
    CMC_abd: normalizeSignedZero(Math.round(flexMeasured)),
    CMC_flex: normalizeSignedZero(Math.round(abdMeasured)),
  };
}

function deriveIsolatedFromComposed(composed, thumb) {
  if (!composed) return null;
  if (!thumb) return { ...composed };

  const opp = Number(thumb.CMC_opp) || 0;
  const abdCoupling = THUMB_CMC.CLINICAL_ABD_SIGN * THUMB_CMC.OPP_COUPLING.ABD_GAIN * opp;
  const flexCoupling = THUMB_CMC.OPP_COUPLING.FLEX_GAIN * opp;

  return {
    CMC_abd: toRoundedNumber(composed.CMC_abd - abdCoupling),
    CMC_flex: toRoundedNumber(composed.CMC_flex - flexCoupling),
  };
}

export function measureThumbCmcGoniometryFromRig(rig, options = {}) {
  const composed = readComposedFromRig(rig);
  if (!composed) return null;

  const isolatedRaw = deriveIsolatedFromComposed(composed, options.thumb);
  const baseline = options.baseline || { CMC_abd: 0, CMC_flex: 0 };

  const isolated = {
    CMC_abd: toRoundedNumber((isolatedRaw?.CMC_abd ?? composed.CMC_abd) - (Number(baseline.CMC_abd) || 0)),
    CMC_flex: toRoundedNumber((isolatedRaw?.CMC_flex ?? composed.CMC_flex) - (Number(baseline.CMC_flex) || 0)),
  };

  return {
    CMC_abd: isolated.CMC_abd,
    CMC_flex: isolated.CMC_flex,
    isolated,
    composed,
  };
}

