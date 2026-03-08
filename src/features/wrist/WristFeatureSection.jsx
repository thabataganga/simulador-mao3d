import { AccordionItem } from "../../components/AccordionItem";
import { WristPanel } from "../../components/WristPanel";

export function WristFeatureSection({
  openPanel,
  onTogglePanel,
  wrist,
  onWrist,
  onHighlight,
  onClearPreset,
}) {
  return (
    <AccordionItem id="wrist" title="Punho" isOpen={openPanel === "wrist"} onToggle={onTogglePanel}>
      <WristPanel
        wrist={wrist}
        onWrist={onWrist}
        onHighlight={onHighlight}
        onClearPreset={onClearPreset}
      />
    </AccordionItem>
  );
}

