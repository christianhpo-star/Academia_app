const test=require('node:test');
const assert=require('node:assert/strict');
const F=require('../flex.js'),DATA=require('../data.js');
const A=require('../exercise-anatomy.js'),DOSE=require('../dose.js');
const C=require('../catalog-recommendations.js');
const CSESSION=require('../catalog-session.js');
const SETS=require('../training-sets.js');
const work=id=>({id,sets:Array.from({length:3},()=>({load:40,reps:10,rir:2,warmup:false}))});
const sessions=[
  {id:'w1',day:'2026-11-02',entries:[work('supino-halteres'),work('voador')]},
  {id:'w2',day:'2026-11-10',entries:[work('supino-halteres'),work('voador')]},
  {id:'w3',day:'2026-11-18',entries:[work('supino-halteres'),work('voador')]}
];
const args={strengthSessions:sessions,muaySessions:[],exercises:DATA.exercises,
  settings:{fatigue:'normal',kneePain:''},today:'2026-11-22'};
test('10 shoulder/trapezius movements have stable catalog IDs, body figures and direct region mapping',()=>{
 const ids=['encolhimento-halteres','encolhimento-barra','encolhimento-smith','face-pull-alto',
  'elevacao-y-inclinada','crucifixo-inverso-banco','elevacao-lateral-maquina','elevacao-frontal-polia',
  'desenvolvimento-barra','remada-alta-polia'];
 const catalog=F.options(DATA.exercises);
 const shoulder=new Set(['frontDelts','sideDelts','rearDelts','upperTraps','midTraps']);
 for(const id of ids){
   const rows=catalog.filter(x=>x.id===id);assert.equal(rows.length,1,id);
   assert.equal(rows[0].active,false,id);
   assert.ok(['A','B'].includes(rows[0].group));
   assert.ok(DOSE.MAP[id],id);
   const anatomy=A.describe(id);assert.ok(anatomy,id);
   assert.ok(anatomy.main.some(x=>shoulder.has(x)),id);
   assert.ok(A.figure(id,false,anatomy.view).includes('<svg'),id);
 }
 assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
});
test('recommendation badges require evidence, are linked to main muscles and capped',()=>{
 const options=F.options(DATA.exercises);
 const noHistory=C.status({...args,strengthSessions:[]});
 assert.equal(noHistory.ready,false);
 assert.equal(C.ranked(options,noHistory).size,0);
 assert.equal(C.forExercise(options.find(x=>x.id==='encolhimento-halteres'),noHistory),null);
 const context=C.status(args);
 assert.equal(context.ready,true);
 const shoulder=C.forExercise(options.find(x=>x.id==='encolhimento-halteres'),context);
 assert.ok(shoulder);
 assert.equal(shoulder.regionId,'upperTraps');
 assert.match(shoulder.message,/registrad/i);
 assert.equal(C.forExercise(options.find(x=>x.id==='voador'),context),null);
 const ranked=C.ranked(options,context,2);
 assert.ok(ranked.size>0);
 const counts={};
 for(const x of ranked.values())counts[x.regionId]=(counts[x.regionId]||0)+1;
 assert.ok(Object.values(counts).every(x=>x<=2));
});
test('temporary set and rep suggestion is conservative and never edits plan or history',()=>{
 const ex=F.options(DATA.exercises).find(x=>x.id==='elevacao-lateral-maquina');
 const draft={planId:'B',energy:'normal',entries:{'supino-halteres':{id:'supino-halteres',sets:[{load:'',reps:''}]}},skipped:[],plannedIds:['supino-halteres'],addedIds:[]};
 const original=structuredClone(draft),saved=structuredClone(DATA.exercises);
 const context=C.status({...args,draft});
 const advice=C.prescription({exercise:ex,context,draft,...args});
 assert.ok(advice&&advice.sets>=2&&advice.sets<=3);
 assert.equal(advice.scope,'session-only');
 assert.equal(advice.low,ex.low);assert.equal(advice.high,ex.high);
 assert.match(advice.rirTarget,/2–3/);
 const result=CSESSION.prepare({draft,mode:'replace',sourceId:'supino-halteres',targetId:ex.id,exercise:ex,dayPrescription:advice});
 assert.equal(result.ok,true);
 assert.equal(result.draft.entries[ex.id].sets.length,advice.sets);
 assert.equal(result.draft.entries[ex.id].dayPrescription.low,advice.low);
 assert.equal(result.draft.entries[ex.id].dayPrescription.scope,'session-only');
 assert.equal(result.draft.entries[ex.id].sets.every(x=>x.reps===''),true);
 assert.deepEqual(draft,original);
 assert.deepEqual(DATA.exercises,saved);
});
test('completed original cannot be replaced; fatigue and recent Muay reduce prescription',()=>{
 const ex=F.options(DATA.exercises).find(x=>x.id==='encolhimento-halteres');
 const draft={planId:'B',energy:'normal',entries:{'supino-halteres':{id:'supino-halteres',
   sets:[{load:40,reps:10,rir:2,warmup:false}]}},skipped:[]};
 const context=C.status({...args,draft});
 const safe=C.prescription({exercise:ex,context,draft,...args});
 const fatigue=C.prescription({exercise:ex,context,draft,...args,settings:{fatigue:'alta'}});
 const muay=C.prescription({exercise:ex,context,draft,...args,muaySessions:[{day:args.today}]});
 assert.ok(safe.sets>=2&&safe.sets<=3);
 assert.equal(fatigue.sets,2);assert.equal(muay.sets,2);
 const blocked=CSESSION.prepare({draft,mode:'replace',sourceId:'supino-halteres',
   targetId:ex.id,exercise:ex,dayPrescription:safe});
 assert.equal(blocked.ok,false);
 assert.ok(SETS.workSets(draft.entries['supino-halteres']).length===1);
});
