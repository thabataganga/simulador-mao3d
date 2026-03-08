import { AccordionItem } from "../../components/AccordionItem";
import { GripPanel } from "../../components/GripPanel";

export function GlobalClosureSection({
  openPanel,
  onTogglePanel,
  grip,
  globalMode,
  onGlobalMode,
  onGrip,
  onClearHighlight,
}) {
  return (
    <AccordionItem id="global" title="Fechamento global" isOpen={openPanel === "global"} onToggle={onTogglePanel}>
      <GripPanel
        grip={grip}
        globalMode={globalMode}
        onGlobalMode={onGlobalMode}
        onGrip={onGrip}
        onClearHighlight={onClearHighlight}
      />
    </AccordionItem>
  );
}
