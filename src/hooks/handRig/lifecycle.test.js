import { Group, Mesh, PerspectiveCamera, PlaneGeometry, Vector3 } from "three";
import { autoFrameCmcMeasurementView } from "./lifecycle";

function makeCmcRig() {
  const root = new Group();
  const cmcAbd = new Group();
  root.add(cmcAbd);

  const plane = new Mesh(new PlaneGeometry(10, 8));
  cmcAbd.add(plane);

  return {
    root,
    thumb: { cmcAbd },
    dbgMap: {
      TH_CMC_ABD: { plane },
      TH_CMC_FLEX: { plane },
    },
  };
}

describe("autoFrameCmcMeasurementView", () => {
  test("returns false for non-CMC debug key", () => {
    const rig = makeCmcRig();
    const controls = { target: new Vector3(), update: jest.fn() };
    const camera = new PerspectiveCamera(45, 1, 0.1, 1000);

    const moved = autoFrameCmcMeasurementView({
      rig,
      debugKey: "TH_MCP",
      dims: { palm: { LENGTH: 70, WIDTH: 55 } },
      controls,
      camera,
    });

    expect(moved).toBe(false);
    expect(controls.update).not.toHaveBeenCalled();
  });

  test("supports instant mode by copying target and position without interpolation", () => {
    const rig = makeCmcRig();
    rig.root.updateMatrixWorld(true);
    const cmcTarget = rig.thumb.cmcAbd.getWorldPosition(new Vector3());

    const controls = { target: new Vector3(8, 5, -8), update: jest.fn() };
    const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(-12, 18, -20);

    const moved = autoFrameCmcMeasurementView({
      rig,
      debugKey: "TH_CMC_ABD",
      dims: { palm: { LENGTH: 70, WIDTH: 55 } },
      controls,
      camera,
      instant: true,
    });

    expect(moved).toBe(true);
    expect(controls.update).toHaveBeenCalled();
    expect(controls.target.distanceTo(cmcTarget)).toBeLessThan(1e-9);
  });

  test("uses opposite camera side for flex compared to abd", () => {
    const rig = makeCmcRig();

    const controlsAbd = { target: new Vector3(), update: jest.fn() };
    const cameraAbd = new PerspectiveCamera(45, 1, 0.1, 1000);
    cameraAbd.position.set(0, 0, 0);

    autoFrameCmcMeasurementView({
      rig,
      debugKey: "TH_CMC_ABD",
      dims: { palm: { LENGTH: 70, WIDTH: 55 } },
      controls: controlsAbd,
      camera: cameraAbd,
      instant: true,
    });

    const controlsFlex = { target: new Vector3(), update: jest.fn() };
    const cameraFlex = new PerspectiveCamera(45, 1, 0.1, 1000);
    cameraFlex.position.set(0, 0, 0);

    autoFrameCmcMeasurementView({
      rig,
      debugKey: "TH_CMC_FLEX",
      dims: { palm: { LENGTH: 70, WIDTH: 55 } },
      controls: controlsFlex,
      camera: cameraFlex,
      instant: true,
    });

    const abdRelative = cameraAbd.position.clone().sub(controlsAbd.target);
    const flexRelative = cameraFlex.position.clone().sub(controlsFlex.target);

    expect(Math.sign(abdRelative.z)).toBe(-Math.sign(flexRelative.z));
    expect(controlsAbd.update).toHaveBeenCalled();
    expect(controlsFlex.update).toHaveBeenCalled();
  });

  test("skips micro-updates when already aligned within epsilon", () => {
    const rig = makeCmcRig();
    rig.root.updateMatrixWorld(true);
    const target = rig.thumb.cmcAbd.getWorldPosition(new Vector3());

    const controls = { target: target.clone(), update: jest.fn() };
    const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.copy(target.clone().add(new Vector3(0, 5.42, 67.5)));

    const moved = autoFrameCmcMeasurementView({
      rig,
      debugKey: "TH_CMC_ABD",
      dims: { palm: { LENGTH: 70, WIDTH: 55 } },
      controls,
      camera,
      targetEpsilon: 1e6,
      positionEpsilon: 1e6,
      angleEpsilonRad: Math.PI,
    });

    expect(moved).toBe(false);
    expect(controls.update).not.toHaveBeenCalled();
  });
});
