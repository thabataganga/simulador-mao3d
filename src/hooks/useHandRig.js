import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildHandRig } from "../three/buildHandRig";
import { setLabelText } from "../three/helpers";
import { deg2rad, clamp } from "../utils";
import { RANGES } from "../constants";

export function useHandRig({ three, orbitRef, dims, fingers, thumb, wrist, debugKey }) {
  const handRig = useRef(null);

  // Câmera enquadra o rig
  const frameRig = () => {
    const root = handRig.current?.root, ctl = orbitRef.current, cam = three?.camera;
    if (!root || !ctl || !cam) return;
    root.updateMatrixWorld(true);
    const box    = new THREE.Box3().setFromObject(root);
    const size   = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    ctl.target.copy(center);
    cam.position.copy(center.clone().add(new THREE.Vector3(1, 0.9, 1).normalize().multiplyScalar(maxDim * 2.2)));
    ctl.minDistance = maxDim * 0.8; ctl.maxDistance = maxDim * 6;
  };

  // Reconstrói o rig quando dims mudam
  useEffect(() => {
    if (!three?.scene) return;
    if (handRig.current) {
      three.scene.remove(handRig.current.root);
      handRig.current.root.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose(); } });
    }
    handRig.current = buildHandRig(dims);
    three.scene.add(handRig.current.root);
    frameRig();
  }, [dims, three]);

  // Aplica pose + atualiza labels
  useEffect(() => {
    const rig = handRig.current; if (!rig) return;
    fingers.forEach((s, i) => {
      const f = rig.fingers[i];
      f.mcp.rotation.z = deg2rad(clamp(s.MCP, RANGES.MCP));
      f.pip.rotation.z = deg2rad(clamp(s.PIP, RANGES.PIP));
      f.dip.rotation.z = deg2rad(clamp(s.DIP, RANGES.DIP));
    });
    rig.wrist.dev.rotation.x  = deg2rad(clamp(wrist.dev,  RANGES.WRIST_DEV));
    rig.wrist.flex.rotation.z = deg2rad(clamp(wrist.flex, RANGES.WRIST_FLEX));
    const t = rig.thumb;
    t.cmcAbd.rotation.y   =  deg2rad(clamp(thumb.CMC_abd,  RANGES.CMC_ABD));
    t.cmcFlex.rotation.z  = -deg2rad(clamp(thumb.CMC_flex, RANGES.CMC_FLEX));
    t.cmcAxial.rotation.x =  deg2rad(clamp(thumb.CMC_opp,  RANGES.CMC_OPP));
    t.mcp.rotation.z      = -deg2rad(clamp(thumb.MCP_flex, RANGES.THUMB_MCP_FLEX));
    t.ip.rotation.z       =  deg2rad(clamp(thumb.IP,       RANGES.THUMB_IP));
    const fmt = v => `${Math.round(v)}°`, map = rig.dbgMap;
    setLabelText(map.GLOBAL_MCP?.label, `MCP: ${fmt(fingers[1].MCP)}`);
    setLabelText(map.GLOBAL_PIP?.label, `PIP: ${fmt(fingers[1].PIP)}`);
    setLabelText(map.GLOBAL_DIP?.label, `DIP: ${fmt(fingers[1].DIP)}`);
    setLabelText(map.WR_FLEX?.label,    `Flex: ${fmt(wrist.flex)}`);
    setLabelText(map.WR_DEV?.label,     `Desvio: ${fmt(wrist.dev)}`);
    const tl = rig.thumbLabels;
    if (tl) {
      setLabelText(tl.abd,  `CMC abd: ${fmt(thumb.CMC_abd)}`);
      setLabelText(tl.flex, `CMC flex: ${fmt(thumb.CMC_flex)}`);
      setLabelText(tl.opp,  `CMC opp: ${fmt(thumb.CMC_opp)}`);
      setLabelText(tl.mcp,  `MCP: ${fmt(thumb.MCP_flex)}`);
      setLabelText(tl.ip,   `IP: ${fmt(thumb.IP)}`);
    }
  }, [fingers, thumb, wrist, dims]);

  // Highlight de articulação
  useEffect(() => {
    const rig = handRig.current; if (!rig) return;
    const map = rig.dbgMap;
    Object.values(map).forEach(pkg => pkg.setVisible(false));
    const globalJoint = { GLOBAL_MCP: "MCP", GLOBAL_PIP: "PIP", GLOBAL_DIP: "DIP" }[debugKey];
    if (globalJoint) {
      ["D2", "D3", "D4", "D5"].forEach(d => map[`${d}_${globalJoint}`]?.setVisible(true));
      if (map[debugKey]?.label) map[debugKey].label.visible = true;
    } else if (debugKey !== "off" && map[debugKey]) {
      map[debugKey].setVisible(true);
    }
    const hl   = rig.highlight;
    hl.all.forEach(m => { if (m.material && m.userData.baseColor) { m.material.color.copy(m.userData.baseColor); m.material.emissive?.set(0x000000); } });
    const tgts = globalJoint
      ? ["D2", "D3", "D4", "D5"].flatMap(d => hl.map[`${d}_${globalJoint}`] || [])
      : (hl.map[debugKey] || []);
    tgts.forEach(m => { if (m.material) { m.material.color.set(0xffcc66); m.material.emissive?.set(0x553300); } });
  }, [debugKey]);

  return handRig;
}