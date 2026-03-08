import { buildClinicalOppositionEstimate, clampKapandjiLevel, resolveKapandjiOperationalPose } from "../../../domain/thumbKapandji";
import { ZERO_OVERLAY } from "../constants";

export function handleEnterOppositionExploration(state) {
  const snapshot = Object.keys(state.userEditedThumb || {}).reduce((acc, key) => {
    if (!state.userEditedThumb[key]) return acc;
    acc[key] = state.thumb[key];
    return acc;
  }, {});

  return {
    ...state,
    isExplorationMode: true,
    explorationSnapshotThumb: snapshot,
    explorationKapandjiTarget: clampKapandjiLevel(state.kapandjiEstimatedFromRig),
    explorationRigBaseline: state.thumbOppRig
      ? {
          level: state.thumbOppRig.level,
          rigDirection: state.thumbOppRig.rigDirection,
          rigMagnitudeDeg: state.thumbOppRig.rigMagnitudeDeg,
        }
      : null,
  };
}

export function handleUpdateOppositionExploration(state, action) {
  const kapandjiTarget = clampKapandjiLevel(action.value?.kapandjiTarget);
  const { commandDeg: targetClinicalOppositionDeg } = resolveKapandjiOperationalPose(kapandjiTarget);
  const { clinicalOppositionDeg: currentClinicalOppositionDeg } = buildClinicalOppositionEstimate(state.thumb);
  const deltaOpp = targetClinicalOppositionDeg - currentClinicalOppositionDeg;

  return {
    ...state,
    isExplorationMode: true,
    explorationKapandjiTarget: kapandjiTarget,
    exploreOverlayState: {
      ...ZERO_OVERLAY,
      CMC_opp: deltaOpp,
    },
  };
}

export function handleRestoreUserInputData(state) {
  const restoredThumb = { ...state.thumb };
  Object.keys(state.explorationSnapshotThumb || {}).forEach(key => {
    restoredThumb[key] = state.explorationSnapshotThumb[key];
  });

  return {
    ...state,
    thumb: restoredThumb,
    isExplorationMode: false,
    exploreOverlayState: { ...ZERO_OVERLAY },
    explorationKapandjiTarget: clampKapandjiLevel(state.kapandjiEstimatedFromRig),
    explorationRigBaseline: null,
  };
}

export function handleExitOppositionExploration(state) {
  return {
    ...state,
    isExplorationMode: false,
    exploreOverlayState: { ...ZERO_OVERLAY },
    explorationKapandjiTarget: clampKapandjiLevel(state.kapandjiEstimatedFromRig),
    explorationRigBaseline: null,
  };
}
