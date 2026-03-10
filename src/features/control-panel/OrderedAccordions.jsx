import { ThumbFeatureSection } from "../thumb";
import { D2D5FeatureSection } from "../d2d5";
import { GlobalClosureSection } from "../pose-controls";
import { WristFeatureSection } from "../wrist";

export function OrderedAccordions({ state, actions, ui }) {
  const {
    openPanel,
    thumb,
    thumbGoniometry,
    thumbClinical,
    isExplorationMode,
    explorationKapandjiTarget,
    globalD2D5,
    wrist,
    grip,
    globalMode,
  } = state;

  const {
    onTogglePanel,
    onThumbVal,
    onThumbCmcInput,
    onEnterOppositionExploration,
    onUpdateOppositionExploration,
    onRestoreUserInputData,
    onExitOppositionExploration,
    onUpdateGlobalD2D5,
    onWrist,
    onGlobalMode,
    onGrip,
  } = actions;

  const {
    onThumbHighlight,
    onGlobalHighlight,
    onWristHighlight,
    onThumbClearHighlight,
    onGlobalClearHighlight,
    onThumbClearPreset,
    onGlobalClearPreset,
    onWristClearPreset,
  } = ui;

  return (
    <>
      <ThumbFeatureSection
        openPanel={openPanel}
        onTogglePanel={onTogglePanel}
        thumb={thumb}
        thumbGoniometry={thumbGoniometry}
        thumbClinical={thumbClinical}
        isExplorationMode={isExplorationMode}
        explorationKapandjiTarget={explorationKapandjiTarget}
        onThumbVal={onThumbVal}
        onThumbCmcInput={onThumbCmcInput}
        onEnterOppositionExploration={onEnterOppositionExploration}
        onUpdateOppositionExploration={onUpdateOppositionExploration}
        onRestoreUserInputData={onRestoreUserInputData}
        onExitOppositionExploration={onExitOppositionExploration}
        onHighlight={onThumbHighlight}
        onClearHighlight={onThumbClearHighlight}
        onClearPreset={onThumbClearPreset}
      />

      <D2D5FeatureSection
        openPanel={openPanel}
        onTogglePanel={onTogglePanel}
        globalD2D5={globalD2D5}
        onUpdateGlobalD2D5={onUpdateGlobalD2D5}
        onHighlight={onGlobalHighlight}
        onClearPreset={onGlobalClearPreset}
      />

      <WristFeatureSection
        openPanel={openPanel}
        onTogglePanel={onTogglePanel}
        wrist={wrist}
        onWrist={onWrist}
        onHighlight={onWristHighlight}
        onClearPreset={onWristClearPreset}
      />

      <GlobalClosureSection
        openPanel={openPanel}
        onTogglePanel={onTogglePanel}
        grip={grip}
        globalMode={globalMode}
        onGlobalMode={onGlobalMode}
        onGrip={onGrip}
        onClearHighlight={onGlobalClearHighlight}
      />
    </>
  );
}
