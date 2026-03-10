import { Vector3 } from "three";
import { RANGES } from "../../constants/biomechanics";
import { mapClinicalThumbToRigRadians } from "../../domain/thumb";
import { OPPOSITION_DEBUG_KEY } from "./constants";

function buildOppositionReferencePoints(rig, thumb) {
  const tipNode = rig?.tips?.thumb;
  const localFrame = rig?.thumb?.debug?.cmcOpp;
  const thumbRig = rig?.thumb;
  if (!tipNode || !localFrame || !thumbRig || !thumb) return null;

  const original = {
    cmcFlexExt: thumbRig.cmcFlexExt.rotation.z,
    cmcAbdAdd: thumbRig.cmcAbdAdd.rotation.y,
    cmcPronation: thumbRig.cmcPronation.rotation.x,
    mcp: thumbRig.mcp.rotation.z,
    mcpAccessory: thumbRig.mcpAccessory.rotation.x,
    ip: thumbRig.ip.rotation.z,
  };

  const [oppMin, oppMax] = RANGES.CMC_OPP;
  const step = (oppMax - oppMin) / 10;
  const points = [];
  for (let level = 0; level <= 10; level += 1) {
    const sampleThumb = {
      ...thumb,
      CMC_opp: oppMin + level * step,
    };
    const mapped = mapClinicalThumbToRigRadians(sampleThumb);

    thumbRig.cmcFlexExt.rotation.z = mapped.radians.cmcFlexExt;
    thumbRig.cmcAbdAdd.rotation.y = mapped.radians.cmcAbdAdd;
    thumbRig.cmcPronation.rotation.x = mapped.radians.cmcPronation;
    thumbRig.mcp.rotation.z = -mapped.radians.mcpFlex;
    thumbRig.mcpAccessory.rotation.x = mapped.radians.mcpAccessory;
    thumbRig.ip.rotation.z = -mapped.radians.ipFlex;

    rig.root.updateMatrixWorld(true);
    const tipLocal = localFrame.worldToLocal(tipNode.getWorldPosition(new Vector3()));
    points.push(tipLocal.clone());
  }

  thumbRig.cmcFlexExt.rotation.z = original.cmcFlexExt;
  thumbRig.cmcAbdAdd.rotation.y = original.cmcAbdAdd;
  thumbRig.cmcPronation.rotation.x = original.cmcPronation;
  thumbRig.mcp.rotation.z = original.mcp;
  thumbRig.mcpAccessory.rotation.x = original.mcpAccessory;
  thumbRig.ip.rotation.z = original.ip;
  rig.root.updateMatrixWorld(true);

  return points;
}

function estimateKapandjiFromRig(rig, points) {
  const tipNode = rig?.tips?.thumb;
  const localFrame = rig?.thumb?.debug?.cmcOpp;
  if (!tipNode || !localFrame || !Array.isArray(points) || points.length < 11) return 0;

  const tipLocal = localFrame.worldToLocal(tipNode.getWorldPosition(new Vector3()));
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distance = tipLocal.distanceTo(point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function computeOppositionLabelPosition(points, targetIndex) {
  const target = points?.[targetIndex];
  if (!target) return null;
  return target.clone().add(new Vector3(4.5, 7.5, 0));
}

export function updateThumbOppositionOverlay(rig, debugKey, dims, thumbClinical, viewport, thumb) {
  if (debugKey !== OPPOSITION_DEBUG_KEY) {
    const pkg = rig?.dbgMap?.[OPPOSITION_DEBUG_KEY];
    pkg?.setOppositionReference?.(null);
    pkg?.setLabelPosition?.(null);
    return Number(thumbClinical?.opp?.estimatedLevel) || 0;
  }

  const points = buildOppositionReferencePoints(rig, thumb);
  const estimatedLevel = estimateKapandjiFromRig(rig, points);
  const pkg = rig?.dbgMap?.[OPPOSITION_DEBUG_KEY];
  if (!pkg?.setOppositionReference) return estimatedLevel;

  if (!points) {
    pkg.setOppositionReference(null);
    pkg.setLabelPosition(null);
    return estimatedLevel;
  }

  const level = Number(thumbClinical?.opp?.estimatedLevel ?? estimatedLevel) || 0;
  pkg.setOppositionReference({
    points,
    targetIndex: level,
    pointRadius: (dims?.thumbWid?.[0] ?? 10) * 0.08,
    targetRadius: (dims?.thumbWid?.[0] ?? 10) * 0.13,
    viewport,
    lineWidthPx: 4.5,
  });
  pkg.setLabelPosition(computeOppositionLabelPosition(points, level));
  return estimatedLevel;
}
