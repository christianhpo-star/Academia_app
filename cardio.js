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
      if (minutes > 0) entries.push({type: row.type, minutes});
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
      entries.push({type: row.type, minutes});
    }
    return {entries, totalMinutes: total(entries)};
  }
  const api = Object.freeze({TYPES, parse, summarize, label});
  root.ForjaCardio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
