import { getKapandjiLevelFromCommand } from "../../../domain/thumbKapandji";
import { applyGlobalGripToPose, createNeutralPose, createZeroPose } from "../../../domain/pose";
import { syncCmcInputStateFromThumb } from "../../../domain/thumbCmcClinical";
import { applyCmcClinicalTargets, resetExplorationState } from "../helpers";

export function handleApplyGrip(state, action) {
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

export function handleApplyPresetFunctional(state) {
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

export function handleApplyPresetNeutral(state, action) {
  const neutralPose = createNeutralPose(action.dims);
  const { nextThumb, nextInput } = applyCmcClinicalTargets(neutralPose.thumb, state.cmcInput);

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

export function handleApplyPresetZero(state) {
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

