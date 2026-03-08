import { applyCmcClinicalTargets, composeThumbWithOverlay } from "./helpers";
import { createHandPoseInitialState, createUseHandPoseInitialState } from "./initialState";
import { HAND_POSE_HANDLERS } from "./handlers";

export { applyCmcClinicalTargets, composeThumbWithOverlay, createHandPoseInitialState, createUseHandPoseInitialState };

export function poseReducer(state, action) {
  const handler = HAND_POSE_HANDLERS[action.type];
  return handler ? handler(state, action) : state;
}
