import {
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

  test("builds clinical opposition model without claiming angular equivalence", () => {
    const model = buildThumbOppositionClinicalModel({
      thumb: { CMC_opp: 45 },
      kapandjiLevel: 7,
    });

    expect(model.level).toBe(7);
    expect(model.commandDeg).toBe(45);
    expect(model.operationalCommandDeg).toBe(45);
    expect(model.description).toContain("Kapandji 7");
    expect(model.targetId).toBe("kapandji-7");
  });

  test("prefers rig measurement fields when provided in context", () => {
    const model = buildThumbOppositionClinicalModel({
      thumb: { CMC_opp: 12 },
      kapandjiLevel: 3,
      context: {
        rigMeasurement: {
          level: 8,
          rigDirection: "retroposicao",
          rigMagnitudeDeg: 56,
        },
      },
    });

    expect(model.estimatedLevel).toBe(8);
    expect(model.scaleLabel).toBe("Kapandji 8");
    expect(model.rigDirection).toBe("retroposicao");
    expect(model.rigMagnitudeDeg).toBe(56);
    expect(model.rigMeasuredDeg).toBe(-56);
  });
});
