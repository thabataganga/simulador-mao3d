import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const deg2rad = (d) => (d * Math.PI) / 180;
const rad2deg = (r) => (r * 180) / Math.PI;
const clamp = (v, [min, max]) => Math.min(Math.max(v, min), max);

const RANGES = {
  MCP: [-45, 90],
  PIP: [0, 100],
  DIP: [-20, 80],
  CMC_ABD: [-10, 60],
  CMC_OPP: [-40, 70],
  CMC_FLEX: [0, 30],
  THUMB_MCP_FLEX: [0, 60],
  THUMB_IP: [-10, 80],
  WRIST_FLEX: [-70, 80],
  WRIST_DEV: [-30, 20],
};

const PALM_DIMS = { LENGTH: 70, THICKNESS: 14, WIDTH: 55 };
const THUMB_BASE_RATIO = { xL: 24 / 70, yT: -3 / 14, zW: 36 / 55 };
const RATIOS = {
  baseZ: [18 / 55, 6 / 55, -6 / 55, -18 / 55],
  fingerWidths: [10 / 14, 9 / 14, 8 / 14],
  thumbWidths: [10 / 14, 9 / 14],
};
const PHAL_RATIOS = {
  D2: { totalVsD3: 0.882, seg: { pp: 0.51, pm: 0.287, pd: 0.203 } },
  D3: { totalVsD3: 1, seg: { pp: 0.505, pm: 0.298, pd: 0.197 } },
  D4: { totalVsD3: 0.954, seg: { pp: 0.491, pm: 0.304, pd: 0.205 } },
  D5: { totalVsD3: 0.756, seg: { pp: 0.49, pm: 0.271, pd: 0.239 } },
};
const THUMB_RATIOS = { totalVsD3: 0.602, seg: { pp: 0.593, pd: 0.407 } };
const TIP_SOFT_MM = { D2: 3.84, D3: 3.95, D4: 3.95, D5: 3.73, TH: 5.67 };

const SEX_RATIOS = {
  masculino: {
    palmWidthToLength: 0.8,
    palmThickToWidth: 0.27,
    wristRadToPalmWidth: 0.3,
    wristLenToPalmThick: 1.1,
    forearmLenToPalmLen: 1.75,
    forearmProxToWrist: 1.15,
    forearmDistToWrist: 0.9,
    d3ToPalm: 1.03,
    thumbBaseFromProx: 0.18,
  },
  feminino: {
    palmWidthToLength: 0.82,
    palmThickToWidth: 0.25,
    wristRadToPalmWidth: 0.29,
    wristLenToPalmThick: 1.05,
    forearmLenToPalmLen: 1.7,
    forearmProxToWrist: 1.1,
    forearmDistToWrist: 0.88,
    d3ToPalm: 0.99,
    thumbBaseFromProx: 0.16,
  },
};
const PERC_OPTIONS = [5, 25, 50, 75, 95];

const interpPercentileScale = (p0) => {
  const p = Math.min(Math.max(p0, 5), 95);
  if (p <= 50) return 0.92 + ((p - 5) / 45) * (1 - 0.92);
  return 1 + ((p - 50) / 45) * (1.08 - 1);
};
const ageScale = (age0) => {
  const a = Math.min(Math.max(age0, 5), 90);
  const pts = [
    [5, 0.6],
    [10, 0.78],
    [14, 0.9],
    [18, 1],
    [65, 1],
    [80, 0.98],
    [90, 0.96],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a0, s0] = pts[i],
      [a1, s1] = pts[i + 1];
    if (a >= a0 && a <= a1) return s0 + ((a - a0) / (a1 - a0)) * (s1 - s0);
  }
  return 1;
};

function buildProfile(sex, percentile, age) {
  const male = sex === "masculino";
  const sx = male
    ? { palmScale: 1.05, palmAspect: { width: 1.03, thickness: 1.05 }, fingerScale: 1.03, thumbScale: 1.03, thumbBase: { ...THUMB_BASE_RATIO, zW: THUMB_BASE_RATIO.zW * 1.02 } }
    : { palmScale: 0.97, palmAspect: { width: 0.98, thickness: 0.95 }, fingerScale: 0.98, thumbScale: 0.98, thumbBase: { ...THUMB_BASE_RATIO, zW: THUMB_BASE_RATIO.zW * 0.98 } };
  const pScale = interpPercentileScale(percentile);
  const aScale = ageScale(age);
  return {
    label: `${male ? "Masculino" : "Feminino"} P${percentile}`,
    sex: male ? "masculino" : "feminino",
    palmScale: sx.palmScale * pScale * aScale,
    palmAspect: sx.palmAspect,
    fingerScale: sx.fingerScale * pScale * aScale,
    thumbScale: sx.thumbScale * pScale * aScale,
    thumbBase: sx.thumbBase,
  };
}

