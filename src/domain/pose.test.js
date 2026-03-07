import {
  applyGlobalGripToPose,
  calculateGlobalD2D5,
  createNeutralPose,
  createSceneInput,
  createZeroPose,
  setGlobalFingerAngle,
  setThumbAngle,
} from "./pose";
import { buildProfile, makeDims } from "../utils";

function basePose(overrides = {}) {
  return {
    fingers: [
      { MCP: 0, PIP: 0, DIP: 0 },
      { MCP: 0, PIP: 0, DIP: 0 },
      { MCP: 0, PIP: 0, DIP: 0 },
      { MCP: 0, PIP: 0, DIP: 0 },
    ],
    thumb: { CMC_abd: 0, CMC_opp: 0, CMC_flex: 0, MCP_flex: 0, IP: 0 },
    wrist: { flex: 0, dev: 0 },
    grip: 0,
    globalMode: "functional",
    activePreset: "none",
    profile: {},
    dims: {},
    globalD2D5: { MCP: 0, PIP: 0, DIP: 0 },
    sex: "masculino",
    percentile: 50,
    age: 25,
    ...overrides,
  };
}

describe("pose domain", () => {
  test("setGlobalFingerAngle clamps values by joint range", () => {
    const next = setGlobalFingerAngle(basePose().fingers, "MCP", 999);
    expect(next.every(finger => finger.MCP === 90)).toBe(true);
  });

  test("setThumbAngle clamps thumb values", () => {
    const next = setThumbAngle(basePose().thumb, "IP", -999);
    expect(next.IP).toBe(-10);
  });

  test("calculateGlobalD2D5 computes rounded means", () => {
    const avg = calculateGlobalD2D5([
      { MCP: 10, PIP: 20, DIP: 30 },
      { MCP: 20, PIP: 20, DIP: 30 },
      { MCP: 30, PIP: 20, DIP: 30 },
      { MCP: 40, PIP: 20, DIP: 30 },
    ]);

    expect(avg).toEqual({ MCP: 25, PIP: 20, DIP: 30 });
  });

  test("applyGlobalGripToPose in functional mode updates all fingers and wrist", () => {
    const next = applyGlobalGripToPose(basePose(), 50, "functional");

    expect(next.fingers.length).toBe(4);
    expect(next.fingers.every(finger => finger.MCP === next.fingers[0].MCP)).toBe(true);
    expect(next.wrist).not.toEqual({ flex: 0, dev: 0 });
  });

  test("applyGlobalGripToPose in pinch mode updates only index finger pose", () => {
    const next = applyGlobalGripToPose(basePose(), 50, "pinch");

    expect(next.fingers[0]).not.toEqual({ MCP: 0, PIP: 0, DIP: 0 });
    expect(next.fingers[1]).toEqual({ MCP: 0, PIP: 0, DIP: 0 });
    expect(next.fingers[2]).toEqual({ MCP: 0, PIP: 0, DIP: 0 });
    expect(next.fingers[3]).toEqual({ MCP: 0, PIP: 0, DIP: 0 });
    expect(next.wrist).toEqual({ flex: 0, dev: 0 });
  });

  test("createNeutralPose returns pose derived from dims", () => {
    const dims = makeDims(buildProfile("masculino", 50, 25));
    const neutral = createNeutralPose(dims);

    expect(neutral.fingers).toHaveLength(4);
    expect(neutral.activePreset).toBe("neutro");
    expect(neutral.grip).toBe(0);
  });

  test("createZeroPose returns zeroed articulations", () => {
    const zero = createZeroPose();

    expect(zero.fingers).toEqual([
      { MCP: 0, PIP: 0, DIP: 0 },
      { MCP: 0, PIP: 0, DIP: 0 },
      { MCP: 0, PIP: 0, DIP: 0 },
      { MCP: 0, PIP: 0, DIP: 0 },
    ]);
    expect(zero.thumb).toEqual({ CMC_abd: 0, CMC_opp: 0, CMC_flex: 0, MCP_flex: 0, IP: 0 });
    expect(zero.wrist).toEqual({ flex: 0, dev: 0 });
    expect(zero.activePreset).toBe("zero");
  });

  test("createSceneInput keeps payload shape expected by 3D module", () => {
    const state = basePose({
      dims: { palm: { LENGTH: 70 } },
      fingers: [{ MCP: 1, PIP: 2, DIP: 3 }, { MCP: 4, PIP: 5, DIP: 6 }, { MCP: 7, PIP: 8, DIP: 9 }, { MCP: 10, PIP: 11, DIP: 12 }],
      thumb: { CMC_abd: 1, CMC_opp: 2, CMC_flex: 3, MCP_flex: 4, IP: 5 },
      wrist: { flex: -10, dev: 5 },
    });

    const sceneInput = createSceneInput(state);

    expect(sceneInput).toEqual({
      dims: state.dims,
      fingers: state.fingers,
      thumb: state.thumb,
      wrist: state.wrist,
    });
  });
});

test("applyGlobalGripToPose feeds createSceneInput in realistic workflow", () => {
  const state = basePose({
    dims: makeDims(buildProfile("feminino", 75, 30)),
    globalMode: "functional",
  });

  const nextPose = applyGlobalGripToPose(state, 65);
  const sceneInput = createSceneInput({ ...state, ...nextPose });

  expect(sceneInput.dims).toBe(state.dims);
  expect(sceneInput.fingers).toEqual(nextPose.fingers);
  expect(sceneInput.thumb).toEqual(nextPose.thumb);
  expect(sceneInput.wrist).toEqual(nextPose.wrist);
  expect(sceneInput.fingers.some(finger => finger.MCP !== 0 || finger.PIP !== 0 || finger.DIP !== 0)).toBe(true);
});
