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

function createMesh() {
  return {
    userData: { baseColor: { tag: "base" } },
    material: {
      color: { copy: jest.fn(), set: jest.fn() },
      emissive: { set: jest.fn() },
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
});
