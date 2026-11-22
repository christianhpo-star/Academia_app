const test = require('node:test');
const assert = require('node:assert/strict');
const HISTORY = require('../muscle-history.js');
const ANATOMY = require('../exercise-anatomy.js');
const DATA = require('../data.js');
const FLEX = require('../flex.js');
const TODAY = '2026-11-22';
const entry = (id, count = 1, values = {}) => ({id, sets: Array.from({length: count}, () =>
  ({load: 20, reps: 10, rir: 2, warmup: false, ...values}))});
const session = (day, entries, id = day) => ({id, day, timestamp: day + 'T17:00:00Z', entries});
const ago = (days, today = TODAY) => new Date(Date.parse(today + 'T12:00:00Z') - days * 86400000).toISOString().slice(0, 10);
const analyze = (sessions, options = {}) => HISTORY.analyze({today: TODAY, strengthSessions: sessions, ...options});

test('all 78 catalog exercises contribute only to the 19 reviewed anatomical regions', () => {
  const exercises = [...new Map([...FLEX.catalog, ...DATA.exercises].map(ex=>[ex.id,ex])).values()];
  assert.equal(exercises.length, 78);
  assert.equal(HISTORY.REGIONS.length, 19);
  const output = analyze([session(TODAY, exercises.map(exercise => entry(exercise.id)))]);
  assert.equal(output.knownEntries, 78);
  assert.equal(output.unknownEntries, 0);
  assert.equal(output.knownSets, 78);
  assert.equal(output.coverage, 1);
  assert.equal(output.zero.length, 0);
  for (const exercise of exercises) {
    const profile = ANATOMY.describe(exercise.id);
    assert.ok([...profile.main, ...profile.assist].every(id => output.byId[id]), exercise.id);
  }
  assert.deepEqual(output.untracked.map(region => region.id), ['lumbar']);
  assert.ok(output.untracked.every(region => !output.byId[region.id]));
});

test('bodyweight abdominal sets keep their identity across 7, 30 and 90-day windows', () => {
  const sessions = [
    session(TODAY, [entry('abdominal-solo', 2, {load:0})]),
    session(ago(6), [entry('pallof-press', 2, {load:5})]),
    session(ago(7), [entry('abdominal-inverso', 2, {load:'0'})]),
    session(ago(29), [entry('abdominal-polia', 2, {load:10})]),
    session(ago(30), [entry('abdominal-solo', 2, {load:0})]),
    session(ago(89), [entry('pallof-press', 2, {load:5})]),
    session(ago(90), [entry('abdominal-solo', 20, {load:0})]),
  ];
  for(const [days,abs,obliques,sets] of [[7,3,3,4],[30,7,5,8],[90,10,8,12]]){
    const result=analyze(sessions,{days});
    assert.equal(result.byId.abs.total,abs,`${days} abs`);
    assert.equal(result.byId.obliques.total,obliques,`${days} obliques`);
    assert.equal(result.totalSets,sets,`${days} actual sets`);
    assert.equal(result.byId.abs.lastDay,TODAY);
    assert.equal(result.byId.obliques.lastDay,TODAY);
    assert.equal(result.unknownSets,0);
    assert.equal(result.coverage,1);
  }
  assert.deepEqual(analyze(sessions).byId.abs.views,['front']);
  assert.deepEqual(analyze(sessions).byId.obliques.views,['front']);
});

test('zero load is specific to performed bodyweight abdominals and cannot fill blank or unsupported records', () => {
  const invalid=[
    {load:'',reps:10},{load:' ',reps:10},{load:false,reps:10},
    {load:null,reps:10},{load:[],reps:10},{load:0,reps:''},
    {load:0,reps:2.5},{load:0,reps:101},{load:0,reps:true},
    {load:0,reps:10,warmup:true},{load:-1,reps:10},
  ];
  const result=analyze([session(TODAY,[
    {id:'abdominal-solo',sets:invalid},
    entry('abdominal-inverso',2,{load:0}),
    entry('abdominal-polia',4,{load:0}),
    entry('pallof-press',4,{load:0}),
    entry('extensora',4,{load:0}),
    entry('custom-abs',4,{load:0}),
    entry('stiff',3),
  ])]);
  assert.equal(result.byId.abs.directSets,2);
  assert.equal(result.byId.abs.indirectSets,0);
  assert.equal(result.byId.obliques.indirectSets,2);
  assert.equal(result.byId.obliques.directSets,0);
  assert.equal(result.byId.quadriceps.total,0);
  assert.equal(result.byId.hamstrings.total,3);
  assert.equal(result.totalSets,5);
  assert.equal(result.unknownEntries,0);
});

