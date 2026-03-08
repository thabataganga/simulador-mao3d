import { AnthropometryForm } from "../../components/AnthropometryForm";
import { PresetButtons } from "../../components/PresetButtons";

export function PoseSetupControls({
  sex,
  percentile,
  age,
  activePreset,
  onSex,
  onPercentile,
  onAge,
  onPresetFunctional,
  onPresetNeutral,
  onPresetZero,
}) {
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
