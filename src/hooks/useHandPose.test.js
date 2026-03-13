import { applyGlobalGripToPose, createNeutralPose } from "../domain/pose";
import { buildProfile, makeDims } from "../utils/anthropometry/profile";
import { buildCmcInputStateForAxis, createDefaultCmcInputState } from "../domain/thumb";
import { createPoseActions } from "./handPose/actions";
import { createExplorationState } from "./handPose/explorationState";
import { __testables } from "./useHandPose";

function withExploration(state, exploration = {}) {
  return {
    ...state,
    exploration: createExplorationState({
      ...state.exploration,
      ...exploration,
    }),
  };
}

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
    const state = withExploration(
      {
        ...__testables.createInitialState(),
        anthropometry: { sex: "masculino", percentile: 50, age: 25 },
        kapandjiEstimatedFromRig: 4,
        thumbOppRig: { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 },
      },
      { isActive: true },
    );

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
    const base = withExploration(
      {
        ...__testables.createInitialState(),
        anthropometry: { sex: "masculino", percentile: 50, age: 25 },
        thumb: { CMC_abd: 10, CMC_flex: -8, CMC_opp: 12, MCP_flex: 4, IP: 2 },
        thumbOppRig: { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 },
      },
      { userEditedThumb: { CMC_abd: true, CMC_opp: true } },
    );

    const entered = __testables.poseReducer(base, { type: "ENTER_OPPOSITION_EXPLORATION" });
    expect(entered.exploration.isActive).toBe(true);
    expect(entered.exploration.snapshotThumb).toEqual({ CMC_abd: 10, CMC_opp: 12 });
    expect(entered.exploration.rigBaseline).toEqual({ level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 });

    const updated = __testables.poseReducer(entered, {
      type: "UPDATE_OPPOSITION_EXPLORATION",
      value: { kapandjiTarget: 20 },
    });
    expect(updated.exploration.isActive).toBe(true);
    expect(updated.exploration.overlay.CMC_opp).toBe(58);
    expect(updated.exploration.kapandjiTarget).toBe(10);

    const changedThumb = { ...updated, thumb: { ...updated.thumb, CMC_abd: 50, CMC_opp: -30 } };
    const restored = __testables.poseReducer(changedThumb, { type: "RESTORE_USER_INPUT_DATA" });
    expect(restored.thumb.CMC_abd).toBe(10);
    expect(restored.thumb.CMC_opp).toBe(12);
    expect(restored.exploration.isActive).toBe(false);
    expect(restored.exploration.rigBaseline).toBeNull();

    const exited = __testables.poseReducer(updated, { type: "EXIT_OPPOSITION_EXPLORATION" });
    expect(exited.exploration.isActive).toBe(false);
    expect(exited.exploration.overlay.CMC_opp).toBe(0);
    expect(exited.exploration.kapandjiTarget).toBe(base.kapandjiEstimatedFromRig);
    expect(exited.exploration.rigBaseline).toBeNull();
  });

  test("presets reset exploration and user-edit buffers", () => {
    const dims = makeDims(buildProfile("masculino", 50, 25));
    const base = withExploration(
      {
        ...__testables.createInitialState(),
        anthropometry: { sex: "masculino", percentile: 50, age: 25 },
      },
      {
        isActive: true,
        overlay: { CMC_abd: 2, CMC_flex: 1, CMC_opp: 5, MCP_flex: 0, IP: 0 },
        kapandjiTarget: 9,
        rigBaseline: { level: 4, rigDirection: "oposicao", rigMagnitudeDeg: 16 },
        userEditedThumb: { CMC_abd: true },
        snapshotThumb: { CMC_abd: 20 },
      },
    );

    const neutral = __testables.poseReducer(base, {
      type: "APPLY_PRESET_NEUTRAL",
      dims,
    });
    expect(neutral.activePreset).toBe("neutro");
    expect(neutral.exploration.isActive).toBe(false);
    expect(neutral.exploration.userEditedThumb).toEqual({});
    expect(neutral.exploration.snapshotThumb).toEqual({});
    expect(neutral.exploration.rigBaseline).toBeNull();
    expect(neutral.thumb.CMC_opp).toBe(createNeutralPose(dims).thumb.CMC_opp);

    const zero = __testables.poseReducer(base, { type: "APPLY_PRESET_ZERO" });
    expect(zero.activePreset).toBe("zero");
    expect(zero.exploration.isActive).toBe(false);
    expect(zero.exploration.userEditedThumb).toEqual({});
    expect(zero.exploration.snapshotThumb).toEqual({});
    expect(zero.exploration.rigBaseline).toBeNull();
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

describe("anthropometry validation guards", () => {
  test("SET_ANTHROPOMETRY ignores missing or invalid values", () => {
    const base = {
      ...__testables.createInitialState(),
      anthropometry: { sex: "masculino", percentile: 50, age: 25 },
    };

    const missingValue = __testables.poseReducer(base, { type: "SET_ANTHROPOMETRY" });
    expect(missingValue.anthropometry).toEqual(base.anthropometry);

    const invalidValue = __testables.poseReducer(base, {
      type: "SET_ANTHROPOMETRY",
      value: { sex: "outro", percentile: 42, age: NaN },
    });
    expect(invalidValue.anthropometry).toEqual(base.anthropometry);
  });

  test("pose actions ignore invalid anthropometry commands", () => {
    const dispatch = jest.fn();
    const track = jest.fn();
    const actions = createPoseActions({ dispatch, track, dims: {}, globalMode: "functional" });

    actions.setSex("outro");
    actions.setPercentile(42);
    actions.setAge(91);
    actions.setAge(Number.NaN);

    expect(dispatch).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});