test('primary and auxiliary sets follow the existing 1 and 0.5 convention', () => {
  const output = analyze([session(TODAY, [entry('supino-halteres', 3), entry('triceps-corda', 2)])]);
  assert.equal(output.byId.chest.directSets, 3);
  assert.equal(output.byId.chest.total, 3);
  assert.equal(output.byId.frontDelts.indirectSets, 3);
  assert.equal(output.byId.frontDelts.total, 1.5);
  assert.equal(output.byId.triceps.directSets, 2);
  assert.equal(output.byId.triceps.indirectSets, 3);
  assert.equal(output.byId.triceps.total, 3.5);
  assert.equal(output.totalSets, 5, 'a compound set is not multiplied in the total performed-set count');
  assert.equal(output.byId.sideDelts.total, 0, 'the broad shoulder group must not be painted uniformly');
  assert.equal(output.byId.rearDelts.total, 0);
});

for (const days of [7, 30, 90]) {
  test(`${days}-day window includes today and day ${days - 1}, excludes day ${days} and the future`, () => {
    const output = analyze([
      session(TODAY, [entry('extensora', 2)]),
      session(ago(days - 1), [entry('extensora', 3)]),
      session(ago(days), [entry('extensora', 9)]),
      session(ago(-1), [entry('extensora', 9)]),
    ], {days});
    assert.equal(output.days, days);
    assert.equal(output.startDay, ago(days - 1));
    assert.equal(output.endDay, TODAY);
    assert.equal(output.byId.quadriceps.total, 5);
    assert.equal(output.byId.quadriceps.days, 2);
    assert.equal(output.completedSessions, 2);
  });
}

test('calendar boundaries handle leap days without using the session UTC timestamp as its local date', () => {
  const output = analyze([
    {...session('2024-02-29', [entry('stiff', 2)]), timestamp: '2024-03-01T01:00:00Z'},
    session('2024-02-24', [entry('stiff', 4)]),
    session('2024-02-23', [entry('stiff', 9)]),
  ], {today: '2024-03-01', days: 7});
  assert.equal(output.startDay, '2024-02-24');
  assert.equal(output.byId.hamstrings.total, 6);
  assert.equal(output.byId.hamstrings.lastDay, '2024-02-29');
});

test('invalid dates, unperformed rows, warmups and malformed load/repetition types do not create volume', () => {
  const badSets = [
    {load: 20, reps: '', warmup: false}, {load: '', reps: 10},
    {load: 20, reps: 10, warmup: true}, {load: 0, reps: 10},
    {load: -2, reps: 10}, {load: 1501, reps: 10}, {load: Infinity, reps: 10},
    {load: 20, reps: 0}, {load: 20, reps: 101}, {load: 20, reps: 2.5},
    {load: 20, reps: NaN}, {load: true, reps: 10}, {load: 20, reps: true},
    {load: [20], reps: 10}, {load: 20, reps: [10]}, {load: '  ', reps: 10},
  ];
  const output = analyze([
    session('2026-02-30', [entry('extensora', 10)]),
    session('2026-13-01', [entry('extensora', 10)]),
    session('', [entry('extensora', 10)]),
    session(TODAY, [{id: 'extensora', sets: badSets}, entry('flexora-c', 2, {load: '25', reps: '12', rir: ''})]),
  ]);
  assert.equal(output.byId.quadriceps.total, 0);
  assert.equal(output.byId.hamstrings.total, 2);
  assert.equal(output.completedSessions, 1);
  assert.equal(output.totalSets, 2);
});

test('drafts, planned IDs, skipped entries and Muay activities never enter the saved strength map', () => {
  const output = analyze([
    {...session(TODAY, [entry('extensora', 10), entry('stiff', 2), {...entry('supino-halteres'), skipped: true}]),
      plannedIds: ['panturrilha-leg'], skipped: [{id: 'extensora', reason: 'sem-registro'}]},
  ], {draft: {entries: {'supino-halteres': entry('supino-halteres', 20)}},
    muaySessions: [session(TODAY, [entry('extensora', 20)])]});
  assert.equal(output.byId.quadriceps.total, 0);
  assert.equal(output.byId.chest.total, 0);
  assert.equal(output.byId.calves.total, 0);
  assert.equal(output.byId.hamstrings.total, 2);
  assert.equal(output.totalSets, 2);
});

test('separate sessions on the same day count separately while active days and exercise histories remain unique', () => {
  const output = analyze([
    session(TODAY, [entry('remada-baixa', 2), entry('remada-peito-apoiado', 1)], 'morning'),
    session(TODAY, [entry('remada-baixa', 1)], 'evening'),
    session(ago(2), [entry('remada-baixa', 3)], 'prior'),
  ]);
  const lats = output.byId.lats;
  assert.equal(lats.total, 7);
  assert.equal(lats.sessions, 3);
  assert.equal(lats.days, 2);
  assert.equal(lats.lastDay, TODAY);
  assert.equal(lats.exercises.length, 2);
  assert.equal(lats.exercises.find(exercise => exercise.id === 'remada-baixa').total, 6);
  assert.equal(lats.exercises.find(exercise => exercise.id === 'remada-baixa').sessions, 3);
  assert.deepEqual(output.activeDays, [ago(2), TODAY]);
});

