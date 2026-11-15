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

test('açaí trufado branco e preto têm intervalo explícito, sem kcal verificadas',()=>{
  const branco=C.find('local:doce-cascao-acai-trufado-branco-500ml');
  const preto=C.find('local:doce-cascao-acai-trufado-preto-500ml');
  assert.equal(branco.estimate.confidence,'low');
  assert.equal(preto.estimate.central.energyKcal,1003.4);
  assert.equal(branco.estimate.central.energyKcal,814.4);
  assert.equal(branco.nutrientsPer100g.energyKcal,null);
  assert.equal(C.search('açaí trufado').filter(f=>f.category==='Sobremesas').length,2);
  const first=C.makeItem(branco.id,'whole',1,id);
  const second=C.makeItem(preto.id,'whole',1,id);
  assert.equal(N.validEntry(entry(first)),true);
  assert.equal(first.grams,null);
  assert.equal(second.grams,null);
  const date='2026-11-14';
  const records=[entry(first,date),entry(second,date)];
  assert.equal(N.observedTotals(records,date).totals.energyKcal,null);
  const estimated=N.estimatedTotals(records,date);
  assert.equal(estimated.estimatedItems,2);
  assert.equal(estimated.totals.central.energyKcal,1817.8);
  assert.equal(estimated.totals.low.energyKcal,1356.8);
  assert.equal(estimated.totals.high.energyKcal,2333);
});
test('meio copo, 2 copos e adicional não são confundidos',()=>{
  const foodId='local:doce-cascao-acai-trufado-branco-500ml';
  const half=C.makeItem(foodId,'half',1,id);
  const double=C.makeItem(foodId,'whole',2,id);
  assert.equal(half.estimate.central.energyKcal,407.2);
  assert.equal(double.estimate.central.energyKcal,814.4);
  assert.equal(N.estimatedTotals([entry(half)],'2026-11-14').totals.central.energyKcal,407.2);
  assert.equal(N.estimatedTotals([entry(double)],'2026-11-14').totals.central.energyKcal,1628.8);
  const extra=C.makeItem('local:doce-cascao-adicional-ninho','extra',1,id);
  assert.equal(extra.estimate.central.energyKcal,66);
  const mixed=entry(half);mixed.items.push(extra);
  assert.equal(N.validEntry(mixed),true);
  assert.equal(N.estimatedTotals([mixed],'2026-11-14').totals.central.energyKcal,473.2);
  assert.equal(N.validEntry({...mixed,items:[{...half,estimate:{...half.estimate,high:{...half.estimate.high,energyKcal:-1}}}]}),false);
});
test('favoritos de sobremesas mantêm faixa e não inventam outros consumos',()=>{
  const a=C.makeItem('local:doce-cascao-acai-trufado-preto-500ml','half',1,id);
  const initial=entry(a);const snap=structuredClone(initial);
  const group=C.makeFavorite(initial,N.archive(),'Açaí de meia porção',id);
  assert.ok(group);
  const arch=N.archive();arch.mealTemplates.push(group.favorite);
  assert.equal(N.validArchive(arch),true);
  const copy=C.fromFavorite(group.favorite,'2026-11-15',arch,id);
  assert.equal(N.validEntry(copy),true);
  assert.equal(copy.items[0].estimate.central.energyKcal,501.7);
  assert.deepEqual(initial,snap);
  assert.equal(N.observedTotals([copy],'2026-11-15').totals.energyKcal,null);
  assert.equal(N.estimatedTotals([copy],'2026-11-15').totals.central.energyKcal,501.7);
  const restored=N.merge(arch,{...N.archive(),entries:[copy]});
  assert.equal(restored.entries[0].items[0].estimate.confidence,'low');
});

