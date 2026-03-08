import { applyGlobalGripToPose } from "../domain/pose";
import { buildCmcInputStateForAxis, createDefaultCmcInputState } from "../domain/thumb";
import { __testables } from "./useHandPose";

describe("useHandPose reducer", () => {
  test("APPLY_GRIP in pinch mode resolves CMC via clinical solver", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      globalMode: "pinch",
      grip: 0,
      cmcInput: createDefaultCmcInputState(),
    };

    const next = __testables.poseReducer(state, {
      type: "APPLY_GRIP",
      grip: 50,
      modeOverride: "pinch",
    });

    const pinchPose = applyGlobalGripToPose(
      {
        fingers: state.fingers,
        thumb: state.thumb,
        wrist: state.wrist,
        globalMode: "pinch",
      },
      50,
      "pinch",
    );

    const flexTarget = pinchPose.thumb.CMC_flex;
    const abdTarget = pinchPose.thumb.CMC_abd;

    const flexSolve = buildCmcInputStateForAxis({
      axis: "CMC_flex",
      direction: flexTarget >= 0 ? "flexao" : "extensao",
      magnitudeDeg: Math.abs(flexTarget),
      thumbContext: pinchPose.thumb,
      prevState: state.cmcInput,
    });

    const abdSolve = buildCmcInputStateForAxis({
      axis: "CMC_abd",
      direction: abdTarget >= 0 ? "abducao" : "aducao",
      magnitudeDeg: Math.abs(abdTarget),
      thumbContext: {
        ...pinchPose.thumb,
        CMC_flex: flexSolve.solved.commandDeg,
      },
      prevState: {
        ...state.cmcInput,
        CMC_flex: flexSolve.nextInputAxisState,
      },
    });

    expect(next.thumb.CMC_flex).toBe(flexSolve.solved.commandDeg);
    expect(next.thumb.CMC_abd).toBe(abdSolve.solved.commandDeg);
    expect(next.cmcInput.CMC_flex.targetMeasuredDeg).toBeCloseTo(flexTarget, 6);
    expect(next.cmcInput.CMC_abd.targetMeasuredDeg).toBeCloseTo(abdTarget, 6);
    expect(next.cmcInput.CMC_flex.direction).toBe("extensao");
    expect(next.cmcInput.CMC_abd.direction).toBe("abducao");
  });

  test("SET_THUMB_OPP_INPUT updates only CMC opposition command", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
    };

    const next = __testables.poseReducer(state, {
      type: "SET_THUMB_OPP_INPUT",
      value: { axis: "CMC_opp", direction: "oposicao", magnitudeDeg: 23 },
    });

    expect(next.thumb.CMC_opp).toBe(23);
    expect(next.thumb.CMC_flex).toBe(state.thumb.CMC_flex);
    expect(next.thumb.CMC_abd).toBe(state.thumb.CMC_abd);
    expect(next.thumb.MCP_flex).toBe(state.thumb.MCP_flex);
    expect(next.thumb.IP).toBe(state.thumb.IP);
  });

  test("SET_THUMB_GONIOMETRY ignores Kapandji feedback values", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      kapandjiEstimatedLevel: 4,
    };

    const next = __testables.poseReducer(state, {
      type: "SET_THUMB_GONIOMETRY",
      value: { CMC_abd: 12.5, CMC_flex: -8.25, KAPANDJI_level: 9 },
    });

    expect(next.kapandjiEstimatedLevel).toBe(4);
    expect(next.thumbMeasured.CMC_abd).toBeCloseTo(12.5, 6);
    expect(next.thumbMeasured.CMC_flex).toBeCloseTo(-8.25, 6);
  });

  test("SET_THUMB_GONIOMETRY returns same state when values are unchanged", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      thumbMeasured: { CMC_abd: 12.5, CMC_flex: -8.25 },
      kapandjiEstimatedLevel: 6,
    };

    const next = __testables.poseReducer(state, {
      type: "SET_THUMB_GONIOMETRY",
      value: { CMC_abd: 12.5, CMC_flex: -8.25, KAPANDJI_level: 6 },
    });

    expect(next).toBe(state);
  });
});
