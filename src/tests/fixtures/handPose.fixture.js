import { createUseHandPoseInitialState } from "../../hooks/handPose/initialState";

export function createHandPoseFixture(overrides = {}) {
  return {
    ...createUseHandPoseInitialState(),
    ...overrides,
  };
}
