import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  WebGLRenderer,
} from "three";
import { attachRendererToElement, detachRendererFromElement, disposeSceneMaterials } from "./threeSceneLifecycle";

export function syncRendererSize(renderer, camera, width, height) {
  if (!renderer || !camera || width <= 0 || height <= 0) return false;

  const prevWidth = Number(renderer.userData?.viewportWidth) || 0;
  const prevHeight = Number(renderer.userData?.viewportHeight) || 0;
  const changed = prevWidth !== width || prevHeight !== height;
  if (!changed) return false;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.userData = {
    ...renderer.userData,
    viewportWidth: width,
    viewportHeight: height,
  };
  return true;
}

export function shouldRenderScene({ isVisible, mountReady }) {
  return Boolean(isVisible && mountReady);
}

export function useThreeScene(mountRef, viewcubeRef) {
  const orbitRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const frameRef = useRef(0);
  const framePendingRef = useRef(false);
  const mountedRef = useRef(false);
  const visibleRef = useRef(typeof document === "undefined" ? true : document.visibilityState !== "hidden");
  const invertedCameraQuaternionRef = useRef(new Quaternion());
  const miniAttachedRef = useRef(false);
  const [controlsReady, setControlsReady] = useState(false);

  const three = useMemo(() => {
    const scene = new Scene();
    scene.background = new Color("#f9f8f4");

    const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 260, 260);

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new HemisphereLight(0xffffff, 0x888888, 0.9));
    const dir = new DirectionalLight(0xffffff, 0.8);
    dir.position.set(120, 180, 100);
    scene.add(dir);
    scene.add(new GridHelper(400, 20, 0xdddddd, 0xeeeeee));

    return { scene, camera, renderer };
  }, []);

  const mini = useMemo(() => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    const cube = new Mesh(new BoxGeometry(1, 1, 1), new MeshNormalMaterial());
    scene.add(cube);

    return { scene, camera, renderer, cube };
  }, []);

  const renderFrame = useCallback(() => {
    framePendingRef.current = false;
    if (!shouldRenderScene({ isVisible: visibleRef.current, mountReady: mountedRef.current })) return;

    const { scene, camera, renderer } = three;
    const { scene: miniScene, camera: miniCamera, renderer: miniRenderer, cube: miniCube } = mini;
    const controlsChanged = orbitRef.current?.update?.() || false;

    invertedCameraQuaternionRef.current.copy(camera.quaternion).invert();
    miniCube.setRotationFromQuaternion(invertedCameraQuaternionRef.current);

    renderer.render(scene, camera);
    if (miniAttachedRef.current) {
      miniRenderer.render(miniScene, miniCamera);
    }

    if (controlsChanged) {
      framePendingRef.current = true;
      frameRef.current = requestAnimationFrame(renderFrame);
    }
  }, [mini, three]);

  const requestRender = useCallback(() => {
    if (framePendingRef.current || !shouldRenderScene({ isVisible: visibleRef.current, mountReady: mountedRef.current })) return;
    framePendingRef.current = true;
    frameRef.current = requestAnimationFrame(renderFrame);
  }, [renderFrame]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const { camera, renderer } = three;
    mountedRef.current = true;

    const resize = () => {
      const resized = syncRendererSize(renderer, camera, mount.clientWidth, mount.clientHeight);
      if (resized) requestRender();
    };

    resize();
    attachRendererToElement(mount, renderer);

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(mount);
    resizeObserverRef.current = resizeObserver;

    let disposed = false;
    let controls = null;
    const handleVisibilityChange = () => {
      visibleRef.current = document.visibilityState !== "hidden";
      if (!visibleRef.current && frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
        framePendingRef.current = false;
        return;
      }
      requestRender();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    (async () => {
      const controlsModule = await import("three/examples/jsm/controls/OrbitControls.js");
      if (disposed) return;

      controls = new controlsModule.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 60, 0);
      controls.addEventListener("change", requestRender);
      orbitRef.current = controls;
      setControlsReady(true);
      requestRender();
    })();

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      resizeObserver.disconnect();
      resizeObserverRef.current = null;
      mountedRef.current = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      framePendingRef.current = false;
      controls?.removeEventListener?.("change", requestRender);
      controls?.dispose();
      orbitRef.current = null;
      setControlsReady(false);

      miniAttachedRef.current = false;
      detachRendererFromElement(mount, renderer);
      renderer.dispose();
      mini.renderer.dispose();
      disposeSceneMaterials(three.scene);
      disposeSceneMaterials(mini.scene);
    };
  }, [mini, mountRef, requestRender, three]);

  useEffect(() => {
    const viewcube = viewcubeRef.current;
    if (!viewcube) return;

    const { camera, renderer } = mini;
    syncRendererSize(renderer, camera, 100, 100);
    attachRendererToElement(viewcube, renderer);
    miniAttachedRef.current = true;
    requestRender();

    return () => {
      miniAttachedRef.current = false;
      detachRendererFromElement(viewcube, renderer);
    };
  }, [mini, requestRender, viewcubeRef]);

  return { three, mini, orbitRef, controlsReady, requestRender };
}
