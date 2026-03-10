export const CMC_TEMP_RANGE = [-180, 180];

export const RANGES = {
  MCP: [-45, 90],
  PIP: [0, 100],
  DIP: [-20, 80],
  CMC_ABD: [-15, 70],
  CMC_OPP: CMC_TEMP_RANGE,
  CMC_FLEX: [-70, 15],
  THUMB_MCP_FLEX: [0, 60],
  THUMB_IP: [-10, 80],
  WRIST_FLEX: [-70, 80],
  WRIST_DEV: [-20, 30],
};

export const THUMB_RANGE_KEY = {
  CMC_abd: "CMC_ABD",
  CMC_flex: "CMC_FLEX",
  CMC_opp: "CMC_OPP",
  MCP_flex: "THUMB_MCP_FLEX",
  IP: "THUMB_IP",
};

export const THUMB_CMC_NEUTRAL = Object.freeze({
  mountRotationOrder: "ZYX",
  cmcNeutralMountDeg: Object.freeze({ z: 0, y: 0, x: 0 }),
  cmcNeutralBaseOffset: Object.freeze({ dx: 0, dy: 0, dz: 0 }),
});

export const THUMB_CMC = Object.freeze({
  CLINICAL_ABD_SIGN: 1,
  FLEX_EFFECTIVE_RANGE: [-90, 30],
  OPP_COUPLING: Object.freeze({
    ABD_GAIN: 0.18,
    FLEX_GAIN: 0.22,
    PRONATION_GAIN: 0.38,
  }),
});

export const THUMB_KINEMATICS = Object.freeze({
  MCP_ACCESSORY_GAIN: 0.08,
});

