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

  const clinicalAbd = Number(thumbGoniometry?.abd?.clinicalTargetDeg ?? thumb.CMC_abd) || 0;
  const clinicalFlex = Number(thumbGoniometry?.flex?.clinicalTargetDeg ?? thumb.CMC_flex) || 0;
  const clinicalOpp = Number(thumbClinical?.opp?.clinicalTargetDeg ?? thumb.CMC_opp) || 0;
  const kapandjiScale = thumbClinical?.opp?.clinicalEstimate?.scaleLabel || thumbClinical?.opp?.scaleLabel || null;

  setLabelText(thumbLabels.abd, `CMC: ${formatDirectional("abducao", "aducao", clinicalAbd)}`);
  setLabelText(thumbLabels.flex, `CMC: ${formatDirectional("flexao", "extensao", clinicalFlex)}`);
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

  const prevAbd = Number(previous.CMC_abd) || 0;
  const prevFlex = Number(previous.CMC_flex) || 0;
  const nextAbd = Number(next.CMC_abd) || 0;
  const nextFlex = Number(next.CMC_flex) || 0;

  return Math.abs(nextAbd - prevAbd) > epsilon || Math.abs(nextFlex - prevFlex) > epsilon;
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

  thumbRig.cmcAbd.rotation.z = thumbMapped.radians.cmcAbd;
  thumbRig.cmcFlex.rotation.y = thumbMapped.radians.cmcFlex;
  thumbRig.cmcPronation.rotation.x = thumbMapped.radians.cmcPronation;
  thumbRig.mcp.rotation.z = -thumbMapped.radians.mcpFlex;
  thumbRig.mcpAccessory.rotation.x = thumbMapped.radians.mcpAccessory;
  thumbRig.ip.rotation.z = -thumbMapped.radians.ipFlex;

  rig.root.updateMatrixWorld(true);
  const cmcMeasured = measureThumbCmcGoniometryFromRig(rig, { thumb, baseline: cmcBaseline });
  const safeCmcMeasured = cmcMeasured || { CMC_abd: 0, CMC_flex: 0 };
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

