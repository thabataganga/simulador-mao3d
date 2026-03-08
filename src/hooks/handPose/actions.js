/**
 * @typedef {{ eventName: string, payload: object, at: number }} HandMetricDetail
 */

export function createMetricTracker(target = typeof window !== "undefined" ? window : null) {
  return (eventName, payload = {}) => {
    if (!target) return;
    target.dispatchEvent(
      new CustomEvent("handsim:metric", {
        detail: /** @type {HandMetricDetail} */ ({ eventName, payload, at: Date.now() }),
      }),
    );
  };
}

export function createPoseActions({ dispatch, track, dims, globalMode }) {
  return {
    setFingers: value => dispatch({ type: "SET_FINGERS", value }),
    setThumb: value => dispatch({ type: "SET_THUMB", value }),
    setThumbGoniometry: value => dispatch({ type: "SET_THUMB_GONIOMETRY", value }),
    setOppositionEstimate: value => dispatch({ type: "SET_OPPOSITION_ESTIMATE", value }),
    setWrist: value => dispatch({ type: "SET_WRIST", value }),
    setGrip: value => dispatch({ type: "SET_GRIP", value }),
    setActivePreset: value => dispatch({ type: "SET_ACTIVE_PRESET", value }),
    setGlobalMode: value => {
      dispatch({ type: "SET_GLOBAL_MODE", value });
      track("global_mode_changed", { value });
    },
    setSex: value => {
      dispatch({ type: "SET_ANTHROPOMETRY", value: { sex: value } });
      track("anthropometry_changed", { field: "sex", value });
    },
    setPercentile: value => {
      dispatch({ type: "SET_ANTHROPOMETRY", value: { percentile: value } });
      track("anthropometry_changed", { field: "percentile", value });
    },
    setAge: value => {
      dispatch({ type: "SET_ANTHROPOMETRY", value: { age: value } });
      track("anthropometry_changed", { field: "age", value });
    },
    updateGlobalD2D5: (key, value) => dispatch({ type: "SET_GLOBAL_FINGER_ANGLE", key, value }),
    setThumbVal: (key, value) => dispatch({ type: "SET_THUMB_ANGLE", key, value }),
    setThumbCmcInput: (axis, direction, magnitudeDeg) => {
      dispatch({ type: "SET_THUMB_CMC_INPUT", value: { axis, direction, magnitudeDeg } });
    },
    setThumbOppInput: (axis, direction, magnitudeDeg) => {
      dispatch({ type: "SET_THUMB_OPP_INPUT", value: { axis, direction, magnitudeDeg } });
    },
    enterOppositionExploration: () => dispatch({ type: "ENTER_OPPOSITION_EXPLORATION" }),
    updateOppositionExploration: intensity => {
      dispatch({ type: "UPDATE_OPPOSITION_EXPLORATION", value: { intensity } });
    },
    restoreUserInputData: () => dispatch({ type: "RESTORE_USER_INPUT_DATA" }),
    exitOppositionExploration: () => dispatch({ type: "EXIT_OPPOSITION_EXPLORATION" }),
    applyGlobalGrip: (nextGrip, modeOverride) => {
      dispatch({ type: "APPLY_GRIP", grip: nextGrip, modeOverride });
      track("grip_changed", { nextGrip, mode: modeOverride || globalMode });
    },
    presetFunctional: () => {
      dispatch({ type: "APPLY_PRESET_FUNCTIONAL" });
      track("preset_selected", { preset: "functional" });
    },
    presetNeutral: () => {
      dispatch({ type: "APPLY_PRESET_NEUTRAL", dims });
      track("preset_selected", { preset: "neutro" });
    },
    presetZero: () => {
      dispatch({ type: "APPLY_PRESET_ZERO" });
      track("preset_selected", { preset: "zero" });
    },
  };
}
