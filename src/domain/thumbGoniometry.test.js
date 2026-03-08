import { Quaternion, Vector3 } from "three";
import {
  buildCmcInputStateForAxis,
  buildThumbCmcClinicalModel,
  createDefaultCmcInputState,
  measureThumbCmcGoniometryFromRig,
  solveCmcCommandForMeasuredTarget,
  syncCmcInputStateFromThumb,
} from "./thumbGoniometry";

function mockNode(position) {
  return {
    getWorldPosition: target => target.copy(position),
  };
}

function makeRig({ thumbMcp, d2Pip }) {
  return {
    palm: {
      getWorldQuaternion: target => target.copy(new Quaternion()),
    },
    thumb: {
      cmcAbd: mockNode(new Vector3(0, 0, 0)),
      mcp: mockNode(thumbMcp),
    },
    fingers: [
      {
        mcp: mockNode(new Vector3(0, 0, 0)),
        pip: mockNode(d2Pip),
      },
    ],
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
    expect(model.abd.direction).toBe("abducao");
    expect(model.abd.magnitudeDeg).toBe(12);
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

  test("measures zero when mobile and fixed arms are aligned", () => {
    const rig = makeRig({
      thumbMcp: new Vector3(1, 0, 0),
      d2Pip: new Vector3(1, 0, 0),
    });

    const measured = measureThumbCmcGoniometryFromRig(rig);
    expect(measured).toEqual({ CMC_abd: 0, CMC_flex: 0 });
  });

  test("measures positive abduction and flexion for opening vectors", () => {
    const abdRig = makeRig({
      thumbMcp: new Vector3(1, 1, 0),
      d2Pip: new Vector3(1, 0, 0),
    });
    const flexRig = makeRig({
      thumbMcp: new Vector3(1, 0, 1),
      d2Pip: new Vector3(1, 0, 0),
    });

    expect(measureThumbCmcGoniometryFromRig(abdRig).CMC_abd).toBeGreaterThan(0);
    expect(measureThumbCmcGoniometryFromRig(flexRig).CMC_flex).toBeGreaterThan(0);
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