test('favorito preserva composição corrigida sem voltar ao catálogo',()=>{
  let n=0;const id=p=>p+'-corrected-'+(++n),archive=N.archive();
  const item=C.makeItem('ref:generic-169757','100g',1,id);
  item.nutrientsPer100g.proteinG=4;item.source={name:'Rótulo revisado'};
  const entry={id:'corrected-entry',date:'2026-11-15',mealType:'lunch',items:[item]};
  const result=C.makeFavorite(entry,archive,'',id);
  archive.foods.push(...result.foodsToAdd);archive.mealTemplates.push(result.favorite);
  const repeated=C.fromFavorite(result.favorite,'2026-11-16',archive,id);
  assert.equal(repeated.items[0].nutrientsPer100g.proteinG,4);
  assert.equal(repeated.items[0].source.name,'Rótulo revisado');
});

test('alimentos pesquisados aparecem primeiro no café sem depender de consumo prévio',()=>{
 const breakfast=C.orderedForMeal('breakfast');
 assert.deepEqual(breakfast.slice(0,3).map(x=>x.id),[
   'photo:itambe-zero-morango-200g',
   'photo:piracanjuba-proforce-banoffee-250ml',
   'growth:whey-unknown'
 ]);
 assert.equal(breakfast.length,C.foods.length);
 assert.equal(C.orderedForMeal('lunch')[0].id,'ref:generic-169757');
 assert.ok(C.search('ITAMBE').some(x=>x.name.includes('Itambé')));
 assert.ok(C.search('banoffee').some(x=>x.name.includes('PRO FORCE')));
});


test('catálogo TACO cobre carnes, frituras e pratos brasileiros com fonte específica',()=>{
 const taco=C.foods.filter(f=>f.id.startsWith('taco:2011:'));
 assert.equal(taco.length,53);
 assert.equal(new Set(C.foods.map(f=>f.id)).size,C.foods.length);
 for(const f of taco) {
   assert.equal(N.validFood(f),true,f.id);
   assert.equal(f.source.name,'NEPA/UNICAMP — TACO');
   assert.match(f.source.reference,/Tabela TACO 4ª ed\. \(2011\), item \d+/);
   assert.ok(f.portions.some(p=>p.id==='100g'),f.name);
   assert.ok(f.portions.every(p=>p.grams>0),f.name);
 }
 const specifics=[
   ['taco:2011:346',194,35.9,0,4.5],
   ['taco:2011:429',280,28.9,0,17.4],
   ['taco:2011:93',267,5,35.6,13.1],
   ['taco:2011:401',221,28.5,7.5,7.8],
   ['taco:2011:539',152,10.2,19.6,6.8],
 ];
 for(const [foodId,kcal,protein,carbs,fat] of specifics){
   const food=C.find(foodId);
   assert.equal(food.nutrientsPer100g.energyKcal,kcal);
   assert.equal(food.nutrientsPer100g.proteinG,protein);
   assert.equal(food.nutrientsPer100g.carbsG,carbs);
   assert.equal(food.nutrientsPer100g.fatG,fat);
   const item=C.makeItem(foodId,'100g',1,id);
   assert.ok(item,foodId);
   assert.equal(item.grams,100);
   const meal=entry(item);
   assert.ok(N.validEntry(meal),foodId);
   const totals=N.observedTotals([meal],'2026-11-14').totals;
   assert.equal(totals.energyKcal,kcal);
 }
});
test('busca de comidas brasileiras reconhece grafias com e sem acento e indica preparo',()=>{
 const examples=[
   ['bife de boi','taco:2011:346'],
   ['bife de porco','taco:2011:429'],
   ['batata frita','taco:2011:93'],
   ['frango empanado','taco:2011:401'],
   ['feijao tropeiro','taco:2011:539'],
   ['pao de queijo','taco:2011:140'],
   ['macarrao','taco:2011:542'],
 ];
 for(const [query,foodId] of examples){
   assert.ok(C.search(query).some(f=>f.id===foodId),query);
 }
 assert.ok(C.orderedForMeal('lunch').slice(0,10).some(f=>f.id==='taco:2011:346'));
 assert.ok(C.orderedForMeal('dinner').slice(0,10).some(f=>f.id==='taco:2011:401'));
 const raw=C.find('taco:2011:222');
 assert.equal(raw.preparation,'raw');
});
test('porções caseiras aproximadas não substituem peso escolhido; histórico e favoritos preservados',()=>{
 const food=C.find('taco:2011:93');
 const item=C.makeItem(food.id,'medium',1,id);
 assert.equal(item.grams,120);
 assert.equal(N.observedTotals([entry(item)],'2026-11-14').totals.energyKcal,320.4);
 const meal=entry(item);
 const fav=C.makeFavorite(meal,N.archive(),'Batata do almoço',id);
 const archive=N.archive();
 archive.mealTemplates.push(fav.favorite);
 assert.ok(N.validArchive(archive));
 const repeat=C.fromFavorite(fav.favorite,'2026-11-15',archive,id);
 assert.equal(repeat.items[0].grams,120);
 assert.equal(repeat.items[0].source.name,'NEPA/UNICAMP — TACO');
 assert.notEqual(repeat.id,meal.id);
 assert.equal(C.find('growth:whey-unknown').nutrientsPer100g.proteinG,null);
});