function makeDims(profile) {
  const R = SEX_RATIOS[profile.sex || "masculino"];
  const palmLen = PALM_DIMS.LENGTH * (profile.palmScale ?? 1);
  const palmWidth = palmLen * R.palmWidthToLength;
  const palmThick = palmWidth * R.palmThickToWidth;
  const palm = { LENGTH: palmLen, WIDTH: palmWidth, THICKNESS: palmThick };
  const D3_TOTAL = R.d3ToPalm * palm.LENGTH * (profile.fingerScale ?? 1);
  const mkFinger = (ratio) => {
    const total = D3_TOTAL * ratio.totalVsD3;
    return { len: [total * ratio.seg.pp, total * ratio.seg.pm, total * ratio.seg.pd] };
  };
  const fingers = [mkFinger(PHAL_RATIOS.D2), mkFinger(PHAL_RATIOS.D3), mkFinger(PHAL_RATIOS.D4), mkFinger(PHAL_RATIOS.D5)];
  const fingerWid = RATIOS.fingerWidths.map((r) => r * palm.THICKNESS);
  const thumbTotal = D3_TOTAL * THUMB_RATIOS.totalVsD3 * (profile.thumbScale ? profile.thumbScale / (profile.fingerScale || 1) : 1);
  const thumbLen = [thumbTotal * THUMB_RATIOS.seg.pp, thumbTotal * THUMB_RATIOS.seg.pd];
  const thumbWid = RATIOS.thumbWidths.map((r) => r * palm.THICKNESS);
  const padDistal = THREE.MathUtils.clamp(0.3 * palm.THICKNESS, 1.5, 6);
  const baseX = palm.LENGTH / 2 + padDistal;
  const baseZ = RATIOS.baseZ.map((r) => r * palm.WIDTH);
  const thumbBase = {
    x: -palm.LENGTH / 2 + R.thumbBaseFromProx * palm.LENGTH,
    y: palm.THICKNESS * (profile.thumbBase?.yT ?? THUMB_BASE_RATIO.yT),
    z: palm.WIDTH * (profile.thumbBase?.zW ?? THUMB_BASE_RATIO.zW),
  };
  const wrist = { radius: palm.WIDTH * R.wristRadToPalmWidth, length: palm.THICKNESS * R.wristLenToPalmThick };
  const forearm = {
    len: palm.LENGTH * R.forearmLenToPalmLen,
    radProx: palm.WIDTH * R.wristRadToPalmWidth * R.forearmProxToWrist,
    radDist: palm.WIDTH * R.wristRadToPalmWidth * R.forearmDistToWrist,
  };
  const softScale = palm.LENGTH / PALM_DIMS.LENGTH;
  const tipPads = { index: TIP_SOFT_MM.D2 * softScale, middle: TIP_SOFT_MM.D3 * softScale, ring: TIP_SOFT_MM.D4 * softScale, little: TIP_SOFT_MM.D5 * softScale, thumb: TIP_SOFT_MM.TH * softScale };
  const neutralThumb = { abd: deg2rad(45), flex: deg2rad(12), opp: deg2rad(12) };
  const neutralFingers = [
    { mcp: deg2rad(15), pip: deg2rad(20), dip: deg2rad(10) },
    { mcp: deg2rad(20), pip: deg2rad(25), dip: deg2rad(10) },
    { mcp: deg2rad(25), pip: deg2rad(30), dip: deg2rad(15) },
    { mcp: deg2rad(30), pip: deg2rad(35), dip: deg2rad(15) },
  ];
  return { palm, fingers, fingerWid, thumbLen, thumbWid, baseX, baseZ, thumbBase, forearm, wrist, tipPads, neutralThumb, neutralFingers };
}

function makeLabel(text, scale = 1.6) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontPx = Math.round(44 * scale);
  const pad = 10;
  ctx.font = `${fontPx}px Arial`;
  const w = Math.ceil(ctx.measureText(text).width + pad * 2),
    h = Math.ceil(fontPx + pad * 2);
  canvas.width = w; canvas.height = h;
  ctx.fillStyle = "rgba(20,20,20,0.85)"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  const unitPerPx = 0.02 * scale; spr.scale.set(w * unitPerPx, h * unitPerPx, 1);
  spr.userData = { canvas, ctx, tex, pad, fontPx };
  return spr;
}
const setLabelText = (spr, text) => {
  if (!spr) return;
  const { canvas, ctx, tex, pad, fontPx } = spr.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(20,20,20,0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, canvas.height / 2); tex.needsUpdate = true;
};
function makeDebugPackage(group, key, planeAxis, sx, sy, axesSize, label) {
  const axes = new THREE.AxesHelper(axesSize); group.add(axes);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(sx, sy),
    new THREE.MeshBasicMaterial({ color: 0x3bb7a2, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  if (planeAxis === "YZ") plane.rotation.y = Math.PI / 2;
  if (planeAxis === "ZX") plane.rotation.x = Math.PI / 2;
  group.add(plane);
  const spr = makeLabel(label); spr.position.set(0, sy * 0.6, 0); group.add(spr);
  const setVisible = (v) => { axes.visible = v; plane.visible = v; spr.visible = v; };
  setVisible(false);
  return { key, axes, plane, label: spr, setVisible };
}

const defaultFinger = () => ({ MCP: 0, PIP: 0, DIP: 0 });
const defaultThumb = () => ({ CMC_abd: 0, CMC_opp: 0, CMC_flex: 0, MCP_flex: 0, IP: 0 });

function DebugSelect({ active, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-700 mt-1 select-none">
      <input type="checkbox" checked={active} onChange={(e) => onChange(e.target.checked)} /> Destacar
    </label>
  );
}

function LabeledSlider({ label, min, max, step = 1, value, onChange, leftHint, rightHint, disabled, afterHeader }) {
  const [temp, setTemp] = useState(value);
  useEffect(() => setTemp(value), [value]);
  const commit = () => {
    let n = Number(temp);
    if (!Number.isFinite(n)) return setTemp(String(value));
    const v = clamp(Math.round(n / step) * step, [min, max]);
    setTemp(String(v));
    onChange(v);
  };
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm font-medium mb-1">
        <span>{label}</span>
        <div className="flex items-center gap-1">
          <input type="number" min={min} max={max} step={step} value={temp}
                 onChange={(e) => setTemp(e.target.value)} onBlur={commit}
                 onKeyDown={(e) => { if (e.key === 'Enter') commit(); }} disabled={disabled}
                 className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right disabled:opacity-60" />
          <span>°</span>
        </div>
      </div>
      {afterHeader}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} className="w-full disabled:opacity-60" />
      {(leftHint || rightHint) && (
        <div className="flex justify-between text-[11px] text-gray-500 mt-1">
          <span>{leftHint || ''}</span>
          <span>{rightHint || ''}</span>
        </div>
      )}
    </div>
  );
}

