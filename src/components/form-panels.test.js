import { AnthropometryForm } from "./AnthropometryForm";
import { GripPanel } from "./GripPanel";

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
    const element = GripPanel({ grip: 30, globalMode: "pinch", onGlobalMode, onGrip });

    const [modeButtonsWrap, slider] = element.props.children;
    const [functionalButton, pinchButton] = modeButtonsWrap.props.children;

    expect(slider.props.label).toBe("Fechamento (pinca) 0-100");
    expect(slider.props.min).toBe(0);
    expect(slider.props.max).toBe(100);
    expect(slider.props.value).toBe(30);

    slider.props.onChange(88);
    expect(onGrip).toHaveBeenCalledWith(88);

    functionalButton.props.onClick();
    pinchButton.props.onClick();
    expect(onGlobalMode).toHaveBeenNthCalledWith(1, "functional");
    expect(onGlobalMode).toHaveBeenNthCalledWith(2, "pinch");
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
  });
});
