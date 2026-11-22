const test = require('node:test');
const assert = require('node:assert/strict');
const SETS = require('../training-sets.js');
const set = (load = 0, reps = 12, warmup = false) => ({load, reps, warmup});

test('zero external load is valid only for the two reviewed bodyweight IDs', () => {
  for (const id of ['abdominal-solo', 'abdominal-inverso']) {
    assert.equal(SETS.allowsZero(id), true);
    assert.equal(SETS.allowsZero({id}), true);
    assert.equal(SETS.performed(set(), id), true);
    assert.equal(SETS.performed(set('0', '12'), {id}), true);
  }
  for (const id of ['abdominal-polia', 'pallof-press', 'supino-halteres', 'custom-core', undefined]) {
    assert.equal(SETS.allowsZero(id), false);
    assert.equal(SETS.performed(set(), id), false);
  }
  assert.equal(SETS.allowsZero({id: 'custom-core', bodyweight: true}), false);
});

test('blank or malformed values never stand in for bodyweight execution', () => {
  for (const load of ['', '  ', null, undefined, false, true, [], [0], {}, NaN, Infinity, -1, 1501]) {
    assert.equal(SETS.validLoad(load, 'abdominal-solo'), false, String(load));
    assert.equal(SETS.performed({load, reps: 12}, 'abdominal-solo'), false, String(load));
  }
  for (const reps of ['', ' ', null, undefined, false, true, [], [12], {}, NaN, Infinity, -1, 0, 1.5, 101])
    assert.equal(SETS.performed({load: 0, reps}, 'abdominal-solo'), false, String(reps));
  assert.equal(SETS.performed(null, 'abdominal-solo'), false);
  assert.equal(SETS.performed([], 'abdominal-solo'), false);
});

test('only executed working sets contribute; saved objects stay unchanged', () => {
  const entry = {id: 'abdominal-inverso', sets: [set(), set(0, 10, true), set(0, ''), set('', 10), set(2.5, 15)]};
  const before = structuredClone(entry);
  assert.deepEqual(SETS.workSets(entry), [entry.sets[0], entry.sets[4]]);
  assert.deepEqual(entry, before);
  assert.deepEqual(SETS.workSets(null), []);
  assert.equal(SETS.performed(set(1500, 100), 'abdominal-polia'), true);
  assert.equal(SETS.performed(set(2.5, 10), 'supino-halteres'), true);
});
