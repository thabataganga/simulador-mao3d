import { handRigTestables, useHandRigRuntime } from "./handRig/runtime";

export const __testables = handRigTestables;

export function useHandRig(options) {
  return useHandRigRuntime(options);
}
