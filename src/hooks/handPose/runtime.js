import { useMemo, useReducer } from "react";
import {
  createMetricTracker,
  createPoseActions,
  createHandPoseInitialState,
  createUseHandPoseInitialState,
  poseReducer,
  selectDims,
  selectGlobalD2D5,
  selectPoseState,
  selectProfile,
  selectRenderedThumb,
  selectSceneInput,
  selectThumbClinical,
  selectThumbGoniometry,
} from "./index";

export const handPoseTestables = {
  createInitialState: createHandPoseInitialState,
  poseReducer,
};

export function useHandPoseRuntime() {
  const [state, dispatch] = useReducer(poseReducer, undefined, createUseHandPoseInitialState);

  const profile = useMemo(() => selectProfile(state.anthropometry), [state.anthropometry]);
  const dims = useMemo(() => selectDims(profile), [profile]);
  const globalD2D5 = useMemo(() => selectGlobalD2D5(state.fingers), [state.fingers]);
  const renderedThumb = useMemo(
    () => selectRenderedThumb(state.thumb, state.exploreOverlayState, state.isExplorationMode),
    [state.thumb, state.exploreOverlayState, state.isExplorationMode],
  );
  const thumbGoniometry = useMemo(
    () => selectThumbGoniometry(state.thumb, state.thumbMeasured, state.cmcInput),
    [state.thumb, state.thumbMeasured, state.cmcInput],
  );
  const thumbClinical = useMemo(
    () =>
      selectThumbClinical(renderedThumb, state.kapandjiEstimatedFromRig, state.thumbOppRig, {
        isExplorationMode: state.isExplorationMode,
        explorationKapandjiTarget: state.explorationKapandjiTarget,
        explorationRigBaseline: state.explorationRigBaseline,
      }),
    [
      renderedThumb,
      state.kapandjiEstimatedFromRig,
      state.thumbOppRig,
      state.isExplorationMode,
      state.explorationKapandjiTarget,
      state.explorationRigBaseline,
    ],
  );

  const track = useMemo(() => createMetricTracker(), []);

  const poseActions = useMemo(
    () =>
      createPoseActions({
        dispatch,
        track,
        dims,
        globalMode: state.globalMode,
      }),
    [dims, state.globalMode, track],
  );

  const poseState = useMemo(
    () =>
      selectPoseState(state, {
        profile,
        dims,
        globalD2D5,
        thumbGoniometry,
        thumbClinical,
      }),
    [dims, globalD2D5, profile, state, thumbClinical, thumbGoniometry],
  );

  const sceneInput = useMemo(
    () => selectSceneInput(dims, state.fingers, renderedThumb, state.wrist),
    [dims, renderedThumb, state.fingers, state.wrist],
  );

  return { poseState, poseActions, sceneInput };
}
