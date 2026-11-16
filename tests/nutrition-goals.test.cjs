const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../nutrition-goals.js'),N=require('../nutrition.js');
const profile={heightCm:175,age:30,weightKg:80,activity:1.55,sex:'male',goal:'loss',adultScope:true,confirmedAt:'2026-11-15'};
const target=(id,from,source='manual')=>({id,from,source,values:{energyKcal:2400,proteinG:144,carbsG:306,fatG:66,fiberG:25},profile,formula:'test'});
test('repouso, atividade e metas têm cálculo auditável sem duplicar treino',()=>{
 const s=G.estimate(profile);assert.equal(s.resting,1749);assert.equal(s.maintenance,2711);assert.equal(s.values.energyKcal,2440);assert.equal(s.values.proteinG,144);assert.equal(s.values.fatG,68);assert.equal(s.values.carbsG,313);
 assert.equal(G.estimate({...profile,sex:'female'}).resting,1583);
 assert.equal(G.estimate({...profile,goal:'recomposition'}).values.energyKcal,2710);
});
test('incompletos, extremos, menores e escopo clínico não geram metas',()=>{
 for(const p of [{...profile,age:17},{...profile,age:30.5},{...profile,heightCm:null},{...profile,activity:NaN},{...profile,sex:''},{...profile,adultScope:false}])assert.ok(G.estimate(p).error);
 assert.equal(G.validProfile({...profile,heightCm:null}),true);
});
test('vigência histórica e prioridade local no merge',()=>{
 const a=N.archive(),b=N.archive();a.settings.profile=profile;a.settings.targets=[target('local','2026-11-15')];b.settings.targets=[target('old','2026-10-01'),target('conflict','2026-11-15')];
 const merged=N.merge(a,b);assert.equal(G.active(merged.settings,'2026-10-15').id,'old');assert.equal(G.active(merged.settings,'2026-11-15').id,'local');assert.equal(G.active(merged.settings,'2026-09-01'),null);assert.deepEqual(N.merge(merged,b),merged);
 assert.equal(N.validArchive(JSON.parse(JSON.stringify(merged))),true);
 assert.equal(N.validArchive({...a,settings:{mode:'simple',targets:[{...target('bad','2026-11-15'),values:{energyKcal:-1}}]}}),false);
});
test('fibra legada desconhecida é distinta de zero, ceia funciona',()=>{
 const i={id:'i',label:'sintético',quantity:100,unit:'g',grams:null,source:{name:'teste'},nutrientsPer100g:{energyKcal:120,proteinG:2,carbsG:20,fatG:2}};
 const e={id:'e',date:'2026-11-15',mealType:'supper',items:[i]};assert.ok(N.validEntry(e));assert.equal(N.observedTotals([e],e.date).totals.fiberG,null);
 i.nutrientsPer100g.fiberG=0;assert.equal(N.observedTotals([e],e.date).totals.fiberG,0);
 i.nutrientsPer100g.fiberG=5;assert.equal(N.observedTotals([e],e.date).totals.fiberG,5);
});
test('rascunho vazio e parcial validado e recuperado em backup',()=>{
 const a=N.archive();a.draft={editId:null,entry:{id:'draft',date:'2026-11-15',mealType:'supper',items:[]},pending:{label:'rascunho'}};
 assert.ok(N.validArchive(a));assert.deepEqual(N.merge(undefined,a),a);assert.ok(!N.validArchive({...a,draft:{entry:{}}}));
});
test('contexto compara medidas no mesmo local sem inferir gordura',()=>{
 const c=G.context({sessions:[{timestamp:'2026-11-14T13:00:00'}],muay:{sessions:[{day:'2026-11-15'}]},bodyMeasurements:[{date:'2026-11-01',values:{abdomen:90}},{date:'2026-11-15',values:{abdomen:89}}],weights:[{date:'2026-11-01',weight:80},{date:'2026-11-15',weight:80.2}]},'2026-11-15');
 assert.equal(c.abdomenChange,-1);assert.equal(c.weightChange,.2);assert.equal(c.weeklyStrength,1);assert.equal(c.weeklyMuay,1);assert.equal(c.muay,1);assert.equal(c.bodyFat,undefined);
});


test('prescrição profissional permanece independente e não sobrescreve metas existentes',()=>{
 const settings={mode:'simple'};
 assert.equal(G.professionalDefault(settings,'2026-11-16'),true);
 assert.equal(G.professionalDefault(settings,'2026-11-17'),false);
 assert.equal(settings.targets.length,1);
 assert.equal(settings.targets[0].source,'professional');
 assert.deepEqual(settings.targets[0].values,{energyKcal:1710,proteinG:159,carbsG:146,fatG:28,fiberG:null});
 assert.equal(G.difference(settings.targets[0].values),238);
 assert.equal(G.validSettings(settings),true);
 const existing={mode:'simple',targets:[target('keep','2026-10-31')]};
 assert.equal(G.professionalDefault(existing,'2026-11-16'),false);
 assert.equal(existing.targets[0].id,'keep');
});
test('repouso estimado usa pesagem mais recente e exige altura, idade e parâmetro da fórmula',()=>{
 const st={nutrition:{settings:{mode:'simple',profile:{...profile,weightKg:79,activity:null,adultScope:false}}},
   weights:[{date:'2026-11-05',weight:81,initial:false},{date:'2026-11-16',weight:82,initial:false}]};
 const current=G.restingFromState(st,'2026-11-16');
 assert.equal(current.weightKg,82);
 assert.equal(current.weightDate,'2026-11-16');
 assert.equal(current.valueKcal,1769);
 assert.equal(G.restingFromState(st,'2026-11-15').weightKg,81);
 assert.equal(G.restingFromState({...st,nutrition:{settings:{mode:'simple'}}},'2026-11-16').valueKcal,null);
 assert.ok(G.restingFromState({...st,nutrition:{settings:{mode:'simple'}}},'2026-11-16').missing.includes('altura'));
 assert.equal(G.restingFromState({weights:[],nutrition:{settings:{profile}}},'2026-11-16').valueKcal,1749);
});
