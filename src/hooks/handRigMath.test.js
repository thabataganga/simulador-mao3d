jest.mock("../three/helpers", () => ({
  setLabelText: jest.fn(),
}));

import { setLabelText } from "../three/helpers";
import { applyMainLabels } from "./handRigMath";

describe("handRigMath opposition label", () => {
  test("renders opposition label in Kapandji scale when available", () => {
    const rig = {
      dbgMap: {
        GLOBAL_MCP: { label: {} },
        GLOBAL_PIP: { label: {} },
        GLOBAL_DIP: { label: {} },
        WR_FLEX: { label: {} },
        WR_DEV: { label: {} },
      },
      thumbLabels: {
        abd: {},
        flex: {},
        opp: {},
        mcp: {},
        ip: {},
      },
    };

    const fingers = [{}, { MCP: 10, PIP: 20, DIP: 30 }];
    const thumb = { CMC_abd: 45, CMC_flex: -12, CMC_opp: 24, MCP_flex: 10, IP: 5 };
    const thumbClinical = {
      opp: {
        scaleLabel: "Kapandji 5",
        clinicalEstimate: {
          scaleLabel: "Kapandji 5",
        },
      },
    };

    applyMainLabels(rig, fingers, thumb, thumbClinical, {}, { flex: 0, dev: 0 });

    expect(setLabelText).toHaveBeenCalledWith(rig.thumbLabels.opp, "CMC: Kapandji 5");
  });
});
