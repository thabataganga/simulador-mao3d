import { useCallback, useEffect, useRef } from "react";
import { Box3, Vector3 } from "three";
import { buildHandRig } from "../three/buildHandRig";
import { setLabelText } from "../three/helpers";
import { deg2rad, clamp } from "../utils";
import { RANGES } from "../constants";
import { mapClinicalThumbToRigRadians, measureThumbCmcGoniometryFromRig } from "../domain/thumb";


const GLOBAL_DEBUG_KEY_TO_JOINT = {
  GLOBAL_MCP: "MCP",
  GLOBAL_PIP: "PIP",
  GLOBAL_DIP: "DIP",
};

const formatDegree = value => String(Math.round(value)) + String.fromCharCode(176);

function formatDirectional(labelPositive, labelNegative, value) {
  const direction = value >= 0 ? labelPositive : labelNegative;
  return `${direction} ${formatDegree(Math.abs(value))}`;
}

function applyMainLabels(rig, fingers, thumb, wrist, cmcMeasured) {
  const map = rig.dbgMap;
  setLabelText(map.GLOBAL_MCP?.label, `MCP: ${formatDegree(fingers[1].MCP)}`);
  setLabelText(map.GLOBAL_PIP?.label, `PIP: ${formatDegree(fingers[1].PIP)}`);
  setLabelText(map.GLOBAL_DIP?.label, `DIP: ${formatDegree(fingers[1].DIP)}`);
  setLabelText(map.WR_FLEX?.label, `Flex: ${formatDegree(wrist.flex)}`);
  setLabelText(map.WR_DEV?.label, `Desvio: ${formatDegree(wrist.dev)}`);

  const thumbLabels = rig.thumbLabels;
  if (!thumbLabels) return;

  const measuredAbd = cmcMeasured?.CMC_abd ?? thumb.CMC_abd;
  const measuredFlex = cmcMeasured?.CMC_flex ?? thumb.CMC_flex;

  setLabelText(thumbLabels.abd, `CMC abd: ${formatDirectional("abducao", "aducao", measuredAbd)}`);
  setLabelText(thumbLabels.flex, `CMC: ${formatDirectional("flexao", "extensao", measuredFlex)}`);
  setLabelText(thumbLabels.opp, `CMC opp: ${formatDegree(thumb.CMC_opp)}`);
  setLabelText(thumbLabels.mcp, `MCP: ${formatDegree(thumb.MCP_flex)}`);
  setLabelText(thumbLabels.ip, `IP: ${formatDegree(thumb.IP)}`);
}

function applyPoseToRig(rig, fingers, thumb, wrist) {
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
  const thumbMapped = mapClinicalThumbToRigRadians(thumb);

  thumbRig.cmcAbd.rotation.z = thumbMapped.radians.cmcAbd;
  thumbRig.cmcFlex.rotation.y = thumbMapped.radians.cmcFlex;
  thumbRig.cmcPronation.rotation.x = thumbMapped.radians.cmcPronation;
  thumbRig.mcp.rotation.z = -thumbMapped.radians.mcpFlex;
  thumbRig.mcpAccessory.rotation.x = thumbMapped.radians.mcpAccessory;
  thumbRig.ip.rotation.z = -thumbMapped.radians.ipFlex;

  rig.root.updateMatrixWorld(true);
  const cmcMeasured = measureThumbCmcGoniometryFromRig(rig);
  applyMainLabels(rig, fingers, thumb, wrist, cmcMeasured);
  return cmcMeasured;
}

export function useHandRig({ three, orbitRef, controlsReady = false, dims, fingers, thumb, wrist, debugKey, onThumbGoniometry }) {
  const handRig = useRef(null);
  const hasInitialFrameRef = useRef(false);
  const lastPalmLengthRef = useRef(null);
  const poseRef = useRef({ fingers, thumb, wrist });

  useEffect(() => {
    poseRef.current = { fingers, thumb, wrist };
  }, [fingers, thumb, wrist]);

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

  // Rebuild rig whenever dimensions change, preserving current camera view.
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

    const currentPose = poseRef.current;
    const measured = applyPoseToRig(handRig.current, currentPose.fingers, currentPose.thumb, currentPose.wrist);
    if (measured && onThumbGoniometry) onThumbGoniometry(measured);

    const prevPalmLength = lastPalmLengthRef.current;
    const nextPalmLength = dims?.palm?.LENGTH || 0;
    const shouldRefit =
      prevPalmLength == null ||
      prevPalmLength <= 0 ||
      Math.abs(nextPalmLength - prevPalmLength) / prevPalmLength > 0.08;

    lastPalmLengthRef.current = nextPalmLength;
    if (controlsReady && shouldRefit) frameRig();
  }, [controlsReady, dims, frameRig, onThumbGoniometry, three]);

  // Ensure first frame is centered once controls are ready.
  useEffect(() => {
    if (!controlsReady || hasInitialFrameRef.current) return;
    frameRig();
    hasInitialFrameRef.current = true;
  }, [controlsReady, frameRig]);

  // Apply pose updates and refresh labels.
  useEffect(() => {
    const measured = applyPoseToRig(handRig.current, fingers, thumb, wrist);
    if (measured && onThumbGoniometry) onThumbGoniometry(measured);
  }, [fingers, onThumbGoniometry, thumb, wrist]);

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
