import {
  buildCmcInputStateForAxis,
  buildThumbCmcClinicalModel,
  createDefaultCmcInputState,
  measureThumbCmcGoniometryFromRig,
  solveCmcCommandForMeasuredTarget,
  syncCmcInputStateFromThumb,
} from "./thumbGoniometry";

function makeRig({ abdDeg = 0, flexDeg = 0 } = {}) {
  return {
    thumb: {
      cmcAbd: { rotation: { z: (abdDeg * Math.PI) / 180 } },
      cmcFlex: { rotation: { y: (flexDeg * Math.PI) / 180 } },
    },
  };
}

describe("thumb goniometry", () => {
  test("builds clinical model with persisted input direction", () => {
    const model = buildThumbCmcClinicalModel({
      thumb: { CMC_abd: 0, CMC_flex: 0 },
      measured: { CMC_abd: 12, CMC_flex: -6 },
      inputState: {
        CMC_abd: { direction: "aducao", magnitudeDeg: 0, targetMeasuredDeg: 0, saturated: false },
        CMC_flex: { direction: "flexao", magnitudeDeg: 13, targetMeasuredDeg: 13, saturated: false },
      },
    });

    expect(model.abd.inputDirection).toBe("aducao");
    expect(model.abd.magnitudeDeg).toBe(0);
    expect(model.abd.clinicalTargetDeg).toBe(0);
    expect(model.abd.rigMeasuredDeg).toBe(0);
    expect(model.flex.inputMagnitudeDeg).toBe(13);
    expect(model.flex.direction).toBe("extensao");
  });

  test("keeps selected direction when thumb command is zero", () => {
    const prev = createDefaultCmcInputState();
    prev.CMC_abd.direction = "aducao";

    const next = syncCmcInputStateFromThumb(prev, {
      CMC_abd: 0,
      CMC_flex: 0,
    });

    expect(next.CMC_abd.direction).toBe("aducao");
    expect(next.CMC_abd.magnitudeDeg).toBe(0);
  });

  test("returns isolated and composed measurements", () => {
    const measured = measureThumbCmcGoniometryFromRig(makeRig({ abdDeg: 10, flexDeg: -8 }), {
      thumb: { CMC_opp: 34 },
      baseline: { CMC_abd: 0, CMC_flex: 0 },
    });

    expect(measured.composed.CMC_abd).toBe(10);
    expect(measured.composed.CMC_flex).toBe(-8);
    expect(typeof measured.isolated.CMC_abd).toBe("number");
    expect(typeof measured.isolated.CMC_flex).toBe("number");
  });

  test("exposes clinical target and rig measured fields", () => {
    const model = buildThumbCmcClinicalModel({
      thumb: { CMC_abd: 12, CMC_flex: -9 },
      measured: { isolated: { CMC_abd: 15, CMC_flex: -7 } },
      inputState: {
        CMC_abd: { direction: "abducao", magnitudeDeg: 12, targetMeasuredDeg: 12, saturated: false },
        CMC_flex: { direction: "extensao", magnitudeDeg: 9, targetMeasuredDeg: -9, saturated: false },
      },
    });

    expect(model.abd.clinicalTargetDeg).toBe(12);
    expect(model.abd.rigMeasuredDeg).toBe(15);
    expect(model.flex.clinicalTargetDeg).toBe(-9);
    expect(model.flex.rigMeasuredDeg).toBe(-7);
  });

  test("applies baseline calibration", () => {
    const measured = measureThumbCmcGoniometryFromRig(makeRig({ abdDeg: 6, flexDeg: -4 }), {
      baseline: { CMC_abd: 6, CMC_flex: -4 },
    });

    expect(measured.CMC_abd).toBe(0);
    expect(measured.CMC_flex).toBe(0);
  });

  test("solves command close to requested measured target", () => {
    const solved = solveCmcCommandForMeasuredTarget("CMC_flex", 13, {
      CMC_abd: 0,
      CMC_flex: 0,
      CMC_opp: 12,
    });

    expect(solved.commandDeg).toBeGreaterThanOrEqual(-106);
    expect(solved.commandDeg).toBeLessThanOrEqual(39);
    expect(Math.abs(solved.predictedMeasuredDeg - 13)).toBeLessThanOrEqual(1);
  });

  test("buildCmcInputStateForAxis converts direction+magnitude to signed target", () => {
    const prevState = createDefaultCmcInputState();
    const { nextInputAxisState, solved } = buildCmcInputStateForAxis({
      axis: "CMC_abd",
      direction: "aducao",
      magnitudeDeg: 7,
      thumbContext: {
        CMC_abd: 0,
        CMC_flex: 0,
        CMC_opp: 0,
      },
      prevState,
    });

    expect(nextInputAxisState.direction).toBe("aducao");
    expect(nextInputAxisState.magnitudeDeg).toBe(7);
    expect(nextInputAxisState.targetMeasuredDeg).toBe(-7);
    expect(typeof solved.commandDeg).toBe("number");
  });

  test("reaches CMC flex extension 90 with opposition coupling without saturation", () => {
    const prevState = createDefaultCmcInputState();
    const thumbContext = { CMC_abd: 0, CMC_flex: 0, CMC_opp: 34 };

    const { nextInputAxisState, solved } = buildCmcInputStateForAxis({
      axis: "CMC_flex",
      direction: "extensao",
      magnitudeDeg: 90,
      thumbContext,
      prevState,
    });

    expect(nextInputAxisState.targetMeasuredDeg).toBe(-90);
    expect(nextInputAxisState.saturated).toBe(false);
    expect(Math.abs(solved.predictedMeasuredDeg + 90)).toBeLessThanOrEqual(1);
  });

  test("keeps CMC abduction target 90 reachable under opposition coupling", () => {
    const solved = solveCmcCommandForMeasuredTarget("CMC_abd", 90, {
      CMC_abd: 0,
      CMC_flex: 0,
      CMC_opp: 34,
    });

    expect(Math.abs(solved.predictedMeasuredDeg - 90)).toBeLessThanOrEqual(1);
    expect(solved.saturated).toBe(false);
  });
});
