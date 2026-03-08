export function DirectionMagnitudeSlider({
  label,
  axis,
  clinical,
  positiveDirection,
  negativeDirection,
  min,
  max,
  onApply,
  onHighlight,
  negativeFirst = false,
  unit = "deg",
  extraFooter,
}) {
  const selectedDirection = clinical.inputDirection;
  const inputMagnitude = clinical.inputMagnitudeDeg;
  const maxByDirection = selectedDirection === positiveDirection ? max : Math.abs(min);

  const apply = (direction, magnitudeRaw) => {
    const directionMax = direction === positiveDirection ? max : Math.abs(min);
    const magnitude = Math.min(Math.max(Number(magnitudeRaw) || 0, 0), directionMax);
    onApply(axis, direction, magnitude);
  };

  const directionOptions = negativeFirst
    ? [negativeDirection, positiveDirection]
    : [positiveDirection, negativeDirection];

  const numberInputId = `${axis}-magnitude-input`;
  const rangeInputId = `${axis}-magnitude-range`;

  return (
    <div className="mb-3 border border-gray-200 rounded-md p-2">
      <div className="text-sm font-medium mb-2">{label}</div>

      <fieldset className="mb-2 flex items-center gap-4 text-sm">
        <legend className="sr-only">Direcao {label}</legend>
        {directionOptions.map(direction => {
          const directionId = `${axis}-direction-${direction}`;
          return (
            <div key={direction} className="inline-flex items-center gap-1">
              <input
                id={directionId}
                type="radio"
                name={`${axis}-direction`}
                value={direction}
                checked={selectedDirection === direction}
                onChange={e => {
                  apply(e.target.value, inputMagnitude);
                  onHighlight?.();
                }}
              />
              <label htmlFor={directionId}>{direction}</label>
            </div>
          );
        })}
      </fieldset>

      <div className="flex items-center gap-2 mb-2">
        <label htmlFor={numberInputId} className="sr-only">{label} valor numerico</label>
        <input
          id={numberInputId}
          name={numberInputId}
          type="number"
          min={0}
          max={maxByDirection}
          step={1}
          value={inputMagnitude}
          onChange={e => apply(selectedDirection, Number(e.target.value))}
          onFocus={() => onHighlight?.()}
          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-right"
        />
        <span className="text-sm">{unit}</span>
      </div>

      <label htmlFor={rangeInputId} className="sr-only">{label} slider</label>
      <input
        id={rangeInputId}
        name={rangeInputId}
        type="range"
        min={0}
        max={maxByDirection}
        step={1}
        value={inputMagnitude}
        onChange={e => {
          apply(selectedDirection, Number(e.target.value));
          onHighlight?.();
        }}
        className="w-full"
      />

      <div className="mt-1 text-xs text-gray-600">
        Medida do rig: <strong>{clinical.rigDirection || clinical.direction || clinical.inputDirection} {clinical.rigMagnitudeDeg ?? clinical.magnitudeDeg ?? clinical.inputMagnitudeDeg}deg</strong>
      </div>
      {extraFooter ? <div className="mt-1 text-xs text-gray-600">{extraFooter}</div> : null}
    </div>
  );
}
