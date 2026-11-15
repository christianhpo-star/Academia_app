const test=require('node:test');
const assert=require('node:assert/strict');
const N=require('../nutrition.js');
const UI=require('../nutrition-ui.js');
test('diário vazio não inventa consumo alimentar',()=>{
  const html=UI.render({archive:N.archive(),date:'2026-11-14'});
  assert.match(html,/Ainda não há refeições registradas/);
  assert.match(html,/Informações nutricionais do rótulo/);
  assert.match(html,/Não representa o consumo total do dia/);
  assert.doesNotMatch(html,/180 kcal consumidas/);
});
test('histórico escapa textos digitados',()=>{
  const record={id:'meal-1',date:'2026-11-14',mealType:'lunch',time:null,
    items:[{id:'item-1',foodId:null,label:'<script>alert(1)</script>',quantity:1,
      unit:'portion',grams:null,nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},source:null}]};
  assert.equal(N.validEntry(record),true);
  const html=UI.render({archive:{...N.archive(),entries:[record]},date:'2026-11-14'});
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/data-action="nutrition-repeat"/);
});
