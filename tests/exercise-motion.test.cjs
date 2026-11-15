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

test('18 exercise-specific visuals distinguish equipment without changing identity',()=>{
  assert.equal(motion.variantCount,18);
  assert.equal(motion.variantLabel('supino-canadense'),'Banco declinado · barra');
  assert.equal(motion.variantLabel('flexora-c'),'Mesa · deitado');
  assert.equal(motion.variantLabel('flexora-sentada'),'Cadeira · sentado');
  assert.notEqual(motion.svg('supino-canadense',false),motion.svg('supino-inclinado',false));
  assert.notEqual(motion.svg('supino-maquina',false),motion.svg('supino-barra',false));
  assert.notEqual(motion.svg('flexora-c',false),motion.svg('flexora-sentada',false));
  assert.notEqual(motion.svg('panturrilha-banco',false),motion.svg('panturrilha-leg',false));
});
test('adduction and abduction use reversed movement and clear labels',()=>{
  const adductor=motion.svg('cadeira-adutora',true);
  const abductor=motion.svg('abdutora',true);
  assert.notEqual(adductor,abductor);
  assert.match(motion.viewer('cadeira-adutora','Adutora',true),/Fechar pernas/);
  assert.match(motion.viewer('abdutora','Abdutora',true),/Abrir pernas/);
  assert.match(adductor,/data-motion-id="cadeira-adutora"/);
});
test('smooth loop remains optional for reduced motion and never changes exercise records',()=>{
  const animated=motion.svg('supino-canadense',true);
  assert.match(animated,/calcMode="spline"/);
  assert.match(animated,/dur="2.8s"/);
  assert.doesNotMatch(motion.thumb('supino-canadense'),/<animate\b/);
  assert.doesNotMatch(motion.viewer('supino-canadense','Canadense',false),/<animate\b/);
  assert.match(motion.viewer('flexora-d','Flexora',true),/confirme a máquina escolhida/);
});
