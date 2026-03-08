import { createHandPoseFixture } from "../fixtures/handPose.fixture";
import { poseReducer } from "../../hooks/handPose/reducer";
import {
  selectDims,
  selectProfile,
  selectRenderedThumb,
  selectSceneInput,
} from "../../hooks/handPose/selectors";

describe("pose to scene pipeline integration", () => {
  test("keeps sceneInput contract after clinical actions", () => {
    let state = createHandPoseFixture();

    state = poseReducer(state, { type: "SET_ANTHROPOMETRY", value: { sex: "feminino", percentile: 75, age: 30 } });
        state = poseReducer(state, { type: "UPDATE_OPPOSITION_EXPLORATION", value: { kapandjiTarget: 20 } });

    const profile = selectProfile(state.anthropometry);
    const dims = selectDims(profile);
    const renderedThumb = selectRenderedThumb(state.thumb, state.exploreOverlayState, state.isExplorationMode);
    const sceneInput = selectSceneInput(dims, state.fingers, renderedThumb, state.wrist);

    expect(sceneInput).toHaveProperty("dims");
    expect(sceneInput).toHaveProperty("fingers");
    expect(sceneInput).toHaveProperty("thumb");
    expect(sceneInput).toHaveProperty("wrist");
    expect(sceneInput.fingers).toHaveLength(4);
    expect(typeof sceneInput.thumb.CMC_opp).toBe("number");
  });
});


