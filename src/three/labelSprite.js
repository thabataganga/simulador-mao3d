import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial } from "three";

function drawLabelCanvas(canvas, text, fontPx, pad) {
  let ctx = canvas.getContext("2d");
  ctx.font = `${fontPx}px Arial`;
  const width = Math.ceil(ctx.measureText(text).width + pad * 2);
  const height = Math.ceil(fontPx + pad * 2);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(14,30,53,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.font = `${fontPx}px Arial`;
  ctx.fillText(text, pad, canvas.height / 2);
  return { ctx, width: canvas.width, height: canvas.height };
}

export function makeLabel(text, scale = 3.5) {
  const canvas = document.createElement("canvas");
  const fontPx = Math.round(44 * scale);
  const pad = 10;
  const { ctx, width, height } = drawLabelCanvas(canvas, text, fontPx, pad);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  const spr = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  const u = 0.02 * scale;
  spr.scale.set(width * u, height * u, 1);
  spr.renderOrder = 999;
  spr.userData = { canvas, ctx, tex, pad, fontPx, scaleFactor: scale, text };
  return spr;
}

export function setLabelText(spr, text) {
  if (!spr) return;

  const nextText = String(text ?? "");
  const { canvas, pad, fontPx, scaleFactor = 3.5 } = spr.userData;
  if (spr.userData.text === nextText) return;

  const prevWidth = canvas.width;
  const prevHeight = canvas.height;
  const { ctx, width, height } = drawLabelCanvas(canvas, nextText, fontPx, pad);
  const resized = width !== prevWidth || height !== prevHeight;

  if (resized) {
    const prevTexture = spr.userData.tex || spr.material?.map;
    const nextTexture = new CanvasTexture(canvas);
    nextTexture.minFilter = LinearFilter;
    spr.material.map = nextTexture;
    spr.material.needsUpdate = true;
    spr.userData.tex = nextTexture;
    if (prevTexture && prevTexture !== nextTexture) prevTexture.dispose?.();
  } else {
    const activeTexture = spr.userData.tex || spr.material?.map;
    if (activeTexture) activeTexture.needsUpdate = true;
  }

  const u = 0.02 * scaleFactor;
  spr.scale.set(width * u, height * u, 1);
  spr.userData.ctx = ctx;
  spr.userData.text = nextText;
}
