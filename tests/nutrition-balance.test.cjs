const test=require('node:test');
const assert=require('node:assert/strict');
const N=require('../nutrition.js'),G=require('../nutrition-goals.js'),B=require('../nutrition-balance.js');
const TODAY='2026-11-16';
const profile={heightCm:175,age:30,weightKg:80,activity:1.55,sex:'male',goal:'loss',adultScope:true,confirmedAt:'2026-11-15'};
const target={id:'energy-target',from:'2026-11-01',source:'manual',
  values:{energyKcal:2400,proteinG:144,carbsG:307,fatG:66,fiberG:25},profile,formula:'manual-v1'};
let seq=0;
const uid=kind=>kind+'-'+(++seq);
function meal(date,kcal,protein=150,estimated=false){
  const items=Array.from({length:3},(_,i)=>({
    id:uid('item'),label:'Refeição de teste '+i,
    quantity:1,unit:'portion',grams:null,source:{name:'Dado sintético verificado'},
    nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
    nutrientsPerServing:{energyKcal:kcal/3,proteinG:protein/3,carbsG:90,fatG:20,fiberG:8}
  }));
  if(estimated){
    delete items[0].nutrientsPerServing;
    items[0].estimate={
      confidence:'low',servingLabel:'1 porção',
      assumptions:'Estimativa não medida de composição.',
      low:{energyKcal:180,proteinG:10,carbsG:20,fatG:5},
      central:{energyKcal:220,proteinG:15,carbsG:30,fatG:10},
      high:{energyKcal:260,proteinG:20,carbsG:40,fatG:15}};
  }
  return {id:uid('meal'),date,mealType:'dinner',notes:'',items};
}
function fixture(){
  const a=N.archive();a.settings.profile={...profile};a.settings.targets=[structuredClone(target)];
  a.entries=[
    meal('2026-11-13',3300),
    meal('2026-11-14',2300),
    meal('2026-11-15',2300)];
  return a;
}
function confirmThree(a){
  for(const day of ['2026-11-13','2026-11-14','2026-11-15']){
    const r=B.markReviewed(a,day,TODAY);
    assert.ok(r.balance,!r.error&&r.error);
    a.balance=r.balance;
  }
  return a;
}
test('days not explicitly confirmed are not zero; future/current days cannot be confirmed',()=>{
  const a=fixture();
  assert.equal(B.assessment(a,{},TODAY).status,'blocked');
  assert.equal(B.assessment(a,{},TODAY).reviewedCount,0);
  assert.ok(B.markReviewed(a,TODAY,TODAY).error);
  assert.ok(B.markReviewed(a,'2026-11-17',TODAY).error);
  const missing=meal('2026-11-12',2200);missing.items[0].nutrientsPerServing.proteinG=null;
  a.entries.push(missing);
  assert.ok(B.markReviewed(a,'2026-11-12',TODAY).error);
  const est=meal('2026-11-11',2300,150,true);a.entries.push(est);
  assert.ok(B.markReviewed(a,'2026-11-11',TODAY).error);
  const reviewed=B.markReviewed(a,'2026-11-14',TODAY);
  assert.ok(reviewed.balance);
  a.balance=reviewed.balance;
  assert.equal(B.assessment(a,{},TODAY).reviewedCount,1);
  assert.equal(B.assessment(a,{},TODAY).status,'blocked');
});

test('reviewed data starts with partial, nonclinical weekly balance and optional offer',()=>{
  const a=confirmThree(fixture()),state={sessions:[],muay:{sessions:[]}};
  assert.equal(N.validArchive(a),true);
  const result=B.assessment(a,state,TODAY);
  assert.equal(result.status,'ready');
  assert.equal(result.reviewedCount,3);
  assert.equal(result.usableCount,3);
  assert.equal(result.balanceKcal,700);
  assert.equal(result.days.length,7);
  assert.equal(result.maintenanceKcal,2711);
  assert.ok(result.maxDailyReductionKcal<=200);
  assert.ok(result.maxDailyReductionKcal>40);
  assert.equal(result.sourceDays.length,3);
  assert.equal(result.days.filter(d=>d.deltaKcal!==null).length,3);
  assert.equal(result.candidates.length,7);
  // The original target must remain untouched.
  assert.deepEqual(a.settings.targets,[target]);
});

