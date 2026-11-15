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

test('v3 renders labeled articulated body and movement trajectories only in detail views',()=>{
  const svg=motion.svg('supino-canadense',true,'start',true);
  assert.match(svg,/m-neck/);
  assert.match(svg,/m-shoulder-band/);
  assert.match(svg,/data-joint="E"/);
  assert.match(svg,/m-joint-active/);
  assert.match(svg,/m-motion-track/);
  assert.match(svg,/marker-end=/);
  assert.doesNotMatch(motion.thumb('supino-canadense'),/m-motion-track/);
});
test('v3 start and final poses are distinct static vector illustrations with different markers',()=>{
  const a=motion.svg('flexora-c',false,'start',true),b=motion.svg('flexora-c',false,'end',true);
  assert.notEqual(a,b);
  assert.match(a,/id="m-arrow-flexora-c-start"/);
  assert.match(b,/id="m-arrow-flexora-c-end"/);
  assert.match(a,/m-motion-track/);
  assert.match(b,/m-motion-track/);
  assert.doesNotMatch(a,/<animate\b/);
  assert.doesNotMatch(b,/<animate\b/);
  const staticViewer=motion.viewer('flexora-c','Mesa flexora',false);
  assert.match(staticViewer,/motion-static-pair/);
  assert.match(staticViewer,/>Início</);
  assert.match(staticViewer,/>Fim</);
  assert.doesNotMatch(staticViewer,/data-action="motion-pause"/);
});
test('v3 animated viewer has explicit stage, accessible phase selection and legend',()=>{
  const v=motion.viewer('supino-canadense','Supino canadense',true);
  assert.match(v,/data-action="motion-phase" data-phase="start"/);
  assert.match(v,/data-action="motion-phase" data-phase="end"/);
  assert.match(v,/data-action="motion-pause"/);
  assert.match(v,/motion-legend/);
  assert.match(v,/m-motion-track/);
});
