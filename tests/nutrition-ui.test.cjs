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


test('energy ring has only consumed calories inside; goal appears outside the circle',()=>{
 const archive=N.archive();
 archive.settings.targets=[{id:'target-ux18',source:'manual',from:'2026-11-15',values:{energyKcal:2170,proteinG:140,carbsG:240,fatG:70,fiberG:25},formula:'manual-v1'}];
 const item=CAT.makeItem('photo:itambe-zero-morango-200g','pack',1,p=>p+'id');
 const row={id:'meal-ux18',date:'2026-11-15',mealType:'breakfast',items:[item]};
 archive.entries=[row];
 const html=UI.render({archive,date:'2026-11-15'});
 assert.match(html,/nd-ring-goal/);
 assert.match(html,/Meta: 2\.170 kcal/);
 assert.match(html,/nd-ring-unit">kcal/);
 assert.doesNotMatch(html,/\/ 2\.170 kcal<\/small>/);
 assert.match(html,/nd-food-row/);
 assert.match(html,/data-food-icon="yogurt"/);
 assert.match(html,/nd-food-macros/);
 assert.match(html,/Proteínas: 6 g/);
 assert.match(html,/Carboidratos: 7 g/);
 assert.match(html,/Fibras: — g/);
});
test('legacy food entries use category illustration without changing nutrition',()=>{
 const item=CAT.makeItem('ref:generic-173944','medium',1,p=>p+'id');
 const row={id:'meal-banana',date:'2026-11-15',mealType:'breakfast',items:[item]};
 const before=structuredClone(row);
 const html=UI.render({archive:{...N.archive(),entries:[row]},date:'2026-11-15'});
 assert.match(html,/data-food-icon="banana"/);
 assert.match(html,/nd-food-meta/);
 assert.deepEqual(row,before);
});
