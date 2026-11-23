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
 assert.equal(taco.length,68); // 54 anteriores + 14 novas frutas TACO
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
 assert.ok(Math.abs(N.observedTotals([entry(beef)],'2026-11-14').totals.energyKcal-234.74)<0.001);
 assert.ok(Math.abs(N.observedTotals([entry(beef)],'2026-11-14').totals.proteinG-43.439)<0.001);
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


test('Growth: 16 produtos oficiais têm sabores e origem independentes por tabela nutricional',()=>{
 const whey=C.foods.filter(food=>food.id.startsWith('growth:official:'));
 assert.equal(whey.length,16);
 assert.equal(new Set(whey.map(food=>food.id)).size,16);
 for(const food of whey){
   assert.equal(N.validFood(food),true,food.name);
   assert.equal(food.source.name,'Growth Supplements — tabela nutricional oficial');
   assert.ok(food.source.reference.includes('https://www.gsuplementos.com.br/'));
   assert.ok(food.portions.some(portion=>portion.id==='dose'),food.id);
   assert.ok(food.portions.some(portion=>portion.id==='half'),food.id);
   assert.equal(food.nutrientsPer100g.fiberG!==null,true);
 }
 const examples=[
 ['growth:official:top-natural',30,126,24,3.1,2],
 ['growth:official:isolate-natural',30,112,27,1,0],
 ['growth:official:hydro-natural',30,115,27,0.6,0.5],
 ['growth:official:medium-natural',30,121,17,8.7,2],
 ['growth:official:basic-natural',30,118,10,15,2],
 ['growth:official:100-chocolate',30,121,21,4.5,2.1],
 ['growth:official:3w-chocolate',30,118,24,2.5,1.3],
 ['growth:official:zero-natural',30,120,23,2.3,2.1],
 ['growth:official:daily-doce-de-leite',40,149,22,11,1.9],
 ['growth:official:daily-zero-chocolate',40,172,25,9.6,2.3],
 ['growth:official:gourmet-tiramisu',40,153,22,12,1.9]
 ];
 for(const [key,g,kcal,protein,carbs,fat] of examples){
   const food=C.find(key);
   assert.ok(food,key);
   const dose=C.makeItem(key,'dose',1,id);
   assert.equal(dose.grams,g,key);
   assert.ok(N.validEntry(entry(dose)),key);
   const totals=N.observedTotals([entry(dose)],'2026-11-14').totals;
   for(const [name,value] of [['energyKcal',kcal],['proteinG',protein],['carbsG',carbs],['fatG',fat]]){
     assert.ok(Math.abs(totals[name]-value)<0.011,key+' '+name+': '+totals[name]+' vs '+value);
   }
 }
});
test('Growth: gramagem fracionada, dose do rótulo e meia dose preservam totais e snapshots',()=>{
 const key='growth:official:100-chocolate';
 const custom=C.makeItem(key,'custom',35.5,id);
 const base=C.find(key);
 assert.equal(custom.unit,'g');assert.equal(custom.quantity,35.5);
 assert.equal(custom.grams,35.5);
 assert.equal(custom.source.name,'Growth Supplements — tabela nutricional oficial');
 const total=N.observedTotals([entry(custom)],'2026-11-14').totals;
 assert.ok(Math.abs(total.energyKcal-(121/30*35.5))<0.011);
 assert.ok(Math.abs(total.proteinG-(21/30*35.5))<0.011);
 const half=C.makeItem(key,'half',1,id);
 const halfTotal=N.observedTotals([entry(half)],'2026-11-14').totals;
 assert.equal(half.grams,15);
 assert.ok(Math.abs(halfTotal.energyKcal-60.5)<0.011);
 const initial=entry(custom);
 const favorite=C.makeFavorite(initial,N.archive(),'Growth depois do treino',id);
 assert.ok(favorite);
 const archive=N.archive();archive.mealTemplates.push(favorite.favorite);
 assert.equal(N.validArchive(archive),true);
 const restored=C.fromFavorite(favorite.favorite,'2026-11-15',archive,id);
 assert.equal(restored.items[0].grams,35.5);
 assert.equal(restored.items[0].source.reference,custom.source.reference);
 assert.equal(N.recordedBreakdown([restored],'2026-11-15').totals.energyKcal,total.energyKcal);
 assert.equal(base.nutrientsPer100g.proteinG,70);
});
test('Growth: tipos sem rótulo oficial continuam desconhecidos, sem falso zero',()=>{
 const fallback=C.makeItem('growth:whey-unknown','dose',1,id);
 assert.equal(N.observedTotals([entry(fallback)],'2026-11-14').totals.energyKcal,null);
 assert.ok(C.search('growth whey').length>=16);
 assert.ok(C.search('whey isolado').some(f=>f.id==='growth:official:isolate-natural'));
 assert.ok(C.orderedForMeal('breakfast').slice(0,5).some(f=>f.id==='growth:official:top-natural'));
});

