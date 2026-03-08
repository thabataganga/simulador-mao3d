import { Quaternion, Vector3 } from "three";
import { RANGES } from "../../constants/biomechanics";
import { mapClinicalThumbToRigRadians } from "../../domain/thumb";
import { ANGULAR_CMC_DEBUG_KEYS, GLOBAL_DEBUG_KEY_TO_JOINT, OPPOSITION_DEBUG_KEY } from "./constants";
import { getViewportSize } from "./lifecycle";

function projectOnPlane(vector, planeNormal) {
  const normal = planeNormal.clone().normalize();
  return vector.clone().sub(normal.multiplyScalar(vector.dot(normal)));
}

function toNodeLocalVector(node, worldVector) {
  const quaternion = node.getWorldQuaternion(new Quaternion());
  const inverse = quaternion.clone().invert();
  return worldVector.clone().applyQuaternion(inverse);
}

function signedAngleOnPlane(from, to, planeNormal) {
  const fromLen = from.length();
  const toLen = to.length();
  if (fromLen < 1e-6 || toLen < 1e-6) return 0;
  const fromUnit = from.clone().multiplyScalar(1 / fromLen);
  const toUnit = to.clone().multiplyScalar(1 / toLen);
  const angle = fromUnit.angleTo(toUnit);
  const cross = new Vector3().crossVectors(fromUnit, toUnit);
  const sign = Math.sign(cross.dot(planeNormal)) || 1;
  return angle * sign;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function pointToSegmentDistance(point, segA, segB) {
  const ab = segB.clone().sub(segA);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-8) return point.distanceTo(segA);
  const t = clamp01(point.clone().sub(segA).dot(ab) / abLenSq);
  const projection = segA.clone().add(ab.multiplyScalar(t));
  return point.distanceTo(projection);
}

function buildGoniometerSegments({ fixedDir, movingDir, planeNormal, rayLength, arcRadius }) {
  const fixed = fixedDir.clone().normalize();
  const moving = movingDir.clone().normalize();
  const normal = planeNormal.clone().normalize();

  const origin = new Vector3(0, 0, 0);
  const fixedEnd = fixed.clone().multiplyScalar(rayLength);
  const movingEnd = moving.clone().multiplyScalar(rayLength);

  const segments = [
    [origin, fixedEnd],
    [origin, movingEnd],
  ];

  const angle = signedAngleOnPlane(fixed, moving, normal);
  const basisU = fixed.clone();
  const basisV = new Vector3().crossVectors(normal, basisU).normalize();
  if (basisV.lengthSq() < 1e-8) return segments;

  const samples = 10;
  let prev = basisU.clone().multiplyScalar(arcRadius);
  for (let i = 1; i <= samples; i += 1) {
    const t = angle * (i / samples);
    const point = basisU
      .clone()
      .multiplyScalar(Math.cos(t))
      .add(basisV.clone().multiplyScalar(Math.sin(t)))
      .multiplyScalar(arcRadius);
    segments.push([prev, point]);
    prev = point;
  }

  return segments;
}

function rotateAroundAxis(vector, axis, radians) {
  const q = new Quaternion().setFromAxisAngle(axis.clone().normalize(), radians);
  return vector.clone().applyQuaternion(q);
}

function ensureProjectedUnit(vector, planeNormal, fallback) {
  const projected = projectOnPlane(vector, planeNormal);
  if (projected.lengthSq() < 1e-8) return fallback.clone();
  return projected.normalize();
}

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
  const palmQuaternion = rig?.palm?.getWorldQuaternion?.(new Quaternion());
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

function buildOppositionReferencePoints(rig, thumb) {
  const tipNode = rig?.tips?.thumb;
  const localFrame = rig?.thumb?.debug?.cmcOpp;
  const thumbRig = rig?.thumb;
  if (!tipNode || !localFrame || !thumbRig || !thumb) return null;

  const original = {
    cmcAbd: thumbRig.cmcAbd.rotation.z,
    cmcFlex: thumbRig.cmcFlex.rotation.y,
    cmcPronation: thumbRig.cmcPronation.rotation.x,
    mcp: thumbRig.mcp.rotation.z,
    mcpAccessory: thumbRig.mcpAccessory.rotation.x,
    ip: thumbRig.ip.rotation.z,
  };

  const [oppMin, oppMax] = RANGES.CMC_OPP;
  const step = (oppMax - oppMin) / 10;
  const points = [];
  for (let level = 0; level <= 10; level += 1) {
    const sampleThumb = {
      ...thumb,
      CMC_opp: oppMin + level * step,
    };
    const mapped = mapClinicalThumbToRigRadians(sampleThumb);

    thumbRig.cmcAbd.rotation.z = mapped.radians.cmcAbd;
    thumbRig.cmcFlex.rotation.y = mapped.radians.cmcFlex;
    thumbRig.cmcPronation.rotation.x = mapped.radians.cmcPronation;
    thumbRig.mcp.rotation.z = -mapped.radians.mcpFlex;
    thumbRig.mcpAccessory.rotation.x = mapped.radians.mcpAccessory;
    thumbRig.ip.rotation.z = -mapped.radians.ipFlex;

    rig.root.updateMatrixWorld(true);
    const tipLocal = localFrame.worldToLocal(tipNode.getWorldPosition(new Vector3()));
    points.push(tipLocal.clone());
  }

  thumbRig.cmcAbd.rotation.z = original.cmcAbd;
  thumbRig.cmcFlex.rotation.y = original.cmcFlex;
  thumbRig.cmcPronation.rotation.x = original.cmcPronation;
  thumbRig.mcp.rotation.z = original.mcp;
  thumbRig.mcpAccessory.rotation.x = original.mcpAccessory;
  thumbRig.ip.rotation.z = original.ip;
  rig.root.updateMatrixWorld(true);

  return points;
}

