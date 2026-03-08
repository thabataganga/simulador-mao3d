import { Vector3 } from "three";
import { RANGES } from "../constants";
import { getCmcCommandRange, mapClinicalCmcToRigAngles } from "./thumbCmcMapping";
import { toPalmFrameVector } from "./thumbFrameUtils";

const RAD_TO_DEG = 180 / Math.PI;
const TOLERANCE_DEG = 1;

const AXIS_CONFIG = {
  CMC_abd: {
    positiveDirection: "abducao",
    negativeDirection: "aducao",
    range: RANGES.CMC_ABD,
    modelKey: "cmcAbd",
  },
  CMC_flex: {
    positiveDirection: "flexao",
    negativeDirection: "extensao",
    range: RANGES.CMC_FLEX,
    modelKey: "cmcFlex",
  },
};

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

function getDirectionFromSigned(value, positiveDirection, negativeDirection, fallbackDirection) {
  if (value > 0) return positiveDirection;
  if (value < 0) return negativeDirection;
  return fallbackDirection || positiveDirection;
}

function toSignedFromDirection(direction, magnitude, positiveDirection) {
  const absValue = Math.abs(Number(magnitude) || 0);
  return direction === positiveDirection ? absValue : -absValue;
}

export function createDefaultCmcInputState() {
  return {
    CMC_abd: {
      direction: AXIS_CONFIG.CMC_abd.positiveDirection,
      magnitudeDeg: 0,
      targetMeasuredDeg: 0,
      saturated: false,
    },
    CMC_flex: {
      direction: AXIS_CONFIG.CMC_flex.negativeDirection,
      magnitudeDeg: 0,
      targetMeasuredDeg: 0,
      saturated: false,
    },
  };
}

export function syncCmcInputStateFromThumb(prevState, thumb) {
  const next = { ...prevState };

  Object.keys(AXIS_CONFIG).forEach(axis => {
    const config = AXIS_CONFIG[axis];
    const signed = Number(thumb?.[axis]) || 0;
    const previousDirection = prevState?.[axis]?.direction || config.positiveDirection;
    const direction = getDirectionFromSigned(
      signed,
      config.positiveDirection,
      config.negativeDirection,
      previousDirection,
    );

    next[axis] = {
      ...prevState?.[axis],
      direction,
      magnitudeDeg: Math.abs(signed),
      targetMeasuredDeg: signed,
      saturated: false,
    };
  });

  return next;
}

export function solveCmcCommandForMeasuredTarget(axis, targetMeasuredDeg, thumbContext) {
  const config = AXIS_CONFIG[axis];
  if (!config) {
    return { commandDeg: targetMeasuredDeg, predictedMeasuredDeg: targetMeasuredDeg, errorDeg: 0, saturated: false };
  }

  const [min, max] = getCmcCommandRange(axis);
  let best = null;

  for (let command = min; command <= max; command += 1) {
    const simulatedThumb = { ...thumbContext, [axis]: command };
    const mapped = mapClinicalCmcToRigAngles(simulatedThumb);
    const predictedMeasuredDeg = mapped[config.modelKey];
    const errorDeg = Math.abs(predictedMeasuredDeg - targetMeasuredDeg);

    if (
      !best ||
      errorDeg < best.errorDeg ||
      (errorDeg === best.errorDeg && Math.abs(command - targetMeasuredDeg) < Math.abs(best.commandDeg - targetMeasuredDeg))
    ) {
      best = {
        commandDeg: command,
        predictedMeasuredDeg,
        errorDeg,
      };
    }
  }

  return {
    ...best,
    saturated: best.errorDeg > TOLERANCE_DEG,
  };
}

export function buildCmcInputStateForAxis({ axis, direction, magnitudeDeg, thumbContext, prevState }) {
  const config = AXIS_CONFIG[axis];
  const absMagnitude = Math.abs(Number(magnitudeDeg) || 0);
  const directionMax = direction === config.positiveDirection ? config.range[1] : Math.abs(config.range[0]);
  const clampedMagnitude = Math.min(absMagnitude, directionMax);
  const targetMeasuredDeg = toSignedFromDirection(direction, clampedMagnitude, config.positiveDirection);

  const solved = solveCmcCommandForMeasuredTarget(axis, targetMeasuredDeg, thumbContext);

  return {
    nextInputAxisState: {
      ...(prevState?.[axis] || {}),
      direction,
      magnitudeDeg: clampedMagnitude,
      targetMeasuredDeg,
      saturated: solved.saturated,
    },
    solved,
  };
}

