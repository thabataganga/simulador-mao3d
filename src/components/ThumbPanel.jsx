import { RANGES } from "../constants/biomechanics";
import { THUMB_SLIDER_CONFIG } from "../constants/uiConfig";
import { LabeledSlider } from "./LabeledSlider";

function DirectionMagnitudeSlider({
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

function OppInfoCard({ clinical, onHighlight }) {
  const clinicalEstimate = clinical?.clinicalEstimate || {};
  const rigMeasurement = clinical?.rigMeasurement || {};
  const explorationMeasurement = clinical?.explorationMeasurement || null;

  const clinicalDirection = clinicalEstimate.clinicalDirection || clinical.direction || clinical.inputDirection;
  const clinicalMagnitude = clinicalEstimate.clinicalMagnitude ?? clinical.magnitudeDeg ?? clinical.inputMagnitudeDeg;
  const rigDirection = rigMeasurement.rigDirection || clinical.rigDirection || clinical.direction || clinical.inputDirection;
  const rigMagnitude = rigMeasurement.rigMagnitudeDeg ?? clinical.rigMagnitudeDeg ?? clinical.magnitudeDeg ?? clinical.inputMagnitudeDeg;
  const simulatedDirection = explorationMeasurement?.rigDirection;
  const simulatedMagnitude = explorationMeasurement?.rigMagnitudeDeg;
  const kapandjiScale = clinicalEstimate.scaleLabel || clinical.scaleLabel;
  const kapandjiLabel = clinicalEstimate.estimatedLabel || clinical.estimatedLabel;

  return (
    <div
      className="mb-3 border border-gray-200 rounded-md p-2"
      role="button"
      tabIndex={0}
      onClick={onHighlight}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onHighlight?.();
        }
      }}
    >
      <div className="text-sm font-medium mb-2">CMC Oposicao</div>
      <div className="mt-1 text-xs text-gray-600">
        Estimativa clinica: <strong>{clinicalDirection} {clinicalMagnitude}deg</strong>
      </div>
      <div className="mt-1 text-xs text-gray-600">
        Medida do rig real: <strong>{rigDirection} {rigMagnitude}deg</strong>
      </div>
      {explorationMeasurement ? (
        <div className="mt-1 text-xs text-gray-600">
          Medida do rig simulado: <strong>{simulatedDirection} {simulatedMagnitude}deg</strong>
        </div>
      ) : null}
      <div className="mt-1 text-xs text-gray-600">
        Kapandji estimado: <strong>{kapandjiScale}</strong> <span className="text-[11px] text-gray-500">{kapandjiLabel}</span>
      </div>
      <div className="mt-1 text-xs text-gray-600">
        Capacidade funcional: <strong>{clinical.functionalSummary}</strong>
      </div>
    </div>
  );
}

