export function PresetButtons({ activePreset, onFunctional, onNeutral, onZero }) {
  const base = "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all";
  const active = { backgroundColor: "var(--app-color-blue)", color: "#fff", borderColor: "var(--app-color-blue)" };
  const inactive = { color: "var(--app-color-blue)", borderColor: "var(--app-color-blue)" };

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <button onClick={onFunctional} className={base} style={activePreset === "functional" ? active : inactive}>Funcional</button>
      <button onClick={onNeutral} className={base} style={activePreset === "neutro" ? active : inactive}>Neutro</button>
      <button onClick={onZero} className={base} style={activePreset === "zero" ? active : inactive}>Zero</button>
    </div>
  );
}
