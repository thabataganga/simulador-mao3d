export const deg2rad = d => (d * Math.PI) / 180;

export const clamp = (v, [min, max]) => Math.min(Math.max(v, min), max);

export const lerp = (a, b, t) => a + (b - a) * t;

export const interpPose = (a, b, t) =>
  Object.fromEntries(Object.keys(a).map(k => [k, Math.round(lerp(a[k], b[k], t))]));

