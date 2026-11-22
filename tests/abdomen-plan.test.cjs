const test = require('node:test');
const assert = require('node:assert/strict');
const DATA = require('../data.js');
const F = require('../flex.js');
const C = require('../catalog-session.js');
const T = require('../training-sets.js');

test('abdominal complements stay in A/B and the four exercises are discoverable without duplicate IDs', () => {
  const expected = {'abdominal-solo':'A','abdominal-inverso':'B','abdominal-polia':'A','pallof-press':'B'};
  assert.deepEqual(DATA.rotation, ['A','C','B','D']);
  const all = F.options(DATA.exercises);
  for (const [id, group] of Object.entries(expected)) {
    const matches = all.filter(ex => ex.id === id);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].group, group);
    assert.equal(matches[0].sets, 2);
    assert.ok(F.options(DATA.exercises, null, 'abdomen').some(ex => ex.id === id));
    assert.ok(matches[0].equipment !== 'Ficha pessoal');
    assert.equal(matches[0].active, T.allowsZero(id));
  }
  assert.equal(all.find(ex => ex.id === 'pallof-press').repPerSide, true);
});

test('legacy upgrade adds only missing complements and preserves customized exercises, history and drafts', () => {
  const customized = {...DATA.exercises.find(ex => ex.id === 'abdominal-solo'), name:'Meu abdominal', sets:3, active:false};
  const old = {
    exercises:[{...DATA.exercises[0],sets:5}, customized],
    sessions:[{id:'old',entries:[{id:'pulley-aberto',sets:[{load:30,reps:10}]}]}],
    draft:{planId:'A',entries:{'pulley-aberto':{id:'pulley-aberto',sets:[{load:35,reps:''}]}}},
  };
  const before = structuredClone(old);
  assert.equal(DATA.ensureAbdomen(old), true);
  assert.deepEqual(old.exercises.slice(0,2), before.exercises);
  assert.deepEqual(old.sessions, before.sessions);
  assert.deepEqual(old.draft, before.draft);
  assert.equal(old.exercises.filter(ex => ex.id === 'abdominal-inverso').length, 1);
  assert.equal(old.abdomenDefaultsVersion, 1);
  const upgraded = structuredClone(old);
  assert.equal(DATA.ensureAbdomen(old), false);
  assert.deepEqual(old, upgraded);
  old.exercises.find(ex => ex.id === 'abdominal-inverso').active = false;
  DATA.ensureAbdomen(old);
  assert.equal(old.exercises.find(ex => ex.id === 'abdominal-inverso').active, false);
});

test('upgrade leaves a full custom exercise archive valid and does not partially insert defaults', () => {
  const full = {exercises:Array.from({length:199}, (_,i) => ({...DATA.exercises[0],id:'custom-'+i}))};
  const before = structuredClone(full);
  assert.equal(DATA.ensureAbdomen(full), false);
  assert.deepEqual(full, before);
});

test('catalog session prepares bodyweight load zero without counting unperformed repetitions', () => {
  const draft = {planId:'A',entries:{},plannedIds:[],skipped:[],addedIds:[]};
  const exercise = DATA.exercises.find(ex => ex.id === 'abdominal-solo');
  const before = structuredClone(draft);
  const result = C.prepare({draft,mode:'add',targetId:exercise.id,exercise});
  assert.equal(result.ok, true);
  assert.deepEqual(draft, before);
  const entry = result.draft.entries[exercise.id];
  assert.ok(entry.sets.every(set => set.load === 0 && set.reps === ''));
  assert.equal(F.hasWork(entry), false);
  assert.equal(F.effectiveSets(entry), 0);
  entry.sets[0].reps = 12;
  assert.equal(F.hasWork(entry), true);
  assert.equal(F.effectiveSets(entry), 1);
  assert.ok(F.withdraw(result.draft,exercise.id).error);
});
