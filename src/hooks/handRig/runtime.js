import { useCallback, useEffect, useRef } from "react";
import { applyDebugSelection, didGoniometryChange, autoFrameCmcMeasurementView, frameRigToView, syncHandRigOverlays } from "../handRig";
import {
  applyPoseAndMeasure,
  buildOrRebuildRig,
  createResizeOverlaySyncHandler,
  disposeMountedRig,
  shouldRebuildRigInputs,
  shouldUseInstantCmcAutoFrame,
  syncDebugAndOverlays,
} from "./runtimePipeline";

export { shouldRebuildRigInputs, shouldUseInstantCmcAutoFrame };

export const handRigTestables = {
  applyDebugSelection,
  syncHandRigOverlays,
  didGoniometryChange,
  autoFrameCmcMeasurementView,
  shouldUseInstantCmcAutoFrame,
  shouldRebuildRigInputs,
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
        CMC_abd: Number.isFinite(Number(measured.CMC_abd)) ? Number(measured.CMC_abd) : 0,
        CMC_flex: Number.isFinite(Number(measured.CMC_flex)) ? Number(measured.CMC_flex) : 0,
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
    buildOrRebuildRig({
      scene: three?.scene,
      dims,
      handRigRef: handRig,
      mountedSceneRef,
      hasInitialFrameRef,
      cmcBaselineRef,
      lastRigBuildInputsRef,
    });
  }, [dims, three?.scene]);

  useEffect(
    () => () => {
      disposeMountedRig({
        mountedSceneRef,
        handRigRef: handRig,
        lastRigBuildInputsRef,
      });
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

    const measuredWithOpposition = applyPoseAndMeasure({
      rig,
      three,
      fingers,
      thumb,
      thumbClinical,
      thumbGoniometry,
      wrist,
      cmcBaseline: cmcBaselineRef.current,
      debugKey,
      dims,
    });

    if (!measuredWithOpposition || handRig.current !== rig) return;

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
    syncDebugAndOverlays({
      rig: handRig.current,
      debugKey,
      dims,
      thumbClinical,
      thumb,
      three,
      controlsReady,
      autoFrameCmcView,
      lastDebugKeyRef,
    });
  }, [autoFrameCmcView, controlsReady, debugKey, dims, thumb, thumbClinical, three]);

  const resizeParamsRef = useRef({ debugKey, dims, thumbClinical, thumb, three });
  resizeParamsRef.current = { debugKey, dims, thumbClinical, thumb, three };

  useEffect(() => {
    const onResize = createResizeOverlaySyncHandler({
      getRig: () => handRig.current,
      getParams: () => resizeParamsRef.current,
    });

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return handRig;
}

