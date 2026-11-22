const test=require('node:test');
const assert=require('node:assert/strict');
const SHARE=require('../share-summary.js');
const STICKER=require('../share-sticker.js');
const DATA=require('../data.js');
const warm=(load,reps)=>({load,reps,rir:2,warmup:true});
const set=(load,reps)=>({load,reps,rir:2,warmup:false});
const session=(id,day,entries,cardio=[])=>({
  id,day,planId:'C',timestamp:day+'T15:00:00Z',entries,cardio,
});
const base=()=>({exercises:structuredClone(DATA.exercises),sessions:[],muay:{sessions:[]}});
test('shares only saved sessions and never mutates history',()=>{
  const state=base();
  state.sessions.push(session('one','2026-11-22',[
    {id:'supino-halteres',sets:[warm(99,3),set(32,8)]},
    {id:'leg-press',sets:[set(180,10),set(160,12)]},
    {id:'abdominal-solo',sets:[set(0,12)]}
  ],[{type:'escada',minutes:12,avgSpeed:56,speedUnit:'steps_min'}]));
  state.sessions.push(session('old','2026-11-16',[{id:'leg-press',sets:[set(999,1)]}]));
  const before=structuredClone(state);
  const m=SHARE.build(state,'one');
  assert.equal(m.largest.exerciseId,'leg-press');
  assert.equal(m.largest.load,180);
  assert.equal(m.largest.reps,10);
  assert.match(m.largest.label,/180 kg.*10 rep/);
  assert.equal(m.loadChoices.some(row=>row.load===99),false);
  assert.equal(m.loadChoices.some(row=>row.load===999),false);
  assert.equal(m.mainRegions.length>0,true);
  assert.equal(m.cardioTop.minutes,12);
  assert.equal(m.cardioTop.pace,'56 degraus/min');
  assert.deepEqual(m.stairRegions,['quadriceps','glutes','calves']);
  assert.equal(m.weekDays,2);
  assert.equal(SHARE.build(state,'un-saved'),null);
  assert.deepEqual(state,before);
});
test('honors kg/halter and bodyweight; highest recorded value is not a personal record',()=>{
  const state=base();
  state.sessions.push(session('hands','2026-11-22',[
    {id:'supino-halteres',sets:[set(35,8)]},{id:'abdominal-solo',sets:[set(0,12)]}
  ]));
  const m=SHARE.build(state,'hands');
  assert.equal(m.largest.unit,'kg/halter');
  assert.equal(m.largest.load,35);
  assert.match(STICKER.choose(m,{highlightMode:'load'}).value,/35 kg\/halter × 8/);
  assert.equal(STICKER.choose(m,{highlightMode:'done'}).kicker,'CONQUISTA');
  assert.equal(Object.keys(m).includes('personalRecord'),false);
  assert.match(STICKER.filename(m),/^forja-conquista-2026-11-22\.png$/);
});
test('without heavy series use honest fallback and keep bodyweight as choice',()=>{
  const state=base();
  state.sessions.push(session('core','2026-11-22',[{id:'abdominal-solo',sets:[set(0,15)]}]));
  const m=SHARE.build(state,'core');
  assert.equal(m.largest,null);
  assert.equal(m.loadChoices[0].bodyweight,true);
  assert.match(STICKER.choose(m,{highlightMode:'done'}).value,/Um treino/);
  assert.match(STICKER.choose(m,{highlightMode:'load',highlightKey:m.loadChoices[0].key}).value,/Peso do corpo/);
});
test('exercise names, units and dates derive from their own session and Monday-week',()=>{
  const state=base();
  state.exercises.find(x=>x.id==='leg-press').name='Leg Press personalizado';
  const one=session('sunday','2026-11-22',[{id:'leg-press',sets:[set(180,10)]}]);
  state.sessions=[session('previous','2026-11-15',[]),session('mon','2026-11-16',[]),one,session('future','2026-11-23',[])];
  state.muay.sessions=[{id:'muay',day:'2026-11-19'}];
  const m=SHARE.build(state,'sunday');
  assert.equal(m.largest.name,'Leg Press personalizado');
  assert.equal(m.weekDays,3);
  assert.deepEqual(SHARE.weekBounds('2026-11-22'),{first:'2026-11-16',last:'2026-11-22'});
});
test('cardio does not recolor resistance regions or invent durations',()=>{
  const state=base();
  const x=session('c','2026-11-22',[{id:'pulley-aberto',sets:[set(40,10)]}],
    [{type:'escada',minutes:10,avgSpeed:7,speedUnit:'machine_level'}]);
  state.sessions=[x];
  const a=SHARE.build(state,'c');
  assert.match(STICKER.choose(a,{highlightMode:'cardio'}).value,/10 min · nível 7/);
  const byId=id=>a.regions.find(row=>row.id===id);
  assert.equal(byId('quadriceps').total,0);
  assert.equal(byId('glutes').total,0);
  const b=SHARE.build({...state,sessions:[{...x,cardio:[]}]},'c');
  assert.deepEqual(a.regions,b.regions);
  assert.equal(b.cardioTop,null);
  assert.equal(STICKER.choose(b,{highlightMode:'cardio'}).kicker,'CONQUISTA');
});
test('sticker renderer settings remain limited and export does not require user photo',()=>{
  const o=STICKER.options({style:'invalid',tone:'light',phrase:'X'.repeat(120),showMuscles:false});
  assert.equal(o.style,'conquest');
  assert.equal(o.tone,'light');
  assert.equal(o.phrase.length,66);
  assert.equal(o.showMuscles,false);
  assert.equal(STICKER.WIDTH,1080);
  assert.equal(STICKER.HEIGHT,880);
});
