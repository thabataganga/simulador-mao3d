// ─── Ranges articulares ───────────────────────────────────────────────────────
export const RANGES = {
  MCP: [-45, 90], PIP: [0, 100], DIP: [-20, 80],
  CMC_ABD: [-10, 60], CMC_OPP: [-40, 70], CMC_FLEX: [0, 30],
  THUMB_MCP_FLEX: [0, 60], THUMB_IP: [-10, 80],
  WRIST_FLEX: [-70, 80], WRIST_DEV: [-30, 20],
};

// ─── Geometria da palma ───────────────────────────────────────────────────────
export const PALM_DIMS = { LENGTH: 70, THICKNESS: 14, WIDTH: 55 };

export const THUMB_BASE_RATIO = { xL: 24 / 70, yT: -2 / 14, zW: 28 / 55 };

export const RATIOS = {
  baseZ: [18 / 55, 6 / 55, -6 / 55, -18 / 55],
  fingerWidths: [10 / 14, 9 / 14, 8 / 14],
  thumbWidths: [10 / 14, 9 / 14],
};

export const PHAL_RATIOS = {
  D2: { totalVsD3: 0.882, seg: { pp: 0.51,  pm: 0.287, pd: 0.203 } },
  D3: { totalVsD3: 1,     seg: { pp: 0.505, pm: 0.298, pd: 0.197 } },
  D4: { totalVsD3: 0.954, seg: { pp: 0.491, pm: 0.304, pd: 0.205 } },
  D5: { totalVsD3: 0.756, seg: { pp: 0.49,  pm: 0.271, pd: 0.239 } },
};

export const THUMB_RATIOS = { totalVsD3: 0.602, seg: { pp: 0.593, pd: 0.407 } };

export const TIP_SOFT_MM = { D2: 3.84, D3: 3.95, D4: 3.95, D5: 3.73, TH: 5.67 };

export const SEX_RATIOS = {
  masculino: { palmWidthToLength: 0.8,  palmThickToWidth: 0.27, wristRadToPalmWidth: 0.3,  wristLenToPalmThick: 1.1,  forearmLenToPalmLen: 1.75, forearmProxToWrist: 1.15, forearmDistToWrist: 0.9,  d3ToPalm: 1.03, thumbBaseFromProx: 0.18 },
  feminino:  { palmWidthToLength: 0.82, palmThickToWidth: 0.25, wristRadToPalmWidth: 0.29, wristLenToPalmThick: 1.05, forearmLenToPalmLen: 1.7,  forearmProxToWrist: 1.1,  forearmDistToWrist: 0.88, d3ToPalm: 0.99, thumbBaseFromProx: 0.16 },
};

export const PERC_OPTIONS = [5, 25, 50, 75, 95];

// ─── Keyframes de fechamento ──────────────────────────────────────────────────
export const PINCH_KF = {
  open:   { index: { MCP: 10, PIP: 15, DIP: 5  }, thumb: { CMC_abd: 35, CMC_flex: 10, CMC_opp: 15, MCP_flex: 15, IP: 5  } },
  mid:    { index: { MCP: 55, PIP: 80, DIP: 60 }, thumb: { CMC_abd: 28, CMC_flex: 20, CMC_opp: 60, MCP_flex: 40, IP: 55 } },
  closed: { index: { MCP: 90, PIP: 95, DIP: 70 }, thumb: { CMC_abd: 18, CMC_flex: 25, CMC_opp: 70, MCP_flex: 55, IP: 70 } },
};

export const FUNC_KF = {
  open:   { finger: { MCP: 10, PIP: 10, DIP: 0  }, thumb: { CMC_abd: 35, CMC_flex: 8,  CMC_opp: 10, MCP_flex: 8,  IP: 0  }, wrist: { flex: -10, dev: -2  } },
  mid:    { finger: { MCP: 45, PIP: 35, DIP: 15 }, thumb: { CMC_abd: 45, CMC_flex: 12, CMC_opp: 12, MCP_flex: 10, IP: 5  }, wrist: { flex: -25, dev: -12 } },
  closed: { finger: { MCP: 80, PIP: 90, DIP: 60 }, thumb: { CMC_abd: 35, CMC_flex: 20, CMC_opp: 20, MCP_flex: 30, IP: 45 }, wrist: { flex: -35, dev: -15 } },
};

export const THUMB_RANGE_KEY = {
  CMC_abd: "CMC_ABD", CMC_flex: "CMC_FLEX", CMC_opp: "CMC_OPP",
  MCP_flex: "THUMB_MCP_FLEX", IP: "THUMB_IP",
};