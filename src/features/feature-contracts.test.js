import { PoseSetupControls, GlobalClosureSection } from "./pose-controls";
import { D2D5FeatureSection } from "./d2d5";
import { OrderedAccordions } from "./control-panel";
import { ThumbFeatureSection } from "./thumb";
import { WristFeatureSection } from "./wrist";
import Scene3DViewport from "./scene3d/Scene3DViewport";

jest.mock("../components/HandScene3D", () => ({
  __esModule: true,
  default: props => ({ type: "mock-hand-scene", props }),
}));

describe("feature contracts", () => {
  test("pose setup forwards callbacks", () => {
    const onSex = jest.fn();
    const onPresetFunctional = jest.fn();

    const element = PoseSetupControls({
      sex: "masculino",
      percentile: 50,
      age: 30,
      activePreset: "none",
      onSex,
      onPercentile: jest.fn(),
      onAge: jest.fn(),
      onPresetFunctional,
      onPresetNeutral: jest.fn(),
      onPresetZero: jest.fn(),
    });

    const [anthropometryForm, presetButtons] = element.props.children;
    anthropometryForm.props.onSex("feminino");
    presetButtons.props.onFunctional();

    expect(onSex).toHaveBeenCalledWith("feminino");
    expect(onPresetFunctional).toHaveBeenCalledTimes(1);
  });

  test("d2d5 and closure sections forward key callbacks", () => {
    const onUpdateGlobalD2D5 = jest.fn();
    const onGlobalMode = jest.fn();
    const onGrip = jest.fn();

    const d2d5Section = D2D5FeatureSection({
      openPanel: "global_d2d5",
      onTogglePanel: jest.fn(),
      globalD2D5: { MCP: 0, PIP: 0, DIP: 0 },
      onUpdateGlobalD2D5,
      onHighlight: jest.fn(),
      onClearPreset: jest.fn(),
    });

    expect(d2d5Section.props.id).toBe("global_d2d5");
    expect(d2d5Section.props.title).toBe("D2 a D5 - Controle Global");
    d2d5Section.props.children.props.onUpdate("MCP", 33);
    expect(onUpdateGlobalD2D5).toHaveBeenCalledWith("MCP", 33);

    const closureSection = GlobalClosureSection({
      openPanel: "global",
      onTogglePanel: jest.fn(),
      grip: 25,
      globalMode: "functional",
      onGlobalMode,
      onGrip,
      onClearHighlight: jest.fn(),
    });

    expect(closureSection.props.id).toBe("global");
    expect(closureSection.props.title).toBe("Fechamento global");
    closureSection.props.children.props.onGlobalMode("pinch");
    closureSection.props.children.props.onGrip(70);
    expect(onGlobalMode).toHaveBeenCalledWith("pinch");
    expect(onGrip).toHaveBeenCalledWith(70);
  });

  test("ordered accordions keep expected order", () => {
    const element = OrderedAccordions({
      openPanel: "none",
      onTogglePanel: jest.fn(),
      thumb: { CMC_flexExt: 0, CMC_opp: 0, CMC_abdAdd: 0, MCP_flex: 0, IP: 0 },
      thumbGoniometry: { flexExt: { inputDirection: "extensao", inputMagnitudeDeg: 0 }, abdAdd: { inputDirection: "abducao", inputMagnitudeDeg: 0 } },
      thumbClinical: { opp: { inputDirection: "oposicao", inputMagnitudeDeg: 0 } },
      isExplorationMode: false,
      explorationKapandjiTarget: 0,
      onThumbVal: jest.fn(),
      onThumbCmcInput: jest.fn(),
      onEnterOppositionExploration: jest.fn(),
      onUpdateOppositionExploration: jest.fn(),
      onRestoreUserInputData: jest.fn(),
      onExitOppositionExploration: jest.fn(),
      onThumbHighlight: jest.fn(),
      onThumbClearHighlight: jest.fn(),
      onThumbClearPreset: jest.fn(),
      globalD2D5: { MCP: 0, PIP: 0, DIP: 0 },
      onUpdateGlobalD2D5: jest.fn(),
      onGlobalHighlight: jest.fn(),
      onGlobalClearPreset: jest.fn(),
      wrist: { flex: 0, dev: 0 },
      onWrist: jest.fn(),
      onWristHighlight: jest.fn(),
      onWristClearPreset: jest.fn(),
      grip: 0,
      globalMode: "functional",
      onGlobalMode: jest.fn(),
      onGrip: jest.fn(),
      onGlobalClearHighlight: jest.fn(),
    });

    const children = element.props.children;
    expect(children[0].type).toBe(ThumbFeatureSection);
    expect(children[1].type).toBe(D2D5FeatureSection);
    expect(children[2].type).toBe(WristFeatureSection);
    expect(children[3].type).toBe(GlobalClosureSection);
  });

  test("thumb and wrist feature sections keep ids and titles", () => {
    const thumbSection = ThumbFeatureSection({
      openPanel: "thumb",
      onTogglePanel: jest.fn(),
      thumb: { CMC_flexExt: 0, CMC_opp: 0, CMC_abdAdd: 0, MCP_flex: 0, IP: 0 },
      thumbGoniometry: { flexExt: { inputDirection: "extensao", inputMagnitudeDeg: 0 }, abdAdd: { inputDirection: "abducao", inputMagnitudeDeg: 0 } },
      thumbClinical: { opp: { inputDirection: "oposicao", inputMagnitudeDeg: 0 } },
      isExplorationMode: false,
      explorationKapandjiTarget: 0,
      onThumbVal: jest.fn(),
      onThumbCmcInput: jest.fn(),
      onEnterOppositionExploration: jest.fn(),
      onUpdateOppositionExploration: jest.fn(),
      onRestoreUserInputData: jest.fn(),
      onExitOppositionExploration: jest.fn(),
      onHighlight: jest.fn(),
      onClearHighlight: jest.fn(),
      onClearPreset: jest.fn(),
    });

    expect(thumbSection.props.id).toBe("thumb");
    expect(thumbSection.props.title).toBe("D1 - Polegar");

    const wristSection = WristFeatureSection({
      openPanel: "wrist",
      onTogglePanel: jest.fn(),
      wrist: { flex: 0, dev: 0 },
      onWrist: jest.fn(),
      onHighlight: jest.fn(),
      onClearPreset: jest.fn(),
    });

    expect(wristSection.props.id).toBe("wrist");
    expect(wristSection.props.title).toBe("Punho");
  });

  test("scene3d feature keeps viewport contract", () => {
    const element = Scene3DViewport({
      sceneInput: { dims: {}, fingers: [], thumb: {}, wrist: {} },
      thumbClinical: {},
      thumbGoniometry: {},
      debugKey: "off",
      onThumbGoniometry: jest.fn(),
      onOppositionEstimate: jest.fn(),
    });

    expect(typeof element.type).toBe("function");
    const rendered = element.type(element.props);
    expect(rendered.type).toBe("mock-hand-scene");
    expect(rendered.props.debugKey).toBe("off");
    expect(rendered.props.sceneInput).toEqual({ dims: {}, fingers: [], thumb: {}, wrist: {} });
  });
});
