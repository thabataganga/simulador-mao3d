import { KAPANDJI_LEVEL_LABELS, KAPANDJI_RANGE, KAPANDJI_TO_CMC_OPP_COMMAND } from "../constants";
import { clamp } from "../utils";

function defaultOperationalResolver(level) {
  return KAPANDJI_TO_CMC_OPP_COMMAND[level] ?? KAPANDJI_TO_CMC_OPP_COMMAND[0];
}

export function clampKapandjiLevel(level) {
  return clamp(Math.round(Number(level) || 0), KAPANDJI_RANGE);
}

export function resolveKapandjiOperationalPose(level, context = {}) {
  const resolvedLevel = clampKapandjiLevel(level);
  const resolver = typeof context.resolveCommand === "function" ? context.resolveCommand : defaultOperationalResolver;
  const commandDeg = Number(resolver(resolvedLevel, context));
  return {
    level: resolvedLevel,
    commandDeg: Number.isFinite(commandDeg) ? commandDeg : defaultOperationalResolver(resolvedLevel),
  };
}

export function getKapandjiLevelFromCommand(commandDeg, context = {}) {
  const resolver = typeof context.resolveCommand === "function" ? context.resolveCommand : defaultOperationalResolver;
  let bestLevel = KAPANDJI_RANGE[0];
  let bestError = Number.POSITIVE_INFINITY;

  for (let level = KAPANDJI_RANGE[0]; level <= KAPANDJI_RANGE[1]; level += 1) {
    const predicted = Number(resolver(level, context));
    const error = Math.abs(predicted - (Number(commandDeg) || 0));
    if (error < bestError || (error === bestError && level > bestLevel)) {
      bestError = error;
      bestLevel = level;
    }
  }

  return bestLevel;
}

export function buildThumbOppositionClinicalModel({ thumb, kapandjiLevel, context = {} }) {
  const commandDeg = Number(thumb?.CMC_opp) || 0;
  const derivedLevel = getKapandjiLevelFromCommand(commandDeg, context);
  const resolvedLevel = clampKapandjiLevel(kapandjiLevel ?? derivedLevel);
  const { commandDeg: operationalCommandDeg } = resolveKapandjiOperationalPose(resolvedLevel, context);
  const label = KAPANDJI_LEVEL_LABELS[resolvedLevel] || KAPANDJI_LEVEL_LABELS[0];

  return {
    level: resolvedLevel,
    commandDeg,
    operationalCommandDeg,
    label,
    description: `Kapandji ${resolvedLevel}: ${label}`,
    targetId: `kapandji-${resolvedLevel}`,
    scaleLabel: `Kapandji ${resolvedLevel}`,
  };
}
