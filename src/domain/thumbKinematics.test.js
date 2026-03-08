import * as THREE from "three";
import { THUMB_CMC_NEUTRAL } from "./thumb";
import { mapClinicalCmcToRigAngles, mapClinicalCmcToRigRadians } from "./thumb";
import { toPalmFramePoint } from "./thumb";

const DEG = Math.PI / 180;

function makeCmcModel() {
  const palm = new THREE.Group();
  const thumbBase = new THREE.Group();
  palm.add(thumbBase);

  const thumbMount = new THREE.Group();
  thumbMount.rotation.order = THUMB_CMC_NEUTRAL.mountRotationOrder;
  thumbMount.rotation.z = THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.z * DEG;
  thumbMount.rotation.y = THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.y * DEG;
  thumbMount.rotation.x = THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.x * DEG;
  thumbBase.add(thumbMount);

  const cmcAbd = new THREE.Group();
  thumbMount.add(cmcAbd);
  const cmcFlex = new THREE.Group();
  cmcAbd.add(cmcFlex);
  const cmcPronation = new THREE.Group();
  cmcFlex.add(cmcPronation);

  const metacarpalLen = 20;
  const proximalLen = 16;
  const distalLen = 13;

  const mcp = new THREE.Group();
  mcp.position.x = metacarpalLen;
  cmcPronation.add(mcp);

  const ip = new THREE.Group();
  ip.position.x = proximalLen;
  mcp.add(ip);

  const tip = new THREE.Group();
  tip.position.x = distalLen;
  ip.add(tip);

  return { palm, joints: { cmcAbd, cmcFlex, cmcPronation }, tip };
}

function poseCmc(clinical) {
  const model = makeCmcModel();
  const mapped = mapClinicalCmcToRigRadians({ CMC_abd: 0, CMC_flex: 0, CMC_opp: 0, ...clinical });

  model.joints.cmcAbd.rotation.z = mapped.radians.cmcAbd;
  model.joints.cmcFlex.rotation.y = mapped.radians.cmcFlex;
  model.joints.cmcPronation.rotation.x = mapped.radians.cmcPronation;

  model.palm.updateMatrixWorld(true);
  const tipW = model.tip.getWorldPosition(new THREE.Vector3());
  const baseW = model.joints.cmcAbd.getWorldPosition(new THREE.Vector3());

  return {
    mapped,
    tipPalm: toPalmFramePoint(model.palm, tipW, baseW),
  };
}

describe("CMC-first mapping", () => {
  test("uses explicit neutral mount constants", () => {
    expect(THUMB_CMC_NEUTRAL.mountRotationOrder).toBe("ZYX");
    expect(THUMB_CMC_NEUTRAL.cmcNeutralMountDeg).toEqual({ z: 0, y: 0, x: 0 });
    expect(THUMB_CMC_NEUTRAL.cmcNeutralBaseOffset).toEqual({ dx: 0, dy: 0, dz: 0 });
  });

  test("keeps direct clinical CMC_abd sign while CMC_opp is zero", () => {
    const add = mapClinicalCmcToRigAngles({ CMC_abd: -10, CMC_flex: 0, CMC_opp: 0 });
    const abd = mapClinicalCmcToRigAngles({ CMC_abd: 60, CMC_flex: 0, CMC_opp: 0 });

    expect(add.cmcAbd).toBe(-10);
    expect(abd.cmcAbd).toBe(60);
  });

  test("all zeros produce a non-max-open state", () => {
    const zero = poseCmc({ CMC_abd: 0, CMC_flex: 0, CMC_opp: 0 });
    const abdMax = poseCmc({ CMC_abd: 60, CMC_flex: 0, CMC_opp: 0 });
    expect(zero.tipPalm.y).toBeLessThan(abdMax.tipPalm.y);
  });

  test("CMC abd/add visible direction: + opens, - closes", () => {
    const add = poseCmc({ CMC_abd: -10 });
    const abd = poseCmc({ CMC_abd: 60 });
    expect(abd.tipPalm.y).toBeGreaterThan(add.tipPalm.y);
  });

  test("CMC flex/ext around neutral changes across-palm direction", () => {
    const ext = poseCmc({ CMC_flex: -20 });
    const flex = poseCmc({ CMC_flex: 30 });
    expect(flex.tipPalm.z).toBeLessThan(ext.tipPalm.z);
  });

  test("CMC opposition remains composite (not pure axial)", () => {
    const retro = mapClinicalCmcToRigAngles({ CMC_abd: 0, CMC_flex: 0, CMC_opp: -40 });
    const opp = mapClinicalCmcToRigAngles({ CMC_abd: 0, CMC_flex: 0, CMC_opp: 70 });

    expect(Math.abs(retro.cmcAbd)).toBeGreaterThan(0);
    expect(Math.abs(retro.cmcFlex)).toBeGreaterThan(0);
    expect(Math.abs(retro.cmcPronation)).toBeLessThan(40);

    expect(Math.abs(opp.cmcAbd)).toBeGreaterThan(0);
    expect(Math.abs(opp.cmcFlex)).toBeGreaterThan(0);
    expect(Math.abs(opp.cmcPronation)).toBeLessThan(70);
  });
});

