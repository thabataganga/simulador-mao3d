jest.mock("three/examples/jsm/lines/Line2.js", () => {
  const mockThree = jest.requireActual("three");
  return {
    Line2: class MockLine2 extends mockThree.Object3D {
      constructor(geometry, material) {
        super();
        this.geometry = geometry;
        this.material = material;
      }
      computeLineDistances() {}
    },
  };
});

jest.mock("three/examples/jsm/lines/LineGeometry.js", () => ({
  LineGeometry: class MockLineGeometry {
    setPositions() {}
  },
}));

jest.mock("three/examples/jsm/lines/LineMaterial.js", () => ({
  LineMaterial: class MockLineMaterial {
    constructor(config = {}) {
      Object.assign(this, config);
      this.resolution = { set() {} };
    }
  },
}));

jest.mock("../handRig", () => ({
  CMC_AUTOFRAME_KEYS: new Set(["TH_CMC_ABD", "TH_CMC_FLEX"]),
  applyDebugSelection: jest.fn(),
  applyPoseToRig: jest.fn(() => ({ CMC_abd: 10, CMC_flex: -4 })),
  buildOppositionMetricFromLevel: jest.fn(level => ({ level, rigDirection: "oposicao", rigMagnitudeDeg: 30 })),
  disposeRigResources: jest.fn(),
  getViewportSize: jest.fn(() => ({ width: 100, height: 50 })),
  syncHandRigOverlays: jest.fn(() => 6),
}));

const mockBuildHandRig = jest.fn();
jest.mock("../../three/buildHandRig", () => ({
  buildHandRig: (...args) => mockBuildHandRig(...args),
}));

const mockMeasureThumbCmcGoniometryFromRig = jest.fn();
jest.mock("../../domain/thumb", () => ({
  measureThumbCmcGoniometryFromRig: (...args) => mockMeasureThumbCmcGoniometryFromRig(...args),
}));

import {
  applyPoseAndMeasure,
  buildOrRebuildRig,
  createResizeOverlaySyncHandler,
  shouldRebuildRigInputs,
  shouldUseInstantCmcAutoFrame,
} from "./runtimePipeline";
import { getViewportSize, syncHandRigOverlays } from "../handRig";

