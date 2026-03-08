import { ANGULAR_CMC_DEBUG_KEYS, GLOBAL_DEBUG_KEY_TO_JOINT, OPPOSITION_DEBUG_KEY } from "./constants";
import { getViewportSize } from "./lifecycle";
import { updateCmcGoniometerOverlay } from "./cmcOverlay";
import { updateThumbOppositionOverlay } from "./oppositionOverlay";

export function applyDebugSelection(rig, debugKey, dims, thumbClinical, thumb, three) {
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

  if (!ANGULAR_CMC_DEBUG_KEYS.has(debugKey)) {
    map.TH_CMC_FLEX?.setGoniometer(null);
    map.TH_CMC_ABD?.setGoniometer(null);
    map.TH_CMC_FLEX?.setLabelPosition(null);
    map.TH_CMC_ABD?.setLabelPosition(null);
  } else {
    if (map.TH_CMC_FLEX?.axes) map.TH_CMC_FLEX.axes.visible = false;
    if (map.TH_CMC_ABD?.axes) map.TH_CMC_ABD.axes.visible = false;
    const viewport = getViewportSize(three);
    map.TH_CMC_FLEX?.setGoniometerResolution(viewport);
    map.TH_CMC_ABD?.setGoniometerResolution(viewport);
    updateCmcGoniometerOverlay(rig, debugKey, dims, viewport);
  }

  if (debugKey !== OPPOSITION_DEBUG_KEY) {
    map.TH_CMC_OPP?.setOppositionReference(null);
    map.TH_CMC_OPP?.setLabelPosition(null);
  } else {
    if (map.TH_CMC_OPP?.axes) map.TH_CMC_OPP.axes.visible = false;
    const viewport = getViewportSize(three);
    map.TH_CMC_OPP?.setOppositionReferenceResolution(viewport);
    updateThumbOppositionOverlay(rig, debugKey, dims, thumbClinical, viewport, thumb);
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
}
