/* FORJA share model: only saved sessions. All results are local and read-only.
 * A top load is the largest external load recorded in this session, NOT a PR,
 * a comparable workload between devices or a hypertrophy score. */
(function installShareSummary(root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const SETS = root.ForjaTrainingSets || (node ? require('./training-sets.js') : null);
  const ANATOMY = root.ForjaExerciseAnatomy || (node ? require('./exercise-anatomy.js') : null);
  const CARDIO = root.ForjaCardio || (node ? require('./cardio.js') : null);
  const REGIONS = root.ForjaMuscleBody || (node ? require('./muscle-body.js') : null);
  const validDate = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    !Number.isNaN(Date.parse(day + 'T12:00:00Z')) && new Date(day + 'T12:00:00Z').toISOString().slice(0, 10) === day;
  const fmt = n => Number(n).toLocaleString('pt-BR', {maximumFractionDigits: 2});
  const short = text => String(text || '').trim().slice(0, 110);
  function weekBounds(day) {
    if (!validDate(day)) return null;
    const current = new Date(day + 'T12:00:00Z');
    const first = new Date(current);
    first.setUTCDate(current.getUTCDate() - (current.getUTCDay() + 6) % 7);
    const last = new Date(first);
    last.setUTCDate(first.getUTCDate() + 6);
    return {first: first.toISOString().slice(0, 10), last: last.toISOString().slice(0, 10)};
  }
  function weekDays(state, day) {
    const bounds = weekBounds(day);
    if (!bounds) return 0;
    const sessions = [...(Array.isArray(state?.sessions) ? state.sessions : []),
      ...(Array.isArray(state?.muay?.sessions) ? state.muay.sessions : [])];
    return new Set(sessions.filter(s => validDate(s?.day) && s.day >= bounds.first && s.day <= day)
      .map(s => s.day)).size;
  }
  const labelLoad = row => row.bodyweight ?
    (row.load === 0 ? 'Peso do corpo' : '+' + fmt(row.load) + ' kg adicionais') :
    fmt(row.load) + ' ' + row.unit;
  const labelSet = row => labelLoad(row) + ' × ' + row.reps + (row.repPerSide ? ' rep./lado' : ' rep.');
  function build(state, sessionId) {
    const session = (Array.isArray(state?.sessions) ? state.sessions : []).find(row => row?.id === sessionId);
    if (!session || !Array.isArray(session.entries)) return null;
    const catalog = new Map((Array.isArray(state.exercises) ? state.exercises : []).map(ex => [ex.id, ex]));
    const loadChoices = [], regions = new Map(), missing = new Set();
    const allRegions = REGIONS?.regions || [];
    for (let i = 0; i < session.entries.length; i++) {
      const entry = session.entries[i];
      const ex = catalog.get(entry?.id);
      const sets = SETS?.workSets?.(entry) || [];
      const bodyweight = !!SETS?.allowsZero?.(entry);
      for (let j = 0; j < sets.length; j++) {
        const set = sets[j];
        const load = Number(set.load);
        loadChoices.push({key: String(i) + ':' + String(j), exerciseId: entry.id,
          name: short(ex?.name || entry.id), load, reps: Number(set.reps),
          unit: ex?.unit || 'kg', repPerSide: !!ex?.repPerSide,
          bodyweight, label: '', index: i, setIndex: j});
      }
      if (!sets.length) continue;
      const anatomy = ANATOMY?.describe?.(entry.id);
      if (!anatomy) { missing.add(entry.id); continue; }
      const primary = new Set(anatomy.main || []);
      for (const id of primary) regions.set(id, (regions.get(id) || 0) + sets.length);
      for (const id of anatomy.assist || []) if (!primary.has(id))
        regions.set(id, (regions.get(id) || 0) + sets.length * 0.5);
    }
    for (const item of loadChoices) item.label = item.name + ' · ' + labelSet(item);
    // Comparing numbers across machines/halter units is a display heuristic only.
    loadChoices.sort((a, b) => b.load - a.load || b.reps - a.reps || a.index - b.index || a.setIndex - b.setIndex);
    const largest = loadChoices.find(item => item.load > 0) || null;
    const rows = allRegions.map(region => ({id: region.id, label: region.label,
      total: regions.get(region.id) || 0, level: 0}));
    const maximum = Math.max(0, ...rows.map(row => row.total));
    for (const row of rows) row.level = row.total <= 0 ? 0 : row.total <= maximum / 3 ? 1 :
      row.total <= maximum * 2 / 3 ? 2 : 3;
    const main = [...rows].filter(row => row.total > 0).sort((a,b) => b.total - a.total).slice(0, 3);
    const front = new Set(['chest','frontDelts','sideDelts','upperTraps','biceps','forearms','abs','obliques','quadriceps','adductors']);
    const view = rows.filter(row => front.has(row.id)).reduce((n,r) => n+r.total,0) >=
      rows.filter(row => !front.has(row.id)).reduce((n,r) => n+r.total,0) ? 'front' : 'back';
    const cardio = CARDIO?.summarize?.(session.cardio) || {entries: [], totalMinutes: 0};
    const cardioChoices = cardio.entries.map(row => ({type: row.type, label: CARDIO.label(row.type),
      minutes: row.minutes, pace: CARDIO.paceLabel(row)}));
    const cardioTop = cardioChoices.slice().sort((a,b) => b.minutes - a.minutes)[0] || null;
    const showWeeks = weekDays(state, session.day);
    return {sessionId: session.id, day: validDate(session.day) ? session.day : '',
      planId: session.planId, loadChoices, largest, cardio: cardioChoices,
      cardioTotal: cardio.totalMinutes, cardioTop, weekDays: showWeeks,
      regions: rows, mainRegions: main, mapCoverageMissing: [...missing], hasMuscles: main.length > 0,
      preferredView: view, stairRegions: cardioChoices.some(row => row.type === 'escada') ? ['quadriceps','glutes','calves'] : [],
      summaryValid: true};
  }
  const api = Object.freeze({build, weekBounds, weekDays, labelLoad, labelSet});
  root.ForjaShareSummary = api;
  if (node) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
