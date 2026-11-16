const test=require('node:test');
const assert=require('node:assert/strict');
const N=require('../nutrition.js');
const CAT=require('../nutrition-catalog.js');
const PLAN=require('../nutrition-presets.js');
const UI=require('../nutrition-ui.js');
let seq=0;
const uid=prefix=>prefix+'-'+(++seq);
const day='2026-11-16';
test('every suggested recipe creates a valid diary snapshot without changing the archive',()=>{
 const archive=N.archive(),frozen=JSON.stringify(archive);
 for(const preset of PLAN.recipes){
   const entry=PLAN.makeEntry(preset.id,day,uid);
   assert.ok(entry,'Failed '+preset.id);
   assert.ok(N.validEntry(entry),preset.id);
   assert.equal(entry.mealType,preset.mealType);
   assert.equal(entry.date,day);
   assert.equal(entry.items.length,preset.ingredients.length);
   assert.ok(entry.items.every(item=>item.quantity>0),preset.id);
   assert.notEqual(entry.id,PLAN.makeEntry(preset.id,day,uid).id);
 }
 assert.equal(JSON.stringify(archive),frozen);
 assert.equal(PLAN.makeEntry('not-real',day,uid),null);
});
test('missing ingredient values remain unknown, never recorded as zero or as fictitious energy',()=>{
 const entry=PLAN.makeEntry('snack-yogurt',day,uid);
 const yogurt=entry.items.find(item=>item.label==='Iogurte natural desnatado');
 assert.ok(yogurt);
 assert.equal(yogurt.nutrientsPer100g.energyKcal,null);
 assert.equal(yogurt.source,null);
 const totals=N.recordedBreakdown([entry],day);
 assert.ok(totals.counts.energyKcal.unknown>0);
 assert.ok(totals.totals.energyKcal>0);
});
test('suggested breakfast includes milk, whey, oats and fruit with actual amounts',()=>{
 const entry=PLAN.makeEntry('breakfast-shake',day,uid);
 assert.deepEqual(entry.items.map(item=>item.grams),[null,30,20,80]);
 assert.equal(entry.items[0].unit,'ml');
 assert.equal(entry.items[0].quantity,200);
 assert.equal(entry.items[1].foodId,'growth:official:isolate-natural');
 assert.equal(entry.items[1].nutrientsPer100g.proteinG,CAT.find('growth:official:isolate-natural').nutrientsPer100g.proteinG);
});
test('the existing meal card exposes quick action, alternative and edit but no fake logging',()=>{
 const archive=N.archive(),original=JSON.stringify(archive);
 const html=UI.render({archive,date:day,balanceDate:day});
 assert.match(html,/data-nd="plan-confirm"/);
 assert.match(html,/data-nd="plan-adjust"/);
 assert.match(html,/Comi outra coisa/);
 assert.match(html,/Ver outras 4 opções/);
 assert.match(html,/Dados incompletos/);
 assert.equal(archive.entries.length,0);
 assert.equal(JSON.stringify(archive),original);
 const entry=PLAN.makeEntry('breakfast-shake',day,uid);
 archive.entries.push(entry);
 const updated=UI.render({archive,date:day,balanceDate:day});
 const breakfast=updated.match(/<section class="card nd-meal">[\s\S]*?<\/section>/);
 assert.ok(breakfast);
 assert.doesNotMatch(breakfast[0],/data-nd="plan-confirm"/);
});
