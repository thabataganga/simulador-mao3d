import { Group } from "three";
import { matFinger } from "./shared";
import { attachFingerDebug } from "./debug";

export function buildFingersSubsystem(f, palm, dbgMap, highlightMap, allMovers) {
  const { d, mkSphere, mkPhal, addHL } = f;
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
    mcp.add(addHL(mkSphere(Wp / 2, matFinger.clone())));

    const prox = mkPhal(Lp, Wp, matFinger);
    prox.mesh.position.x = Lp / 2;
    mcp.add(prox.group);

    const pip = new Group();
    pip.position.set(Lp, 0, 0);
    prox.group.add(pip);
    pip.add(addHL(mkSphere(Wm / 2, matFinger.clone())));

    const mid = mkPhal(Lm, Wm, matFinger);
    mid.mesh.position.x = Lm / 2;
    pip.add(mid.group);

    const dip = new Group();
    dip.position.set(Lm, 0, 0);
    mid.group.add(dip);
    dip.add(addHL(mkSphere(Wd / 2, matFinger.clone())));

    const dist = mkPhal(Ld, Wd, matFinger);
    dist.mesh.position.x = Ld / 2;
    dip.add(dist.group);

    let tip = dist.group;
    let tipOff = Ld;
    const padLen = [d.tipPads.index, d.tipPads.middle, d.tipPads.ring, d.tipPads.little][i] || 0;
    if (padLen > 0.5) {
      const pad = mkPhal(padLen, Wd * 0.9, matFinger);
      pad.mesh.position.x = padLen / 2;
      dist.group.add(pad.group);
      tip = pad.group;
      tipOff += padLen;
    }

    const digit = `D${i + 2}`;
    attachFingerDebug(mcp, `${digit}_MCP`, "XY", Lp, Wp, dbgMap);
    attachFingerDebug(pip, `${digit}_PIP`, "XY", Lm, Wm, dbgMap);
    attachFingerDebug(dip, `${digit}_DIP`, "XY", Ld, Wd, dbgMap);

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
