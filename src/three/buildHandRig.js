import * as THREE from "three";
import { THUMB_CMC_NEUTRAL } from "../domain/thumb";
import { deg2rad } from "../utils";
import { makeDebugPkg } from "./helpers";

const matArm = new THREE.MeshStandardMaterial({ color: 0xcad4e0, roughness: 0.8, metalness: 0.05 });
const matPalm = new THREE.MeshStandardMaterial({ color: 0xdde6ee, roughness: 0.85, metalness: 0.03 });
const matFinger = new THREE.MeshStandardMaterial({ color: 0xe9eef3, roughness: 0.9, metalness: 0.02 });

export function buildHandRig(d) {
  const root = new THREE.Group();
  const mkCyl = (r1, r2, h, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 24), mat);
  const mkBox = (lx, wy, wz, mat) => new THREE.Mesh(new THREE.BoxGeometry(lx, wy, wz), mat);
  const mkSphere = (r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), mat);
  const hlList = [];
  const addHL = m => {
    m.userData.baseColor = m.material.color.clone();
    hlList.push(m);
    return m;
  };

  const CLEAR = Math.max(0.5, 0.1 * d.palm.THICKNESS);
  const forearm = mkCyl(d.forearm.radDist, d.forearm.radProx, d.forearm.len, matArm);
  forearm.rotation.z = Math.PI / 2;

  const wristLenP = d.wrist.length * 0.55;
  const wristProx = mkCyl(d.wrist.radius, d.wrist.radius, wristLenP, matArm);
  wristProx.rotation.z = Math.PI / 2;

  const wristCov = new THREE.Mesh(new THREE.SphereGeometry(d.wrist.radius, 24, 18), matArm);
  const palm = addHL(mkBox(d.palm.LENGTH, d.palm.THICKNESS, d.palm.WIDTH, matPalm.clone()));

  const pivX = -d.palm.LENGTH / 2;
  const wristDev = new THREE.Group();
  wristDev.position.set(pivX, 0, 0);
  const wristFlex = new THREE.Group();
  wristDev.add(wristFlex);

  palm.position.set(d.palm.LENGTH / 2, 0, 0);
  wristCov.position.set(-CLEAR * 0.6, 0, 0);
  wristFlex.add(wristCov, palm);

  wristProx.position.set(pivX - (CLEAR + wristLenP / 2), 0, 0);
  forearm.position.set(pivX - (CLEAR + wristLenP + CLEAR + d.forearm.len / 2), 0, 0);
  root.add(forearm, wristProx, wristDev);

  root.rotation.z = Math.PI / 2;
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root);
  const bc = new THREE.Vector3();
  bb.getCenter(bc);
  root.position.x -= bc.x;
  root.position.z -= bc.z;
  root.position.y -= bb.min.y;

  const dbgMap = {};
  dbgMap.WR_DEV = makeDebugPkg(wristDev, "WR_DEV", "YZ", d.palm.WIDTH * 0.9, d.palm.THICKNESS * 2.2, d.palm.THICKNESS * 1.6, "Desvio: 0°");
  dbgMap.WR_FLEX = makeDebugPkg(wristFlex, "WR_FLEX", "XY", d.palm.LENGTH * 0.8, d.palm.WIDTH * 0.8, d.palm.THICKNESS * 1.6, "Flex: 0°");

  const hmap = {};
  const allMovers = [palm];

  const mkPhal = (len, wid, mat) => {
    const g = new THREE.Group();
    const m = addHL(mkBox(len, wid, wid * 0.9, mat.clone()));
    g.add(m);
    return { group: g, mesh: m, width: wid };
  };

  const fingersRig = [];
  const tipsF = [];
  const tipOffsetsF = [];
  for (let i = 0; i < 4; i++) {
    const [Lp, Lm, Ld] = d.fingers[i].len;
    const [Wp, Wm, Wd] = d.fingerWid;

    const base = new THREE.Group();
    base.position.set(d.baseX, 0, d.baseZ[i]);
    palm.add(base);

    const mcp = new THREE.Group();
    base.add(mcp);
    const mcpSphere = addHL(mkSphere(Wp / 2, matFinger));
    mcp.add(mcpSphere);

    const prox = mkPhal(Lp, Wp, matFinger);
    prox.mesh.position.x = Lp / 2;
    mcp.add(prox.group);

    const pip = new THREE.Group();
    pip.position.set(Lp, 0, 0);
    prox.group.add(pip);
    const pipSphere = addHL(mkSphere(Wm / 2, matFinger));
    pip.add(pipSphere);

    const mid = mkPhal(Lm, Wm, matFinger);
    mid.mesh.position.x = Lm / 2;
    pip.add(mid.group);

    const dip = new THREE.Group();
    dip.position.set(Lm, 0, 0);
    mid.group.add(dip);
    const dipSphere = addHL(mkSphere(Wd / 2, matFinger));
    dip.add(dipSphere);

    const dist = mkPhal(Ld, Wd, matFinger);
    dist.mesh.position.x = Ld / 2;
    dip.add(dist.group);

    let tip = dist.group;
    let tipOff = Ld;
    const padLen = [d.tipPads.index, d.tipPads.middle, d.tipPads.ring, d.tipPads.little][i] || 0;
    if (padLen > 0.5) {
      const p = mkPhal(padLen, Wd * 0.9, matFinger);
      p.mesh.position.x = padLen / 2;
      dist.group.add(p.group);
      tip = p.group;
      tipOff += padLen;
    }

    const mkD = (node, key, axis, L, W) => {
      const pkg = makeDebugPkg(node, key, axis, L * 1.1, W * 2.2, W * 1.6, "", false);
      dbgMap[pkg.key] = pkg;
    };

    mkD(mcp, `D${i + 2}_MCP`, "XY", Lp, Wp);
    mkD(pip, `D${i + 2}_PIP`, "XY", Lm, Wm);
    mkD(dip, `D${i + 2}_DIP`, "XY", Ld, Wd);

    fingersRig.push({ mcp, pip, dip });
    tipsF.push(tip);
    tipOffsetsF.push(tipOff);
    allMovers.push(prox.mesh, mid.mesh, dist.mesh);

    hmap[`D${i + 2}_MCP`] = [prox.mesh];
    hmap[`D${i + 2}_PIP`] = [mid.mesh];
    hmap[`D${i + 2}_DIP`] = [dist.mesh];
  }

  const d3 = fingersRig[1];
  const [Lp3, Lm3, Ld3] = d.fingers[1].len;
  const [Wp3, Wm3, Wd3] = d.fingerWid;

  const gMG = new THREE.Group(); d3.mcp.add(gMG);
  const gPG = new THREE.Group(); d3.pip.add(gPG);
  const gDG = new THREE.Group(); d3.dip.add(gDG);
  dbgMap.GLOBAL_MCP = makeDebugPkg(gMG, "GLOBAL_MCP", "XY", Lp3 * 1.1, Wp3 * 2.2, Wp3 * 1.6, "MCP: 0°");
  dbgMap.GLOBAL_PIP = makeDebugPkg(gPG, "GLOBAL_PIP", "XY", Lm3 * 1.1, Wm3 * 2.2, Wm3 * 1.6, "PIP: 0°");
  dbgMap.GLOBAL_DIP = makeDebugPkg(gDG, "GLOBAL_DIP", "XY", Ld3 * 1.1, Wd3 * 2.2, Wd3 * 1.6, "DIP: 0°");

  const thumbBase = new THREE.Group();
  thumbBase.position.set(
    d.thumbBase.x + THUMB_CMC_NEUTRAL.cmcNeutralBaseOffset.dx,
    d.thumbBase.y + THUMB_CMC_NEUTRAL.cmcNeutralBaseOffset.dy,
    d.thumbBase.z + THUMB_CMC_NEUTRAL.cmcNeutralBaseOffset.dz,
  );
  palm.add(thumbBase);

  const thumbMount = new THREE.Group();
  thumbMount.rotation.order = THUMB_CMC_NEUTRAL.mountRotationOrder;
  thumbMount.rotation.z = deg2rad(THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.z);
  thumbMount.rotation.y = deg2rad(THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.y);
  thumbMount.rotation.x = deg2rad(THUMB_CMC_NEUTRAL.cmcNeutralMountDeg.x);
  thumbBase.add(thumbMount);

  const cmcAbd = new THREE.Group(); thumbMount.add(cmcAbd);
  const cmcFlex = new THREE.Group(); cmcAbd.add(cmcFlex);
  const cmcPronation = new THREE.Group(); cmcFlex.add(cmcPronation);

  const metacarpalLen = d.thumbLen[0] * 0.55;
  const proximalLen = d.thumbLen[0] * 0.45;
  const distalLen = d.thumbLen[1];

  const tMeta = mkPhal(metacarpalLen, d.thumbWid[0] * 1.02, matFinger);
  tMeta.mesh.position.x = metacarpalLen / 2;
  cmcPronation.add(tMeta.group);

  const tmcp = new THREE.Group();
  tmcp.position.set(metacarpalLen, 0, 0);
  cmcPronation.add(tmcp);
  const tmcpSphere = addHL(mkSphere(d.thumbWid[0] / 2, matFinger));
  tmcp.add(tmcpSphere);

  const tmcpAccessory = new THREE.Group();
  tmcp.add(tmcpAccessory);

  const tProx = mkPhal(proximalLen, d.thumbWid[0], matFinger);
  tProx.mesh.position.x = proximalLen / 2;
  tmcpAccessory.add(tProx.group);

  const tip_ip = new THREE.Group();
  tip_ip.position.set(proximalLen, 0, 0);
  tProx.group.add(tip_ip);
  const tipIpSphere = addHL(mkSphere(d.thumbWid[1] / 2, matFinger));
  tip_ip.add(tipIpSphere);

  const tDist = mkPhal(distalLen, d.thumbWid[1], matFinger);
  tDist.mesh.position.x = distalLen / 2;
  tip_ip.add(tDist.group);

  let tipTh = tDist.group;
  let tipThOff = distalLen;
  if (d.tipPads.thumb > 0.5) {
    const p = mkPhal(d.tipPads.thumb, d.thumbWid[1] * 0.9, matFinger);
    p.mesh.position.x = d.tipPads.thumb / 2;
    tDist.group.add(p.group);
    tipTh = p.group;
    tipThOff += d.tipPads.thumb;
  }

  allMovers.push(tMeta.mesh, tProx.mesh, tDist.mesh);
  hmap.WR_DEV = hmap.WR_FLEX = allMovers;
  hmap.TH_MCP = [tProx.mesh];
  hmap.TH_IP = [tDist.mesh];
  hmap.TH_CMC_ABD = hmap.TH_CMC_FLEX = hmap.TH_CMC_OPP = [tMeta.mesh, tProx.mesh];

  const mkDT = (node, key, axis, L, W, nm) => {
    const p = makeDebugPkg(node, key, axis, L, W * 2.2, W * 1.6, `${nm}: 0°`);
    dbgMap[p.key] = p;
    return p.label;
  };

  const thumbLabels = {
    abd: mkDT(cmcAbd, "TH_CMC_ABD", "XY", metacarpalLen, d.thumbWid[0], "CMC abd"),
    flex: mkDT(cmcFlex, "TH_CMC_FLEX", "ZX", metacarpalLen, d.thumbWid[0], "CMC flex"),
    opp: mkDT(cmcPronation, "TH_CMC_OPP", "YZ", metacarpalLen, d.thumbWid[0], "CMC opp"),
    mcp: mkDT(tmcp, "TH_MCP", "XY", proximalLen, d.thumbWid[0], "MCP"),
    ip: mkDT(tip_ip, "TH_IP", "XY", distalLen, d.thumbWid[1], "IP"),
  };

  return {
    root,
    wrist: { dev: wristDev, flex: wristFlex },
    fingers: fingersRig,
    thumb: { cmcAbd, cmcFlex, cmcPronation, mcp: tmcp, mcpAccessory: tmcpAccessory, ip: tip_ip },
    tips: { fingers: tipsF, thumb: tipTh },
    tipOffsets: { fingers: tipOffsetsF, thumb: tipThOff },
    dbgMap,
    thumbLabels,
    highlight: { map: hmap, all: hlList },
  };
}
