import { Group } from "three";
import { THUMB_CMC_NEUTRAL } from "../../domain/thumb";
import { deg2rad } from "../../utils/math/core";
import { matFinger } from "./shared";
import { attachThumbDebug } from "./debug";

export function buildThumbSubsystem(f, palm, dbgMap, highlightMap, allMovers) {
  const { d, mkSphere, mkPhal, addHL } = f;

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

  const metacarpalLen = d.thumbLen[0] * 0.55;
  const proximalLen = d.thumbLen[0] * 0.45;
  const distalLen = d.thumbLen[1];

  const cmcJointSphere = addHL(mkSphere(d.thumbWid[0] * 0.42, matFinger.clone()));
  cmcPronation.add(cmcJointSphere);

  const tMeta = mkPhal(metacarpalLen, d.thumbWid[0] * 1.02, matFinger);
  tMeta.mesh.position.x = metacarpalLen / 2;
  cmcPronation.add(tMeta.group);

  const tmcp = new Group();
  tmcp.position.set(metacarpalLen, 0, 0);
  cmcPronation.add(tmcp);
  tmcp.add(addHL(mkSphere(d.thumbWid[0] / 2, matFinger.clone())));

  const tmcpAccessory = new Group();
  tmcp.add(tmcpAccessory);

  const tProx = mkPhal(proximalLen, d.thumbWid[0], matFinger);
  tProx.mesh.position.x = proximalLen / 2;
  tmcpAccessory.add(tProx.group);

  const tipIp = new Group();
  tipIp.position.set(proximalLen, 0, 0);
  tProx.group.add(tipIp);
  tipIp.add(addHL(mkSphere(d.thumbWid[1] / 2, matFinger.clone())));

  const tDist = mkPhal(distalLen, d.thumbWid[1], matFinger);
  tDist.mesh.position.x = distalLen / 2;
  tipIp.add(tDist.group);

  let tip = tDist.group;
  let tipOff = distalLen;
  if (d.tipPads.thumb > 0.5) {
    const pad = mkPhal(d.tipPads.thumb, d.thumbWid[1] * 0.9, matFinger);
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
    abd: attachThumbDebug(cmcAbdDebug, "TH_CMC_ABD", "XY", metacarpalLen, d.thumbWid[0], "CMC abd", {
      withGoniometer: true,
      showPlane: false,
    }, dbgMap).label,
    flex: attachThumbDebug(cmcFlexDebug, "TH_CMC_FLEX", "ZX", metacarpalLen, d.thumbWid[0], "CMC flex", {
      withGoniometer: true,
      showPlane: false,
    }, dbgMap).label,
    opp: attachThumbDebug(cmcOppDebug, "TH_CMC_OPP", "YZ", metacarpalLen, d.thumbWid[0], "CMC opp", {
      withOppositionReference: true,
    }, dbgMap).label,
    mcp: attachThumbDebug(tmcp, "TH_MCP", "XY", proximalLen, d.thumbWid[0], "MCP", undefined, dbgMap).label,
    ip: attachThumbDebug(tipIp, "TH_IP", "XY", distalLen, d.thumbWid[1], "IP", undefined, dbgMap).label,
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
