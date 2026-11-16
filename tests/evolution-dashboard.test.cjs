const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../evolution-dashboard.js'),N=require('../nutrition.js'),G=require('../nutrition-goals.js');
const date='2026-11-16';
const settings={startWeight:92,targetWeight:80,goalMode:'weight'};
const nutrition=N.archive();
const target={id:'t',source:'manual',from:'2026-10-01',values:{energyKcal:2117,proteinG:169,carbsG:201,fatG:65,fiberG:25},formula:'manual-v1'};
nutrition.settings.targets=[target];
const item=(id,kcal,protein,carbs,fat,fiber)=>({id,label:'Registro sintético',quantity:1,unit:'portion',
  grams:null,source:{name:'Dados sintéticos'},nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null,fiberG:null},
  nutrientsPerServing:{energyKcal:kcal,proteinG:protein,carbsG:carbs,fatG:fat,fiberG:fiber}});
const entry=(day,kcal,id)=>({id:'e'+id,date:day,mealType:'dinner',items:Array.from({length:3},(_,i)=>item('i'+id+'-'+i,kcal/3,100/3,200/3,55/3,20/3))});
test('weight model only uses local weights and labels inherited initial values',()=>{
 const state={settings,weights:[{id:'a',date:'2026-10-21',weight:90,initial:true},
  {id:'b',date:'2026-11-15',weight:87.2,initial:false},{id:'c',date:'2026-11-09',weight:88.8,initial:false}]};
 const model=E.weightModel(state,date,2);
 assert.equal(model.latest.weight,87.2);
 assert.equal(model.initial,92);
 assert.equal(model.desired,80);
 assert.equal(model.history.length,2);
 assert.equal(model.history[0].date,'2026-11-15');
 const html=E.renderWeight(state,date,2);
 for(const part of ['Peso inicial','Peso atual','Peso desejado','Adicionar uma pesagem','Pesagens registradas','87,2','80','21/10','15/11'])assert.ok(html.includes(part),part);
 assert.match(html,/data-action="evo-weight-more"/);
 assert.match(html,/role="img"/);
 assert.doesNotMatch(html,/Christian Oliveira/);
});
test('absent weigh-ins remain absent and no invented sample screenshot values',()=>{
 const state={settings:{startWeight:88.3,targetWeight:82},weights:[]};
 const html=E.renderWeight(state,date,8);
 assert.match(html,/Nenhuma pesagem disponível/);
 assert.doesNotMatch(html,/87,2/);
 assert.match(html,/88,3/);
 assert.equal(E.weightModel(state,date).latest,null);
});
test('nutrition series: missing calendar dates are missing rather than zeros',()=>{
 nutrition.entries=[entry('2026-11-13',2500,1),entry('2026-11-15',1800,2)];
 const series=E.nutritionWindow(nutrition,date,7);
 assert.equal(series.length,7);
 assert.equal(series.filter(x=>x.recorded).length,2);
 assert.equal(series.find(x=>x.date==='2026-11-14').totals,null);
 assert.equal(series.find(x=>x.date==='2026-11-13').target.energyKcal,2117);
 const html=E.renderNutrition(nutrition,date,{energy:7,macros:7,average:7});
 assert.match(html,/Objetivo \(kcal\)/);
 assert.match(html,/Distribuição de macros \(%\)/);
 assert.match(html,/Média de macronutrientes \(g\)/);
 assert.equal((html.match(/data-action="evo-period"/g)||[]).length,9);
 assert.match(html,/Dias sem registro estão em branco/);
 assert.match(html,/Anel externo/);
 assert.match(html,/Fibras \(acompanhadas à parte\)/);
});
test('averages exclude unregistered days and fiber is never included as a fourth donut segment',()=>{
 nutrition.entries=[entry('2026-11-13',2500,1),entry('2026-11-15',1800,2)];
 const {average,used}=E.macroSummary(E.nutritionWindow(nutrition,date,7));
 assert.equal(used,2);
 assert.equal(average.proteinG,100);
 assert.equal(average.fiberG,20);
 const html=E.renderNutrition(nutrition,date,{energy:7,macros:7,average:7});
 assert.match(html,/Fibra|Fibras/);
 assert.match(html,/dupla contagem/);
 assert.equal((html.match(/data-action="nutrition-open"/g)||[]).length,1);
});
test('estimated partial macros are explained rather than declared total daily consumption',()=>{
 const a=N.archive(),e=entry('2026-11-15',1800,3);
 e.items[0].nutrientsPerServing.fatG=null;
 a.entries=[e];
 const html=E.renderNutrition(a,date,{energy:7,macros:7,average:7});
 assert.match(html,/Não há dados nutricionais suficientes/);
 assert.match(html,/não representam a ingestão total do dia/);
});
test('window limits and date movement use valid civil days',()=>{
 assert.equal(E.moveDate('2026-03-01',-1),'2026-02-28');
 assert.equal(E.moveDate(date,-7),'2026-11-09');
 assert.equal(E.moveDate('not-a-date',-1),null);
 assert.equal(E.periodDays(15),7);
 assert.equal(E.periodDays(90),90);
});
