const test=require('node:test');
const assert=require('node:assert/strict');
const FREE=require('../free-workout.js');
const DATA=require('../data.js');
const F=require('../flex.js');
const E=require('../engine.js');
const SETS=require('../training-sets.js');
const FOCUS=require('../focus.js');
const MAP=require('../muscle-map.js');
const M=require('../muay.js');

const TODAY='2026-11-23';
const bodyweight=DATA.exercises.find(x=>x.id==='abdominal-solo');

test('new free draft has no planned blocks, skipped sets, or assumed performed repetitions',()=>{
 const source=FREE.create({day:TODAY,afterMuayId:'muay-existing'});
 assert.equal(source.planId,'FREE');
 assert.equal(source.day,TODAY);
 assert.deepEqual(source.entries,{});
 assert.deepEqual(source.plannedIds,[]);
 assert.deepEqual(source.skipped,[]);
 assert.equal(source.energy,'');
 assert.equal(source.afterMuayId,'muay-existing');
 assert.equal(FREE.isFree(source),true);
 assert.equal(FREE.isFree('A'),false);
 assert.equal(FREE.isFree('FREE'),true);
 assert.deepEqual(FREE.count(source),{selected:0,performed:0,sets:0});
 assert.ok(FREE.create({day:'2026-02-31'}).error);
});

test('abdominal shortcuts and catalog search work without modifying the rotation',()=>{
 const draft=FREE.create({day:TODAY});
 const available=FREE.options(DATA.exercises,draft);
 assert.ok(available.length>=2);
 assert.ok(available.some(x=>x.id==='abdominal-solo'));
 assert.ok(available.some(x=>x.id==='abdominal-inverso'));
 assert.ok(FREE.options(DATA.exercises,draft,'abdominal').some(x=>x.id==='abdominal-solo'));
 const snapshot=structuredClone(draft);
 const result=FREE.add(draft,bodyweight);
 assert.ok(result.draft);
 assert.equal(result.entry.id,'abdominal-solo');
 assert.equal(result.entry.sets.length,1);
 assert.equal(result.entry.sets[0].load,0);
 assert.equal(result.entry.sets[0].reps,'');
 assert.deepEqual(draft,snapshot);
 assert.deepEqual(FREE.count(result.draft),{selected:1,performed:0,sets:0});
 assert.ok(FREE.add(result.draft,bodyweight).error);
 const ab=FREE.options(DATA.exercises,result.draft);
 assert.ok(!ab.some(x=>x.id==='abdominal-solo'));
});

test('free workout worksets count in strength history and muscle map, but do not advance A/B/C/D',()=>{
 const draft=FREE.create({day:TODAY});
 const result=FREE.add(draft,bodyweight);
 const saved=result.draft;
 saved.entries['abdominal-solo'].sets[0].reps=20;
 saved.entries['abdominal-solo'].sets[0].rir=2;
 saved.entries['abdominal-solo'].sets.push({load:0,reps:15,rir:2,warmup:false});
 saved.entries['abdominal-solo'].sets.push({load:0,reps:'',rir:'',warmup:false});
 assert.deepEqual(FREE.count(saved),{selected:1,performed:1,sets:2});
 assert.equal(FOCUS.summary(saved.entries).effectiveSets,2);
 const session={id:'session-free-01',planId:'FREE',kind:'free',day:TODAY,timestamp:TODAY+'T20:00:00Z',
   entries:[{id:'abdominal-solo',sets:[{load:0,reps:20,rir:2,warmup:false},
     {load:0,reps:15,rir:2,warmup:false}]}],plannedIds:[],skipped:[],energy:''};
 assert.equal(E.historyOf([session],'abdominal-solo').length,1);
 assert.equal(E.pendingWorkouts([session]).completed.length,0);
 assert.equal(E.nextWorkout([session],'normal',0).id,'A');
 const map=MAP.model({sessions:[session],muay:{sessions:[]}},TODAY,7);
 assert.equal(map.byId.abs.directSets,2);
 assert.equal(map.byId.abs.total,2);
 assert.equal(map.completedSessions,1);
 const output=MAP.render({sessions:[session],muay:{sessions:[]}},TODAY,{days:7,selected:'abs'});
 assert.match(output,/2<\/b> séries equivalentes/);
});

test('cannot discard recorded reps by removing the exercise from an unfinished draft',()=>{
 const first=FREE.add(FREE.create({day:TODAY}),bodyweight).draft;
 const snap=structuredClone(first);
 assert.ok(FREE.remove(first,'missing').error);
 const empty=FREE.remove(first,'abdominal-solo');
 assert.ok(empty.draft);
 assert.equal(Object.keys(empty.draft.entries).length,0);
 assert.deepEqual(first,snap);
 first.entries['abdominal-solo'].sets[0].reps=10;
 assert.match(FREE.remove(first,'abdominal-solo').error,/repetições preenchidas/);
 assert.ok(FREE.add(first,bodyweight).error);
});

test('custom free exercise can be explicitly bodyweight without polluting a planned block',()=>{
 const created=FREE.custom('   Abdominal com bola    ',true);
 assert.equal(created.exercise.name,'Abdominal com bola');
 assert.equal(created.exercise.group,'FREE');
 assert.equal(created.exercise.active,false);
 assert.equal(SETS.allowsZero(created.exercise),true);
 const added=FREE.add(FREE.create({day:TODAY}),created.exercise);
 assert.equal(added.draft.entries[created.exercise.id].sets[0].load,0);
 const rep=added.draft.entries[created.exercise.id].sets[0];
 rep.reps=16;
 assert.equal(SETS.workSets(added.draft.entries[created.exercise.id]).length,1);
 const loaded=FREE.custom('Rosca de carga livre',false);
 assert.equal(SETS.allowsZero(loaded.exercise),false);
 assert.ok(FREE.custom('',true).error);
 const other=FREE.options([...DATA.exercises,created.exercise],FREE.create({day:TODAY}),'Abdominal com bola');
 assert.ok(other.some(x=>x.id===created.exercise.id));
});

test('Muay session linkage is read only and not inferred across different days',()=>{
 const a=M.draft(TODAY,'academia');
 a.activities.push(M.activity('Sombra','rounds'));
 const muay=M.finishDraft(a,TODAY).session;
 const recent=FREE.linkedMuay([muay],TODAY);
 assert.equal(recent.id,muay.id);
 assert.equal(FREE.linkedMuay([muay],'2026-11-22'),null);
 const free=FREE.create({day:TODAY,afterMuayId:muay.id});
 assert.equal(free.afterMuayId,muay.id);
 const before=structuredClone(free);
 assert.equal(FREE.count(free).sets,0);
 assert.deepEqual(free,before);
});