test('leites e bebidas: ml livres, rótulos distintos e fibra desconhecida não é zero',()=>{
 const drinks=C.foods.filter(f=>f.id.startsWith('drink:'));
 assert.equal(drinks.length,5);
 assert.ok(drinks.every(f=>N.validFood(f)));
 const skim=C.makeItem('drink:itambe-uht-desnatado','customMl',200,id);
 const whole=C.makeItem('drink:itambe-uht-integral','customMl',200,id);
 const cup=C.makeItem('drink:cafe-coado-sem-acucar','customMl',80,id);
 assert.equal(skim.unit,'ml');assert.equal(skim.quantity,200);assert.equal(skim.grams,null);
 assert.equal(N.observedTotals([entry(skim)],'2026-11-14').totals.energyKcal,65);
 assert.equal(N.observedTotals([entry(whole)],'2026-11-14').totals.energyKcal,118);
 assert.equal(N.observedTotals([entry(cup)],'2026-11-14').totals.energyKcal,7.2);
 assert.equal(N.observedTotals([entry(cup)],'2026-11-14').totals.fiberG,null);
 assert.equal(C.makeItem('drink:itambe-uht-integral','custom',200,id),null);
 assert.equal(C.makeItem('drink:itambe-uht-integral','customMl',0,id),null);
 const monster=C.makeItem('drink:monster-zero-sugar-473ml','customMl',473,id);
 assert.ok(Math.abs(N.observedTotals([entry(monster)],'2026-11-14').totals.energyKcal-7.095)<.02);
 const ultra=C.makeItem('drink:monster-ultra-white-473ml','customMl',473,id);
 assert.equal(N.observedTotals([entry(ultra)],'2026-11-14').totals.energyKcal,14);
 assert.equal(N.observedTotals([entry(ultra)],'2026-11-14').totals.carbsG,null);
 assert.ok(C.search('monster 0').some(f=>f.id==='drink:monster-zero-sugar-473ml'));
 assert.ok(C.search('cafe sem acucar').some(f=>f.id==='drink:cafe-coado-sem-acucar'));
});
test('Growth e leite são dois snapshots independentes e favoritos mantêm volume',()=>{
 const whey=C.makeItem('growth:official:100-chocolate','custom',35.5,id);
 const milk=C.makeItem('drink:itambe-uht-desnatado','customMl',200,id);
 const meal={id:id('meal'),date:'2026-11-14',mealType:'snack',items:[whey,milk]};
 assert.equal(N.validEntry(meal),true);
 const totals=N.observedTotals([meal],meal.date).totals;
 assert.ok(Math.abs(totals.energyKcal-(121/30*35.5+65))<.02);
 assert.equal(totals.proteinG,31.65);
 const saved=C.makeFavorite(meal,N.archive(),'Whey com leite',id);
 assert.ok(saved);const store=N.archive();store.mealTemplates.push(saved.favorite);
 assert.equal(N.validArchive(store),true);
 const repeated=C.fromFavorite(saved.favorite,'2026-11-15',store,id);
 assert.equal(repeated.items.length,2);
 assert.equal(repeated.items[1].unit,'ml');
 assert.equal(repeated.items[1].quantity,200);
 assert.equal(N.observedTotals([repeated],'2026-11-15').totals.energyKcal,totals.energyKcal);
});

test('TACO: frutas variadas têm fonte rastreável e aceitam valores fracionados',()=>{
 const fruits=C.foods.filter(f=>f.category==='Frutas');
 const tacoFruits=fruits.filter(f=>f.id.startsWith('taco:2011:'));
 assert.equal(fruits.length,18); // 17 TACO e uma referência genérica de banana
 assert.equal(tacoFruits.length,17);
 assert.equal(new Set(fruits.map(f=>f.id)).size,fruits.length);
 for(const f of fruits)assert.equal(N.validFood(f),true,f.name);
 for(const f of tacoFruits){
   assert.equal(f.source.name,'NEPA/UNICAMP — TACO');
   assert.ok(f.source.reference.includes('TACO 4ª ed.'),f.name);
 }
 for(const term of ['morango','laranja pera','manga','kiwi','melancia','abacaxi','uva']){
   assert.ok(C.search(term).some(f=>f.category==='Frutas'),term);
 }
 const abacaxi=C.makeItem('taco:2011:164','custom',121.5,id);
 assert.equal(abacaxi.quantity,121.5);assert.equal(abacaxi.unit,'g');
 const entry={id:id('meal'),date:'2026-11-14',mealType:'snack',items:[abacaxi]};
 const total=N.observedTotals([entry],entry.date).totals;
 assert.ok(Math.abs(total.energyKcal-58.32)<.01);
 assert.ok(Math.abs(total.carbsG-14.9445)<.01);
});


