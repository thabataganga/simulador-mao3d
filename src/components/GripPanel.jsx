import { LabeledSlider } from "./LabeledSlider";

export function GripPanel({ grip, globalMode, onGlobalMode, onGrip, onClearHighlight }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          className="px-2 py-1 border rounded text-xs"
          style={globalMode === "functional" ? { backgroundColor: "var(--lmb-blue)", color: "#fff" } : null}
          onClick={() => {
            onClearHighlight?.();
            onGlobalMode("functional");
          }}
        >
          Funcional
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded text-xs"
          style={globalMode === "pinch" ? { backgroundColor: "var(--lmb-blue)", color: "#fff" } : null}
          onClick={() => {
            onClearHighlight?.();
            onGlobalMode("pinch");
          }}
        >
          Pinca
        </button>
      </div>
      <LabeledSlider
        label={globalMode === "pinch" ? "Fechamento (pinca) 0-100" : "Fechamento (funcional) 0-100"}
        min={0}
        max={100}
        value={grip}
        unit="%"
        onChange={value => {
          onClearHighlight?.();
          onGrip(value);
        }}
      />
    </div>
  );
}
