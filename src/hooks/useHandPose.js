import { useEffect, useMemo, useRef, useState } from "react";
import { defaultFinger, defaultThumb, restFromDims } from "../utils";
import { useAnthropometry } from "./useAnthropometry";
import {
  applyGlobalGripToPose,
  calculateGlobalD2D5,
  createNeutralPose,
  createSceneInput,
  createZeroPose,
  setGlobalFingerAngle,
  setThumbAngle,
} from "../domain/pose";

export function useHandPose() {
  const [fingers, setFingers] = useState(Array.from({ length: 4 }, defaultFinger));
  const [thumb, setThumb] = useState(defaultThumb());
  const [wrist, setWrist] = useState({ flex: 0, dev: 0 });
  const [grip, setGrip] = useState(0);
  const [globalMode, setGlobalMode] = useState("none");
  const [activePreset, setActivePreset] = useState("none");
  const { sex, setSex, percentile, setPercentile, age, setAge, profile, dims } = useAnthropometry();

  // Initialize once with the neutral pose derived from anthropometric dimensions.
  const inited = useRef(false);
  useEffect(() => {
    if (inited.current) return;
    const { f, t, w } = restFromDims(dims);
    setFingers(f);
    setThumb(t);
    setWrist(w);
    inited.current = true;
  }, [dims]);

  const globalD2D5 = useMemo(() => calculateGlobalD2D5(fingers), [fingers]);

  const updateGlobalD2D5 = (key, value) => {
    setFingers(prev => setGlobalFingerAngle(prev, key, value));
  };

  const setThumbVal = (key, value) => {
    setThumb(prev => setThumbAngle(prev, key, value));
  };

  const applyGlobalGrip = (nextGrip, modeOverride) => {
    const nextPose = applyGlobalGripToPose(
      { fingers, thumb, wrist, globalMode },
      nextGrip,
      modeOverride,
    );
    setFingers(nextPose.fingers);
    setThumb(nextPose.thumb);
    setWrist(nextPose.wrist);
  };

  const presetFunctional = () => {
    setGlobalMode("functional");
    setGrip(50);
    const nextPose = applyGlobalGripToPose(
      { fingers, thumb, wrist, globalMode: "functional" },
      50,
      "functional",
    );
    setFingers(nextPose.fingers);
    setThumb(nextPose.thumb);
    setWrist(nextPose.wrist);
    setActivePreset("functional");
  };

  const presetNeutral = () => {
    const neutralPose = createNeutralPose(dims);
    setFingers(neutralPose.fingers);
    setThumb(neutralPose.thumb);
    setWrist(neutralPose.wrist);
    setGrip(neutralPose.grip);
    setActivePreset(neutralPose.activePreset);
  };

  const presetZero = () => {
    const zeroPose = createZeroPose();
    setFingers(zeroPose.fingers);
    setThumb(zeroPose.thumb);
    setWrist(zeroPose.wrist);
    setGrip(zeroPose.grip);
    setActivePreset(zeroPose.activePreset);
  };

  const poseState = {
    fingers,
    thumb,
    wrist,
    grip,
    globalMode,
    activePreset,
    profile,
    dims,
    globalD2D5,
    sex,
    percentile,
    age,
  };

  const poseActions = {
    setFingers,
    setThumb,
    setWrist,
    setGrip,
    setGlobalMode,
    setActivePreset,
    setSex,
    setPercentile,
    setAge,
    updateGlobalD2D5,
    setThumbVal,
    applyGlobalGrip,
    presetFunctional,
    presetNeutral,
    presetZero,
  };

  const sceneInput = useMemo(() => createSceneInput({ dims, fingers, thumb, wrist }), [dims, fingers, thumb, wrist]);

  return { poseState, poseActions, sceneInput };
}