test('peso exato de 121 g e 121,5 g calcula nutrientes automaticamente sem arredondar a porções fixas',()=>{
 const beef=C.makeItem('taco:2011:346','custom',121,id);
 assert.equal(beef.unit,'g');assert.equal(beef.quantity,121);assert.equal(beef.grams,121);
 assert.equal(N.observedTotals([entry(beef)],'2026-11-14').totals.energyKcal,234.7);
 assert.equal(N.observedTotals([entry(beef)],'2026-11-14').totals.proteinG,43.4);
 const pork=C.makeItem('taco:2011:429','custom',121.5,id);
 assert.equal(pork.grams,121.5);
 assert.equal(N.observedTotals([entry(pork)],'2026-11-14').totals.energyKcal,340.2);
 assert.equal(C.makeItem('taco:2011:346','custom',0,id),null);
 assert.equal(C.makeItem('taco:2011:346','custom',10001,id),null);
});
test('brigadeiro, morango e bolo de chocolate aceitam gramagem livre e origem da composição',()=>{
 const cake=C.find('taco:2011:16');
 assert.equal(cake.nutrientsPer100g.energyKcal,410);
 assert.equal(cake.source.name,'NEPA/UNICAMP — TACO');
 const slice=C.makeItem(cake.id,'custom',121,id);
 assert.equal(N.observedTotals([entry(slice)],'2026-11-14').totals.energyKcal,496.1);
 for(const key of ['recipe:brigadeiro-caseiro','recipe:brigadeiro-morango']){
   const food=C.find(key);
   assert.equal(food.estimate.confidence,'low');
   assert.equal(food.nutrientsPer100g.energyKcal,null);
   const item=C.makeItem(key,'custom',121,id);
   assert.equal(item.unit,'g');assert.equal(item.quantity,121);assert.equal(item.grams,121);
   const e=entry(item);
   assert.equal(N.validEntry(e),true);
   assert.equal(N.observedTotals([e],'2026-11-14').totals.energyKcal,null);
   const actual=N.estimatedTotals([e],'2026-11-14').totals.central.energyKcal;
   assert.ok(Math.abs(actual-food.estimate.central.energyKcal*1.21)<0.11);
 }
 assert.ok(C.search('brigadeiro com morango').some(f=>f.id==='recipe:brigadeiro-morango'));
 assert.ok(C.search('fatia de bolo').some(f=>f.id==='taco:2011:16'));
 const old=C.makeItem('local:doce-cascao-acai-trufado-preto-500ml','custom',121,id);
 assert.equal(old,null,'volume of açaí without weighed base must not be interpreted as grams');
});
