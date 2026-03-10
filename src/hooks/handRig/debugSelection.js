import { GLOBAL_DEBUG_KEY_TO_JOINT } from "./constants";

const CMC_DEBUG_KEYS = new Set(["TH_CMC_ABD", "TH_CMC_FLEX", "TH_CMC_OPP"]);
const HIGHLIGHT_COLORS = Object.freeze({
  default: Object.freeze({ color: 0xffcc66, emissive: 0x553300 }),
  cmcJoint: Object.freeze({ color: 0x5ad7ff, emissive: 0x114455 }),
});

export function applyDebugSelection(rig, debugKey) {
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

  if (map.TH_CMC_FLEX?.axes) map.TH_CMC_FLEX.axes.visible = false;
  if (map.TH_CMC_ABD?.axes) map.TH_CMC_ABD.axes.visible = false;
  if (map.TH_CMC_OPP?.axes) map.TH_CMC_OPP.axes.visible = false;

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

  const isCmcKey = CMC_DEBUG_KEYS.has(debugKey);

  targets.forEach(mesh => {
    if (!mesh.material) return;
    const isCmcJoint = isCmcKey && mesh.userData?.highlightRole === "cmcJoint";
    const palette = isCmcJoint ? HIGHLIGHT_COLORS.cmcJoint : HIGHLIGHT_COLORS.default;
    mesh.material.color.set(palette.color);
    mesh.material.emissive?.set(palette.emissive);
  });
}

