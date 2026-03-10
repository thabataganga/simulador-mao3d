import { deg2rad } from "../math/core";

export const defaultFinger = () => ({ MCP: 0, PIP: 0, DIP: 0 });

export const defaultThumb = () => ({
  CMC_flexExt: 0,
  CMC_opp: 0,
  CMC_abdAdd: 0,
  MCP_flex: 0,
  IP: 0,
});

export function restFromDims(d) {
  if (!d?.neutralFingers) {
    return {
      f: Array.from({ length: 4 }, defaultFinger),
      t: defaultThumb(),
      w: { flex: 0, dev: 0 },
    };
  }

  const f = d.neutralFingers.map(nf => ({
    MCP: Math.round((nf.mcp * 180) / Math.PI),
    PIP: Math.round((nf.pip * 180) / Math.PI),
    DIP: Math.round((0.6 * nf.pip * 180) / Math.PI),
  }));
  const t = {
    CMC_flexExt: Math.round((d.neutralThumb.abd * 180) / Math.PI),
    CMC_abdAdd: Math.round((d.neutralThumb.flex * 180) / Math.PI),
    CMC_opp: Math.round((d.neutralThumb.opp * 180) / Math.PI),
    MCP_flex: 0,
    IP: 0,
  };

  return { f, t, w: { flex: -25, dev: -12 } };
}

export function buildNeutralFingerAngles() {
  return [
    { mcp: deg2rad(15), pip: deg2rad(20), dip: deg2rad(10) },
    { mcp: deg2rad(20), pip: deg2rad(25), dip: deg2rad(10) },
    { mcp: deg2rad(25), pip: deg2rad(30), dip: deg2rad(15) },
    { mcp: deg2rad(30), pip: deg2rad(35), dip: deg2rad(15) },
  ];
}

