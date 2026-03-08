export const INITIAL_ANTHROPOMETRY = {
  sex: "masculino",
  percentile: 50,
  age: 25,
};

export const CMC_AXIS_DIRECTIONS = {
  CMC_abd: { positive: "abducao", negative: "aducao" },
  CMC_flex: { positive: "flexao", negative: "extensao" },
};

export const ZERO_OVERLAY = {
  CMC_abd: 0,
  CMC_flex: 0,
  CMC_opp: 0,
  MCP_flex: 0,
  IP: 0,
};

export const GONIOMETRY_STATE_EPSILON = 1e-4;
