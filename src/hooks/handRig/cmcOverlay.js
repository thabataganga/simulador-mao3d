import { Vector3 } from "three";
import {
  buildGoniometerSegments,
  clamp01,
  ensureProjectedUnit,
  pointToSegmentDistance,
  rotateAroundAxis,
  signedAngleOnPlane,
  toNodeLocalVector,
} from "./overlayMath";

function computeCmcLabelPosition({
  fixedDir,
  movingDir,
  planeNormal,
  rayLength,
  arcRadius,
  lineWidthPx,
  key,
}) {
  const fixed = fixedDir.clone().normalize();
  const moving = movingDir.clone().normalize();
  const normal = planeNormal.clone().normalize();
  const angleAbs = Math.abs(signedAngleOnPlane(fixed, moving, normal));
  const openness = clamp01(angleAbs / (Math.PI / 2));

  let bisector = fixed.clone().add(moving);
  if (bisector.lengthSq() < 1e-6) bisector = fixed.clone();
  bisector.normalize();

  let lateral = new Vector3().crossVectors(normal, bisector);
  if (lateral.lengthSq() < 1e-6) lateral = new Vector3(0, 1, 0);
  lateral.normalize();

  const sideSign = key === "TH_CMC_FLEX" ? 1 : -1;
  const radialDistance = arcRadius + 13 + arcRadius * 0.45 + openness * 12;
  const lateralDistance = arcRadius * (1.05 + openness * 0.35);
  const normalLift = 2 + openness * 1.8;

  let candidate = bisector
    .multiplyScalar(radialDistance)
    .add(lateral.multiplyScalar(lateralDistance * sideSign))
    .add(normal.multiplyScalar(normalLift));

  const segments = buildGoniometerSegments({
    fixedDir: fixed,
    movingDir: moving,
    planeNormal: normal,
    rayLength,
    arcRadius,
  });
  const clearance = Math.max(11, arcRadius * 0.72, (lineWidthPx || 4) * 1.9);

  for (let i = 0; i < 4; i += 1) {
    const minDistance = Math.min(...segments.map(([a, b]) => pointToSegmentDistance(candidate, a, b)));
    if (minDistance >= clearance) break;
    const push = clearance - minDistance + 2.5;
    candidate = candidate
      .clone()
      .add(bisector.clone().multiplyScalar(push))
      .add(lateral.clone().multiplyScalar(push * 0.55 * sideSign))
      .add(normal.clone().multiplyScalar(0.8));
  }

  return candidate;
}

function getPalmLongitudinalWorld(rig) {
  const palmQuaternion = rig?.palm?.getWorldQuaternion?.();
  if (!palmQuaternion) return new Vector3(1, 0, 0);
  return new Vector3(1, 0, 0).applyQuaternion(palmQuaternion).normalize();
}

function computeCmcGoniometerVectors(rig) {
  const anchor = rig?.thumb?.mount;
  const cmcAbdNode = rig?.thumb?.cmcAbd;
  const cmcFlexNode = rig?.thumb?.cmcFlex;
  if (!anchor || !cmcAbdNode || !cmcFlexNode) return null;

  const fixedWorld = getPalmLongitudinalWorld(rig);
  const abdAngle = Number(cmcAbdNode.rotation?.z) || 0;
  const flexAngle = Number(cmcFlexNode.rotation?.y) || 0;

  const abdNormalLocal = new Vector3(0, 0, 1);
  const flexNormalLocal = new Vector3(0, 1, 0);
  const fallbackAxis = new Vector3(1, 0, 0);

  const fixedAbdLocal = ensureProjectedUnit(toNodeLocalVector(anchor, fixedWorld), abdNormalLocal, fallbackAxis);
  const fixedFlexLocal = ensureProjectedUnit(toNodeLocalVector(anchor, fixedWorld), flexNormalLocal, fallbackAxis);

  const movingAbdLocal = rotateAroundAxis(fixedAbdLocal, abdNormalLocal, abdAngle);
  const movingFlexLocal = rotateAroundAxis(fixedFlexLocal, flexNormalLocal, flexAngle);

  return {
    TH_CMC_FLEX: {
      fixedLocal: fixedFlexLocal,
      movingLocal: movingFlexLocal,
      normalLocal: flexNormalLocal,
    },
    TH_CMC_ABD: {
      fixedLocal: fixedAbdLocal,
      movingLocal: movingAbdLocal,
      normalLocal: abdNormalLocal,
    },
  };
}

export function updateCmcGoniometerOverlay(rig, debugKey, dims, viewport) {
  if (!rig) return;

  const cmcFlexPkg = rig.dbgMap?.TH_CMC_FLEX;
  const cmcAbdPkg = rig.dbgMap?.TH_CMC_ABD;
  if (!cmcFlexPkg && !cmcAbdPkg) return;

  const vectors = computeCmcGoniometerVectors(rig);
  if (!vectors) {
    cmcFlexPkg?.setGoniometer(null);
    cmcAbdPkg?.setGoniometer(null);
    return;
  }

  ["TH_CMC_FLEX", "TH_CMC_ABD"].forEach(key => {
    const pkg = rig.dbgMap?.[key];
    if (!pkg?.setGoniometer) return;

    if (debugKey !== key) {
      pkg.setGoniometer(null);
      pkg.setLabelPosition(null);
      return;
    }

    const v = vectors[key];
    if (!v) {
      pkg.setGoniometer(null);
      pkg.setLabelPosition(null);
      return;
    }

    const fixedDir = v.fixedLocal.clone();
    const movingDir = v.movingLocal.clone();
    const planeNormal = v.normalLocal.clone();

    const palmLength = dims?.palm?.LENGTH ?? 70;
    const palmWidth = dims?.palm?.WIDTH ?? 55;
    const palmSpan = Math.min(palmLength, palmWidth);
    const rayLength = Math.min(Math.max(palmSpan * 0.68, 22), 46);
    const arcRadius = Math.min(Math.max(palmSpan * 0.34, 12), 26);
    const lineWidthPx = 4.5;

    pkg.setGoniometer({
      fixedDir,
      movingDir,
      planeNormal,
      rayLength,
      arcRadius,
      lineWidthPx,
      viewport,
    });

    pkg.setLabelPosition(
      computeCmcLabelPosition({
        fixedDir,
        movingDir,
        planeNormal,
        rayLength,
        arcRadius,
        lineWidthPx,
        key,
      }),
    );
  });
}

