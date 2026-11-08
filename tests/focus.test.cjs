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
 assert.match(F.quickLoad(entry,1,'previous-session',[row(50,12)]).error,/referência/);
});
test('work completion needs real positive load and integer reps',()=>{
 assert.equal(F.performed(row('',12)),false);
 assert.equal(F.performed(row(20,0)),false);
 assert.equal(F.performed(row(20,8.5)),false);
 assert.equal(F.performed(row(20,8)),true);
});
