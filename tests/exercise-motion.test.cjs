'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const motion=require('../exercise-motion.js');
const data=require('../data.js');
const flex=require('../flex.js');
const all=[...data.exercises,...flex.catalog];
test('covers all curated strength exercises',()=>{
  assert.equal(all.length,51);
  for(const ex of all){
    assert.equal(motion.has(ex.id),true,ex.id);
    assert.match(motion.thumb(ex.id),/motion-svg/);
  }
});
test('unknown custom exercise does not imply illustrated exact technique',()=>{
  assert.equal(motion.has('exercise-invented'),false);
  assert.equal(motion.svg('exercise-invented',true),'');
  assert.equal(motion.thumb('exercise-invented'),'');
});
test('animated detail and static thumbs use the same family without forcing motion',()=>{
  assert.match(motion.svg('supino-halteres',true),/attributeName="points"/);
  assert.doesNotMatch(motion.thumb('supino-halteres'),/<animate\b/);
  assert.doesNotMatch(motion.viewer('supino-halteres','Supino',false),/<animate\b/);
  assert.match(motion.viewer('supino-halteres','Supino',true),/motion-pause/);
});
test('user-authored exercise names are escaped and no workout data is mutated',()=>{
  const before=JSON.stringify(data.exercises);
  const detail=motion.viewer('supino-halteres','<img src=x onerror=alert(1)>',true);
  assert.doesNotMatch(detail,/<img src=x/);
  assert.match(detail,/&lt;img/);
  assert.equal(JSON.stringify(data.exercises),before);
});
