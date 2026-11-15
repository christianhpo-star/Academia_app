const test=require('node:test'),assert=require('node:assert/strict');
const HEALTH=require('../health-import.js');
const ACT=require('../activity.js');
const data={
 format:HEALTH.FORMAT,
 monthlySummaries:[
  {id:'health-month-2026-09',month:'2026-09',periodStart:'2026-09-01',periodEnd:'2026-09-30',complete:true,daysCovered:30,steps:165000,activeMinutes:2100,activityKcal:11200,goalDays:25,source:HEALTH.SOURCE},
  {id:'health-month-2026-10',month:'2026-10',periodStart:'2026-10-01',periodEnd:'2026-10-31',complete:true,daysCovered:31,steps:173600,activeMinutes:2050,activityKcal:11600,goalDays:20,source:HEALTH.SOURCE},
  {id:'health-month-2026-11',month:'2026-11',periodStart:'2026-11-01',periodEnd:'2026-11-15',complete:false,daysCovered:15,steps:82500,activeMinutes:890,activityKcal:5100,goalDays:9,source:HEALTH.SOURCE}
 ],
 dailySteps:[
  {id:'steps-2026-09-01',date:'2026-09-01',steps:5000,source:'samsung-health-manual',activeMinutes:60,activityKcal:220},
  {id:'steps-2026-10-01',date:'2026-10-01',steps:8800,source:'samsung-health-manual',activeMinutes:100,activityKcal:500}
 ],
 weightReports:[{id:'health-weight-2026-11-10',date:'2026-11-10',weightKg:79.4,reportedBmi:25.2,weightChangeKg:0.7,bmiChange:0.2,source:HEALTH.SOURCE}]
};
const current=()=>({activitySteps:[],healthMonthly:[],healthWeightReports:[],weights:[],sessions:[],muay:{sessions:[]}});
test('month totals are kept separate; no invented daily steps',()=>{
 assert.ok(HEALTH.validImport(data,'2026-11-15'));
 const result=HEALTH.apply(current(),data,'2026-11-15');
 assert.ok(result.next);
 assert.equal(result.next.activitySteps.length,2);
 assert.equal(result.next.healthMonthly.length,3);
 assert.equal(result.next.weights.length,1);
 assert.equal(result.next.healthWeightReports[0].reportedBmi,25.2);
 assert.equal(result.next.healthMonthly.reduce((sum,m)=>sum+m.steps,0),421100);
 assert.equal(result.next.healthMonthly.reduce((sum,m)=>sum+m.activeMinutes,0),5040);
 assert.equal(ACT.assess(result.next,'2026-11-15').suggestedFactor,null);
 const avg=HEALTH.averages(result.next.healthMonthly);
 assert.equal(avg[0].stepsPerCalendarDay,5500);
 assert.equal(avg[1].stepsPerCalendarDay,5600);
 assert.equal(avg[2].complete,false);
});
test('merge is idempotent and local same-date readings have priority',()=>{
 const existing=current();
 existing.weights=[{id:'local',date:'2026-11-10',weight:79.1}];
 existing.activitySteps=[ACT.upsertSteps([],'2026-10-01',9000).item];
 const first=HEALTH.apply(existing,data,'2026-11-15').next;
 assert.equal(first.weights.length,1);
 assert.equal(first.weights[0].weight,79.1);
 assert.equal(first.activitySteps.length,2);
 assert.equal(first.activitySteps.find(x=>x.date==='2026-10-01').steps,9000);
 const second=HEALTH.apply(first,data,'2026-11-15').next;
 assert.deepEqual(second,first);
});
test('reject future dates, invalid days and invented monthly totals',()=>{
 assert.ok(!HEALTH.validImport(data,'2026-11-10'));
 const wrong=structuredClone(data);
 wrong.monthlySummaries[2].complete=true;
 assert.ok(!HEALTH.validImport(wrong,'2026-11-15'));
 const invalid=structuredClone(data);
 invalid.dailySteps.push({id:'steps-2026-11-31',date:'2026-11-31',steps:100,source:'samsung-health-manual'});
 assert.ok(!HEALTH.validImport(invalid,'2026-11-15'));
 const fake=structuredClone(data);
 fake.monthlySummaries[1].steps=-1;
 assert.ok(!HEALTH.validImport(fake,'2026-11-15'));
});
test('compatibility with legacy archives and invalid optional datasets',()=>{
 assert.equal(HEALTH.validMonthlyList(undefined),true);
 assert.equal(HEALTH.validWeightReports(undefined),true);
 assert.equal(HEALTH.validMonthlyList([{month:'2026-10'}]),false);
 assert.equal(HEALTH.validWeightReports([{date:'2026-11-10'}]),false);
});
