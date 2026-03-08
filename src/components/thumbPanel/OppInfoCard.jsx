export function OppInfoCard({ clinical, onHighlight }) {
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
