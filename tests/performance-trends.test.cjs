const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../performance-trends.js');
const makeSession=(day,ex,load,reps=8)=>({day,timestamp:day+'T12:00:00Z',planId:'B',
  entries:[{id:ex,sets:[{load,reps,rir:2,warmup:false}]}]});
test('recoveries are one per calendar day and missing days stay absent',()=>{
 let records=[];
 records=P.upsertRecovery(records,{day:'2026-11-13',energy:'baixa',fatigue:'alta',kneePain:''});
 records=P.upsertRecovery(records,{day:'2026-11-13',energy:'normal',fatigue:'normal',kneePain:''});
 assert.equal(records.length,1);assert.equal(records[0].energy,'normal');
 assert.equal(P.upsertRecovery(records,{day:'bad',energy:'normal',fatigue:'normal'}),null);
});
test('weight trend requires both 14-day windows and excludes future rows',()=>{
 const state={weights:[{date:'2026-10-20',weight:85},{date:'2026-10-24',weight:84.8},{date:'2026-10-27',weight:84.6},
 {date:'2026-11-04',weight:84.2},{date:'2026-11-09',weight:84},{date:'2026-11-15',weight:83.7},
 {date:'2026-11-17',weight:69}],sessions:[],recoveryHistory:[]};
 const report=P.assess(state,'2026-11-16');
 assert.equal(report.weight.ready,true);
 assert.ok(report.weight.pctPerWeek<0);
 assert.equal(report.weight.recentCount,3);
 assert.equal(P.assess({...state,weights:state.weights.slice(0,4)},'2026-11-16').weight.ready,false);
});
test('only comparable exercise and repeated recovery signals raise a review note',()=>{
 const earlier=['2026-10-23','2026-10-28'],later=['2026-11-08','2026-11-12'];
 const sessions=[...earlier.flatMap(day=>[makeSession(day,'squat',100),makeSession(day,'bench',80)]),
 ...later.flatMap(day=>[makeSession(day,'squat',90),makeSession(day,'bench',70)])];
 const recoveryHistory=['2026-11-04','2026-11-07','2026-11-10','2026-11-12'].map((day,i)=>
 ({day,energy:i<2?'baixa':'normal',fatigue:i<2?'alta':'normal'}));
 const r=P.assess({sessions,recoveryHistory,weights:[]},'2026-11-16');
 assert.equal(r.training.comparisons.length,2);
 assert.equal(r.training.decliningExercises,2);
 assert.equal(r.interpretation,'review');
 const insufficient=P.assess({sessions,recoveryHistory:[],weights:[]},'2026-11-16');
 assert.notEqual(insufficient.interpretation,'review');
 assert.equal(insufficient.recovery.recordedDays,0);
});
test('training record comparisons ignore warmup and out-of-range rep scores',()=>{
 const report=P.assess({sessions:[{day:'2026-11-10',entries:[{id:'squat',sets:[
 {load:100,reps:8,warmup:true},{load:90,reps:20,warmup:false},{load:80,reps:8,warmup:false}]}]}],
 weights:[],recoveryHistory:[]},'2026-11-16');
 assert.equal(report.training.comparisons.length,0);
 assert.equal(report.interpretation,'insufficient');
});
