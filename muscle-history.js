/* FORJA muscle history. Descriptive, local aggregation of saved strength sessions.
 * A primary set contributes 1 and an auxiliary set 0.5, following the existing
 * dose convention. Anatomical regions use the reviewed exercise illustrations.
 * Relative levels describe this window only; they are not training targets,
 * recovery estimates, activation measurements or a left/right assessment. */
(function installMuscleHistory(root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const defaultAnatomy = node ? require('./exercise-anatomy.js') : null;
  const defaultDose = node ? require('./dose.js') : null;
  const REGIONS = Object.freeze([
    ['chest', 'Peitoral maior', ['front']],
    ['frontDelts', 'Deltoide anterior', ['front']],
    ['sideDelts', 'Deltoide lateral', ['front', 'back']],
    ['rearDelts', 'Deltoide posterior', ['back']],
    ['upperTraps', 'Trapézio superior', ['front', 'back']],
    ['midTraps', 'Trapézio médio', ['back']],
    ['rhomboids', 'Romboides', ['back']],
    ['lats', 'Latíssimo do dorso', ['back']],
    ['biceps', 'Bíceps', ['front']],
    ['triceps', 'Tríceps', ['back']],
    ['forearms', 'Músculos do antebraço', ['front', 'back']],
    ['abs', 'Reto do abdômen', ['front']],
    ['obliques', 'Oblíquos', ['front']],
    ['quadriceps', 'Quadríceps', ['front']],
    ['hamstrings', 'Posteriores da coxa', ['back']],
    ['glutes', 'Glúteo máximo', ['back']],
    ['hipAbductors', 'Abdutores do quadril', ['back']],
    ['adductors', 'Adutores da coxa', ['front']],
    ['calves', 'Panturrilhas', ['back']],
  ].map(([id, label, views]) => Object.freeze({id, label, views: Object.freeze(views)})));
  const UNTRACKED = Object.freeze([
    {id: 'lumbar', label: 'Região lombar'},
  ].map(Object.freeze));
  const LEVELS = Object.freeze(['Sem registro', 'Menor volume relativo', 'Volume intermediário', 'Maior volume relativo']);
  const regionIds = new Set(REGIONS.map(region => region.id));
  const numeric = value => (typeof value === 'number' ||
    (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));
  const setsFor = (entry, dose) => dose.workSets({id: entry?.id, sets: (Array.isArray(entry?.sets) ? entry.sets : [])
    .filter(set => set && numeric(set.load) && numeric(set.reps))});
  const uniqueRegions = values => [...new Set((Array.isArray(values) ? values : [])
    .filter(id => regionIds.has(id)))];
  const levelFor = relative => relative <= 0 ? 0 : relative <= 1 / 3 ? 1 : relative <= 2 / 3 ? 2 : 3;

  function analyze({strengthSessions = [], today = '', days = 7,
    anatomy = root.ForjaExerciseAnatomy || defaultAnatomy,
    dose = root.ForjaDose || defaultDose} = {}) {
    days = [7, 30, 90].includes(Number(days)) ? Number(days) : 7;
    const available = typeof anatomy?.describe === 'function' &&
      typeof dose?.workSets === 'function' && typeof dose?.validDate === 'function' &&
      typeof dose?.dayAge === 'function';
    const validToday = available && dose.validDate(today);
    const endDay = validToday ? today : null;
    const startDay = validToday ? new Date(Date.parse(today + 'T12:00:00Z') -
      (days - 1) * 86400000).toISOString().slice(0, 10) : null;
    const stats = Object.fromEntries(REGIONS.map(region => [region.id, {
      ...region, directSets: 0, indirectSets: 0, total: 0,
      sessionKeys: new Set(), activeDays: new Set(), lastDay: null, exercises: new Map(),
    }]));
    const activeDays = new Set(), seenSessions = new Set();
    let knownEntries = 0, unknownEntries = 0, knownSets = 0, unknownSets = 0;
    let completedSessions = 0, mappedSessions = 0, duplicateSessions = 0;
    const sessions = validToday && Array.isArray(strengthSessions) ? strengthSessions : [];
    for (const [index, session] of sessions.entries()) {
      const age = dose.dayAge(today, session?.day);
      if (!Number.isFinite(age) || age < 0 || age >= days) continue;
      const stableId = typeof session?.id === 'string' && session.id.trim() ? session.id : null;
      if (stableId && seenSessions.has(stableId)) { duplicateSessions++; continue; }
      if (stableId) seenSessions.add(stableId);
      const sessionKey = stableId ? 'id:' + stableId : 'row:' + index;
      const skipped = new Set((Array.isArray(session.skipped) ? session.skipped : [])
        .map(item => typeof item === 'string' ? item : item?.id));
      let hasSets = false, hasMappedSets = false;
      for (const entry of Array.isArray(session.entries) ? session.entries : []) {
        if (!entry || skipped.has(entry.id) || entry.skipped === true || entry.status === 'skipped') continue;
        const count = setsFor(entry, dose).length;
        if (!count) continue;
        hasSets = true;
        const profile = typeof entry.id === 'string' ? anatomy.describe(entry.id) : null;
        const direct = uniqueRegions(profile?.main);
        const indirect = uniqueRegions(profile?.assist).filter(id => !direct.includes(id));
        if (!direct.length && !indirect.length) { unknownEntries++; unknownSets += count; continue; }
        knownEntries++; knownSets += count; hasMappedSets = true;
        for (const [ids, field] of [[direct, 'directSets'], [indirect, 'indirectSets']]) {
          for (const id of ids) {
            const stat = stats[id];
            stat[field] += count;
            stat.sessionKeys.add(sessionKey); stat.activeDays.add(session.day);
            if (!stat.lastDay || session.day > stat.lastDay) stat.lastDay = session.day;
            if (!stat.exercises.has(entry.id)) stat.exercises.set(entry.id, {
              id: entry.id, directSets: 0, indirectSets: 0,
              sessionKeys: new Set(), activeDays: new Set(), lastDay: null,
            });
            const exercise = stat.exercises.get(entry.id);
            exercise[field] += count;
            exercise.sessionKeys.add(sessionKey); exercise.activeDays.add(session.day);
            if (!exercise.lastDay || session.day > exercise.lastDay) exercise.lastDay = session.day;
          }
        }
      }
      if (hasSets) { completedSessions++; activeDays.add(session.day); }
      if (hasMappedSets) mappedSessions++;
    }
    const regions = Object.values(stats).map(stat => ({
      id: stat.id, label: stat.label, views: [...stat.views],
      directSets: stat.directSets, indirectSets: stat.indirectSets,
      total: stat.directSets + .5 * stat.indirectSets,
      sessions: stat.sessionKeys.size, days: stat.activeDays.size,
      activeDays: [...stat.activeDays].sort(), lastDay: stat.lastDay,
      exercises: [...stat.exercises.values()].map(exercise => ({
        id: exercise.id, directSets: exercise.directSets, indirectSets: exercise.indirectSets,
        total: exercise.directSets + .5 * exercise.indirectSets,
        sessions: exercise.sessionKeys.size, days: exercise.activeDays.size,
        lastDay: exercise.lastDay,
      })).sort((a, b) => b.total - a.total || a.id.localeCompare(b.id)),
    }));
    const maxTotal = Math.max(0, ...regions.map(region => region.total));
    for (const region of regions) {
      region.relative = maxTotal ? region.total / maxTotal : 0;
      region.level = levelFor(region.relative);
      region.levelLabel = LEVELS[region.level];
    }
    const positive = regions.filter(region => region.total > 0);
    const minPositive = positive.length ? Math.min(...positive.map(region => region.total)) : 0;
    const totalSets = knownSets + unknownSets;
    return {
      days, startDay, endDay, available, validToday: !!validToday,
      regions, rows: regions, byId: Object.fromEntries(regions.map(region => [region.id, region])),
      maxTotal, most: positive.filter(region => region.total === maxTotal).map(region => region.id),
      least: minPositive < maxTotal ? positive.filter(region => region.total === minPositive).map(region => region.id) : [],
      zero: regions.filter(region => !region.total).map(region => region.id),
      untracked: UNTRACKED.map(region => ({...region})),
      knownEntries, unknownEntries, knownSets, unknownSets, totalSets,
      completedSessions, mappedSessions, duplicateSessions,
      activeDays: [...activeDays].sort(),
      coverage: totalSets ? knownSets / totalSets : null,
      hasEvidence: knownSets > 0,
    };
  }
  const api = {VERSION: 1, REGIONS, UNTRACKED, LEVELS, analyze};
  root.ForjaMuscleHistory = api;
  if (node) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
