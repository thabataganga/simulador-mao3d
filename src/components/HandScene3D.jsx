import { useRef } from "react";

import { useThreeScene } from "../hooks/useThreeScene";
import { useHandRig } from "../hooks/useHandRig";

export default function HandScene3D({ sceneInput, debugKey }) {
  const mountRef = useRef(null);
  const viewcubeRef = useRef(null);
  const { three, orbitRef } = useThreeScene(mountRef, viewcubeRef);

  useHandRig({
    three,
    orbitRef,
    ...sceneInput,
    debugKey,
  });

  return (
    <main className="flex-1 relative">
      <div ref={mountRef} className="absolute inset-0" />
      <div ref={viewcubeRef} className="absolute top-4 right-4 rounded-md shadow-sm bg-white/60 p-1" />
    </main>
  );
}
