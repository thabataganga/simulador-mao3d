import { useCallback, useEffect, useRef } from "react";
import { Box3, Quaternion, Vector3 } from "three";
import { buildHandRig } from "../three/buildHandRig";
import { setLabelText } from "../three/helpers";
import { deg2rad, clamp } from "../utils";
import { RANGES } from "../constants";
import { mapClinicalThumbToRigRadians, measureThumbCmcGoniometryFromRig } from "../domain/thumb";


const GLOBAL_DEBUG_KEY_TO_JOINT = {
  GLOBAL_MCP: "MCP",
  GLOBAL_PIP: "PIP",
  GLOBAL_DIP: "DIP",
};

const formatDegree = value => String(Math.round(value)) + String.fromCharCode(176);

function formatDirectional(labelPositive, labelNegative, value) {
  const direction = value >= 0 ? labelPositive : labelNegative;
  return `${direction} ${formatDegree(Math.abs(value))}`;
}

const CMC_DEBUG_KEYS = new Set(["TH_CMC_FLEX", "TH_CMC_ABD"]);

function projectOnPlane(vector, planeNormal) {
  const normal = planeNormal.clone().normalize();
  return vector.clone().sub(normal.multiplyScalar(vector.dot(normal)));
}

function toPalmFrameVector(palm, worldVector) {
  const quaternion = palm.getWorldQuaternion(new Quaternion());
  const inverse = quaternion.clone().invert();
  return worldVector.clone().applyQuaternion(inverse);
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

function getViewportSize(three) {
  const width = three?.renderer?.domElement?.clientWidth || three?.renderer?.domElement?.width || 1;
  const height = three?.renderer?.domElement?.clientHeight || three?.renderer?.domElement?.height || 1;
  return { width, height };
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
    const minDistance = Math.min(
      ...segments.map(([a, b]) => pointToSegmentDistance(candidate, a, b)),
    );
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

function computeCmcGoniometerVectors(rig) {
  const cmcOrigin = rig?.thumb?.cmcAbd?.getWorldPosition?.(new Vector3());
  const thumbMcp = rig?.thumb?.mcp?.getWorldPosition?.(new Vector3());
  const d2Mcp = rig?.fingers?.[0]?.mcp?.getWorldPosition?.(new Vector3());
  const d2Pip = rig?.fingers?.[0]?.pip?.getWorldPosition?.(new Vector3());
  const palm = rig?.palm;
  if (!cmcOrigin || !thumbMcp || !d2Mcp || !d2Pip || !palm) return null;

  const mobileWorld = thumbMcp.clone().sub(cmcOrigin);
  const fixedWorld = d2Pip.clone().sub(d2Mcp);

  const mobilePalm = toPalmFrameVector(palm, mobileWorld);
  const fixedPalm = toPalmFrameVector(palm, fixedWorld);

  const palmNormal = new Vector3(0, 1, 0);
  const palmTransverse = new Vector3(0, 0, 1);

  const flexFixedPalm = projectOnPlane(fixedPalm, palmNormal);
  const flexMovingPalm = projectOnPlane(mobilePalm, palmNormal);

  const abdFixedPalm = projectOnPlane(fixedPalm, palmTransverse);
  const abdMovingPalm = projectOnPlane(mobilePalm, palmTransverse);

  const worldFromPalm = palm.getWorldQuaternion(new Quaternion());
  const flexFixedWorld = flexFixedPalm.clone().normalize().applyQuaternion(worldFromPalm);
  const flexMovingWorld = flexMovingPalm.clone().normalize().applyQuaternion(worldFromPalm);
  const flexNormalWorld = palmNormal.clone().applyQuaternion(worldFromPalm).normalize();

  const abdFixedWorld = abdFixedPalm.clone().normalize().applyQuaternion(worldFromPalm);
  const abdMovingWorld = abdMovingPalm.clone().normalize().applyQuaternion(worldFromPalm);
  const abdNormalWorld = palmTransverse.clone().applyQuaternion(worldFromPalm).normalize();

  return {
    TH_CMC_FLEX: {
      fixedWorld: flexFixedWorld,
      movingWorld: flexMovingWorld,
      normalWorld: flexNormalWorld,
    },
    TH_CMC_ABD: {
      fixedWorld: abdFixedWorld,
      movingWorld: abdMovingWorld,
      normalWorld: abdNormalWorld,
    },
  };
}

function updateCmcGoniometerOverlay(rig, debugKey, dims, viewport) {
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

    const fixedDir = toNodeLocalVector(pkg.plane.parent, v.fixedWorld);
    const movingDir = toNodeLocalVector(pkg.plane.parent, v.movingWorld);
    const planeNormal = toNodeLocalVector(pkg.plane.parent, v.normalWorld);

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

function applyMainLabels(rig, fingers, thumb, wrist, cmcMeasured) {
  const map = rig.dbgMap;
  setLabelText(map.GLOBAL_MCP?.label, `MCP: ${formatDegree(fingers[1].MCP)}`);
  setLabelText(map.GLOBAL_PIP?.label, `PIP: ${formatDegree(fingers[1].PIP)}`);
  setLabelText(map.GLOBAL_DIP?.label, `DIP: ${formatDegree(fingers[1].DIP)}`);
  setLabelText(map.WR_FLEX?.label, `Flex: ${formatDegree(wrist.flex)}`);
  setLabelText(map.WR_DEV?.label, `Desvio: ${formatDegree(wrist.dev)}`);

  const thumbLabels = rig.thumbLabels;
  if (!thumbLabels) return;

  const measuredAbd = cmcMeasured?.CMC_abd ?? thumb.CMC_abd;
  const measuredFlex = cmcMeasured?.CMC_flex ?? thumb.CMC_flex;

  setLabelText(thumbLabels.abd, `CMC: ${formatDirectional("abducao", "aducao", measuredAbd)}`);
  setLabelText(thumbLabels.flex, `CMC: ${formatDirectional("flexao", "extensao", measuredFlex)}`);
  setLabelText(thumbLabels.opp, `CMC opp: ${formatDegree(thumb.CMC_opp)}`);
  setLabelText(thumbLabels.mcp, `MCP: ${formatDegree(thumb.MCP_flex)}`);
  setLabelText(thumbLabels.ip, `IP: ${formatDegree(thumb.IP)}`);
}

function applyPoseToRig(rig, fingers, thumb, wrist, debugKey, dims, viewport) {
  if (!rig) return;

  fingers.forEach((fingerState, index) => {
    const finger = rig.fingers[index];
    finger.mcp.rotation.z = deg2rad(clamp(fingerState.MCP, RANGES.MCP));
    finger.pip.rotation.z = deg2rad(clamp(fingerState.PIP, RANGES.PIP));
    finger.dip.rotation.z = deg2rad(clamp(fingerState.DIP, RANGES.DIP));
  });

  rig.wrist.dev.rotation.x = deg2rad(clamp(wrist.dev, RANGES.WRIST_DEV));
  rig.wrist.flex.rotation.z = deg2rad(clamp(wrist.flex, RANGES.WRIST_FLEX));

  const thumbRig = rig.thumb;
  const thumbMapped = mapClinicalThumbToRigRadians(thumb);

  thumbRig.cmcAbd.rotation.z = thumbMapped.radians.cmcAbd;
  thumbRig.cmcFlex.rotation.y = thumbMapped.radians.cmcFlex;
  thumbRig.cmcPronation.rotation.x = thumbMapped.radians.cmcPronation;
  thumbRig.mcp.rotation.z = -thumbMapped.radians.mcpFlex;
  thumbRig.mcpAccessory.rotation.x = thumbMapped.radians.mcpAccessory;
  thumbRig.ip.rotation.z = -thumbMapped.radians.ipFlex;

  rig.root.updateMatrixWorld(true);
  const cmcMeasured = measureThumbCmcGoniometryFromRig(rig);
  applyMainLabels(rig, fingers, thumb, wrist, cmcMeasured);
  updateCmcGoniometerOverlay(rig, debugKey, dims, viewport);
  return cmcMeasured;
}

export function useHandRig({ three, orbitRef, controlsReady = false, dims, fingers, thumb, wrist, debugKey, onThumbGoniometry }) {
  const handRig = useRef(null);
  const hasInitialFrameRef = useRef(false);
  const lastPalmLengthRef = useRef(null);
  const poseRef = useRef({ fingers, thumb, wrist });

  useEffect(() => {
    poseRef.current = { fingers, thumb, wrist };
  }, [fingers, thumb, wrist]);

  // Camera framing for current rig dimensions.
  const frameRig = useCallback(() => {
    const root = handRig.current?.root;
    const controls = orbitRef.current;
    const camera = three?.camera;
    if (!root || !controls || !camera) return;

    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(root);
    const size = new Vector3();
    box.getSize(size);
    const center = new Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    controls.target.copy(center);
    camera.position.copy(center.clone().add(new Vector3(1, 0.9, 1).normalize().multiplyScalar(maxDim * 2.2)));
    controls.minDistance = maxDim * 0.8;
    controls.maxDistance = maxDim * 6;
    controls.update();
  }, [orbitRef, three]);

  // Rebuild rig whenever dimensions change, preserving current camera view.
  useEffect(() => {
    if (!three?.scene) return;

    if (handRig.current) {
      three.scene.remove(handRig.current.root);
      handRig.current.root.traverse(object => {
        if (!object?.geometry || !object?.material) return;
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material?.dispose?.());
        } else {
          object.material?.dispose?.();
        }
      });
    }

    handRig.current = buildHandRig(dims);
    three.scene.add(handRig.current.root);

    const currentPose = poseRef.current;
    const measured = applyPoseToRig(
      handRig.current,
      currentPose.fingers,
      currentPose.thumb,
      currentPose.wrist,
      debugKey,
      dims,
      getViewportSize(three),
    );
    if (measured && onThumbGoniometry) onThumbGoniometry(measured);

    const prevPalmLength = lastPalmLengthRef.current;
    const nextPalmLength = dims?.palm?.LENGTH || 0;
    const shouldRefit =
      prevPalmLength == null ||
      prevPalmLength <= 0 ||
      Math.abs(nextPalmLength - prevPalmLength) / prevPalmLength > 0.08;

    lastPalmLengthRef.current = nextPalmLength;
    if (controlsReady && shouldRefit) frameRig();
  }, [controlsReady, debugKey, dims, frameRig, onThumbGoniometry, three]);

  // Ensure first frame is centered once controls are ready.
  useEffect(() => {
    if (!controlsReady || hasInitialFrameRef.current) return;
    frameRig();
    hasInitialFrameRef.current = true;
  }, [controlsReady, frameRig]);

  // Apply pose updates and refresh labels.
  useEffect(() => {
    const measured = applyPoseToRig(handRig.current, fingers, thumb, wrist, debugKey, dims, getViewportSize(three));
    if (measured && onThumbGoniometry) onThumbGoniometry(measured);
  }, [debugKey, dims, fingers, onThumbGoniometry, three, thumb, wrist]);

  // Highlight active articulation.
  useEffect(() => {
    const rig = handRig.current;
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

    if (!CMC_DEBUG_KEYS.has(debugKey)) {
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
  }, [debugKey, dims, three]);

  useEffect(() => {
    const onResize = () => {
      const rig = handRig.current;
      if (!rig || !CMC_DEBUG_KEYS.has(debugKey)) return;
      const viewport = getViewportSize(three);
      rig.dbgMap?.TH_CMC_FLEX?.setGoniometerResolution(viewport);
      rig.dbgMap?.TH_CMC_ABD?.setGoniometerResolution(viewport);
      updateCmcGoniometerOverlay(rig, debugKey, dims, viewport);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [debugKey, dims, three]);

  return handRig;
}
