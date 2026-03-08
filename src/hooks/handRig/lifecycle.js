import { Box3, Vector3 } from "three";

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
