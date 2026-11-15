const test=require('node:test');
const assert=require('node:assert/strict');
const N=require('../nutrition.js');
const C=require('../nutrition-catalog.js');
let sequence=0;const id=prefix=>prefix+'-'+(++sequence);
const get=(foodId)=>C.makeItem(foodId,'pack',1,id);
const entry=(item,date='2026-11-14')=>({id:id('meal'),date,mealType:'snack',time:null,notes:'',items:[item]});
test('rótulos das capturas por embalagem, sem converter ml em gramas',()=>{
  const yogurt=get('photo:itambe-zero-morango-200g');
  const drink=get('photo:piracanjuba-proforce-banoffee-250ml');
  assert.equal(yogurt.grams,200);assert.equal(drink.grams,null);
  assert.equal(yogurt.unit,'portion');assert.equal(drink.unit,'portion');
  assert.deepEqual(yogurt.nutrientsPerServing,{energyKcal:52,proteinG:6,carbsG:7,fatG:0});
  assert.deepEqual(drink.nutrientsPerServing,{energyKcal:170,proteinG:23,carbsG:17,fatG:1});
  assert.equal(C.makeItem('photo:piracanjuba-proforce-banoffee-250ml','custom',250,id),null);
  const e1=entry(yogurt),e2=entry(drink);
  assert.equal(N.validEntry(e1),true);assert.equal(N.validEntry(e2),true);
  const stats=N.observedTotals([e1,e2],'2026-11-14');
  assert.equal(stats.totals.energyKcal,222);
  assert.equal(stats.totals.proteinG,29);
  assert.equal(stats.totals.carbsG,24);
  assert.equal(stats.totals.fatG,1);
  assert.equal(stats.observedOnly,true);
});
test('Whey Growth genérico não pressupõe calorias ou proteína',()=>{
  const item=C.makeItem('growth:whey-unknown','dose',1,id);
  assert.equal(item.nutrientsPer100g.energyKcal,null);
  assert.equal(N.observedTotals([entry(item)],'2026-11-14').totals.energyKcal,null);
  assert.equal(N.observedTotals([entry(item)],'2026-11-14').totals.proteinG,null);
});
test('repetição segura de favorito embalado e preservação das porções',()=>{
  const first=entry(get('photo:piracanjuba-proforce-banoffee-250ml'));
  const bundle=C.makeFavorite(first,N.archive(),'Meu lanche',id);
  assert.equal(bundle.foodsToAdd.length,0);
  const archive=N.archive();archive.mealTemplates.push(bundle.favorite);
  assert.equal(N.validArchive(archive),true);
  const repeated=C.fromFavorite(bundle.favorite,'2026-11-15',archive,id);
  assert.equal(N.validEntry(repeated),true);
  assert.equal(repeated.items[0].grams,null);
  assert.equal(repeated.items[0].nutrientsPerServing.energyKcal,170);
  assert.notEqual(repeated.id,first.id);
});
test('registro manual também pode virar favorito e continuar editável',()=>{
  const item={id:id('item'),foodId:null,label:'Refeição sem tabela',quantity:1,unit:'portion',grams:null,
    nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},source:null};
  const row=entry(item);
  const bundle=C.makeFavorite(row,N.archive(),'',id);
  assert.equal(bundle.foodsToAdd.length,1);
  const archive=N.archive();archive.foods.push(...bundle.foodsToAdd);archive.mealTemplates.push(bundle.favorite);
  assert.equal(N.validArchive(archive),true);
  const restored=C.fromFavorite(bundle.favorite,'2026-11-16',archive,id);
  assert.equal(restored.items[0].label,'Refeição sem tabela');
  assert.equal(N.observedTotals([restored],'2026-11-16').totals.proteinG,null);
});
test('busca aceita grafias com e sem acento sem alterar os registros',()=>{
  assert.ok(C.search('itambe').some(x=>x.id==='photo:itambe-zero-morango-200g'));
  assert.ok(C.search('Piracanjuba').some(x=>x.id==='photo:piracanjuba-proforce-banoffee-250ml'));
  assert.ok(C.search('arroz').length>0);
  assert.equal(C.makeItem('unknown','pack',1,id),null);
});
