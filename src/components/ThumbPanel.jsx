import { RANGES } from "../constants/biomechanics";
import { THUMB_SLIDER_CONFIG } from "../constants/uiConfig";
import { LabeledSlider } from "./LabeledSlider";
import { DirectionMagnitudeSlider } from "./thumbPanel/DirectionMagnitudeSlider";
import { OppInfoCard } from "./thumbPanel/OppInfoCard";
import { OppositionExplorationPanel } from "./thumbPanel/OppositionExplorationPanel";

export function ThumbPanel({
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
  const panelOrder = ["CMC_flex", "CMC_abd", "CMC_opp", "MCP_flex", "IP"];
  const orderedItems = panelOrder
    .map(key => THUMB_SLIDER_CONFIG.find(item => item.key === key))
    .filter(Boolean);

  return orderedItems.map(item => {
    const [min, max] = RANGES[item.rangeKey];

    if (item.key === "CMC_abd") {
      return (
        <DirectionMagnitudeSlider
          key={item.key}
          axis="CMC_abd"
          label="CMC Abd/Aducao"
          clinical={thumbGoniometry.abd}
          positiveDirection="abducao"
          negativeDirection="aducao"
          min={min}
          max={max}
          onApply={(axis, direction, magnitude) => {
            onThumbCmcInput(axis, direction, magnitude);
            onClearPreset();
          }}
          onHighlight={() => onHighlight(item.debugKey)}
        />
      );
    }

    if (item.key === "CMC_flex") {
      return (
        <DirectionMagnitudeSlider
          key={item.key}
          axis="CMC_flex"
          label="CMC Flexao/Extensao"
          clinical={thumbGoniometry.flex}
          positiveDirection="flexao"
          negativeDirection="extensao"
          min={min}
          max={max}
          onApply={(axis, direction, magnitude) => {
            onThumbCmcInput(axis, direction, magnitude);
            onClearPreset();
          }}
          onHighlight={() => onHighlight(item.debugKey)}
          negativeFirst
        />
      );
    }

    if (item.key === "CMC_opp") {
      return (
        <div
          key={item.key}
          onMouseLeave={() => {
            if (!isExplorationMode) onClearHighlight?.();
          }}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget) && !isExplorationMode) onClearHighlight?.();
          }}
        >
          <OppInfoCard
            clinical={thumbClinical.opp}
            onHighlight={() => onHighlight(item.debugKey)}
          />
          <OppositionExplorationPanel
            isExplorationMode={isExplorationMode}
            kapandjiTarget={explorationKapandjiTarget}
            onEnter={() => {
              onEnterOppositionExploration();
              onClearPreset();
            }}
            onUpdate={value => {
              onUpdateOppositionExploration(value);
              onClearPreset();
            }}
            onRestore={onRestoreUserInputData}
            onExit={() => {
              onExitOppositionExploration();
              onClearHighlight?.();
            }}
            onHighlight={() => onHighlight(item.debugKey)}
          />
        </div>
      );
    }

    return (
      <LabeledSlider
        key={item.key}
        label={`${item.label} (${min}..${max >= 0 ? `+${max}` : max})`}
        min={min}
        max={max}
        value={thumb[item.key]}
        onChange={value => {
          onThumbVal(item.key, value);
          onClearPreset();
        }}
        leftHint={item.leftHint}
        rightHint={item.rightHint}
        onHighlight={() => onHighlight(item.debugKey)}
      />
    );
  });
}
