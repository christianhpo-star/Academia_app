const test=require('node:test'), assert=require('node:assert/strict');
const P=require('../goal-planner.js');
const profile={heightCm:174,age:28,weightKg:88.8,sex:'male',activity:1.55,goal:'recomposition',adultScope:true,confirmedAt:'2026-11-15'};
function state(mode,target,date='2027-01-14'){
 return {weights:[{date:'2026-11-10',weight:88.8}],sessions:[],muay:{sessions:[]},
  nutrition:{settings:{profile,targets:[{id:'old',from:'2026-11-01',source:'manual',values:{energyKcal:2600}}]}},
  settings:{goalMode:mode,targetWeight:target,goalDate:date,startWeight:90}};
}
test('weight goal computes arithmetic pace but never deadline-derived calorie deficit',()=>{
 const s=P.plan(state('weight',82),'2026-11-15');
 assert.equal(s.mode,'weight');assert.equal(s.direction,'loss');
 assert.equal(s.daysRemaining,60);assert.equal(s.weightDeltaKg,-6.8);
 assert.ok(s.paceKgPerWeek>0);assert.ok(s.energyBand.low<s.maintenanceKcal);
 assert.equal(s.energyBand.provenance.includes('não prescrição'),true);
 assert.equal(s.sourceWeight.reference,false);
});
test('short unrealistic deadline returns warning rather than imposing an extreme deficit',()=>{
 const s=P.plan(state('weight',72,'2026-11-22'),'2026-11-15');
 assert.equal(s.status,'review');
 assert.ok(s.pacePercentPerWeek>1);
 assert.ok(s.warnings.some(x=>x.includes('ultrapassa 1%')));
 assert.ok(s.energyBand.low>0);
});
test('gain, recomposition and maintenance modes are distinct',()=>{
 const gain=P.plan(state('muscle_gain',92),'2026-11-15');
 assert.equal(gain.direction,'gain');
 assert.ok(gain.energyBand.low>gain.maintenanceKcal);
 const recom=P.plan(state('recomposition',82),'2026-11-15');
 assert.equal(recom.mode,'recomposition');
 assert.equal(recom.targetKg,null);
 assert.equal(recom.paceKgPerWeek,null);
 const maintain=P.plan(state('maintenance',82),'2026-11-15');
 assert.equal(maintain.energyBand.kind,'faixa próxima à manutenção');
 assert.equal(maintain.paceKgPerWeek,null);
});
test('expired deadlines, contradictory modes, absent observations and incomplete profiles are flagged',()=>{
 assert.equal(P.plan(state('fat_loss',92),'2026-11-15').status,'conflict');
 assert.equal(P.plan(state('muscle_gain',82),'2026-11-15').status,'conflict');
 assert.equal(P.plan(state('weight',80,'2026-10-15'),'2026-11-15').status,'expired');
 const noProfile=state('weight',82);noProfile.nutrition.settings.profile={...profile,activity:null};
 assert.equal(P.plan(noProfile,'2026-11-15').energyBand,null);
 const noWeight=state('weight',82);noWeight.weights=[];delete noWeight.settings.startWeight;
 assert.equal(P.plan(noWeight,'2026-11-15').status,'incomplete');
});
test('training is context only; calories are not doubled and confirmed nutrition targets do not change',()=>{
 const s=state('weight',82);
 const initial=JSON.stringify(s.nutrition.settings.targets);
 const before=P.plan(s,'2026-11-15');
 s.sessions=[{timestamp:'2026-11-14T12:00:00Z'},{timestamp:'2026-11-13T12:00:00Z'}];
 s.muay.sessions=[{day:'2026-11-12'}];
 const after=P.plan(s,'2026-11-15');
 assert.equal(before.maintenanceKcal,after.maintenanceKcal);
 assert.equal(after.trainingWeek.strength,2);
 assert.equal(after.trainingWeek.muay,1);
 assert.equal(initial,JSON.stringify(s.nutrition.settings.targets));
});
test('reference weight is explicitly marked and never called a measured trend',()=>{
 const s=state('weight',82);s.weights=[{date:'2026-10-30',weight:88.3,initial:true}];
 const p=P.plan(s,'2026-11-15');
 assert.equal(p.sourceWeight.reference,true);
 assert.ok(p.warnings.some(x=>x.includes('referência')));
 assert.ok(P.dateOK('2026-11-15'));
 assert.equal(P.dateOK('2026-11-31'),false);
});
