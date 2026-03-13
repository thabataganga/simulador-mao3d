import { PERC_OPTIONS } from "../../../constants/anthropometry";

const VALID_SEX = new Set(["masculino", "feminino"]);
const MIN_AGE = 5;
const MAX_AGE = 90;

export function handleSetAnthropometry(state, action) {
  const value = action.value ?? {};
  const nextSex = VALID_SEX.has(value.sex) ? value.sex : state.anthropometry.sex;
  const percentileRaw = Number(value.percentile);
  const nextPercentile = PERC_OPTIONS.includes(percentileRaw) ? percentileRaw : state.anthropometry.percentile;
  const ageRaw = Number(value.age);
  const nextAge =
    Number.isFinite(ageRaw) && ageRaw >= MIN_AGE && ageRaw <= MAX_AGE
      ? ageRaw
      : state.anthropometry.age;

  const next = {
    sex: nextSex,
    percentile: nextPercentile,
    age: nextAge,
  };

  return {
    ...state,
    anthropometry: next,
  };
}
