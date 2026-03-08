import {
  CMC_OPP_CLINICAL_COUPLING,
  KAPANDJI_LEVEL_LABELS,
  KAPANDJI_RANGE,
  KAPANDJI_TO_CMC_OPP_COMMAND,
} from "../constants/reference/kapandji";
import { RANGES } from "../constants/reference/biomechanics";
import { clamp } from "../utils/math/core";

function defaultOperationalResolver(level) {
  return KAPANDJI_TO_CMC_OPP_COMMAND[level] ?? KAPANDJI_TO_CMC_OPP_COMMAND[0];
}

function normalizeSignedZero(value) {
  return Object.is(value, -0) ? 0 : value;
}

function toOppositionDirection(value) {
  return value >= 0 ? "oposicao" : "retroposicao";
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

export function buildClinicalOppositionEstimate(thumb = {}, context = {}) {
  const baseOppositionDeg = Number(thumb.CMC_opp) || 0;
  const flexDeg = Number(thumb.CMC_flex) || 0;
  const abdDeg = Number(thumb.CMC_abd) || 0;
  const flexGain = Number(context.flexGain ?? CMC_OPP_CLINICAL_COUPLING.FLEX_GAIN) || 0;
  const abdGain = Number(context.abdGain ?? CMC_OPP_CLINICAL_COUPLING.ABD_GAIN) || 0;

  const clinicalOppositionDegRaw = baseOppositionDeg + flexDeg * flexGain + abdDeg * abdGain;
  const clinicalOppositionDeg = normalizeSignedZero(Math.round(clamp(clinicalOppositionDegRaw, RANGES.CMC_OPP)));
  const estimatedLevel = getKapandjiLevelFromCommand(clinicalOppositionDeg, context);

  return {
    clinicalOppositionDeg,
    clinicalDirection: toOppositionDirection(clinicalOppositionDeg),
    clinicalMagnitude: Math.abs(clinicalOppositionDeg),
    estimatedLevel,
  };
}

export function buildThumbOppositionClinicalModel({ thumb, kapandjiLevel, context = {} }) {
  const commandDeg = Number(thumb?.CMC_opp) || 0;

  const clinicalEstimate = buildClinicalOppositionEstimate(thumb, context);
  const clinicalLevelFromInput = Number.isFinite(Number(kapandjiLevel))
    ? clampKapandjiLevel(kapandjiLevel)
    : clinicalEstimate.estimatedLevel;

  const rigLevelRaw = Number(context?.rigMeasurement?.level);
  const rigEstimatedLevel = clampKapandjiLevel(Number.isFinite(rigLevelRaw) ? rigLevelRaw : clinicalLevelFromInput);

  const rigDirection = context?.rigMeasurement?.rigDirection || toOppositionDirection(commandDeg);
  const rigMagnitudeDegRaw = Number(context?.rigMeasurement?.rigMagnitudeDeg);
  const rigMagnitudeDeg = Number.isFinite(rigMagnitudeDegRaw) ? Math.abs(rigMagnitudeDegRaw) : Math.abs(commandDeg);
  const rigMeasuredDeg = rigDirection === "retroposicao" ? -rigMagnitudeDeg : rigMagnitudeDeg;

  const clinicalLevel = clinicalEstimate.estimatedLevel;
  const clinicalLabel = KAPANDJI_LEVEL_LABELS[clinicalLevel] || KAPANDJI_LEVEL_LABELS[0];
  const { commandDeg: operationalCommandDeg } = resolveKapandjiOperationalPose(clinicalLevel, context);

  return {
    level: clinicalLevel,
    estimatedLevel: clinicalLevel,
    estimatedLabel: clinicalLabel,
    commandDeg,
    clinicalTargetDeg: clinicalEstimate.clinicalOppositionDeg,
    inputDirection: toOppositionDirection(commandDeg),
    inputMagnitudeDeg: Math.abs(commandDeg),
    direction: clinicalEstimate.clinicalDirection,
    magnitudeDeg: clinicalEstimate.clinicalMagnitude,
    rigMeasuredDeg,
    rigDirection,
    rigMagnitudeDeg,
    operationalCommandDeg,
    label: clinicalLabel,
    description: `Kapandji ${clinicalLevel}: ${clinicalLabel}`,
    targetId: `kapandji-${clinicalLevel}`,
    scaleLabel: `Kapandji ${clinicalLevel}`,
    rigMeasurement: {
      level: rigEstimatedLevel,
      rigDirection,
      rigMagnitudeDeg,
      rigMeasuredDeg,
      scaleLabel: `Kapandji ${rigEstimatedLevel}`,
    },
    clinicalEstimate: {
      level: clinicalLevel,
      clinicalOppositionDeg: clinicalEstimate.clinicalOppositionDeg,
      clinicalDirection: clinicalEstimate.clinicalDirection,
      clinicalMagnitude: clinicalEstimate.clinicalMagnitude,
      estimatedLabel: clinicalLabel,
      scaleLabel: `Kapandji ${clinicalLevel}`,
    },
  };
}
