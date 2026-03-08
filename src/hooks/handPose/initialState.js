import { createDefaultCmcInputState } from "../../domain/thumbCmcClinical";
import { getKapandjiLevelFromCommand } from "../../domain/thumbKapandji";
import { applyGlobalGripToPose, createZeroPose } from "../../domain/pose";
import { INITIAL_ANTHROPOMETRY, ZERO_OVERLAY } from "./constants";
import { applyCmcClinicalTargets } from "./helpers";

export function createHandPoseInitialState() {
  const base = createZeroPose();
  const functionalPose = applyGlobalGripToPose(
    {
      fingers: base.fingers,
      thumb: base.thumb,
      wrist: base.wrist,
      globalMode: "functional",
    },
    50,
    "functional",
  );

  const cmcSeed = createDefaultCmcInputState();
  const { nextThumb, nextInput } = applyCmcClinicalTargets(functionalPose.thumb, cmcSeed);
  const initialKapandji = getKapandjiLevelFromCommand(nextThumb.CMC_opp);

  return {
    fingers: functionalPose.fingers,
    thumb: nextThumb,
    thumbMeasured: { CMC_abd: 0, CMC_flex: 0 },
    cmcInput: nextInput,
    kapandjiEstimatedFromRig: initialKapandji,
    thumbOppRig: {
      level: initialKapandji,
      rigDirection: nextThumb.CMC_opp >= 0 ? "oposicao" : "retroposicao",
      rigMagnitudeDeg: Math.abs(nextThumb.CMC_opp),
    },
    isExplorationMode: false,
    exploreOverlayState: { ...ZERO_OVERLAY },
    explorationKapandjiTarget: initialKapandji,
    explorationRigBaseline: null,
    userEditedThumb: {},
    explorationSnapshotThumb: {},
    wrist: functionalPose.wrist,
    grip: 50,
    globalMode: "functional",
    activePreset: "functional",
  };
}

export function createUseHandPoseInitialState() {
  return {
    ...createHandPoseInitialState(),
    anthropometry: INITIAL_ANTHROPOMETRY,
  };
}
