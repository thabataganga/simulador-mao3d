import { useCallback, useEffect, useRef } from "react";
import { buildHandRig } from "../../three/buildHandRig";
import { measureThumbCmcGoniometryFromRig } from "../../domain/thumb";
import {
  CMC_AUTOFRAME_KEYS,
  applyDebugSelection,
  applyPoseToRig,
  autoFrameCmcMeasurementView,
  buildOppositionMetricFromLevel,
  didGoniometryChange,
  disposeRigResources,
  frameRigToView,
  getViewportSize,
  syncHandRigOverlays,
} from "../handRig";

export function shouldUseInstantCmcAutoFrame(previousDebugKey, nextDebugKey) {
  return CMC_AUTOFRAME_KEYS.has(nextDebugKey) && previousDebugKey !== nextDebugKey;
}

export function shouldRebuildRigInputs(previous, next) {
  if (!previous) return true;
  return previous.scene !== next.scene || previous.dims !== next.dims;
}

export const handRigTestables = {
  didGoniometryChange,
  applyDebugSelection,
  autoFrameCmcMeasurementView,
  shouldUseInstantCmcAutoFrame,
  shouldRebuildRigInputs,
  syncHandRigOverlays,
};

export function useHandRigRuntime({
  three,
  orbitRef,
  controlsReady = false,
  dims,
  fingers,
  thumb,
  thumbClinical,
  thumbGoniometry,
  wrist,
  debugKey,
  onThumbGoniometry,
  onOppositionEstimate,
}) {
  const handRig = useRef(null);
  const mountedSceneRef = useRef(null);
  const hasInitialFrameRef = useRef(false);
  const cmcBaselineRef = useRef({ CMC_abd: 0, CMC_flex: 0 });
  const lastEmittedGoniometryRef = useRef(null);
  const lastOppositionEstimateRef = useRef(null);
  const lastDebugKeyRef = useRef(debugKey);
  const lastRigBuildInputsRef = useRef(null);

  const emitOppositionEstimate = useCallback(
    measured => {
      if (!onOppositionEstimate) return;

      const metric = measured?.oppositionMetric;
      if (!metric) return;

      const nextLevel = Number(metric.level);
      const nextDirection = metric.rigDirection === "retroposicao" ? "retroposicao" : "oposicao";
      const nextMagnitudeRaw = Number(metric.rigMagnitudeDeg);
      const nextMagnitudeDeg = Number.isFinite(nextMagnitudeRaw) ? Math.abs(nextMagnitudeRaw) : null;
      if (!Number.isFinite(nextLevel)) return;

      const prev = lastOppositionEstimateRef.current;
      const unchanged =
        prev &&
        prev.level === nextLevel &&
        prev.rigDirection === nextDirection &&
        prev.rigMagnitudeDeg === nextMagnitudeDeg;
      if (unchanged) return;

      const nextPayload = {
        level: Math.round(nextLevel),
        rigDirection: nextDirection,
        rigMagnitudeDeg: nextMagnitudeDeg,
      };

      lastOppositionEstimateRef.current = nextPayload;
      onOppositionEstimate(nextPayload);
    },
    [onOppositionEstimate],
  );

  const emitThumbGoniometry = useCallback(
    measured => {
      if (!onThumbGoniometry || !didGoniometryChange(lastEmittedGoniometryRef.current, measured)) return;
      lastEmittedGoniometryRef.current = {
        CMC_abd: Number(measured.CMC_abd) || 0,
        CMC_flex: Number(measured.CMC_flex) || 0,
      };
      onThumbGoniometry(lastEmittedGoniometryRef.current);
    },
    [onThumbGoniometry],
  );

  const frameRig = useCallback(() => {
    frameRigToView(handRig.current?.root, orbitRef.current, three?.camera);
  }, [orbitRef, three]);

  const autoFrameCmcView = useCallback(
    ({ instant = false } = {}) => {
      autoFrameCmcMeasurementView({
        rig: handRig.current,
        debugKey,
        dims,
        controls: orbitRef.current,
        camera: three?.camera,
        instant,
      });
    },
    [debugKey, dims, orbitRef, three],
  );

  useEffect(() => {
    const scene = three?.scene;
    if (!scene) return;

    const nextBuildInputs = { scene, dims };
    if (!shouldRebuildRigInputs(lastRigBuildInputsRef.current, nextBuildInputs)) return;
    lastRigBuildInputsRef.current = nextBuildInputs;

    const previousRig = handRig.current;
    const previousScene = mountedSceneRef.current;
    if (previousRig && previousScene) {
      previousScene.remove(previousRig.root);
      disposeRigResources(previousRig);
      handRig.current = null;
    }

    const rig = buildHandRig(dims);
    handRig.current = rig;
    mountedSceneRef.current = scene;
    scene.add(rig.root);
    hasInitialFrameRef.current = false;

    const neutralMeasurement = measureThumbCmcGoniometryFromRig(rig, {
      thumb: { CMC_abd: 0, CMC_flex: 0, CMC_opp: 0 },
    });
    cmcBaselineRef.current = {
      CMC_abd: neutralMeasurement?.isolated?.CMC_abd || 0,
      CMC_flex: neutralMeasurement?.isolated?.CMC_flex || 0,
    };
  }, [dims, three?.scene]);

  useEffect(
    () => () => {
      const scene = mountedSceneRef.current;
      const rig = handRig.current;
      if (scene && rig) {
        scene.remove(rig.root);
        disposeRigResources(rig);
      }
      handRig.current = null;
      mountedSceneRef.current = null;
      lastRigBuildInputsRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!controlsReady || hasInitialFrameRef.current) return;
    frameRig();
    hasInitialFrameRef.current = true;
  }, [controlsReady, frameRig, dims, three?.scene]);

  useEffect(() => {
    const rig = handRig.current;
    if (!rig) return;

    const viewport = getViewportSize(three);
    const measured = applyPoseToRig(
      rig,
      fingers,
      thumb,
      thumbClinical,
      thumbGoniometry,
      wrist,
      cmcBaselineRef.current,
    );

    const kapandjiEstimatedLevel = syncHandRigOverlays({
      rig,
      debugKey,
      dims,
      thumbClinical,
      viewport,
      thumb,
    });

    if (handRig.current !== rig) return;

    const measuredWithOpposition = {
      ...measured,
      kapandjiEstimatedLevel,
      oppositionMetric: buildOppositionMetricFromLevel(kapandjiEstimatedLevel),
    };

    emitThumbGoniometry(measuredWithOpposition);
    emitOppositionEstimate(measuredWithOpposition);
  }, [
    dims,
    emitThumbGoniometry,
    emitOppositionEstimate,
    fingers,
    three,
    thumb,
    thumbClinical,
    thumbGoniometry,
    wrist,
    debugKey,
  ]);

  useEffect(() => {
    const rig = handRig.current;
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
  }, [autoFrameCmcView, controlsReady, debugKey, dims, thumb, thumbClinical, three]);

  useEffect(() => {
    const onResize = () => {
      const rig = handRig.current;
      if (!rig) return;
      syncHandRigOverlays({
        rig,
        debugKey,
        dims,
        thumbClinical,
        viewport: getViewportSize(three),
        thumb,
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [debugKey, dims, thumb, thumbClinical, three]);

  return handRig;
}