function OppositionExplorationPanel({
  isExplorationMode,
  kapandjiTarget,
  onEnter,
  onUpdate,
  onRestore,
  onExit,
  onHighlight,
}) {
  const inputId = "opp-exploration-kapandji-target";

  return (
    <div className="mb-3 border border-dashed border-blue-300 rounded-md p-2 bg-blue-50/50">
      <div className="text-sm font-medium mb-2">Exploracao de oposicao</div>
      <p className="text-xs text-gray-600 mb-2">
        Simula oposicao possivel sem sobrescrever os dados clinicos digitados.
      </p>

      {!isExplorationMode ? (
        <button
          type="button"
          className="mt-1 px-3 py-1 text-xs rounded-md border border-blue-400 text-blue-700"
          onClick={() => {
            onEnter();
            onHighlight?.();
          }}
        >
          Explorar oposicao
        </button>
      ) : (
        <>
          <div className="mb-2">
            <label htmlFor={inputId} className="text-xs text-gray-700">Kapandji alvo ({kapandjiTarget})</label>
            <input
              id={inputId}
              name={inputId}
              type="range"
              min={0}
              max={10}
              step={1}
              value={kapandjiTarget}
              onChange={e => {
                onUpdate(Number(e.target.value));
                onHighlight?.();
              }}
              className="w-full"
            />
            <p className="text-[11px] text-blue-700 mt-1">Simulacao: Kapandji {kapandjiTarget}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1 text-xs rounded-md border border-gray-300 text-gray-700"
              onClick={onRestore}
            >
              Voltar aos dados inputados
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs rounded-md border border-blue-400 text-blue-700"
              onClick={onExit}
            >
              Sair exploracao
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ThumbPanel({
  thumb,
  thumbGoniometry,
  thumbClinical,
  isExplorationMode,
  explorationKapandjiTarget,
  onThumbVal,
  onThumbCmcInput,
  onEnterOppositionExploration,
  onUpdateOppositionExploration,
  onRestoreUserInputData,
  onExitOppositionExploration,
  onHighlight,
  onClearHighlight,
  onClearPreset,
}) {
  const panelOrder = ["CMC_flex", "CMC_abd", "CMC_opp", "MCP_flex", "IP"];
  const orderedItems = panelOrder
    .map(key => THUMB_SLIDER_CONFIG.find(item => item.key === key))
    .filter(Boolean);

  return orderedItems.map(item => {
    const [min, max] = RANGES[item.rangeKey];

    if (item.key === "CMC_abd") {
      return (
        <DirectionMagnitudeSlider
          key={item.key}
          axis="CMC_abd"
          label="CMC Abd/Aducao"
          clinical={thumbGoniometry.abd}
          positiveDirection="abducao"
          negativeDirection="aducao"
          min={min}
          max={max}
          onApply={(axis, direction, magnitude) => {
            onThumbCmcInput(axis, direction, magnitude);
            onClearPreset();
          }}
          onHighlight={() => onHighlight(item.debugKey)}
        />
      );
    }

    if (item.key === "CMC_flex") {
      return (
        <DirectionMagnitudeSlider
          key={item.key}
          axis="CMC_flex"
          label="CMC Flexao/Extensao"
          clinical={thumbGoniometry.flex}
          positiveDirection="flexao"
          negativeDirection="extensao"
          min={min}
          max={max}
          onApply={(axis, direction, magnitude) => {
            onThumbCmcInput(axis, direction, magnitude);
            onClearPreset();
          }}
          onHighlight={() => onHighlight(item.debugKey)}
          negativeFirst
        />
      );
    }

    if (item.key === "CMC_opp") {
      return (
        <div
          key={item.key}
          onMouseLeave={() => {
            if (!isExplorationMode) onClearHighlight?.();
          }}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget) && !isExplorationMode) onClearHighlight?.();
          }}
        >
          <OppInfoCard
            clinical={thumbClinical.opp}
            onHighlight={() => onHighlight(item.debugKey)}
          />
          <OppositionExplorationPanel
            isExplorationMode={isExplorationMode}
            kapandjiTarget={explorationKapandjiTarget}
            onEnter={() => {
              onEnterOppositionExploration();
              onClearPreset();
            }}
            onUpdate={value => {
              onUpdateOppositionExploration(value);
              onClearPreset();
            }}
            onRestore={onRestoreUserInputData}
            onExit={() => {
              onExitOppositionExploration();
              onClearHighlight?.();
            }}
            onHighlight={() => onHighlight(item.debugKey)}
          />
        </div>
      );
    }

    return (
      <LabeledSlider
        key={item.key}
        label={`${item.label} (${min}..${max >= 0 ? `+${max}` : max})`}
        min={min}
        max={max}
        value={thumb[item.key]}
        onChange={value => {
          onThumbVal(item.key, value);
          onClearPreset();
        }}
        leftHint={item.leftHint}
        rightHint={item.rightHint}
        onHighlight={() => onHighlight(item.debugKey)}
      />
    );
  });
}



