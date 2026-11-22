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
 const bodyTools='<div id="body-tools">Objetivo e pesagem</div>';
 const html=E.renderWeight(state,date,2,{stepsHTML:'<section>Movimento diário</section>',groupsHTML:'<section>Treino por grupo</section>',bodyToolsHTML:bodyTools});
 for(const part of ['Peso inicial','Peso atual','Peso desejado','Adicionar uma pesagem','Pesagens registradas','87,2','80','21/10','15/11'])assert.ok(html.includes(part),part);
 assert.match(html,/data-action="evo-weight-more"/);
 assert.match(html,/role="img"/);
 assert.match(html,/id="evo-panel-weight"[^>]+role="tabpanel" aria-labelledby="evo-tab-weight"/);
 assert.doesNotMatch(html,/Movimento diário|Treino por grupo/);
 assert.ok(html.endsWith('</details>'+bodyTools+'</section>'));
 for(const [view,label] of [['weight','Corpo'],['training','Treinos'],['nutrition','Nutrição']]){
  const header=E.renderHeader(state,date,view);
  assert.equal((header.match(/role="tab"/g)||[]).length,3);
  assert.equal((header.match(/aria-selected="true"/g)||[]).length,1);
  assert.equal((header.match(/tabindex="0"/g)||[]).length,1);
  assert.equal((header.match(/tabindex="-1"/g)||[]).length,2);
  assert.ok(header.includes('id="evo-tab-'+view+'" type="button" role="tab" aria-selected="true" tabindex="0"'));
  assert.ok(header.includes('aria-controls="evo-panel-'+view+'" data-action="evo-view" data-view="'+view+'"'));
  assert.ok(header.includes('>'+label+'</button>'));
 }
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
 e.items.forEach(item=>{item.nutrientsPerServing.fatG=null;});
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

test('measure chart switches from weight and preserves the original body-record data',()=>{
 const state={settings,weights:[],
  bodyMeasurements:[
   {id:'body-2026-11-09',date:'2026-11-09',values:{abdomen:92,chest:102}},
   {id:'body-2026-11-15',date:'2026-11-15',values:{abdomen:91,chest:104}}
  ]};
 const previous=JSON.stringify(state.bodyMeasurements);
 const m=E.measuresModel(state,date,'chest');
 assert.equal(m.field.id,'chest');assert.equal(m.all.length,2);assert.equal(m.latest.value,104);
 const html=E.renderWeight(state,date,5,{chartMode:'measures',measureKey:'chest'});
 for(const label of ['Evolução corporal','Medidas','Peitoral','Ver mapa corporal','104 cm','evo-measure-field'])assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/Nenhuma pesagem disponível/);
 assert.equal(JSON.stringify(state.bodyMeasurements),previous);
 const empty=E.renderWeight({...state,bodyMeasurements:[]},date,5,{chartMode:'measures'});
 assert.match(empty,/Sem medidas de abdômen/);
});
test('group volume counts only effective strength sets by exercise group and bounded dates',()=>{
 const state={exercises:[{id:'pull',group:'A'},{id:'bench',group:'B'},{id:'leg',group:'C'},{id:'hip',group:'D'}],sessions:[
  {id:'s1',day:'2026-11-15',entries:[{id:'pull',sets:[{load:20,reps:10,warmup:true},{load:40,reps:10,warmup:false},{load:45,reps:8,warmup:false}]},{id:'bench',sets:[{load:30,reps:8,warmup:false}]}]},
  {id:'s2',day:'2026-11-01',entries:[{id:'leg',sets:[{load:70,reps:10,warmup:false}]}]},
  {id:'s3',day:'2026-09-01',entries:[{id:'hip',sets:[{load:50,reps:12,warmup:false}]}]},
  {id:'s4',day:'2026-11-15',entries:[{id:'hip',sets:[{load:30,reps:0,warmup:false}]}]}
 ]};
 const before=JSON.stringify(state.sessions);
 const seven=E.groupVolume(state,date,7);
 assert.deepEqual(seven.map(x=>x.sets),[2,1,0,0]);
 assert.deepEqual(seven.map(x=>x.sessionCount),[1,1,0,0]);
 assert.deepEqual(E.groupVolume(state,date,30).map(x=>x.sets),[2,1,1,0]);
 assert.deepEqual(E.groupVolume(state,date,90).map(x=>x.sets),[2,1,1,1]);
 const html=E.renderGroupVolume(state,date,30);
 assert.match(html,/Treino por grupo/);
 assert.match(html,/Séries efetivas registradas/);
 assert.equal((html.match(/class="evo-volume-row"/g)||[]).length,4);
 assert.doesNotMatch(html,/radar/i);
 assert.equal(JSON.stringify(state.sessions),before);
});
