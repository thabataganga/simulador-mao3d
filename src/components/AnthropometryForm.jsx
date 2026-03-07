import { PERC_OPTIONS } from "../constants";

export function AnthropometryForm({ sex, percentile, age, onSex, onPercentile, onAge }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div>
        <label className="block text-xs font-medium mb-1">Sexo</label>
        <select value={sex} onChange={e => onSex(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Percentil</label>
        <select value={percentile} onChange={e => onPercentile(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm">
          {PERC_OPTIONS.map(p => <option key={p} value={p}>P{p}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Idade</label>
        <input type="number" min={5} max={90} value={age} onChange={e => onAge(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm" />
      </div>
    </div>
  );
}