export function OppositionExplorationPanel({
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
