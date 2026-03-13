import { AnthropometryForm } from "../../components/AnthropometryForm";
import { PresetButtons } from "../../components/PresetButtons";

export function PoseSetupControls({ state, actions }) {
  const { sex, percentile, age, activePreset } = state;
  const { onSex, onPercentile, onAge, onPresetFunctional, onPresetNeutral, onPresetZero } = actions;

  return (
    <>
      <AnthropometryForm
        sex={sex}
        onSex={onSex}
        percentile={percentile}
        onPercentile={onPercentile}
        age={age}
        onAge={onAge}
      />

      <PresetButtons
        activePreset={activePreset}
        onFunctional={onPresetFunctional}
        onNeutral={onPresetNeutral}
        onZero={onPresetZero}
      />
    </>
  );
}
