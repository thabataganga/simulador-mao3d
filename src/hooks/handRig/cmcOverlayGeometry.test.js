import { computeCmcOverlayDimensions, computeCmcGoniometerVectors } from "./cmcOverlayGeometry";

describe("cmcOverlayGeometry", () => {
  test("computeCmcOverlayDimensions clamps values for small palms", () => {
    const dims = { palm: { LENGTH: 20, WIDTH: 20 } };
    const result = computeCmcOverlayDimensions(dims);

    expect(result).toEqual({
      rayLength: 22,
      arcRadius: 12,
      lineWidthPx: 4.5,
    });
  });

  test("computeCmcOverlayDimensions clamps values for large palms", () => {
    const dims = { palm: { LENGTH: 500, WIDTH: 400 } };
    const result = computeCmcOverlayDimensions(dims);

    expect(result).toEqual({
      rayLength: 46,
      arcRadius: 26,
      lineWidthPx: 4.5,
    });
  });

  test("computeCmcGoniometerVectors returns null when rig is incomplete", () => {
    expect(computeCmcGoniometerVectors({})).toBeNull();
  });
});

