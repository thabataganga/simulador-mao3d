import { Box3, BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";
import { THUMB_CMC_NEUTRAL } from "../domain/thumb";
import { THUMB_SEGMENT_RATIOS } from "../constants/biomechanics";
import { deg2rad } from "../utils/math/core";
import { makeDebugPkg } from "./helpers";

const MAT_ARM_DEF = { color: 0xcad4e0, roughness: 0.8, metalness: 0.05 };
const MAT_PALM_DEF = { color: 0xdde6ee, roughness: 0.85, metalness: 0.03 };
const MAT_FINGER_DEF = { color: 0xe9eef3, roughness: 0.9, metalness: 0.02 };

const mkMat = def => new MeshStandardMaterial(def);

function createFactories(d, hlList, mats) {
  const mkCyl = (r1, r2, h, mat) => new Mesh(new CylinderGeometry(r1, r2, h, 24), mat);
  const mkBox = (lx, wy, wz, mat) => new Mesh(new BoxGeometry(lx, wy, wz), mat);
  const mkSphere = (r, mat) => new Mesh(new SphereGeometry(r, 16, 16), mat);
  const addHL = mesh => {
    mesh.userData.baseColor = mesh.material.color.clone();
    hlList.push(mesh);
    return mesh;
  };

  const mkPhal = (len, wid, mat) => {
    const group = new Group();
    const mesh = addHL(mkBox(len, wid, wid * 0.9, mat.clone()));
    group.add(mesh);
    return { group, mesh };
  };

  return { d, mkCyl, mkBox, mkSphere, mkPhal, addHL, mats };
}

function createFingerDebugFactory(dbgMap) {
  return (node, key, axis, length, width) => {
    const pkg = makeDebugPkg(node, key, axis, length * 1.1, width * 2.2, width * 1.6, "", false);
    dbgMap[pkg.key] = pkg;
    return pkg;
  };
}

function createThumbDebugFactory(dbgMap) {
  return (node, key, axis, length, width, name, opts) => {
    const pkg = makeDebugPkg(node, key, axis, length, width * 2.2, width * 1.6, `${name}: 0 deg`, opts);
    dbgMap[pkg.key] = pkg;
    return pkg;
  };
}

function createWristDebugFactory(dbgMap) {
  return (node, key, axis, length, width, thickness, label) => {
    const pkg = makeDebugPkg(node, key, axis, length, width, thickness, label);
    dbgMap[pkg.key] = pkg;
    return pkg;
  };
}

function buildWristSubsystem(f) {
  const root = new Group();
  const { d, mkCyl, mkBox, addHL, mats } = f;
  const clear = Math.max(0.5, 0.1 * d.palm.THICKNESS);

  const forearm = mkCyl(d.forearm.radDist, d.forearm.radProx, d.forearm.len, mats.arm.clone());
  forearm.rotation.z = Math.PI / 2;

  const wristLenProx = d.wrist.length * THUMB_SEGMENT_RATIOS.WRIST_PROX;
  const wristProx = mkCyl(d.wrist.radius, d.wrist.radius, wristLenProx, mats.arm.clone());
  wristProx.rotation.z = Math.PI / 2;

  const wristCov = new Mesh(new SphereGeometry(d.wrist.radius, 24, 18), mats.arm.clone());
  const palm = addHL(mkBox(d.palm.LENGTH, d.palm.THICKNESS, d.palm.WIDTH, mats.palm.clone()));

  const pivX = -d.palm.LENGTH / 2;
  const wristDev = new Group();
  wristDev.position.set(pivX, 0, 0);
  const wristFlex = new Group();
  wristDev.add(wristFlex);

  palm.position.set(d.palm.LENGTH / 2, 0, 0);
  wristCov.position.set(-clear * 0.6, 0, 0);
  wristFlex.add(wristCov, palm);

  wristProx.position.set(pivX - (clear + wristLenProx / 2), 0, 0);
  forearm.position.set(pivX - (clear + wristLenProx + clear + d.forearm.len / 2), 0, 0);
  root.add(forearm, wristProx, wristDev);

  root.rotation.z = Math.PI / 2;
  root.updateMatrixWorld(true);
  const bb = new Box3().setFromObject(root);
  const bc = new Vector3();
  bb.getCenter(bc);
  root.position.x -= bc.x;
  root.position.z -= bc.z;
  root.position.y -= bb.min.y;

  return { root, palm, wristDev, wristFlex };
}

function buildFingersSubsystem(f, palm, dbgMap, highlightMap, allMovers) {
  const { d, mkSphere, mkPhal, addHL, mats } = f;
  const createFingerDebug = createFingerDebugFactory(dbgMap);
  const fingersRig = [];
  const tips = [];
  const tipOffsets = [];

  for (let i = 0; i < 4; i++) {
    const [Lp, Lm, Ld] = d.fingers[i].len;
    const [Wp, Wm, Wd] = d.fingerWid;

    const base = new Group();
    base.position.set(d.baseX, 0, d.baseZ[i]);
    palm.add(base);

    const mcp = new Group();
    base.add(mcp);
    mcp.add(addHL(mkSphere(Wp / 2, mats.finger.clone())));

    const prox = mkPhal(Lp, Wp, mats.finger);
    prox.mesh.position.x = Lp / 2;
    mcp.add(prox.group);

    const pip = new Group();
    pip.position.set(Lp, 0, 0);
    prox.group.add(pip);
    pip.add(addHL(mkSphere(Wm / 2, mats.finger.clone())));

    const mid = mkPhal(Lm, Wm, mats.finger);
    mid.mesh.position.x = Lm / 2;
    pip.add(mid.group);

    const dip = new Group();
    dip.position.set(Lm, 0, 0);
    mid.group.add(dip);
    dip.add(addHL(mkSphere(Wd / 2, mats.finger.clone())));

    const dist = mkPhal(Ld, Wd, mats.finger);
    dist.mesh.position.x = Ld / 2;
    dip.add(dist.group);

    let tip = dist.group;
    let tipOff = Ld;
    const padLen = [d.tipPads.index, d.tipPads.middle, d.tipPads.ring, d.tipPads.little][i] || 0;
    if (padLen > 0.5) {
      const pad = mkPhal(padLen, Wd * 0.9, mats.finger);
      pad.mesh.position.x = padLen / 2;
      dist.group.add(pad.group);
      tip = pad.group;
      tipOff += padLen;
    }

    const digit = `D${i + 2}`;
    createFingerDebug(mcp, `${digit}_MCP`, "XY", Lp, Wp);
    createFingerDebug(pip, `${digit}_PIP`, "XY", Lm, Wm);
    createFingerDebug(dip, `${digit}_DIP`, "XY", Ld, Wd);

    fingersRig.push({ base, mcp, prox: prox.group, pip, mid: mid.group, dip });
    tips.push(tip);
    tipOffsets.push(tipOff);
    allMovers.push(prox.mesh, mid.mesh, dist.mesh);

    highlightMap[`${digit}_MCP`] = [prox.mesh];
    highlightMap[`${digit}_PIP`] = [mid.mesh];
    highlightMap[`${digit}_DIP`] = [dist.mesh];
  }

  return { fingersRig, tips, tipOffsets };
}

function buildGlobalFingerDebug(fingersRig, dims, dbgMap) {
  const d3 = fingersRig[1];
  const [Lp3, Lm3, Ld3] = dims.fingers[1].len;
  const [Wp3, Wm3, Wd3] = dims.fingerWid;

  const gMG = new Group();
  d3.base.add(gMG);
  gMG.position.copy(d3.mcp.position);

  const gPG = new Group();
  d3.prox.add(gPG);
  gPG.position.copy(d3.pip.position);

  const gDG = new Group();
  d3.mid.add(gDG);
  gDG.position.copy(d3.dip.position);

  dbgMap.GLOBAL_MCP = makeDebugPkg(gMG, "GLOBAL_MCP", "XY", Lp3 * 1.1, Wp3 * 2.2, Wp3 * 1.6, "MCP: 0 deg");
  dbgMap.GLOBAL_PIP = makeDebugPkg(gPG, "GLOBAL_PIP", "XY", Lm3 * 1.1, Wm3 * 2.2, Wm3 * 1.6, "PIP: 0 deg");
  dbgMap.GLOBAL_DIP = makeDebugPkg(gDG, "GLOBAL_DIP", "XY", Ld3 * 1.1, Wd3 * 2.2, Wd3 * 1.6, "DIP: 0 deg");
}

function buildThumbSubsystem(f, palm, dbgMap, highlightMap, allMovers) {
  const { d, mkSphere, mkPhal, addHL, mats } = f;
  const createThumbDebug = createThumbDebugFactory(dbgMap);

  const thumbBase = new Group();
  thumbBase.position.set(
    d.thumbBase.x + THUMB_CMC_NEUTRAL.cmcNeutralBaseOffset.dx,
    d.thumbBase.y + THUMB_CMC_NEUTRAL.cmcNeutralBaseOffset.dy,
    d.thumbBase.z + THUMB_CMC_NEUTRAL.cmcNeutralBaseOffset.dz,
  );
  palm.add(thumbBase);

  const thumbMount = new Group();
  thumbMount.rotation.order = THUMB_CMC_NEUTRAL.mountRotationOrder;
  thumbMount.rotation.z = deg2rad(THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.z);
  thumbMount.rotation.y = deg2rad(THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.y);
  thumbMount.rotation.x = deg2rad(THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.x);
  thumbBase.add(thumbMount);

  const cmcAbd = new Group();
  thumbMount.add(cmcAbd);
  const cmcFlex = new Group();
  cmcAbd.add(cmcFlex);
  const cmcPronation = new Group();
  cmcFlex.add(cmcPronation);

  const metacarpalLen = d.thumbLen[0] * THUMB_SEGMENT_RATIOS.METACARPAL;
  const proximalLen = d.thumbLen[0] * THUMB_SEGMENT_RATIOS.PROXIMAL;
  const distalLen = d.thumbLen[1];

  const cmcJointSphere = addHL(mkSphere(d.thumbWid[0] * THUMB_SEGMENT_RATIOS.CMC_JOINT_SPHERE, mats.finger.clone()));
  cmcPronation.add(cmcJointSphere);

  const tMeta = mkPhal(metacarpalLen, d.thumbWid[0] * 1.02, mats.finger);
  tMeta.mesh.position.x = metacarpalLen / 2;
  cmcPronation.add(tMeta.group);

  const tmcp = new Group();
  tmcp.position.set(metacarpalLen, 0, 0);
  cmcPronation.add(tmcp);
  tmcp.add(addHL(mkSphere(d.thumbWid[0] / 2, mats.finger.clone())));

  const tmcpAccessory = new Group();
  tmcp.add(tmcpAccessory);

  const tProx = mkPhal(proximalLen, d.thumbWid[0], mats.finger);
  tProx.mesh.position.x = proximalLen / 2;
  tmcpAccessory.add(tProx.group);

  const tipIp = new Group();
  tipIp.position.set(proximalLen, 0, 0);
  tProx.group.add(tipIp);
  tipIp.add(addHL(mkSphere(d.thumbWid[1] / 2, mats.finger.clone())));

  const tDist = mkPhal(distalLen, d.thumbWid[1], mats.finger);
  tDist.mesh.position.x = distalLen / 2;
  tipIp.add(tDist.group);

  let tip = tDist.group;
  let tipOff = distalLen;
  if (d.tipPads.thumb > 0.5) {
    const pad = mkPhal(d.tipPads.thumb, d.thumbWid[1] * 0.9, mats.finger);
    pad.mesh.position.x = d.tipPads.thumb / 2;
    tDist.group.add(pad.group);
    tip = pad.group;
    tipOff += d.tipPads.thumb;
  }

  allMovers.push(tMeta.mesh, tProx.mesh, tDist.mesh);
  highlightMap.TH_MCP = [tProx.mesh];
  highlightMap.TH_IP = [tDist.mesh];
  highlightMap.TH_CMC_ABD = [cmcJointSphere, tMeta.mesh];
  highlightMap.TH_CMC_FLEX = [cmcJointSphere, tMeta.mesh];
  highlightMap.TH_CMC_OPP = [cmcJointSphere, tMeta.mesh];

  const cmcAbdDebug = new Group();
  thumbMount.add(cmcAbdDebug);
  const cmcFlexDebug = new Group();
  thumbMount.add(cmcFlexDebug);
  const cmcOppDebug = new Group();
  thumbMount.add(cmcOppDebug);

  const thumbLabels = {
    abd: createThumbDebug(cmcAbdDebug, "TH_CMC_ABD", "XY", metacarpalLen, d.thumbWid[0], "CMC abd", {
      withGoniometer: true,
      showPlane: false,
    }).label,
    flex: createThumbDebug(cmcFlexDebug, "TH_CMC_FLEX", "ZX", metacarpalLen, d.thumbWid[0], "CMC flex", {
      withGoniometer: true,
      showPlane: false,
    }).label,
    opp: createThumbDebug(cmcOppDebug, "TH_CMC_OPP", "YZ", metacarpalLen, d.thumbWid[0], "CMC opp", {
      withOppositionReference: true,
    }).label,
    mcp: createThumbDebug(tmcp, "TH_MCP", "XY", proximalLen, d.thumbWid[0], "MCP").label,
    ip: createThumbDebug(tipIp, "TH_IP", "XY", distalLen, d.thumbWid[1], "IP").label,
  };

  return {
    thumb: {
      base: thumbBase,
      mount: thumbMount,
      cmcAbd,
      cmcFlex,
      cmcPronation,
      debug: { cmcAbd: cmcAbdDebug, cmcFlex: cmcFlexDebug, cmcOpp: cmcOppDebug },
      mcp: tmcp,
      mcpAccessory: tmcpAccessory,
      ip: tipIp,
    },
    tips: { thumb: tip },
    tipOffsets: { thumb: tipOff },
    thumbLabels,
  };
}

function buildWristDebug(dims, wristDev, wristFlex, dbgMap) {
  const createWristDebug = createWristDebugFactory(dbgMap);

  createWristDebug(
    wristDev,
    "WR_DEV",
    "YZ",
    dims.palm.WIDTH * 0.9,
    dims.palm.THICKNESS * 2.2,
    dims.palm.THICKNESS * 1.6,
    "Desvio: 0 deg",
  );

  createWristDebug(
    wristFlex,
    "WR_FLEX",
    "XY",
    dims.palm.LENGTH * 0.8,
    dims.palm.WIDTH * 0.8,
    dims.palm.THICKNESS * 1.6,
    "Flex: 0 deg",
  );
}

export function buildHandRig(d) {
  const hlList = [];
  const dbgMap = {};
  const highlightMap = {};

  const mats = { arm: mkMat(MAT_ARM_DEF), palm: mkMat(MAT_PALM_DEF), finger: mkMat(MAT_FINGER_DEF) };
  const f = createFactories(d, hlList, mats);
  const wrist = buildWristSubsystem(f);
  const allMovers = [wrist.palm];

  const fingers = buildFingersSubsystem(f, wrist.palm, dbgMap, highlightMap, allMovers);
  buildGlobalFingerDebug(fingers.fingersRig, d, dbgMap);

  const thumb = buildThumbSubsystem(f, wrist.palm, dbgMap, highlightMap, allMovers);
  buildWristDebug(d, wrist.wristDev, wrist.wristFlex, dbgMap);

  highlightMap.WR_DEV = allMovers;
  highlightMap.WR_FLEX = allMovers;

  return {
    root: wrist.root,
    palm: wrist.palm,
    wrist: { dev: wrist.wristDev, flex: wrist.wristFlex },
    fingers: fingers.fingersRig,
    thumb: thumb.thumb,
    tips: { fingers: fingers.tips, thumb: thumb.tips.thumb },
    tipOffsets: { fingers: fingers.tipOffsets, thumb: thumb.tipOffsets.thumb },
    dbgMap,
    thumbLabels: thumb.thumbLabels,
    highlight: { map: highlightMap, all: hlList },
  };
}

