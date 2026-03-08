import { attachRendererToElement, detachRendererFromElement, disposeSceneMaterials } from "./threeSceneLifecycle";

describe("threeScene lifecycle utils", () => {
  test("attach and detach renderer dom element", () => {
    const host = {
      child: null,
      contains: jest.fn(() => false),
      appendChild: jest.fn(node => {
        host.child = node;
        node.parentNode = host;
      }),
      removeChild: jest.fn(node => {
        if (host.child === node) host.child = null;
        node.parentNode = null;
      }),
    };
    const renderer = { domElement: { parentNode: null } };

    attachRendererToElement(host, renderer);
    expect(host.appendChild).toHaveBeenCalledWith(renderer.domElement);

    detachRendererFromElement(host, renderer);
    expect(host.removeChild).toHaveBeenCalledWith(renderer.domElement);
  });

  test("disposeSceneMaterials disposes geometry and materials", () => {
    const disposeGeo = jest.fn();
    const disposeMatA = jest.fn();
    const disposeMatB = jest.fn();

    const scene = {
      traverse: cb => {
        cb({ geometry: { dispose: disposeGeo }, material: [{ dispose: disposeMatA }, { dispose: disposeMatB }] });
      },
    };

    disposeSceneMaterials(scene);
    expect(disposeGeo).toHaveBeenCalledTimes(1);
    expect(disposeMatA).toHaveBeenCalledTimes(1);
    expect(disposeMatB).toHaveBeenCalledTimes(1);
  });
});
