import { syncCmcInputStateFromThumb, buildCmcInputStateForAxis } from "../../../domain/thumbCmcClinical";
import { setGlobalFingerAngle, setThumbAngle } from "../../../domain/pose";
import { GONIOMETRY_STATE_EPSILON } from "../constants";
import { markThumbAxisEdited } from "../explorationState";
import { normalizeOppositionMetric } from "../helpers";

export function handleSetFingers(state, action) {
  return { ...state, fingers: action.value };
}

export function handleSetThumb(state, action) {
  return {
    ...state,
    thumb: action.value,
    cmcInput: syncCmcInputStateFromThumb(state.cmcInput, action.value),
  };
}

export function handleSetThumbGoniometry(state, action) {
  const nextAbd = Number.isFinite(action.value?.CMC_abd) ? Number(action.value.CMC_abd) : state.thumbMeasured.CMC_abd;
  const nextFlex = Number.isFinite(action.value?.CMC_flex) ? Number(action.value.CMC_flex) : state.thumbMeasured.CMC_flex;
  const abdUnchanged = Math.abs(nextAbd - state.thumbMeasured.CMC_abd) <= GONIOMETRY_STATE_EPSILON;
  const flexUnchanged = Math.abs(nextFlex - state.thumbMeasured.CMC_flex) <= GONIOMETRY_STATE_EPSILON;
  if (abdUnchanged && flexUnchanged) return state;

  return {
    ...state,
    thumbMeasured: {
      ...state.thumbMeasured,
      CMC_abd: nextAbd,
      CMC_flex: nextFlex,
    },
  };
}

export function handleSetOppositionEstimate(state, action) {
  if (state.exploration.isActive) return state;

  const nextMetric = normalizeOppositionMetric(action.value, state.kapandjiEstimatedFromRig);
  const levelUnchanged = nextMetric.level === state.kapandjiEstimatedFromRig;
  const directionUnchanged = nextMetric.rigDirection === state.thumbOppRig?.rigDirection;
  const magnitudeUnchanged = nextMetric.rigMagnitudeDeg === state.thumbOppRig?.rigMagnitudeDeg;
  if (levelUnchanged && directionUnchanged && magnitudeUnchanged) return state;

  return {
    ...state,
    kapandjiEstimatedFromRig: nextMetric.level,
    thumbOppRig: {
      level: nextMetric.level,
      rigDirection: nextMetric.rigDirection,
      rigMagnitudeDeg: nextMetric.rigMagnitudeDeg,
    },
  };
}

export function handleSetWrist(state, action) {
  return { ...state, wrist: action.value };
}

export function handleSetGrip(state, action) {
  return { ...state, grip: action.value };
}

export function handleSetGlobalMode(state, action) {
  return { ...state, globalMode: action.value };
}

export function handleSetActivePreset(state, action) {
  return { ...state, activePreset: action.value };
}

export function handleSetGlobalFingerAngle(state, action) {
  return { ...state, fingers: setGlobalFingerAngle(state.fingers, action.key, action.value) };
}

export function handleSetThumbAngle(state, action) {
  const nextThumb = setThumbAngle(state.thumb, action.key, action.value);
  const nextExploration = markThumbAxisEdited(state.exploration, action.key);

  if (action.key !== "CMC_abd" && action.key !== "CMC_flex") {
    return {
      ...state,
      thumb: nextThumb,
      exploration: nextExploration,
    };
  }

  return {
    ...state,
    thumb: nextThumb,
    cmcInput: syncCmcInputStateFromThumb(state.cmcInput, nextThumb),
    exploration: nextExploration,
  };
}

export function handleSetThumbCmcInput(state, action) {
  const { axis, direction, magnitudeDeg } = action.value;
  const { nextInputAxisState, solved } = buildCmcInputStateForAxis({
    axis,
    direction,
    magnitudeDeg,
    thumbContext: state.thumb,
    prevState: state.cmcInput,
  });

  return {
    ...state,
    thumb: {
      ...state.thumb,
      [axis]: solved.commandDeg,
    },
    cmcInput: {
      ...state.cmcInput,
      [axis]: nextInputAxisState,
    },
    exploration: markThumbAxisEdited(state.exploration, axis),
  };
}
