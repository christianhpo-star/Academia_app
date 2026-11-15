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


test('energia exibida sem meta numérica dentro do anel, com rótulo visível ao lado',()=>{
 const archive=N.archive();
 const item=CAT.makeItem('photo:itambe-zero-morango-200g','pack',1,p=>p+'-sample');
 archive.entries.push({id:'m-ux19',date:'2026-11-15',mealType:'breakfast',items:[item]});
 const html=UI.render({archive,date:'2026-11-15'});
 assert.match(html,/class="nd-ring-inner"/);
 assert.match(html,/class="nd-ring-unit">kcal/);
 assert.match(html,/class="nd-ring-goal">Meta não informada/);
 assert.doesNotMatch(html,/<small>\/ — kcal<\/small>/);
 assert.match(html,/nd-food-thumb/);
 assert.match(html,/data-food-icon="yogurt"/);
 assert.match(html,/nd-food-table/);
 assert.match(html,/6<\/td>/);
});
test('renderização de alimentos antigos mantém nutrientes e usa ilustrações offline',()=>{
 const item=CAT.makeItem('ref:generic-173944','medium',1,p=>p+'-sample');
 const meal={id:'m-ux19-banana',date:'2026-11-15',mealType:'breakfast',items:[item]};
 const original=structuredClone(meal);
 const html=UI.render({archive:{...N.archive(),entries:[meal]},date:meal.date});
 assert.match(html,/data-food-icon="banana"/);
 assert.match(html,/class="nd-meal-details"/);
 assert.deepEqual(meal,original);
});


test('tela diária soma almoço conhecido e brigadeiro estimado com sinalização',()=>{
  let n=0;const id=k=>k+'-'+(++n),date='2026-11-15';
  const a=CAT.makeItem('taco:2011:346','custom',121,id);
  const b=CAT.makeItem('recipe:brigadeiro-morango','custom',80,id);
  const archive=N.archive();archive.entries=[
    {id:'meal-lunch-approx',date,mealType:'lunch',items:[a]},
    {id:'meal-snack-approx',date,mealType:'snack',items:[b]},
  ];
  const html=UI.render({archive,date});
  assert.match(html,/Subtotal dos alimentos registrados/);
  assert.match(html,/nd-data-quality/);
  assert.match(html,/Inclui 1 alimento\(s\) com calorias estimadas/);
  assert.match(html,/≈486,7/);
  assert.match(html,/≈252 kcal registradas/);
  assert.match(html,/234,7 kcal registradas/);
  assert.match(html,/Detalhes e incerteza/);
  assert.match(html,/≈315/); // exact per 100g recipe: central reference
  assert.equal(N.observedTotals(archive.entries,date).totals.energyKcal,null);
});
test('dados desconhecidos mantêm subtotais por nutriente sem assumir ingestão zero',()=>{
 const date='2026-11-15', id=k=>k+'-test';
 const archive=N.archive();
 const yogurt=CAT.makeItem('photo:itambe-zero-morango-200g','pack',1,id);
 const whey=CAT.makeItem('growth:whey-unknown','dose',1,id);
 archive.entries.push({id:'mix-unknown',date,mealType:'breakfast',items:[yogurt,whey]});
 const html=UI.render({archive,date});
 assert.match(html,/≈52/);
 assert.match(html,/1 alimento\(s\) sem calorias disponíveis/);
 assert.match(html,/Informação incompleta/);
 assert.match(html,/não zero/);
});
