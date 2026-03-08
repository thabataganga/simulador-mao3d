import { RANGES } from "../constants/biomechanics";
import { getCmcCommandRange, mapClinicalCmcToRigAngles } from "./thumbCmcMapping";

const TOLERANCE_DEG = 1;
const CMC_ZERO_EPSILON = 0.5;

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

function buildAxisClinicalModel({ axis, thumb, measured, inputState }) {
  const config = AXIS_CONFIG[axis];
  const commandDeg = Number(thumb?.[axis]) || 0;
  const direction = inputState?.direction || config.positiveDirection;
  const magnitudeDeg = Number(inputState?.magnitudeDeg) || 0;
  const targetMeasuredDeg = Number(inputState?.targetMeasuredDeg) || 0;

  const measuredRaw = Number(measured?.isolated?.[axis] ?? measured?.[axis]) || 0;
  const measuredDeg = Math.abs(magnitudeDeg) <= CMC_ZERO_EPSILON ? 0 : measuredRaw;

  const rigDirection = getDirectionFromSigned(measuredDeg, config.positiveDirection, config.negativeDirection, config.positiveDirection);
  const rigMagnitudeDeg = Math.abs(measuredDeg);

  return {
    commandDeg,
    inputDirection: direction,
    inputMagnitudeDeg: magnitudeDeg,
    targetMeasuredDeg,
    clinicalTargetDeg: targetMeasuredDeg,
    measuredDeg,
    rigMeasuredDeg: measuredDeg,
    direction: rigDirection,
    rigDirection,
    magnitudeDeg: rigMagnitudeDeg,
    rigMagnitudeDeg,
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




