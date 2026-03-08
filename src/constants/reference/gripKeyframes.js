export const PINCH_KF = {
  open: {
    index: { MCP: 10, PIP: 15, DIP: 5 },
    thumb: { CMC_abd: 52, CMC_flex: -6, CMC_opp: 25, MCP_flex: 0, IP: 25 },
  },
  mid: {
    index: { MCP: 55, PIP: 80, DIP: 60 },
    thumb: { CMC_abd: 60, CMC_flex: 0, CMC_opp: 40, MCP_flex: 0, IP: 40 },
  },
  closed: {
    index: { MCP: 90, PIP: 73, DIP: 10 },
    thumb: { CMC_abd: 65, CMC_flex: 0, CMC_opp: 70, MCP_flex: 0, IP: 40 },
  },
};

export const FUNC_KF = {
  open: {
    finger: { MCP: 10, PIP: 10, DIP: 0 },
    thumb: { CMC_abd: 35, CMC_flex: -8, CMC_opp: 10, MCP_flex: 8, IP: 0 },
    wrist: { flex: -10, dev: -2 },
  },
  mid: {
    finger: { MCP: 45, PIP: 35, DIP: 15 },
    thumb: { CMC_abd: 45, CMC_flex: -12, CMC_opp: 12, MCP_flex: 10, IP: 5 },
    wrist: { flex: -25, dev: -12 },
  },
  closed: {
    finger: { MCP: 80, PIP: 90, DIP: 60 },
    thumb: { CMC_abd: 35, CMC_flex: -20, CMC_opp: 70, MCP_flex: 0, IP: 40 },
    wrist: { flex: -35, dev: -15 },
  },
};

