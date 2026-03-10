import { syncCmcInputStateFromThumb, buildCmcInputStateForAxis } from "../../../domain/thumbCmcClinical";
import { setGlobalFingerAngle, setThumbAngle } from "../../../domain/pose";
import { GONIOMETRY_STATE_EPSILON } from "../constants";
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
  const nextAbd = Number.isFinite(action.value?.CMC_flexExt) ? Number(action.value.CMC_flexExt) : state.thumbMeasured.CMC_flexExt;
  const nextFlex = Number.isFinite(action.value?.CMC_abdAdd) ? Number(action.value.CMC_abdAdd) : state.thumbMeasured.CMC_abdAdd;
  const abdUnchanged = Math.abs(nextAbd - state.thumbMeasured.CMC_flexExt) <= GONIOMETRY_STATE_EPSILON;
  const flexUnchanged = Math.abs(nextFlex - state.thumbMeasured.CMC_abdAdd) <= GONIOMETRY_STATE_EPSILON;
  if (abdUnchanged && flexUnchanged) return state;

  return {
    ...state,
    thumbMeasured: {
      ...state.thumbMeasured,
      CMC_flexExt: nextAbd,
      CMC_abdAdd: nextFlex,
    },
  };
}

export function handleSetOppositionEstimate(state, action) {
  if (state.isExplorationMode) return state;

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
  if (action.key !== "CMC_flexExt" && action.key !== "CMC_abdAdd") {
    return {
      ...state,
      thumb: nextThumb,
      userEditedThumb: { ...state.userEditedThumb, [action.key]: true },
    };
  }

  return {
    ...state,
    thumb: nextThumb,
    cmcInput: syncCmcInputStateFromThumb(state.cmcInput, nextThumb),
    userEditedThumb: { ...state.userEditedThumb, [action.key]: true },
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
    userEditedThumb: { ...state.userEditedThumb, [axis]: true },
  };
}
