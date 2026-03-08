import { applyGlobalGripToPose } from "../domain/pose";
import { buildProfile, makeDims } from "../utils";
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
      kapandjiEstimatedFromRig: 4,
    };

    const next = __testables.poseReducer(state, {
      type: "SET_THUMB_GONIOMETRY",
      value: { CMC_abd: 12.5, CMC_flex: -8.25, KAPANDJI_level: 9 },
    });

    expect(next.kapandjiEstimatedFromRig).toBe(4);
    expect(next.thumbMeasured.CMC_abd).toBeCloseTo(12.5, 6);
    expect(next.thumbMeasured.CMC_flex).toBeCloseTo(-8.25, 6);
  });

  test("SET_THUMB_GONIOMETRY returns same state when values are unchanged", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      thumbMeasured: { CMC_abd: 12.5, CMC_flex: -8.25 },
      kapandjiEstimatedFromRig: 6,
    };

    const next = __testables.poseReducer(state, {
      type: "SET_THUMB_GONIOMETRY",
      value: { CMC_abd: 12.5, CMC_flex: -8.25, KAPANDJI_level: 6 },
    });

    expect(next).toBe(state);
  });

  test("exploration lifecycle enters, overlays, restores and exits", () => {
    const base = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      thumb: { CMC_abd: 10, CMC_flex: -8, CMC_opp: 12, MCP_flex: 4, IP: 2 },
      userEditedThumb: { CMC_abd: true, CMC_opp: true },
    };

    const entered = __testables.poseReducer(base, { type: "ENTER_OPPOSITION_EXPLORATION" });
    expect(entered.isExplorationMode).toBe(true);
    expect(entered.explorationSnapshotThumb).toEqual({ CMC_abd: 10, CMC_opp: 12 });

    const updated = __testables.poseReducer(entered, {
      type: "UPDATE_OPPOSITION_EXPLORATION",
      value: { intensity: 20 },
    });
    expect(updated.isExplorationMode).toBe(true);
    expect(updated.exploreOverlayState.CMC_opp).toBe(20);
    expect(updated.explorationOppositionIntensity).toBe(20);

    const changedThumb = { ...updated, thumb: { ...updated.thumb, CMC_abd: 50, CMC_opp: -30 } };
    const restored = __testables.poseReducer(changedThumb, { type: "RESTORE_USER_INPUT_DATA" });
    expect(restored.thumb.CMC_abd).toBe(10);
    expect(restored.thumb.CMC_opp).toBe(12);
    expect(restored.isExplorationMode).toBe(false);

    const exited = __testables.poseReducer(updated, { type: "EXIT_OPPOSITION_EXPLORATION" });
    expect(exited.isExplorationMode).toBe(false);
    expect(exited.exploreOverlayState.CMC_opp).toBe(0);
    expect(exited.explorationOppositionIntensity).toBe(0);
  });

  test("presets reset exploration and user-edit buffers", () => {
    const dims = makeDims(buildProfile("masculino", 50, 25));
    const base = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      isExplorationMode: true,
      exploreOverlayState: { CMC_abd: 2, CMC_flex: 1, CMC_opp: 5, MCP_flex: 0, IP: 0 },
      explorationOppositionIntensity: 30,
      userEditedThumb: { CMC_abd: true },
      explorationSnapshotThumb: { CMC_abd: 20 },
    };

    const neutral = __testables.poseReducer(base, {
      type: "APPLY_PRESET_NEUTRAL",
      dims,
    });
    expect(neutral.activePreset).toBe("neutro");
    expect(neutral.isExplorationMode).toBe(false);
    expect(neutral.userEditedThumb).toEqual({});
    expect(neutral.explorationSnapshotThumb).toEqual({});

    const zero = __testables.poseReducer(base, { type: "APPLY_PRESET_ZERO" });
    expect(zero.activePreset).toBe("zero");
    expect(zero.isExplorationMode).toBe(false);
    expect(zero.userEditedThumb).toEqual({});
    expect(zero.explorationSnapshotThumb).toEqual({});
  });

  test("SET_ANTHROPOMETRY updates partial fields only", () => {
    const base = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
    };

    const next = __testables.poseReducer(base, {
      type: "SET_ANTHROPOMETRY",
      value: { percentile: 95 },
    });
    expect(next.anthropometry).toEqual({ sex: "masculino", percentile: 95, age: 25 });
  });
});
