import { applyGlobalGripToPose } from "../domain/pose";
import { buildProfile, makeDims } from "../utils/anthropometry/profile";
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

    const flexTarget = pinchPose.thumb.CMC_flexExt;
    const abdTarget = pinchPose.thumb.CMC_abdAdd;

    const flexSolve = buildCmcInputStateForAxis({
      axis: "CMC_flexExt",
      direction: flexTarget >= 0 ? "flexao" : "extensao",
      magnitudeDeg: Math.abs(flexTarget),
      thumbContext: pinchPose.thumb,
      prevState: state.cmcInput,
    });

    const abdSolve = buildCmcInputStateForAxis({
      axis: "CMC_abdAdd",
      direction: abdTarget >= 0 ? "abducao" : "aducao",
      magnitudeDeg: Math.abs(abdTarget),
      thumbContext: {
        ...pinchPose.thumb,
        CMC_flexExt: flexSolve.solved.commandDeg,
      },
      prevState: {
        ...state.cmcInput,
        CMC_flexExt: flexSolve.nextInputAxisState,
      },
    });

    expect(next.thumb.CMC_flexExt).toBe(flexSolve.solved.commandDeg);
    expect(next.thumb.CMC_abdAdd).toBe(abdSolve.solved.commandDeg);
    expect(next.cmcInput.CMC_flexExt.targetMeasuredDeg).toBeCloseTo(flexTarget, 6);
    expect(next.cmcInput.CMC_abdAdd.targetMeasuredDeg).toBeCloseTo(abdTarget, 6);
    expect(next.cmcInput.CMC_flexExt.direction).toBe(flexTarget >= 0 ? "flexao" : "extensao");
    expect(next.cmcInput.CMC_abdAdd.direction).toBe("aducao");
  });

  test("SET_THUMB_GONIOMETRY ignores Kapandji feedback values", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      kapandjiEstimatedFromRig: 4,
    };

    const next = __testables.poseReducer(state, {
      type: "SET_THUMB_GONIOMETRY",
      value: { CMC_flexExt: 12.5, CMC_abdAdd: -8.25, KAPANDJI_level: 9 },
    });

    expect(next.kapandjiEstimatedFromRig).toBe(4);
    expect(next.thumbMeasured.CMC_flexExt).toBeCloseTo(12.5, 6);
    expect(next.thumbMeasured.CMC_abdAdd).toBeCloseTo(-8.25, 6);
  });

  test("SET_OPPOSITION_ESTIMATE supports structured rig payload and legacy number", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      kapandjiEstimatedFromRig: 4,
      thumbOppRig: { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 23 },
    };

    const withObject = __testables.poseReducer(state, {
      type: "SET_OPPOSITION_ESTIMATE",
      value: { level: 7, rigDirection: "retroposicao", rigMagnitudeDeg: 48 },
    });

    expect(withObject.kapandjiEstimatedFromRig).toBe(7);
    expect(withObject.thumbOppRig).toEqual({ level: 7, rigDirection: "retroposicao", rigMagnitudeDeg: 48 });

    const withLegacyNumber = __testables.poseReducer(withObject, {
      type: "SET_OPPOSITION_ESTIMATE",
      value: 5,
    });

    expect(withLegacyNumber.kapandjiEstimatedFromRig).toBe(5);
    expect(withLegacyNumber.thumbOppRig).toEqual({ level: 5, rigDirection: null, rigMagnitudeDeg: null });
  });

  test("SET_OPPOSITION_ESTIMATE is ignored while exploration is active", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      isExplorationMode: true,
      kapandjiEstimatedFromRig: 4,
      thumbOppRig: { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 },
    };

    const next = __testables.poseReducer(state, {
      type: "SET_OPPOSITION_ESTIMATE",
      value: { level: 8, rigDirection: "oposicao", rigMagnitudeDeg: 55 },
    });

    expect(next).toBe(state);
  });

  test("SET_THUMB_GONIOMETRY returns same state when values are unchanged", () => {
    const state = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      thumbMeasured: { CMC_flexExt: 12.5, CMC_abdAdd: -8.25 },
      kapandjiEstimatedFromRig: 6,
    };

    const next = __testables.poseReducer(state, {
      type: "SET_THUMB_GONIOMETRY",
      value: { CMC_flexExt: 12.5, CMC_abdAdd: -8.25, KAPANDJI_level: 6 },
    });

    expect(next).toBe(state);
  });

  test("exploration lifecycle enters, overlays, restores and exits", () => {
    const base = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      thumb: { CMC_flexExt: 10, CMC_abdAdd: -8, CMC_opp: 12, MCP_flex: 4, IP: 2 },
      thumbOppRig: { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 },
      userEditedThumb: { CMC_flexExt: true, CMC_opp: true },
    };

    const entered = __testables.poseReducer(base, { type: "ENTER_OPPOSITION_EXPLORATION" });
    expect(entered.isExplorationMode).toBe(true);
    expect(entered.explorationSnapshotThumb).toEqual({ CMC_flexExt: 10, CMC_opp: 12 });
    expect(entered.explorationRigBaseline).toEqual({ level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 });

    const updated = __testables.poseReducer(entered, {
      type: "UPDATE_OPPOSITION_EXPLORATION",
      value: { kapandjiTarget: 20 },
    });
    expect(updated.isExplorationMode).toBe(true);
    expect(updated.exploreOverlayState.CMC_opp).toBe(58);
    expect(updated.explorationKapandjiTarget).toBe(10);

    const changedThumb = { ...updated, thumb: { ...updated.thumb, CMC_flexExt: 50, CMC_opp: -30 } };
    const restored = __testables.poseReducer(changedThumb, { type: "RESTORE_USER_INPUT_DATA" });
    expect(restored.thumb.CMC_flexExt).toBe(10);
    expect(restored.thumb.CMC_opp).toBe(12);
    expect(restored.isExplorationMode).toBe(false);
    expect(restored.explorationRigBaseline).toBeNull();

    const exited = __testables.poseReducer(updated, { type: "EXIT_OPPOSITION_EXPLORATION" });
    expect(exited.isExplorationMode).toBe(false);
    expect(exited.exploreOverlayState.CMC_opp).toBe(0);
    expect(exited.explorationKapandjiTarget).toBe(base.kapandjiEstimatedFromRig);
    expect(exited.explorationRigBaseline).toBeNull();
  });

  test("presets reset exploration and user-edit buffers", () => {
    const dims = makeDims(buildProfile("masculino", 50, 25));
    const base = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      isExplorationMode: true,
      exploreOverlayState: { CMC_flexExt: 2, CMC_abdAdd: 1, CMC_opp: 5, MCP_flex: 0, IP: 0 },
      explorationKapandjiTarget: 9,
      explorationRigBaseline: { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 },
      userEditedThumb: { CMC_flexExt: true },
      explorationSnapshotThumb: { CMC_flexExt: 20 },
    };

    const neutral = __testables.poseReducer(base, {
      type: "APPLY_PRESET_NEUTRAL",
      dims,
    });
    expect(neutral.activePreset).toBe("neutro");
    expect(neutral.isExplorationMode).toBe(false);
    expect(neutral.userEditedThumb).toEqual({});
    expect(neutral.explorationSnapshotThumb).toEqual({});
    expect(neutral.explorationRigBaseline).toBeNull();

    const zero = __testables.poseReducer(base, { type: "APPLY_PRESET_ZERO" });
    expect(zero.activePreset).toBe("zero");
    expect(zero.isExplorationMode).toBe(false);
    expect(zero.userEditedThumb).toEqual({});
    expect(zero.explorationSnapshotThumb).toEqual({});
    expect(zero.explorationRigBaseline).toBeNull();
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
