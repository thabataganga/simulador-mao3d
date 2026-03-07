import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function useThreeScene(mountRef, viewcubeRef) {
  const orbitRef = useRef(null);

  const three = useMemo(() => {
    const scene    = new THREE.Scene(); scene.background = new THREE.Color("#f9f8f4");
    const camera   = new THREE.PerspectiveCamera(45, 1, 0.1, 1000); camera.position.set(0, 260, 260);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(120, 180, 100); scene.add(dir);
    scene.add(new THREE.GridHelper(400, 20, 0xdddddd, 0xeeeeee));
    return { scene, camera, renderer };
  }, []);

  const mini = useMemo(() => {
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(35, 1, 0.1, 1000); camera.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const cube     = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial()); scene.add(cube);
    return { scene, camera, renderer, cube };
  }, []);

  // Loop principal
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06; controls.target.set(0, 60, 0);
    orbitRef.current = controls;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      mini.cube.setRotationFromQuaternion(new THREE.Quaternion().copy(camera.quaternion).invert());
      renderer.render(scene, camera);
    };

    animate();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      controls.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose(); } });
    };
  }, [mountRef, mini, three]);

  // Viewcube
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

  return { three, mini, orbitRef };
}
