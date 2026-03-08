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

import { makeLabel, setLabelText } from "./helpers";

describe("three label helpers", () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    globalThis.document = {
      createElement: jest.fn(() => {
        const ctx = {
          font: "",
          fillStyle: "",
          textBaseline: "",
          measureText: text => ({ width: text.length * 12 }),
          clearRect: jest.fn(),
          fillRect: jest.fn(),
          fillText: jest.fn(),
        };
        const canvas = {
          width: 0,
          height: 0,
          getContext: jest.fn(() => ctx),
        };
        return canvas;
      }),
    };
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  test("resizes canvas and swaps texture when label text grows", () => {
    const label = makeLabel("CMC", 1);
    const initialWidth = label.userData.canvas.width;
    const initialScaleX = label.scale.x;
    const initialMap = label.material.map;

    setLabelText(label, "CMC: Kapandji 10");

    expect(label.userData.canvas.width).toBeGreaterThan(initialWidth);
    expect(label.scale.x).toBeGreaterThan(initialScaleX);
    expect(label.material.map).not.toBe(initialMap);
  });

  test("skips texture update when text is unchanged", () => {
    const label = makeLabel("CMC", 1);
    const initialMap = label.material.map;
    const initialScaleX = label.scale.x;

    setLabelText(label, "CMC");

    expect(label.material.map).toBe(initialMap);
    expect(label.scale.x).toBe(initialScaleX);
  });
});
