import { AccordionItem } from "../../components/AccordionItem";
import { ThumbPanel } from "../../components/ThumbPanel";

export function ThumbFeatureSection({
  openPanel,
  onTogglePanel,
  thumb,
  thumbGoniometry,
  thumbClinical,
  isExplorationMode,
  explorationKapandjiTarget,
  onThumbVal,
  onThumbCmcInput,
  onEnterOppositionExploration,
  onUpdateOppositionExploration,
  onRestoreUserInputData,
  onExitOppositionExploration,
  onHighlight,
  onClearHighlight,
  onClearPreset,
}) {
  return (
    <AccordionItem id="thumb" title="D1 - Polegar" isOpen={openPanel === "thumb"} onToggle={onTogglePanel}>
      <ThumbPanel
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
        onHighlight={onHighlight}
        onClearHighlight={onClearHighlight}
        onClearPreset={onClearPreset}
      />
    </AccordionItem>
  );
}