function AccordionItem({ id, title, isOpen, onToggle, children }) {
  return (
    <div className="border rounded-lg mb-3">
      <button type="button" className="w-full flex justify-between items-center px-3 py-2 text-sm font-medium" onClick={() => onToggle(id)}>
        <span>{title}</span>
        <span className="text-gray-500">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

export default function HandSimulatorApp() {
  const mountRef = useRef(null), viewcubeRef = useRef(null), orbitRef = useRef(null);
  const [fingers, setFingers] = useState(Array.from({ length: 4 }, defaultFinger));
  const [thumb, setThumb] = useState(defaultThumb());
  const [wrist, setWrist] = useState({ flex: 0, dev: 0 });
  const [grip, setGrip] = useState(0);
  const [pinchGap, setPinchGap] = useState(null);
  const [sex, setSex] = useState("masculino");
  const [percentile, setPercentile] = useState(50);
  const [age, setAge] = useState(25);
  const [debugKey, setDebugKey] = useState("off");
  const [openPanel, setOpenPanel] = useState("thumb");
  const [globalMode, setGlobalMode] = useState("none");

  const profile = useMemo(() => buildProfile(sex, percentile, age), [sex, percentile, age]);
  const dims = useMemo(() => makeDims(profile), [profile]);

  const PINCH_KF = {
    open: {
      index: { MCP: 10, PIP: 15, DIP: 5 },
      thumb: { CMC_abd: 35, CMC_flex: 10, CMC_opp: 15, MCP_flex: 15, IP: 5 },
    },
    mid: {
      index: { MCP: 55, PIP: 80, DIP: 60 },
      thumb: { CMC_abd: 28, CMC_flex: 20, CMC_opp: 60, MCP_flex: 40, IP: 55 },
    },
    closed: {
      index: { MCP: 90, PIP: 95, DIP: 70 },
      thumb: { CMC_abd: 18, CMC_flex: 25, CMC_opp: 70, MCP_flex: 55, IP: 70 },
    },
  };

  const FUNC_KF = {
    open: {
      finger: { MCP: 10, PIP: 10, DIP: 0 },
      thumb: { CMC_abd: 35, CMC_flex: 8, CMC_opp: 10, MCP_flex: 8, IP: 0 },
      wrist: { flex: -10, dev: -2 },
    },
    mid: {
      finger: { MCP: 45, PIP: 35, DIP: 15 },
      thumb: { CMC_abd: 45, CMC_flex: 12, CMC_opp: 12, MCP_flex: 10, IP: 5 },
      wrist: { flex: -25, dev: -12 },
    },
    closed: {
      finger: { MCP: 80, PIP: 90, DIP: 60 },
      thumb: { CMC_abd: 35, CMC_flex: 20, CMC_opp: 20, MCP_flex: 30, IP: 45 },
      wrist: { flex: -35, dev: -15 },
    },
  };

  const lerp = (a,b,t)=>a+(b-a)*t;
  const interpPose = (a,b,t)=>{ const out={}; for(const k in a){ out[k]=lerp(a[k],b[k],t);} for(const k in out){ out[k]=Math.round(out[k]); } return out; };

  const inited = useRef(false);
  const restFromDims = (d) => {
    if (!d?.neutralFingers || !d?.neutralThumb) {
      return { f: Array.from({ length: 4 }, defaultFinger), t: defaultThumb(), w: { flex: 0, dev: 0 } };
    }
    const f = d.neutralFingers.map((nf) => ({ MCP: rad2deg(nf.mcp), PIP: rad2deg(nf.pip), DIP: Math.round(0.6 * rad2deg(nf.pip)) }));
    const t = { CMC_abd: rad2deg(d.neutralThumb.abd), CMC_flex: rad2deg(d.neutralThumb.flex), CMC_opp: rad2deg(d.neutralThumb.opp), MCP_flex: 10, IP: 5 };
    const w = { flex: -25, dev: -12 };
    return { f, t, w };
  };
  const resetToRest = () => {
    const { f, t, w } = restFromDims(dims);
    setFingers(f); setThumb(t); setWrist(w); setGrip(0);
  };
  const resetToNeutral = () => {
    setFingers(Array.from({ length: 4 }, () => defaultFinger()));
    setThumb(defaultThumb()); setWrist({ flex: 0, dev: 0 }); setGrip(0);
  };

  useEffect(() => {
    if (inited.current) return;
    const { f, t, w } = restFromDims(dims);
    setFingers(f); setThumb(t); setWrist(w);
    inited.current = true;
  }, [dims]);

  const three = useMemo(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f9f8f4");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 260, 260);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(120, 180, 100); scene.add(dir);
    const grid = new THREE.GridHelper(400, 20, 0xdddddd, 0xeeeeee); grid.position.y = 0; scene.add(grid);
    return { scene, camera, renderer };
  }, []);

  const mini = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000); camera.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial()); scene.add(cube);
    return { scene, camera, renderer, cube };
  }, []);

  const handRig = useRef(null);
  const frameRig = (pad = 1.6) => {
    const root = handRig.current?.root;
    const ctl = orbitRef.current;
    const cam = three?.camera;
    if (!root || !ctl || !cam) return;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const dist = maxDim * 2.2;
    ctl.target.copy(center);
    const dir = new THREE.Vector3(1, 0.9, 1).normalize();
    cam.position.copy(center.clone().add(dir.multiplyScalar(dist)));
    ctl.minDistance = maxDim * 0.8;
    ctl.maxDistance = maxDim * 6;
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const { scene, camera, renderer } = three; const mount = mountRef.current;
    const resize = () => { const { clientWidth, clientHeight } = mount; camera.aspect = clientWidth / clientHeight; camera.updateProjectionMatrix(); renderer.setSize(clientWidth, clientHeight); };
    resize(); window.addEventListener("resize", resize); // prevent double-append in React Strict Mode
    if (!mount.contains(renderer.domElement)) {
      mount.appendChild(renderer.domElement);
    }
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.06; controls.minDistance = 120; controls.maxDistance = 380; controls.target.set(0, 60, 0); orbitRef.current = controls;
    let raf = 0; const animate = () => { raf = requestAnimationFrame(animate); controls.update(); const q = new THREE.Quaternion(); q.copy(camera.quaternion).invert(); mini.cube.setRotationFromQuaternion(q); renderer.render(scene, camera); }; animate();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); controls.dispose();
      // guard against double cleanup in Strict Mode
      if (renderer?.domElement && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      try { renderer.dispose(); } catch {}
      scene.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } }); };
  }, [three, mini]);

  useEffect(() => {
    if (!three?.scene) return;
    if (handRig.current) { three.scene.remove(handRig.current.root); handRig.current.root.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } }); }
    handRig.current = buildHandRig(dims); three.scene.add(handRig.current.root);
    frameRig();
  }, [dims, three]);

  useEffect(() => {
    const rig = handRig.current; if (!rig) return;
    const map = rig.debug?.map || {};
    Object.values(map).forEach((pkg) => pkg.setVisible(false));
    if (debugKey !== "off" && map[debugKey]) map[debugKey].setVisible(true);
    const hl = rig.highlight;
    if (hl) {
      hl.all.forEach((m) => {
        if (m.material && m.userData?.baseColor) {
          m.material.color.copy(m.userData.baseColor);
          if (m.material.emissive) m.material.emissive.set(0x000000);
        }
      });
      const targets = hl.map[debugKey] || [];
      targets.forEach((m) => {
        if (m.material) {
          m.material.color.set(0xffcc66);
          if (m.material.emissive) m.material.emissive.set(0x553300);
        }
      });
    }
  }, [debugKey]);

  useEffect(() => {
    if (!viewcubeRef.current) return; const { scene, camera, renderer } = mini; renderer.setSize(100, 100);
    // prevent double-append in Strict Mode
    if (!viewcubeRef.current.contains(renderer.domElement)) {
      viewcubeRef.current.appendChild(renderer.domElement);
    }
    let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); renderer.render(scene, camera); }; loop();
    return () => { cancelAnimationFrame(raf);
      if (renderer?.domElement && renderer.domElement.parentNode === viewcubeRef.current) {
        viewcubeRef.current.removeChild(renderer.domElement);
      }
      try { renderer.dispose(); } catch {} };
  }, [mini]);

  useEffect(() => {
    const link = document.createElement("link"); link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Montserrat:wght@600;700&display=swap";
    document.head.appendChild(link); return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  useEffect(() => {
    const rig = handRig.current; if (!rig) return;
    fingers.forEach((s, i) => { const f = rig.fingers[i]; f.mcp.rotation.z = deg2rad(clamp(s.MCP, RANGES.MCP)); f.pip.rotation.z = deg2rad(clamp(s.PIP, RANGES.PIP)); f.dip.rotation.z = deg2rad(clamp(s.DIP, RANGES.DIP)); });
    if (rig.wrist) { rig.wrist.dev.rotation.x = deg2rad(clamp(wrist.dev, RANGES.WRIST_DEV)); rig.wrist.flex.rotation.z = deg2rad(clamp(wrist.flex, RANGES.WRIST_FLEX)); }
    const t = rig.thumb; t.cmcAbd.rotation.z = deg2rad(clamp(thumb.CMC_abd, RANGES.CMC_ABD)); t.cmcFlex.rotation.y = deg2rad(clamp(thumb.CMC_flex, RANGES.CMC_FLEX)); t.cmcAxial.rotation.x = deg2rad(clamp(thumb.CMC_opp, RANGES.CMC_OPP)); t.mcp.rotation.z = deg2rad(clamp(thumb.MCP_flex, RANGES.THUMB_MCP_FLEX)); t.ip.rotation.z = -deg2rad(clamp(thumb.IP, RANGES.THUMB_IP));
    const idxTip = rig.tips.fingers[0].localToWorld(new THREE.Vector3(rig.tipOffsets.fingers[0], 0, 0));
    const thTip = rig.tips.thumb.localToWorld(new THREE.Vector3(rig.tipOffsets.thumb, 0, 0)); setPinchGap(idxTip.distanceTo(thTip).toFixed(1));
    const { labels } = rig.debug; if (labels) {
      const fmt = (v) => `${Math.round(v)}°`;
      fingers.forEach((s, i) => { const L = labels.fingers[i]; if (!L) return; if (L.mcp) setLabelText(L.mcp, `D${i + 2} MCP ${fmt(s.MCP)}`); if (L.pip) setLabelText(L.pip, `D${i + 2} PIP ${fmt(s.PIP)}`); if (L.dip) setLabelText(L.dip, `D${i + 2} DIP ${fmt(s.DIP)}`); });
      setLabelText(labels.thumb.abd, `CMC abd ${fmt(thumb.CMC_abd)}`);
      setLabelText(labels.thumb.flex, `CMC flex ${fmt(thumb.CMC_flex)}`);
      setLabelText(labels.thumb.opp, `CMC opp ${fmt(thumb.CMC_opp)}`);
      setLabelText(labels.thumb.mcp, `MCP ${fmt(thumb.MCP_flex)}`);
      setLabelText(labels.thumb.ip, `IP ${fmt(thumb.IP)}`);
    }
  }, [fingers, thumb, wrist, dims]);

  useEffect(() => {
    const errs = []; if (!handRig.current) return;
    if (handRig.current.fingers.length !== 4) errs.push("Deve haver 4 dedos D2..D5.");
    fingers.forEach((s, i) => { if (s.PIP < RANGES.PIP[0] || s.PIP > RANGES.PIP[1]) errs.push(`PIP fora da faixa em D${i + 2}`); if (s.DIP < RANGES.DIP[0] || s.DIP > RANGES.DIP[1]) errs.push(`DIP fora da faixa em D${i + 2}`); });
    // testes adicionais: mapa de highlight contém chaves do punho
    const rig = handRig.current;
    if (rig?.highlight && (!rig.highlight.map.WR_DEV || !rig.highlight.map.WR_FLEX)) errs.push("Mapa de destaque do punho ausente.");
    if (errs.length) console.warn("[Self-check]", errs.join(" | "));
  }, [fingers]);

  function buildHandRig(d) {
    const root = new THREE.Group();
    const matArm = new THREE.MeshStandardMaterial({ color: 0xcad4e0, roughness: 0.8, metalness: 0.05 });
    const matPalm = new THREE.MeshStandardMaterial({ color: 0xdde6ee, roughness: 0.85, metalness: 0.03 });
    const matFinger = new THREE.MeshStandardMaterial({ color: 0xe9eef3, roughness: 0.9, metalness: 0.02 });
    const mkCyl = (r1, r2, h, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 24), mat);
    const mkBox = (lx, wy, wz, mat) => new THREE.Mesh(new THREE.BoxGeometry(lx, wy, wz), mat);

    const highlightList = [];
    const addHL = (m) => { m.userData.baseColor = m.material.color.clone(); highlightList.push(m); return m; };

    const CLEAR = Math.max(0.5, 0.1 * d.palm.THICKNESS);
    const palmX = 0;

    const forearm = mkCyl(d.forearm.radDist, d.forearm.radProx, d.forearm.len, matArm); forearm.rotation.z = Math.PI / 2;
    const wristLenProx = d.wrist.length * 0.55;
    const wristProx = mkCyl(d.wrist.radius, d.wrist.radius, wristLenProx, matArm); wristProx.rotation.z = Math.PI / 2;
    const wristCover = new THREE.Mesh(new THREE.SphereGeometry(d.wrist.radius, 24, 18), matArm);

    const palm = addHL(mkBox(d.palm.LENGTH, d.palm.THICKNESS, d.palm.WIDTH, matPalm.clone()));

    const wristDev = new THREE.Group(); // desvio radial/ulnar (X)
    const wristPivotX = palmX - d.palm.LENGTH / 2; wristDev.position.set(wristPivotX, 0, 0);
    const wristFlex = new THREE.Group(); wristDev.add(wristFlex); // flex/est (Z)

    palm.position.set(d.palm.LENGTH / 2, 0, 0);
    wristCover.position.set(-CLEAR * 0.6, 0, 0);
    wristFlex.add(wristCover); wristFlex.add(palm);

    const wristProxX = wristPivotX - (CLEAR + wristLenProx / 2); wristProx.position.set(wristProxX, 0, 0);
    const forearmX = wristPivotX - (CLEAR + wristLenProx + CLEAR + d.forearm.len / 2); forearm.position.set(forearmX, 0, 0);

    root.add(forearm, wristProx, wristDev);
    root.rotation.z = Math.PI / 2;

    root.position.set(0, 0, 0);

    root.updateMatrixWorld(true);
    const _bbox = new THREE.Box3().setFromObject(root);
    const _ctr = new THREE.Vector3();
    _bbox.getCenter(_ctr);
    root.position.x -= _ctr.x;
    root.position.z -= _ctr.z;
    root.position.y -= _bbox.min.y;

    const debug = { map: {}, labels: { fingers: [], thumb: {} } };
    const wrDevPkg = makeDebugPackage(wristDev, "WR_DEV", "YZ", d.palm.WIDTH * 0.9, d.palm.THICKNESS * 2.2, d.palm.THICKNESS * 1.6, "Punho desvio 0°");
    const wrFlexPkg = makeDebugPackage(wristFlex, "WR_FLEX", "XY", d.palm.LENGTH * 0.8, d.palm.WIDTH * 0.8, d.palm.THICKNESS * 1.6, "Punho flex 0°");
    debug.map.WR_DEV = wrDevPkg; debug.map.WR_FLEX = wrFlexPkg;

    const hmap = {}; const allMovers = [palm];

    const createPhalanx = (length, width, material) => { const group = new THREE.Group(); const mesh = addHL(mkBox(length, width, width * 0.9, material.clone())); group.add(mesh); return { group, mesh, length }; };

    const fingersRig = [], tipsF = [], tipOffsetsF = [];
    for (let i = 0; i < 4; i++) {
      const base = new THREE.Group(); base.position.set(d.baseX, 0, d.baseZ[i]); palm.add(base);
      const [Lp, Lm, Ld] = d.fingers[i].len, [Wp, Wm, Wd] = d.fingerWid;
      const mcp = new THREE.Group(); base.add(mcp);
      const prox = createPhalanx(Lp, Wp, matFinger); prox.mesh.position.x = Lp / 2; mcp.add(prox.group);
      const pip = new THREE.Group(); pip.position.set(Lp, 0, 0); prox.group.add(pip);
      const mid = createPhalanx(Lm, Wm, matFinger); mid.mesh.position.x = Lm / 2; pip.add(mid.group);
      const dip = new THREE.Group(); dip.position.set(Lm, 0, 0); mid.group.add(dip);
      const dist = createPhalanx(Ld, Wd, matFinger); dist.mesh.position.x = Ld / 2; dip.add(dist.group);
      let tipGroup = dist.group, tipOffset = Ld;
      const padLen = [d.tipPads.index, d.tipPads.middle, d.tipPads.ring, d.tipPads.little][i] || 0;
      if (padLen > 0.5) { const pad = createPhalanx(padLen, Wd * 0.9, matFinger); pad.mesh.position.x = padLen / 2; dist.group.add(pad.group); tipGroup = pad.group; tipOffset += padLen; }
      const mkDbg = (node, key, axis, L, W, nm) => { const pkg = makeDebugPackage(node, key, axis, L * 1.1, W * 2.2, W * 1.6, `${nm} 0°`); debug.map[pkg.key] = pkg; return pkg.label; };
      const Lmcp = mkDbg(mcp, `D${i + 2}_MCP`, "XY", Lp, Wp, `D${i + 2} MCP`);
      const Lpip = mkDbg(pip, `D${i + 2}_PIP`, "XY", Lm, Wm, `D${i + 2} PIP`);
      const Ldip = mkDbg(dip, `D${i + 2}_DIP`, "XY", Ld, Wd, `D${i + 2} DIP`);
      debug.labels.fingers.push({ mcp: Lmcp, pip: Lpip, dip: Ldip });
      fingersRig.push({ mcp, pip, dip, distal: tipGroup }); tipsF.push(tipGroup); tipOffsetsF.push(tipOffset);
      allMovers.push(prox.mesh, mid.mesh, dist.mesh);
      hmap[`D${i + 2}_MCP`] = [prox.mesh];
      hmap[`D${i + 2}_PIP`] = [mid.mesh];
      hmap[`D${i + 2}_DIP`] = [dist.mesh];
    }

    const thumbBase = new THREE.Group(); thumbBase.position.set(d.thumbBase.x, d.thumbBase.y, d.thumbBase.z); palm.add(thumbBase);
    const cmcAbd = new THREE.Group(); thumbBase.add(cmcAbd);
    const cmcFlex = new THREE.Group(); cmcAbd.add(cmcFlex);
    const cmcAxial = new THREE.Group(); cmcFlex.add(cmcAxial);
    const mcp = new THREE.Group(); cmcAxial.add(mcp);

    const tProx = createPhalanx(d.thumbLen[0], d.thumbWid[0], matFinger); tProx.mesh.position.x = d.thumbLen[0] / 2; mcp.add(tProx.group);
    const ip = new THREE.Group(); ip.position.set(d.thumbLen[0], 0, 0); tProx.group.add(ip);
    const tDist = createPhalanx(d.thumbLen[1], d.thumbWid[1], matFinger); tDist.mesh.position.x = d.thumbLen[1] / 2; ip.add(tDist.group);
    let tipThumb = tDist.group, tipThumbOff = d.thumbLen[1];
    if (d.tipPads.thumb > 0.5) { const pad = createPhalanx(d.tipPads.thumb, d.thumbWid[1] * 0.9, matFinger); pad.mesh.position.x = d.tipPads.thumb / 2; tDist.group.add(pad.group); tipThumb = pad.group; tipThumbOff += d.tipPads.thumb; }

    allMovers.push(tProx.mesh, tDist.mesh);

    const mkDbgT = (node, key, axis, L, W, nm) => { const p = makeDebugPackage(node, key, axis, L * 1.0, W * 2.2, W * 1.6, `${nm} 0°`); debug.map[p.key] = p; return p.label; };
    debug.labels.thumb = {
      abd: mkDbgT(cmcAbd, "TH_CMC_ABD", "XY", d.thumbLen[0], d.thumbWid[0], "CMC abd"),
      flex: mkDbgT(cmcFlex, "TH_CMC_FLEX", "ZX", d.thumbLen[0], d.thumbWid[0], "CMC flex"),
      opp: mkDbgT(cmcAxial, "TH_CMC_OPP", "YZ", d.thumbLen[0], d.thumbWid[0], "CMC opp"),
      mcp: mkDbgT(mcp, "TH_MCP", "XY", d.thumbLen[0], d.thumbWid[0], "MCP"),
      ip: mkDbgT(ip, "TH_IP", "XY", d.thumbLen[1], d.thumbWid[1], "IP"),
    };

    hmap.WR_DEV = allMovers; hmap.WR_FLEX = allMovers;

    // destaque para polegar
    hmap.TH_MCP = [tProx.mesh];
    hmap.TH_IP = [tDist.mesh];
    hmap.TH_CMC_ABD = [tProx.mesh];
    hmap.TH_CMC_FLEX = [tProx.mesh];
    hmap.TH_CMC_OPP = [tProx.mesh];

    return {
      root,
      palm,
      wrist: { dev: wristDev, flex: wristFlex },
      fingers: fingersRig,
      thumb: { cmcAbd, cmcFlex, cmcAxial, mcp, ip },
      tips: { fingers: tipsF, thumb: tipThumb },
      tipOffsets: { fingers: tipOffsetsF, thumb: tipThumbOff },
      debug,
      highlight: { map: hmap, all: highlightList },
    };
  }

  const updateFinger = (i, key, v) => setFingers((prev) => { const next = prev.map((f) => ({ ...f })); next[i][key] = clamp(v, RANGES[key]); return next; });
  const THUMB_RANGE_KEY = { CMC_abd: "CMC_ABD", CMC_flex: "CMC_FLEX", CMC_opp: "CMC_OPP", MCP_flex: "THUMB_MCP_FLEX", IP: "THUMB_IP" };
  const setThumbVal = (k, v) => setThumb((p) => ({ ...p, [k]: clamp(v, RANGES[THUMB_RANGE_KEY[k]]) }));

  const applyGlobalGrip = (g, modeOverride) => {
    const mode = modeOverride || globalMode || "functional";
    const s = Math.min(Math.max(g,0),100)/100;
    if (mode === "pinch") {
      const t = s <= 0.5 ? s/0.5 : (s-0.5)/0.5;
      const fromI = s<=0.5 ? PINCH_KF.open.index : PINCH_KF.mid.index;
      const toI   = s<=0.5 ? PINCH_KF.mid.index  : PINCH_KF.closed.index;
      const fromT = s<=0.5 ? PINCH_KF.open.thumb : PINCH_KF.mid.thumb;
      const toT   = s<=0.5 ? PINCH_KF.mid.thumb  : PINCH_KF.closed.thumb;
      const poseI = interpPose(fromI,toI,t);
      const poseT = interpPose(fromT,toT,t);
      setFingers(prev => prev.map((f,i)=> i===0 ? { ...f, ...poseI } : defaultFinger()));
      setThumb(p => ({ ...p, ...poseT }));
    } else {
      const t = s <= 0.5 ? s/0.5 : (s-0.5)/0.5;
      const fFrom = s<=0.5 ? FUNC_KF.open.finger : FUNC_KF.mid.finger;
      const fTo   = s<=0.5 ? FUNC_KF.mid.finger  : FUNC_KF.closed.finger;
      const thFrom= s<=0.5 ? FUNC_KF.open.thumb  : FUNC_KF.mid.thumb;
      const thTo  = s<=0.5 ? FUNC_KF.mid.thumb   : FUNC_KF.closed.thumb;
      const wrFrom= s<=0.5 ? FUNC_KF.open.wrist  : FUNC_KF.mid.wrist;
      const wrTo  = s<=0.5 ? FUNC_KF.mid.wrist   : FUNC_KF.closed.wrist;
      const fPose = interpPose(fFrom,fTo,t);
      const thPose= interpPose(thFrom,thTo,t);
      const wrPose= interpPose(wrFrom,wrTo,t);
      setFingers(prev => prev.map(()=>({ ...fPose })));
      setThumb(p => ({ ...p, ...thPose }));
      setWrist(w => ({ ...w, ...wrPose }));
    }
  };

  const presetPinch = () => {
    setGlobalMode("pinch");
    setGrip(50);
    applyGlobalGrip(50, "pinch");
    setOpenPanel("global");
  };
  const presetFunctional = () => {
    setGlobalMode("functional");
    setGrip(50);
    applyGlobalGrip(50, "functional");
    setOpenPanel("global");
  };

  const FingerSection = ({ idx }) => {
    const f = fingers[idx];
    const cfg = [
      { k: "MCP", label: `MCP (${RANGES.MCP[0]} .. +${RANGES.MCP[1]})`, min: RANGES.MCP[0], max: RANGES.MCP[1], left: "Extensão (−)", right: "Flexão (+)" },
      { k: "PIP", label: `PIP (${RANGES.PIP[0]} .. ${RANGES.PIP[1]})`, min: RANGES.PIP[0], max: RANGES.PIP[1], left: null, right: "Flexão (+)" },
      { k: "DIP", label: `DIP (${RANGES.DIP[0]} .. +${RANGES.DIP[1]})`, min: RANGES.DIP[0], max: RANGES.DIP[1], left: "Extensão (−)", right: "Flexão (+)" },
    ];
    return (
      <section className="mb-5">
        {cfg.map((c) => (
          <LabeledSlider key={`${idx}-${c.k}`} label={c.label} min={c.min} max={c.max} value={f[c.k]}
            onChange={(v) => updateFinger(idx, c.k, v)} leftHint={c.left} rightHint={c.right}
            afterHeader={<DebugSelect active={debugKey === `D${idx + 2}_${c.k}`} onChange={(on) => setDebugKey(on ? `D${idx + 2}_${c.k}` : 'off')} />} />
        ))}
      </section>
    );
  };

  const ThumbSection = () => {
    const cfg = [
      { k: 'CMC_abd', lbl: `CMC Adução/Abdução (${RANGES.CMC_ABD[0]} .. +${RANGES.CMC_ABD[1]})`, min: RANGES.CMC_ABD[0], max: RANGES.CMC_ABD[1], L: 'Adução (−)', R: 'Abdução (+)', key: 'TH_CMC_ABD' },
      { k: 'CMC_flex', lbl: `CMC Flexão (${RANGES.CMC_FLEX[0]} .. ${RANGES.CMC_FLEX[1]})`, min: RANGES.CMC_FLEX[0], max: RANGES.CMC_FLEX[1], L: null, R: 'Flexão (+)', key: 'TH_CMC_FLEX' },
      { k: 'CMC_opp', lbl: `CMC Oposição/Pronação (${RANGES.CMC_OPP[0]} .. +${RANGES.CMC_OPP[1]})`, min: RANGES.CMC_OPP[0], max: RANGES.CMC_OPP[1], L: 'Retroposição (−)', R: 'Oposição (+)', key: 'TH_CMC_OPP' },
      { k: 'MCP_flex', lbl: `MCP Flexão (${RANGES.THUMB_MCP_FLEX[0]} .. ${RANGES.THUMB_MCP_FLEX[1]})`, min: RANGES.THUMB_MCP_FLEX[0], max: RANGES.THUMB_MCP_FLEX[1], L: null, R: 'Flexão (+)', key: 'TH_MCP' },
      { k: 'IP', lbl: `IP (${RANGES.THUMB_IP[0]} .. +${RANGES.THUMB_IP[1]})`, min: RANGES.THUMB_IP[0], max: RANGES.THUMB_IP[1], L: 'Extensão (−)', R: 'Flexão (+)', key: 'TH_IP' },
    ];
    return (
      <section className="mb-5">
        {cfg.map((c) => (
          <LabeledSlider key={c.k} label={c.lbl} min={c.min} max={c.max} value={thumb[c.k]}
            onChange={(v) => setThumbVal(c.k, v)} leftHint={c.L} rightHint={c.R}
            afterHeader={<DebugSelect active={debugKey === c.key} onChange={(on) => setDebugKey(on ? c.key : 'off')} />} />
        ))}
      </section>
    );
  };

  return (
    <div className="w-full h-screen text-gray-900 flex overflow-hidden" style={{ "--lmb-navy": "#0e1e35", "--lmb-coral": "#f04d4f", "--lmb-teal": "#3bb7a2", "--lmb-ivory": "#f9f8f4", "--lmb-blue": "#10315a", backgroundColor: "var(--lmb-ivory)", fontFamily: '"DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' }}>
      <aside className="w-[420px] max-w-[45%] h-full border-r border-gray-200 p-5 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: '"Montserrat", "DM Sans", ui-sans-serif, system-ui' }}>Simulador de Mão Humana 3D</h1>
        <p className="text-sm text-gray-600 mb-3">Valores exibidos = ângulos reais (goniômetro). Repouso funcional: dedos em leve flexão; polegar com abd≈30°, flex≈10°, pronação≈15°. Negativo = extensão/adução/retroposição · Positivo = flexão/abdução/oposição.</p>
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Sexo biológico</label>
            <select value={sex} onChange={(e) => setSex(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Percentil</label>
            <select value={percentile} onChange={(e) => setPercentile(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
              {PERC_OPTIONS.map((p) => (<option key={p} value={p}>{`P${p}`}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Idade (anos)</label>
            <input type="number" min={5} max={90} step={1} value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm" />
            <p className="text-xs text-gray-600 mt-1">A idade ajusta a escala global (aproximação). Percentil e sexo refinam as proporções.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={presetPinch} className="px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:opacity-90" style={{ backgroundColor: "var(--lmb-teal)", fontFamily: '"Montserrat", "DM Sans", ui-sans-serif, system-ui' }}>Pinça</button>
          <button onClick={presetFunctional} className="px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:opacity-90" style={{ backgroundColor: "var(--lmb-coral)", fontFamily: '"Montserrat", "DM Sans", ui-sans-serif, system-ui' }}>Funcional</button>
          <button onClick={resetToNeutral} className="px-3 py-2 rounded-xl border text-sm hover:opacity-90" style={{ borderColor: "var(--lmb-blue)", color: "var(--lmb-blue)", fontFamily: '"Montserrat", "DM Sans", ui-sans-serif, system-ui' }}>Zero</button>
          <button onClick={resetToRest} className="px-3 py-2 rounded-xl border text-sm hover:opacity-90" style={{ borderColor: "var(--lmb-blue)", color: "var(--lmb-blue)", fontFamily: '"Montserrat", "DM Sans", ui-sans-serif, system-ui' }}>Neutro</button>
        </div>
        <div className="flex items-center gap-2 mb-4"><span className="font-medium">Distância da pinça D2×Polegar:</span> {pinchGap ?? "—"} {pinchGap && "mm (aprox.)"}</div>

        <AccordionItem id="global" title="Fechamento global" isOpen={openPanel === "global"} onToggle={(id) => setOpenPanel(openPanel === id ? "none" : id)}>
          <section className="mb-1">
            <LabeledSlider label={globalMode==='pinch' ? 'Fechamento (pinça) 0–100' : 'Fechamento (funcional) 0–100'} min={0} max={100} value={grip} onChange={(v) => { setGrip(v); applyGlobalGrip(v); }} />
          </section>
        </AccordionItem>

        <AccordionItem id="wrist" title="Punho (Flex/Ext, Desvio)" isOpen={openPanel === "wrist"} onToggle={(id) => setOpenPanel(openPanel === id ? "none" : id)}>
          <section className="mb-1">
            <LabeledSlider label={`Flexão/Extensão (${RANGES.WRIST_FLEX[0]} .. +${RANGES.WRIST_FLEX[1]})`} min={RANGES.WRIST_FLEX[0]} max={RANGES.WRIST_FLEX[1]} value={wrist.flex}
              onChange={(v)=>setWrist((w)=>({...w, flex: v}))}
              leftHint="Extensão (−)" rightHint="Flexão (+)"
              afterHeader={<DebugSelect active={debugKey === 'WR_FLEX'} onChange={(on)=>setDebugKey(on?'WR_FLEX':'off')} />} />
            <LabeledSlider label={`Desvio radial/ulnar (${RANGES.WRIST_DEV[0]} .. +${RANGES.WRIST_DEV[1]})`} min={RANGES.WRIST_DEV[0]} max={RANGES.WRIST_DEV[1]} value={wrist.dev}
              onChange={(v)=>setWrist((w)=>({...w, dev: v}))}
              leftHint="Ulnar/adução (−)" rightHint="Radial/abdução (+)"
              afterHeader={<DebugSelect active={debugKey === 'WR_DEV'} onChange={(on)=>setDebugKey(on?'WR_DEV':'off')} />} />
          </section>
        </AccordionItem>

        <AccordionItem id="thumb" title="D1 – Polegar (CMC, MCP, IP)" isOpen={openPanel === "thumb"} onToggle={(id) => setOpenPanel(openPanel === id ? "none" : id)}>
          <ThumbSection />
        </AccordionItem>

        <AccordionItem id="D2" title="D2 – Indicador" isOpen={openPanel === "D2"} onToggle={(id) => setOpenPanel(openPanel === id ? "none" : id)}>
          <FingerSection idx={0} />
        </AccordionItem>
        <AccordionItem id="D3" title="D3 – Médio" isOpen={openPanel === "D3"} onToggle={(id) => setOpenPanel(openPanel === id ? "none" : id)}>
          <FingerSection idx={1} />
        </AccordionItem>
        <AccordionItem id="D4" title="D4 – Anular" isOpen={openPanel === "D4"} onToggle={(id) => setOpenPanel(openPanel === id ? "none" : id)}>
          <FingerSection idx={2} />
        </AccordionItem>
        <AccordionItem id="D5" title="D5 – Mínimo" isOpen={openPanel === "D5"} onToggle={(id) => setOpenPanel(openPanel === id ? "none" : id)}>
          <FingerSection idx={3} />
        </AccordionItem>
        <details className="mt-6 text-sm text-gray-600">
          <summary className="cursor-pointer font-medium" style={{ fontFamily: '"Montserrat", "DM Sans", ui-sans-serif, system-ui' }}>Tabela técnica – Limites (função)</summary>
          <div className="mt-2 space-y-1">
            <p>MCP (D2–D5): Ext até −45°, Flex até +90°</p>
            <p>PIP (D2–D5): Flex 0–100°</p>
            <p>DIP (D2–D5): Ext até −20°, Flex até +80°</p>
            <p>CMC (Polegar): Abdução ~60°, Flexão útil ~30°, Oposição (pronação axial) ~70°</p>
            <p>MCP (Polegar): Flexão 0–60°</p>
            <p>IP (Polegar): Ext até −10°, Flex até +80°</p>
          </div>
        </details>
      </aside>

      <main className="flex-1 relative">
        <div ref={mountRef} className="absolute inset-0" />
        <div ref={viewcubeRef} className="absolute top-4 right-4 rounded-md shadow-sm bg-white/60 p-1" />
      </main>
    </div>
  );
}