test('proposal requires chosen light days, preserves protein and fats, never auto-applies',()=>{
  const a=confirmThree(fixture());
  const state={sessions:[{day:'2026-11-17'}],muay:{sessions:[]}};
  assert.equal(B.makePlan(a,state,TODAY,['2026-11-17'],uid).error!==undefined,true);
  assert.ok(B.makePlan(a,state,TODAY,[],uid).error);
  assert.ok(B.makePlan(a,state,TODAY,['2026-11-18','2026-11-18'],uid).error);
  assert.ok(B.makePlan(a,state,TODAY,['2026-11-18','2026-11-19','2026-11-20','2026-11-21','2026-11-22','2026-11-23'],uid).error);
  const proposed=B.makePlan(a,state,TODAY,['2026-11-18','2026-11-19','2026-11-20'],uid);
  assert.ok(proposed.plan);
  assert.equal(proposed.plan.days.length,3);
  assert.equal(a.balance.plan,null);
  assert.equal(B.planForDay(a,state,'2026-11-18'),null);
  assert.ok(proposed.totalReductionKcal<=600);
  assert.ok(proposed.outstandingKcal>=0);
  a.balance.plan=proposed.plan;
  assert.equal(N.validArchive(a),true);
  const today=B.planForDay(a,state,'2026-11-18');
  assert.ok(today);
  assert.ok(today.reductionKcal<=200);
  assert.ok(today.values.energyKcal<target.values.energyKcal);
  assert.equal(today.values.proteinG,target.values.proteinG);
  assert.equal(today.values.fatG,target.values.fatG);
  assert.equal(today.values.fiberG,target.values.fiberG);
  assert.equal(today.values.carbsG,target.values.carbsG-today.reductionKcal/4);
  assert.equal(G.active(a.settings,'2026-11-18').values.energyKcal,2400);
  assert.equal(B.assessment(a,state,TODAY).status,'plan');
  assert.equal(B.planForDay(a,{sessions:[{day:'2026-11-18'}],muay:{sessions:[]}},'2026-11-18'),null);
  assert.equal(B.planForDay(a,state,'2026-11-17'),null);
});

test('edited/removed food or changed goals/profile invalidate acceptance without rewriting history',()=>{
  const a=confirmThree(fixture());
  a.balance.plan=B.makePlan(a,{},TODAY,['2026-11-18'],uid).plan;
  assert.ok(B.planForDay(a,{},'2026-11-18'));
  const originalTarget=structuredClone(a.settings.targets);
  a.entries[0].items[0].quantity=2;
  assert.equal(B.reviewed(a,'2026-11-13'),false);
  assert.equal(B.planForDay(a,{},'2026-11-18'),null);
  assert.equal(B.assessment(a,{},TODAY).status,'plan');
  assert.equal(B.assessment(a,{},TODAY).activePlan,null);
  a.entries[0].items[0].quantity=1;
  assert.ok(B.planForDay(a,{},'2026-11-18'));
  a.settings.profile.weightKg=82;
  assert.equal(B.planForDay(a,{},'2026-11-18'),null);
  a.settings.profile.weightKg=80;
  a.settings.targets.push({...structuredClone(target),id:'later',from:'2026-11-17'});
  assert.equal(B.planForDay(a,{},'2026-11-18'),null);
  assert.deepEqual(originalTarget[0],target);
});

test('professional targets, unknown profile, low-protein days and no margin block suggestions',()=>{
  const a=confirmThree(fixture());
  a.settings.targets[0].source='professional';
  assert.equal(B.assessment(a,{},TODAY).status,'blocked');
  a.settings.targets[0].source='manual';
  a.settings.profile.adultScope=false;
  assert.equal(B.assessment(a,{},TODAY).status,'blocked');
  a.settings.profile.adultScope=true;
  a.entries[1].items.forEach(i=>i.nutrientsPerServing.proteinG=20);
  a.balance.reviewedDays=a.balance.reviewedDays.map(x=>
    x.date==='2026-11-14'?{...x,fingerprint:B.fingerprint(a,x.date)}:x);
  assert.equal(B.assessment(a,{},TODAY).status,'blocked');
});

test('weekly balance ignores low-confidence estimates and does not call them reliable surplus',()=>{
  const a=fixture();
  a.entries[0]=meal('2026-11-13',3300,150,true);
  assert.ok(B.markReviewed(a,'2026-11-13',TODAY).error);
  assert.equal(B.assessment(a,{},TODAY).usableCount,0);
  const saved=confirmThree(fixture());
  // Example: all recorded days exceed a weight-loss target but remain under maintenance.
  saved.entries=[meal('2026-11-13',2650),meal('2026-11-14',2650),meal('2026-11-15',2650)];
  saved.balance.reviewedDays=saved.balance.reviewedDays.map(x=>({...x,fingerprint:B.fingerprint(saved,x.date)}));
  assert.equal(B.assessment(saved,{},TODAY).status,'steady');
});

test('optional balance survives local backups with local priority and rejects corrupted records',()=>{
  const imported=confirmThree(fixture());
  imported.balance.plan=B.makePlan(imported,{},TODAY,['2026-11-18'],uid).plan;
  assert.ok(N.validArchive(imported));
  assert.equal(N.validArchive({...imported,balance:{reviewedDays:[{date:TODAY,reviewedAt:TODAY,fingerprint:'bad'}]}}),false);
  const cloned=JSON.parse(JSON.stringify(imported));
  assert.equal(N.validArchive(cloned),true);
  const restored=N.merge(undefined,cloned);
  assert.deepEqual(restored.balance,cloned.balance);
  const own=N.archive();own.balance={reviewedDays:[],plan:null,ignoredUntil:'2026-11-23'};
  const merge=N.merge(own,imported);
  assert.equal(merge.balance.plan,null);
  assert.equal(merge.balance.ignoredUntil,'2026-11-23');
  assert.equal(merge.balance.reviewedDays.length,3);
  assert.ok(N.validArchive(merge));
});
