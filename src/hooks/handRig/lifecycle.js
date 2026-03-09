import { Box3, Quaternion, Vector3 } from "three";

const CMC_AUTOFRAME_KEYS = new Set(["TH_CMC_ABD", "TH_CMC_FLEX"]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCmcViewNormalWorld(plane) {
  if (!plane?.getWorldQuaternion) return null;
  return new Vector3(0, 0, 1).applyQuaternion(plane.getWorldQuaternion(new Quaternion())).normalize();
}

export function getViewportSize(three) {
  const width = three?.renderer?.domElement?.clientWidth || three?.renderer?.domElement?.width || 1;
  const height = three?.renderer?.domElement?.clientHeight || three?.renderer?.domElement?.height || 1;
  return { width, height };
}

export function frameRigToView(root, controls, camera) {
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
}

export function autoFrameCmcMeasurementView({
  rig,
  debugKey,
  dims,
  controls,
  camera,
  instant = false,
  smoothing = 0.26,
  targetEpsilon = 0.2,
  positionEpsilon = 0.35,
  angleEpsilonRad = 0.012,
} = {}) {
  if (!CMC_AUTOFRAME_KEYS.has(debugKey)) return false;
  if (!rig?.root || !controls || !camera) return false;

  const debugPkg = rig.dbgMap?.[debugKey];
  const plane = debugPkg?.plane;
  const cmcAnchor = rig.thumb?.cmcAbd;
  if (!plane || !cmcAnchor?.getWorldPosition) return false;

  rig.root.updateMatrixWorld(true);
  const target = cmcAnchor.getWorldPosition(new Vector3());
  const normal = getCmcViewNormalWorld(plane);
  if (!normal || normal.lengthSq() < 1e-6) return false;

  const palmLength = Number(dims?.palm?.LENGTH) || 70;
  const palmWidth = Number(dims?.palm?.WIDTH) || 55;
  const baseDistance = clamp(Math.max(palmLength, palmWidth) * 1.25, 55, 170);

  // Flex needs the palmar side, opposite to the default plane normal.
  const facingNormal = debugKey === "TH_CMC_FLEX" ? normal.clone().multiplyScalar(-1) : normal;
  const worldUp = new Vector3(0, 1, 0);
  const elevatedNormal = facingNormal.clone().add(worldUp.multiplyScalar(0.08)).normalize();
  const desiredPosition = target.clone().add(elevatedNormal.multiplyScalar(baseDistance));

  const currentTarget = controls.target?.clone?.() || new Vector3();
  const currentPos = camera.position?.clone?.() || new Vector3();

  const desiredDir = desiredPosition.clone().sub(target).normalize();
  const currentDir = currentPos.clone().sub(currentTarget).normalize();

  const targetDelta = currentTarget.distanceTo(target);
  const positionDelta = currentPos.distanceTo(desiredPosition);
  const angleDelta = currentDir.lengthSq() > 1e-8 ? currentDir.angleTo(desiredDir) : Math.PI;

  if (!instant && targetDelta <= targetEpsilon && positionDelta <= positionEpsilon && angleDelta <= angleEpsilonRad) {
    return false;
  }

  if (instant) {
    controls.target.copy(target);
    camera.position.copy(desiredPosition);
    controls.update();
    return true;
  }

  const blend = clamp(Number(smoothing) || 0.26, 0.08, 0.65);
  controls.target.lerp(target, blend);
  camera.position.lerp(desiredPosition, blend);
  controls.update();
  return true;
}

export function disposeRigResources(rig) {
  if (!rig?.root) return;
  rig.root.traverse(object => {
    if (!object?.geometry || !object?.material) return;
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach(material => material?.dispose?.());
    } else {
      object.material?.dispose?.();
    }
  });
}