test('the same stable session ID is not counted twice after duplicated imports', () => {
  const original = session(TODAY, [entry('extensora', 2)], 'stable-session');
  const output = analyze([original, structuredClone(original)]);
  assert.equal(output.totalSets, 2);
  assert.equal(output.completedSessions, 1);
  assert.equal(output.duplicateSessions, 1);
  const legacy = analyze([{day: TODAY, entries: [entry('extensora')]}, {day: TODAY, entries: [entry('extensora')]}]);
  assert.equal(legacy.totalSets, 2, 'different legacy records without IDs are not guessed to be duplicates');
});

test('unmapped saved exercises reduce coverage without inventing muscle attribution', () => {
  const output = analyze([session(TODAY, [entry('extensora', 2), entry('custom-123', 4)])]);
  assert.equal(output.unknownEntries, 1);
  assert.equal(output.unknownSets, 4);
  assert.equal(output.knownSets, 2);
  assert.equal(output.coverage, 2 / 6);
  assert.equal(output.byId.quadriceps.total, 2);
  assert.equal(output.regions.filter(region => region.total > 0).length, 1);
  const unknownOnly = analyze([session(TODAY, [entry('custom-123')])]);
  assert.equal(unknownOnly.hasEvidence, false);
  assert.equal(unknownOnly.completedSessions, 1);
  assert.equal(unknownOnly.mappedSessions, 0);
  assert.equal(unknownOnly.coverage, 0);
});

test('relative levels and extremum lists are derived independently for the selected window', () => {
  const sessions = [
    session(TODAY, [entry('extensora', 6), entry('flexora-c', 4), entry('abdutora', 2)]),
    session(ago(20), [entry('flexora-c', 10)]),
  ];
  const short = analyze(sessions);
  assert.deepEqual(short.most, ['quadriceps']);
  assert.deepEqual(short.least, ['hipAbductors']);
  assert.equal(short.byId.quadriceps.level, 3);
  assert.equal(short.byId.hamstrings.level, 2);
  assert.equal(short.byId.hipAbductors.level, 1);
  assert.equal(short.byId.chest.level, 0);
  assert.equal(short.byId.hipAbductors.relative, 1 / 3);
  const long = analyze(sessions, {days: 30});
  assert.deepEqual(long.most, ['hamstrings']);
  assert.equal(long.byId.hamstrings.total, 14);
  assert.equal(long.byId.quadriceps.level, 2);
  assert.equal(long.byId.quadriceps.total, short.byId.quadriceps.total);
});

test('equal positive values are not described as both most and least', () => {
  const output = analyze([session(TODAY, [entry('extensora', 2), entry('flexora-c', 2)])]);
  assert.deepEqual(output.most, ['quadriceps', 'hamstrings']);
  assert.deepEqual(output.least, []);
  assert.equal(output.zero.length, 17);
  assert.equal(output.byId.hamstrings.level, output.byId.quadriceps.level);
});

test('no history, invalid today and missing dependencies return finite neutral data', () => {
  for (const output of [analyze([]), analyze([session(TODAY, [entry('extensora')])], {today: 'wrong'}),
    analyze([], {anatomy: null}), analyze(null)]) {
    assert.equal(output.hasEvidence, false);
    assert.equal(output.maxTotal, 0);
    assert.equal(output.coverage, null);
    assert.deepEqual(output.most, []);
    assert.deepEqual(output.least, []);
    assert.equal(output.zero.length, 19);
    for (const region of output.regions) {
      assert.equal(region.total, 0);
      assert.equal(region.relative, 0);
      assert.equal(region.level, 0);
      assert.equal(region.lastDay, null);
    }
  }
  assert.equal(analyze([], {days: 14}).days, 7);
  assert.equal(analyze([], {days: '30'}).days, 30);
});

test('history, exercise profiles and settings are never mutated or used as a prescription', () => {
  const input = {strengthSessions: [session(TODAY, [entry('supino-halteres', 2)])], today: TODAY,
    settings: {kneePain: 7, fatigue: 'alta'}, weights: [{date: TODAY, weight: 88}]};
  const before = structuredClone(input);
  const profileBefore = structuredClone(ANATOMY.describe('supino-halteres'));
  const freezeDeep = value => {
    if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freezeDeep); }
    return value;
  };
  freezeDeep(input);
  const result = HISTORY.analyze(input);
  assert.deepEqual(input, before);
  assert.deepEqual(ANATOMY.describe('supino-halteres'), profileBefore);
  assert.equal(result.byId.chest.total, 2);
  assert.ok(!('recommendations' in result));
  assert.ok(!('recovery' in result));
  assert.ok(!('left' in result.byId.chest));
  result.byId.chest.views.push('invalid');
  assert.deepEqual(HISTORY.REGIONS.find(region => region.id === 'chest').views, ['front']);
});
