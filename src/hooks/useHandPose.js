import { useCallback, useMemo, useReducer } from "react";
import { RANGES, THUMB_CMC, THUMB_RANGE_KEY } from "../constants";
import { buildProfile, clamp, makeDims } from "../utils";
import {
  buildCmcInputStateForAxis,
  buildThumbCmcClinicalModel,
  buildThumbOppositionClinicalModel,
  createDefaultCmcInputState,
  getKapandjiLevelFromCommand,
  syncCmcInputStateFromThumb,
} from "../domain/thumb";
import {
  applyGlobalGripToPose,
  calculateGlobalD2D5,
  createNeutralPose,
  createSceneInput,
  createZeroPose,
  setGlobalFingerAngle,
  setThumbAngle,
} from "../domain/pose";

const INITIAL_ANTHROPOMETRY = {
  sex: "masculino",
  percentile: 50,
  age: 25,
};

const CMC_AXIS_DIRECTIONS = {
  CMC_abd: { positive: "abducao", negative: "aducao" },
  CMC_flex: { positive: "flexao", negative: "extensao" },
};

const ZERO_OVERLAY = {
  CMC_abd: 0,
  CMC_flex: 0,
  CMC_opp: 0,
  MCP_flex: 0,
  IP: 0,
};

const GONIOMETRY_STATE_EPSILON = 1e-4;

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

