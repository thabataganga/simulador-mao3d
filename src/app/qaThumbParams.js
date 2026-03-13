const QA_THUMB_PARAM_MAP = {
  CMC_abd: "cmc_abd",
  CMC_flex: "cmc_flex",
  CMC_opp: "cmc_opp",
  MCP_flex: "mcp_flex",
  IP: "ip",
};

function parseFiniteParam(params, key) {
  const raw = params.get(key);
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function readQaThumbParams(search) {
  const params = new URLSearchParams(search);
  if (params.get("qaThumb") !== "1") return null;

  const thumbValues = {};
  const kapandji = parseFiniteParam(params, "kapandji");
  if (kapandji != null) thumbValues.CMC_opp = kapandji;

  Object.entries(QA_THUMB_PARAM_MAP).forEach(([key, queryKey]) => {
    if (key === "CMC_opp" && kapandji != null) return;
    const value = parseFiniteParam(params, queryKey);
    if (value != null) thumbValues[key] = value;
  });

  return {
    thumbValues,
    activePreset: "none",
    openPanel: "thumb",
  };
}
