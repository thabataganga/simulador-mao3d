import { buildHandRig } from "../../three/buildHandRig";
import { measureThumbCmcGoniometryFromRig } from "../../domain/thumb";
import {
  CMC_AUTOFRAME_KEYS,
  applyDebugSelection,
  applyPoseToRig,
  buildOppositionMetricFromLevel,
  disposeRigResources,
  getViewportSize,
  syncHandRigOverlays,
} from "../handRig";

/**
 * @typedef {{ CMC_abd: number, CMC_flex: number }} CmcBaseline
 * @typedef {{ scene: object, dims: object }} RigBuildInputs
 */

export function shouldUseInstantCmcAutoFrame(previousDebugKey, nextDebugKey) {
  return CMC_AUTOFRAME_KEYS.has(nextDebugKey) && previousDebugKey !== nextDebugKey;
}

export function shouldRebuildRigInputs(previous, next) {
  if (!previous) return true;
  return previous.scene !== next.scene || previous.dims !== next.dims;
}

export function buildOrRebuildRig({
  scene,
  dims,
  handRigRef,
  mountedSceneRef,
  hasInitialFrameRef,
  cmcBaselineRef,
  lastRigBuildInputsRef,
}) {
  if (!scene) return null;

  const nextBuildInputs = /** @type {RigBuildInputs} */ ({ scene, dims });
  if (!shouldRebuildRigInputs(lastRigBuildInputsRef.current, nextBuildInputs)) {
    return handRigRef.current;
  }

  lastRigBuildInputsRef.current = nextBuildInputs;

  const previousRig = handRigRef.current;
  const previousScene = mountedSceneRef.current;
  if (previousRig && previousScene) {
    previousScene.remove(previousRig.root);
    disposeRigResources(previousRig);
    handRigRef.current = null;
  }

  const rig = buildHandRig(dims);
  if (!rig?.root) {
    handRigRef.current = null;
    mountedSceneRef.current = null;
    hasInitialFrameRef.current = false;
    return null;
  }

  handRigRef.current = rig;
  mountedSceneRef.current = scene;
  scene.add(rig.root);
  hasInitialFrameRef.current = false;

  const neutralMeasurement = measureThumbCmcGoniometryFromRig(rig, {
    thumb: { CMC_abd: 0, CMC_flex: 0, CMC_opp: 0 },
  });

  cmcBaselineRef.current = /** @type {CmcBaseline} */ ({
    CMC_abd: neutralMeasurement?.isolated?.CMC_abd || 0,
    CMC_flex: neutralMeasurement?.isolated?.CMC_flex || 0,
  });

  return rig;
}

export function applyPoseAndMeasure({
  rig,
  three,
  fingers,
  thumb,
  thumbClinical,
  thumbGoniometry,
  wrist,
  cmcBaseline,
  debugKey,
  dims,
}) {
  if (!rig) return null;

  const viewport = getViewportSize(three);
  const measured = applyPoseToRig(rig, fingers, thumb, thumbClinical, thumbGoniometry, wrist, cmcBaseline);
  const kapandjiEstimatedLevel = syncHandRigOverlays({
    rig,
    debugKey,
    dims,
    thumbClinical,
    viewport,
    thumb,
  });

  return {
    ...measured,
    kapandjiEstimatedLevel,
    oppositionMetric: buildOppositionMetricFromLevel(kapandjiEstimatedLevel),
  };
}

export function syncDebugAndOverlays({
  rig,
  debugKey,
  dims,
  thumbClinical,
  thumb,
  three,
  controlsReady,
  autoFrameCmcView,
  lastDebugKeyRef,
}) {
  if (!rig) return;

  applyDebugSelection(rig, debugKey);
  syncHandRigOverlays({
    rig,
    debugKey,
    dims,
    thumbClinical,
    viewport: getViewportSize(three),
    thumb,
  });

  if (controlsReady) {
    const instant = shouldUseInstantCmcAutoFrame(lastDebugKeyRef.current, debugKey);
    autoFrameCmcView({ instant });
  }

  lastDebugKeyRef.current = debugKey;
}

export function createResizeOverlaySyncHandler({ getRig, getParams }) {
  return () => {
    const rig = getRig();
    if (!rig) return;

    const { debugKey, dims, thumbClinical, thumb, three } = getParams();
    syncHandRigOverlays({
      rig,
      debugKey,
      dims,
      thumbClinical,
      viewport: getViewportSize(three),
      thumb,
    });
  };
}

export function disposeMountedRig({ mountedSceneRef, handRigRef, lastRigBuildInputsRef }) {
  const scene = mountedSceneRef.current;
  const rig = handRigRef.current;
  if (scene && rig) {
    scene.remove(rig.root);
    disposeRigResources(rig);
  }

  handRigRef.current = null;
  mountedSceneRef.current = null;
  lastRigBuildInputsRef.current = null;
}


