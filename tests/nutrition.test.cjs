const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../nutrition.js');

const source = {name:'Synthetic example',reference:'test-only',license:'CC0'};
const nutrients = {energyKcal:120,proteinG:10,carbsG:18,fatG:2};
const food = (id='food-1') => ({id,name:'Alimento sintético',preparation:'cooked',nutrientsPer100g:nutrients,source});
const item = (id='item-1') => ({id,foodId:'food-1',label:'Alimento sintético',
  quantity:150,unit:'g',grams:null,nutrientsPer100g:nutrients,source});
const entry = (id='meal-1', date='2026-11-14') =>
  ({id,date,mealType:'lunch',time:null,items:[item()],notes:''});

test('backups v1 anteriores ao módulo continuam válidos sem refeições inventadas',()=>{
  assert.equal(N.validArchive(undefined),true);
  const original={version:1, sessions:[{id:'strength-1'}]};
  assert.equal(N.ensureArchive(original),true);
  assert.equal(N.ensureArchive(original),false);
  assert.deepEqual(original.sessions,[{id:'strength-1'}]);
  assert.deepEqual(original.nutrition,N.archive());
  assert.equal(original.nutrition.entries.length,0);
});

test('valida catálogos e registros, datas reais, quantidades e IDs únicos',()=>{
  const a=N.archive(); a.foods=[food()];a.entries=[entry()];
  assert.equal(N.validArchive(a),true);
  assert.equal(N.dateOk('2026-02-30'),false);
  assert.equal(N.dateOk('2026-11-14'),true);
  assert.equal(N.validArchive({...a,entries:[entry(),entry()]}),false);
  assert.equal(N.validArchive({...a,entries:[entry('a','2026-02-30')]}),false);
  assert.equal(N.validArchive({...a,entries:[{...entry(),items:[{...item(),quantity:-2}]}]}),false);
  assert.equal(N.validArchive({...a,foods:[{...food(),nutrientsPer100g:{...nutrients,energyKcal:NaN}}]}),false);
  assert.equal(N.validArchive({...a,entries:[{...entry(),items:[{...item(),source:null}]}]}),false);
});

test('reimportação é idempotente e registros do aparelho têm prioridade',()=>{
  const own=N.archive(); own.foods=[food()];own.entries=[entry()];
  const backup=N.archive(); backup.foods=[{...food(),name:'Substituição antiga'},food('food-2')];
  backup.entries=[{...entry(),notes:'Backup antigo'},entry('meal-2','2026-11-13')];
  const result=N.merge(own,backup);
  assert.equal(result.foods.length,2);
  assert.equal(result.entries.length,2);
  assert.equal(result.foods[0].name,'Alimento sintético');
  assert.equal(result.entries[0].notes,'');
  assert.deepEqual(N.merge(result,backup),result);
  assert.deepEqual(N.merge(undefined,own),own);
  assert.equal(N.validArchive(result),true);
});

test('estimativas só são exibidas quando cada alimento tem valor e porção em gramas',()=>{
  const first=N.observedTotals([entry()], '2026-11-14');
  assert.equal(first.mealsRecorded,1);
  assert.equal(first.observedOnly,true);
  assert.equal(first.totals.energyKcal,180);
  assert.equal(first.totals.proteinG,15);
  assert.equal(N.observedTotals([], '2026-11-14').totals.proteinG,null);
  const unknown={...item('other'),unit:'portion',quantity:1,grams:null};
  const incomplete={...entry(),items:[item(),unknown]};
  const measured=N.observedTotals([incomplete],'2026-11-14');
  assert.equal(measured.totals.proteinG,null);
  assert.equal(measured.itemsRecorded,2);
  const noProtein={...item(),nutrientsPer100g:{...nutrients,proteinG:null}};
  const partial=N.observedTotals([{...entry(),items:[noProtein]}],'2026-11-14');
  assert.equal(partial.totals.proteinG,null);
  assert.equal(partial.totals.energyKcal,180);
});


test('resumo indicativo combina valores conferidos e estimados sem ocultar o almoço',()=>{
  const C=require('../nutrition-catalog.js');
  let index=0;const id=kind=>kind+'-'+(++index);
  const date='2026-11-15';
  const known=C.makeItem('taco:2011:346','custom',121,id);
  const sweet=C.makeItem('recipe:brigadeiro-morango','custom',80,id);
  const meals=[
    {id:'lunch-check',date,mealType:'lunch',items:[known]},
    {id:'snack-check',date,mealType:'snack',items:[sweet]},
  ];
  const strict=N.observedTotals(meals,date);
  assert.equal(strict.totals.energyKcal,null,'modo estrito deve manter a separação');
  const summary=N.recordedBreakdown(meals,date);
  assert.equal(summary.counts.energyKcal.confirmed,1);
  assert.equal(summary.counts.energyKcal.estimated,1);
  assert.equal(summary.counts.energyKcal.unknown,0);
  assert.ok(Math.abs(summary.totals.energyKcal-(234.74+315*0.8))<0.12);
  assert.ok(summary.ranges.energyKcal.low<summary.totals.energyKcal);
  assert.ok(summary.ranges.energyKcal.high>summary.totals.energyKcal);
  assert.equal(N.recordedBreakdown(meals,'2026-11-14').totals.energyKcal,null);
});
test('composição desconhecida não zera subtotal e continua explicitamente incompleta',()=>{
  const C=require('../nutrition-catalog.js');
  let n=0,id=k=>k+'-'+(++n),date='2026-11-15';
  const known=C.makeItem('photo:itambe-zero-morango-200g','pack',1,id);
  const unknown=C.makeItem('growth:whey-unknown','dose',1,id);
  const meals=[{id:'m-aggregate',date,mealType:'breakfast',items:[known,unknown]}];
  const out=N.recordedBreakdown(meals,date);
  assert.equal(out.totals.energyKcal,52);
  assert.equal(out.totals.proteinG,6);
  assert.equal(out.totals.fiberG,null);
  assert.equal(out.counts.energyKcal.unknown,1);
  assert.equal(out.counts.fiberG.unknown,2);
  assert.equal(N.observedTotals(meals,date).totals.energyKcal,null);
  assert.equal(N.recordedBreakdown([],date).totals.energyKcal,null);
  assert.equal(N.recordedBreakdown([{id:'m-zero',date,mealType:'snack',
    items:[{...known,id:'zero',nutrientsPerServing:{...known.nutrientsPerServing,energyKcal:0}}]}],date).totals.energyKcal,0);
});
