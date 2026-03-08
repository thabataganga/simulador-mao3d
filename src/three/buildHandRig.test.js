jest.mock("three/examples/jsm/lines/Line2.js", () => {
  const mockThree = jest.requireActual("three");
  return {
    Line2: class MockLine2 extends mockThree.Object3D {
      constructor(geometry, material) {
        super();
        this.geometry = geometry;
        this.material = material;
        this.visible = false;
        this.renderOrder = 0;
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

import { buildProfile, makeDims } from "../utils/anthropometry/profile";
import { buildHandRig } from "./buildHandRig";

describe("buildHandRig debug anchors", () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    globalThis.document = {
      createElement: jest.fn(() => {
        const canvas = {
          width: 0,
          height: 0,
          getContext: jest.fn(() => ({
            font: "",
            fillStyle: "",
            textBaseline: "",
            measureText: text => ({ width: text.length * 12 }),
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            fillText: jest.fn(),
          })),
        };
        return canvas;
      }),
    };
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  test("attaches TH_CMC_OPP debug package to a stable thumb frame", () => {
    const dims = makeDims(buildProfile("masculino", 50, 25));
    const rig = buildHandRig(dims);

    expect(rig.dbgMap.TH_CMC_OPP.plane.parent).toBe(rig.thumb.debug.cmcOpp);
    expect(rig.thumb.debug.cmcOpp.parent).toBe(rig.thumb.mount);
    expect(rig.thumb.debug.cmcOpp.parent).not.toBe(rig.thumb.cmcPronation);
  });
});


