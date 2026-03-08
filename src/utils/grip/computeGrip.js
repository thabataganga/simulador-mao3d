import { FUNC_KF, PINCH_KF } from "../../constants/reference/gripKeyframes";
import { interpPose } from "../math/core";

export function computeGrip(g, mode) {
  const s = Math.min(Math.max(g, 0), 100) / 100;
  const t = s <= 0.5 ? s / 0.5 : (s - 0.5) / 0.5;

  if (mode === "pinch") {
    const [fA, fB] = s <= 0.5 ? [PINCH_KF.open.index, PINCH_KF.mid.index] : [PINCH_KF.mid.index, PINCH_KF.closed.index];
    const [tA, tB] = s <= 0.5 ? [PINCH_KF.open.thumb, PINCH_KF.mid.thumb] : [PINCH_KF.mid.thumb, PINCH_KF.closed.thumb];
    return { finger: interpPose(fA, fB, t), thumb: interpPose(tA, tB, t), wrist: null, pinchOnly: true };
  }

  const [fA, fB] = s <= 0.5 ? [FUNC_KF.open.finger, FUNC_KF.mid.finger] : [FUNC_KF.mid.finger, FUNC_KF.closed.finger];
  const [tA, tB] = s <= 0.5 ? [FUNC_KF.open.thumb, FUNC_KF.mid.thumb] : [FUNC_KF.mid.thumb, FUNC_KF.closed.thumb];
  const [wA, wB] = s <= 0.5 ? [FUNC_KF.open.wrist, FUNC_KF.mid.wrist] : [FUNC_KF.mid.wrist, FUNC_KF.closed.wrist];

  return { finger: interpPose(fA, fB, t), thumb: interpPose(tA, tB, t), wrist: interpPose(wA, wB, t), pinchOnly: false };
}


