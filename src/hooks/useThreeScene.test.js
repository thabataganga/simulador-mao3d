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

