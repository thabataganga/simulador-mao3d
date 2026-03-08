import { applyGlobalGripToPose } from "../domain/pose";
import {
  buildCmcInputStateForAxis,
  createDefaultCmcInputState,
  getKapandjiLevelFromCommand,
  resolveKapandjiOperationalPose,
} from "../domain/thumb";
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
    expect(next.kapandjiLevel).toBe(getKapandjiLevelFromCommand(next.thumb.CMC_opp));
  });

  test("SET_THUMB_KAPANDJI updates only the operational CMC opposition command", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
    };

    const next = __testables.poseReducer(state, {
      type: "SET_THUMB_KAPANDJI",
      value: 8,
    });

    const resolved = resolveKapandjiOperationalPose(8);
    expect(next.kapandjiLevel).toBe(8);
    expect(next.thumb.CMC_opp).toBe(resolved.commandDeg);
    expect(next.thumb.CMC_flex).toBe(state.thumb.CMC_flex);
    expect(next.thumb.CMC_abd).toBe(state.thumb.CMC_abd);
    expect(next.thumb.MCP_flex).toBe(state.thumb.MCP_flex);
    expect(next.thumb.IP).toBe(state.thumb.IP);
  });
});
