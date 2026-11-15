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
