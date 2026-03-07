import { useEffect, useRef, useState } from "react";
import { useAnthropometry } from "./useAnthropometry";
import { RANGES, THUMB_RANGE_KEY } from "../constants";
import { buildProfile, makeDims, defaultFinger, defaultThumb, restFromDims, computeGrip, clamp } from "../utils";

export function useHandPose() {
  const [fingers,      setFingers]      = useState(Array.from({ length: 4 }, defaultFinger));
  const [thumb,        setThumb]        = useState(defaultThumb());
  const [wrist,        setWrist]        = useState({ flex: 0, dev: 0 });
  const [grip,         setGrip]         = useState(0);
  const [globalMode,   setGlobalMode]   = useState("none");
  const [activePreset, setActivePreset] = useState("none");
  const { sex, setSex, percentile, setPercentile, age, setAge, profile, dims } = useAnthropometry();

  // Inicializa em posição de repouso
  const inited = useRef(false);
  useEffect(() => {
    if (inited.current) return;
    const { f, t, w } = restFromDims(dims);
    setFingers(f); setThumb(t); setWrist(w);
    inited.current = true;
  }, [dims]);

  // ── Controles ──────────────────────────────────────────────────────────────
  const updateGlobalD2D5 = (key, value) =>
    setFingers(prev => prev.map(f => ({ ...f, [key]: clamp(value, RANGES[key]) })));

  const globalD2D5 = {
    MCP: Math.round(fingers.reduce((s, f) => s + f.MCP, 0) / 4),
    PIP: Math.round(fingers.reduce((s, f) => s + f.PIP, 0) / 4),
    DIP: Math.round(fingers.reduce((s, f) => s + f.DIP, 0) / 4),
  };

  const setThumbVal = (k, v) => setThumb(p => ({ ...p, [k]: clamp(v, RANGES[THUMB_RANGE_KEY[k]]) }));

  const applyGlobalGrip = (g, modeOv) => {
    const mode   = modeOv || globalMode || "functional";
    const result = computeGrip(g, mode);
    if (result.pinchOnly) {
      setFingers(prev => prev.map((_, i) => i === 0 ? { ...prev[i], ...result.finger } : defaultFinger()));
    } else {
      setFingers(prev => prev.map(() => result.finger));
      setWrist(w => ({ ...w, ...result.wrist }));
    }
    setThumb(p => ({ ...p, ...result.thumb }));
  };

  // ── Presets ────────────────────────────────────────────────────────────────
  const presetFunctional = () => {
    setGlobalMode("functional"); setGrip(50);
    applyGlobalGrip(50, "functional"); setActivePreset("functional");
  };
  const presetNeutral = () => {
    const { f, t, w } = restFromDims(dims);
    setFingers(f); setThumb(t); setWrist(w); setGrip(0);
    setActivePreset("neutro");
  };
  const presetZero = () => {
    setFingers(Array.from({ length: 4 }, defaultFinger));
    setThumb(defaultThumb()); setWrist({ flex: 0, dev: 0 }); setGrip(0);
    setActivePreset("zero");
  };

  return {
    // Estado
    fingers, setFingers,
    thumb, setThumb,
    wrist, setWrist,
    grip, setGrip,
    globalMode, setGlobalMode,
    activePreset, setActivePreset,
    // Derivados
    profile, dims, globalD2D5,
    // Ações
    sex, setSex,
    percentile, setPercentile,
    age, setAge,
    updateGlobalD2D5, setThumbVal, applyGlobalGrip,
    presetFunctional, presetNeutral, presetZero,
  };
}