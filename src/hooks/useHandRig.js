import { useCallback, useEffect, useRef } from "react";
import { Box3, Vector3 } from "three";
import { buildHandRig } from "../three/buildHandRig";
import { setLabelText } from "../three/helpers";
import { deg2rad, clamp } from "../utils";
import { RANGES } from "../constants";

const GLOBAL_DEBUG_KEY_TO_JOINT = {
  GLOBAL_MCP: "MCP",
  GLOBAL_PIP: "PIP",
  GLOBAL_DIP: "DIP",
};

const formatDegree = value => `${Math.round(value)}°`;

function applyMainLabels(rig, fingers, thumb, wrist) {
  const map = rig.dbgMap;
  setLabelText(map.GLOBAL_MCP?.label, `MCP: ${formatDegree(fingers[1].MCP)}`);
  setLabelText(map.GLOBAL_PIP?.label, `PIP: ${formatDegree(fingers[1].PIP)}`);
  setLabelText(map.GLOBAL_DIP?.label, `DIP: ${formatDegree(fingers[1].DIP)}`);
  setLabelText(map.WR_FLEX?.label, `Flex: ${formatDegree(wrist.flex)}`);
  setLabelText(map.WR_DEV?.label, `Desvio: ${formatDegree(wrist.dev)}`);

  const thumbLabels = rig.thumbLabels;
  if (!thumbLabels) return;

  setLabelText(thumbLabels.abd, `CMC abd: ${formatDegree(thumb.CMC_abd)}`);
  setLabelText(thumbLabels.flex, `CMC flex: ${formatDegree(thumb.CMC_flex)}`);
  setLabelText(thumbLabels.opp, `CMC opp: ${formatDegree(thumb.CMC_opp)}`);
  setLabelText(thumbLabels.mcp, `MCP: ${formatDegree(thumb.MCP_flex)}`);
  setLabelText(thumbLabels.ip, `IP: ${formatDegree(thumb.IP)}`);
}

export function useHandRig({ three, orbitRef, controlsReady = false, dims, fingers, thumb, wrist, debugKey }) {
  const handRig = useRef(null);

  // Camera framing for current rig dimensions.
  const frameRig = useCallback(() => {
    const root = handRig.current?.root;
    const controls = orbitRef.current;
    const camera = three?.camera;
    if (!root || !controls || !camera) return;

    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(root);
    const size = new Vector3();
    box.getSize(size);
    const center = new Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    controls.target.copy(center);
    camera.position.copy(center.clone().add(new Vector3(1, 0.9, 1).normalize().multiplyScalar(maxDim * 2.2)));
    controls.minDistance = maxDim * 0.8;
    controls.maxDistance = maxDim * 6;
    controls.update();
  }, [orbitRef, three]);

  // Rebuild rig whenever dimensions change.
  useEffect(() => {
    if (!three?.scene) return;

    if (handRig.current) {
      three.scene.remove(handRig.current.root);
      handRig.current.root.traverse(object => {
        if (object.isMesh) {
          object.geometry?.dispose();
          object.material?.dispose();
        }
      });
    }

    handRig.current = buildHandRig(dims);
    three.scene.add(handRig.current.root);
    frameRig();
  }, [dims, frameRig, three]);

  // Ensure first frame is centered once controls are ready.
  useEffect(() => {
    if (!controlsReady) return;
    frameRig();
  }, [controlsReady, frameRig]);

  // Apply pose updates and refresh labels.
  useEffect(() => {
    const rig = handRig.current;
    if (!rig) return;

    fingers.forEach((fingerState, index) => {
      const finger = rig.fingers[index];
      finger.mcp.rotation.z = deg2rad(clamp(fingerState.MCP, RANGES.MCP));
      finger.pip.rotation.z = deg2rad(clamp(fingerState.PIP, RANGES.PIP));
      finger.dip.rotation.z = deg2rad(clamp(fingerState.DIP, RANGES.DIP));
    });

    rig.wrist.dev.rotation.x = deg2rad(clamp(wrist.dev, RANGES.WRIST_DEV));
    rig.wrist.flex.rotation.z = deg2rad(clamp(wrist.flex, RANGES.WRIST_FLEX));

    const thumbRig = rig.thumb;
    thumbRig.cmcAbd.rotation.y = deg2rad(clamp(thumb.CMC_abd, RANGES.CMC_ABD));
    thumbRig.cmcFlex.rotation.z = -deg2rad(clamp(thumb.CMC_flex, RANGES.CMC_FLEX));
    thumbRig.cmcAxial.rotation.x = deg2rad(clamp(thumb.CMC_opp, RANGES.CMC_OPP));
    thumbRig.mcp.rotation.z = -deg2rad(clamp(thumb.MCP_flex, RANGES.THUMB_MCP_FLEX));
    thumbRig.ip.rotation.z = deg2rad(clamp(thumb.IP, RANGES.THUMB_IP));

    applyMainLabels(rig, fingers, thumb, wrist);
  }, [fingers, thumb, wrist]);

  // Highlight active articulation.
  useEffect(() => {
    const rig = handRig.current;
    if (!rig) return;

    const map = rig.dbgMap;
    Object.values(map).forEach(item => item.setVisible(false));

    const globalJoint = GLOBAL_DEBUG_KEY_TO_JOINT[debugKey];
    if (globalJoint) {
      ["D2", "D3", "D4", "D5"].forEach(digit => map[`${digit}_${globalJoint}`]?.setVisible(true));
      if (map[debugKey]?.label) map[debugKey].label.visible = true;
    } else if (debugKey !== "off" && map[debugKey]) {
      map[debugKey].setVisible(true);
    }

    const highlight = rig.highlight;
    highlight.all.forEach(mesh => {
      if (mesh.material && mesh.userData.baseColor) {
        mesh.material.color.copy(mesh.userData.baseColor);
        mesh.material.emissive?.set(0x000000);
      }
    });

    const targets = globalJoint
      ? ["D2", "D3", "D4", "D5"].flatMap(digit => highlight.map[`${digit}_${globalJoint}`] || [])
      : highlight.map[debugKey] || [];

    targets.forEach(mesh => {
      if (mesh.material) {
        mesh.material.color.set(0xffcc66);
        mesh.material.emissive?.set(0x553300);
      }
    });
  }, [debugKey]);

  return handRig;
}
