const test=require('node:test');
const assert=require('node:assert/strict');
const F=require('../focus.js');
const row=(load='',reps='',warmup=false)=>({load,reps,rir:'',warmup});
test('empty planned rows are never counted as executed',()=>{
 const entries={a:{id:'a',sets:[row(25,''),row(25,'')]},b:{id:'b',sets:[row(30,8)]}};
 assert.deepEqual(F.summary(entries),{total:2,completed:1,effectiveSets:1,
   byExercise:{a:{finished:false,done:0,total:2},b:{finished:true,done:1,total:1}}});
 assert.equal(F.selectedId(entries,null),'a');
});
test('focused navigation respects valid selection and unfinished rows',()=>{
 const entries={a:{id:'a',sets:[row(20,10)]},b:{id:'b',sets:[row(25,'')]},c:{id:'c',sets:[row(35,8)]}};
 assert.equal(F.selectedId(entries,null),'b');
 assert.equal(F.selectedId(entries,'a'),'a');
 assert.equal(F.selectedId(entries,'missing'),'b');
 assert.equal(F.selectedId({},null),null);
});
test('warmup does not inflate effective sets, completed only if working series done',()=>{
 const entries={a:{id:'a',sets:[row(10,8,true),row(20,10),row(22,10)]}};
 const result=F.summary(entries);
 assert.equal(result.effectiveSets,2);
 assert.equal(result.completed,1);
});
test('previous session prepares load but never copies reps or rir',()=>{
 const entry={id:'a',sets:[row('', ''),row('', '')]};
 const result=F.quickLoad(entry,0,'previous-session',[row(40,12),row(45,10)]);
 assert.deepEqual(result,{load:'40'});
 assert.equal(entry.sets[0].reps,'');
 assert.equal(entry.sets[0].rir,'');
});
test('copy preceding set prepares current load; first series has no prior source',()=>{
 const entry={id:'a',sets:[row(35,10),row('', '')]};
 assert.equal(F.quickLoad(entry,0,'last-set').error!==undefined,true);
 assert.deepEqual(F.quickLoad(entry,1,'last-set'),{load:'35'});
});
test('cannot overwrite a recorded set by quick fill',()=>{
 const entry={id:'a',sets:[row(25,12),row('', '')]};
 assert.match(F.quickLoad(entry,0,'previous-session',[row(50,12)]).error,/repetições/);
 assert.match(F.quickLoad(entry,1,'previous-session',[row('',12)]).error,/referência/);
});
test('work completion needs real positive load and integer reps',()=>{
 assert.equal(F.performed(row('',12)),false);
 assert.equal(F.performed(row(20,0)),false);
 assert.equal(F.performed(row(20,8.5)),false);
 assert.equal(F.performed(row(20,8)),true);
});

test('revisão em tempo real não inventa execução nem acusa aquecimento como volume',()=>{
 const entries={
  a:{id:'a',sets:[{load:25,reps:10,rir:'',warmup:false},{load:30,reps:'',rir:'',warmup:false}]},
  b:{id:'b',sets:[{load:'',reps:'',rir:'',warmup:false}]},
  c:{id:'c',sets:[{load:'',reps:12,rir:2,warmup:false}]},
  d:{id:'d',sets:[{load:10,reps:8,rir:3,warmup:true}]},
 };
 assert.deepEqual(F.review(entries),{effectiveSets:1,exercisesLogged:2,skipped:2,missingRir:1,partialSets:1});
});
test('check-in do dia anterior nunca é confundido com recuperação atual',()=>{
 const settings={recoveryCheckin:{day:'2026-11-13',energy:'boa',fatigue:'normal',kneePain:'0'}};
 assert.equal(F.todayCheckin(settings,'2026-11-14'),null);
 assert.equal(F.todayCheckin(settings,'2026-11-13').energy,'boa');
 assert.equal(F.todayCheckin({recoveryCheckin:{day:'2026-11-14',energy:'boa',fatigue:'normal',kneePain:'9'}},'2026-11-14').kneePain,'9');
 assert.equal(F.todayCheckin({recoveryCheckin:{day:'2026-11-14',energy:'boa',fatigue:'normal',kneePain:'11'}},'2026-11-14'),null);
});

test('conclusão e revisão reconhecem abdômen com zero adicional apenas pelo ID conhecido',()=>{
 const entries={
  abs:{id:'abdominal-solo',sets:[row(0,12),row('0',15),row(0,10,true)]},
  machine:{id:'abdominal-polia',sets:[row(0,12)]},
  empty:{id:'abdominal-inverso',sets:[row('',12),row(0,'')]},
 };
 const summary=F.summary(entries);
 assert.equal(summary.completed,1);
 assert.equal(summary.effectiveSets,2);
 assert.equal(summary.byExercise['abdominal-solo'].finished,true);
 assert.equal(F.performed(row(0,12)),false);
 assert.equal(F.performed(row(0,12),'abdominal-solo'),true);
 assert.equal(F.review(entries).effectiveSets,2);
 assert.equal(F.review(entries).partialSets,2);
});

test('copiar zero adicional preserva a série e continua recusando zero em máquinas',()=>{
 const entry={id:'abdominal-inverso',sets:[row('', '')]};
 assert.deepEqual(F.quickLoad(entry,0,'previous-session',[row(0,12)]),{load:'0'});
 assert.deepEqual(entry.sets,[row('','')]);
 entry.sets[0]=row(0,12);
 assert.match(F.quickLoad(entry,0,'previous-session',[row(5,15)]).error,/repetições/);
 assert.match(F.quickLoad({id:'abdominal-polia',sets:[row('','')]},0,'previous-session',[row(0,12)]).error,/referência/);
});
