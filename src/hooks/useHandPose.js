import { useCallback, useMemo, useReducer } from "react";
import { buildProfile, makeDims, restFromDims } from "../utils";
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

function createInitialState(dims) {
  const { f, t, w } = restFromDims(dims);
  return {
    fingers: f,
    thumb: t,
    wrist: w,
    grip: 0,
    globalMode: "functional",
    activePreset: "none",
  };
}

function poseReducer(state, action) {
  switch (action.type) {
    case "SET_FINGERS":
      return { ...state, fingers: action.value };
    case "SET_THUMB":
      return { ...state, thumb: action.value };
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
    case "SET_THUMB_ANGLE":
      return { ...state, thumb: setThumbAngle(state.thumb, action.key, action.value) };
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
      return {
        ...state,
        fingers: nextPose.fingers,
        thumb: nextPose.thumb,
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
      return {
        ...state,
        fingers: nextPose.fingers,
        thumb: nextPose.thumb,
        wrist: nextPose.wrist,
        globalMode: "functional",
        grip: 50,
        activePreset: "functional",
      };
    }
    case "APPLY_PRESET_NEUTRAL": {
      const neutralPose = createNeutralPose(action.dims);
      return {
        ...state,
        fingers: neutralPose.fingers,
        thumb: neutralPose.thumb,
        wrist: neutralPose.wrist,
        grip: neutralPose.grip,
        activePreset: neutralPose.activePreset,
      };
    }
    case "APPLY_PRESET_ZERO": {
      const zeroPose = createZeroPose();
      return {
        ...state,
        fingers: zeroPose.fingers,
        thumb: zeroPose.thumb,
        wrist: zeroPose.wrist,
        grip: zeroPose.grip,
        activePreset: zeroPose.activePreset,
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
    ...createInitialState(
      makeDims(
        buildProfile(
          INITIAL_ANTHROPOMETRY.sex,
          INITIAL_ANTHROPOMETRY.percentile,
          INITIAL_ANTHROPOMETRY.age,
        ),
      ),
    ),
    anthropometry: INITIAL_ANTHROPOMETRY,
  });

  const profile = useMemo(
    () => buildProfile(state.anthropometry.sex, state.anthropometry.percentile, state.anthropometry.age),
    [state.anthropometry],
  );
  const dims = useMemo(() => makeDims(profile), [profile]);
  const globalD2D5 = useMemo(() => calculateGlobalD2D5(state.fingers), [state.fingers]);

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

  const poseState = {
    fingers: state.fingers,
    thumb: state.thumb,
    wrist: state.wrist,
    grip: state.grip,
    globalMode: state.globalMode,
    activePreset: state.activePreset,
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
      setWrist,
      setGrip,
      setGlobalMode,
      setActivePreset,
      setSex,
      setPercentile,
      setAge,
      updateGlobalD2D5,
      setThumbVal,
      applyGlobalGrip,
      presetFunctional,
      presetNeutral,
      presetZero,
    }),
    [
      applyGlobalGrip,
      presetFunctional,
      presetNeutral,
      presetZero,
      setActivePreset,
      setAge,
      setFingers,
      setGlobalMode,
      setGrip,
      setPercentile,
      setSex,
      setThumb,
      setThumbVal,
      setWrist,
      updateGlobalD2D5,
    ],
  );

  const sceneInput = useMemo(
    () => createSceneInput({ dims, fingers: state.fingers, thumb: state.thumb, wrist: state.wrist }),
    [dims, state.fingers, state.thumb, state.wrist],
  );

  return { poseState, poseActions, sceneInput };
}