test('TBCA: nuggets fritos e assados são distintos, com peso fracionado e referência rastreável',()=>{
 const fried=C.find('tbca:BRC0474F'),baked=C.find('tbca:BRC0475F');
 assert.ok(fried&&baked);
 assert.equal(fried.nutrientsPer100g.energyKcal,339);
 assert.equal(baked.nutrientsPer100g.energyKcal,303);
 assert.ok(fried.source.reference.includes('BRC0474F'));
 assert.ok(C.search('nuggets').some(f=>f.id===fried.id));
 assert.ok(C.search('calabresa fatiada').some(f=>f.id==='tbca:BRC0898F'));
 assert.ok(C.search('molho cheddar').some(f=>f.id==='tbca:BRC0137G'));
 const meat=C.makeItem(fried.id,'custom',121.5,id);
 assert.equal(meat.quantity,121.5);
 assert.equal(meat.unit,'g');
 assert.equal(meat.grams,121.5);
 const meal={id:id('meal'),date:'2026-11-15',mealType:'dinner',items:[meat]};
 assert.equal(N.validEntry(meal),true);
 assert.ok(Math.abs(N.observedTotals([meal],meal.date).totals.energyKcal-411.885)<.01);
});

test('porção compartilhada registra apenas o consumo próprio; pesos e percentuais de cada alimento são editáveis',()=>{
 const preset=C.SHARED_PRESETS.find(row=>row.id==='trono-dos-reis');
 assert.ok(preset);assert.equal(preset.components.length,5);
 const half=preset.components.map(part=>({foodId:part.foodId,totalGrams:part.wholeGrams,myGrams:part.wholeGrams/2}));
 const out=C.makeSharedPortion(preset.id,half,id);
 assert.ok(out);
 assert.equal(out.items.length,5);
 assert.equal(out.wholeGrams,830);
 assert.equal(out.consumedGrams,415);
 assert.ok(out.items.every(item=>item.estimate?.confidence==='low'));
 assert.ok(out.items.every(item=>item.nutrientsPer100g.energyKcal===null));
 const meal={id:id('meal'),date:'2026-11-15',mealType:'dinner',items:out.items};
 assert.equal(N.validEntry(meal),true);
 assert.equal(N.observedTotals([meal],meal.date).totals.energyKcal,null);
 const daily=N.recordedBreakdown([meal],meal.date);
 assert.equal(daily.counts.energyKcal.estimated,5);
 assert.equal(daily.counts.energyKcal.confirmed,0);
 assert.ok(daily.totals.energyKcal>1200&&daily.totals.energyKcal<1600);
 assert.ok(daily.ranges.energyKcal.low<daily.totals.energyKcal);
 assert.ok(daily.ranges.energyKcal.high>daily.totals.energyKcal);
 const unfair=half.map(row=>({...row}));unfair[0].myGrams=250;unfair[1].myGrams=0;
 const own=C.makeSharedPortion(preset.id,unfair,id);
 assert.equal(own.items.length,4);
 assert.equal(own.consumedGrams,415); // +100 g de batata e -100 g de nuggets
 assert.equal(own.items.filter(i=>i.foodId==='tbca:BRC0474F').length,0);
 assert.equal(C.makeSharedPortion(preset.id,[{...half[0],myGrams:400},...half.slice(1)],id),null);
 assert.equal(C.makeSharedPortion(preset.id,half.map(row=>({...row,myGrams:0})),id),null);
 const archive=N.archive();archive.entries.push(meal);
 assert.equal(N.validArchive(archive),true);
 assert.deepEqual(N.merge(archive,N.archive()).entries,archive.entries);
});

