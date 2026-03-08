import { normalizeSliderInput } from "./labeledSliderModel";

describe("LabeledSlider normalization", () => {
  test("rounds to nearest step and clamps in range", () => {
    expect(normalizeSliderInput("7", 0, 5, 0, 10)).toBe("5");
    expect(normalizeSliderInput("9", 0, 5, 0, 10)).toBe("10");
    expect(normalizeSliderInput("999", 0, 1, -10, 80)).toBe("80");
    expect(normalizeSliderInput("-999", 0, 1, -10, 80)).toBe("-10");
  });

  test("returns current value string for invalid input", () => {
    expect(normalizeSliderInput("abc", 12, 1, 0, 100)).toBe("12");
    expect(normalizeSliderInput("", 8, 1, 0, 100)).toBe("8");
  });
});

