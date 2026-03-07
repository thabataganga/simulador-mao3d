import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const deg2rad = (d) => (d * Math.PI) / 180;
const clamp = (v, [min, max]) => Math.min(Math.max(v, min), max);

const RANGES = {
  MCP: [-45, 90], PIP: [0, 100], DIP: [-20, 80],
  CMC_ABD: [-10, 60], CMC_OPP: [-40, 70], CMC_FLEX: [0, 30],
  THUMB_MCP_FLEX: [0, 60], THUMB_IP: [-10, 80],
  WRIST_FLEX: [-70, 80], WRIST_DEV: [-30, 20],
};

const PALM_DIMS = { LENGTH: 70, THICKNESS: 14, WIDTH: 55 };
const THUMB_BASE_RATIO = { xL: 24 / 70, yT: -3 / 14, zW: 36 / 55 };
const RATIOS = {
  baseZ: [18 / 55, 6 / 55, -6 / 55, -18 / 55],
  fingerWidths: [10 / 14, 9 / 14, 8 / 14],
  thumbWidths: [10 / 14, 9 / 14],
};
const PHAL_RATIOS = {
  D2: { totalVsD3: 0.882, seg: { pp: 0.51,  pm: 0.287, pd: 0.203 } },
  D3: { totalVsD3: 1,     seg: { pp: 0.505, pm: 0.298, pd: 0.197 } },
  D4: { totalVsD3: 0.954, seg: { pp: 0.491, pm: 0.304, pd: 0.205 } },
  D5: { totalVsD3: 0.756, seg: { pp: 0.49,  pm: 0.271, pd: 0.239 } },
};
const THUMB_RATIOS = { totalVsD3: 0.602, seg: { pp: 0.593, pd: 0.407 } };
const TIP_SOFT_MM  = { D2: 3.84, D3: 3.95, D4: 3.95, D5: 3.73, TH: 5.67 };

const SEX_RATIOS = {
  masculino: { palmWidthToLength: 0.8,  palmThickToWidth: 0.27, wristRadToPalmWidth: 0.3,  wristLenToPalmThick: 1.1,  forearmLenToPalmLen: 1.75, forearmProxToWrist: 1.15, forearmDistToWrist: 0.9,  d3ToPalm: 1.03, thumbBaseFromProx: 0.18 },
  feminino:  { palmWidthToLength: 0.82, palmThickToWidth: 0.25, wristRadToPalmWidth: 0.29, wristLenToPalmThick: 1.05, forearmLenToPalmLen: 1.7,  forearmProxToWrist: 1.1,  forearmDistToWrist: 0.88, d3ToPalm: 0.99, thumbBaseFromProx: 0.16 },
};
const PERC_OPTIONS = [5, 25, 50, 75, 95];

const interpPercentileScale = (p0) => {
  const p = Math.min(Math.max(p0, 5), 95);
  return p <= 50 ? 0.92 + ((p - 5) / 45) * 0.08 : 1 + ((p - 50) / 45) * 0.08;
};
const ageScale = (age0) => {
  const a = Math.min(Math.max(age0, 5), 90);
  const pts = [[5,0.6],[10,0.78],[14,0.9],[18,1],[65,1],[80,0.98],[90,0.96]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a0,s0] = pts[i], [a1,s1] = pts[i+1];
    if (a >= a0 && a <= a1) return s0 + ((a-a0)/(a1-a0))*(s1-s0);
  }
  return 1;
};

function buildProfile(sex, percentile, age) {
  const male = sex === "masculino";
  const sx = male
    ? { palmScale: 1.05, fingerScale: 1.03, thumbScale: 1.03, thumbBase: { ...THUMB_BASE_RATIO, zW: THUMB_BASE_RATIO.zW * 1.02 } }
    : { palmScale: 0.97, fingerScale: 0.98, thumbScale: 0.98, thumbBase: { ...THUMB_BASE_RATIO, zW: THUMB_BASE_RATIO.zW * 0.98 } };
  const sc = interpPercentileScale(percentile) * ageScale(age);
  return { sex: male ? "masculino" : "feminino", palmScale: sx.palmScale * sc, fingerScale: sx.fingerScale * sc, thumbScale: sx.thumbScale * sc, thumbBase: sx.thumbBase };
}

