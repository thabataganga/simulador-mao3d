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
  test("uses pinch label when globalMode is pinch", () => {
    const onGrip = jest.fn();
    const element = GripPanel({ grip: 30, globalMode: "pinch", onGrip });

    expect(element.props.label).toBe("Fechamento (pinça) 0-100");
    expect(element.props.min).toBe(0);
    expect(element.props.max).toBe(100);
    expect(element.props.value).toBe(30);

    element.props.onChange(88);
    expect(onGrip).toHaveBeenCalledWith(88);
  });

  test("uses functional label when globalMode is functional", () => {
    const element = GripPanel({ grip: 10, globalMode: "functional", onGrip: () => {} });
    expect(element.props.label).toBe("Fechamento (funcional) 0-100");
  });
});
