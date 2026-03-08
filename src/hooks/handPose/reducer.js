import { RANGES, THUMB_RANGE_KEY } from "../../constants/reference/biomechanics";
import { clamp } from "../../utils/math/core";
import {
  buildCmcInputStateForAxis,
  createDefaultCmcInputState,
  syncCmcInputStateFromThumb,
} from "../../domain/thumbCmcClinical";
import {
  buildClinicalOppositionEstimate,
  clampKapandjiLevel,
  getKapandjiLevelFromCommand,
  resolveKapandjiOperationalPose,
} from "../../domain/thumbKapandji";
import {
  applyGlobalGripToPose,
  createNeutralPose,
  createZeroPose,
  setGlobalFingerAngle,
  setThumbAngle,
} from "../../domain/pose";

export const INITIAL_ANTHROPOMETRY = {
  sex: "masculino",
  percentile: 50,
  age: 25,
};

const CMC_AXIS_DIRECTIONS = {
  CMC_abd: { positive: "abducao", negative: "aducao" },
  CMC_flex: { positive: "flexao", negative: "extensao" },
};

export const ZERO_OVERLAY = {
  CMC_abd: 0,
  CMC_flex: 0,
  CMC_opp: 0,
  MCP_flex: 0,
  IP: 0,
};

const GONIOMETRY_STATE_EPSILON = 1e-4;

