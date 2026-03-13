import { RANGES, THUMB_RANGE_KEY } from "../constants/biomechanics";
import { clamp } from "../utils/math/core";
import { computeGrip } from "../utils/grip/computeGrip";
import { defaultFinger, defaultThumb, restFromDims } from "../utils/pose/defaults";

/** @typedef {{ MCP: number, PIP: number, DIP: number }} FingerPose */
/** @typedef {{ CMC_abd: number, CMC_opp: number, CMC_flex: number, MCP_flex: number, IP: number }} ThumbPose */
/** @typedef {{ flex: number, dev: number }} WristPose */
/** @typedef {{ fingers: FingerPose[], thumb: ThumbPose, wrist: WristPose, grip: number, globalMode: string, activePreset: string, profile: object, dims: object, globalD2D5: { MCP: number, PIP: number, DIP: number }, sex: string, percentile: number, age: number }} PoseState */

/**
 * @param {FingerPose[]} fingers
 */
export function calculateGlobalD2D5(fingers) {
  if (!fingers?.length) return { MCP: 0, PIP: 0, DIP: 0 };
  const n = fingers.length;
  const sums = fingers.reduce(
    (acc, finger) => {
      acc.MCP += finger.MCP;
      acc.PIP += finger.PIP;
      acc.DIP += finger.DIP;
      return acc;
    },
    { MCP: 0, PIP: 0, DIP: 0 },
  );
  return {
    MCP: Math.round(sums.MCP / n),
    PIP: Math.round(sums.PIP / n),
    DIP: Math.round(sums.DIP / n),
  };
}

/**
 * @param {FingerPose[]} fingers
 * @param {"MCP"|"PIP"|"DIP"} key
 * @param {number} value
 */
export function setGlobalFingerAngle(fingers, key, value) {
  if (!RANGES[key]) return fingers;
  return fingers.map(finger => ({ ...finger, [key]: clamp(value, RANGES[key]) }));
}

/**
 * @param {ThumbPose} thumb
 * @param {keyof ThumbPose} key
 * @param {number} value
 */
export function setThumbAngle(thumb, key, value) {
  const rangeKey = THUMB_RANGE_KEY[key];
  if (!rangeKey || !RANGES[rangeKey]) return thumb;
  return { ...thumb, [key]: clamp(value, RANGES[rangeKey]) };
}

/**
 * @param {{ fingers: FingerPose[], thumb: ThumbPose, wrist: WristPose, globalMode: string }} pose
 * @param {number} grip
 * @param {string=} modeOverride
 */
export function applyGlobalGripToPose(pose, grip, modeOverride) {
  const mode = modeOverride || pose.globalMode || "functional";
  const result = computeGrip(grip, mode);

  if (result.pinchOnly) {
    const lockedPinchFinger = { MCP: 90, PIP: 65, DIP: 48 };
    return {
      fingers: pose.fingers.map((_, index) =>
        index === 0 ? { ...pose.fingers[index], ...result.finger } : { ...lockedPinchFinger }),
      thumb: { ...pose.thumb, ...result.thumb },
      wrist: pose.wrist,
    };
  }

  return {
    fingers: pose.fingers.map(() => result.finger),
    thumb: { ...pose.thumb, ...result.thumb },
    wrist: { ...pose.wrist, ...result.wrist },
  };
}

/**
 * @param {object} dims
 */
export function createNeutralPose(dims) {
  const { f, t, w } = restFromDims(dims);
  return { fingers: f, thumb: t, wrist: w, grip: 0, activePreset: "neutro" };
}

export function createZeroPose() {
  return {
    fingers: Array.from({ length: 4 }, defaultFinger),
    thumb: defaultThumb(),
    wrist: { flex: 0, dev: 0 },
    grip: 0,
    activePreset: "zero",
  };
}

/**
 * @param {{ dims: object, fingers: FingerPose[], thumb: ThumbPose, wrist: WristPose }} input
 */
export function createSceneInput(input) {
  return {
    dims: input.dims,
    fingers: input.fingers,
    thumb: input.thumb,
    wrist: input.wrist,
  };
}






