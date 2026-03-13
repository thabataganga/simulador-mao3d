import { useEffect, useMemo, useRef, useState } from "react";
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

export function useThreeScene(mountRef, viewcubeRef) {
  const orbitRef = useRef(null);
  const [controlsReady, setControlsReady] = useState(false);
  const invertedCameraQuaternionRef = useRef(new Quaternion());
  const mainRendererSizeRef = useRef({ width: 0, height: 0 });
  const miniRendererSizeRef = useRef({ width: 0, height: 0 });
  const miniAttachedRef = useRef(false);

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

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const { scene, camera, renderer } = three;
    const { scene: miniScene, camera: miniCamera, renderer: miniRenderer, cube: miniCube } = mini;

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width <= 0 || height <= 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const prev = mainRendererSizeRef.current;
      if (prev.width !== width || prev.height !== height) {
        renderer.setSize(width, height);
        mainRendererSizeRef.current = { width, height };
      }
    };

    resize();
    window.addEventListener("resize", resize);
    attachRendererToElement(mount, renderer);

    let raf = 0;
    let disposed = false;
    let controls = null;

    // DevTools may warn about long rAF handlers in development; this is a performance hint, not a runtime error.
    const animate = () => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      controls?.update();

      invertedCameraQuaternionRef.current.copy(camera.quaternion).invert();
      miniCube.setRotationFromQuaternion(invertedCameraQuaternionRef.current);

      renderer.render(scene, camera);
      if (miniAttachedRef.current && !disposed) {
        miniRenderer.render(miniScene, miniCamera);
      }
    };

    (async () => {
      const controlsModule = await import("three/examples/jsm/controls/OrbitControls.js");
      if (disposed) return;

      controls = new controlsModule.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 60, 0);
      orbitRef.current = controls;
      setControlsReady(true);

      animate();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      controls?.dispose();
      orbitRef.current = null;
      setControlsReady(false);

      miniAttachedRef.current = false;
      detachRendererFromElement(mount, renderer);
      renderer.dispose();
      miniRenderer.dispose();
      disposeSceneMaterials(scene);
    };
  }, [mini, mountRef, three]);

  useEffect(() => {
    const viewcube = viewcubeRef.current;
    if (!viewcube) return;

    const { renderer } = mini;
    const targetWidth = 100;
    const targetHeight = 100;
    const prev = miniRendererSizeRef.current;
    if (prev.width !== targetWidth || prev.height !== targetHeight) {
      renderer.setSize(targetWidth, targetHeight);
      miniRendererSizeRef.current = { width: targetWidth, height: targetHeight };
    }

    attachRendererToElement(viewcube, renderer);
    miniAttachedRef.current = true;

    return () => {
      miniAttachedRef.current = false;
      detachRendererFromElement(viewcube, renderer);
    };
  }, [mini, viewcubeRef]);

  return { three, mini, orbitRef, controlsReady };
}
