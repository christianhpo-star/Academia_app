const test=require('node:test');
const assert=require('node:assert/strict');
const N=require('../nutrition.js');
const CAT=require('../nutrition-catalog.js');
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

test('açaí estimado mostra faixa e confiança sem aumentar macros verificados',()=>{
  let seq=0;const id=prefix=>prefix+'-'+(++seq);
  const item=CAT.makeItem('local:doce-cascao-acai-trufado-branco-500ml','whole',1,id);
  const record={id:'meal-est',date:'2026-11-15',mealType:'snack',time:null,notes:'',items:[item]};
  assert.equal(N.validEntry(record),true);
  const html=UI.render({archive:{...N.archive(),entries:[record]},date:'2026-11-15',selectedFoodId:'local:doce-cascao-acai-trufado-preto-500ml'});
  assert.match(html,/814,4/);
  assert.match(html,/615,4/);
  assert.match(html,/1.003,4/);
  assert.match(html,/confiança baixa/i);
  assert.match(html,/não representa todas as refeições do dia/i);
  assert.match(html,/Como foi estimado/);
  assert.doesNotMatch(html,/data-action="nutrition-edit" data-id="meal-est"/);
  assert.equal(N.observedTotals([record],'2026-11-15').totals.energyKcal,null);
});