describe("runtimePipeline", () => {
  beforeEach(() => {
    mockBuildHandRig.mockReset();
    mockMeasureThumbCmcGoniometryFromRig.mockReset();
    mockBuildHandRig.mockImplementation(() => ({ root: { id: "rig-root" } }));
    mockMeasureThumbCmcGoniometryFromRig.mockReturnValue({
      isolated: { CMC_abd: 0, CMC_flex: 0 },
    });
  });

  test("shouldUseInstantCmcAutoFrame only on CMC transitions", () => {
    expect(shouldUseInstantCmcAutoFrame("off", "TH_CMC_ABD")).toBe(true);
    expect(shouldUseInstantCmcAutoFrame("TH_CMC_ABD", "TH_CMC_ABD")).toBe(false);
    expect(shouldUseInstantCmcAutoFrame("TH_CMC_FLEX", "TH_MCP")).toBe(false);
  });

  test("shouldRebuildRigInputs only for structural changes", () => {
    const scene = {};
    const dims = {};
    expect(shouldRebuildRigInputs(null, { scene, dims })).toBe(true);
    expect(shouldRebuildRigInputs({ scene, dims }, { scene, dims, debugKey: "TH_CMC_ABD" })).toBe(false);
    expect(shouldRebuildRigInputs({ scene, dims }, { scene: {}, dims })).toBe(true);
  });

  test("applyPoseAndMeasure composes pose measurement with overlay metric", () => {
    const result = applyPoseAndMeasure({
      rig: { id: "rig" },
      three: { renderer: {} },
      fingers: [],
      thumb: {},
      thumbClinical: {},
      thumbGoniometry: {},
      wrist: {},
      cmcBaseline: { CMC_abd: 0, CMC_flex: 0 },
      debugKey: "TH_CMC_ABD",
      dims: { palm: { LENGTH: 70, WIDTH: 55 } },
    });

    expect(getViewportSize).toHaveBeenCalled();
    expect(syncHandRigOverlays).toHaveBeenCalled();
    expect(result).toEqual({
      CMC_abd: 10,
      CMC_flex: -4,
      kapandjiEstimatedLevel: 6,
      oppositionMetric: { level: 6, rigDirection: "oposicao", rigMagnitudeDeg: 30 },
    });
  });

  test("createResizeOverlaySyncHandler skips when rig is absent", () => {
    const callsBefore = syncHandRigOverlays.mock.calls.length;
    const handler = createResizeOverlaySyncHandler({
      getRig: () => null,
      getParams: () => ({ debugKey: "off", dims: {}, thumbClinical: {}, thumb: {}, three: {} }),
    });

    handler();
    expect(syncHandRigOverlays.mock.calls.length).toBe(callsBefore);
  });

  test("buildOrRebuildRig does not unmount rig on rerun without structural changes", () => {
    const scene = { add: jest.fn(), remove: jest.fn() };
    const dims = { palm: { LENGTH: 70, WIDTH: 55 } };
    const handRigRef = { current: null };
    const mountedSceneRef = { current: null };
    const hasInitialFrameRef = { current: true };
    const cmcBaselineRef = { current: { CMC_abd: 0, CMC_flex: 0 } };
    const lastRigBuildInputsRef = { current: null };

    const firstRig = buildOrRebuildRig({
      scene,
      dims,
      handRigRef,
      mountedSceneRef,
      hasInitialFrameRef,
      cmcBaselineRef,
      lastRigBuildInputsRef,
    });
    const secondRig = buildOrRebuildRig({
      scene,
      dims,
      handRigRef,
      mountedSceneRef,
      hasInitialFrameRef,
      cmcBaselineRef,
      lastRigBuildInputsRef,
    });

    expect(firstRig).toBe(secondRig);
    expect(mockBuildHandRig).toHaveBeenCalledTimes(1);
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(scene.remove).not.toHaveBeenCalled();
  });

  test("buildOrRebuildRig safely returns null when rig construction fails", () => {
    const scene = { add: jest.fn(), remove: jest.fn() };
    const handRigRef = { current: null };
    const mountedSceneRef = { current: null };
    const hasInitialFrameRef = { current: true };
    const cmcBaselineRef = { current: { CMC_abd: 0, CMC_flex: 0 } };
    const lastRigBuildInputsRef = { current: null };

    mockBuildHandRig.mockReturnValueOnce(null);

    const result = buildOrRebuildRig({
      scene,
      dims: { palm: { LENGTH: 70, WIDTH: 55 } },
      handRigRef,
      mountedSceneRef,
      hasInitialFrameRef,
      cmcBaselineRef,
      lastRigBuildInputsRef,
    });

    expect(result).toBeNull();
    expect(scene.add).not.toHaveBeenCalled();
    expect(handRigRef.current).toBeNull();
    expect(mountedSceneRef.current).toBeNull();
    expect(hasInitialFrameRef.current).toBe(false);
  });

  test("createResizeOverlaySyncHandler keeps active CMC overlay synced after resize", () => {
    const handler = createResizeOverlaySyncHandler({
      getRig: () => ({ root: { id: "rig-root" } }),
      getParams: () => ({
        debugKey: "TH_CMC_ABD",
        dims: { palm: { LENGTH: 70, WIDTH: 55 } },
        thumbClinical: {},
        thumb: {},
        three: { renderer: {} },
      }),
    });

    handler();

    const calls = syncHandRigOverlays.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0];
    expect(lastCall.debugKey).toBe("TH_CMC_ABD");
    expect(lastCall.viewport).toEqual({ width: 100, height: 50 });
  });
});
