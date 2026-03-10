import { selectThumbClinical } from "./selectors";

describe("handPose selectors opposition clinical estimate", () => {
  test("recomputes clinical opposition when flex/abd change with fixed CMC_opp", () => {
    const baseThumb = { CMC_opp: 16, CMC_abdAdd: 0, CMC_flexExt: 0, MCP_flex: 0, IP: 0 };
    const variedThumb = { ...baseThumb, CMC_abdAdd: 20, CMC_flexExt: 30 };

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

  test("keeps rig real frozen and computes simulated measurement in exploration", () => {
    const thumb = { CMC_opp: 12, CMC_abdAdd: -12, CMC_flexExt: 45, MCP_flex: 0, IP: 0 };

    const clinical = selectThumbClinical(
      thumb,
      4,
      { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 },
      {
        isExplorationMode: true,
        explorationKapandjiTarget: 6,
        explorationRigBaseline: { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 },
      },
    );

    expect(clinical.opp.rigMeasurement.rigMagnitudeDeg).toBe(16);
    expect(clinical.opp.explorationMeasurement.rigMagnitudeDeg).toBe(34);
    expect(clinical.opp.explorationMeasurement.rigDirection).toBe("oposicao");
  });
});
