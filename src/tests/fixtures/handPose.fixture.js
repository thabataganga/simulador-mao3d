import { createUseHandPoseInitialState } from "../../hooks/handPose/reducer";

export function createHandPoseFixture(overrides = {}) {
  return {
    ...createUseHandPoseInitialState(),
    ...overrides,
  };
}
