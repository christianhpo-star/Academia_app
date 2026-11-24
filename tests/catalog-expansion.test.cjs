const test=require('node:test');
const assert=require('node:assert/strict');
const DATA=require('../data.js');
const F=require('../flex.js');
const DOSE=require('../dose.js');
const newGroups={
  A:['voador-inverso','crucifixo-inverso-halter','crucifixo-inverso-polia','remada-peito-apoiado','puxada-unilateral-polia','rosca-inclinada-halter','rosca-polia-baixa'],
  B:['elevacao-lateral-polia','desenvolvimento-maquina','crucifixo-inclinado-halter','supino-inclinado-maquina','triceps-unilateral-polia','triceps-coice-halter'],
  C:['agachamento-smith','leg-press-horizontal','extensora-unilateral','panturrilha-unilateral-pe','aducao-polia'],
  D:['flexora-unilateral','hip-thrust-maquina','abducao-polia','pull-through-polia','flexora-em-pe']
};
const ids=Object.values(newGroups).flat();
test('23 curated alternatives have stable unique IDs and validated optional configurations',()=>{
  assert.equal(ids.length,23);
  const all=F.options(DATA.exercises); // merged catalog: shared default plank ID is intentional
  assert.equal(new Set(all.map(x=>x.id)).size,all.length);
  for(const [group,entries] of Object.entries(newGroups)){
    for(const id of entries){
      const option=F.catalog.find(x=>x.id===id);
      assert.ok(option,'missing '+id);
      assert.equal(option.group,group);
      assert.equal(option.active,false);
      assert.equal(option.mode,'double');
      assert.ok(option.equipment && option.muscle);
      assert.ok(option.sets>=1 && option.sets<=12);
      assert.ok(option.low>=1 && option.high<=50 && option.high>=option.low);
      assert.ok(['kg','kg/halter'].includes(option.unit));
      assert.ok(option.step>0);
      assert.ok(Array.isArray(option.aliases) && option.aliases.length);
      assert.ok(DOSE.MAP[id],id+' must be known for dose calculations');
      assert.ok(DOSE.MAP[id].direct.every(m=>DOSE.MUSCLES.some(x=>x[0]===m)));
      assert.ok(DOSE.MAP[id].indirect.every(m=>DOSE.MUSCLES.some(x=>x[0]===m)));
    }
  }
});
test('voador inverso targets posterior shoulders, not peck-deck chest, and supports familiar names',()=>{
  const reverse=F.options(DATA.exercises,null,'voador inverso','A');
  assert.equal(reverse.length,1);
  const ex=reverse[0];
  assert.equal(ex.id,'voador-inverso');
  assert.equal(ex.equipment,'Máquina');
  assert.equal(ex.muscle,'Ombros posteriores');
  assert.equal(ex.knee,false);
  assert.ok(F.options(DATA.exercises,null,'voador invertido').some(x=>x.id===ex.id));
  assert.ok(F.options(DATA.exercises,null,'peck deck inverso').some(x=>x.id===ex.id));
  assert.ok(F.options(DATA.exercises,null,'crucifixo inverso na maquina').some(x=>x.id===ex.id));
  assert.equal(F.options(DATA.exercises,null,'voador inverso','B').length,0);
  const ordinary=F.options(DATA.exercises,null,'Voador (peck deck)');
  assert.ok(ordinary.some(x=>x.id==='voador' && x.group==='B'));
  assert.equal(ordinary.some(x=>x.id===ex.id),false);
});
test('other additions appear under the appropriate group and searchable equipment, accents',()=>{
  assert.ok(F.options(DATA.exercises,null,'elevação lateral no cabo','B').some(x=>x.id==='elevacao-lateral-polia'));
  assert.ok(F.options(DATA.exercises,null,'hip thrust maquina','D').some(x=>x.id==='hip-thrust-maquina'));
  assert.ok(F.options(DATA.exercises,null,'leg horizontal','C').some(x=>x.id==='leg-press-horizontal'));
  assert.ok(F.options(DATA.exercises,null,'cable curl','A').some(x=>x.id==='rosca-polia-baixa'));
});
test('all knee-loaded new lower-body options retain knee caution flag',()=>{
  const relevant=['agachamento-smith','leg-press-horizontal','extensora-unilateral'];
  assert.ok(relevant.every(id=>F.catalog.find(ex=>ex.id===id).knee===true));
  assert.equal(F.catalog.find(ex=>ex.id==='panturrilha-unilateral-pe').knee,false);
});
test('new movements count work sets only after actual execution in corresponding muscle groups',()=>{
  const session={id:'test-s1',day:'2026-11-20',timestamp:'2026-11-20T12:00:00Z',planId:'A',entries:[{
    id:'voador-inverso',pain:null,sets:[
      {load:25,reps:12,rir:3,warmup:false},
      {load:25,reps:15,rir:2,warmup:false},
      {load:30,reps:'',rir:'',warmup:false},
      {load:20,reps:15,rir:4,warmup:true}
    ]
  }]};
  const v=DOSE.volume({today:'2026-11-21',strengthSessions:[session]});
  assert.equal(v.rows.find(x=>x.id==='ombros').direct7,2);
  assert.equal(v.rows.find(x=>x.id==='costas').indirect7,1);
  assert.equal(v.rows.find(x=>x.id==='peito').direct7,0);
  assert.equal(v.unknown,0);
  assert.equal(v.known,1);
});
test('viewing or preparing the scheduled posterior option cannot change exercise settings or prior sessions',()=>{
  const stateBefore=structuredClone(DATA.exercises);
  const available=F.options(DATA.exercises,null,'voador inverso');
  assert.equal(available.length,1);
  assert.equal(available[0].active,true,'reviewed posterior work is now on the A plan');
  const result=F.prepareCatalog('voador-inverso',DATA.exercises);
  assert.ok(result && !result.isNew,'reuse existing ID instead of duplicating catalog');
  assert.equal(result.exercise.active,true);
  assert.equal(result.exercise.id,'voador-inverso');
  assert.equal(result.exercise.sets,2);
  assert.deepEqual(DATA.exercises,stateBefore);
  const draft={planId:'A',entries:{'remada-baixa':{id:'remada-baixa',sets:[]}},plannedIds:['remada-baixa'],addedIds:[],skipped:[]};
  const ok=F.addToDraft(draft,'voador-inverso',result.exercise,{id:result.exercise.id,sets:[]});
  assert.equal(ok,true);
  assert.equal(draft.addedIds.includes('voador-inverso'),true);
  assert.deepEqual(DATA.exercises,stateBefore);
});
