import { MathUtils } from "three";
import {
  PALM_DIMS, THUMB_BASE_RATIO, RATIOS, PHAL_RATIOS, THUMB_RATIOS,
  TIP_SOFT_MM, SEX_RATIOS, PINCH_KF, FUNC_KF, RANGES,
} from "../constants";

// ─── Matemática básica ────────────────────────────────────────────────────────
/**
 * Converte graus para radianos.
 * @param {number} d - Ângulo em graus.
 * @returns {number} Ângulo em radianos.
 */
export const deg2rad = (d) => (d * Math.PI) / 180;
/**
 * Limita um valor dentro de um intervalo mínimo e máximo.
 * @param {number} v - O valor a ser limitado.
 * @param {number[]} [min, max] - Um array contendo o valor mínimo e máximo.
 * @returns {number} O valor limitado.
 */
export const clamp   = (v, [min, max]) => Math.min(Math.max(v, min), max);
/**
 * Interpola linearmente entre dois valores.
 * @param {number} a - Valor inicial.
 * @param {number} b - Valor final.
 * @param {number} t - Fator de interpolação (entre 0 e 1).
 * @returns {number} O valor interpolado.
 */
export const lerp    = (a, b, t) => a + (b - a) * t;
/**
 * Interpola linearmente entre duas poses (objetos com propriedades numéricas).
 * @param {object} a - Pose inicial.
 * @param {object} b - Pose final.
 * @param {number} t - Fator de interpolação (entre 0 e 1).
 * @returns {object} A pose interpolada.
 */
export const interpPose = (a, b, t) =>
  Object.fromEntries(Object.keys(a).map(k => [k, Math.round(lerp(a[k], b[k], t))]));

// ─── Escala por percentil e idade ────────────────────────────────────────────
/**
 * Interpola a escala de tamanho da mão com base no percentil.
 * @param {number} p0 - Percentil (entre 5 e 95).
 * @returns {number} Fator de escala.
 */
export const interpPercentileScale = (p0) => {
  const p = Math.min(Math.max(p0, 5), 95);
  return p <= 50 ? 0.92 + ((p - 5) / 45) * 0.08 : 1 + ((p - 50) / 45) * 0.08;
};

/**
 * Calcula o fator de escala da mão com base na idade.
 * @param {number} age0 - Idade (entre 5 e 90).
 * @returns {number} Fator de escala.
 */
export const ageScale = (age0) => {
  const a = Math.min(Math.max(age0, 5), 90);
  const pts = [[5, 0.6], [10, 0.78], [14, 0.9], [18, 1], [65, 1], [80, 0.98], [90, 0.96]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a0, s0] = pts[i], [a1, s1] = pts[i + 1];
    if (a >= a0 && a <= a1) return s0 + ((a - a0) / (a1 - a0)) * (s1 - s0);
  }
  return 1;
};

// ─── Perfil antropométrico ────────────────────────────────────────────────────
/**
 * Constrói um perfil antropométrico com base no sexo, percentil e idade.
 * @param {string} sex - Sexo ("masculino" ou "feminino").
 * @param {number} percentile - Percentil (entre 5 e 95).
 * @param {number} age - Idade (entre 5 e 90).
 * @returns {object} O perfil antropométrico.
 */
export function buildProfile(sex, percentile, age) {
  const male = sex === "masculino";
  const sx = male
    ? { palmScale: 1.05, fingerScale: 1.03, thumbScale: 1.03, thumbBase: { ...THUMB_BASE_RATIO, zW: THUMB_BASE_RATIO.zW * 1.02 } }
    : { palmScale: 0.97, fingerScale: 0.98, thumbScale: 0.98, thumbBase: { ...THUMB_BASE_RATIO, zW: THUMB_BASE_RATIO.zW * 0.98 } };
  const sc = interpPercentileScale(percentile) * ageScale(age);
  return {
    sex: male ? "masculino" : "feminino",
    palmScale: sx.palmScale * sc,
    fingerScale: sx.fingerScale * sc,
    thumbScale: sx.thumbScale * sc,
    thumbBase: sx.thumbBase,
  };
}

// ─── Dimensões da mão ─────────────────────────────────────────────────────────
/**
 * Calcula as dimensões da mão com base em um perfil antropométrico.
 * @param {object} profile - O perfil antropométrico.
 * @returns {object} Objeto contendo as dimensões detalhadas da mão.
 */