function makeDims(profile) {
  const R = SEX_RATIOS[profile.sex];
  const palmLen   = PALM_DIMS.LENGTH * profile.palmScale;
  const palmWidth = palmLen * R.palmWidthToLength;
  const palmThick = palmWidth * R.palmThickToWidth;
  const palm = { LENGTH: palmLen, WIDTH: palmWidth, THICKNESS: palmThick };
  const D3_TOTAL  = R.d3ToPalm * palmLen * profile.fingerScale;
  const fingers   = Object.values(PHAL_RATIOS).map(r => ({ len: [D3_TOTAL*r.totalVsD3*r.seg.pp, D3_TOTAL*r.totalVsD3*r.seg.pm, D3_TOTAL*r.totalVsD3*r.seg.pd] }));
  const fingerWid = RATIOS.fingerWidths.map(r => r * palmThick);
  const thumbTotal = D3_TOTAL * THUMB_RATIOS.totalVsD3 * (profile.thumbScale / profile.fingerScale);
  const thumbLen  = [thumbTotal * THUMB_RATIOS.seg.pp, thumbTotal * THUMB_RATIOS.seg.pd];
  const thumbWid  = RATIOS.thumbWidths.map(r => r * palmThick);
  const baseX     = palmLen / 2 + THREE.MathUtils.clamp(0.3 * palmThick, 1.5, 6);
  const baseZ     = RATIOS.baseZ.map(r => r * palmWidth);
  const thumbBase = { x: -palmLen/2 + R.thumbBaseFromProx*palmLen, y: palmThick*(profile.thumbBase?.yT ?? THUMB_BASE_RATIO.yT), z: palmWidth*(profile.thumbBase?.zW ?? THUMB_BASE_RATIO.zW) };
  const wrist     = { radius: palmWidth*R.wristRadToPalmWidth, length: palmThick*R.wristLenToPalmThick };
  const forearm   = { len: palmLen*R.forearmLenToPalmLen, radProx: palmWidth*R.wristRadToPalmWidth*R.forearmProxToWrist, radDist: palmWidth*R.wristRadToPalmWidth*R.forearmDistToWrist };
  const ss = palmLen / PALM_DIMS.LENGTH;
  const tipPads   = { index: TIP_SOFT_MM.D2*ss, middle: TIP_SOFT_MM.D3*ss, ring: TIP_SOFT_MM.D4*ss, little: TIP_SOFT_MM.D5*ss, thumb: TIP_SOFT_MM.TH*ss };
  const neutralFingers = [
    { mcp: deg2rad(15), pip: deg2rad(20), dip: deg2rad(10) },
    { mcp: deg2rad(20), pip: deg2rad(25), dip: deg2rad(10) },
    { mcp: deg2rad(25), pip: deg2rad(30), dip: deg2rad(15) },
    { mcp: deg2rad(30), pip: deg2rad(35), dip: deg2rad(15) },
  ];
  const neutralThumb = { abd: deg2rad(45), flex: deg2rad(12), opp: deg2rad(12) };
  return { palm, fingers, fingerWid, thumbLen, thumbWid, baseX, baseZ, thumbBase, forearm, wrist, tipPads, neutralFingers, neutralThumb };
}

