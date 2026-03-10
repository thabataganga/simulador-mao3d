import { setLabelText } from "../../three/helpers";
import { deg2rad, clamp } from "../../utils/math/core";
import { RANGES } from "../../constants/biomechanics";
import {
  mapClinicalThumbToRigRadians,
  measureThumbCmcGoniometryFromRig,
  resolveKapandjiOperationalPose,
} from "../../domain/thumb";
import { GONIOMETRY_EMIT_EPSILON } from "./constants";
import { updateCmcGoniometerOverlay, updateThumbOppositionOverlay } from "./overlays";

const formatDegree = value => String(Math.round(value)) + String.fromCharCode(176);

function formatDirectional(labelPositive, labelNegative, value) {
  const direction = value >= 0 ? labelPositive : labelNegative;
  return `${direction} ${formatDegree(Math.abs(value))}`;
}

export function applyMainLabels(rig, fingers, thumb, thumbClinical, thumbGoniometry, wrist) {
  const map = rig.dbgMap;
  setLabelText(map.GLOBAL_MCP?.label, `MCP: ${formatDegree(fingers[1].MCP)}`);
  setLabelText(map.GLOBAL_PIP?.label, `PIP: ${formatDegree(fingers[1].PIP)}`);
  setLabelText(map.GLOBAL_DIP?.label, `DIP: ${formatDegree(fingers[1].DIP)}`);
  setLabelText(map.WR_FLEX?.label, `Flex: ${formatDegree(wrist.flex)}`);
  setLabelText(map.WR_DEV?.label, `Desvio: ${formatDegree(wrist.dev)}`);

  const thumbLabels = rig.thumbLabels;
  if (!thumbLabels) return;

  const clinicalFlexExt = Number(thumbGoniometry?.flexExt?.clinicalTargetDeg ?? thumb.CMC_flexExt) || 0;
  const clinicalAbdAdd = Number(thumbGoniometry?.abdAdd?.clinicalTargetDeg ?? thumb.CMC_abdAdd) || 0;
  const clinicalOpp = Number(thumbClinical?.opp?.clinicalTargetDeg ?? thumb.CMC_opp) || 0;
  const kapandjiScale = thumbClinical?.opp?.clinicalEstimate?.scaleLabel || thumbClinical?.opp?.scaleLabel || null;

  setLabelText(thumbLabels.flexExt, `CMC: ${formatDirectional("flexao", "extensao", clinicalFlexExt)}`);
  setLabelText(thumbLabels.abdAdd, `CMC: ${formatDirectional("abducao", "aducao", clinicalAbdAdd)}`);
  setLabelText(
    thumbLabels.opp,
    kapandjiScale ? `CMC: ${kapandjiScale}` : `CMC: ${formatDirectional("oposicao", "retroposicao", clinicalOpp)}`,
  );
  setLabelText(thumbLabels.mcp, `MCP: ${formatDegree(thumb.MCP_flex)}`);
  setLabelText(thumbLabels.ip, `IP: ${formatDegree(thumb.IP)}`);
}

export function didGoniometryChange(previous, next, epsilon = GONIOMETRY_EMIT_EPSILON) {
  if (!next) return false;
  if (!previous) return true;

  const prevFlexExt = Number(previous.CMC_flexExt) || 0;
  const prevAbdAdd = Number(previous.CMC_abdAdd) || 0;
  const nextFlexExt = Number(next.CMC_flexExt) || 0;
  const nextAbdAdd = Number(next.CMC_abdAdd) || 0;

  return Math.abs(nextFlexExt - prevFlexExt) > epsilon || Math.abs(nextAbdAdd - prevAbdAdd) > epsilon;
}

export function applyPoseToRig(rig, fingers, thumb, thumbClinical, thumbGoniometry, wrist, debugKey, dims, viewport, cmcBaseline) {
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

  thumbRig.cmcFlexExt.rotation.z = thumbMapped.radians.cmcFlexExt;
  thumbRig.cmcAbdAdd.rotation.y = thumbMapped.radians.cmcAbdAdd;
  thumbRig.cmcPronation.rotation.x = thumbMapped.radians.cmcPronation;
  thumbRig.mcp.rotation.z = -thumbMapped.radians.mcpFlex;
  thumbRig.mcpAccessory.rotation.x = thumbMapped.radians.mcpAccessory;
  thumbRig.ip.rotation.z = -thumbMapped.radians.ipFlex;

  rig.root.updateMatrixWorld(true);
  const cmcMeasured = measureThumbCmcGoniometryFromRig(rig, { thumb, baseline: cmcBaseline });
  const safeCmcMeasured = cmcMeasured || { CMC_flexExt: 0, CMC_abdAdd: 0 };
  const kapandjiEstimatedLevel = updateThumbOppositionOverlay(rig, debugKey, dims, thumbClinical, viewport, thumb);
  const oppositionOperational = resolveKapandjiOperationalPose(kapandjiEstimatedLevel);
  const oppositionSignedDeg = Number(oppositionOperational.commandDeg) || 0;
  const oppositionMetric = {
    level: kapandjiEstimatedLevel,
    rigDirection: oppositionSignedDeg >= 0 ? "oposicao" : "retroposicao",
    rigMagnitudeDeg: Math.abs(oppositionSignedDeg),
  };
  applyMainLabels(rig, fingers, thumb, thumbClinical, thumbGoniometry, wrist);
  updateCmcGoniometerOverlay(rig, debugKey, dims, viewport);
  return {
    ...safeCmcMeasured,
    kapandjiEstimatedLevel,
    oppositionMetric,
  };
}