import { useEffect } from "react";

const THUMB_QUERY_MAP = {
  CMC_abd: "cmc_abd",
  CMC_flex: "cmc_flex",
  CMC_opp: "cmc_opp",
  MCP_flex: "mcp_flex",
  IP: "ip",
};

/**
 * Applies QA URL parameters to the pose when ?qaThumb=1 is present.
 * Supported params: kapandji, cmc_abd, cmc_flex, cmc_opp, mcp_flex, ip
 */
export function useQaParams({ setThumbVal, setActivePreset, setOpenPanel }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("qaThumb") !== "1") return;

    const kapandjiRaw = params.get("kapandji");
    if (kapandjiRaw != null) {
      const kapandjiValue = Number(kapandjiRaw);
      if (Number.isFinite(kapandjiValue)) setThumbVal("CMC_opp", kapandjiValue);
    }

    Object.entries(THUMB_QUERY_MAP).forEach(([key, queryKey]) => {
      const raw = params.get(queryKey);
      if (raw == null) return;
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      if (key === "CMC_opp" && kapandjiRaw != null) return;
      setThumbVal(key, value);
    });

    setActivePreset("none");
    setOpenPanel("thumb");
  }, [setThumbVal, setActivePreset, setOpenPanel]);
}
