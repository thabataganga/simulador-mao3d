import { selectThumbClinical } from "./selectors";

describe("handPose selectors opposition clinical estimate", () => {
  test("recomputes clinical opposition when flex/abd change with fixed CMC_opp", () => {
    const baseThumb = { CMC_opp: 16, CMC_flex: 0, CMC_abd: 0, MCP_flex: 0, IP: 0 };
    const variedThumb = { ...baseThumb, CMC_flex: 20, CMC_abd: 30 };

    const baseClinical = selectThumbClinical(baseThumb, 4, {
      level: 4,
      rigDirection: "oposicao",
      rigMagnitudeDeg: 16,
    });
    const variedClinical = selectThumbClinical(variedThumb, 4, {
      level: 4,
      rigDirection: "oposicao",
      rigMagnitudeDeg: 16,
    });

    expect(baseClinical.opp.rigMeasurement.rigMagnitudeDeg).toBe(16);
    expect(variedClinical.opp.rigMeasurement.rigMagnitudeDeg).toBe(16);
    expect(variedClinical.opp.clinicalEstimate.clinicalOppositionDeg).not.toBe(
      baseClinical.opp.clinicalEstimate.clinicalOppositionDeg,
    );
  });
});