// ─── Helpers 3D ──────────────────────────────────────────────────────────────
function makeLabel(text, scale = 3.5) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontPx = Math.round(44 * scale), pad = 10;
  ctx.font = `${fontPx}px Arial`;
  const w = Math.ceil(ctx.measureText(text).width + pad*2), h = Math.ceil(fontPx + pad*2);
  canvas.width = w; canvas.height = h;
  ctx.fillStyle = "rgba(14,30,53,0.88)"; ctx.fillRect(0,0,w,h);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, h/2);
  const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  const u = 0.02 * scale; spr.scale.set(w*u, h*u, 1);
  spr.renderOrder = 999;
  spr.userData = { canvas, ctx, tex, pad, fontPx };
  return spr;
}
function setLabelText(spr, text) {
  if (!spr) return;
  const { canvas, ctx, tex, pad, fontPx } = spr.userData;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "rgba(14,30,53,0.88)"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, canvas.height/2); tex.needsUpdate = true;
}
function makeDebugPkg(group, key, planeAxis, sx, sy, axSz, labelText, withLabel = true) {
  const axes = new THREE.AxesHelper(axSz); group.add(axes);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(sx, sy),
    new THREE.MeshBasicMaterial({ color: 0x3bb7a2, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  if (planeAxis === "YZ") plane.rotation.y = Math.PI/2;
  if (planeAxis === "ZX") plane.rotation.x = Math.PI/2;
  group.add(plane);
  let spr = null;
  if (withLabel) { spr = makeLabel(labelText); spr.position.set(0, sy*0.72, 0); group.add(spr); }
  const setVisible = v => { axes.visible = v; plane.visible = v; if (spr) spr.visible = v; };
  setVisible(false);
  return { key, axes, plane, label: spr, setVisible };
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const defaultFinger = () => ({ MCP: 0, PIP: 0, DIP: 0 });
const defaultThumb  = () => ({ CMC_abd: 0, CMC_opp: 0, CMC_flex: 0, MCP_flex: 0, IP: 0 });

// ─── UI components ────────────────────────────────────────────────────────────
function DebugSelect({ active, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-700 mt-1 select-none">
      <input type="checkbox" checked={active} onChange={e => onChange(e.target.checked)} /> Destacar
    </label>
  );
}

function LabeledSlider({ label, min, max, step=1, value, onChange, leftHint, rightHint, disabled, afterHeader }) {
  const [temp, setTemp] = useState(value);
  useEffect(() => setTemp(value), [value]);
  const commit = () => {
    const n = Number(temp);
    if (!Number.isFinite(n)) return setTemp(String(value));
    const v = clamp(Math.round(n/step)*step, [min,max]);
    setTemp(String(v)); onChange(v);
  };
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm font-medium mb-1">
        <span>{label}</span>
        <div className="flex items-center gap-1">
          <input type="number" min={min} max={max} step={step} value={temp}
            onChange={e => setTemp(e.target.value)} onBlur={commit}
            onKeyDown={e => e.key==='Enter' && commit()} disabled={disabled}
            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right disabled:opacity-60" />
          <span>°</span>
        </div>
      </div>
      {afterHeader}
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} disabled={disabled} className="w-full disabled:opacity-60" />
      {(leftHint||rightHint) && (
        <div className="flex justify-between text-[11px] text-gray-500 mt-1">
          <span>{leftHint||''}</span><span>{rightHint||''}</span>
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

// ─── App principal ────────────────────────────────────────────────────────────
export default function HandSimulatorApp() {
  const mountRef = useRef(null), viewcubeRef = useRef(null), orbitRef = useRef(null);

  const [fingers, setFingers] = useState(Array.from({length:4}, defaultFinger));
  const [thumb,   setThumb]   = useState(defaultThumb());
  const [wrist,   setWrist]   = useState({ flex: 0, dev: 0 });

  const [grip,       setGrip]       = useState(0);
  const [sex,        setSex]        = useState("masculino");
  const [percentile, setPercentile] = useState(50);
  const [age,        setAge]        = useState(25);
  const [debugKey,   setDebugKey]   = useState("off");
  const [openPanel,  setOpenPanel]  = useState("global_d2d5");
  const [globalMode, setGlobalMode] = useState("none");

  const profile = useMemo(() => buildProfile(sex, percentile, age), [sex, percentile, age]);
  const dims    = useMemo(() => makeDims(profile), [profile]);

  // Controle global D2-D5: todos os dedos recebem o mesmo ângulo
  const updateGlobalD2D5 = (key, value) =>
    setFingers(prev => prev.map(f => ({ ...f, [key]: clamp(value, RANGES[key]) })));

  // Média dos 4 dedos para exibir no slider
  const globalD2D5 = {
    MCP: Math.round(fingers.reduce((s,f) => s+f.MCP, 0) / 4),
    PIP: Math.round(fingers.reduce((s,f) => s+f.PIP, 0) / 4),
    DIP: Math.round(fingers.reduce((s,f) => s+f.DIP, 0) / 4),
  };

  // Keyframes de fechamento
  const PINCH_KF = {
    open:   { index:{MCP:10,PIP:15,DIP:5},   thumb:{CMC_abd:35,CMC_flex:10,CMC_opp:15,MCP_flex:15,IP:5}  },
    mid:    { index:{MCP:55,PIP:80,DIP:60},  thumb:{CMC_abd:28,CMC_flex:20,CMC_opp:60,MCP_flex:40,IP:55} },
    closed: { index:{MCP:90,PIP:95,DIP:70},  thumb:{CMC_abd:18,CMC_flex:25,CMC_opp:70,MCP_flex:55,IP:70} },
  };
  const FUNC_KF = {
    open:   { finger:{MCP:10,PIP:10,DIP:0},  thumb:{CMC_abd:35,CMC_flex:8, CMC_opp:10,MCP_flex:8, IP:0},  wrist:{flex:-10,dev:-2}  },
    mid:    { finger:{MCP:45,PIP:35,DIP:15}, thumb:{CMC_abd:45,CMC_flex:12,CMC_opp:12,MCP_flex:10,IP:5},  wrist:{flex:-25,dev:-12} },
    closed: { finger:{MCP:80,PIP:90,DIP:60}, thumb:{CMC_abd:35,CMC_flex:20,CMC_opp:20,MCP_flex:30,IP:45}, wrist:{flex:-35,dev:-15} },
  };
  const lerp = (a,b,t) => a+(b-a)*t;
  const interpPose = (a,b,t) => Object.fromEntries(Object.keys(a).map(k => [k, Math.round(lerp(a[k],b[k],t))]));

  // Repouso fisiológico
  const inited = useRef(false);
  const restFromDims = d => {
    if (!d?.neutralFingers) return { f:Array.from({length:4},defaultFinger), t:defaultThumb(), w:{flex:0,dev:0} };
    const f = d.neutralFingers.map(nf => ({
      MCP: Math.round(nf.mcp*180/Math.PI),
      PIP: Math.round(nf.pip*180/Math.PI),
      DIP: Math.round(0.6*nf.pip*180/Math.PI),
    }));
    const t = { CMC_abd:Math.round(d.neutralThumb.abd*180/Math.PI), CMC_flex:Math.round(d.neutralThumb.flex*180/Math.PI), CMC_opp:Math.round(d.neutralThumb.opp*180/Math.PI), MCP_flex:10, IP:5 };
    return { f, t, w:{flex:-25,dev:-12} };
  };
  const resetToRest    = () => { const {f,t,w} = restFromDims(dims); setFingers(f); setThumb(t); setWrist(w); setGrip(0); };
  const resetToNeutral = () => { setFingers(Array.from({length:4},defaultFinger)); setThumb(defaultThumb()); setWrist({flex:0,dev:0}); setGrip(0); };

  useEffect(() => {
    if (inited.current) return;
    const {f,t,w} = restFromDims(dims);
    setFingers(f); setThumb(t); setWrist(w);
    inited.current = true;
  }, [dims]);

  // Three.js setup
  const three = useMemo(() => {
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#f9f8f4");
    const camera = new THREE.PerspectiveCamera(45,1,0.1,1000); camera.position.set(0,260,260);
    const renderer = new THREE.WebGLRenderer({ antialias:true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    scene.add(new THREE.HemisphereLight(0xffffff,0x888888,0.9));
    const dir = new THREE.DirectionalLight(0xffffff,0.8); dir.position.set(120,180,100); scene.add(dir);
    scene.add(new THREE.GridHelper(400,20,0xdddddd,0xeeeeee));
    return { scene, camera, renderer };
  }, []);

  const mini = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35,1,0.1,1000); camera.position.set(0,0,5);
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshNormalMaterial()); scene.add(cube);
    return { scene, camera, renderer, cube };
  }, []);

  const handRig = useRef(null);
  const frameRig = () => {
    const root = handRig.current?.root, ctl = orbitRef.current, cam = three?.camera;
    if (!root||!ctl||!cam) return;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const maxDim = Math.max(size.x,size.y,size.z)||1;
    ctl.target.copy(center);
    cam.position.copy(center.clone().add(new THREE.Vector3(1,0.9,1).normalize().multiplyScalar(maxDim*2.2)));
    ctl.minDistance = maxDim*0.8; ctl.maxDistance = maxDim*6;
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const { scene, camera, renderer } = three, mount = mountRef.current;
    const resize = () => { camera.aspect=mount.clientWidth/mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth,mount.clientHeight); };
    resize(); window.addEventListener("resize",resize);
    if (!mount.contains(renderer.domElement)) mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true; controls.dampingFactor=0.06; controls.target.set(0,60,0);
    orbitRef.current=controls;
    let raf=0;
    const animate = () => {
      raf=requestAnimationFrame(animate); controls.update();
      mini.cube.setRotationFromQuaternion(new THREE.Quaternion().copy(camera.quaternion).invert());
      renderer.render(scene,camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener("resize",resize); controls.dispose();
      if(renderer.domElement.parentNode===mount) mount.removeChild(renderer.domElement);
      try{renderer.dispose()}catch{}
      scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();o.material?.dispose();}});
    };
  }, [three,mini]);

  // Constrói o rig da mão
  function buildHandRig(d) {
    const root = new THREE.Group();
    const matArm    = new THREE.MeshStandardMaterial({ color:0xcad4e0, roughness:0.8,  metalness:0.05 });
    const matPalm   = new THREE.MeshStandardMaterial({ color:0xdde6ee, roughness:0.85, metalness:0.03 });
    const matFinger = new THREE.MeshStandardMaterial({ color:0xe9eef3, roughness:0.9,  metalness:0.02 });
    const mkCyl = (r1,r2,h,mat) => new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),mat);
    const mkBox = (lx,wy,wz,mat) => new THREE.Mesh(new THREE.BoxGeometry(lx,wy,wz),mat);
    const hlList = [];
    const addHL = m => { m.userData.baseColor=m.material.color.clone(); hlList.push(m); return m; };

    // Antebraço + punho
    const CLEAR = Math.max(0.5, 0.1*d.palm.THICKNESS);
    const forearm   = mkCyl(d.forearm.radDist,d.forearm.radProx,d.forearm.len,matArm); forearm.rotation.z=Math.PI/2;
    const wristLenP = d.wrist.length*0.55;
    const wristProx = mkCyl(d.wrist.radius,d.wrist.radius,wristLenP,matArm); wristProx.rotation.z=Math.PI/2;
    const wristCov  = new THREE.Mesh(new THREE.SphereGeometry(d.wrist.radius,24,18),matArm);
    const palm      = addHL(mkBox(d.palm.LENGTH,d.palm.THICKNESS,d.palm.WIDTH,matPalm.clone()));

    const pivX      = -d.palm.LENGTH/2;
    const wristDev  = new THREE.Group(); wristDev.position.set(pivX,0,0);
    const wristFlex = new THREE.Group(); wristDev.add(wristFlex);
    palm.position.set(d.palm.LENGTH/2,0,0);
    wristCov.position.set(-CLEAR*0.6,0,0);
    wristFlex.add(wristCov,palm);
    wristProx.position.set(pivX-(CLEAR+wristLenP/2),0,0);
    forearm.position.set(pivX-(CLEAR+wristLenP+CLEAR+d.forearm.len/2),0,0);
    root.add(forearm,wristProx,wristDev);
    root.rotation.z = Math.PI/2;
    root.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(root), bc = new THREE.Vector3(); bb.getCenter(bc);
    root.position.x -= bc.x; root.position.z -= bc.z; root.position.y -= bb.min.y;

    const dbgMap = {};
    dbgMap.WR_DEV  = makeDebugPkg(wristDev,  "WR_DEV",  "YZ", d.palm.WIDTH*0.9,  d.palm.THICKNESS*2.2, d.palm.THICKNESS*1.6, "Desvio: 0°");
    dbgMap.WR_FLEX = makeDebugPkg(wristFlex, "WR_FLEX", "XY", d.palm.LENGTH*0.8, d.palm.WIDTH*0.8,     d.palm.THICKNESS*1.6, "Flex: 0°");

    const hmap = {};
    const allMovers = [palm];

    // Helper para criar falange
    const mkPhal = (len, wid, mat) => {
      const g = new THREE.Group();
      const m = addHL(mkBox(len, wid, wid*0.9, mat.clone()));
      g.add(m);
      return { group: g, mesh: m };
    };

    // ── Dedos D2-D5 ──────────────────────────────────────────────────────────
    // Cada dedo usa seus próprios comprimentos de falange (Lp, Lm, Ld),
    // mas TODOS recebem a mesma rotação angular via state. O alinhamento
    // visual é correto: cada pip está em x=Lp do dedo específico.
    const fingersRig=[], tipsF=[], tipOffsetsF=[];
    for (let i=0; i<4; i++) {
      const [Lp,Lm,Ld] = d.fingers[i].len;  // comprimentos específicos do dedo i
      const [Wp,Wm,Wd] = d.fingerWid;        // larguras compartilhadas (pp,pm,pd)

      const base = new THREE.Group(); base.position.set(d.baseX, 0, d.baseZ[i]); palm.add(base);

      // MCP: pivô na base do dedo
      const mcp  = new THREE.Group(); base.add(mcp);
      const prox = mkPhal(Lp,Wp,matFinger); prox.mesh.position.x = Lp/2; mcp.add(prox.group);

      // PIP: posicionado no final da falange proximal DESTE dedo
      const pip  = new THREE.Group(); pip.position.set(Lp, 0, 0); prox.group.add(pip);
      const mid  = mkPhal(Lm,Wm,matFinger); mid.mesh.position.x = Lm/2; pip.add(mid.group);

      // DIP: posicionado no final da falange média DESTE dedo
      const dip  = new THREE.Group(); dip.position.set(Lm, 0, 0); mid.group.add(dip);
      const dist = mkPhal(Ld,Wd,matFinger); dist.mesh.position.x = Ld/2; dip.add(dist.group);

      let tip=dist.group, tipOff=Ld;
      const padLen=[d.tipPads.index,d.tipPads.middle,d.tipPads.ring,d.tipPads.little][i]||0;
      if (padLen>0.5) {
        const p=mkPhal(padLen,Wd*0.9,matFinger); p.mesh.position.x=padLen/2;
        dist.group.add(p.group); tip=p.group; tipOff+=padLen;
      }

      // debug packages individuais (sem label — label fica só no global do D3)
      const mkD = (node,key,axis,L,W) => {
        const pkg=makeDebugPkg(node,key,axis,L*1.1,W*2.2,W*1.6,"",false);
        dbgMap[pkg.key]=pkg;
      };
      mkD(mcp, `D${i+2}_MCP`, "XY", Lp, Wp);
      mkD(pip, `D${i+2}_PIP`, "XY", Lm, Wm);
      mkD(dip, `D${i+2}_DIP`, "XY", Ld, Wd);

      fingersRig.push({mcp,pip,dip}); tipsF.push(tip); tipOffsetsF.push(tipOff);
      allMovers.push(prox.mesh, mid.mesh, dist.mesh);
      hmap[`D${i+2}_MCP`]=[prox.mesh]; hmap[`D${i+2}_PIP`]=[mid.mesh]; hmap[`D${i+2}_DIP`]=[dist.mesh];
    }

    // Debug packages globais (label único no D3 = índice 1)
    const d3 = fingersRig[1];
    const [Lp3,Lm3,Ld3] = d.fingers[1].len, [Wp3,Wm3,Wd3] = d.fingerWid;
    const gMG = new THREE.Group(); d3.mcp.add(gMG);
    const gPG = new THREE.Group(); d3.pip.add(gPG);
    const gDG = new THREE.Group(); d3.dip.add(gDG);
    dbgMap.GLOBAL_MCP = makeDebugPkg(gMG,"GLOBAL_MCP","XY",Lp3*1.1,Wp3*2.2,Wp3*1.6,"MCP: 0°");
    dbgMap.GLOBAL_PIP = makeDebugPkg(gPG,"GLOBAL_PIP","XY",Lm3*1.1,Wm3*2.2,Wm3*1.6,"PIP: 0°");
    dbgMap.GLOBAL_DIP = makeDebugPkg(gDG,"GLOBAL_DIP","XY",Ld3*1.1,Wd3*2.2,Wd3*1.6,"DIP: 0°");

    // ── Polegar ───────────────────────────────────────────────────────────────
    const thumbBase = new THREE.Group(); thumbBase.position.set(d.thumbBase.x,d.thumbBase.y,d.thumbBase.z); palm.add(thumbBase);
    const cmcAbd   = new THREE.Group(); thumbBase.add(cmcAbd);
    const cmcFlex  = new THREE.Group(); cmcAbd.add(cmcFlex);
    const cmcAxial = new THREE.Group(); cmcFlex.add(cmcAxial);
    const tmcp     = new THREE.Group(); cmcAxial.add(tmcp);
    const tProx = mkPhal(d.thumbLen[0],d.thumbWid[0],matFinger); tProx.mesh.position.x=d.thumbLen[0]/2; tmcp.add(tProx.group);
    const tip_ip = new THREE.Group(); tip_ip.position.set(d.thumbLen[0],0,0); tProx.group.add(tip_ip);
    const tDist = mkPhal(d.thumbLen[1],d.thumbWid[1],matFinger); tDist.mesh.position.x=d.thumbLen[1]/2; tip_ip.add(tDist.group);
    let tipTh=tDist.group, tipThOff=d.thumbLen[1];
    if (d.tipPads.thumb>0.5) { const p=mkPhal(d.tipPads.thumb,d.thumbWid[1]*0.9,matFinger); p.mesh.position.x=d.tipPads.thumb/2; tDist.group.add(p.group); tipTh=p.group; tipThOff+=d.tipPads.thumb; }
    allMovers.push(tProx.mesh,tDist.mesh);
    hmap.WR_DEV=hmap.WR_FLEX=allMovers;
    hmap.TH_MCP=[tProx.mesh]; hmap.TH_IP=[tDist.mesh];
    hmap.TH_CMC_ABD=hmap.TH_CMC_FLEX=hmap.TH_CMC_OPP=[tProx.mesh];
    const mkDT = (node,key,axis,L,W,nm) => { const p=makeDebugPkg(node,key,axis,L,W*2.2,W*1.6,`${nm}: 0°`); dbgMap[p.key]=p; return p.label; };
    const thumbLabels = {
      abd:  mkDT(cmcAbd,  "TH_CMC_ABD","XY", d.thumbLen[0],d.thumbWid[0],"CMC abd"),
      flex: mkDT(cmcFlex, "TH_CMC_FLEX","ZX",d.thumbLen[0],d.thumbWid[0],"CMC flex"),
      opp:  mkDT(cmcAxial,"TH_CMC_OPP","YZ", d.thumbLen[0],d.thumbWid[0],"CMC opp"),
      mcp:  mkDT(tmcp,    "TH_MCP",    "XY", d.thumbLen[0],d.thumbWid[0],"MCP"),
      ip:   mkDT(tip_ip,  "TH_IP",     "XY", d.thumbLen[1],d.thumbWid[1],"IP"),
    };

    return {
      root, wrist:{dev:wristDev,flex:wristFlex},
      fingers:fingersRig, thumb:{cmcAbd,cmcFlex,cmcAxial,mcp:tmcp,ip:tip_ip},
      tips:{fingers:tipsF,thumb:tipTh}, tipOffsets:{fingers:tipOffsetsF,thumb:tipThOff},
      dbgMap, thumbLabels, highlight:{map:hmap,all:hlList},
    };
  }

  useEffect(() => {
    if (!three?.scene) return;
    if (handRig.current) {
      three.scene.remove(handRig.current.root);
      handRig.current.root.traverse(o=>{if(o.isMesh){o.geometry?.dispose();o.material?.dispose();}});
    }
    handRig.current = buildHandRig(dims); three.scene.add(handRig.current.root); frameRig();
  }, [dims,three]);

  // Debug highlight
  useEffect(() => {
    const rig = handRig.current; if (!rig) return;
    const map = rig.dbgMap;
    Object.values(map).forEach(pkg => pkg.setVisible(false));
    const globalJoint = {GLOBAL_MCP:"MCP",GLOBAL_PIP:"PIP",GLOBAL_DIP:"DIP"}[debugKey];
    if (globalJoint) {
      ["D2","D3","D4","D5"].forEach(d => map[`${d}_${globalJoint}`]?.setVisible(true));
      if (map[debugKey]?.label) map[debugKey].label.visible = true;
    } else if (debugKey!=="off" && map[debugKey]) {
      map[debugKey].setVisible(true);
    }
    const hl = rig.highlight;
    hl.all.forEach(m => { if(m.material&&m.userData.baseColor){m.material.color.copy(m.userData.baseColor);m.material.emissive?.set(0x000000);} });
    const tgts = globalJoint
      ? ["D2","D3","D4","D5"].flatMap(d => hl.map[`${d}_${globalJoint}`]||[])
      : (hl.map[debugKey]||[]);
    tgts.forEach(m => { if(m.material){m.material.color.set(0xffcc66);m.material.emissive?.set(0x553300);} });
  }, [debugKey]);

  useEffect(() => {
    if (!viewcubeRef.current) return;
    const {scene,camera,renderer}=mini; renderer.setSize(100,100);
    if (!viewcubeRef.current.contains(renderer.domElement)) viewcubeRef.current.appendChild(renderer.domElement);
    let raf=0; const loop=()=>{raf=requestAnimationFrame(loop);renderer.render(scene,camera);}; loop();
    return ()=>{cancelAnimationFrame(raf);if(renderer.domElement.parentNode===viewcubeRef.current)viewcubeRef.current.removeChild(renderer.domElement);try{renderer.dispose()}catch{}};
  },[mini]);

  useEffect(() => {
    const link=document.createElement("link"); link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Montserrat:wght@600;700&display=swap";
    document.head.appendChild(link); return ()=>{try{document.head.removeChild(link)}catch{}};
  },[]);

  // ── Aplica pose no rig + atualiza labels ─────────────────────────────────
  useEffect(() => {
    const rig = handRig.current; if (!rig) return;

    // Dedos D2-D5: cada dedo rotaciona nos seus próprios grupos MCP/PIP/DIP
    fingers.forEach((s,i) => {
      const f = rig.fingers[i];
      f.mcp.rotation.z = deg2rad(clamp(s.MCP, RANGES.MCP));
      f.pip.rotation.z = deg2rad(clamp(s.PIP, RANGES.PIP));
      f.dip.rotation.z = deg2rad(clamp(s.DIP, RANGES.DIP));
    });

    // Punho
    rig.wrist.dev.rotation.x  = deg2rad(clamp(wrist.dev,  RANGES.WRIST_DEV));
    rig.wrist.flex.rotation.z = deg2rad(clamp(wrist.flex, RANGES.WRIST_FLEX));

    // Polegar
    const t = rig.thumb;
    t.cmcAbd.rotation.z   =  deg2rad(clamp(thumb.CMC_abd,  RANGES.CMC_ABD));
    t.cmcFlex.rotation.y  =  deg2rad(clamp(thumb.CMC_flex, RANGES.CMC_FLEX));
    t.cmcAxial.rotation.x =  deg2rad(clamp(thumb.CMC_opp,  RANGES.CMC_OPP));
    t.mcp.rotation.z      =  deg2rad(clamp(thumb.MCP_flex, RANGES.THUMB_MCP_FLEX));
    t.ip.rotation.z       = -deg2rad(clamp(thumb.IP,       RANGES.THUMB_IP));

    // Labels
    const fmt = v => `${Math.round(v)}°`, map = rig.dbgMap;
    setLabelText(map.GLOBAL_MCP?.label, `MCP: ${fmt(fingers[1].MCP)}`);
    setLabelText(map.GLOBAL_PIP?.label, `PIP: ${fmt(fingers[1].PIP)}`);
    setLabelText(map.GLOBAL_DIP?.label, `DIP: ${fmt(fingers[1].DIP)}`);
    setLabelText(map.WR_FLEX?.label,    `Flex: ${fmt(wrist.flex)}`);
    setLabelText(map.WR_DEV?.label,     `Desvio: ${fmt(wrist.dev)}`);
    const tl = rig.thumbLabels;
    if (tl) {
      setLabelText(tl.abd,  `CMC abd: ${fmt(thumb.CMC_abd)}`);
      setLabelText(tl.flex, `CMC flex: ${fmt(thumb.CMC_flex)}`);
      setLabelText(tl.opp,  `CMC opp: ${fmt(thumb.CMC_opp)}`);
      setLabelText(tl.mcp,  `MCP: ${fmt(thumb.MCP_flex)}`);
      setLabelText(tl.ip,   `IP: ${fmt(thumb.IP)}`);
    }
  }, [fingers,thumb,wrist,dims]);

  // Fechamento global
  const applyGlobalGrip = (g, modeOv) => {
    const mode = modeOv||globalMode||"functional";
    const s = Math.min(Math.max(g,0),100)/100;
    const t = s<=0.5 ? s/0.5 : (s-0.5)/0.5;
    if (mode==="pinch") {
      const [fA,fB] = s<=0.5 ? [PINCH_KF.open.index,PINCH_KF.mid.index] : [PINCH_KF.mid.index,PINCH_KF.closed.index];
      const [tA,tB] = s<=0.5 ? [PINCH_KF.open.thumb,PINCH_KF.mid.thumb] : [PINCH_KF.mid.thumb,PINCH_KF.closed.thumb];
      setFingers(prev => prev.map((_,i) => i===0 ? {..._,...interpPose(fA,fB,t)} : defaultFinger()));
      setThumb(p => ({...p,...interpPose(tA,tB,t)}));
    } else {
      const [fA,fB] = s<=0.5 ? [FUNC_KF.open.finger,FUNC_KF.mid.finger] : [FUNC_KF.mid.finger,FUNC_KF.closed.finger];
      const [tA,tB] = s<=0.5 ? [FUNC_KF.open.thumb,FUNC_KF.mid.thumb]   : [FUNC_KF.mid.thumb,FUNC_KF.closed.thumb];
      const [wA,wB] = s<=0.5 ? [FUNC_KF.open.wrist,FUNC_KF.mid.wrist]   : [FUNC_KF.mid.wrist,FUNC_KF.closed.wrist];
      setFingers(prev => prev.map(() => interpPose(fA,fB,t)));
      setThumb(p => ({...p,...interpPose(tA,tB,t)}));
      setWrist(w => ({...w,...interpPose(wA,wB,t)}));
    }
  };

  const THUMB_RANGE_KEY = { CMC_abd:"CMC_ABD", CMC_flex:"CMC_FLEX", CMC_opp:"CMC_OPP", MCP_flex:"THUMB_MCP_FLEX", IP:"THUMB_IP" };
  const setThumbVal = (k,v) => setThumb(p => ({...p,[k]:clamp(v,RANGES[THUMB_RANGE_KEY[k]])}));
  const presetPinch      = () => { setGlobalMode("pinch");      setGrip(50); applyGlobalGrip(50,"pinch");      setOpenPanel("global"); };
  const presetFunctional = () => { setGlobalMode("functional"); setGrip(50); applyGlobalGrip(50,"functional"); setOpenPanel("global"); };

  const ThumbSection = () => ([
    { k:'CMC_abd', lbl:`CMC Abd/Adução (${RANGES.CMC_ABD[0]}..+${RANGES.CMC_ABD[1]})`,         min:RANGES.CMC_ABD[0],       max:RANGES.CMC_ABD[1],       L:'Adução (−)',       R:'Abdução (+)',  dbk:'TH_CMC_ABD'  },
    { k:'CMC_flex',lbl:`CMC Flexão (${RANGES.CMC_FLEX[0]}..${RANGES.CMC_FLEX[1]})`,             min:RANGES.CMC_FLEX[0],      max:RANGES.CMC_FLEX[1],      L:null,               R:'Flexão (+)',  dbk:'TH_CMC_FLEX' },
    { k:'CMC_opp', lbl:`CMC Oposição (${RANGES.CMC_OPP[0]}..+${RANGES.CMC_OPP[1]})`,           min:RANGES.CMC_OPP[0],       max:RANGES.CMC_OPP[1],       L:'Retroposição (−)', R:'Oposição (+)',dbk:'TH_CMC_OPP'  },
    { k:'MCP_flex',lbl:`MCP Flexão (${RANGES.THUMB_MCP_FLEX[0]}..${RANGES.THUMB_MCP_FLEX[1]})`,min:RANGES.THUMB_MCP_FLEX[0],max:RANGES.THUMB_MCP_FLEX[1],L:null,               R:'Flexão (+)',  dbk:'TH_MCP'      },
    { k:'IP',      lbl:`IP (${RANGES.THUMB_IP[0]}..+${RANGES.THUMB_IP[1]})`,                   min:RANGES.THUMB_IP[0],      max:RANGES.THUMB_IP[1],      L:'Extensão (−)',     R:'Flexão (+)',  dbk:'TH_IP'       },
  ].map(c => (
    <LabeledSlider key={c.k} label={c.lbl} min={c.min} max={c.max} value={thumb[c.k]}
      onChange={v => setThumbVal(c.k,v)} leftHint={c.L} rightHint={c.R}
      afterHeader={<DebugSelect active={debugKey===c.dbk} onChange={on => setDebugKey(on?c.dbk:'off')} />} />
  )));

  return (
    <div className="w-full h-screen text-gray-900 flex overflow-hidden"
      style={{"--lmb-navy":"#0e1e35","--lmb-coral":"#f04d4f","--lmb-teal":"#3bb7a2","--lmb-ivory":"#f9f8f4","--lmb-blue":"#10315a",backgroundColor:"var(--lmb-ivory)",fontFamily:'"DM Sans",ui-sans-serif,system-ui'}}>

      <aside className="w-[420px] max-w-[45%] h-full border-r border-gray-200 p-5 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-1" style={{fontFamily:'"Montserrat","DM Sans",ui-sans-serif'}}>Simulador de Mão 3D</h1>
        <p className="text-xs text-gray-500 mb-4">Positivo = flexão/abdução · Negativo = extensão/adução</p>

        {/* Antropometria */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1">Sexo</label>
            <select value={sex} onChange={e=>setSex(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm">
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Percentil</label>
            <select value={percentile} onChange={e=>setPercentile(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm">
              {PERC_OPTIONS.map(p=><option key={p} value={p}>P{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Idade</label>
            <input type="number" min={5} max={90} value={age} onChange={e=>setAge(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm" />
          </div>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button onClick={presetPinch}      className="px-3 py-1.5 rounded-xl text-xs font-medium text-white" style={{backgroundColor:"var(--lmb-teal)"}}>Pinça</button>
          <button onClick={presetFunctional} className="px-3 py-1.5 rounded-xl text-xs font-medium text-white" style={{backgroundColor:"var(--lmb-coral)"}}>Funcional</button>
          <button onClick={resetToNeutral}   className="px-3 py-1.5 rounded-xl border text-xs" style={{borderColor:"var(--lmb-blue)",color:"var(--lmb-blue)"}}>Zero</button>
          <button onClick={resetToRest}      className="px-3 py-1.5 rounded-xl border text-xs" style={{borderColor:"var(--lmb-blue)",color:"var(--lmb-blue)"}}>Neutro</button>
        </div>

        {/* Controle global D2-D5 */}
        <AccordionItem id="global_d2d5" title="Controle global D2–D5" isOpen={openPanel==="global_d2d5"} onToggle={id=>setOpenPanel(openPanel===id?"none":id)}>
          <p className="text-xs text-gray-500 mb-3">Move todos os dedos (D2 a D5) simultaneamente.</p>
          {[
            ["MCP", RANGES.MCP, "Extensão (−)", "Flexão (+)", "GLOBAL_MCP"],
            ["PIP", RANGES.PIP, null,            "Flexão (+)", "GLOBAL_PIP"],
            ["DIP", RANGES.DIP, "Extensão (−)", "Flexão (+)", "GLOBAL_DIP"],
          ].map(([k,r,lH,rH,dbk])=>(
            <LabeledSlider key={k} label={`${k} D2–D5 (${r[0]}..+${r[1]})`} min={r[0]} max={r[1]} value={globalD2D5[k]}
              onChange={v=>updateGlobalD2D5(k,v)} leftHint={lH} rightHint={rH}
              afterHeader={<DebugSelect active={debugKey===dbk} onChange={on=>setDebugKey(on?dbk:'off')} />} />
          ))}
        </AccordionItem>

        {/* Polegar */}
        <AccordionItem id="thumb" title="D1 – Polegar (CMC, MCP, IP)" isOpen={openPanel==="thumb"} onToggle={id=>setOpenPanel(openPanel===id?"none":id)}>
          <ThumbSection />
        </AccordionItem>

        {/* Punho */}
        <AccordionItem id="wrist" title="Punho (Flex/Ext, Desvio)" isOpen={openPanel==="wrist"} onToggle={id=>setOpenPanel(openPanel===id?"none":id)}>
          <LabeledSlider label={`Flexão/Extensão (${RANGES.WRIST_FLEX[0]}..+${RANGES.WRIST_FLEX[1]})`} min={RANGES.WRIST_FLEX[0]} max={RANGES.WRIST_FLEX[1]} value={wrist.flex}
            onChange={v=>setWrist(w=>({...w,flex:v}))} leftHint="Extensão (−)" rightHint="Flexão (+)"
            afterHeader={<DebugSelect active={debugKey==='WR_FLEX'} onChange={on=>setDebugKey(on?'WR_FLEX':'off')} />} />
          <LabeledSlider label={`Desvio radial/ulnar (${RANGES.WRIST_DEV[0]}..+${RANGES.WRIST_DEV[1]})`} min={RANGES.WRIST_DEV[0]} max={RANGES.WRIST_DEV[1]} value={wrist.dev}
            onChange={v=>setWrist(w=>({...w,dev:v}))} leftHint="Ulnar (−)" rightHint="Radial (+)"
            afterHeader={<DebugSelect active={debugKey==='WR_DEV'} onChange={on=>setDebugKey(on?'WR_DEV':'off')} />} />
        </AccordionItem>

        {/* Fechamento global */}
        <AccordionItem id="global" title="Fechamento global" isOpen={openPanel==="global"} onToggle={id=>setOpenPanel(openPanel===id?"none":id)}>
          <LabeledSlider label={globalMode==='pinch'?'Fechamento (pinça) 0–100':'Fechamento (funcional) 0–100'} min={0} max={100} value={grip}
            onChange={v=>{setGrip(v);applyGlobalGrip(v);}} />
        </AccordionItem>

        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer font-medium">Tabela técnica – Limites</summary>
          <div className="mt-2 space-y-1">
            <p>MCP D2–D5: −45° a +90° · PIP: 0–100° · DIP: −20° a +80°</p>
            <p>CMC Polegar: Abd −10..+60° · Flex 0..30° · Oposição −40..+70°</p>
            <p>MCP Polegar: 0–60° · IP: −10° a +80°</p>
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