const test=require('node:test');
const assert=require('node:assert/strict');
const N=require('../nutrition.js');
const CAT=require('../nutrition-catalog.js');
const FOOD='recipe:hamburgao-assado-carne-presunto-2026';
let seq=0;
const id=prefix=>prefix+'-'+(++seq);
const entry=item=>({id:id('meal'),date:'2026-11-24',mealType:'snack',time:null,notes:'',items:[item]});

test('new photographed hamburgão is discoverable, clearly unverified and listed for snack and dinner',()=>{
  const food=CAT.find(FOOD);
  assert.ok(food);
  assert.equal(food.category,'Salgados e lanches');
  assert.equal(food.preparation,'cooked');
  assert.equal(food.estimate.confidence,'low');
  assert.equal(food.estimateGramsBase,100);
  assert.deepEqual(food.nutrientsPer100g,{energyKcal:null,proteinG:null,carbsG:null,fatG:null,fiberG:null});
  assert.equal(N.validFood(food),true);
  assert.match(food.note,/NÃO confirmados|NÃO foram|NÃO confirmad/);
  assert.match(food.source.reference,/TBCA BRC0863A/);
  for(const term of ['hamburgão','hamburgao','Hamburgão assado','salgado de hambúrguer']){
    assert.equal(CAT.search(term).filter(x=>x.id===FOOD).length,1,term);
  }
  assert.equal(CAT.orderedForMeal('snack')[0].id,FOOD);
  assert.equal(CAT.orderedForMeal('dinner')[0].id,FOOD);
});

test('hypothetical 220g unit has explicit estimate band; never writes to verified calorie totals',()=>{
  const item=CAT.makeItem(FOOD,'one',1,id);
  assert.ok(item);
  assert.equal(item.grams,220);
  assert.equal(item.unit,'portion');
  assert.equal(item.quantity,1);
  assert.equal(N.validEntry(entry(item)),true);
  assert.deepEqual(item.estimate.central,{
    energyKcal:594,proteinG:30.8,carbsG:63.8,fatG:24.2
  });
  assert.equal(item.estimate.low.energyKcal,506);
  assert.equal(item.estimate.high.energyKcal,748);
  const meal=entry(item);
  assert.equal(N.observedTotals([meal],meal.date).totals.energyKcal,null);
  const mixed=N.recordedBreakdown([meal],meal.date);
  assert.equal(mixed.totals.energyKcal,594);
  assert.equal(mixed.totals.proteinG,30.8);
  assert.equal(mixed.ranges.energyKcal.low,506);
  assert.equal(mixed.ranges.energyKcal.high,748);
  assert.equal(mixed.counts.energyKcal.estimated,1);
  assert.equal(mixed.counts.energyKcal.confirmed,0);
  assert.equal(mixed.counts.fiberG.unknown,1,'fiber cannot be invented from photograph');
});

test('half, smaller, larger and fractional grams scale estimates and do not falsely confirm nutrients',()=>{
  const half=CAT.makeItem(FOOD,'half',1,id);
  const small=CAT.makeItem(FOOD,'small',1,id);
  const large=CAT.makeItem(FOOD,'large',1,id);
  assert.equal(half.grams,110);
  assert.equal(half.estimate.central.energyKcal,297);
  assert.equal(small.grams,180);
  assert.equal(small.estimate.central.energyKcal,486);
  assert.equal(large.grams,280);
  assert.equal(large.estimate.central.energyKcal,756);
  const grams=CAT.makeItem(FOOD,'custom',121.5,id);
  assert.ok(grams);
  assert.equal(grams.unit,'g');
  assert.equal(grams.grams,121.5);
  assert.equal(grams.quantity,121.5);
  assert.equal(grams.estimate.central.energyKcal,2.7);
  assert.equal(N.recordedBreakdown([entry(grams)],'2026-11-24').totals.energyKcal,328.05);
  assert.equal(N.observedTotals([entry(grams)],'2026-11-24').totals.energyKcal,null);
  assert.equal(CAT.makeItem(FOOD,'custom',0,id),null);
  assert.equal(CAT.makeItem(FOOD,'custom',-1,id),null);
  assert.equal(CAT.makeItem(FOOD,'custom',10001,id),null);
});

test('looking up food is read-only, optional log can be favorited and reused without changing other histories',()=>{
  const archive=N.archive();
  const before=structuredClone(archive);
  const food=CAT.find(FOOD);
  assert.ok(food);
  CAT.search('hamburgao');
  assert.deepEqual(archive,before);
  assert.equal(archive.entries.length,0);
  const snack=entry(CAT.makeItem(FOOD,'one',1,id));
  const saved=CAT.makeFavorite(snack,archive,'Meu hamburgão',id);
  assert.ok(saved);
  archive.mealTemplates.push(saved.favorite);
  assert.equal(N.validArchive(archive),true);
  const repeat=CAT.fromFavorite(saved.favorite,'2026-11-25',archive,id);
  assert.ok(repeat);
  assert.equal(N.observedTotals([repeat],'2026-11-25').totals.energyKcal,null);
  assert.equal(N.recordedBreakdown([repeat],'2026-11-25').totals.energyKcal,594);
  assert.deepEqual(before.entries,archive.entries);
});
