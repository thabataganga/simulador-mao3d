export function nextOpenPanel(currentOpenPanel, panelId) {
  return currentOpenPanel === panelId ? "none" : panelId;
}

export function shouldClearDebugForPanel(panelId) {
  return panelId === "global";
}

export function clearDebug(setDebugKey) {
  setDebugKey("off");
}
