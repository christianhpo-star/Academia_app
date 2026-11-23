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

test('two previous sessions with the same exercise inform a narrower rep target; without history keep its own range',()=>{
 const ex=F.options(DATA.exercises).find(x=>x.id==='elevacao-lateral-maquina');
 const fresh=C.prescription({...args,exercise:ex,context:C.status(args)});
 assert.equal(fresh.low,10);assert.equal(fresh.high,20);
 const withHistory=[
   ...sessions,
   {id:'sh1',day:'2026-11-17',entries:[{id:ex.id,sets:[{load:30,reps:14,rir:3,warmup:false}]}]},
   {id:'sh2',day:'2026-11-20',entries:[{id:ex.id,sets:[{load:30,reps:15,rir:3,warmup:false}]}]},
 ];
 const personalized=C.prescription({...args,exercise:ex,strengthSessions:withHistory,context:C.status({...args,strengthSessions:withHistory})});
 assert.ok(personalized.low>=10);
 assert.ok(personalized.high<=20);
 assert.ok(personalized.high-personalized.low<=4);
 assert.match(personalized.reason,/duas sessões anteriores/);
 assert.ok(personalized.sets>=2&&personalized.sets<=3);
});

test('manual catalog addition without a specific balance recommendation retains original sets',()=>{
 const exercise=F.options(DATA.exercises).find(x=>x.id==='desenvolvimento-barra');
 const draft={planId:'B',energy:'normal',entries:{},skipped:[],plannedIds:[],addedIds:[]};
 const result=CSESSION.prepare({draft,mode:'add',targetId:exercise.id,exercise});
 assert.equal(result.ok,true);
 assert.equal(result.draft.entries[exercise.id].sets.length,exercise.sets);
 assert.equal(Object.hasOwn(result.draft.entries[exercise.id],'dayPrescription'),false);
 assert.deepEqual(draft.entries,{});
});

test('indirect chest pressing stimulus blocks false anterior-shoulder deficit badge',()=>{
 const status=C.status(args);
 assert.equal(status.ready,true);
 assert.ok(status.totals.frontDelts.indirectSets>0);
 const front=F.options(DATA.exercises).find(x=>x.id==='elevacao-frontal-polia');
 // This sample trained pressing frequently: anterior deltoid has auxiliary
 // recorded work even without isolated sets; do not prescribe extra work.
 assert.equal(C.forExercise(front,status),null);
 const traps=F.options(DATA.exercises).find(x=>x.id==='encolhimento-barra');
 assert.ok(C.forExercise(traps,status));
});

