import {
  buildCmcInputStateForAxis,
  buildThumbCmcClinicalModel,
  createDefaultCmcInputState,
  measureThumbCmcGoniometryFromRig,
  solveCmcCommandForMeasuredTarget,
  syncCmcInputStateFromThumb,
} from "./thumbGoniometry";

function makeRig({ flexExtDeg = 0, abdAddDeg = 0 } = {}) {
  return {
    thumb: {
      cmcFlexExt: { rotation: { z: (flexExtDeg * Math.PI) / 180 } },
      cmcAbdAdd: { rotation: { y: (abdAddDeg * Math.PI) / 180 } },
    },
  };
}

describe("thumb goniometry", () => {
  test("builds clinical model with persisted input direction", () => {
    const model = buildThumbCmcClinicalModel({
      thumb: { CMC_flexExt: 0, CMC_abdAdd: 0 },
      measured: { CMC_flexExt: 12, CMC_abdAdd: -6 },
      inputState: {
        CMC_flexExt: { direction: "extensao", magnitudeDeg: 0, targetMeasuredDeg: 0, saturated: false },
        CMC_abdAdd: { direction: "abducao", magnitudeDeg: 13, targetMeasuredDeg: 13, saturated: false },
      },
    });

    expect(model.flexExt.inputDirection).toBe("extensao");
    expect(model.flexExt.magnitudeDeg).toBe(0);
    expect(model.flexExt.clinicalTargetDeg).toBe(0);
    expect(model.flexExt.rigMeasuredDeg).toBe(0);
    expect(model.abdAdd.inputMagnitudeDeg).toBe(13);
    expect(model.abdAdd.direction).toBe("aducao");
  });

  test("keeps selected direction when thumb command is zero", () => {
    const prev = createDefaultCmcInputState();
    prev.CMC_flexExt.direction = "extensao";

    const next = syncCmcInputStateFromThumb(prev, {
      CMC_flexExt: 0,
      CMC_abdAdd: 0,
    });

    expect(next.CMC_flexExt.direction).toBe("extensao");
    expect(next.CMC_flexExt.magnitudeDeg).toBe(0);
  });

  test("returns isolated and composed measurements", () => {
    const measured = measureThumbCmcGoniometryFromRig(makeRig({ flexExtDeg: 10, abdAddDeg: -8 }), {
      thumb: { CMC_opp: 34 },
      baseline: { CMC_flexExt: 0, CMC_abdAdd: 0 },
    });

    expect(measured.composed.CMC_flexExt).toBe(10);
    expect(measured.composed.CMC_abdAdd).toBe(-8);
    expect(typeof measured.isolated.CMC_flexExt).toBe("number");
    expect(typeof measured.isolated.CMC_abdAdd).toBe("number");
  });

  test("exposes clinical target and rig measured fields", () => {
    const model = buildThumbCmcClinicalModel({
      thumb: { CMC_flexExt: 12, CMC_abdAdd: -9 },
      measured: { isolated: { CMC_flexExt: 15, CMC_abdAdd: -7 } },
      inputState: {
        CMC_flexExt: { direction: "flexao", magnitudeDeg: 12, targetMeasuredDeg: 12, saturated: false },
        CMC_abdAdd: { direction: "aducao", magnitudeDeg: 9, targetMeasuredDeg: -9, saturated: false },
      },
    });

    expect(model.flexExt.clinicalTargetDeg).toBe(12);
    expect(model.flexExt.rigMeasuredDeg).toBe(15);
    expect(model.abdAdd.clinicalTargetDeg).toBe(-9);
    expect(model.abdAdd.rigMeasuredDeg).toBe(-7);
  });

  test("applies baseline calibration", () => {
    const measured = measureThumbCmcGoniometryFromRig(makeRig({ flexExtDeg: 6, abdAddDeg: -4 }), {
      baseline: { CMC_flexExt: 6, CMC_abdAdd: -4 },
    });

    expect(measured.CMC_flexExt).toBe(0);
    expect(measured.CMC_abdAdd).toBe(0);
  });

  test("solves command close to requested measured target", () => {
    const solved = solveCmcCommandForMeasuredTarget("CMC_abdAdd", 13, {
      CMC_flexExt: 0,
      CMC_abdAdd: 0,
      CMC_opp: 12,
    });

    expect(solved.commandDeg).toBeGreaterThanOrEqual(-106);
    expect(solved.commandDeg).toBeLessThanOrEqual(39);
    expect(Math.abs(solved.predictedMeasuredDeg - 13)).toBeLessThanOrEqual(1);
  });

  test("buildCmcInputStateForAxis converts direction+magnitude to signed target", () => {
    const prevState = createDefaultCmcInputState();
    const { nextInputAxisState, solved } = buildCmcInputStateForAxis({
      axis: "CMC_flexExt",
      direction: "flexao",
      magnitudeDeg: 7,
      thumbContext: {
        CMC_flexExt: 0,
        CMC_abdAdd: 0,
        CMC_opp: 0,
      },
      prevState,
    });

    expect(nextInputAxisState.direction).toBe("flexao");
    expect(nextInputAxisState.magnitudeDeg).toBe(7);
    expect(nextInputAxisState.targetMeasuredDeg).toBe(7);
    expect(typeof solved.commandDeg).toBe("number");
  });

  test("clamps CMC adduction target to axis limit under opposition coupling", () => {
    const prevState = createDefaultCmcInputState();
    const thumbContext = { CMC_flexExt: 0, CMC_abdAdd: 0, CMC_opp: 34 };

    const { nextInputAxisState, solved } = buildCmcInputStateForAxis({
      axis: "CMC_abdAdd",
      direction: "aducao",
      magnitudeDeg: 90,
      thumbContext,
      prevState,
    });

    expect(nextInputAxisState.targetMeasuredDeg).toBe(-70);
    expect(nextInputAxisState.saturated).toBe(false);
    expect(Math.abs(solved.predictedMeasuredDeg + 70)).toBeLessThanOrEqual(1);
  });

  test("keeps CMC flexion target 90 reachable under opposition coupling", () => {
    const solved = solveCmcCommandForMeasuredTarget("CMC_flexExt", 90, {
      CMC_flexExt: 0,
      CMC_abdAdd: 0,
      CMC_opp: 34,
    });

    expect(Math.abs(solved.predictedMeasuredDeg - 90)).toBeLessThanOrEqual(1);
    expect(solved.saturated).toBe(false);
  });
});