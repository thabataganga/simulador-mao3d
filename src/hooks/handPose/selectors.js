import { buildProfile, makeDims } from "../../utils/anthropometry/profile";
import { buildThumbCmcClinicalModel } from "../../domain/thumbCmcClinical";
import { buildThumbOppositionClinicalModel, resolveKapandjiOperationalPose } from "../../domain/thumbKapandji";
import { calculateGlobalD2D5, createSceneInput } from "../../domain/pose";
import { composeThumbWithOverlay } from "./helpers";

/**
 * @typedef {{ dims: object, fingers: object[], thumb: object, wrist: object }} SceneInput
 */

export function selectProfile(anthropometry) {
  return buildProfile(anthropometry.sex, anthropometry.percentile, anthropometry.age);
}

export function selectDims(profile) {
  return makeDims(profile);
}

export function selectGlobalD2D5(fingers) {
  return calculateGlobalD2D5(fingers);
}

export function selectRenderedThumb(thumb, exploreOverlayState, isExplorationMode) {
  return composeThumbWithOverlay(thumb, exploreOverlayState, isExplorationMode);
}

export function selectThumbGoniometry(thumb, thumbMeasured, cmcInput) {
  return buildThumbCmcClinicalModel({
    thumb,
    measured: thumbMeasured,
    inputState: cmcInput,
  });
}

export function selectThumbClinical(renderedThumb, kapandjiEstimatedFromRig, thumbOppRig, exploration = {}) {
  const rigMeasurement = exploration.isExplorationMode
    ? exploration.explorationRigBaseline || thumbOppRig
    : thumbOppRig;

  const explorationMeasurement = exploration.isExplorationMode
    ? (() => {
        const level = Number(exploration.explorationKapandjiTarget);
        const { commandDeg } = resolveKapandjiOperationalPose(level);
        return {
          level,
          rigDirection: commandDeg >= 0 ? "oposicao" : "retroposicao",
          rigMagnitudeDeg: Math.abs(commandDeg),
        };
      })()
    : null;

  return {
    opp: buildThumbOppositionClinicalModel({
      thumb: renderedThumb,
      kapandjiLevel: kapandjiEstimatedFromRig,
      context: { rigMeasurement, explorationMeasurement },
    }),
  };
}

export function selectPoseState(state, derived) {
  return {
    fingers: state.fingers,
    thumb: state.thumb,
    wrist: state.wrist,
    grip: state.grip,
    globalMode: state.globalMode,
    activePreset: state.activePreset,
    thumbGoniometry: derived.thumbGoniometry,
    thumbClinical: derived.thumbClinical,
    isExplorationMode: state.isExplorationMode,
    exploreOverlayState: state.exploreOverlayState,
    explorationKapandjiTarget: state.explorationKapandjiTarget,
    profile: derived.profile,
    dims: derived.dims,
    globalD2D5: derived.globalD2D5,
    sex: state.anthropometry.sex,
    percentile: state.anthropometry.percentile,
    age: state.anthropometry.age,
  };
}

export function selectSceneInput(dims, fingers, renderedThumb, wrist) {
  return createSceneInput({ dims, fingers, thumb: renderedThumb, wrist });
}

