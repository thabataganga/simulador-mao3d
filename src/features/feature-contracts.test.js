import { PoseSetupControls, GlobalClosureSection, buildPoseSetupProps } from "./pose-controls";
import { D2D5FeatureSection } from "./d2d5";
import { OrderedAccordions, buildOrderedAccordionsProps, nextOpenPanel, shouldClearDebugForPanel } from "./control-panel";
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
      state: {
        sex: "masculino",
        percentile: 50,
        age: 30,
        activePreset: "none",
      },
      actions: {
        onSex,
        onPercentile: jest.fn(),
        onAge: jest.fn(),
        onPresetFunctional,
        onPresetNeutral: jest.fn(),
        onPresetZero: jest.fn(),
      },
    });

    const [anthropometryForm, presetButtons] = element.props.children;
    anthropometryForm.props.onSex("feminino");
    presetButtons.props.onFunctional();

    expect(onSex).toHaveBeenCalledWith("feminino");
    expect(onPresetFunctional).toHaveBeenCalledTimes(1);
  });

  test("pose/control adapters and ui rules expose stable contracts", () => {
    const poseState = {
      sex: "masculino",
      percentile: 50,
      age: 30,
      activePreset: "none",
      thumb: {},
      thumbGoniometry: {},
      thumbClinical: {},
      isExplorationMode: false,
      explorationKapandjiTarget: 0,
      globalD2D5: { MCP: 0, PIP: 0, DIP: 0 },
      wrist: { flex: 0, dev: 0 },
      grip: 0,
      globalMode: "functional",
    };

    const poseActions = {
      setSex: jest.fn(),
      setPercentile: jest.fn(),
      setAge: jest.fn(),
      presetFunctional: jest.fn(),
      presetNeutral: jest.fn(),
      presetZero: jest.fn(),
      setThumbVal: jest.fn(),
      setThumbCmcInput: jest.fn(),
      enterOppositionExploration: jest.fn(),
      updateOppositionExploration: jest.fn(),
      restoreUserInputData: jest.fn(),
      exitOppositionExploration: jest.fn(),
      updateGlobalD2D5: jest.fn(),
      setWrist: jest.fn(),
    };

    const poseSetupProps = buildPoseSetupProps({ poseState, poseActions });
    expect(poseSetupProps.state.sex).toBe("masculino");
    expect(typeof poseSetupProps.actions.onPresetNeutral).toBe("function");

    const accordionsProps = buildOrderedAccordionsProps({
      poseState,
      poseActions,
      openPanel: "none",
      onTogglePanel: jest.fn(),
      onGlobalMode: jest.fn(),
      onGrip: jest.fn(),
      onClearPreset: jest.fn(),
      onSetDebugKey: jest.fn(),
      onClearDebugKey: jest.fn(),
    });

    expect(accordionsProps).toHaveProperty("state");
    expect(accordionsProps).toHaveProperty("actions");
    expect(accordionsProps).toHaveProperty("ui");
    expect(nextOpenPanel("none", "thumb")).toBe("thumb");
    expect(nextOpenPanel("thumb", "thumb")).toBe("none");
    expect(shouldClearDebugForPanel("global")).toBe(true);
    expect(shouldClearDebugForPanel("thumb")).toBe(false);
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
      state: {
        openPanel: "none",
        thumb: { CMC_abd: 0, CMC_opp: 0, CMC_flex: 0, MCP_flex: 0, IP: 0 },
        thumbGoniometry: { abd: { inputDirection: "abducao", inputMagnitudeDeg: 0 }, flex: { inputDirection: "extensao", inputMagnitudeDeg: 0 } },
        thumbClinical: { opp: { inputDirection: "oposicao", inputMagnitudeDeg: 0 } },
        isExplorationMode: false,
        explorationKapandjiTarget: 0,
        globalD2D5: { MCP: 0, PIP: 0, DIP: 0 },
        wrist: { flex: 0, dev: 0 },
        grip: 0,
        globalMode: "functional",
      },
      actions: {
        onTogglePanel: jest.fn(),
        onThumbVal: jest.fn(),
        onThumbCmcInput: jest.fn(),
        onEnterOppositionExploration: jest.fn(),
        onUpdateOppositionExploration: jest.fn(),
        onRestoreUserInputData: jest.fn(),
        onExitOppositionExploration: jest.fn(),
        onUpdateGlobalD2D5: jest.fn(),
        onWrist: jest.fn(),
        onGlobalMode: jest.fn(),
        onGrip: jest.fn(),
      },
      ui: {
        onThumbHighlight: jest.fn(),
        onGlobalHighlight: jest.fn(),
        onWristHighlight: jest.fn(),
        onThumbClearHighlight: jest.fn(),
        onGlobalClearHighlight: jest.fn(),
        onThumbClearPreset: jest.fn(),
        onGlobalClearPreset: jest.fn(),
        onWristClearPreset: jest.fn(),
      },
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
      thumb: { CMC_abd: 0, CMC_opp: 0, CMC_flex: 0, MCP_flex: 0, IP: 0 },
      thumbGoniometry: { abd: { inputDirection: "abducao", inputMagnitudeDeg: 0 }, flex: { inputDirection: "extensao", inputMagnitudeDeg: 0 } },
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
  test("feature adapters forward behavior callbacks through grouped contracts", () => {
    const poseState = {
      sex: "masculino",
      percentile: 50,
      age: 25,
      activePreset: "none",
      thumb: {},
      thumbGoniometry: {},
      thumbClinical: {},
      isExplorationMode: false,
      explorationKapandjiTarget: 0,
      globalD2D5: { MCP: 0, PIP: 0, DIP: 0 },
      wrist: { flex: 0, dev: 0 },
      grip: 0,
      globalMode: "functional",
    };

    const poseActions = {
      setSex: jest.fn(),
      setPercentile: jest.fn(),
      setAge: jest.fn(),
      presetFunctional: jest.fn(),
      presetNeutral: jest.fn(),
      presetZero: jest.fn(),
      setThumbVal: jest.fn(),
      setThumbCmcInput: jest.fn(),
      enterOppositionExploration: jest.fn(),
      updateOppositionExploration: jest.fn(),
      restoreUserInputData: jest.fn(),
      exitOppositionExploration: jest.fn(),
      updateGlobalD2D5: jest.fn(),
      setWrist: jest.fn(),
    };

    const onSetDebugKey = jest.fn();
    const onClearDebugKey = jest.fn();
    const onClearPreset = jest.fn();
    const onGlobalMode = jest.fn();
    const onGrip = jest.fn();

    const poseProps = buildPoseSetupProps({ poseState, poseActions });
    poseProps.actions.onPresetNeutral();
    poseProps.actions.onSex("feminino");

    expect(poseActions.presetNeutral).toHaveBeenCalledTimes(1);
    expect(poseActions.setSex).toHaveBeenCalledWith("feminino");

    const accordionProps = buildOrderedAccordionsProps({
      poseState,
      poseActions,
      openPanel: "thumb",
      onTogglePanel: jest.fn(),
      onGlobalMode,
      onGrip,
      onClearPreset,
      onSetDebugKey,
      onClearDebugKey,
    });

    accordionProps.actions.onThumbVal("CMC_abd", 15);
    accordionProps.actions.onThumbCmcInput("CMC_flex", "extensao", 10);
    accordionProps.actions.onGlobalMode("pinch");
    accordionProps.actions.onGrip(42);

    accordionProps.ui.onThumbHighlight("TH_CMC_ABD");
    accordionProps.ui.onThumbClearHighlight();
    accordionProps.ui.onGlobalClearPreset();

    expect(poseActions.setThumbVal).toHaveBeenCalledWith("CMC_abd", 15);
    expect(poseActions.setThumbCmcInput).toHaveBeenCalledWith("CMC_flex", "extensao", 10);
    expect(onGlobalMode).toHaveBeenCalledWith("pinch");
    expect(onGrip).toHaveBeenCalledWith(42);
    expect(onSetDebugKey).toHaveBeenCalledWith("TH_CMC_ABD");
    expect(onClearDebugKey).toHaveBeenCalledTimes(1);
    expect(onClearPreset).toHaveBeenCalledTimes(1);
  });
});


