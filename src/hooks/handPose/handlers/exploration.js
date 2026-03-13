import { buildClinicalOppositionEstimate, clampKapandjiLevel, resolveKapandjiOperationalPose } from "../../../domain/thumbKapandji";
import { createExplorationState, resetExplorationState as resetExplorationModelState, restoreThumbFromSnapshot, snapshotEditedThumb } from "../explorationState";

export function handleEnterOppositionExploration(state) {
  const snapshot = snapshotEditedThumb(state.thumb, state.exploration.userEditedThumb);

  return {
    ...state,
    exploration: createExplorationState({
      ...state.exploration,
      isActive: true,
      snapshotThumb: snapshot,
      kapandjiTarget: clampKapandjiLevel(state.kapandjiEstimatedFromRig),
      rigBaseline: state.thumbOppRig
        ? {
            level: state.thumbOppRig.level,
            rigDirection: state.thumbOppRig.rigDirection,
            rigMagnitudeDeg: state.thumbOppRig.rigMagnitudeDeg,
          }
        : null,
    }),
  };
}

export function handleUpdateOppositionExploration(state, action) {
  const kapandjiTarget = clampKapandjiLevel(action.value?.kapandjiTarget);
  const { commandDeg: targetClinicalOppositionDeg } = resolveKapandjiOperationalPose(kapandjiTarget);
  const { clinicalOppositionDeg: currentClinicalOppositionDeg } = buildClinicalOppositionEstimate(state.thumb);
  const deltaOpp = targetClinicalOppositionDeg - currentClinicalOppositionDeg;

  return {
    ...state,
    exploration: createExplorationState({
      ...state.exploration,
      isActive: true,
      kapandjiTarget,
      overlay: {
        ...state.exploration.overlay,
        CMC_opp: deltaOpp,
      },
    }),
  };
}

export function handleRestoreUserInputData(state) {
  return {
    ...state,
    thumb: restoreThumbFromSnapshot(state.thumb, state.exploration.snapshotThumb),
    exploration: resetExplorationModelState(state.exploration, state.kapandjiEstimatedFromRig),
  };
}

export function handleExitOppositionExploration(state) {
  return {
    ...state,
    exploration: resetExplorationModelState(state.exploration, state.kapandjiEstimatedFromRig),
  };
}
