import { AnthropometryForm } from "./AnthropometryForm";
import { GripPanel } from "./GripPanel";
import { ThumbPanel } from "./ThumbPanel";

function getControl(wrapperElement) {
  return wrapperElement.props.children[1];
}

describe("AnthropometryForm", () => {
  test("calls callbacks with normalized values", () => {
    const onSex = jest.fn();
    const onPercentile = jest.fn();
    const onAge = jest.fn();

    const element = AnthropometryForm({
      sex: "masculino",
      percentile: 50,
      age: 25,
      onSex,
      onPercentile,
      onAge,
    });

    const [sexWrap, percentileWrap, ageWrap] = element.props.children;

    const sexSelect = getControl(sexWrap);
    sexSelect.props.onChange({ target: { value: "feminino" } });

    const percentileSelect = getControl(percentileWrap);
    percentileSelect.props.onChange({ target: { value: "75" } });

    const ageInput = getControl(ageWrap);
    ageInput.props.onChange({ target: { value: "40" } });

    expect(onSex).toHaveBeenCalledWith("feminino");
    expect(onPercentile).toHaveBeenCalledWith(75);
    expect(onAge).toHaveBeenCalledWith(40);
  });
});

describe("GripPanel", () => {
  test("uses pinch label and wires slider callback", () => {
    const onGrip = jest.fn();
    const onGlobalMode = jest.fn();
    const onClearHighlight = jest.fn();
    const element = GripPanel({ grip: 30, globalMode: "pinch", onGlobalMode, onGrip, onClearHighlight });

    const [modeButtonsWrap, slider] = element.props.children;
    const [functionalButton, pinchButton] = modeButtonsWrap.props.children;

    expect(slider.props.label).toBe("Fechamento (pinca) 0-100");
    expect(slider.props.min).toBe(0);
    expect(slider.props.max).toBe(100);
    expect(slider.props.value).toBe(30);
    expect(slider.props.unit).toBe("%");

    slider.props.onChange(88);
    expect(onGrip).toHaveBeenCalledWith(88);
    expect(onClearHighlight).toHaveBeenCalledTimes(1);

    functionalButton.props.onClick();
    pinchButton.props.onClick();
    expect(onGlobalMode).toHaveBeenNthCalledWith(1, "functional");
    expect(onGlobalMode).toHaveBeenNthCalledWith(2, "pinch");
    expect(onClearHighlight).toHaveBeenCalledTimes(3);
  });

  test("uses functional label when globalMode is functional", () => {
    const element = GripPanel({
      grip: 10,
      globalMode: "functional",
      onGlobalMode: () => {},
      onGrip: () => {},
    });
    const slider = element.props.children[1];
    expect(slider.props.label).toBe("Fechamento (funcional) 0-100");
    expect(slider.props.unit).toBe("%");
  });
});

describe("ThumbPanel", () => {
  test("shows read-only opposition section when exploration is off", () => {
    const onEnterOppositionExploration = jest.fn();
    const onClearPreset = jest.fn();
    const onHighlight = jest.fn();

    const elements = ThumbPanel({
      thumb: { CMC_abd: 0, CMC_opp: 34, CMC_flex: 0, MCP_flex: 0, IP: 0 },
      thumbGoniometry: {
        abd: { inputDirection: "abducao", inputMagnitudeDeg: 0, direction: "abducao", magnitudeDeg: 0, saturated: false },
        flex: { inputDirection: "extensao", inputMagnitudeDeg: 0, direction: "extensao", magnitudeDeg: 0, saturated: false },
      },
      thumbClinical: {
        opp: {
          inputDirection: "oposicao",
          inputMagnitudeDeg: 34,
          rigDirection: "oposicao",
          rigMagnitudeDeg: 34,
          scaleLabel: "Kapandji 6",
          estimatedLabel: "Oposicao palmar media",
        },
      },
      isExplorationMode: false,
      explorationOppositionIntensity: 0,
      onThumbVal: jest.fn(),
      onThumbCmcInput: jest.fn(),
      onThumbOppInput: jest.fn(),
      onEnterOppositionExploration,
      onUpdateOppositionExploration: jest.fn(),
      onRestoreUserInputData: jest.fn(),
      onExitOppositionExploration: jest.fn(),
      onHighlight,
      onClearPreset,
    });

    const oppGroup = elements[2];
    expect(oppGroup.props.children[0]).toBeNull();
    const explorationPanel = oppGroup.props.children[1];
    explorationPanel.props.onEnter();

    expect(onEnterOppositionExploration).toHaveBeenCalledTimes(1);
    expect(onClearPreset).toHaveBeenCalledTimes(1);
  });

  test("shows editable opposition slider when exploration is on", () => {
    const onThumbOppInput = jest.fn();
    const onUpdateOppositionExploration = jest.fn();
    const onRestoreUserInputData = jest.fn();
    const onExitOppositionExploration = jest.fn();
    const onClearPreset = jest.fn();

    const elements = ThumbPanel({
      thumb: { CMC_abd: 0, CMC_opp: 34, CMC_flex: 0, MCP_flex: 0, IP: 0 },
      thumbGoniometry: {
        abd: { inputDirection: "abducao", inputMagnitudeDeg: 0 },
        flex: { inputDirection: "extensao", inputMagnitudeDeg: 0 },
      },
      thumbClinical: {
        opp: {
          inputDirection: "oposicao",
          inputMagnitudeDeg: 34,
          rigDirection: "oposicao",
          rigMagnitudeDeg: 34,
          scaleLabel: "Kapandji 6",
          estimatedLabel: "Oposicao",
        },
      },
      isExplorationMode: true,
      explorationOppositionIntensity: 12,
      onThumbVal: jest.fn(),
      onThumbCmcInput: jest.fn(),
      onThumbOppInput,
      onEnterOppositionExploration: jest.fn(),
      onUpdateOppositionExploration,
      onRestoreUserInputData,
      onExitOppositionExploration,
      onHighlight: jest.fn(),
      onClearPreset,
    });

    const oppGroup = elements[2];
    const oppControl = oppGroup.props.children[0];
    expect(oppControl.props.axis).toBe("CMC_opp");
    oppControl.props.onApply("CMC_opp", "retroposicao", 8);

    const explorationPanel = oppGroup.props.children[1];
    explorationPanel.props.onUpdate(15);
    explorationPanel.props.onRestore();
    explorationPanel.props.onExit();

    expect(onThumbOppInput).toHaveBeenCalledWith("CMC_opp", "retroposicao", 8);
    expect(onUpdateOppositionExploration).toHaveBeenCalledWith(15);
    expect(onRestoreUserInputData).toHaveBeenCalledTimes(1);
    expect(onExitOppositionExploration).toHaveBeenCalledTimes(1);
    expect(onClearPreset).toHaveBeenCalledTimes(2);
  });
});

