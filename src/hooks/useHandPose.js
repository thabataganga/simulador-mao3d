import { handPoseTestables, useHandPoseRuntime } from "./handPose/runtime";

export const __testables = handPoseTestables;

export function useHandPose() {
  return useHandPoseRuntime();
}
