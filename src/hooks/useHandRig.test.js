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

import { __testables } from "./useHandRig";

function createPkg() {
  return {
    label: { visible: false },
    axes: { visible: true },
    setVisible: jest.fn(),
    setGoniometer: jest.fn(),
    setLabelPosition: jest.fn(),
    setGoniometerResolution: jest.fn(),
    setOppositionReference: jest.fn(),
    setOppositionReferenceResolution: jest.fn(),
  };
}

function createMesh(role = null) {
  return {
    userData: { baseColor: { tag: "base" }, ...(role ? { highlightRole: role } : {}) },
    material: {
      color: { copy: jest.fn(), set: jest.fn() },
      emissive: { set: jest.fn() },
    },
  };
}

function createRigWithTarget(debugKey, targets) {
  return {
    dbgMap: {
      TH_CMC_FLEX: createPkg(),
      TH_CMC_ABD: createPkg(),
      TH_CMC_OPP: createPkg(),
      TH_MCP: createPkg(),
      D2_MCP: createPkg(),
      D3_MCP: createPkg(),
      D4_MCP: createPkg(),
      D5_MCP: createPkg(),
    },
    highlight: {
      all: Array.isArray(targets) ? targets : [targets],
      map: {
        TH_CMC_ABD: debugKey === "TH_CMC_ABD" ? targets : [],
        TH_MCP: debugKey === "TH_MCP" ? targets : [],
        D2_MCP: [],
        D3_MCP: [],
        D4_MCP: [],
        D5_MCP: [],
      },
    },
  };
}

describe("useHandRig testables", () => {
  test("didGoniometryChange avoids re-emitting equal values", () => {
    expect(__testables.didGoniometryChange(null, { CMC_abd: 1, CMC_flex: 2 })).toBe(true);
    expect(__testables.didGoniometryChange({ CMC_abd: 1, CMC_flex: 2 }, { CMC_abd: 1, CMC_flex: 2 })).toBe(false);
    expect(__testables.didGoniometryChange({ CMC_abd: 1, CMC_flex: 2 }, { CMC_abd: 1.02, CMC_flex: 2 })).toBe(true);
  });

  test("applyDebugSelection clears overlays when debug key is off", () => {
    const pkgFlex = createPkg();
    const pkgAbd = createPkg();
    const pkgOpp = createPkg();
    const rig = {
      dbgMap: {
        TH_CMC_FLEX: pkgFlex,
        TH_CMC_ABD: pkgAbd,
        TH_CMC_OPP: pkgOpp,
        D2_MCP: createPkg(),
        D3_MCP: createPkg(),
        D4_MCP: createPkg(),
        D5_MCP: createPkg(),
      },
      highlight: {
        all: [createMesh()],
        map: {
          D2_MCP: [],
          D3_MCP: [],
          D4_MCP: [],
          D5_MCP: [],
        },
      },
    };

    __testables.applyDebugSelection(
      rig,
      "off",
      { palm: { LENGTH: 70, WIDTH: 55 } },
      { opp: {} },
      {},
      { renderer: { domElement: { width: 1, height: 1 } } },
    );

    expect(pkgFlex.setGoniometer).toHaveBeenCalledWith(null);
    expect(pkgAbd.setGoniometer).toHaveBeenCalledWith(null);
    expect(pkgOpp.setOppositionReference).toHaveBeenCalledWith(null);
    expect(pkgOpp.setLabelPosition).toHaveBeenCalledWith(null);
  });

  test("applyDebugSelection colors CMC joint blue and metacarpal yellow", () => {
    const jointMesh = createMesh("cmcJoint");
    const segmentMesh = createMesh("cmcSegment");
    const rig = createRigWithTarget("TH_CMC_ABD", [jointMesh, segmentMesh]);

    __testables.applyDebugSelection(
      rig,
      "TH_CMC_ABD",
      { palm: { LENGTH: 70, WIDTH: 55 } },
      { opp: {} },
      {},
      { renderer: { domElement: { width: 1, height: 1 } } },
    );

    expect(jointMesh.material.color.set).toHaveBeenCalledWith(0x5ad7ff);
    expect(jointMesh.material.emissive.set).toHaveBeenCalledWith(0x114455);
    expect(segmentMesh.material.color.set).toHaveBeenCalledWith(0xffcc66);
    expect(segmentMesh.material.emissive.set).toHaveBeenCalledWith(0x553300);
  });

  test("applyDebugSelection keeps default palette for non-CMC keys", () => {
    const mesh = createMesh();
    const rig = createRigWithTarget("TH_MCP", [mesh]);

    __testables.applyDebugSelection(
      rig,
      "TH_MCP",
      { palm: { LENGTH: 70, WIDTH: 55 } },
      { opp: {} },
      {},
      { renderer: { domElement: { width: 1, height: 1 } } },
    );

    expect(mesh.material.color.set).toHaveBeenCalledWith(0xffcc66);
    expect(mesh.material.emissive.set).toHaveBeenCalledWith(0x553300);
  });
  test("shouldUseInstantCmcAutoFrame is true only when entering CMC key", () => {
    expect(__testables.shouldUseInstantCmcAutoFrame("off", "TH_CMC_ABD")).toBe(true);
    expect(__testables.shouldUseInstantCmcAutoFrame("TH_CMC_ABD", "TH_CMC_ABD")).toBe(false);
    expect(__testables.shouldUseInstantCmcAutoFrame("TH_CMC_ABD", "TH_CMC_FLEX")).toBe(true);
    expect(__testables.shouldUseInstantCmcAutoFrame("TH_CMC_FLEX", "TH_MCP")).toBe(false);
  });
});

