const test=require('node:test'),assert=require('node:assert/strict');
const BAL=require('../training-balance.js');
const F=require('../flex.js'),DATA=require('../data.js'),ANAT=require('../exercise-anatomy.js');
const SETS=require('../training-sets.js'),DOSE=require('../dose.js');
const work=(id,load=30,n=3)=>({id,sets:Array.from({length:n},()=>({load,reps:10,rir:2,warmup:false}))});
const session=(id,day,entries)=>({id,day,planId:'B',timestamp:day+'T13:00:00Z',entries});
const weeks=[
  session('a','2026-11-02',[work('supino-halteres'),work('voador')]),
  session('b','2026-11-10',[work('supino-halteres'),work('voador')]),
  session('c','2026-11-18',[work('supino-halteres'),work('voador')]),
];
const draft=()=>({planId:'B',energy:'normal',
  entries:{'supino-halteres':{id:'supino-halteres',sets:[{load:35,reps:'',warmup:false}]},
    'voador':{id:'voador',sets:[{load:45,reps:'',warmup:false}]}},
  skipped:[],plannedIds:['supino-halteres','voador'],addedIds:[]});
const args={strengthSessions:weeks,exercises:DATA.exercises,settings:{fatigue:'normal',kneePain:''},
  muaySessions:[],today:'2026-11-22'};
test('audits direct gaps without conflating indirect sets and no-history',()=>{
  const report=BAL.evaluate(args);
  assert.equal(report.ready,true);
  const abs=report.alerts.find(x=>x.id==='abs');
  assert.ok(abs && abs.direct30===0);
  assert.match(abs.reason,/30 dias/);
  assert.ok(abs.options.some(x=>['abdominal-bicicleta','dead-bug','abdominal-polia'].includes(x.id)));
  assert.ok(report.alerts.every(x=>x.id!=='lumbar'));
  assert.ok(BAL.evaluate({...args,strengthSessions:weeks.slice(0,2)}).ready===false);
  assert.equal(BAL.lastDirect('chest',weeks,args.today),'2026-11-18');
});
test('detects 20+ day gaps from 90-day direct records and respects historical activity',()=>{
  const earlier=session('older','2026-10-28',[work('pallof-press')]);
  const report=BAL.evaluate({...args,strengthSessions:[earlier,...weeks]});
  const ob=report.alerts.find(x=>x.id==='obliques');
  assert.ok(ob);
  assert.equal(ob.gapDays,25);
  assert.match(ob.reason,/25 dias/);
});
test('suggests only an optional same-day replacement of unperformed overlapping exercise',()=>{
  const original=draft(),before=structuredClone(original);
  const result=BAL.evaluate({...args,draft:original});
  assert.ok(result.recommendations.length>0);
  const suggestion=result.recommendations[0];
  assert.ok(['supino-halteres','voador'].includes(suggestion.sourceId));
  assert.ok(suggestion.targetId!==suggestion.sourceId);
  assert.ok(suggestion.temporary);
  assert.equal(ANAT.describe(suggestion.targetId).main.includes(suggestion.regionId),true);
  assert.deepEqual(original,before);
  assert.equal(SETS.workSets(original.entries[suggestion.sourceId]).length,0);
});
test('preserves performed exercises, fatigue, Muay Thai and joint pain caution',()=>{
  const completed=draft();completed.entries['voador'].sets[0].reps=10;
  completed.entries['supino-halteres'].sets[0].reps=10;
  assert.equal(BAL.evaluate({...args,draft:completed}).recommendations.length,0);
  assert.equal(BAL.evaluate({...args,draft:draft(),settings:{fatigue:'alta',kneePain:''}}).recommendations.length,0);
  assert.equal(BAL.evaluate({...args,draft:draft(),muaySessions:[{day:'2026-11-22'}]}).recommendations.length,0);
  const hurt=BAL.evaluate({...args,draft:draft(),settings:{fatigue:'normal',kneePain:3}});
  assert.ok(hurt.recommendations.every(r=>!['calves','quadriceps','glutes','hamstrings','hipAbductors','adductors'].includes(r.regionId)));
});
test('new catalog exercises all have anatomy, volume map and stable unique ids',()=>{
  const ids=['abdominal-bicicleta','elevacao-joelhos-suspenso','flexao-lateral-polia','dead-bug','woodchop-polia',
    'panturrilha-smith','panturrilha-sentada-maquina','agachamento-sumo-halter','passada-lateral-halter','extensao-lombar-45'];
  const options=F.options(DATA.exercises);
  for(const id of ids){
    assert.equal(options.filter(x=>x.id===id).length,1,id);
    assert.ok(ANAT.describe(id),id);
    assert.ok(DOSE.MAP[id],id);
    assert.equal(options.find(x=>x.id===id).active,false);
  }
  for(const id of ['dead-bug','abdominal-bicicleta','elevacao-joelhos-suspenso','extensao-lombar-45']){
    assert.equal(SETS.allowsZero(id),true);
    assert.equal(SETS.workSets({id,sets:[{load:0,reps:12,warmup:false}]}).length,1);
  }
});
