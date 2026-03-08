export const PALM_DIMS = { LENGTH: 70, THICKNESS: 14, WIDTH: 55 };

export const THUMB_BASE_RATIO = { xL: 24 / 70, yT: -2 / 14, zW: 28 / 55 };

export const RATIOS = {
  baseZ: [18 / 55, 6 / 55, -6 / 55, -18 / 55],
  fingerWidths: [10 / 14, 9 / 14, 8 / 14],
  thumbWidths: [10 / 14, 9 / 14],
};

export const PHAL_RATIOS = {
  D2: { totalVsD3: 0.882, seg: { pp: 0.51, pm: 0.287, pd: 0.203 } },
  D3: { totalVsD3: 1, seg: { pp: 0.505, pm: 0.298, pd: 0.197 } },
  D4: { totalVsD3: 0.954, seg: { pp: 0.491, pm: 0.304, pd: 0.205 } },
  D5: { totalVsD3: 0.756, seg: { pp: 0.49, pm: 0.271, pd: 0.239 } },
};

export const THUMB_RATIOS = { totalVsD3: 0.602, seg: { pp: 0.593, pd: 0.407 } };

export const TIP_SOFT_MM = { D2: 3.84, D3: 3.95, D4: 3.95, D5: 3.73, TH: 5.67 };

export const SEX_RATIOS = {
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

export const PERC_OPTIONS = [5, 25, 50, 75, 95];

