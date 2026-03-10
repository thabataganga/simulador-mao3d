import { useCallback, useEffect, useRef } from "react";
import { buildHandRig } from "../../three/buildHandRig";
import { measureThumbCmcGoniometryFromRig } from "../../domain/thumb";
import {
  ANGULAR_CMC_DEBUG_KEYS,
  OPPOSITION_DEBUG_KEY,
  applyDebugSelection,
  applyPoseToRig,
  autoFrameCmcMeasurementView,
  didGoniometryChange,
  disposeRigResources,
  frameRigToView,
  getViewportSize,
  updateCmcGoniometerOverlay,
  updateThumbOppositionOverlay,
} from "../handRig";

const CMC_AUTOFRAME_KEYS = new Set(["TH_CMC_FLEX_EXT", "TH_CMC_ABD_ADD"]);

export function shouldUseInstantCmcAutoFrame(previousDebugKey, nextDebugKey) {
  return CMC_AUTOFRAME_KEYS.has(nextDebugKey) && previousDebugKey !== nextDebugKey;
}

export const handRigTestables = {
  didGoniometryChange,
  applyDebugSelection,
  autoFrameCmcMeasurementView,
  shouldUseInstantCmcAutoFrame,
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
  const hasInitialFrameRef = useRef(false);
  const lastPalmLengthRef = useRef(null);
  const cmcBaselineRef = useRef({ CMC_flexExt: 0, CMC_abdAdd: 0 });
  const lastEmittedGoniometryRef = useRef(null);
  const lastOppositionEstimateRef = useRef(null);
  const lastDebugKeyRef = useRef(debugKey);
  const poseRef = useRef({ fingers, thumb, thumbClinical, thumbGoniometry, wrist });

  useEffect(() => {
    poseRef.current = { fingers, thumb, thumbClinical, thumbGoniometry, wrist };
  }, [fingers, thumb, thumbClinical, thumbGoniometry, wrist]);

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
        CMC_flexExt: Number(measured.CMC_flexExt) || 0,
        CMC_abdAdd: Number(measured.CMC_abdAdd) || 0,
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
    if (!three?.scene) return;

    if (handRig.current) {
      three.scene.remove(handRig.current.root);
      disposeRigResources(handRig.current);
    }

    handRig.current = buildHandRig(dims);
    three.scene.add(handRig.current.root);

    const neutralMeasurement = measureThumbCmcGoniometryFromRig(handRig.current, {
      thumb: { CMC_flexExt: 0, CMC_abdAdd: 0, CMC_opp: 0 },
    });
    cmcBaselineRef.current = {
      CMC_flexExt: neutralMeasurement?.isolated?.CMC_flexExt || 0,
      CMC_abdAdd: neutralMeasurement?.isolated?.CMC_abdAdd || 0,
    };

    const currentPose = poseRef.current;
    const measured = applyPoseToRig(
      handRig.current,
      currentPose.fingers,
      currentPose.thumb,
      currentPose.thumbClinical,
      currentPose.thumbGoniometry,
      currentPose.wrist,
      debugKey,
      dims,
      getViewportSize(three),
      cmcBaselineRef.current,
    );
    emitThumbGoniometry(measured);
    emitOppositionEstimate(measured);
    if (controlsReady) autoFrameCmcView({ instant: true });

    const prevPalmLength = lastPalmLengthRef.current;
    const nextPalmLength = dims?.palm?.LENGTH || 0;
    const shouldRefit =
      prevPalmLength == null ||
      prevPalmLength <= 0 ||
      Math.abs(nextPalmLength - prevPalmLength) / prevPalmLength > 0.08;

    lastPalmLengthRef.current = nextPalmLength;
    if (controlsReady && shouldRefit) frameRig();
  }, [controlsReady, debugKey, dims, emitThumbGoniometry, emitOppositionEstimate, frameRig, autoFrameCmcView, three]);

  useEffect(() => {
    if (!controlsReady || hasInitialFrameRef.current) return;
    frameRig();
    hasInitialFrameRef.current = true;
  }, [controlsReady, frameRig]);

  useEffect(() => {
    const measured = applyPoseToRig(
      handRig.current,
      fingers,
      thumb,
      thumbClinical,
      thumbGoniometry,
      wrist,
      debugKey,
      dims,
      getViewportSize(three),
      cmcBaselineRef.current,
    );
    emitThumbGoniometry(measured);
    emitOppositionEstimate(measured);

    if (controlsReady) {
      const instant = shouldUseInstantCmcAutoFrame(lastDebugKeyRef.current, debugKey);
      autoFrameCmcView({ instant });
    }
    lastDebugKeyRef.current = debugKey;
  }, [
    debugKey,
    dims,
    emitThumbGoniometry,
    emitOppositionEstimate,
    fingers,
    controlsReady,
    autoFrameCmcView,
    three,
    thumb,
    thumbClinical,
    thumbGoniometry,
    wrist,
  ]);

  useEffect(() => {
    applyDebugSelection(handRig.current, debugKey, dims, thumbClinical, thumb, three);
  }, [debugKey, dims, thumb, thumbClinical, three]);

  useEffect(() => {
    const onResize = () => {
      const rig = handRig.current;
      if (!rig) return;
      const viewport = getViewportSize(three);
      if (ANGULAR_CMC_DEBUG_KEYS.has(debugKey)) {
        rig.dbgMap?.TH_CMC_ABD_ADD?.setGoniometerResolution(viewport);
        rig.dbgMap?.TH_CMC_FLEX_EXT?.setGoniometerResolution(viewport);
        updateCmcGoniometerOverlay(rig, debugKey, dims, viewport);
      }
      if (debugKey === OPPOSITION_DEBUG_KEY) {
        rig.dbgMap?.TH_CMC_OPP?.setOppositionReferenceResolution(viewport);
        updateThumbOppositionOverlay(rig, debugKey, dims, thumbClinical, viewport, thumb);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [debugKey, dims, thumb, thumbClinical, three]);

  return handRig;
}