test('rótulos fotografados: hambúrguer de frango 56 g e pão de forma 50 g entram no catálogo com medidas flexíveis',()=>{
 const meatId='photo:hamburguer-frango-56g',breadId='photo:pao-forma-tradicional-50g';
 const meat=C.find(meatId),bread=C.find(breadId);
 assert.ok(meat&&bread);
 assert.equal(N.validFood(meat),true);
 assert.equal(N.validFood(bread),true);
 assert.equal(C.search('carne de hamburguer de frango').some(f=>f.id===meatId),true);
 assert.equal(C.search('pao de forma tradicional').some(f=>f.id===breadId),true);
 assert.ok(C.orderedForMeal('breakfast').some(f=>f.id===breadId));
 assert.ok(C.orderedForMeal('dinner').some(f=>f.id===meatId));
 assert.equal(meat.nutrientsPer100g.energyKcal,154);
 assert.equal(meat.nutrientsPer100g.proteinG,14);
 assert.equal(meat.nutrientsPer100g.carbsG,3.2);
 assert.equal(meat.nutrientsPer100g.fatG,9.5);
 assert.equal(meat.nutrientsPer100g.fiberG,0);
 assert.equal(bread.nutrientsPer100g.energyKcal,275);
 assert.equal(bread.nutrientsPer100g.carbsG,50);
 assert.equal(bread.nutrientsPer100g.proteinG,9);
 assert.equal(bread.nutrientsPer100g.fatG,null);
 assert.equal(bread.nutrientsPer100g.fiberG,null);
 // A porção do rótulo é a fonte dos valores arredondados declarados.
 const one=C.makeItem(meatId,'one',1,id),two=C.makeItem(breadId,'two',1,id);
 assert.equal(one.grams,56);assert.equal(two.grams,50);
 assert.equal(one.unit,'portion');assert.equal(two.unit,'portion');
 const m=N.observedTotals([entry(one)],'2026-11-14').totals;
 const b=N.observedTotals([entry(two)],'2026-11-14').totals;
 assert.deepEqual([m.energyKcal,m.proteinG,m.carbsG,m.fatG,m.fiberG],[85,7.6,1.8,5.3,0]);
 assert.deepEqual([b.energyKcal,b.proteinG,b.carbsG,b.fatG,b.fiberG],[138,4.5,25,null,null]);
 // 1 fatia, meia unidade e gramas arbitrárias usam 100g; nunca recebem
 // os valores inteiros do rótulo da porção de 50g ou 56g.
 const slice=C.makeItem(breadId,'slice',1,id),half=C.makeItem(meatId,'half',1,id);
 assert.equal(slice.nutrientsPerServing,undefined);
 assert.equal(half.nutrientsPerServing,undefined);
 assert.equal(N.observedTotals([entry(slice)],'2026-11-14').totals.energyKcal,68.75);
 assert.equal(N.observedTotals([entry(half)],'2026-11-14').totals.energyKcal,43.12);
 const weighed=C.makeItem(breadId,'custom',32.5,id);
 const weighedMeat=C.makeItem(meatId,'custom',121.5,id);
 assert.equal(weighed.nutrientsPerServing,undefined);
 assert.equal(weighed.grams,32.5);
 assert.equal(weighedMeat.grams,121.5);
 assert.equal(N.observedTotals([entry(weighed)],'2026-11-14').totals.energyKcal,89.38);
 assert.equal(N.observedTotals([entry(weighedMeat)],'2026-11-14').totals.energyKcal,187.11);
 assert.equal(N.validEntry(entry(weighed)),true);
 assert.equal(N.validEntry(entry(weighedMeat)),true);
 assert.equal(C.makeItem(breadId,'custom',0,id),null);
 assert.equal(C.makeItem(meatId,'custom',-5,id),null);
});
test('favoritos e histórico preservam o rótulo fotografado sem alterar pesagens anteriores',()=>{
 const bread=C.makeItem('photo:pao-forma-tradicional-50g','two',1,id);
 const original=entry(bread),immutable=structuredClone(original);
 const saved=C.makeFavorite(original,N.archive(),'Meu pão',id);
 assert.ok(saved);
 const archive=N.archive();
 archive.mealTemplates.push(saved.favorite);
 assert.equal(N.validArchive(archive),true);
 const repeat=C.fromFavorite(saved.favorite,'2026-11-15',archive,id);
 assert.ok(repeat);
 assert.equal(N.validEntry(repeat),true);
 assert.equal(N.observedTotals([repeat],'2026-11-15').totals.energyKcal,138);
 assert.equal(N.observedTotals([repeat],'2026-11-15').totals.fatG,null);
 assert.deepEqual(original,immutable);
 const merged=N.merge({...N.archive(),entries:[original]},N.archive());
 assert.deepEqual(merged.entries[0],original);
});
