import { HAND_POSE_HANDLERS } from "./handlers";

export function poseReducer(state, action) {
  const handler = HAND_POSE_HANDLERS[action.type];
  return handler ? handler(state, action) : state;
}
