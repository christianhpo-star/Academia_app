const test=require('node:test');
const assert=require('node:assert/strict');
const F=require('../flex.js');
const C=require('../catalog-session.js');
const exercise=F.catalog.find(x=>x.id==='puxada-neutra');
const another=F.catalog.find(x=>x.id==='voador-inverso');
const draft=()=>({
  planId:'A',energy:'normal',notes:'',
  entries:{
    'pulley-aberto':{id:'pulley-aberto',sets:[{load:'45',reps:'',rir:'',warmup:false}],pain:''},
    'remada-baixa':{id:'remada-baixa',sets:[{load:'40',reps:'12',rir:'2',warmup:false}],pain:''}
  },plannedIds:['pulley-aberto','remada-baixa'],skipped:[],addedIds:[]
});
test('swap requires selecting an unfinished source and leaves the original draft untouched',()=>{
  const initial=draft(),before=JSON.stringify(initial);
  const noSource=C.prepare({draft:initial,mode:'replace',sourceId:null,targetId:exercise.id,exercise});
  assert.equal(noSource.ok,false);
  const selected=C.prepare({draft:initial,mode:'replace',sourceId:'pulley-aberto',targetId:exercise.id,exercise});
  assert.equal(selected.ok,true);
  assert.equal(JSON.stringify(initial),before);
  assert.equal(selected.draft.entries['pulley-aberto'],undefined);
  assert.equal(selected.draft.entries['puxada-neutra'].sets.length,exercise.sets);
  assert.ok(selected.draft.entries['puxada-neutra'].sets.every(x=>x.reps===''));
  assert.equal(selected.draft.skipped[0].id,'pulley-aberto');
  assert.equal(selected.draft.skipped[0].reason,'preferencia');
  assert.equal(selected.draft.skipped[0].entry.sets[0].load,'45');
  assert.deepEqual(selected.draft.plannedIds,initial.plannedIds);
});
test('recorded reps may never be removed by replacement, even if load is missing',()=>{
  const src=draft(),before=JSON.stringify(src);
  const result=C.prepare({draft:src,mode:'replace',sourceId:'remada-baixa',targetId:exercise.id,exercise});
  assert.equal(result.ok,false);
  assert.match(result.error,/repetiç|dados/i);
  assert.equal(JSON.stringify(src),before);
});
test('session add creates only blank new sets, never permanent profile activation',()=>{
  const src=draft(),before=JSON.stringify(src);
  const result=C.prepare({draft:src,mode:'add',targetId:another.id,exercise:another});
  assert.equal(result.ok,true);
  assert.equal(result.draft.entries[another.id].sets.length,another.sets);
  assert.equal(result.draft.entries[another.id].sets[0].load,'');
  assert.equal(result.draft.skipped.length,0);
  assert.equal(JSON.stringify(src),before);
  assert.equal(result.draft.addedIds.includes(another.id),true);
});
test('extra exercise only appears for currently eligible suggestions and exactly once',()=>{
  const src=draft();
  const denied=C.prepare({draft:src,mode:'extra',targetId:another.id,exercise:another,eligibleExtraIds:[]});
  assert.equal(denied.ok,false);
  const approved=C.prepare({draft:src,mode:'extra',targetId:another.id,exercise:another,
    extraSourceId:'remada-baixa',eligibleExtraIds:[another.id]});
  assert.equal(approved.ok,true);
  assert.equal(approved.draft.entries[another.id].sets.length,1);
  assert.deepEqual(approved.draft.extraChoice,{kind:'exercise',id:another.id,sourceId:'remada-baixa'});
  const repeat=C.prepare({draft:approved.draft,mode:'extra',targetId:exercise.id,exercise,eligibleExtraIds:[exercise.id]});
  assert.equal(repeat.ok,false);
  assert.ok(!src.extraChoice);
});
test('reject repeated or withdrawn target; unrelated IDs and invalid exercise models',()=>{
  const src=draft();src.skipped=[{id:another.id,reason:'tempo',entry:{id:another.id,sets:[]}}];
  assert.equal(C.canChoose({draft:src,mode:'add',targetId:another.id}).ok,false);
  assert.equal(C.canChoose({draft:src,mode:'add',targetId:'pulley-aberto'}).ok,false);
  assert.equal(C.prepare({draft:src,mode:'add',targetId:'unknown',exercise:{id:'unknown',sets:-1}}).ok,false);
  assert.equal(C.prepare({draft:src,mode:'delete',targetId:exercise.id,exercise}).ok,false);
});
test('a replaced optional exercise removes orphaned extraChoice and keeps original records isolated',()=>{
  const src=draft();
  src.entries[another.id]={id:another.id,sets:[{load:'',reps:'',rir:'',warmup:false}],pain:''};
  src.addedIds.push(another.id);
  src.extraChoice={kind:'exercise',id:another.id,sourceId:'remada-baixa'};
  const r=C.prepare({draft:src,mode:'replace',sourceId:another.id,targetId:exercise.id,exercise});
  assert.equal(r.ok,true);
  assert.equal(r.draft.extraChoice,undefined);
  assert.equal(r.draft.skipped.find(x=>x.id===another.id),undefined);
  assert.deepEqual(src.extraChoice,{kind:'exercise',id:another.id,sourceId:'remada-baixa'});
});