export function measureThumbCmcGoniometryFromRig(rig) {
  const isolatedAbdRad = rig?.thumb?.cmcAbd?.rotation?.z;
  const isolatedFlexRad = rig?.thumb?.cmcFlex?.rotation?.y;
  if (typeof isolatedAbdRad === "number" && typeof isolatedFlexRad === "number") {
    return {
      CMC_abd: toRoundedDeg(isolatedAbdRad),
      CMC_flex: toRoundedDeg(isolatedFlexRad),
    };
  }

  const cmcOrigin = rig?.thumb?.cmcAbd?.getWorldPosition?.(new Vector3());
  const thumbMcp = rig?.thumb?.mcp?.getWorldPosition?.(new Vector3());
  const d2Mcp = rig?.fingers?.[0]?.mcp?.getWorldPosition?.(new Vector3());
  const d2Pip = rig?.fingers?.[0]?.pip?.getWorldPosition?.(new Vector3());
  if (!cmcOrigin || !thumbMcp || !d2Mcp || !d2Pip) return null;

  const palm = rig.palm;
  if (!palm) return null;

  const mobileWorld = thumbMcp.clone().sub(cmcOrigin);
  const fixedWorld = d2Pip.clone().sub(d2Mcp);

  const mobilePalm = toPalmFrameVector(palm, mobileWorld);
  const fixedPalm = toPalmFrameVector(palm, fixedWorld);

  const palmNormal = new Vector3(0, 1, 0);
  const palmTransverse = new Vector3(0, 0, 1);

  const fixedAbdPlane = projectOnPlane(fixedPalm, palmNormal);
  const mobileAbdPlane = projectOnPlane(mobilePalm, palmNormal);
  const abdMeasured = -signedAngleOnPlane(fixedAbdPlane, mobileAbdPlane, palmNormal);

  const fixedFlexPlane = projectOnPlane(fixedPalm, palmTransverse);
  const mobileFlexPlane = projectOnPlane(mobilePalm, palmTransverse);
  const flexMeasured = signedAngleOnPlane(fixedFlexPlane, mobileFlexPlane, palmTransverse);

  // cmcAbd rotates on rig Z and is observed in palm XY plane.
  // cmcFlex rotates on rig Y and is observed in palm XZ plane.
  return {
    CMC_abd: normalizeSignedZero(Math.round(flexMeasured)),
    CMC_flex: normalizeSignedZero(Math.round(abdMeasured)),
  };
}

function buildAxisClinicalModel({ axis, thumb, measured, inputState }) {
  const config = AXIS_CONFIG[axis];
  const commandDeg = Number(thumb?.[axis]) || 0;
  const measuredDeg = Number(measured?.[axis]) || 0;
  const direction = inputState?.direction || config.positiveDirection;
  const magnitudeDeg = Number(inputState?.magnitudeDeg) || 0;
  const targetMeasuredDeg = Number(inputState?.targetMeasuredDeg) || 0;

  return {
    commandDeg,
    inputDirection: direction,
    inputMagnitudeDeg: magnitudeDeg,
    targetMeasuredDeg,
    measuredDeg,
    direction: getDirectionFromSigned(measuredDeg, config.positiveDirection, config.negativeDirection, config.positiveDirection),
    magnitudeDeg: Math.abs(measuredDeg),
    deltaDeg: measuredDeg - targetMeasuredDeg,
    saturated: Boolean(inputState?.saturated),
  };
}

export function buildThumbCmcClinicalModel({ thumb, measured, inputState }) {
  const state = inputState || createDefaultCmcInputState();
  return {
    abd: buildAxisClinicalModel({ axis: "CMC_abd", thumb, measured, inputState: state.CMC_abd }),
    flex: buildAxisClinicalModel({ axis: "CMC_flex", thumb, measured, inputState: state.CMC_flex }),
  };
}
