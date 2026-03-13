import { ZERO_OVERLAY } from "./constants";
import { clampKapandjiLevel } from "../../domain/thumbKapandji";

export function createExplorationState({
  isActive = false,
  overlay = ZERO_OVERLAY,
  kapandjiTarget = 0,
  rigBaseline = null,
  snapshotThumb = {},
  userEditedThumb = {},
} = {}) {
  return {
    isActive,
    overlay: { ...ZERO_OVERLAY, ...overlay },
    kapandjiTarget: clampKapandjiLevel(kapandjiTarget),
    rigBaseline,
    snapshotThumb: { ...snapshotThumb },
    userEditedThumb: { ...userEditedThumb },
  };
}

export function resetExplorationState(exploration, kapandjiEstimatedFromRig, { keepUserEditedThumb = true } = {}) {
  return createExplorationState({
    kapandjiTarget: clampKapandjiLevel(kapandjiEstimatedFromRig),
    userEditedThumb: keepUserEditedThumb ? exploration?.userEditedThumb : {},
  });
}

export function markThumbAxisEdited(exploration, key) {
  return createExplorationState({
    ...exploration,
    userEditedThumb: { ...exploration?.userEditedThumb, [key]: true },
  });
}

export function snapshotEditedThumb(thumb, userEditedThumb) {
  return Object.keys(userEditedThumb || {}).reduce((acc, key) => {
    if (!userEditedThumb[key]) return acc;
    acc[key] = thumb[key];
    return acc;
  }, {});
}

export function restoreThumbFromSnapshot(thumb, snapshotThumb) {
  const restoredThumb = { ...thumb };
  Object.keys(snapshotThumb || {}).forEach(key => {
    restoredThumb[key] = snapshotThumb[key];
  });
  return restoredThumb;
}
