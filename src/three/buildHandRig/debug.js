import { Group } from "three";
import { makeDebugPkg } from "../helpers";

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

export function buildGlobalFingerDebug(fingersRig, dims, dbgMap) {
  const fallbackIndex = fingersRig[1] && dims?.fingers?.[1]?.len ? 1 : 0;
  const d3 = fingersRig[fallbackIndex];
  const fingerDims = dims?.fingers?.[fallbackIndex]?.len;
  if (!d3 || !Array.isArray(fingerDims) || fingerDims.length < 3 || !Array.isArray(dims?.fingerWid) || dims.fingerWid.length < 3) return;

  const [Lp3, Lm3, Ld3] = fingerDims;
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

export function buildWristDebug(dims, wristDev, wristFlex, dbgMap) {
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

export function attachFingerDebug(node, key, axis, length, width, dbgMap) {
  return createFingerDebugFactory(dbgMap)(node, key, axis, length, width);
}

export function attachThumbDebug(node, key, axis, length, width, name, opts, dbgMap) {
  return createThumbDebugFactory(dbgMap)(node, key, axis, length, width, name, opts);
}