function normalizeOppositionMetric(value, fallbackLevel) {
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

function resetExplorationState(state) {
  return {
    ...state,
    isExplorationMode: false,
    exploreOverlayState: { ...ZERO_OVERLAY },
    explorationKapandjiTarget: clampKapandjiLevel(state?.kapandjiEstimatedFromRig),
    userEditedThumb: {},
    explorationSnapshotThumb: {},
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

export function createHandPoseInitialState() {
  const base = createZeroPose();
  const functionalPose = applyGlobalGripToPose(
    {
      fingers: base.fingers,
      thumb: base.thumb,
      wrist: base.wrist,
      globalMode: "functional",
    },
    50,
    "functional",
  );
  const cmcSeed = createDefaultCmcInputState();
  const { nextThumb, nextInput } = applyCmcClinicalTargets(functionalPose.thumb, cmcSeed);
  const initialKapandji = getKapandjiLevelFromCommand(nextThumb.CMC_opp);

  return {
    fingers: functionalPose.fingers,
    thumb: nextThumb,
    thumbMeasured: { CMC_abd: 0, CMC_flex: 0 },
    cmcInput: nextInput,
    kapandjiEstimatedFromRig: initialKapandji,
    thumbOppRig: {
      level: initialKapandji,
      rigDirection: nextThumb.CMC_opp >= 0 ? "oposicao" : "retroposicao",
      rigMagnitudeDeg: Math.abs(nextThumb.CMC_opp),
    },
    isExplorationMode: false,
    exploreOverlayState: { ...ZERO_OVERLAY },
    explorationKapandjiTarget: initialKapandji,
    userEditedThumb: {},
    explorationSnapshotThumb: {},
    wrist: functionalPose.wrist,
    grip: 50,
    globalMode: "functional",
    activePreset: "functional",
  };
}

export function createUseHandPoseInitialState() {
  return {
    ...createHandPoseInitialState(),
    anthropometry: INITIAL_ANTHROPOMETRY,
  };
}

export function poseReducer(state, action) {
  switch (action.type) {
    case "SET_FINGERS":
      return { ...state, fingers: action.value };
    case "SET_THUMB":
      return {
        ...state,
        thumb: action.value,
        cmcInput: syncCmcInputStateFromThumb(state.cmcInput, action.value),
      };
    case "SET_THUMB_GONIOMETRY": {
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
    case "SET_OPPOSITION_ESTIMATE": {
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
    case "SET_WRIST":
      return { ...state, wrist: action.value };
    case "SET_GRIP":
      return { ...state, grip: action.value };
    case "SET_GLOBAL_MODE":
      return { ...state, globalMode: action.value };
    case "SET_ACTIVE_PRESET":
      return { ...state, activePreset: action.value };
    case "SET_GLOBAL_FINGER_ANGLE":
      return { ...state, fingers: setGlobalFingerAngle(state.fingers, action.key, action.value) };
    case "SET_THUMB_ANGLE": {
      const nextThumb = setThumbAngle(state.thumb, action.key, action.value);
      if (action.key !== "CMC_abd" && action.key !== "CMC_flex") {
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
    case "SET_THUMB_CMC_INPUT": {
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
    case "ENTER_OPPOSITION_EXPLORATION": {
      const snapshot = Object.keys(state.userEditedThumb || {}).reduce((acc, key) => {
        if (!state.userEditedThumb[key]) return acc;
        acc[key] = state.thumb[key];
        return acc;
      }, {});

      return {
        ...state,
        isExplorationMode: true,
        explorationSnapshotThumb: snapshot,
        explorationKapandjiTarget: clampKapandjiLevel(state.kapandjiEstimatedFromRig),
      };
    }
    case "UPDATE_OPPOSITION_EXPLORATION": {
      const kapandjiTarget = clampKapandjiLevel(action.value?.kapandjiTarget);
      const { commandDeg: targetClinicalOppositionDeg } = resolveKapandjiOperationalPose(kapandjiTarget);
      const { clinicalOppositionDeg: currentClinicalOppositionDeg } = buildClinicalOppositionEstimate(state.thumb);
      const deltaOpp = targetClinicalOppositionDeg - currentClinicalOppositionDeg;

      return {
        ...state,
        isExplorationMode: true,
        explorationKapandjiTarget: kapandjiTarget,
        exploreOverlayState: {
          ...ZERO_OVERLAY,
          CMC_opp: deltaOpp,
        },
      };
    }
    case "RESTORE_USER_INPUT_DATA": {
      const restoredThumb = { ...state.thumb };
      Object.keys(state.explorationSnapshotThumb || {}).forEach(key => {
        restoredThumb[key] = state.explorationSnapshotThumb[key];
      });
      return {
        ...state,
        thumb: restoredThumb,
        isExplorationMode: false,
        exploreOverlayState: { ...ZERO_OVERLAY },
        explorationKapandjiTarget: clampKapandjiLevel(state.kapandjiEstimatedFromRig),
      };
    }
    case "EXIT_OPPOSITION_EXPLORATION":
      return {
        ...state,
        isExplorationMode: false,
        exploreOverlayState: { ...ZERO_OVERLAY },
        explorationKapandjiTarget: clampKapandjiLevel(state.kapandjiEstimatedFromRig),
      };
    case "APPLY_GRIP": {
      const nextPose = applyGlobalGripToPose(
        {
          fingers: state.fingers,
          thumb: state.thumb,
          wrist: state.wrist,
          globalMode: state.globalMode,
        },
        action.grip,
        action.modeOverride,
      );
      const cmcResolved = applyCmcClinicalTargets(nextPose.thumb, state.cmcInput);
      return {
        ...state,
        fingers: nextPose.fingers,
        thumb: cmcResolved.nextThumb,
        cmcInput: cmcResolved.nextInput,
        wrist: nextPose.wrist,
        grip: action.grip,
      };
    }
    case "APPLY_PRESET_FUNCTIONAL": {
      const nextPose = applyGlobalGripToPose(
        {
          fingers: state.fingers,
          thumb: state.thumb,
          wrist: state.wrist,
          globalMode: "functional",
        },
        50,
        "functional",
      );
      const { nextThumb, nextInput } = applyCmcClinicalTargets(nextPose.thumb, state.cmcInput);
      return resetExplorationState({
        ...state,
        fingers: nextPose.fingers,
        thumb: nextThumb,
        cmcInput: nextInput,
        wrist: nextPose.wrist,
        globalMode: "functional",
        grip: 50,
        activePreset: "functional",
        thumbOppRig: {
          level: getKapandjiLevelFromCommand(nextThumb.CMC_opp),
          rigDirection: nextThumb.CMC_opp >= 0 ? "oposicao" : "retroposicao",
          rigMagnitudeDeg: Math.abs(nextThumb.CMC_opp),
        },
      });
    }
    case "APPLY_PRESET_NEUTRAL": {
      const neutralPose = createNeutralPose(action.dims);
      const neutralWithFunctionalCmc = {
        ...neutralPose,
        thumb: {
          ...neutralPose.thumb,
          CMC_abd: 45,
          CMC_flex: -12,
          CMC_opp: 12,
        },
      };
      const { nextThumb, nextInput } = applyCmcClinicalTargets(neutralWithFunctionalCmc.thumb, state.cmcInput);
      return resetExplorationState({
        ...state,
        fingers: neutralPose.fingers,
        thumb: nextThumb,
        cmcInput: nextInput,
        wrist: neutralPose.wrist,
        grip: neutralPose.grip,
        activePreset: neutralPose.activePreset,
        thumbOppRig: {
          level: getKapandjiLevelFromCommand(nextThumb.CMC_opp),
          rigDirection: nextThumb.CMC_opp >= 0 ? "oposicao" : "retroposicao",
          rigMagnitudeDeg: Math.abs(nextThumb.CMC_opp),
        },
      });
    }
    case "APPLY_PRESET_ZERO": {
      const zeroPose = createZeroPose();
      return resetExplorationState({
        ...state,
        fingers: zeroPose.fingers,
        thumb: zeroPose.thumb,
        cmcInput: syncCmcInputStateFromThumb(state.cmcInput, zeroPose.thumb),
        kapandjiEstimatedFromRig: getKapandjiLevelFromCommand(zeroPose.thumb.CMC_opp),
        thumbOppRig: {
          level: getKapandjiLevelFromCommand(zeroPose.thumb.CMC_opp),
          rigDirection: zeroPose.thumb.CMC_opp >= 0 ? "oposicao" : "retroposicao",
          rigMagnitudeDeg: Math.abs(zeroPose.thumb.CMC_opp),
        },
        wrist: zeroPose.wrist,
        grip: zeroPose.grip,
        activePreset: zeroPose.activePreset,
      });
    }
    case "SET_ANTHROPOMETRY": {
      const next = {
        sex: action.value.sex ?? state.anthropometry.sex,
        percentile: action.value.percentile ?? state.anthropometry.percentile,
        age: action.value.age ?? state.anthropometry.age,
      };
      return {
        ...state,
        anthropometry: next,
      };
    }
    default:
      return state;
  }
}
