const test=require('node:test');
const assert=require('node:assert/strict');
const DATA=require('../data.js');
const FLEX=require('../flex.js');
const ANATOMY=require('../exercise-anatomy.js');
const HISTORY=require('../muscle-history.js');
const DOSE=require('../dose.js');
const SETS=require('../training-sets.js');
const E=require('../engine.js');

const rearId='voador-inverso',shrugId='encolhimento-halteres';
const weekly=(id,day='2026-11-22',count=2)=>({
  id:'session:'+id,day,timestamp:day+'T17:00:00Z',planId:'A',
  entries:[{id,sets:Array.from({length:count},()=>({load:10,reps:12,rir:2,warmup:false}))}],
  skipped:[],plannedIds:[],
});

test('posterior deltoid becomes a low-volume addition in A; traps remain elective, B and rotation unchanged',()=>{
  const rear=DATA.exercises.find(ex=>ex.id===rearId);
  const shrug=DATA.exercises.find(ex=>ex.id===shrugId);
  assert.equal(rear.group,'A');
  assert.equal(rear.active,true);
  assert.equal(rear.sets,2);
  assert.deepEqual([rear.low,rear.high],[12,20]);
  assert.equal(shrug.group,'A');
  assert.equal(shrug.active,false);
  assert.equal(shrug.sets,2);
  assert.deepEqual([shrug.low,shrug.high],[10,15]);
  assert.equal(shrug.unit,'kg/halter');
  assert.deepEqual(DATA.rotation,['A','C','B','D']);
  assert.ok(DATA.exercises.find(ex=>ex.id==='elevacao-lateral').active);
  assert.ok(!DATA.exercises.some(ex=>ex.active && /desenvolvimento|elevacao-frontal/.test(ex.id)));
  assert.equal(DATA.exercises.find(ex=>ex.id==='supino-inclinado').sets,4);
  assert.equal(DATA.exercises.find(ex=>ex.id==='triceps-testa').sets,4);
  assert.equal(DATA.exercises.find(ex=>ex.id==='agachamento-hack').sets,3);
  const a=DATA.exercises.filter(ex=>ex.group==='A'&&ex.active);
  assert.equal(a.reduce((total,ex)=>total+ex.sets,0),19);
  assert.equal(a.find(ex=>ex.id===rearId).sets,2);
  assert.equal(a.some(ex=>ex.id===shrugId),false);
  for(const id of [rearId,shrugId])assert.equal(FLEX.options(DATA.exercises).filter(ex=>ex.id===id).length,1);
});

test('legacy upgrade inserts only missing IDs, never overwrites preferences, history or draft',()=>{
  const original={upperBalanceDefaultsVersion:undefined,abdomenDefaultsVersion:1,plankDefaultsVersion:1,
    exercises:[{...DATA.exercises.find(ex=>ex.id==='pulley-aberto'),sets:5,name:'Meu pulley'},
      {...DATA.exercises.find(ex=>ex.id==='elevacao-lateral'),active:false}],
    sessions:[weekly('pulley-aberto','2026-11-10',3)],
    draft:{planId:'A',entries:{'pulley-aberto':{id:'pulley-aberto',sets:[{load:30,reps:'12'}]}}}};
  const before=structuredClone(original);
  assert.equal(DATA.ensureUpperBalance(original),true);
  assert.deepEqual(original.exercises.slice(0,2),before.exercises);
  assert.deepEqual(original.sessions,before.sessions);
  assert.deepEqual(original.draft,before.draft);
  assert.equal(original.upperBalanceDefaultsVersion,1);
  const rear=original.exercises.find(ex=>ex.id===rearId);
  const shrug=original.exercises.find(ex=>ex.id===shrugId);
  assert.equal(rear.active,true);
  assert.equal(shrug.active,false);
  assert.equal(original.exercises.filter(ex=>ex.id===rearId).length,1);
  const migrated=structuredClone(original);
  assert.equal(DATA.ensureUpperBalance(original),false);
  assert.deepEqual(original,migrated);
});

test('preexisting rear-deltoid alternatives and deactivated/user-edited entries are respected',()=>{
  const alt={exercises:[{...DATA.exercises[0]},
    {...FLEX.catalog.find(ex=>ex.id==='face-pull'),active:true,sets:3}]};
  assert.equal(DATA.ensureUpperBalance(alt),true);
  assert.equal(alt.exercises.find(ex=>ex.id===rearId).active,false,
    'do not double-activate rear delts when user already trains a direct alternative');
  const customized={exercises:[{...DATA.exercises.find(ex=>ex.id===rearId),active:false,sets:4,name:'Personalizado'}]};
  assert.equal(DATA.ensureUpperBalance(customized),true);
  const r=customized.exercises.find(ex=>ex.id===rearId);
  assert.deepEqual([r.active,r.sets,r.name],[false,4,'Personalizado']);
  assert.equal(customized.exercises.filter(ex=>ex.id===rearId).length,1);
  assert.equal(customized.exercises.find(ex=>ex.id===shrugId).active,false);
  const full={exercises:Array.from({length:199},(_,i)=>({...DATA.exercises[0],id:'archive-'+i}))};
  const initial=structuredClone(full);
  assert.equal(DATA.ensureUpperBalance(full),false);
  assert.deepEqual(full,initial,'no partial insertion when near the exercise archive limit');
});

test('two new direct shoulder sets add only when executed; never multiply by indirect workload',()=>{
  assert.deepEqual(ANATOMY.describe(rearId).main,['rearDelts']);
  assert.deepEqual(ANATOMY.describe(shrugId).main,['upperTraps']);
  const start=HISTORY.analyze({strengthSessions:[],today:'2026-11-22',days:7});
  assert.equal(start.byId.rearDelts.directSets,0);
  assert.equal(start.byId.upperTraps.directSets,0);
  const done=weekly(rearId);
  const model=HISTORY.analyze({strengthSessions:[done],today:'2026-11-22',days:7});
  assert.equal(model.byId.rearDelts.directSets,2);
  assert.equal(model.byId.upperTraps.directSets,0);
  const before=DOSE.volume({strengthSessions:[done],today:'2026-11-22'});
  assert.equal(before.rows.find(x=>x.id==='ombros').direct7,2);
  const mock=weekly(shrugId);
  mock.entries[0].sets[1].reps='';
  assert.equal(SETS.workSets(mock.entries[0]).length,1);
  const withShrug=HISTORY.analyze({strengthSessions:[done,mock],today:'2026-11-22',days:7});
  assert.equal(withShrug.byId.upperTraps.directSets,1);
  assert.equal(E.pendingWorkouts([done,mock]).completed.length,0,
    'free/partial sessions never mark full four-block rotation completed');
});
