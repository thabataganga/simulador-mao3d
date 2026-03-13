/**
 * Build the prop contract consumed by pose setup controls.
 * Keeps UI wiring stable while handPose internals evolve.
 */
export function buildPoseSetupProps({ poseState, poseActions }) {
  return {
    state: {
      sex: poseState.sex,
      percentile: poseState.percentile,
      age: poseState.age,
      activePreset: poseState.activePreset,
    },
    actions: {
      onSex: poseActions.setSex,
      onPercentile: poseActions.setPercentile,
      onAge: poseActions.setAge,
      onPresetFunctional: poseActions.presetFunctional,
      onPresetNeutral: poseActions.presetNeutral,
      onPresetZero: poseActions.presetZero,
    },
  };
}
