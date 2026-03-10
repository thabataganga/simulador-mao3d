export const INITIAL_ANTHROPOMETRY = {
  sex: "masculino",
  percentile: 50,
  age: 25,
};

export const CMC_AXIS_DIRECTIONS = {
  CMC_flexExt: { positive: "flexao", negative: "extensao" },
  CMC_abdAdd: { positive: "abducao", negative: "aducao" },
};

export const ZERO_OVERLAY = {
  CMC_flexExt: 0,
  CMC_abdAdd: 0,
  CMC_opp: 0,
  MCP_flex: 0,
  IP: 0,
};

export const GONIOMETRY_STATE_EPSILON = 1e-4;