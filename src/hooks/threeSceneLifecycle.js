export function attachRendererToElement(host, renderer) {
  if (!host || !renderer?.domElement) return;
  if (!host.contains(renderer.domElement)) host.appendChild(renderer.domElement);
}

export function detachRendererFromElement(host, renderer) {
  if (!host || !renderer?.domElement) return;
  if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
}

export function disposeSceneMaterials(scene) {
  scene?.traverse?.(object => {
    if (!object?.geometry || !object?.material) return;
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach(material => material?.dispose?.());
    } else {
      object.material?.dispose?.();
    }
  });
}
