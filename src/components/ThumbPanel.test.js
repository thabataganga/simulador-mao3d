import { ThumbPanel } from "./ThumbPanel";

function baseProps(overrides = {}) {
  return {
    thumb: { CMC_flexExt: 0, CMC_opp: 10, CMC_abdAdd: 0, MCP_flex: 5, IP: 2 },
    thumbGoniometry: {
      flexExt: { inputDirection: "extensao", inputMagnitudeDeg: 0, direction: "extensao", magnitudeDeg: 0 },
      abdAdd: { inputDirection: "abducao", inputMagnitudeDeg: 0, direction: "abducao", magnitudeDeg: 0 },
    },
    thumbClinical: {
      opp: {
        inputDirection: "oposicao",
        inputMagnitudeDeg: 10,
        rigDirection: "oposicao",
        rigMagnitudeDeg: 10,
        scaleLabel: "Kapandji 4",
        estimatedLabel: "Contato radial distal",
        functionalSummary: "oposicao parcial para contato lateral/radial",
      },
    },
    isExplorationMode: true,
    explorationKapandjiTarget: 10,
    onThumbVal: jest.fn(),
    onThumbCmcInput: jest.fn(),
    onEnterOppositionExploration: jest.fn(),
    onUpdateOppositionExploration: jest.fn(),
    onRestoreUserInputData: jest.fn(),
    onExitOppositionExploration: jest.fn(),
    onHighlight: jest.fn(),
    onClearHighlight: jest.fn(),
    onClearPreset: jest.fn(),
    ...overrides,
  };
}

describe("ThumbPanel structure and callbacks", () => {
  test("keeps configured panel order", () => {
    const elements = ThumbPanel(baseProps());
    expect(elements).toHaveLength(5);

    expect(elements[0].props.axis).toBe("CMC_abdAdd");
    expect(elements[1].props.axis).toBe("CMC_flexExt");
    expect(elements[3].props.label).toContain("MCP");
    expect(elements[4].props.label).toContain("IP");
  });

  test("does not auto-highlight opposition on mount", () => {
    const onHighlight = jest.fn();

    ThumbPanel(baseProps({ onHighlight }));

    expect(onHighlight).not.toHaveBeenCalled();
  });

  test("shows CMC opposition read-only card and keeps exploration controls", () => {
    const onUpdateOppositionExploration = jest.fn();
    const onClearPreset = jest.fn();
    const onHighlight = jest.fn();
    const onClearHighlight = jest.fn();

    const elements = ThumbPanel(
      baseProps({
        isExplorationMode: true,
        onUpdateOppositionExploration,
        onClearPreset,
        onHighlight,
        onClearHighlight,
      }),
    );

    const oppGroup = elements[2];
    const oppInfoCard = oppGroup.props.children[0];
    const explorationPanel = oppGroup.props.children[1];

    expect(oppInfoCard.props.clinical.scaleLabel).toBe("Kapandji 4");
    oppInfoCard.props.onHighlight();
    expect(onHighlight).toHaveBeenCalledWith("TH_CMC_OPP");

    explorationPanel.props.onUpdate(8);
    expect(onUpdateOppositionExploration).toHaveBeenCalledWith(8);
    expect(onClearPreset).toHaveBeenCalledTimes(1);

    oppGroup.props.onMouseLeave();
    expect(onClearHighlight).not.toHaveBeenCalled();
  });

  test("clears highlight on mouse leave when exploration is inactive", () => {
    const onClearHighlight = jest.fn();
    const elements = ThumbPanel(baseProps({ isExplorationMode: false, onClearHighlight }));

    const oppGroup = elements[2];
    oppGroup.props.onMouseLeave();

    expect(onClearHighlight).toHaveBeenCalledTimes(1);
  });

  test("exit exploration clears highlight", () => {
    const onExitOppositionExploration = jest.fn();
    const onClearHighlight = jest.fn();
    const elements = ThumbPanel(baseProps({ onExitOppositionExploration, onClearHighlight }));

    const explorationPanel = elements[2].props.children[1];
    explorationPanel.props.onExit();

    expect(onExitOppositionExploration).toHaveBeenCalledTimes(1);
    expect(onClearHighlight).toHaveBeenCalledTimes(1);
  });

  test("non-CMC sliders clear preset and forward value", () => {
    const onThumbVal = jest.fn();
    const onClearPreset = jest.fn();
    const elements = ThumbPanel(baseProps({ onThumbVal, onClearPreset }));

    const mcpSlider = elements[3];
    mcpSlider.props.onChange(22);

    expect(onThumbVal).toHaveBeenCalledWith("MCP_flex", 22);
    expect(onClearPreset).toHaveBeenCalledTimes(1);
  });
});
