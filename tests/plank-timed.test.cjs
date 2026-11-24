const test=require('node:test');
const assert=require('node:assert/strict');
const DATA=require('../data.js');
const F=require('../flex.js');
const FREE=require('../free-workout.js');
const SETS=require('../training-sets.js');
const A=require('../exercise-anatomy.js');
const DOSE=require('../dose.js');
const HISTORY=require('../muscle-history.js');
const E=require('../engine.js');
const CRECO=require('../catalog-recommendations.js');

const day='2026-11-23';
const front=DATA.exercises.find(x=>x.id==='prancha-frontal');
const candidates=['prancha-frontal','prancha-joelhos','prancha-lateral'];
const performed=(id,secs)=>({id,sets:[{load:0,reps:secs,rir:null,warmup:false}]});
const session=(entry,id='free1')=>({id,timestamp:day+'T20:10:00.000Z',day,
  planId:'FREE',kind:'free',entries:[entry],plannedIds:[],skipped:[]});

test('plank is present in catalog with easier and lateral variations; not added to active sheets',()=>{
  assert.deepEqual(DATA.rotation,['A','C','B','D']);
  assert.equal(front.sets,2);
  assert.equal(front.active,false);
  assert.equal(front.mode,'isometric');
  assert.equal(front.low,20);
  assert.equal(front.high,40);
  const found=F.options(DATA.exercises);
  for(const id of candidates){
    const row=found.filter(x=>x.id===id);
    assert.equal(row.length,1,'no duplicate plank id in complete catalogue');
    assert.equal(row[0].mode,'isometric');
    assert.equal(row[0].timeBased,true);
    assert.equal(SETS.isTimed(id),true);
    assert.equal(SETS.allowsZero(id),true);
    assert.ok(F.options(DATA.exercises,null,'prancha').some(x=>x.id===id));
  }
  assert.equal(found.find(x=>x.id==='prancha-lateral').repPerSide,true);
  assert.equal(FREE.options(DATA.exercises,FREE.create({day}))[0].id,'prancha-frontal',
    'plank visible without needing catalog search in free workout');
});

test('legacy archive upgrade preserves customized names, sets, sessions, draft and avoids duplicates',()=>{
  const old={abdomenDefaultsVersion:1,
    exercises:[{...DATA.exercises[0],name:'Pulley personalizado',sets:5},
      {...front,name:'Minha prancha',sets:3,low:25,high:60,active:true}],
    sessions:[session(performed('abdominal-solo',20),'old')],
    draft:{planId:'A',entries:{}}};
  const before=structuredClone(old);
  assert.equal(DATA.ensurePlank(old),true);
  assert.equal(old.plankDefaultsVersion,1);
  assert.deepEqual(old.exercises,before.exercises);
  assert.deepEqual(old.sessions,before.sessions);
  assert.deepEqual(old.draft,before.draft);
  assert.equal(DATA.ensurePlank(old),false);
  assert.equal(old.exercises.find(x=>x.id===front.id).sets,3);
  const missing={abdomenDefaultsVersion:1,exercises:[DATA.exercises[0]]};
  assert.equal(DATA.ensurePlank(missing),true);
  assert.equal(missing.exercises.filter(x=>x.id===front.id).length,1);
  assert.equal(missing.exercises.find(x=>x.id===front.id).active,false);
  const full={exercises:Array.from({length:200},(_,i)=>({...DATA.exercises[0],id:'custom-'+i}))};
  assert.equal(DATA.ensurePlank(full),false);
  assert.equal(full.exercises.length,200);
  assert.equal(full.plankDefaultsVersion,undefined);
});

test('isometric sets use seconds 5-300 and reject 0/blank/invalid counts',()=>{
  assert.equal(SETS.performed({load:0,reps:'',warmup:false},front),false);
  assert.equal(SETS.performed({load:0,reps:'0'},front),false);
  assert.equal(SETS.performed({load:0,reps:'4'},front),false);
  assert.equal(SETS.performed({load:0,reps:'30'},front),true);
  assert.equal(SETS.performed({load:0,reps:'120'},front),true);
  assert.equal(SETS.performed({load:0,reps:'300'},front),true);
  assert.equal(SETS.performed({load:0,reps:'301'},front),false);
  assert.equal(SETS.performed({load:0,reps:'20.5'},front),false);
  assert.equal(SETS.performed({load:0,reps:101},'abdominal-solo'),false);
  assert.equal(SETS.performed({load:0,reps:30},'unknown'),false);
  assert.equal(SETS.workSets({id:front.id,sets:[{load:0,reps:30,warmup:false},
    {load:0,reps:'',warmup:false},{load:0,reps:30,warmup:true}]}).length,1);
});

test('timed plank is an actual bodyweight strength set, without turning seconds into many series',()=>{
  const draft=FREE.create({day});
  const next=FREE.add(draft,front);
  assert.ok(next.draft);
  const rep=next.draft.entries[front.id].sets[0];
  assert.equal(rep.load,0);
  assert.equal(rep.reps,'');
  assert.deepEqual(FREE.count(next.draft),{selected:1,performed:0,sets:0});
  rep.reps='45';
  assert.deepEqual(FREE.count(next.draft),{selected:1,performed:1,sets:1});
  next.draft.entries[front.id].sets.push({load:0,reps:40,rir:null,warmup:false});
  assert.deepEqual(FREE.count(next.draft),{selected:1,performed:1,sets:2});
  const entry=performed(front.id,45),saved=session(entry);
  const map=HISTORY.analyze({strengthSessions:[saved],today:day,days:7});
  assert.equal(map.byId.abs.directSets,1);
  assert.equal(map.byId.obliques.indirectSets,1);
  assert.equal(map.byId.abs.total,1);
  const sum=DOSE.volume({strengthSessions:[saved],today:day});
  assert.equal(sum.rows.find(x=>x.id==='abdomen').direct7,1);
  assert.equal(E.pendingWorkouts([saved]).completed.length,0);
  assert.deepEqual(DATA.rotation,['A','C','B','D']);
});

test('lateral plank maps to obliques without interpreting seconds as repetitions or left/right activation',()=>{
  const row=F.options(DATA.exercises).find(x=>x.id==='prancha-lateral');
  const anatomy=A.describe(row.id);
  assert.deepEqual(anatomy.main,['obliques']);
  const logs=HISTORY.analyze({strengthSessions:[session(performed(row.id,25))],today:day,days:7});
  assert.equal(logs.byId.obliques.directSets,1);
  assert.equal(logs.byId.abs.indirectSets,1);
  assert.equal(logs.byId.obliques.total,1);
});

test('progression uses seconds and no simulated kilograms/1RM',()=>{
  const result=E.recommend(front,[]);
  assert.match(result.explanation,/segundos/);
  const follow=E.recommend(front,[session(performed(front.id,30))]);
  assert.equal(follow.level,'hold');
  assert.match(follow.last,/30 s/);
  assert.match(follow.explanation,/segundos/);
  assert.doesNotMatch(follow.explanation,/faixa de .*repetições/);
  assert.equal(E.entryStrength(performed(front.id,30)),null);
  assert.deepEqual(E.strengthSeries(front,[session(performed(front.id,30))]),[]);
  const suggestion=CRECO.prescription({exercise:front,strengthSessions:[],today:day});
  assert.equal(suggestion.low,20);
  assert.equal(suggestion.high,40);
  assert.equal(suggestion.rirTarget,'opcional');
  assert.match(suggestion.reason,/segundos/);
});
