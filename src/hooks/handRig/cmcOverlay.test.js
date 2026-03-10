import { Quaternion } from "three";
import { updateCmcGoniometerOverlay } from "./cmcOverlay";

function createPkg() {
  return {
    setGoniometer: jest.fn(),
    setLabelPosition: jest.fn(),
  };
}

function createNode({ y = 0, z = 0 } = {}) {
  return {
    rotation: { y, z },
    getWorldQuaternion: jest.fn(target => {
      if (!target) throw new Error("Quaternion target is required");
      return target.identity();
    }),
  };
}

describe("cmcOverlay", () => {
  test("passes Quaternion target to palm.getWorldQuaternion (Three compatibility)", () => {
    const flexPkg = createPkg();
    const abdPkg = createPkg();
    const palm = createNode();
    const mount = createNode();

    const rig = {
      palm,
      thumb: {
        mount,
        cmcFlexExt: { rotation: { z: 0 } },
        cmcAbdAdd: { rotation: { y: 0 } },
      },
      dbgMap: {
        TH_CMC_ABD_ADD: flexPkg,
        TH_CMC_FLEX_EXT: abdPkg,
      },
    };

    expect(() =>
      updateCmcGoniometerOverlay(rig, "TH_CMC_ABD_ADD", { palm: { LENGTH: 70, WIDTH: 55 } }, { width: 200, height: 150 }),
    ).not.toThrow();

    expect(palm.getWorldQuaternion).toHaveBeenCalledWith(expect.any(Quaternion));
    expect(flexPkg.setGoniometer).toHaveBeenCalled();
  });

  test("degrades safely when rig.palm is missing", () => {
    const flexPkg = createPkg();
    const abdPkg = createPkg();
    const mount = createNode();

    const rig = {
      thumb: {
        mount,
        cmcFlexExt: { rotation: { z: 0 } },
        cmcAbdAdd: { rotation: { y: 0 } },
      },
      dbgMap: {
        TH_CMC_ABD_ADD: flexPkg,
        TH_CMC_FLEX_EXT: abdPkg,
      },
    };

    expect(() =>
      updateCmcGoniometerOverlay(rig, "TH_CMC_FLEX_EXT", { palm: { LENGTH: 70, WIDTH: 55 } }, { width: 200, height: 150 }),
    ).not.toThrow();

    expect(abdPkg.setGoniometer).toHaveBeenCalled();
  });
});