function composeThumbWithOverlay(clinicalThumb, overlayState, enabled) {
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

function applyCmcClinicalTargets(thumb, prevInput) {
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

function createInitialState() {
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
  return {
    fingers: functionalPose.fingers,
    thumb: nextThumb,
    thumbMeasured: { CMC_abd: 0, CMC_flex: 0 },
    cmcInput: nextInput,
    kapandjiEstimatedFromRig: getKapandjiLevelFromCommand(nextThumb.CMC_opp),
    isExplorationMode: false,
    exploreOverlayState: { ...ZERO_OVERLAY },
    explorationOppositionIntensity: 0,
    userEditedThumb: {},
    explorationSnapshotThumb: {},
    wrist: functionalPose.wrist,
    grip: 50,
    globalMode: "functional",
    activePreset: "functional",
  };
}

export const __testables = {
  createInitialState,
  poseReducer,
};

function poseReducer(state, action) {
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
      const nextLevel = Number.isFinite(action.value) ? Math.round(Number(action.value)) : state.kapandjiEstimatedFromRig;
      if (nextLevel === state.kapandjiEstimatedFromRig) return state;
      return {
        ...state,
        kapandjiEstimatedFromRig: nextLevel,
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
    case "SET_THUMB_OPP_INPUT": {
      const { direction, magnitudeDeg } = action.value;
      const absMagnitude = Math.abs(Number(magnitudeDeg) || 0);
      const signed = direction === "oposicao" ? absMagnitude : -absMagnitude;
      return {
        ...state,
        thumb: {
          ...state.thumb,
          CMC_opp: signed,
        },
        userEditedThumb: { ...state.userEditedThumb, CMC_opp: true },
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
      };
    }
    case "UPDATE_OPPOSITION_EXPLORATION": {
      const intensity = Number(action.value?.intensity) || 0;
      return {
        ...state,
        isExplorationMode: true,
        explorationOppositionIntensity: intensity,
        exploreOverlayState: {
          ...ZERO_OVERLAY,
          CMC_opp: intensity,
          CMC_abd: intensity * THUMB_CMC.CLINICAL_ABD_SIGN * THUMB_CMC.OPP_COUPLING.ABD_GAIN,
          CMC_flex: intensity * THUMB_CMC.OPP_COUPLING.FLEX_GAIN,
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
        explorationOppositionIntensity: 0,
      };
    }
    case "EXIT_OPPOSITION_EXPLORATION":
      return {
        ...state,
        isExplorationMode: false,
        exploreOverlayState: { ...ZERO_OVERLAY },
        explorationOppositionIntensity: 0,
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
      return {
        ...state,
        fingers: nextPose.fingers,
        thumb: nextThumb,
        cmcInput: nextInput,
        wrist: nextPose.wrist,
        globalMode: "functional",
        grip: 50,
        activePreset: "functional",
        isExplorationMode: false,
        exploreOverlayState: { ...ZERO_OVERLAY },
        explorationOppositionIntensity: 0,
        userEditedThumb: {},
        explorationSnapshotThumb: {},
      };
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
      return {
        ...state,
        fingers: neutralPose.fingers,
        thumb: nextThumb,
        cmcInput: nextInput,
        wrist: neutralPose.wrist,
        grip: neutralPose.grip,
        activePreset: neutralPose.activePreset,
        isExplorationMode: false,
        exploreOverlayState: { ...ZERO_OVERLAY },
        explorationOppositionIntensity: 0,
        userEditedThumb: {},
        explorationSnapshotThumb: {},
      };
    }
    case "APPLY_PRESET_ZERO": {
      const zeroPose = createZeroPose();
      return {
        ...state,
        fingers: zeroPose.fingers,
        thumb: zeroPose.thumb,
        cmcInput: syncCmcInputStateFromThumb(state.cmcInput, zeroPose.thumb),
        kapandjiEstimatedFromRig: getKapandjiLevelFromCommand(zeroPose.thumb.CMC_opp),
        wrist: zeroPose.wrist,
        grip: zeroPose.grip,
        activePreset: zeroPose.activePreset,
        isExplorationMode: false,
        exploreOverlayState: { ...ZERO_OVERLAY },
        explorationOppositionIntensity: 0,
        userEditedThumb: {},
        explorationSnapshotThumb: {},
      };
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

export function useHandPose() {
  const [state, dispatch] = useReducer(poseReducer, {
    ...createInitialState(),
    anthropometry: INITIAL_ANTHROPOMETRY,
  });

  const profile = useMemo(
    () => buildProfile(state.anthropometry.sex, state.anthropometry.percentile, state.anthropometry.age),
    [state.anthropometry],
  );
  const dims = useMemo(() => makeDims(profile), [profile]);
  const globalD2D5 = useMemo(() => calculateGlobalD2D5(state.fingers), [state.fingers]);

  const renderedThumb = useMemo(
    () => composeThumbWithOverlay(state.thumb, state.exploreOverlayState, state.isExplorationMode),
    [state.thumb, state.exploreOverlayState, state.isExplorationMode],
  );

  const track = useCallback((eventName, payload = {}) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("handsim:metric", {
        detail: { eventName, payload, at: Date.now() },
      }),
    );
  }, []);

  const setFingers = useCallback(value => dispatch({ type: "SET_FINGERS", value }), []);
  const setThumb = useCallback(value => dispatch({ type: "SET_THUMB", value }), []);
  const setThumbGoniometry = useCallback(value => dispatch({ type: "SET_THUMB_GONIOMETRY", value }), []);
  const setOppositionEstimate = useCallback(value => dispatch({ type: "SET_OPPOSITION_ESTIMATE", value }), []);
  const setWrist = useCallback(value => dispatch({ type: "SET_WRIST", value }), []);
  const setGrip = useCallback(value => dispatch({ type: "SET_GRIP", value }), []);
  const setActivePreset = useCallback(value => dispatch({ type: "SET_ACTIVE_PRESET", value }), []);

  const setGlobalMode = useCallback(
    value => {
      dispatch({ type: "SET_GLOBAL_MODE", value });
      track("global_mode_changed", { value });
    },
    [track],
  );

  const setSex = useCallback(
    value => {
      dispatch({ type: "SET_ANTHROPOMETRY", value: { sex: value } });
      track("anthropometry_changed", { field: "sex", value });
    },
    [track],
  );

  const setPercentile = useCallback(
    value => {
      dispatch({ type: "SET_ANTHROPOMETRY", value: { percentile: value } });
      track("anthropometry_changed", { field: "percentile", value });
    },
    [track],
  );

  const setAge = useCallback(
    value => {
      dispatch({ type: "SET_ANTHROPOMETRY", value: { age: value } });
      track("anthropometry_changed", { field: "age", value });
    },
    [track],
  );

  const updateGlobalD2D5 = useCallback((key, value) => dispatch({ type: "SET_GLOBAL_FINGER_ANGLE", key, value }), []);
  const setThumbVal = useCallback((key, value) => dispatch({ type: "SET_THUMB_ANGLE", key, value }), []);
  const setThumbCmcInput = useCallback((axis, direction, magnitudeDeg) => {
    dispatch({ type: "SET_THUMB_CMC_INPUT", value: { axis, direction, magnitudeDeg } });
  }, []);
  const setThumbOppInput = useCallback((axis, direction, magnitudeDeg) => {
    dispatch({ type: "SET_THUMB_OPP_INPUT", value: { axis, direction, magnitudeDeg } });
  }, []);

  const enterOppositionExploration = useCallback(() => dispatch({ type: "ENTER_OPPOSITION_EXPLORATION" }), []);
  const updateOppositionExploration = useCallback(intensity => {
    dispatch({ type: "UPDATE_OPPOSITION_EXPLORATION", value: { intensity } });
  }, []);
  const restoreUserInputData = useCallback(() => dispatch({ type: "RESTORE_USER_INPUT_DATA" }), []);
  const exitOppositionExploration = useCallback(() => dispatch({ type: "EXIT_OPPOSITION_EXPLORATION" }), []);

  const applyGlobalGrip = useCallback(
    (nextGrip, modeOverride) => {
      dispatch({ type: "APPLY_GRIP", grip: nextGrip, modeOverride });
      track("grip_changed", { nextGrip, mode: modeOverride || state.globalMode });
    },
    [state.globalMode, track],
  );

  const presetFunctional = useCallback(() => {
    dispatch({ type: "APPLY_PRESET_FUNCTIONAL" });
    track("preset_selected", { preset: "functional" });
  }, [track]);

  const presetNeutral = useCallback(() => {
    dispatch({ type: "APPLY_PRESET_NEUTRAL", dims });
    track("preset_selected", { preset: "neutro" });
  }, [dims, track]);

  const presetZero = useCallback(() => {
    dispatch({ type: "APPLY_PRESET_ZERO" });
    track("preset_selected", { preset: "zero" });
  }, [track]);

  const thumbGoniometry = useMemo(
    () =>
      buildThumbCmcClinicalModel({
        thumb: state.thumb,
        measured: state.thumbMeasured,
        inputState: state.cmcInput,
      }),
    [state.thumb, state.thumbMeasured, state.cmcInput],
  );

  const thumbClinical = useMemo(
    () => ({
      opp: buildThumbOppositionClinicalModel({
        thumb: renderedThumb,
        kapandjiLevel: state.kapandjiEstimatedFromRig,
      }),
    }),
    [renderedThumb, state.kapandjiEstimatedFromRig],
  );

  const poseState = {
    fingers: state.fingers,
    thumb: state.thumb,
    wrist: state.wrist,
    grip: state.grip,
    globalMode: state.globalMode,
    activePreset: state.activePreset,
    thumbGoniometry,
    thumbClinical,
    isExplorationMode: state.isExplorationMode,
    exploreOverlayState: state.exploreOverlayState,
    explorationOppositionIntensity: state.explorationOppositionIntensity,
    profile,
    dims,
    globalD2D5,
    sex: state.anthropometry.sex,
    percentile: state.anthropometry.percentile,
    age: state.anthropometry.age,
  };

  const poseActions = useMemo(
    () => ({
      setFingers,
      setThumb,
      setThumbGoniometry,
      setOppositionEstimate,
      setWrist,
      setGrip,
      setGlobalMode,
      setActivePreset,
      setSex,
      setPercentile,
      setAge,
      updateGlobalD2D5,
      setThumbVal,
      setThumbCmcInput,
      setThumbOppInput,
      enterOppositionExploration,
      updateOppositionExploration,
      restoreUserInputData,
      exitOppositionExploration,
      applyGlobalGrip,
      presetFunctional,
      presetNeutral,
      presetZero,
    }),
    [
      applyGlobalGrip,
      enterOppositionExploration,
      exitOppositionExploration,
      presetFunctional,
      presetNeutral,
      presetZero,
      restoreUserInputData,
      setActivePreset,
      setAge,
      setFingers,
      setGlobalMode,
      setGrip,
      setPercentile,
      setSex,
      setThumb,
      setThumbGoniometry,
      setOppositionEstimate,
      setThumbOppInput,
      setThumbVal,
      setThumbCmcInput,
      setWrist,
      updateGlobalD2D5,
      updateOppositionExploration,
    ],
  );

  const sceneInput = useMemo(
    () => createSceneInput({ dims, fingers: state.fingers, thumb: renderedThumb, wrist: state.wrist }),
    [dims, renderedThumb, state.fingers, state.wrist],
  );

  return { poseState, poseActions, sceneInput };
}





