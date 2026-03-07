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

export function useThreeScene(mountRef, viewcubeRef) {
  const orbitRef = useRef(null);
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

  // Main render loop and scene controls.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const { scene, camera, renderer } = three;
    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    resize();
    window.addEventListener("resize", resize);
    if (!mount.contains(renderer.domElement)) mount.appendChild(renderer.domElement);

    let raf = 0;
    let disposed = false;
    let controls = null;

    const animate = () => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      controls?.update();
      mini.cube.setRotationFromQuaternion(new Quaternion().copy(camera.quaternion).invert());
      renderer.render(scene, camera);
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

      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse(object => {
        if (object.isMesh) {
          object.geometry?.dispose();
          object.material?.dispose();
        }
      });
    };
  }, [mountRef, mini, three]);

  // Viewcube render loop.
  useEffect(() => {
    const viewcube = viewcubeRef.current;
    if (!viewcube) return;

    const { scene, camera, renderer } = mini;
    renderer.setSize(100, 100);
    if (!viewcube.contains(renderer.domElement)) viewcube.appendChild(renderer.domElement);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      renderer.render(scene, camera);
    };

    loop();
    return () => {
      cancelAnimationFrame(raf);
      if (renderer.domElement.parentNode === viewcube) viewcube.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [mini, viewcubeRef]);

  return { three, mini, orbitRef, controlsReady };
}
