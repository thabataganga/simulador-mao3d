import { createHandPoseFixture } from "../fixtures/handPose.fixture";
import { poseReducer } from "../../hooks/handPose/reducer";
import {
  selectDims,
  selectProfile,
  selectRenderedThumb,
  selectSceneInput,
  selectThumbClinical,
  selectThumbGoniometry,
} from "../../hooks/handPose/selectors";

function toSceneState(state) {
  const profile = selectProfile(state.anthropometry);
  const dims = selectDims(profile);
  const renderedThumb = selectRenderedThumb(state.thumb, state.exploreOverlayState, state.isExplorationMode);
  const sceneInput = selectSceneInput(dims, state.fingers, renderedThumb, state.wrist);
  const thumbGoniometry = selectThumbGoniometry(state.thumb, state.thumbMeasured, state.cmcInput);
  const thumbClinical = selectThumbClinical(renderedThumb, state.kapandjiEstimatedFromRig, state.thumbOppRig);

  return {
    dims,
    sceneInput,
    thumbGoniometry,
    thumbClinical,
  };
}

describe("pose to scene pipeline integration", () => {
  test("keeps sceneInput contract after clinical actions", () => {
    let state = createHandPoseFixture();

    state = poseReducer(state, { type: "SET_ANTHROPOMETRY", value: { sex: "feminino", percentile: 75, age: 30 } });
    state = poseReducer(state, { type: "UPDATE_OPPOSITION_EXPLORATION", value: { kapandjiTarget: 20 } });

    const scene = toSceneState(state);

    expect(scene.sceneInput).toHaveProperty("dims");
    expect(scene.sceneInput).toHaveProperty("fingers");
    expect(scene.sceneInput).toHaveProperty("thumb");
    expect(scene.sceneInput).toHaveProperty("wrist");
    expect(scene.sceneInput.fingers).toHaveLength(4);
    expect(typeof scene.sceneInput.thumb.CMC_opp).toBe("number");
  });

  test("smoke: preset switching keeps render input and measurement contracts", () => {
    let state = createHandPoseFixture();

    state = poseReducer(state, { type: "APPLY_PRESET_FUNCTIONAL" });
    const afterFunctional = toSceneState(state);

    state = poseReducer(state, { type: "APPLY_PRESET_NEUTRAL", dims: afterFunctional.dims });
    const afterNeutral = toSceneState(state);

    state = poseReducer(state, { type: "APPLY_PRESET_ZERO" });
    const afterZero = toSceneState(state);

    [afterFunctional, afterNeutral, afterZero].forEach(scene => {
      expect(scene.sceneInput.fingers).toHaveLength(4);
      expect(typeof scene.sceneInput.thumb.CMC_abd).toBe("number");
      expect(typeof scene.sceneInput.thumb.CMC_flex).toBe("number");
      expect(typeof scene.thumbGoniometry.abd.rigMeasuredDeg).toBe("number");
      expect(typeof scene.thumbGoniometry.flex.rigMeasuredDeg).toBe("number");
      expect(scene.thumbClinical).toHaveProperty("opp");
    });
  });
});
