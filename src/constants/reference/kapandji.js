export const KAPANDJI_RANGE = [0, 10];

export const KAPANDJI_LEVEL_LABELS = Object.freeze({
  0: "Sem oposicao funcional",
  1: "Contato lateral proximal",
  2: "Contato radial baixo",
  3: "Contato radial medio",
  4: "Contato radial distal",
  5: "Contato palmar inicial",
  6: "Oposicao palmar media",
  7: "Oposicao palmar avancada",
  8: "Oposicao distal dirigida",
  9: "Oposicao quase plena",
  10: "Oposicao funcional maxima",
});

export const KAPANDJI_TO_CMC_OPP_COMMAND = Object.freeze({
  0: -20,
  1: -10,
  2: 0,
  3: 8,
  4: 16,
  5: 24,
  6: 34,
  7: 45,
  8: 55,
  9: 63,
  10: 70,
});

// Clinical estimate coupling: CMC opposition is influenced by flexion and abduction input.
export const CMC_OPP_CLINICAL_COUPLING = Object.freeze({
  FLEX_GAIN: 0.2,
  ABD_GAIN: 0.12,
});
