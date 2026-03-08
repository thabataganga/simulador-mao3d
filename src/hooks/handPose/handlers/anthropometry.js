export function handleSetAnthropometry(state, action) {
  const next = {
    sex: action.value.sex ?? state.anthropometry.sex,
    percentile: action.value.percentile ?? state.anthropometry.percentile,
    age: action.value.age ?? state.anthropometry.age,
  };

  return {
    ...state,
    anthropometry: next,
  };
}
