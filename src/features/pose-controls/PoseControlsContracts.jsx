import { AccordionItem as AccordionItemView } from "../../components/AccordionItem";
import { AnthropometryForm as AnthropometryFormView } from "../../components/AnthropometryForm";
import { PresetButtons as PresetButtonsView } from "../../components/PresetButtons";
import { GlobalD2D5Panel as GlobalD2D5PanelView } from "../../components/GlobalD2D5Panel";
import { GripPanel as GripPanelView } from "../../components/GripPanel";

export function AccordionItem(props) {
  return <AccordionItemView {...props} />;
}

export function AnthropometryForm(props) {
  return <AnthropometryFormView {...props} />;
}

export function PresetButtons(props) {
  return <PresetButtonsView {...props} />;
}

export function GlobalD2D5Panel(props) {
  return <GlobalD2D5PanelView {...props} />;
}

export function GripPanel(props) {
  return <GripPanelView {...props} />;
}