function estimateKapandjiFromRig(rig, points) {
  const tipNode = rig?.tips?.thumb;
  const localFrame = rig?.thumb?.debug?.cmcOpp;
  if (!tipNode || !localFrame || !Array.isArray(points) || points.length < 11) return 0;

  const tipLocal = localFrame.worldToLocal(tipNode.getWorldPosition(new Vector3()));
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distance = tipLocal.distanceTo(point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function computeOppositionLabelPosition(points, targetIndex) {
  const target = points?.[targetIndex];
  if (!target) return null;
  return target.clone().add(new Vector3(4.5, 7.5, 0));
}

export function updateThumbOppositionOverlay(rig, debugKey, dims, thumbClinical, viewport, thumb) {
  if (debugKey !== OPPOSITION_DEBUG_KEY) {
    const pkg = rig?.dbgMap?.[OPPOSITION_DEBUG_KEY];
    pkg?.setOppositionReference?.(null);
    pkg?.setLabelPosition?.(null);
    return Number(thumbClinical?.opp?.estimatedLevel) || 0;
  }

  const points = buildOppositionReferencePoints(rig, thumb);
  const estimatedLevel = estimateKapandjiFromRig(rig, points);
  const pkg = rig?.dbgMap?.[OPPOSITION_DEBUG_KEY];
  if (!pkg?.setOppositionReference) return estimatedLevel;

  if (!points) {
    pkg.setOppositionReference(null);
    pkg.setLabelPosition(null);
    return estimatedLevel;
  }

  const level = Number(thumbClinical?.opp?.estimatedLevel ?? estimatedLevel) || 0;
  pkg.setOppositionReference({
    points,
    targetIndex: level,
    pointRadius: (dims?.thumbWid?.[0] ?? 10) * 0.08,
    targetRadius: (dims?.thumbWid?.[0] ?? 10) * 0.13,
    viewport,
    lineWidthPx: 4.5,
  });
  pkg.setLabelPosition(computeOppositionLabelPosition(points, level));
  return estimatedLevel;
}

export function applyDebugSelection(rig, debugKey, dims, thumbClinical, thumb, three) {
  if (!rig) return;

  const map = rig.dbgMap;
  Object.values(map).forEach(item => item.setVisible(false));

  const globalJoint = GLOBAL_DEBUG_KEY_TO_JOINT[debugKey];
  if (globalJoint) {
    ["D2", "D3", "D4", "D5"].forEach(digit => map[`${digit}_${globalJoint}`]?.setVisible(true));
    if (map[debugKey]?.label) map[debugKey].label.visible = true;
  } else if (debugKey !== "off" && map[debugKey]) {
    map[debugKey].setVisible(true);
  }

  if (!ANGULAR_CMC_DEBUG_KEYS.has(debugKey)) {
    map.TH_CMC_FLEX?.setGoniometer(null);
    map.TH_CMC_ABD?.setGoniometer(null);
    map.TH_CMC_FLEX?.setLabelPosition(null);
    map.TH_CMC_ABD?.setLabelPosition(null);
  } else {
    if (map.TH_CMC_FLEX?.axes) map.TH_CMC_FLEX.axes.visible = false;
    if (map.TH_CMC_ABD?.axes) map.TH_CMC_ABD.axes.visible = false;
    const viewport = getViewportSize(three);
    map.TH_CMC_FLEX?.setGoniometerResolution(viewport);
    map.TH_CMC_ABD?.setGoniometerResolution(viewport);
    updateCmcGoniometerOverlay(rig, debugKey, dims, viewport);
  }

  if (debugKey !== OPPOSITION_DEBUG_KEY) {
    map.TH_CMC_OPP?.setOppositionReference(null);
    map.TH_CMC_OPP?.setLabelPosition(null);
  } else {
    if (map.TH_CMC_OPP?.axes) map.TH_CMC_OPP.axes.visible = false;
    const viewport = getViewportSize(three);
    map.TH_CMC_OPP?.setOppositionReferenceResolution(viewport);
    updateThumbOppositionOverlay(rig, debugKey, dims, thumbClinical, viewport, thumb);
  }

  const highlight = rig.highlight;
  highlight.all.forEach(mesh => {
    if (mesh.material && mesh.userData.baseColor) {
      mesh.material.color.copy(mesh.userData.baseColor);
      mesh.material.emissive?.set(0x000000);
    }
  });

  const targets = globalJoint
    ? ["D2", "D3", "D4", "D5"].flatMap(digit => highlight.map[`${digit}_${globalJoint}`] || [])
    : highlight.map[debugKey] || [];

  targets.forEach(mesh => {
    if (mesh.material) {
      mesh.material.color.set(0xffcc66);
      mesh.material.emissive?.set(0x553300);
    }
  });
}

