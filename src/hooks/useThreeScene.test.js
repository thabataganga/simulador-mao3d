import { syncRendererSize, shouldRenderScene } from "./useThreeScene";
import { attachRendererToElement, detachRendererFromElement } from "./threeSceneLifecycle";

describe("useThreeScene lifecycle guards", () => {
  test("does not duplicate the renderer element when already attached", () => {
    const domElement = {};
    const host = {
      contains: jest.fn(() => true),
      appendChild: jest.fn(),
    };

    attachRendererToElement(host, { domElement });
    expect(host.appendChild).not.toHaveBeenCalled();
  });

  test("detach no-ops when dom element parent differs", () => {
    const host = { removeChild: jest.fn() };
    const other = {};
    const domElement = { parentNode: other };

    detachRendererFromElement(host, { domElement });
    expect(host.removeChild).not.toHaveBeenCalled();
  });
});

describe("useThreeScene render invalidation helpers", () => {
  test("syncRendererSize updates camera and stores viewport size only when size changes", () => {
    const renderer = {
      userData: {},
      setSize: jest.fn(),
    };
    const camera = {
      aspect: 1,
      updateProjectionMatrix: jest.fn(),
    };

    expect(syncRendererSize(renderer, camera, 320, 200)).toBe(true);
    expect(camera.aspect).toBeCloseTo(1.6, 6);
    expect(renderer.setSize).toHaveBeenCalledWith(320, 200);
    expect(renderer.userData.viewportWidth).toBe(320);
    expect(renderer.userData.viewportHeight).toBe(200);

    renderer.setSize.mockClear();
    camera.updateProjectionMatrix.mockClear();

    expect(syncRendererSize(renderer, camera, 320, 200)).toBe(false);
    expect(renderer.setSize).not.toHaveBeenCalled();
    expect(camera.updateProjectionMatrix).not.toHaveBeenCalled();
  });

  test("shouldRenderScene requires visible mounted scene", () => {
    expect(shouldRenderScene({ isVisible: true, mountReady: true })).toBe(true);
    expect(shouldRenderScene({ isVisible: false, mountReady: true })).toBe(false);
    expect(shouldRenderScene({ isVisible: true, mountReady: false })).toBe(false);
  });
});