export function makeDims(profile) {
  const R = SEX_RATIOS[profile.sex];
  const palmLen   = PALM_DIMS.LENGTH * profile.palmScale;
  const palmWidth = palmLen * R.palmWidthToLength;
  const palmThick = palmWidth * R.palmThickToWidth;
  const palm = { LENGTH: palmLen, WIDTH: palmWidth, THICKNESS: palmThick };

  const D3_TOTAL   = R.d3ToPalm * palmLen * profile.fingerScale;
  const fingers    = Object.values(PHAL_RATIOS).map(r => ({
    len: [D3_TOTAL * r.totalVsD3 * r.seg.pp, D3_TOTAL * r.totalVsD3 * r.seg.pm, D3_TOTAL * r.totalVsD3 * r.seg.pd],
  }));
  const fingerWid  = RATIOS.fingerWidths.map(r => r * palmThick);
  const thumbTotal = D3_TOTAL * THUMB_RATIOS.totalVsD3 * (profile.thumbScale / profile.fingerScale);
  const thumbLen   = [thumbTotal * THUMB_RATIOS.seg.pp, thumbTotal * THUMB_RATIOS.seg.pd];
  const thumbWid   = RATIOS.thumbWidths.map(r => r * palmThick);
  const baseX      = palmLen / 2 + MathUtils.clamp(0.3 * palmThick, 1.5, 6);
  const baseZ      = RATIOS.baseZ.map(r => r * palmWidth);
  const thumbBase  = {
    // Keep the CMC origin near the radial-proximal edge and move laterally in Z.
    x: -palmLen / 2 + R.thumbBaseFromProx * palmLen,
    y: palmThick * (profile.thumbBase?.yT ?? THUMB_BASE_RATIO.yT),
    z: palmWidth * (profile.thumbBase?.zW ?? THUMB_BASE_RATIO.zW),
  };
  const wrist   = { radius: palmWidth * R.wristRadToPalmWidth, length: palmThick * R.wristLenToPalmThick };
  const forearm = {
    len: palmLen * R.forearmLenToPalmLen,
    radProx: palmWidth * R.wristRadToPalmWidth * R.forearmProxToWrist,
    radDist: palmWidth * R.wristRadToPalmWidth * R.forearmDistToWrist,
  };
  const ss     = palmLen / PALM_DIMS.LENGTH;
  const tipPads = { index: TIP_SOFT_MM.D2 * ss, middle: TIP_SOFT_MM.D3 * ss, ring: TIP_SOFT_MM.D4 * ss, little: TIP_SOFT_MM.D5 * ss, thumb: TIP_SOFT_MM.TH * ss };
  const neutralFingers = [
    { mcp: deg2rad(15), pip: deg2rad(20), dip: deg2rad(10) },
    { mcp: deg2rad(20), pip: deg2rad(25), dip: deg2rad(10) },
    { mcp: deg2rad(25), pip: deg2rad(30), dip: deg2rad(15) },
    { mcp: deg2rad(30), pip: deg2rad(35), dip: deg2rad(15) },
  ];
  const neutralThumb = { abd: deg2rad(0), flex: deg2rad(0), opp: deg2rad(0) };
  return { palm, fingers, fingerWid, thumbLen, thumbWid, baseX, baseZ, thumbBase, forearm, wrist, tipPads, neutralFingers, neutralThumb };
}

// ─── Estado padrão das articulações ──────────────────────────────────────────
/**
 * Retorna o estado padrão de um dedo (articulações MCP, PIP, DIP).
 * @returns {object} Estado padrão do dedo.
 */
export const defaultFinger = () => ({ MCP: 0, PIP: 0, DIP: 0 });
/**
 * Retorna o estado padrão do polegar (articulações CMC, MCP, IP).
 * @returns {object} Estado padrão do polegar.
 */
export const defaultThumb  = () => ({ CMC_abd: 0, CMC_opp: 0, CMC_flex: 0, MCP_flex: 0, IP: 0 });

/**
 * Calcula a pose de repouso da mão com base nas dimensões.
 * @param {object} d - Objeto de dimensões da mão.
 * @returns {object} Objeto contendo as poses de repouso dos dedos, polegar e punho.
 */
export function restFromDims(d) {
  if (!d?.neutralFingers) return { f: Array.from({ length: 4 }, defaultFinger), t: defaultThumb(), w: { flex: 0, dev: 0 } };
  const f = d.neutralFingers.map(nf => ({
    MCP: Math.round(nf.mcp * 180 / Math.PI),
    PIP: Math.round(nf.pip * 180 / Math.PI),
    DIP: Math.round(0.6 * nf.pip * 180 / Math.PI),
  }));
  const t = {
    CMC_abd:  Math.round(d.neutralThumb.abd  * 180 / Math.PI),
    CMC_flex: Math.round(d.neutralThumb.flex * 180 / Math.PI),
    CMC_opp:  Math.round(d.neutralThumb.opp  * 180 / Math.PI),
    MCP_flex: 0, IP: 0,
  };
  return { f, t, w: { flex: -25, dev: -12 } };
}

// ─── Interpolação de grip ─────────────────────────────────────────────────────
/**
 * Calcula a pose da mão com base em um valor de "grip" e modo.
 * @param {number} g - Valor do grip (0-100).
 * @param {string} mode - Modo de grip ("pinch" ou "functional").
 * @returns {object} Objeto contendo as poses calculadas para dedos, polegar e punho.
 */
export function computeGrip(g, mode) {
  const s = Math.min(Math.max(g, 0), 100) / 100;
  const t = s <= 0.5 ? s / 0.5 : (s - 0.5) / 0.5;

  if (mode === "pinch") {
    const [fA, fB] = s <= 0.5 ? [PINCH_KF.open.index,  PINCH_KF.mid.index]  : [PINCH_KF.mid.index,  PINCH_KF.closed.index];
    const [tA, tB] = s <= 0.5 ? [PINCH_KF.open.thumb,  PINCH_KF.mid.thumb]  : [PINCH_KF.mid.thumb,  PINCH_KF.closed.thumb];
    return { finger: interpPose(fA, fB, t), thumb: interpPose(tA, tB, t), wrist: null, pinchOnly: true };
  }

  const [fA, fB] = s <= 0.5 ? [FUNC_KF.open.finger, FUNC_KF.mid.finger] : [FUNC_KF.mid.finger, FUNC_KF.closed.finger];
  const [tA, tB] = s <= 0.5 ? [FUNC_KF.open.thumb,  FUNC_KF.mid.thumb]  : [FUNC_KF.mid.thumb,  FUNC_KF.closed.thumb];
  const [wA, wB] = s <= 0.5 ? [FUNC_KF.open.wrist,  FUNC_KF.mid.wrist]  : [FUNC_KF.mid.wrist,  FUNC_KF.closed.wrist];
  return { finger: interpPose(fA, fB, t), thumb: interpPose(tA, tB, t), wrist: interpPose(wA, wB, t), pinchOnly: false };
}
