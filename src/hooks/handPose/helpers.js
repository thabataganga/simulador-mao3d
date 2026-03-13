import { RANGES, THUMB_RANGE_KEY } from "../../constants/biomechanics";
import { clamp } from "../../utils/math/core";
import { buildCmcInputStateForAxis } from "../../domain/thumbCmcClinical";
import { CMC_AXIS_DIRECTIONS } from "./constants";
import { resetExplorationState as resetExplorationModelState } from "./explorationState";

export function normalizeOppositionMetric(value, fallbackLevel) {
  if (Number.isFinite(value)) {
    return {
      level: Math.round(Number(value)),
      rigDirection: null,
      rigMagnitudeDeg: null,
    };
  }

  const levelRaw = Number(value?.level);
  const level = Number.isFinite(levelRaw) ? Math.round(levelRaw) : fallbackLevel;
  const rigDirection = value?.rigDirection === "retroposicao" ? "retroposicao" : "oposicao";
  const rigMagnitudeRaw = Number(value?.rigMagnitudeDeg);
  const rigMagnitudeDeg = Number.isFinite(rigMagnitudeRaw) ? Math.abs(rigMagnitudeRaw) : null;

  return { level, rigDirection, rigMagnitudeDeg };
}

function getDirectionForTarget(axis, target, fallbackDirection) {
  const cfg = CMC_AXIS_DIRECTIONS[axis];
  if (!cfg) return fallbackDirection;
  if (target > 0) return cfg.positive;
  if (target < 0) return cfg.negative;
  return fallbackDirection || cfg.positive;
}

function clampThumbAxis(key, value) {
  return clamp(value, RANGES[THUMB_RANGE_KEY[key]]);
}

export function resetExplorationState(state) {
  return {
    ...state,
    exploration: resetExplorationModelState(state.exploration, state?.kapandjiEstimatedFromRig, {
      keepUserEditedThumb: false,
    }),
  };
}

export function composeThumbWithOverlay(clinicalThumb, overlayState, enabled) {
  if (!enabled) return clinicalThumb;

  return {
    ...clinicalThumb,
    CMC_abd: clampThumbAxis("CMC_abd", (Number(clinicalThumb.CMC_abd) || 0) + (Number(overlayState?.CMC_abd) || 0)),
    CMC_flex: clampThumbAxis("CMC_flex", (Number(clinicalThumb.CMC_flex) || 0) + (Number(overlayState?.CMC_flex) || 0)),
    CMC_opp: clampThumbAxis("CMC_opp", (Number(clinicalThumb.CMC_opp) || 0) + (Number(overlayState?.CMC_opp) || 0)),
    MCP_flex: clampThumbAxis("MCP_flex", (Number(clinicalThumb.MCP_flex) || 0) + (Number(overlayState?.MCP_flex) || 0)),
    IP: clampThumbAxis("IP", (Number(clinicalThumb.IP) || 0) + (Number(overlayState?.IP) || 0)),
  };
}

export function applyCmcClinicalTargets(thumb, prevInput) {
  let nextThumb = { ...thumb };
  const nextInput = { ...prevInput };

  ["CMC_flex", "CMC_abd"].forEach(axis => {
    const target = Number(thumb?.[axis]) || 0;
    const prevAxis = prevInput?.[axis];
    const direction = getDirectionForTarget(axis, target, prevAxis?.direction);
    const magnitudeDeg = Math.abs(target);

    const { nextInputAxisState, solved } = buildCmcInputStateForAxis({
      axis,
      direction,
      magnitudeDeg,
      thumbContext: nextThumb,
      prevState: nextInput,
    });

    nextThumb = {
      ...nextThumb,
      [axis]: solved.commandDeg,
    };
    nextInput[axis] = nextInputAxisState;
  });

  return { nextThumb, nextInput };
}
