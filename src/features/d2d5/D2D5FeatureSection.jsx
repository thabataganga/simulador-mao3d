import { AccordionItem } from "../../components/AccordionItem";
import { GlobalD2D5Panel } from "../../components/GlobalD2D5Panel";

export function D2D5FeatureSection({
  openPanel,
  onTogglePanel,
  globalD2D5,
  onUpdateGlobalD2D5,
  onHighlight,
  onClearPreset,
}) {
  return (
    <AccordionItem id="global_d2d5" title="D2 a D5 - Controle Global" isOpen={openPanel === "global_d2d5"} onToggle={onTogglePanel}>
      <GlobalD2D5Panel
        globalD2D5={globalD2D5}
        onUpdate={onUpdateGlobalD2D5}
        onHighlight={onHighlight}
        onClearPreset={onClearPreset}
      />
    </AccordionItem>
  );
}
