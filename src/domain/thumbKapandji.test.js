import {
  buildClinicalOppositionEstimate,
  buildThumbOppositionClinicalModel,
  clampKapandjiLevel,
  getKapandjiLevelFromCommand,
  resolveKapandjiOperationalPose,
} from "./thumbKapandji";

describe("thumb Kapandji clinical model", () => {
  test("clamps Kapandji level to ordinal clinical range", () => {
    expect(clampKapandjiLevel(-99)).toBe(0);
    expect(clampKapandjiLevel(99)).toBe(10);
    expect(clampKapandjiLevel(4.6)).toBe(5);
  });

  test("resolves operational CMC opposition command for a Kapandji level", () => {
    const resolved = resolveKapandjiOperationalPose(6);
    expect(resolved).toEqual({ level: 6, commandDeg: 34 });
  });

  test("derives nearest Kapandji level from operational command", () => {
    expect(getKapandjiLevelFromCommand(56)).toBe(8);
    expect(getKapandjiLevelFromCommand(-18)).toBe(0);
  });

  test("clinical opposition estimate reacts to flex/ext and abd/add", () => {
    const neutral = buildClinicalOppositionEstimate({ CMC_opp: 16, CMC_flex: 0, CMC_abd: 0 });
    const coupled = buildClinicalOppositionEstimate({ CMC_opp: 16, CMC_flex: 20, CMC_abd: 40 });

    expect(coupled.clinicalOppositionDeg).not.toBe(neutral.clinicalOppositionDeg);
    expect(coupled.clinicalMagnitude).toBeGreaterThan(neutral.clinicalMagnitude);
  });

  test("builds clinical opposition model with separate clinical and rig blocks", () => {
    const model = buildThumbOppositionClinicalModel({
      thumb: { CMC_opp: 45, CMC_flex: 10, CMC_abd: 20 },
      kapandjiLevel: 7,
      context: {
        rigMeasurement: {
          level: 8,
          rigDirection: "retroposicao",
          rigMagnitudeDeg: 56,
        },
      },
    });

    expect(model.clinicalEstimate).toBeDefined();
    expect(model.rigMeasurement).toBeDefined();
    expect(model.clinicalEstimate.scaleLabel).toBe(model.scaleLabel);
    expect(model.rigMeasurement.scaleLabel).toBe("Kapandji 8");
    expect(model.rigDirection).toBe("retroposicao");
    expect(model.rigMagnitudeDeg).toBe(56);
    expect(model.functionalSummary).toBe("pinca funcional para objetos pequenos");
  });

  test("includes exploration measurement when provided", () => {
    const model = buildThumbOppositionClinicalModel({
      thumb: { CMC_opp: 12, CMC_flex: -12, CMC_abd: 45 },
      kapandjiLevel: 4,
      context: {
        rigMeasurement: {
          level: 4,
          rigDirection: "oposicao",
          rigMagnitudeDeg: 16,
        },
        explorationMeasurement: {
          level: 6,
        },
      },
    });

    expect(model.rigMeasurement.rigMagnitudeDeg).toBe(16);
    expect(model.explorationMeasurement).toEqual({
      level: 6,
      rigDirection: "oposicao",
      rigMagnitudeDeg: 34,
      rigMeasuredDeg: 34,
      scaleLabel: "Kapandji 6",
    });
  });
});