test('nine added options span simple, machine, free-weight and home without duplicate IDs',()=>{
 const options=F.options(DATA.exercises),byId=new Map(options.map(x=>[x.id,x]));
 const ids=['desenvolvimento-maquina-neutro','desenvolvimento-halter-sentado',
   'elevacao-lateral-sentado','elevacao-lateral-unilateral-polia','elevacao-frontal-halteres',
   'encolhimento-polia','crucifixo-inverso-elastico','face-pull-elastico','elevacao-y-elastico'];
 for(const id of ids){
   const ex=byId.get(id);
   assert.ok(ex,id);assert.equal(ex.active,false);
   assert.ok(DOSE.MAP[id],id);
   const anatomy=A.describe(id);
   assert.ok(anatomy?.main?.length,id);
   assert.match(A.figure(id,false,anatomy.view),/<svg/,id);
   const style=C.variant(ex);
   assert.ok(['easy','regular'].includes(style?.difficulty),id);
   assert.ok(['home','free','machine'].includes(style?.setting),id);
 }
 assert.equal(new Set(options.map(x=>x.id)).size,options.length);
 for(const id of ['crucifixo-inverso-elastico','face-pull-elastico','elevacao-y-elastico']){
   assert.equal(SETS.allowsZero(id),true);
   assert.equal(SETS.workSets({id,sets:[{load:0,reps:15,rir:3,warmup:false}]}).length,1);
 }
});
test('actual volume excludes blank presets and warmups and includes previous sessions and the current draft',()=>{
 const day='2026-11-23';
 const entry=(id,sets)=>({id,sets});
 const full=(load=10)=>({load,reps:12,rir:2,warmup:false});
 const session={id:'today',day,entries:[entry('elevacao-lateral',[full(),{load:10,reps:'',rir:2,warmup:false},
   {load:10,reps:12,rir:2,warmup:true}])]};
 const yesterday={id:'yesterday',day:'2026-11-22',entries:[entry('elevacao-lateral',[full(),full()])]};
 const older={id:'older',day:'2026-11-15',entries:[entry('elevacao-lateral',[full()])]};
 const draft={planId:'B',entries:{'elevacao-lateral-maquina':entry('elevacao-lateral-maquina',[full(20),
   {load:20,reps:'',rir:2,warmup:false}])}};
 const before=structuredClone(draft);
 const result=C.workload({today:day,strengthSessions:[session,yesterday,older,session],draft});
 assert.equal(result.today.sets,2);assert.equal(result.week.sets,4);
 assert.equal(result.today.exercises,2);assert.equal(result.week.exercises,2);
 assert.equal(result.byRegion.sideDelts.today,2);
 assert.equal(result.byRegion.sideDelts.week,4);
 assert.equal(result.byRegion.sideDelts.yesterday,2);
 assert.deepEqual(draft,before);
});
test('goal and seven-day performed sets prevent automatic extra shoulder work',()=>{
 const ex=F.options(DATA.exercises).find(x=>x.id==='elevacao-lateral-maquina');
 const day='2026-11-23';
 const done=n=>({id:'elevacao-lateral',sets:Array.from({length:n},()=>({
   load:8,reps:14,rir:2,warmup:false
 }))});
 const strengthSessions=[{id:'today',day,entries:[done(3)]},
   {id:'yesterday',day:'2026-11-22',entries:[done(2)]}];
 const loss=C.status({today:day,strengthSessions,exercises:DATA.exercises,
   settings:{goalMode:'fat_loss'},nutritionGoal:'gain'});
 assert.equal(loss.goal,'fat_loss');
 assert.equal(loss.workload.today.sets,3);
 assert.equal(loss.workload.week.sets,5);
 assert.equal(loss.workload.byRegion.sideDelts.today,3);
 const held=C.prescription({today:day,strengthSessions,exercise:ex,context:loss});
 assert.equal(held.level,'hold');assert.equal(held.sets,1);
 assert.match(held.reason,/Perda de gordura/);
 assert.equal(held.todaySets,3);assert.equal(held.weekSets,5);
 const alternative=C.status({today:day,strengthSessions:[],
   settings:{goalMode:'weight'},nutritionGoal:'gain',exercises:DATA.exercises});
 assert.equal(alternative.goal,'muscle_gain');
 const growth=C.prescription({today:day,exercise:ex,context:alternative,strengthSessions:[]});
 assert.equal(growth.sets,3);
 const empty={planId:'B',entries:{},skipped:[],plannedIds:[],addedIds:[]};
 const snapshot=structuredClone(empty);
 const prepared=CSESSION.prepare({draft:empty,mode:'add',targetId:ex.id,exercise:ex,dayPrescription:held});
 assert.equal(prepared.ok,true);
 assert.equal(prepared.draft.entries[ex.id].sets.length,1);
 assert.equal(prepared.draft.entries[ex.id].dayPrescription.level,'hold');
 assert.equal(prepared.draft.entries[ex.id].dayPrescription.goal,'fat_loss');
 assert.deepEqual(empty,snapshot);
});
test('blank sets from an active draft do not masquerade as training volume',()=>{
 const ex=F.options(DATA.exercises).find(x=>x.id==='encolhimento-halteres');
 const draft={planId:'A',entries:{[ex.id]:{id:ex.id,sets:[
   {load:25,reps:'',rir:'',warmup:false},{load:25,reps:'',rir:'',warmup:false}]}}};
 const status=C.status({today:'2026-11-23',strengthSessions:[],
   exercises:DATA.exercises,draft,settings:{goalMode:'recomposition'}});
 assert.equal(status.workload.today.sets,0);
 const proposal=C.prescription({today:'2026-11-23',exercise:ex,context:status,draft});
 assert.equal(proposal.todaySets,0);
 assert.equal(proposal.sets,2);
});
