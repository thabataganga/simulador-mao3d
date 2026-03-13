import { buildProfile, makeDims } from "./profile";

describe("anthropometry thumb calibration", () => {
  test("keeps thumb-to-D3 ratio inside clinical target band for default adult profiles", () => {
    ["masculino", "feminino"].forEach(sex => {
      const dims = makeDims(buildProfile(sex, 50, 25));
      const d3Total = dims.fingers[1].len.reduce((sum, segment) => sum + segment, 0);
      const thumbTotal = dims.thumbLen[0] + dims.thumbLen[1];
      const ratio = thumbTotal / d3Total;

      expect(ratio).toBeCloseTo(0.66, 6);
      expect(ratio).toBeGreaterThanOrEqual(0.63);
      expect(ratio).toBeLessThanOrEqual(0.73);
    });
  });

  test("moves thumb base distally and laterally versus prior baseline", () => {
    const legacyThumbBaseFromProx = { masculino: 0.18, feminino: 0.16 };
    const legacyZOverWidth = {
      masculino: (28 / 55) * 1.02,
      feminino: (28 / 55) * 0.98,
    };

    ["masculino", "feminino"].forEach(sex => {
      const dims = makeDims(buildProfile(sex, 50, 25));
      const xFromProxRatio = (dims.thumbBase.x + dims.palm.LENGTH / 2) / dims.palm.LENGTH;
      const zOverWidth = dims.thumbBase.z / dims.palm.WIDTH;

      expect(xFromProxRatio).toBeGreaterThan(legacyThumbBaseFromProx[sex]);
      expect(zOverWidth).toBeGreaterThan(legacyZOverWidth[sex]);
    });
  });
});
