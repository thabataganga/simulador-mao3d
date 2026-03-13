import { readQaThumbParams } from "./qaThumbParams";

describe("readQaThumbParams", () => {
  test("returns null when qaThumb flag is absent", () => {
    expect(readQaThumbParams("?cmc_abd=10")).toBeNull();
  });

  test("parses thumb params and prefers kapandji over cmc_opp", () => {
    expect(readQaThumbParams("?qaThumb=1&kapandji=7&cmc_opp=40&cmc_abd=12&mcp_flex=18")).toEqual({
      thumbValues: {
        CMC_opp: 7,
        CMC_abd: 12,
        MCP_flex: 18,
      },
      activePreset: "none",
      openPanel: "thumb",
    });
  });

  test("ignores non-finite values", () => {
    expect(readQaThumbParams("?qaThumb=1&cmc_abd=foo&ip=15")).toEqual({
      thumbValues: {
        IP: 15,
      },
      activePreset: "none",
      openPanel: "thumb",
    });
  });
});
