const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../reminders.js');
const day='2026-11-15';
const profile={heightCm:174,age:28,weightKg:80,activity:1.55,goal:'loss',adultScope:true,confirmedAt:'2026-10-01'};
const base=()=>({weights:[],bodyMeasurements:[],bioimpedance:[],activitySteps:[],
  settings:{goalMode:'fat_loss',targetWeight:74},nutrition:{settings:{profile,targets:[]}},
  reminderPrefs:{enabled:true,items:{}}});
const weigh=(date,weight)=>({id:'w-'+date,date,weight});
test('no suggestions from absent records or initial reference values',()=>{
 const state=base();
 assert.deepEqual(R.assess(state,day).visible,[]);
 state.weights=[{date:'2026-10-30',weight:80,initial:true}];
 assert.deepEqual(R.assess(state,day).visible,[]);
 assert.equal(R.validPrefs(undefined),true);
});
test('large acute weight swing triggers verification, not a diagnosis or nutritional rewrite',()=>{
 const state=base();
 state.weights=[weigh('2026-11-12',80),weigh('2026-11-14',83)];
 const a=R.assess(state,day).visible;
 assert.equal(a[0].id,'weight-check');
 assert.ok(a[0].reason.includes('confirme'));
 assert.ok(a[0].optional);
 const prefs=R.changePreference(state.reminderPrefs,a[0].id,a[0].signature,'snooze',day,14);
 assert.ok(prefs.prefs.items['weight-check'].until==='2026-11-29');
 state.reminderPrefs=prefs.prefs;
 assert.equal(R.assess(state,'2026-11-16').visible.some(r=>r.id==='weight-check'),false);
 assert.equal(R.assess(state,'2026-11-30').visible.some(r=>r.id==='weight-check'),true);
});
test('profile weight differs by 5 percent and is linked to the existing profile confirmation',()=>{
 const state=base();
 state.weights=[weigh('2026-10-15',80),weigh('2026-11-15',84.4)];
 const r=R.assess(state,day).visible.find(x=>x.id==='profile-weight');
 assert.ok(r);assert.ok(r.reason.includes('proteína'));
 const dismissed=R.changePreference(state.reminderPrefs,r.id,r.signature,'dismiss',day);
 state.reminderPrefs=dismissed.prefs;
 assert.ok(!R.assess(state,day).visible.some(x=>x.id===r.id));
 const newProfile={...profile,confirmedAt:'2026-11-15',weightKg:84.4};
 state.nutrition.settings.profile=newProfile;
 assert.ok(!R.assess(state,day).visible.some(x=>x.id===r.id));
 // A substantially new discrepancy signature allows later suggestions.
 state.weights.push(weigh('2026-12-02',95));
 const after=R.assess(state,'2026-12-03');
 assert.ok(after.visible.some(x=>x.id==='profile-weight'));
});
test('measure and wearable review use measured dates, not invented body changes',()=>{
 const state=base();
 state.weights=[weigh('2026-09-01',80),weigh('2026-11-15',84)];
 state.bodyMeasurements=[{id:'m',date:'2026-09-01',values:{waist:88}}];
 state.bioimpedance=[{id:'b',date:'2026-08-01',values:{bodyFatPercent:22}}];
 const report=R.assess(state,day);
 assert.ok(report.visible.some(x=>x.id==='measure-review'));
 assert.ok(report.visible.some(x=>x.id==='bio-review'));
 assert.ok(report.visible.find(x=>x.id==='measure-review').reason.includes('peso'));
 assert.ok(!report.visible.find(x=>x.id==='measure-review').reason.includes('gordura aumentou'));
});
test('no weight-derived measurement reminder without a nearby baseline; age review is nonmandatory',()=>{
 const state=base();
 state.weights=[weigh('2026-11-15',90)];
 state.bodyMeasurements=[{id:'m',date:'2026-10-15',values:{waist:88}}];
 assert.ok(!R.assess(state,day).visible.some(x=>x.id==='measure-review'));
 state.nutrition.settings.profile={...profile,confirmedAt:'2025-09-01',weightKg:90};
 const age=R.assess(state,day).visible.find(x=>x.id==='profile-age');
 assert.ok(age);assert.ok(age.optional);
});
test('activity review only when high factor and recorded steps are old, not when steps are missing',()=>{
 const state=base();state.nutrition.settings.profile={...profile,activity:1.725};
 assert.equal(R.assess(state,day).visible.some(r=>r.id==='activity-review'),false);
 state.activitySteps=Array.from({length:7},(_,i)=>({id:'steps-2026-09-'+String(i+1).padStart(2,'0'),date:'2026-09-'+String(i+1).padStart(2,'0'),steps:6500,source:'samsung-health-manual'}));
 assert.equal(R.assess(state,day).visible.some(r=>r.id==='activity-review'),true);
});
test('mismatch between goal mode and approved suggested nutrition goals prompts optional review',()=>{
 const state=base();
 state.nutrition.settings.profile={...profile,goal:'recomposition'};
 state.nutrition.settings.targets=[{id:'accepted',from:'2026-10-15',source:'suggested'}];
 assert.ok(R.assess(state,day).visible.some(r=>r.id==='goal-nutrition'));
 assert.equal(state.nutrition.settings.targets.length,1);
});
test('snooze, dismissal and global toggle have no server, timer or mutation of recorded history',()=>{
 const state=base();
 state.weights=[weigh('2026-11-01',80),weigh('2026-11-15',85)];
 const before=JSON.stringify(state.weights);
 const first=R.assess(state,day).visible.find(x=>x.id==='profile-weight');
 assert.ok(first);
 const snooze=R.changePreference(state.reminderPrefs,first.id,first.signature,'snooze',day,7);
 assert.equal(snooze.prefs.items[first.id].until,'2026-11-22');
 assert.equal(R.validPrefs(snooze.prefs),true);
 assert.ok(R.changePreference(state.reminderPrefs,first.id,first.signature,'snooze',day,999).error);
 const disabled=R.setEnabled(snooze.prefs,false).prefs;
 state.reminderPrefs=disabled;
 assert.deepEqual(R.assess(state,day).visible,[]);
 assert.equal(R.assess(state,day).disabled,true);
 assert.equal(JSON.stringify(state.weights),before);
 const enabled=R.setEnabled(disabled,true).prefs;assert.equal(R.assess({...state,reminderPrefs:enabled},'2026-11-23').visible.some(x=>x.id===first.id),true);
});
