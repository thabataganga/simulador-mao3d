import {
  handleSetFingers,
  handleSetThumb,
  handleSetThumbGoniometry,
  handleSetOppositionEstimate,
  handleSetWrist,
  handleSetGrip,
  handleSetGlobalMode,
  handleSetActivePreset,
  handleSetGlobalFingerAngle,
  handleSetThumbAngle,
  handleSetThumbCmcInput,
} from "./core";
import {
  handleEnterOppositionExploration,
  handleUpdateOppositionExploration,
  handleRestoreUserInputData,
  handleExitOppositionExploration,
} from "./exploration";
import {
  handleApplyGrip,
  handleApplyPresetFunctional,
  handleApplyPresetNeutral,
  handleApplyPresetZero,
} from "./presets";
import { handleSetAnthropometry } from "./anthropometry";

export const HAND_POSE_HANDLERS = {
  SET_FINGERS: handleSetFingers,
  SET_THUMB: handleSetThumb,
  SET_THUMB_GONIOMETRY: handleSetThumbGoniometry,
  SET_OPPOSITION_ESTIMATE: handleSetOppositionEstimate,
  SET_WRIST: handleSetWrist,
  SET_GRIP: handleSetGrip,
  SET_GLOBAL_MODE: handleSetGlobalMode,
  SET_ACTIVE_PRESET: handleSetActivePreset,
  SET_GLOBAL_FINGER_ANGLE: handleSetGlobalFingerAngle,
  SET_THUMB_ANGLE: handleSetThumbAngle,
  SET_THUMB_CMC_INPUT: handleSetThumbCmcInput,
  ENTER_OPPOSITION_EXPLORATION: handleEnterOppositionExploration,
  UPDATE_OPPOSITION_EXPLORATION: handleUpdateOppositionExploration,
  RESTORE_USER_INPUT_DATA: handleRestoreUserInputData,
  EXIT_OPPOSITION_EXPLORATION: handleExitOppositionExploration,
  APPLY_GRIP: handleApplyGrip,
  APPLY_PRESET_FUNCTIONAL: handleApplyPresetFunctional,
  APPLY_PRESET_NEUTRAL: handleApplyPresetNeutral,
  APPLY_PRESET_ZERO: handleApplyPresetZero,
  SET_ANTHROPOMETRY: handleSetAnthropometry,
};
