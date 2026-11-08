const test=require('node:test');
const assert=require('node:assert/strict');
const F=require('../flex.js');
const D=require('../data.js');
const day=(n)=>'2026-11-'+String(n).padStart(2,'0');
const work=(id='remada-baixa')=>({id,sets:[{load:40,reps:10,rir:2,warmup:false}],pain:null});
const sess=(n,opts={})=>({
  id:'s'+n,day:day(n),timestamp:day(n)+'T15:00:00Z',planId:'A',
  entries:[work()],...opts,
});
test('catálogo curado tem IDs exclusivos, grupos e metadados legíveis',()=>{
  assert.ok(F.catalog.length>=15);
  assert.equal(new Set(F.catalog.map(e=>e.id)).size,F.catalog.length);
  assert.ok(F.catalog.every(e=>e.name && e.group && e.equipment && e.muscle));
  assert.equal(F.prepareCatalog('remada-unilateral-halter',D.exercises).isNew,true);
  assert.equal(F.prepareCatalog('remada-baixa',D.exercises).isNew,false);
});
test('omitir só hoje preserva modelo e pode restaurar',()=>{
  const original=structuredClone(D.exercises);
  const draft={planId:'A',entries:{'remada-baixa':{id:'remada-baixa',sets:[{load:40,reps:'',rir:'',warmup:false}]}}};
  assert.equal(F.withdraw(draft,'remada-baixa').skipped,true);
  assert.equal(F.setReason(draft,'remada-baixa','tempo'),true);
  assert.deepEqual(F.skippedForSave(draft),[{id:'remada-baixa',reason:'tempo'}]);
  assert.equal(F.restore(draft,'remada-baixa'),true);
  assert.equal(F.skippedForSave(draft).length,0);
  assert.deepEqual(D.exercises,original);
});
test('não permite apagar silenciosamente uma série realizada',()=>{
  const draft={entries:{'remada-baixa':work()},planId:'A'};
  assert.match(F.withdraw(draft,'remada-baixa').error,/repetições/);
  assert.equal(Object.keys(draft.entries).length,1);
});
test('novo exercício não se torna automaticamente exercício da ficha',()=>{
  const d={entries:{},planId:'A'};
  const found=F.prepareCatalog('puxada-neutra',D.exercises);
  assert.equal(found.exercise.active,false);
  assert.equal(F.addToDraft(d,found.exercise.id,found.exercise,{id:found.exercise.id,sets:[]}),true);
  assert.deepEqual(d.addedIds,['puxada-neutra']);
  assert.equal(F.options(D.exercises,d).some(x=>x.id==='puxada-neutra'),false);
  assert.equal(F.withdraw(d,found.exercise.id).skipped,false);
  assert.deepEqual(d.skipped,[]);
});
test('dias sem registro não são interpretados como falta nem exercício omitido',()=>{
  const result=F.insights({today:day(8),strengthSessions:[sess(2)]});
  assert.equal(result.signals.length,0);
  assert.equal(result.summary.strengthDays7,1);
});
test('queda de frequência exige linha de base e é descrita sem culpabilização',()=>{
  const sessions=[4,6,8,10,23].map(n=>sess(n));
  const a=F.insights({today:day(30),strengthSessions:sessions});
  assert.equal(a.signals.some(x=>x.kind==='frequency'),true);
  assert.equal(a.objective,'recomposition');
});
test('omissão frequente requer eventos explícitos em 3 sessões',()=>{
  const records=[1,4,7].map(n=>sess(n,{
    plannedIds:['remada-baixa','pulley-aberto'],skipped:[{id:'pulley-aberto',reason:'equipamento'}],
  }));
  const a=F.insights({today:day(8),strengthSessions:records,exercises:D.exercises});
  const hit=a.signals.find(x=>x.kind==='skip');
  assert.ok(hit);
  assert.equal(hit.exerciseId,'pulley-aberto');
  assert.match(hit.suggestion,/equipamento/);
  const legacy=F.insights({today:day(8),strengthSessions:records.map(x=>{const z={...x};delete z.plannedIds;return z;}),exercises:D.exercises});
  assert.equal(legacy.signals.some(x=>x.kind==='skip'),false);
});
test('muay no mesmo dia e dor alteram cautela sem virar séries de musculação',()=>{
  const d={entries:{'remada-baixa':work()}};
  const result=F.insights({today:day(8),draft:d,muaySessions:[{day:day(8)}],settings:{fatigue:'alta',kneePain:2}});
  assert.equal(result.summary.completedSetsToday,1);
  assert.equal(result.summary.muaySessions7,1);
  assert.equal(result.sameDayMuay,true);
  assert.equal(result.protects,true);
  assert.match(result.note,/não proponha volume adicional/);
});
test('busca filtra por equipamento e resiste a IDs já usados',()=>{
  const d={entries:{'puxada-neutra':{sets:[]}},skipped:[]};
  const filtered=F.options([],d,'Halteres','A');
  assert.ok(filtered.some(x=>x.id==='remada-unilateral-halter'));
  assert.ok(!filtered.some(x=>x.id==='puxada-neutra'));
  assert.equal(F.addToDraft(d,'puxada-neutra',{},{}),false);
});

test('intervalos crescentes exigem seis lacunas observadas e não inferem falta',()=>{
  const sessions=[1,2,3,4,9,14,19,24].map(n=>sess(n));
  const result=F.insights({today:day(25),strengthSessions:sessions});
  const signal=result.signals.find(x=>x.kind==='spacing');
  assert.ok(signal);
  assert.match(signal.detail,/média/i);
  const insufficient=F.insights({today:day(25),strengthSessions:sessions.slice(-4)});
  assert.equal(insufficient.signals.some(s=>s.kind==='spacing'),false);
});
