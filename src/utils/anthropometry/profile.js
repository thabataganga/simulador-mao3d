import { MathUtils } from "three";
import {
  PALM_DIMS,
  PHAL_RATIOS,
  RATIOS,
  SEX_RATIOS,
  THUMB_BASE_RATIO,
  THUMB_RATIOS,
  TIP_SOFT_MM,
} from "../../constants/reference/anthropometry";
import { deg2rad } from "../math/core";

export const interpPercentileScale = p0 => {
  const p = Math.min(Math.max(p0, 5), 95);
  return p <= 50 ? 0.92 + ((p - 5) / 45) * 0.08 : 1 + ((p - 50) / 45) * 0.08;
};

export const ageScale = age0 => {
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
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [a0, s0] = pts[i];
    const [a1, s1] = pts[i + 1];
    if (a >= a0 && a <= a1) return s0 + ((a - a0) / (a1 - a0)) * (s1 - s0);
  }
  return 1;
};

export function buildProfile(sex, percentile, age) {
  const male = sex === "masculino";
  const sx = male
    ? {
        palmScale: 1.05,
        fingerScale: 1.03,
        thumbScale: 1.03,
        thumbBase: { ...THUMB_BASE_RATIO, zW: THUMB_BASE_RATIO.zW * 1.02 },
      }
    : {
        palmScale: 0.97,
        fingerScale: 0.98,
        thumbScale: 0.98,
        thumbBase: { ...THUMB_BASE_RATIO, zW: THUMB_BASE_RATIO.zW * 0.98 },
      };
  const sc = interpPercentileScale(percentile) * ageScale(age);
  return {
    sex: male ? "masculino" : "feminino",
    palmScale: sx.palmScale * sc,
    fingerScale: sx.fingerScale * sc,
    thumbScale: sx.thumbScale * sc,
    thumbBase: sx.thumbBase,
  };
}

export function makeDims(profile) {
  const ratios = SEX_RATIOS[profile.sex];
  const palmLen = PALM_DIMS.LENGTH * profile.palmScale;
  const palmWidth = palmLen * ratios.palmWidthToLength;
  const palmThick = palmWidth * ratios.palmThickToWidth;
  const palm = { LENGTH: palmLen, WIDTH: palmWidth, THICKNESS: palmThick };

  const d3Total = ratios.d3ToPalm * palmLen * profile.fingerScale;
  const fingers = Object.values(PHAL_RATIOS).map(r => ({
    len: [d3Total * r.totalVsD3 * r.seg.pp, d3Total * r.totalVsD3 * r.seg.pm, d3Total * r.totalVsD3 * r.seg.pd],
  }));
  const fingerWid = RATIOS.fingerWidths.map(r => r * palmThick);
  const thumbTotal = d3Total * THUMB_RATIOS.totalVsD3 * (profile.thumbScale / profile.fingerScale);
  const thumbLen = [thumbTotal * THUMB_RATIOS.seg.pp, thumbTotal * THUMB_RATIOS.seg.pd];
  const thumbWid = RATIOS.thumbWidths.map(r => r * palmThick);
  const baseX = palmLen / 2 + MathUtils.clamp(0.3 * palmThick, 1.5, 6);
  const baseZ = RATIOS.baseZ.map(r => r * palmWidth);
  const thumbBase = {
    x: -palmLen / 2 + ratios.thumbBaseFromProx * palmLen,
    y: palmThick * (profile.thumbBase?.yT ?? THUMB_BASE_RATIO.yT),
    z: palmWidth * (profile.thumbBase?.zW ?? THUMB_BASE_RATIO.zW),
  };

  const wrist = {
    radius: palmWidth * ratios.wristRadToPalmWidth,
    length: palmThick * ratios.wristLenToPalmThick,
  };
  const forearm = {
    len: palmLen * ratios.forearmLenToPalmLen,
    radProx: palmWidth * ratios.wristRadToPalmWidth * ratios.forearmProxToWrist,
    radDist: palmWidth * ratios.wristRadToPalmWidth * ratios.forearmDistToWrist,
  };

  const ss = palmLen / PALM_DIMS.LENGTH;
  const tipPads = {
    index: TIP_SOFT_MM.D2 * ss,
    middle: TIP_SOFT_MM.D3 * ss,
    ring: TIP_SOFT_MM.D4 * ss,
    little: TIP_SOFT_MM.D5 * ss,
    thumb: TIP_SOFT_MM.TH * ss,
  };

  const neutralFingers = [
    { mcp: deg2rad(15), pip: deg2rad(20), dip: deg2rad(10) },
    { mcp: deg2rad(20), pip: deg2rad(25), dip: deg2rad(10) },
    { mcp: deg2rad(25), pip: deg2rad(30), dip: deg2rad(15) },
    { mcp: deg2rad(30), pip: deg2rad(35), dip: deg2rad(15) },
  ];
  const neutralThumb = { abd: deg2rad(0), flex: deg2rad(0), opp: deg2rad(0) };

  return {
    palm,
    fingers,
    fingerWid,
    thumbLen,
    thumbWid,
    baseX,
    baseZ,
    thumbBase,
    forearm,
    wrist,
    tipPads,
    neutralFingers,
    neutralThumb,
  };
}


