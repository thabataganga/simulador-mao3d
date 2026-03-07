import * as THREE from "three";

export function makeLabel(text, scale = 3.5) {
  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d");
  const fontPx = Math.round(44 * scale), pad = 10;
  ctx.font = `${fontPx}px Arial`;
  const w = Math.ceil(ctx.measureText(text).width + pad * 2);
  const h = Math.ceil(fontPx + pad * 2);
  canvas.width = w; canvas.height = h;
  ctx.fillStyle = "rgba(14,30,53,0.88)"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  const u = 0.02 * scale; spr.scale.set(w * u, h * u, 1);
  spr.renderOrder = 999;
  spr.userData = { canvas, ctx, tex, pad, fontPx };
  return spr;
}

export function setLabelText(spr, text) {
  if (!spr) return;
  const { canvas, ctx, tex, pad, fontPx } = spr.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(14,30,53,0.88)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, canvas.height / 2);
  tex.needsUpdate = true;
}

export function makeDebugPkg(group, key, planeAxis, sx, sy, axSz, labelText, withLabel = true) {
  const axes  = new THREE.AxesHelper(axSz); group.add(axes);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(sx, sy),
    new THREE.MeshBasicMaterial({ color: 0x3bb7a2, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  if (planeAxis === "YZ") plane.rotation.y = Math.PI / 2;
  if (planeAxis === "ZX") plane.rotation.x = Math.PI / 2;
  group.add(plane);
  let spr = null;
  if (withLabel) { spr = makeLabel(labelText); spr.position.set(0, sy * 0.72, 0); group.add(spr); }
  const setVisible = v => { axes.visible = v; plane.visible = v; if (spr) spr.visible = v; };
  setVisible(false);
  return { key, axes, plane, label: spr, setVisible };
}