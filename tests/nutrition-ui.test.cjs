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

test('café da manhã tem três anéis, lista recolhida e linhas nutricionais individuais',()=>{
 const id=prefix=>prefix+'-synthetic';
 const yogurt=CAT.makeItem('photo:itambe-zero-morango-200g','pack',1,id);
 const banana=CAT.makeItem('ref:generic-173944','medium',1,id);
 const meal={id:'breakfast-synth',date:'2026-11-15',mealType:'breakfast',items:[
   {...yogurt,id:'yogurt-synth'},{...banana,id:'banana-synth'}
 ]};
 const archive=N.archive();
 archive.entries.push(meal);
 const html=UI.render({archive,date:meal.date});
 assert.match(html,/class="nd-meal-macro-row"/);
 assert.equal((html.match(/class="nd-meal-macro"/g)||[]).length,3);
 assert.match(html,/class="nd-meal-details"/);
 assert.doesNotMatch(html,/<details class="nd-meal-details" open/);
 assert.match(html,/Ver 2 alimento\(s\)/);
 assert.match(html,/<th scope="col"><abbr title="Proteínas em gramas">P \(g\)<\/abbr><\/th>/);
 assert.match(html,/Fib \(g\)/);
 assert.match(html,/Itambé morango/);
 assert.match(html,/Banana crua/);
 assert.match(html,/6<\/td>/); // Itambé protein per actual package, not per 100 g
 assert.match(html,/—<\/td>/); // Fiber from unprovided labels stays unknown
 assert.match(html,/Anéis = parcela da meta diária/);
 assert.doesNotMatch(html,/Itambé zero lactose morango, pote 200 g · Banana crua/);
});
test('no empty-ring cards, no invented macros or meal targets, escaping still applied',()=>{
 const archive=N.archive();
 const html=UI.render({archive,date:'2026-11-15'});
 assert.equal((html.match(/class="nd-meal-macro"/g)||[]).length,0);
 const item={...CAT.makeItem('growth:whey-unknown','dose',1,p=>p+'-unknown'),id:'whey-unknown'};
 item.label='<img src=x onerror=alert(1)>';
 const meal={id:'unknown-breakfast',date:'2026-11-15',mealType:'breakfast',items:[item]};
 archive.entries.push(meal);
 const rendered=UI.render({archive,date:meal.date});
 assert.match(rendered,/nd-meal-macro-ring/);
 assert.match(rendered,/—<\/span>/);
 assert.doesNotMatch(rendered,/<img src=/);
 assert.match(rendered,/&lt;img/);
 assert.match(rendered,/Informação incompleta/);
});
