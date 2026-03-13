import { ANGULAR_CMC_DEBUG_KEYS, OPPOSITION_DEBUG_KEY } from "./constants";
import { updateCmcGoniometerOverlay } from "./cmcOverlay";
import { updateThumbOppositionOverlay } from "./oppositionOverlay";
import { applyDebugSelection } from "./debugSelection";

export { updateCmcGoniometerOverlay, updateThumbOppositionOverlay, applyDebugSelection };

export function syncHandRigOverlays({ rig, debugKey, dims, thumbClinical, viewport, thumb }) {
  if (!rig) return 0;

  const cmcKey = ANGULAR_CMC_DEBUG_KEYS.has(debugKey) ? debugKey : "off";
  const oppositionKey = debugKey === OPPOSITION_DEBUG_KEY ? debugKey : "off";

  updateCmcGoniometerOverlay(rig, cmcKey, dims, viewport);
  return updateThumbOppositionOverlay(rig, oppositionKey, dims, thumbClinical, viewport, thumb);
}

