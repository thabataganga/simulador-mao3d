import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export function makeLabel(text, scale = 3.5) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontPx = Math.round(44 * scale);
  const pad = 10;
  ctx.font = `${fontPx}px Arial`;
  const w = Math.ceil(ctx.measureText(text).width + pad * 2);
  const h = Math.ceil(fontPx + pad * 2);
  canvas.width = w;
  canvas.height = h;
  ctx.fillStyle = "rgba(14,30,53,0.88)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  const u = 0.02 * scale;
  spr.scale.set(w * u, h * u, 1);
  spr.renderOrder = 999;
  spr.userData = { canvas, ctx, tex, pad, fontPx };
  return spr;
}

export function setLabelText(spr, text) {
  if (!spr) return;
  const { canvas, ctx, tex, pad, fontPx } = spr.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(14,30,53,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, canvas.height / 2);
  tex.needsUpdate = true;
}

function signedAngleOnPlane(from, to, planeNormal) {
  const fromLen = from.length();
  const toLen = to.length();
  if (fromLen < 1e-6 || toLen < 1e-6) return 0;
  const fromUnit = from.clone().multiplyScalar(1 / fromLen);
  const toUnit = to.clone().multiplyScalar(1 / toLen);
  const angle = fromUnit.angleTo(toUnit);
  const cross = new THREE.Vector3().crossVectors(fromUnit, toUnit);
  const sign = Math.sign(cross.dot(planeNormal)) || 1;
  return angle * sign;
}

function createGoniometerVisual(group, color) {
  const mkLine = () => {
    const material = new LineMaterial({
      color,
      transparent: true,
      opacity: 0.98,
      depthTest: false,
      linewidth: 4,
      worldUnits: false,
    });
    const line = new Line2(new LineGeometry(), material);
    return line;
  };

  const fixedRay = mkLine();
  const movingRay = mkLine();
  const angleArc = mkLine();
  fixedRay.renderOrder = 1001;
  movingRay.renderOrder = 1001;
  angleArc.renderOrder = 1001;
  group.add(fixedRay, movingRay, angleArc);

  const setResolution = ({ width, height } = {}) => {
    const safeW = Math.max(1, Number(width) || 1);
    const safeH = Math.max(1, Number(height) || 1);
    [fixedRay, movingRay, angleArc].forEach(line => {
      line.material.resolution.set(safeW, safeH);
    });
  };

  const setLineWidth = px => {
    const width = Math.max(1, Number(px) || 4);
    [fixedRay, movingRay, angleArc].forEach(line => {
      line.material.linewidth = width;
      line.material.needsUpdate = true;
    });
  };

  const hide = () => {
    fixedRay.visible = false;
    movingRay.visible = false;
    angleArc.visible = false;
  };

  const setPoints = (line, points) => {
    if (!Array.isArray(points) || points.length < 2) {
      line.visible = false;
      return;
    }
    const arr = [];
    points.forEach(p => arr.push(p.x, p.y, p.z));
    if (arr.length < 6) {
      line.visible = false;
      return;
    }
    line.geometry.setPositions(arr);
    line.computeLineDistances();
    line.visible = true;
  };

  const setGoniometer = input => {
    if (!input || !input.fixedDir || !input.movingDir || !input.planeNormal) {
      hide();
      return;
    }

    const {
      fixedDir,
      movingDir,
      planeNormal,
      rayLength = 18,
      arcRadius = 10,
      segments = 28,
      viewport,
      lineWidthPx = 4,
    } = input;

    setResolution(viewport);
    setLineWidth(lineWidthPx);

    const normal = planeNormal.clone().normalize();
    const fixed = fixedDir.clone().normalize();
    const moving = movingDir.clone().normalize();
    if (normal.lengthSq() < 1e-8 || fixed.lengthSq() < 1e-8 || moving.lengthSq() < 1e-8) {
      hide();
      return;
    }

    setPoints(fixedRay, [new THREE.Vector3(0, 0, 0), fixed.clone().multiplyScalar(rayLength)]);
    setPoints(movingRay, [new THREE.Vector3(0, 0, 0), moving.clone().multiplyScalar(rayLength)]);

    const angle = signedAngleOnPlane(fixed, moving, normal);
    const basisU = fixed.clone();
    const basisV = new THREE.Vector3().crossVectors(normal, basisU).normalize();
    if (basisV.lengthSq() < 1e-8) {
      angleArc.visible = false;
      return;
    }

    const pts = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = angle * (i / segments);
      const point = basisU
        .clone()
        .multiplyScalar(Math.cos(t))
        .add(basisV.clone().multiplyScalar(Math.sin(t)))
        .multiplyScalar(arcRadius);
      pts.push(point);
    }
    setPoints(angleArc, pts);
  };

  hide();

  return {
    fixedRay,
    movingRay,
    angleArc,
    setGoniometer,
    setResolution,
    hide,
  };
}

function createLabelHandle(group, sy, labelText, withLabel) {
  if (!withLabel) return { label: null, setLabelPosition: () => {} };

  const label = makeLabel(labelText);
  const defaultPos = new THREE.Vector3(0, sy * 0.72, 0);
  label.position.copy(defaultPos);
  group.add(label);

  const setLabelPosition = pos => {
    if (!label) return;
    if (!pos) {
      label.position.copy(defaultPos);
      return;
    }
    label.position.copy(pos);
  };

  return { label, setLabelPosition };
}

export function makeDebugPkg(group, key, planeAxis, sx, sy, axSz, labelText, withLabelOrOptions = true) {
  const opts =
    typeof withLabelOrOptions === "object" && withLabelOrOptions != null
      ? withLabelOrOptions
      : { withLabel: withLabelOrOptions };
  const withLabel = opts.withLabel !== false;
  const withGoniometer = Boolean(opts.withGoniometer);
  const goniometerColor = opts.goniometerColor ?? 0xff2b2b;

  const axes = new THREE.AxesHelper(axSz);
  group.add(axes);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(sx, sy),
    new THREE.MeshBasicMaterial({
      color: 0x3bb7a2,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  if (planeAxis === "YZ") plane.rotation.y = Math.PI / 2;
  if (planeAxis === "ZX") plane.rotation.x = Math.PI / 2;
  group.add(plane);

  const labelHandle = createLabelHandle(group, sy, labelText, withLabel);
  const goniometer = withGoniometer ? createGoniometerVisual(group, goniometerColor) : null;

  const setVisible = v => {
    axes.visible = v;
    plane.visible = v;
    if (labelHandle.label) labelHandle.label.visible = v;
    if (goniometer && !v) goniometer.hide();
  };

  setVisible(false);

  return {
    key,
    axes,
    plane,
    label: labelHandle.label,
    fixedRay: goniometer?.fixedRay ?? null,
    movingRay: goniometer?.movingRay ?? null,
    angleArc: goniometer?.angleArc ?? null,
    setGoniometer: goniometer?.setGoniometer ?? (() => {}),
    setGoniometerResolution: goniometer?.setResolution ?? (() => {}),
    setLabelPosition: labelHandle.setLabelPosition,
    setVisible,
  };
}
