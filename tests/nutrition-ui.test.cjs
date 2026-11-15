const test=require('node:test'),assert=require('node:assert/strict');
const N=require('../nutrition.js'),CAT=require('../nutrition-catalog.js'),UI=require('../nutrition-ui.js');
test('diário vazio tem cinco refeições, sem metas inventadas',()=>{
 const html=UI.render({archive:N.archive(),date:'2026-11-15'});
 for(const label of ['Café da manhã','Almoço','Lanche','Jantar','Ceia','Configurar metas','Não representa o consumo total do dia'])assert.ok(html.includes(label));
 assert.equal((html.match(/class="card nd-meal"/g)||[]).length,5);assert.doesNotMatch(html,/id="nd-manual"/);
});
test('snapshot estimado segue separado e editável; textos são escapados',()=>{
 const item=CAT.makeItem('local:doce-cascao-acai-trufado-branco-500ml','whole',1,p=>p+'1');item.label='<script>alert(1)</script>';
 const e={id:'meal1',date:'2026-11-15',mealType:'snack',items:[item]};
 const html=UI.render({archive:{...N.archive(),entries:[e]},date:e.date});
 assert.match(html,/814,4/);assert.match(html,/615,4/);assert.match(html,/confiança baixa/);assert.match(html,/data-nd="edit"/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.equal(N.observedTotals([e],e.date).totals.energyKcal,null);
});
