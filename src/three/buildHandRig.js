import { createFactories, hasValidDims } from "./buildHandRig/shared";
import { buildGlobalFingerDebug, buildWristDebug } from "./buildHandRig/debug";
import { buildWristSubsystem } from "./buildHandRig/wrist";
import { buildFingersSubsystem } from "./buildHandRig/fingers";
import { buildThumbSubsystem } from "./buildHandRig/thumb";

export function buildHandRig(d) {
  if (!hasValidDims(d)) return null;

  const hlList = [];
  const dbgMap = {};
  const highlightMap = {};

  const f = createFactories(d, hlList);
  const wrist = buildWristSubsystem(f);
  const allMovers = [wrist.palm];

  const fingers = buildFingersSubsystem(f, wrist.palm, dbgMap, highlightMap, allMovers);
  buildGlobalFingerDebug(fingers.fingersRig, d, dbgMap);

  const thumb = buildThumbSubsystem(f, wrist.palm, dbgMap, highlightMap, allMovers);
  buildWristDebug(d, wrist.wristDev, wrist.wristFlex, dbgMap);

  highlightMap.WR_DEV = allMovers;
  highlightMap.WR_FLEX = allMovers;

  return {
    root: wrist.root,
    palm: wrist.palm,
    wrist: { dev: wrist.wristDev, flex: wrist.wristFlex },
    fingers: fingers.fingersRig,
    thumb: thumb.thumb,
    tips: { fingers: fingers.tips, thumb: thumb.tips.thumb },
    tipOffsets: { fingers: fingers.tipOffsets, thumb: thumb.tipOffsets.thumb },
    dbgMap,
    thumbLabels: thumb.thumbLabels,
    highlight: { map: highlightMap, all: hlList },
  };
}
