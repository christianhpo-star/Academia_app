/* Optional cardio alongside a saved strength workout. Minutes are reported by
 * the user; they never become calories, exercise intensity or muscle sets. */
(function installCardio(root) {
  'use strict';
  const TYPES = Object.freeze([
    {id: 'esteira', label: 'Esteira'},
    {id: 'escada', label: 'Escada'},
    {id: 'bicicleta', label: 'Bicicleta'},
    {id: 'eliptico', label: 'Elíptico'},
    {id: 'outro', label: 'Outro cardio'},
  ].map(Object.freeze));
  const STAIR_SPEED_UNITS = Object.freeze([
    {id: 'steps_min', label: 'Degraus/min'},
    {id: 'machine_level', label: 'Nível da máquina'},
  ].map(Object.freeze));
  const known = new Map(TYPES.map(type => [type.id, type.label]));
  const label = type => known.get(type) || 'Cardio';
  const total = entries => Number(entries.reduce((sum, entry) => sum + entry.minutes, 0).toFixed(10));
  function duration(value) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) return 0;
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    const text = typeof value === 'string' ? value.trim().replace(',', '.') : value;
    if (typeof text === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const minutes = Number(text);
    return Number.isFinite(minutes) && minutes >= 0 && minutes <= 300 ? minutes : null;
  }
  // The machine level is a proprietary setting, never an equivalent cadence.
  // Average pace is optional; we do not infer it from minutes or level.
  function stairPace(row) {
    if (row?.type !== 'escada') return {ok:true};
    const raw = row.avgSpeed;
    if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return {ok:true};
    const unit = row.speedUnit == null || row.speedUnit === '' ? 'steps_min' : row.speedUnit;
    if (!STAIR_SPEED_UNITS.some(option => option.id === unit)) return {ok:false};
    const speed = duration(raw);
    if (speed === null || speed <= 0 || speed > (unit === 'machine_level' ? 99 : 240)) return {ok:false};
    return {ok:true, avgSpeed:speed, speedUnit:unit};
  }
  function paceLabel(row) {
    const pace = stairPace(row);
    if (!pace.ok || pace.avgSpeed == null) return '';
    const speed = Number(pace.avgSpeed).toLocaleString('pt-BR', {maximumFractionDigits:2});
    return pace.speedUnit === 'machine_level' ? 'nível ' + speed + ' (máquina)' : speed + ' degraus/min';
  }
  function validRow(row) {
    return row && typeof row === 'object' && !Array.isArray(row) && known.has(row.type);
  }
  function invalid(error) {
    return {ok: false, entries: [], totalMinutes: 0, error};
  }
  function parse(rows) {
    if (rows == null) return {ok: true, entries: [], totalMinutes: 0};
    if (!Array.isArray(rows)) return invalid('Revise os registros de cardio.');
    if (rows.length > TYPES.length) return invalid('Registre no máximo um item de cada tipo de cardio.');
    const entries = [], seen = new Set();
    for (const row of rows) {
      if (!validRow(row)) return invalid('Escolha um tipo de cardio disponível.');
      if (seen.has(row.type)) return invalid('Some os minutos de ' + label(row.type) + ' em um único registro.');
      seen.add(row.type);
      const minutes = duration(row.minutes);
      if (minutes === null) return invalid('Informe os minutos de ' + label(row.type) + ' entre 0 e 300.');
      const pace = stairPace(row);
      if (!pace.ok) return invalid('Confira a velocidade média da escada: 1 a 240 degraus/min ou nível 1 a 99.');
      if (minutes === 0 && pace.avgSpeed != null) return invalid('Informe o tempo de escada para registrar o ritmo médio.');
      if (minutes > 0) entries.push({type: row.type, minutes,
        ...(pace.avgSpeed != null ? {avgSpeed:pace.avgSpeed, speedUnit:pace.speedUnit} : {})});
    }
    return {ok: true, entries, totalMinutes: total(entries)};
  }
  function summarize(rows) {
    const entries = [], seen = new Set();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!validRow(row) || seen.has(row.type)) continue;
      const minutes = duration(row.minutes);
      if (minutes === null || minutes <= 0) continue;
      seen.add(row.type);
      const pace = stairPace(row);
      entries.push({type: row.type, minutes,
        ...(pace.ok && pace.avgSpeed != null ? {avgSpeed:pace.avgSpeed, speedUnit:pace.speedUnit} : {})});
    }
    return {entries, totalMinutes: total(entries)};
  }
  const api = Object.freeze({TYPES, STAIR_SPEED_UNITS, parse, summarize, label, paceLabel});
  root.ForjaCardio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
