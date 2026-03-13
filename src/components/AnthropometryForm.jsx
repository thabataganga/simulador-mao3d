import { PERC_OPTIONS } from "../constants/anthropometry";

const VALID_SEX = new Set(["masculino", "feminino"]);
const MIN_AGE = 5;
const MAX_AGE = 90;

export function AnthropometryForm({ sex, percentile, age, onSex, onPercentile, onAge }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div>
        <label className="block text-xs font-medium mb-1">Sexo</label>
        <select
          value={sex}
          onChange={e => {
            const nextSex = e.target.value;
            if (VALID_SEX.has(nextSex)) onSex(nextSex);
          }}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm"
        >
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Percentil</label>
        <select
          value={percentile}
          onChange={e => {
            const nextPercentile = Number(e.target.value);
            if (PERC_OPTIONS.includes(nextPercentile)) onPercentile(nextPercentile);
          }}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm"
        >
          {PERC_OPTIONS.map(p => <option key={p} value={p}>P{p}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Idade</label>
        <input
          type="number"
          min={MIN_AGE}
          max={MAX_AGE}
          value={age}
          onChange={e => {
            if (e.target.value.trim() === "") return;
            const nextAge = Number(e.target.value);
            if (!Number.isFinite(nextAge)) return;
            onAge(Math.min(MAX_AGE, Math.max(MIN_AGE, nextAge)));
          }}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-sm"
        />
      </div>
    </div>
  );
}

