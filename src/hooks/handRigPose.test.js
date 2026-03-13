jest.mock("../three/helpers", () => ({
  setLabelText: jest.fn(),
}));

jest.mock("../domain/thumb", () => ({
  mapClinicalThumbToRigRadians: jest.fn(() => ({
    radians: {
      cmcAbd: 0,
      cmcFlex: 0,
      cmcPronation: 0,
      mcpFlex: 0,
      mcpAccessory: 0,
      ipFlex: 0,
    },
  })),
  measureThumbCmcGoniometryFromRig: jest.fn(() => ({ CMC_abd: 0, CMC_flex: 0 })),
  resolveKapandjiOperationalPose: jest.fn(() => ({ commandDeg: 0 })),
}));

import { setLabelText } from "../three/helpers";
import { applyMainLabels, applyPoseToRig } from "./handRig/pose";

describe("handRig pose opposition label", () => {
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

  test("ignores partial label input without throwing", () => {
    expect(() => applyMainLabels({ dbgMap: {} }, [], null, null, null, null)).not.toThrow();
    expect(setLabelText).not.toHaveBeenCalledWith(undefined, expect.anything());
  });

  test("applyPoseToRig returns null for incomplete pose payloads", () => {
    const rig = {
      fingers: [],
      wrist: { dev: { rotation: {} }, flex: { rotation: {} } },
      thumb: null,
    };

    expect(applyPoseToRig(rig, null, null, null, null, null, null)).toBeNull();
  });
});
